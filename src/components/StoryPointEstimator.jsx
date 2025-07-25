import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import LinearAPI from '../utils/linearApi'
import StoryPointEstimator from '../utils/storyPointEstimator'
import { toast } from 'react-toastify'

export default function StoryPointEstimatorComponent({ repository }) {
  const { linearToken, isLinearAuthenticated, token, user } = useAuth()
  const [data, setData] = useState({
    issues: [],
    estimates: [],
    recommendations: null,
    loading: false
  })
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [estimatorInstance, setEstimatorInstance] = useState(null)

  useEffect(() => {
    if (isLinearAuthenticated && linearToken && token && repository) {
      fetchDataAndEstimate()
    }
  }, [isLinearAuthenticated, linearToken, token, repository])

  const fetchDataAndEstimate = async () => {
    setData(prev => ({ ...prev, loading: true }))
    
    try {
      const api = new LinearAPI(linearToken)
      
      // Try to fetch issues with error handling
      let allIssues = []
      try {
        allIssues = await api.getIssues({ limit: 50 })
      } catch (networkError) {
        console.warn('Linear API network error, using demo data:', networkError)
        // Use demo data for testing
        allIssues = generateDemoIssues()
        toast.warning('Using demo data - Linear API connection failed')
      }

      const unestimatedIssues = allIssues.filter(issue => 
        !issue.estimate || issue.estimate === 0
      )

      // Get user's performance data (with fallback)
      let userPerformance = {
        userId: user?.id,
      }
      
      try {
        const perfData = await getUserPerformanceData(api)
        userPerformance = { ...userPerformance, ...perfData }
      } catch (error) {
        console.warn('Using default performance data:', error)
        userPerformance = {
          ...userPerformance,
          completedCount: 5,
          totalEstimate: 15,
          avgTimeToComplete: 2.5,
          estimateAccuracy: 75
        }
      }

      // Fetch GitHub data for correlation
      const githubData = await fetchGitHubData()

      // Create estimator instance
      const estimator = new StoryPointEstimator(
        { issues: allIssues },
        githubData,
        userPerformance
      )

      setEstimatorInstance(estimator)

      // Generate estimates for unestimated issues
      const estimates = estimator.estimateMultipleIssues(unestimatedIssues)
      const recommendations = estimator.getPrioritizationRecommendations(unestimatedIssues)

      setData({
        issues: unestimatedIssues,
        estimates,
        recommendations,
        loading: false
      })

    } catch (error) {
      console.error('Error fetching estimation data:', error)
      toast.error('Failed to generate story point estimates. Try refreshing the page.')
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  // Generate demo issues for testing when Linear API is not available
  const generateDemoIssues = () => [
    {
      id: 'demo-1',
      identifier: 'DEV-123',
      title: 'Implement user authentication system',
      description: 'Create a robust authentication system with OAuth and session management',
      estimate: 0,
      priority: 2,
      assignee: { id: 'demo-user', name: 'Demo User' },
      team: { id: 'demo-team', name: 'Engineering' },
      state: { type: 'todo' },
      labels: { edges: [{ node: { name: 'feature' } }] },
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'demo-2', 
      identifier: 'DEV-124',
      title: 'Fix button color inconsistency',
      description: 'Update primary button colors to match design system',
      estimate: 0,
      priority: 3,
      assignee: { id: 'demo-user', name: 'Demo User' },
      team: { id: 'demo-team', name: 'Engineering' },
      state: { type: 'todo' },
      labels: { edges: [{ node: { name: 'bug' } }, { node: { name: 'ui' } }] },
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'demo-3',
      identifier: 'DEV-125', 
      title: 'Refactor database schema for performance optimization',
      description: 'Optimize database queries and restructure tables for better performance',
      estimate: 0,
      priority: 1,
      assignee: { id: 'demo-user', name: 'Demo User' },
      team: { id: 'demo-team', name: 'Engineering' },
      state: { type: 'todo' },
      labels: { edges: [{ node: { name: 'refactor' } }, { node: { name: 'performance' } }] },
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'demo-4',
      identifier: 'DEV-126',
      title: 'Add documentation for API endpoints',
      description: 'Create comprehensive documentation for all REST API endpoints',
      estimate: 0,
      priority: 4,
      assignee: { id: 'demo-user', name: 'Demo User' },
      team: { id: 'demo-team', name: 'Engineering' },
      state: { type: 'todo' },
      labels: { edges: [{ node: { name: 'documentation' } }] },
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]

  const getUserPerformanceData = async (api) => {
    try {
      const userIssues = await api.getUserIssues(user?.id, 90) // Last 90 days
      return api.calculateVelocityMetrics(userIssues)
    } catch (error) {
      console.error('Error fetching user performance:', error)
      return {}
    }
  }

  const fetchGitHubData = async () => {
    if (!repository || !token) return {}

    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const commitsUrl = `https://api.github.com/repos/${repository.owner.login}/${repository.name}/commits?since=${thirtyDaysAgo}&author=${user?.login}&per_page=100`
      
      const response = await fetch(commitsUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })

      if (response.ok) {
        const commits = await response.json()
        return { commits }
      }
    } catch (error) {
      console.error('Error fetching GitHub data:', error)
    }

    return {}
  }

  const handleIssueSelect = (issue) => {
    setSelectedIssue(issue)
  }

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-400'
    if (confidence >= 0.6) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.8) return 'High'
    if (confidence >= 0.6) return 'Medium'
    return 'Low'
  }

  if (!isLinearAuthenticated) {
    return (
      <div className="card">
        <h2 className="text-xl font-bold text-white mb-4">AI Story Point Estimator</h2>
        <p className="text-gray-400">Connect Linear to get AI-powered story point estimates based on your performance</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">AI Story Point Estimator</h2>
            <p className="text-gray-400">Fibonacci estimates based on your performance patterns</p>
            {data.issues.some(issue => issue.id?.startsWith('demo-')) && (
              <div className="mt-2 px-3 py-1 bg-yellow-900/20 border border-yellow-700 rounded text-xs text-yellow-300">
                ⚠️ Demo mode - Connect Linear API for real data
              </div>
            )}
          </div>
          <button
            onClick={fetchDataAndEstimate}
            disabled={data.loading}
            className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {data.loading ? 'Analyzing...' : 'Refresh Estimates'}
          </button>
        </div>

        {data.loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
            <span className="ml-3 text-gray-400">Generating AI estimates...</span>
          </div>
        )}
      </div>

      {/* Quick Wins & Recommendations */}
      {data.recommendations && !data.loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-bold text-white mb-4">🎯 Quick Wins</h3>
            <div className="space-y-3">
              {data.recommendations.quickWins.length > 0 ? (
                data.recommendations.quickWins.map((item, index) => (
                  <div key={item.issue.id} className="p-3 bg-green-900/20 border border-green-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-green-400 font-medium">
                        {item.estimate.suggestedPoints} pts
                      </span>
                      <span className="text-xs text-gray-400">
                        ~{item.estimate.timeEstimate.hours}h
                      </span>
                    </div>
                    <p className="text-white text-sm font-medium mb-1">{item.issue.identifier}</p>
                    <p className="text-gray-300 text-xs">{item.issue.title}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-sm">No quick wins identified</p>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-bold text-white mb-4">📊 Sprint Capacity</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Total Unestimated</span>
                <span className="text-white font-medium">{data.issues.length} issues</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Estimated Effort</span>
                <span className="text-white font-medium">{data.recommendations.totalEffort} points</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Recommended Next</span>
                <span className="text-teal-400 font-medium">
                  {data.recommendations.recommended.length} issues
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Issue Estimates Table */}
      {!data.loading && data.estimates.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold text-white mb-4">Story Point Estimates</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400">Issue</th>
                  <th className="text-left py-3 px-4 text-gray-400">AI Estimate</th>
                  <th className="text-left py-3 px-4 text-gray-400">Confidence</th>
                  <th className="text-left py-3 px-4 text-gray-400">Time Est.</th>
                  <th className="text-left py-3 px-4 text-gray-400">Priority</th>
                  <th className="text-left py-3 px-4 text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.estimates.slice(0, 20).map((item) => (
                  <tr key={item.issue.id} className="border-b border-gray-800 hover:bg-gray-800">
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-white font-medium">{item.issue.identifier}</p>
                        <p className="text-sm text-gray-400 truncate max-w-xs">{item.issue.title}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl font-bold text-teal-400">
                          {item.estimate.suggestedPoints}
                        </span>
                        <span className="text-xs text-gray-400">pts</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-medium ${getConfidenceColor(item.estimate.confidence)}`}>
                        {getConfidenceLabel(item.estimate.confidence)}
                      </span>
                      <div className="text-xs text-gray-400">
                        {Math.round(item.estimate.confidence * 100)}%
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white font-medium">
                        {item.estimate.timeEstimate.hours}h
                      </div>
                      <div className="text-xs text-gray-400">
                        {item.estimate.timeEstimate.range.min}-{item.estimate.timeEstimate.range.max}h
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.issue.priority === 1 ? 'bg-red-900 text-red-200' :
                        item.issue.priority === 2 ? 'bg-orange-900 text-orange-200' :
                        item.issue.priority === 3 ? 'bg-yellow-900 text-yellow-200' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {item.issue.priority === 1 ? 'Urgent' :
                         item.issue.priority === 2 ? 'High' :
                         item.issue.priority === 3 ? 'Medium' : 'Low'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleIssueSelect(item)}
                        className="text-teal-400 hover:text-teal-300 text-sm"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed Estimate Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Estimate Details</h3>
              <button
                onClick={() => setSelectedIssue(null)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-white mb-2">{selectedIssue.issue.identifier}</h4>
                <p className="text-gray-300 text-sm">{selectedIssue.issue.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h5 className="font-medium text-teal-400 mb-2">AI Suggestion</h5>
                  <div className="text-3xl font-bold text-white">
                    {selectedIssue.estimate.suggestedPoints} points
                  </div>
                  <div className="text-sm text-gray-400">
                    ~{selectedIssue.estimate.timeEstimate.hours} hours
                  </div>
                </div>

                <div className="bg-gray-700 p-4 rounded-lg">
                  <h5 className="font-medium text-teal-400 mb-2">Confidence</h5>
                  <div className={`text-2xl font-bold ${getConfidenceColor(selectedIssue.estimate.confidence)}`}>
                    {Math.round(selectedIssue.estimate.confidence * 100)}%
                  </div>
                  <div className="text-sm text-gray-400">
                    {getConfidenceLabel(selectedIssue.estimate.confidence)}
                  </div>
                </div>
              </div>

              {selectedIssue.estimate.reasoning.length > 0 && (
                <div>
                  <h5 className="font-medium text-white mb-2">Reasoning</h5>
                  <ul className="space-y-1">
                    {selectedIssue.estimate.reasoning.map((reason, index) => (
                      <li key={index} className="text-sm text-gray-300 flex items-start">
                        <span className="text-teal-400 mr-2">•</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedIssue.estimate.alternatives.length > 0 && (
                <div>
                  <h5 className="font-medium text-white mb-2">Alternative Estimates</h5>
                  <div className="space-y-2">
                    {selectedIssue.estimate.alternatives.map((alt, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-700 p-3 rounded">
                        <span className="text-white font-medium">{alt.points} points</span>
                        <span className="text-sm text-gray-400">{alt.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}