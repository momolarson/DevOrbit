import { useState, useEffect } from 'react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { useAuth } from '../../hooks/useAuth'

export default function CommitsDashboard({ repository, onBack }) {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [commitData, setCommitData] = useState({
    commits: [],
    stats: {},
    patterns: {},
    recommendations: []
  })
  const [timeRange, setTimeRange] = useState(90)

  useEffect(() => {
    if (repository && token) {
      fetchDetailedCommitData()
    }
  }, [repository, token, timeRange])

  const fetchDetailedCommitData = async () => {
    setLoading(true)
    
    try {
      const daysAgo = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000).toISOString()
      const url = `https://api.github.com/repos/${repository.owner.login}/${repository.name}/commits?since=${daysAgo}&per_page=100`
      
      console.log('Fetching detailed commit data from:', url)
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })

      if (response.ok) {
        const commits = await response.json()
        console.log('Detailed commits fetched:', commits.length)
        
        // Fetch additional stats for each commit
        const enrichedCommits = await Promise.all(
          commits.slice(0, 20).map(async (commit) => {
            try {
              const statsResponse = await fetch(commit.url, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Accept': 'application/vnd.github.v3+json'
                }
              })
              
              if (statsResponse.ok) {
                const detailedCommit = await statsResponse.json()
                return {
                  ...commit,
                  stats: detailedCommit.stats,
                  files: detailedCommit.files
                }
              }
            } catch (error) {
              console.log('Failed to fetch stats for commit:', commit.sha)
            }
            return commit
          })
        )
        
        processCommitAnalytics(enrichedCommits)
      }
    } catch (error) {
      console.error('Error fetching detailed commit data:', error)
    } finally {
      setLoading(false)
    }
  }

  const processCommitAnalytics = (commits) => {
    // Time patterns
    const hourlyPattern = new Array(24).fill(0)
    const dailyPattern = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 } // Sunday = 0
    const authors = {}
    const commitSizes = { small: 0, medium: 0, large: 0 }
    const messageTypes = { feat: 0, fix: 0, docs: 0, style: 0, refactor: 0, test: 0, other: 0 }

    commits.forEach(commit => {
      const date = new Date(commit.commit.author.date)
      const hour = date.getHours()
      const day = date.getDay()
      
      hourlyPattern[hour]++
      dailyPattern[day]++
      
      // Author analysis
      const author = commit.commit.author.name
      if (!authors[author]) {
        authors[author] = { commits: 0, additions: 0, deletions: 0, files: 0 }
      }
      authors[author].commits++
      
      if (commit.stats) {
        authors[author].additions += commit.stats.additions || 0
        authors[author].deletions += commit.stats.deletions || 0
        authors[author].files += (commit.files?.length || 0)
        
        // Commit size analysis
        const total = (commit.stats.additions || 0) + (commit.stats.deletions || 0)
        if (total <= 85) commitSizes.small++
        else if (total <= 300) commitSizes.medium++
        else commitSizes.large++
      }
      
      // Message type analysis
      const message = commit.commit.message.toLowerCase()
      if (message.startsWith('feat')) messageTypes.feat++
      else if (message.startsWith('fix')) messageTypes.fix++
      else if (message.startsWith('docs')) messageTypes.docs++
      else if (message.startsWith('style')) messageTypes.style++
      else if (message.startsWith('refactor')) messageTypes.refactor++
      else if (message.startsWith('test')) messageTypes.test++
      else messageTypes.other++
    })

    // Generate recommendations
    const recommendations = generateCommitRecommendations(commits, commitSizes, messageTypes, authors)

    setCommitData({
      commits,
      stats: {
        total: commits.length,
        authors: Object.keys(authors).length,
        avgPerDay: commits.length / timeRange,
        commitSizes,
        messageTypes
      },
      patterns: {
        hourlyPattern,
        dailyPattern,
        authors: Object.entries(authors)
          .sort(([,a], [,b]) => b.commits - a.commits)
          .slice(0, 10)
      },
      recommendations
    })
  }

  const generateCommitRecommendations = (commits, sizes, types, authors) => {
    const recommendations = []
    
    // Commit size recommendations
    const largePercentage = (sizes.large / (sizes.small + sizes.medium + sizes.large)) * 100
    if (largePercentage > 20) {
      recommendations.push({
        type: 'warning',
        title: 'Large Commits Detected',
        message: `${largePercentage.toFixed(1)}% of commits are large (>300 lines). Consider breaking them down.`,
        action: 'Aim for commits under 85 lines for better reviewability.'
      })
    }

    // Message convention recommendations
    const conventionalPercentage = ((types.feat + types.fix + types.docs + types.refactor + types.test) / Object.values(types).reduce((a, b) => a + b, 0)) * 100
    if (conventionalPercentage < 60) {
      recommendations.push({
        type: 'info',
        title: 'Commit Message Convention',
        message: `Only ${conventionalPercentage.toFixed(1)}% of commits follow conventional format.`,
        action: 'Use prefixes like feat:, fix:, docs: for better commit organization.'
      })
    }

    // Author distribution
    const topAuthor = Object.values(authors).sort((a, b) => b.commits - a.commits)[0]
    if (topAuthor && topAuthor.commits > commits.length * 0.7) {
      recommendations.push({
        type: 'info',
        title: 'Code Ownership Distribution',
        message: 'One author is responsible for most commits.',
        action: 'Consider encouraging more distributed contributions for knowledge sharing.'
      })
    }

    return recommendations
  }

  const timePatternChartData = {
    labels: ['12AM', '2AM', '4AM', '6AM', '8AM', '10AM', '12PM', '2PM', '4PM', '6PM', '8PM', '10PM'],
    datasets: [{
      label: 'Commits by Hour',
      data: commitData.patterns.hourlyPattern?.filter((_, i) => i % 2 === 0) || [],
      borderColor: '#2DD4BF',
      backgroundColor: 'rgba(45, 212, 191, 0.1)',
      fill: true,
      tension: 0.4
    }]
  }

  const commitSizeChartData = {
    labels: ['Small (<85 lines)', 'Medium (85-300 lines)', 'Large (>300 lines)'],
    datasets: [{
      data: [
        commitData.stats.commitSizes?.small || 0,
        commitData.stats.commitSizes?.medium || 0,
        commitData.stats.commitSizes?.large || 0
      ],
      backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
      borderWidth: 2,
      borderColor: '#374151'
    }]
  }

  const messageTypeChartData = {
    labels: ['Feature', 'Fix', 'Docs', 'Style', 'Refactor', 'Test', 'Other'],
    datasets: [{
      label: 'Commit Types',
      data: [
        commitData.stats.messageTypes?.feat || 0,
        commitData.stats.messageTypes?.fix || 0,
        commitData.stats.messageTypes?.docs || 0,
        commitData.stats.messageTypes?.style || 0,
        commitData.stats.messageTypes?.refactor || 0,
        commitData.stats.messageTypes?.test || 0,
        commitData.stats.messageTypes?.other || 0
      ],
      backgroundColor: '#2DD4BF',
      borderColor: '#1F2937',
      borderWidth: 1
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
      <div className="flex items-center justify-between">
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
            <h1 className="text-2xl font-bold text-white">Commits Analysis</h1>
            <p className="text-gray-400">Detailed commit patterns and recommendations</p>
          </div>
        </div>
        
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(parseInt(e.target.value))}
          className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
        >
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={180}>Last 6 months</option>
        </select>
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
              <div className="text-3xl font-bold text-teal-400">{commitData.stats.total}</div>
              <div className="text-gray-400 text-sm">Total Commits</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-blue-400">{commitData.stats.authors}</div>
              <div className="text-gray-400 text-sm">Contributors</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-green-400">{commitData.stats.avgPerDay?.toFixed(1)}</div>
              <div className="text-gray-400 text-sm">Avg/Day</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-purple-400">
                {commitData.stats.commitSizes ? Math.round((commitData.stats.commitSizes.small / commitData.stats.total) * 100) : 0}%
              </div>
              <div className="text-gray-400 text-sm">Small Commits</div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Commit Activity by Time</h3>
              <div className="h-64">
                <Line data={timePatternChartData} options={chartOptions} />
              </div>
            </div>
            
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Commit Size Distribution</h3>
              <div className="h-64">
                <Doughnut data={commitSizeChartData} options={{ responsive: true, plugins: { legend: { labels: { color: '#ffffff' } } } }} />
              </div>
            </div>
            
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Message Types</h3>
              <div className="h-64">
                <Bar data={messageTypeChartData} options={chartOptions} />
              </div>
            </div>
            
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Top Contributors</h3>
              <div className="space-y-3">
                {commitData.patterns.authors?.slice(0, 5).map(([author, stats], index) => (
                  <div key={author} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-xs font-bold">
                        {author.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-medium">{author}</div>
                        <div className="text-xs text-gray-400">
                          +{stats.additions} -{stats.deletions} lines
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-teal-400 font-bold">{stats.commits}</div>
                      <div className="text-xs text-gray-400">commits</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {commitData.recommendations.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Recommendations</h3>
              <div className="space-y-4">
                {commitData.recommendations.map((rec, index) => (
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