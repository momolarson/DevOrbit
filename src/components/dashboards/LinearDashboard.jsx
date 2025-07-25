import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import LinearAPI from '../../utils/linearApi'
import StoryPointEstimatorComponent from '../StoryPointEstimator'
import { toast } from 'react-toastify'

export default function LinearDashboard() {
  const { linearToken, isLinearAuthenticated, loginLinear } = useAuth()
  const [data, setData] = useState({
    issues: [],
    teams: [],
    performance: null,
    loading: false
  })
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [dateRange, setDateRange] = useState(30)
  const [recommendations, setRecommendations] = useState([])

  useEffect(() => {
    if (isLinearAuthenticated && linearToken) {
      fetchLinearData()
    }
  }, [isLinearAuthenticated, linearToken, selectedTeam, dateRange])

  const fetchLinearData = async () => {
    setData(prev => ({ ...prev, loading: true }))
    
    try {
      const api = new LinearAPI(linearToken)
      
      // Fetch teams first
      const teams = await api.getTeams()
      
      // Get issues and performance for selected team or all
      const teamId = selectedTeam?.id
      const issues = await api.getIssues({ teamId, limit: 100 })
      const performance = await api.getTeamPerformance(teamId, dateRange)
      
      // Generate workload recommendations
      const workloadRecommendations = api.generateWorkloadRecommendations(performance)
      
      setData({
        issues,
        teams,
        performance,
        loading: false
      })
      
      setRecommendations(workloadRecommendations)
      
    } catch (error) {
      console.error('Error fetching Linear data:', error)
      toast.error('Failed to fetch Linear data')
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  if (!isLinearAuthenticated) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="mb-6">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-2xl font-bold text-white mb-2">Linear Integration</h2>
            <p className="text-gray-400 mb-6">Connect to Linear to analyze ticket points vs engineer performance</p>
          </div>
          
          <button
            onClick={loginLinear}
            className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Connect Linear Account
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Linear Analytics</h1>
          <p className="text-gray-400">Ticket points vs engineer performance analysis</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 mt-4 sm:mt-0">
          {/* Team Selection */}
          <select
            value={selectedTeam?.id || ''}
            onChange={(e) => {
              const team = data.teams.find(t => t.id === e.target.value)
              setSelectedTeam(team || null)
            }}
            className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <option value="">All Teams</option>
            {data.teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name} ({team.key})
              </option>
            ))}
          </select>
          
          {/* Date Range Selection */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(parseInt(e.target.value))}
            className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {data.loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
          <span className="ml-3 text-gray-400">Loading Linear data...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Workload Optimization Recommendations */}
          {recommendations.length > 0 && (
            <div className="card">
              <h2 className="text-xl font-bold text-white mb-4">Workload Optimization Recommendations</h2>
              <div className="space-y-4">
                {recommendations.map((rec, index) => (
                  <div 
                    key={index}
                    className={`p-4 rounded-lg border ${
                      rec.type === 'success' ? 'bg-green-900/20 border-green-700' :
                      rec.type === 'warning' ? 'bg-yellow-900/20 border-yellow-700' :
                      'bg-blue-900/20 border-blue-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className={`font-medium ${
                        rec.type === 'success' ? 'text-green-400' :
                        rec.type === 'warning' ? 'text-yellow-400' :
                        'text-blue-400'
                      }`}>
                        {rec.title}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        rec.priority === 'high' ? 'bg-red-900 text-red-200' :
                        rec.priority === 'medium' ? 'bg-yellow-900 text-yellow-200' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {rec.priority} priority
                      </span>
                    </div>
                    
                    <p className="text-gray-300 text-sm mb-3">{rec.description}</p>
                    
                    {rec.members && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-400 mb-1">Affected members:</p>
                        <div className="flex flex-wrap gap-1">
                          {rec.members.map((member, i) => (
                            <span key={i} className="px-2 py-1 bg-gray-700 rounded text-xs text-white">
                              {member}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Recommended actions:</p>
                      <ul className="text-xs text-gray-300 space-y-1">
                        {rec.actionItems.map((action, i) => (
                          <li key={i} className="flex items-start">
                            <span className="text-teal-400 mr-2">•</span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team Performance Summary */}
          {data.performance && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Completed Issues</p>
                    <p className="text-2xl font-bold text-white mt-1">{data.performance.teamMetrics.completedCount}</p>
                    <p className="text-xs text-gray-500 mt-1">Last {dateRange} days</p>
                  </div>
                  <div className="text-green-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Story Points</p>
                    <p className="text-2xl font-bold text-white mt-1">{data.performance.teamMetrics.totalEstimate}</p>
                    <p className="text-xs text-gray-500 mt-1">Completed</p>
                  </div>
                  <div className="text-blue-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Avg Time to Complete</p>
                    <p className="text-2xl font-bold text-white mt-1">{data.performance.teamMetrics.avgTimeToComplete}d</p>
                    <p className="text-xs text-gray-500 mt-1">Per issue</p>
                  </div>
                  <div className="text-purple-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-400">Estimate Accuracy</p>
                    <p className="text-2xl font-bold text-white mt-1">{data.performance.teamMetrics.estimateAccuracy}%</p>
                    <p className="text-xs text-gray-500 mt-1">Issues with estimates</p>
                  </div>
                  <div className="text-teal-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Team Member Performance */}
          {data.performance?.memberPerformance && (
            <div className="card">
              <h2 className="text-xl font-bold text-white mb-4">Team Member Performance</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-400">Developer</th>
                      <th className="text-left py-3 px-4 text-gray-400">Completed</th>
                      <th className="text-left py-3 px-4 text-gray-400">Story Points</th>
                      <th className="text-left py-3 px-4 text-gray-400">Avg Days</th>
                      <th className="text-left py-3 px-4 text-gray-400">Estimate Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(data.performance.memberPerformance).map((member) => (
                      <tr key={member.assignee.id} className="border-b border-gray-800 hover:bg-gray-800">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            {member.assignee.avatarUrl ? (
                              <img 
                                src={member.assignee.avatarUrl} 
                                alt={member.assignee.displayName}
                                className="w-8 h-8 rounded-full mr-3"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-gray-600 rounded-full mr-3 flex items-center justify-center">
                                <span className="text-xs text-gray-300">
                                  {member.assignee.displayName?.[0] || member.assignee.name?.[0] || '?'}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="text-white font-medium">
                                {member.assignee.displayName || member.assignee.name}
                              </p>
                              <p className="text-xs text-gray-400">{member.assignee.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-white">{member.metrics.completedCount}</td>
                        <td className="py-3 px-4 text-white">{member.metrics.totalEstimate}</td>
                        <td className="py-3 px-4 text-white">{member.metrics.avgTimeToComplete}</td>
                        <td className="py-3 px-4 text-white">{member.metrics.estimateAccuracy}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AI Story Point Estimator */}
          <StoryPointEstimatorComponent />

          {/* Recent Issues */}
          <div className="card">
            <h2 className="text-xl font-bold text-white mb-4">Recent Issues</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400">Issue</th>
                    <th className="text-left py-3 px-4 text-gray-400">Assignee</th>
                    <th className="text-left py-3 px-4 text-gray-400">Points</th>
                    <th className="text-left py-3 px-4 text-gray-400">Priority</th>
                    <th className="text-left py-3 px-4 text-gray-400">Status</th>
                    <th className="text-left py-3 px-4 text-gray-400">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {data.issues.slice(0, 20).map((issue) => (
                    <tr key={issue.id} className="border-b border-gray-800 hover:bg-gray-800">
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-white font-medium">{issue.identifier}</p>
                          <p className="text-sm text-gray-400 truncate max-w-xs">{issue.title}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {issue.assignee ? (
                          <div className="flex items-center">
                            {issue.assignee.avatarUrl ? (
                              <img 
                                src={issue.assignee.avatarUrl} 
                                alt={issue.assignee.displayName}
                                className="w-6 h-6 rounded-full mr-2"
                              />
                            ) : (
                              <div className="w-6 h-6 bg-gray-600 rounded-full mr-2 flex items-center justify-center">
                                <span className="text-xs text-gray-300">
                                  {issue.assignee.displayName?.[0] || '?'}
                                </span>
                              </div>
                            )}
                            <span className="text-white text-sm">
                              {issue.assignee.displayName || issue.assignee.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-white">{issue.estimate || '-'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          issue.priority === 1 ? 'bg-red-900 text-red-200' :
                          issue.priority === 2 ? 'bg-orange-900 text-orange-200' :
                          issue.priority === 3 ? 'bg-yellow-900 text-yellow-200' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {issue.priority === 1 ? 'Urgent' :
                           issue.priority === 2 ? 'High' :
                           issue.priority === 3 ? 'Medium' : 'Low'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span 
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{ 
                            backgroundColor: `${issue.state.color}20`,
                            color: issue.state.color 
                          }}
                        >
                          {issue.state.name}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-sm">
                        {new Date(issue.updatedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}