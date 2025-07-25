import { useState, useEffect } from 'react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { useAuth } from '../../hooks/useAuth'

export default function TeamDashboard({ repository, onBack }) {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [teamData, setTeamData] = useState({
    members: {},
    collaborations: [],
    stats: {},
    patterns: {},
    recommendations: []
  })

  useEffect(() => {
    if (repository && token) {
      fetchDetailedTeamData()
    }
  }, [repository, token])

  const fetchDetailedTeamData = async () => {
    setLoading(true)
    
    try {
      // Fetch contributors
      const contributorsResponse = await fetch(
        `https://api.github.com/repos/${repository.owner.login}/${repository.name}/contributors?per_page=50`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      )

      let contributors = []
      if (contributorsResponse.ok) {
        contributors = await contributorsResponse.json()
      }

      // Fetch pull requests for collaboration analysis
      const prsResponse = await fetch(
        `https://api.github.com/repos/${repository.owner.login}/${repository.name}/pulls?state=all&per_page=100`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      )

      let prs = []
      if (prsResponse.ok) {
        prs = await prsResponse.json()
      }

      // Fetch detailed PR data with reviews
      const detailedPRs = []
      for (const pr of prs.slice(0, 30)) {
        try {
          const reviewsResponse = await fetch(
            `https://api.github.com/repos/${repository.owner.login}/${repository.name}/pulls/${pr.number}/reviews`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            }
          )
          
          let reviews = []
          if (reviewsResponse.ok) {
            reviews = await reviewsResponse.json()
          }

          detailedPRs.push({ ...pr, reviews })
        } catch (error) {
          console.error(`Error fetching reviews for PR ${pr.number}:`, error)
        }
      }

      processTeamAnalytics(contributors, detailedPRs)
    } catch (error) {
      console.error('Error fetching detailed team data:', error)
    } finally {
      setLoading(false)
    }
  }

  const processTeamAnalytics = (contributors, prs) => {
    const teamMembers = {}
    const collaborationMatrix = {}
    const reviewPatterns = {}
    const workTimePatterns = {}

    // Process contributors
    contributors.forEach(contributor => {
      teamMembers[contributor.login] = {
        username: contributor.login,
        avatar: contributor.avatar_url,
        contributions: contributor.contributions,
        prsCreated: 0,
        prsReviewed: 0,
        reviewsGiven: 0,
        reviewsReceived: 0,
        avgResponseTime: 0,
        collaborators: new Set(),
        expertise: {},
        activity: []
      }
    })

    // Process PRs and reviews
    prs.forEach(pr => {
      const author = pr.user.login
      
      if (teamMembers[author]) {
        teamMembers[author].prsCreated++
        teamMembers[author].activity.push({
          type: 'pr_created',
          date: pr.created_at,
          title: pr.title
        })
      }

      pr.reviews?.forEach(review => {
        const reviewer = review.user.login
        
        if (teamMembers[reviewer]) {
          teamMembers[reviewer].reviewsGiven++
          teamMembers[reviewer].collaborators.add(author)
          
          if (teamMembers[author]) {
            teamMembers[author].reviewsReceived++
            teamMembers[author].collaborators.add(reviewer)
          }

          // Collaboration matrix
          const key = `${author}-${reviewer}`
          if (!collaborationMatrix[key]) {
            collaborationMatrix[key] = {
              author,
              reviewer,
              count: 0,
              avgResponseTime: 0,
              reviews: []
            }
          }
          collaborationMatrix[key].count++
          collaborationMatrix[key].reviews.push(review)

          // Review patterns
          if (!reviewPatterns[reviewer]) {
            reviewPatterns[reviewer] = {
              approved: 0,
              changesRequested: 0,
              commented: 0
            }
          }
          
          if (review.state === 'APPROVED') reviewPatterns[reviewer].approved++
          else if (review.state === 'CHANGES_REQUESTED') reviewPatterns[reviewer].changesRequested++
          else reviewPatterns[reviewer].commented++
        }
      })
    })

    // Calculate team metrics
    const totalMembers = Object.keys(teamMembers).length
    const totalCollaborations = Object.keys(collaborationMatrix).length
    const avgCollaboratorsPerMember = totalMembers > 0 ? 
      Object.values(teamMembers).reduce((sum, member) => sum + member.collaborators.size, 0) / totalMembers : 0

    // Find knowledge silos and review bottlenecks
    const knowledgeDistribution = analyzeKnowledgeDistribution(teamMembers, prs)
    const reviewBottlenecks = analyzeReviewBottlenecks(reviewPatterns)
    
    // Generate recommendations
    const recommendations = generateTeamRecommendations(
      teamMembers, 
      collaborationMatrix, 
      knowledgeDistribution, 
      reviewBottlenecks
    )

    // Convert collaborators sets to arrays for serialization
    Object.values(teamMembers).forEach(member => {
      member.collaborators = Array.from(member.collaborators)
    })

    setTeamData({
      members: teamMembers,
      collaborations: Object.values(collaborationMatrix)
        .sort((a, b) => b.count - a.count)
        .slice(0, 20),
      stats: {
        totalMembers,
        totalCollaborations,
        avgCollaboratorsPerMember: Math.round(avgCollaboratorsPerMember * 10) / 10,
        totalPRs: prs.length,
        avgPRsPerMember: Math.round((prs.length / totalMembers) * 10) / 10
      },
      patterns: {
        reviewPatterns,
        knowledgeDistribution,
        reviewBottlenecks,
        topContributors: Object.values(teamMembers)
          .sort((a, b) => b.contributions - a.contributions)
          .slice(0, 10)
      },
      recommendations
    })
  }

  const analyzeKnowledgeDistribution = (members, prs) => {
    const fileExpertise = {}
    
    // This would require additional API calls to get file changes per PR
    // For now, we'll use a simplified analysis
    return Object.entries(members).map(([username, data]) => ({
      username,
      contributions: data.contributions,
      prsCreated: data.prsCreated,
      reviewsGiven: data.reviewsGiven,
      collaboratorCount: data.collaborators.length
    })).sort((a, b) => b.contributions - a.contributions)
  }

  const analyzeReviewBottlenecks = (patterns) => {
    return Object.entries(patterns).map(([reviewer, stats]) => ({
      reviewer,
      totalReviews: stats.approved + stats.changesRequested + stats.commented,
      approvalRate: stats.approved / (stats.approved + stats.changesRequested + stats.commented) * 100,
      ...stats
    })).sort((a, b) => b.totalReviews - a.totalReviews)
  }

  const generateTeamRecommendations = (members, collaborations, knowledge, bottlenecks) => {
    const recommendations = []
    const memberCount = Object.keys(members).length

    // Knowledge distribution
    if (knowledge.length > 0) {
      const topContributor = knowledge[0]
      const contributionPercentage = (topContributor.contributions / 
        knowledge.reduce((sum, m) => sum + m.contributions, 0)) * 100

      if (contributionPercentage > 50) {
        recommendations.push({
          type: 'warning',
          title: 'Knowledge Concentration Risk',
          message: `${topContributor.username} accounts for ${contributionPercentage.toFixed(1)}% of contributions.`,
          action: 'Encourage knowledge sharing through pair programming and code reviews.'
        })
      }
    }

    // Review distribution
    if (bottlenecks.length > 0) {
      const topReviewer = bottlenecks[0]
      const reviewPercentage = (topReviewer.totalReviews / 
        bottlenecks.reduce((sum, r) => sum + r.totalReviews, 0)) * 100

      if (reviewPercentage > 40) {
        recommendations.push({
          type: 'info',
          title: 'Review Load Imbalance',
          message: `${topReviewer.reviewer} handles ${reviewPercentage.toFixed(1)}% of code reviews.`,
          action: 'Distribute review responsibilities more evenly across team members.'
        })
      }
    }

    // Collaboration diversity
    const avgCollaborators = Object.values(members).reduce((sum, m) => sum + m.collaborators.length, 0) / memberCount
    if (avgCollaborators < 2 && memberCount > 3) {
      recommendations.push({
        type: 'info',
        title: 'Limited Cross-Team Collaboration',
        message: 'Team members have limited collaboration outside their immediate circle.',
        action: 'Rotate review assignments and encourage cross-functional work.'
      })
    }

    // Approval rates
    if (bottlenecks.length > 0) {
      const lowApprovalReviewers = bottlenecks.filter(r => r.approvalRate < 30 && r.totalReviews > 5)
      if (lowApprovalReviewers.length > 0) {
        recommendations.push({
          type: 'info',
          title: 'Strict Review Standards',
          message: `Some reviewers have low approval rates, indicating thorough but potentially slow reviews.`,
          action: 'Balance thoroughness with development velocity in code reviews.'
        })
      }
    }

    return recommendations
  }

  const collaborationChartData = {
    labels: teamData.collaborations?.slice(0, 10).map(c => `${c.author} → ${c.reviewer}`) || [],
    datasets: [{
      label: 'Collaboration Frequency',
      data: teamData.collaborations?.slice(0, 10).map(c => c.count) || [],
      backgroundColor: '#2DD4BF',
      borderColor: '#1F2937',
      borderWidth: 1
    }]
  }

  const contributionChartData = {
    labels: teamData.patterns.topContributors?.slice(0, 8).map(c => c.username) || [],
    datasets: [{
      label: 'Contributions',
      data: teamData.patterns.topContributors?.slice(0, 8).map(c => c.contributions) || [],
      backgroundColor: [
        '#2DD4BF', '#3B82F6', '#8B5CF6', '#F59E0B', 
        '#EF4444', '#10B981', '#F97316', '#6B7280'
      ],
      borderWidth: 2,
      borderColor: '#374151'
    }]
  }

  const reviewPatternChartData = {
    labels: ['Approved', 'Changes Requested', 'Commented'],
    datasets: [{
      data: [
        teamData.patterns.reviewBottlenecks?.reduce((sum, r) => sum + r.approved, 0) || 0,
        teamData.patterns.reviewBottlenecks?.reduce((sum, r) => sum + r.changesRequested, 0) || 0,
        teamData.patterns.reviewBottlenecks?.reduce((sum, r) => sum + r.commented, 0) || 0
      ],
      backgroundColor: ['#10B981', '#EF4444', '#F59E0B'],
      borderWidth: 2,
      borderColor: '#374151'
    }]
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        labels: { color: '#ffffff' }
      }
    },
    scales: {
      x: {
        ticks: { color: '#9CA3AF' },
        grid: { color: '#374151' }
      },
      y: {
        ticks: { color: '#9CA3AF' },
        grid: { color: '#374151' }
      }
    }
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Team Analysis</h1>
          <p className="text-gray-400">Collaboration patterns and team dynamics</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card text-center">
              <div className="text-3xl font-bold text-blue-400">{teamData.stats.totalMembers}</div>
              <div className="text-gray-400 text-sm">Team Members</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-green-400">{teamData.stats.totalCollaborations}</div>
              <div className="text-gray-400 text-sm">Collaborations</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-teal-400">{teamData.stats.avgCollaboratorsPerMember}</div>
              <div className="text-gray-400 text-sm">Avg Collaborators</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-purple-400">{teamData.stats.avgPRsPerMember}</div>
              <div className="text-gray-400 text-sm">Avg PRs/Member</div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Top Collaborations</h3>
              <div className="h-64">
                <Bar data={collaborationChartData} options={chartOptions} />
              </div>
            </div>
            
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Contribution Distribution</h3>
              <div className="h-64">
                <Doughnut data={contributionChartData} options={{ responsive: true, plugins: { legend: { labels: { color: '#ffffff' } } } }} />
              </div>
            </div>
            
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Review Patterns</h3>
              <div className="h-64">
                <Doughnut data={reviewPatternChartData} options={{ responsive: true, plugins: { legend: { labels: { color: '#ffffff' } } } }} />
              </div>
            </div>
            
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Team Members</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {teamData.patterns.topContributors?.slice(0, 6).map((member) => (
                  <div key={member.username} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-teal-400 to-blue-500 rounded-full flex items-center justify-center text-xs font-bold">
                        {member.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-medium">{member.username}</div>
                        <div className="text-xs text-gray-400">
                          {member.collaboratorCount} collaborators
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-teal-400 font-bold">{member.contributions}</div>
                      <div className="text-xs text-gray-400">commits</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Detailed Analysis */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Review Leaders</h3>
              <div className="space-y-3">
                {teamData.patterns.reviewBottlenecks?.slice(0, 6).map((reviewer) => (
                  <div key={reviewer.reviewer} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-xs font-bold">
                        {reviewer.reviewer.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-medium">{reviewer.reviewer}</div>
                        <div className="text-xs text-gray-400">
                          ✅ {reviewer.approved} 🔄 {reviewer.changesRequested} 💬 {reviewer.commented}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-purple-400 font-bold">{reviewer.totalReviews}</div>
                      <div className="text-xs text-gray-400">
                        {reviewer.approvalRate.toFixed(1)}% approved
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Collaboration Network</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {teamData.collaborations?.slice(0, 8).map((collab, index) => (
                  <div key={index} className="bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-400 font-medium">{collab.author}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-purple-400 font-medium">{collab.reviewer}</span>
                      </div>
                      <span className="text-teal-400 font-bold">{collab.count}</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-teal-400 to-blue-500 h-2 rounded-full" 
                        style={{ width: `${Math.min(100, (collab.count / Math.max(...(teamData.collaborations?.map(c => c.count) || [1]))) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {teamData.recommendations.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Team Recommendations</h3>
              <div className="space-y-4">
                {teamData.recommendations.map((rec, index) => (
                  <div key={index} className={`p-4 rounded-lg border-l-4 ${
                    rec.type === 'warning' ? 'bg-yellow-900/20 border-yellow-400' : 'bg-blue-900/20 border-blue-400'
                  }`}>
                    <h4 className="font-medium text-white mb-1">{rec.title}</h4>
                    <p className="text-gray-300 text-sm mb-2">{rec.message}</p>
                    <p className="text-teal-400 text-sm">{rec.action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}