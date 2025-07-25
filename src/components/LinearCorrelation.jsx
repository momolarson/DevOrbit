import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import LinearAPI from '../utils/linearApi'
import { toast } from 'react-toastify'

export default function LinearCorrelation({ repository }) {
  const { linearToken, isLinearAuthenticated, token } = useAuth()
  const [data, setData] = useState({
    correlations: [],
    githubData: {},
    linearData: {},
    loading: false
  })

  useEffect(() => {
    if (isLinearAuthenticated && linearToken && repository && token) {
      fetchCorrelationData()
    }
  }, [isLinearAuthenticated, linearToken, repository, token])

  const fetchCorrelationData = async () => {
    setData(prev => ({ ...prev, loading: true }))
    
    try {
      const api = new LinearAPI(linearToken)
      
      // Fetch Linear issues
      const linearIssues = await api.getIssues({ limit: 100 })
      
      // Fetch GitHub commits for correlation
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const commitsUrl = `https://api.github.com/repos/${repository.owner.login}/${repository.name}/commits?since=${thirtyDaysAgo}&per_page=100`
      
      const commitsResponse = await fetch(commitsUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })

      if (!commitsResponse.ok) {
        throw new Error('Failed to fetch GitHub commits')
      }

      const commits = await commitsResponse.json()

      // Fetch Pull Requests
      const prUrl = `https://api.github.com/repos/${repository.owner.login}/${repository.name}/pulls?state=all&per_page=100`
      const prResponse = await fetch(prUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })

      const pullRequests = prResponse.ok ? await prResponse.json() : []

      // Correlate Linear issues with GitHub activity
      const correlations = correlateLinearWithGitHub(linearIssues, commits, pullRequests)

      setData({
        correlations,
        githubData: { commits, pullRequests },
        linearData: { issues: linearIssues },
        loading: false
      })
      
    } catch (error) {
      console.error('Error fetching correlation data:', error)
      toast.error('Failed to fetch correlation data')
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  const correlateLinearWithGitHub = (issues, commits, pullRequests) => {
    const correlations = []

    issues.forEach(issue => {
      if (!issue.assignee) return

      const correlation = {
        issue,
        relatedCommits: [],
        relatedPRs: [],
        activityScore: 0,
        velocityRatio: 0
      }

      // Find related commits by issue identifier or title keywords
      const issueKeywords = [
        issue.identifier,
        issue.title.toLowerCase().split(' ').filter(word => word.length > 3)
      ].flat()

      correlation.relatedCommits = commits.filter(commit => {
        const message = commit.commit.message.toLowerCase()
        const author = commit.author?.login || commit.commit.author.email
        const assigneeEmail = issue.assignee.email

        // Check if commit is by the same person or references the issue
        return (
          (author === assigneeEmail || commit.author?.login === issue.assignee.name) ||
          issueKeywords.some(keyword => message.includes(keyword.toLowerCase()))
        )
      })

      // Find related PRs
      correlation.relatedPRs = pullRequests.filter(pr => {
        const title = pr.title.toLowerCase()
        const body = (pr.body || '').toLowerCase()
        const author = pr.user?.login

        return (
          (author === issue.assignee.name) ||
          issueKeywords.some(keyword => 
            title.includes(keyword.toLowerCase()) || 
            body.includes(keyword.toLowerCase())
          )
        )
      })

      // Calculate activity score
      correlation.activityScore = correlation.relatedCommits.length + (correlation.relatedPRs.length * 2)

      // Calculate velocity ratio (story points vs activity)
      if (issue.estimate && correlation.activityScore > 0) {
        correlation.velocityRatio = issue.estimate / correlation.activityScore
      }

      // Only include correlations with some activity
      if (correlation.activityScore > 0) {
        correlations.push(correlation)
      }
    })

    return correlations.sort((a, b) => b.activityScore - a.activityScore)
  }

  const getPerformanceInsights = () => {
    if (data.correlations.length === 0) return []

    const insights = []
    const avgVelocityRatio = data.correlations
      .filter(c => c.velocityRatio > 0)
      .reduce((sum, c) => sum + c.velocityRatio, 0) / 
      data.correlations.filter(c => c.velocityRatio > 0).length

    // High performers (above average velocity ratio)
    const highPerformers = data.correlations.filter(c => 
      c.velocityRatio > avgVelocityRatio && c.velocityRatio > 0
    )

    // Issues taking too long (high story points, low activity)
    const stuckIssues = data.correlations.filter(c => 
      c.issue.estimate > 5 && c.activityScore < 3
    )

    // Overactive issues (low story points, high activity)
    const overactiveIssues = data.correlations.filter(c => 
      c.issue.estimate < 3 && c.activityScore > 10
    )

    if (highPerformers.length > 0) {
      insights.push({
        type: 'success',
        title: 'High Velocity Contributors',
        description: `${highPerformers.length} issues showing excellent story point to activity ratio`,
        items: highPerformers.slice(0, 3).map(c => `${c.issue.identifier}: ${c.issue.assignee.displayName}`)
      })
    }

    if (stuckIssues.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Potentially Stuck Issues',
        description: `${stuckIssues.length} high-point issues with low GitHub activity`,
        items: stuckIssues.slice(0, 3).map(c => `${c.issue.identifier}: ${c.issue.estimate} pts, ${c.activityScore} activity`)
      })
    }

    if (overactiveIssues.length > 0) {
      insights.push({
        type: 'info',
        title: 'Scope Creep Candidates',
        description: `${overactiveIssues.length} low-point issues with high activity (possible scope creep)`,
        items: overactiveIssues.slice(0, 3).map(c => `${c.issue.identifier}: ${c.issue.estimate} pts, ${c.activityScore} activity`)
      })
    }

    return insights
  }

  if (!isLinearAuthenticated) {
    return (
      <div className="card">
        <h2 className="text-xl font-bold text-white mb-4">Linear Correlation</h2>
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4">Connect Linear to see story point correlations with GitHub activity</p>
          <div className="text-sm text-gray-500">
            This analysis helps identify performance patterns and workload optimization opportunities
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <h2 className="text-xl font-bold text-white mb-4">Linear × GitHub Correlation</h2>
      
      {data.loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-400"></div>
          <span className="ml-3 text-gray-400">Analyzing correlations...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Performance Insights */}
          {getPerformanceInsights().map((insight, index) => (
            <div 
              key={index} 
              className={`p-4 rounded-lg border ${
                insight.type === 'success' ? 'bg-green-900/20 border-green-700' :
                insight.type === 'warning' ? 'bg-yellow-900/20 border-yellow-700' :
                'bg-blue-900/20 border-blue-700'
              }`}
            >
              <h3 className={`font-medium mb-2 ${
                insight.type === 'success' ? 'text-green-400' :
                insight.type === 'warning' ? 'text-yellow-400' :
                'text-blue-400'
              }`}>
                {insight.title}
              </h3>
              <p className="text-gray-300 text-sm mb-2">{insight.description}</p>
              <ul className="text-xs text-gray-400 space-y-1">
                {insight.items.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>
          ))}

          {/* Correlation Table */}
          {data.correlations.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400">Issue</th>
                    <th className="text-left py-3 px-4 text-gray-400">Assignee</th>
                    <th className="text-left py-3 px-4 text-gray-400">Points</th>
                    <th className="text-left py-3 px-4 text-gray-400">Commits</th>
                    <th className="text-left py-3 px-4 text-gray-400">PRs</th>
                    <th className="text-left py-3 px-4 text-gray-400">Activity</th>
                    <th className="text-left py-3 px-4 text-gray-400">Velocity</th>
                  </tr>
                </thead>
                <tbody>
                  {data.correlations.slice(0, 10).map((correlation) => (
                    <tr key={correlation.issue.id} className="border-b border-gray-800 hover:bg-gray-800">
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-white font-medium">{correlation.issue.identifier}</p>
                          <p className="text-sm text-gray-400 truncate max-w-xs">{correlation.issue.title}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-white text-sm">
                          {correlation.issue.assignee?.displayName || correlation.issue.assignee?.name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-white">{correlation.issue.estimate || '-'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-white">{correlation.relatedCommits.length}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-white">{correlation.relatedPRs.length}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-medium ${
                          correlation.activityScore > 10 ? 'text-green-400' :
                          correlation.activityScore > 5 ? 'text-yellow-400' :
                          'text-gray-400'
                        }`}>
                          {correlation.activityScore}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-white">
                          {correlation.velocityRatio > 0 ? correlation.velocityRatio.toFixed(2) : '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.correlations.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400">No correlations found between Linear issues and GitHub activity</p>
              <p className="text-sm text-gray-500 mt-2">
                Try ensuring Linear issue identifiers are referenced in commit messages
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}