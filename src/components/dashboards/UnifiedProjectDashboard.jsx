import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { createProjectProvider, PROJECT_PROVIDERS, calculateVelocityMetrics } from '../../services/projectProviders'
import { toast } from 'react-toastify'
import { Doughnut, Bar } from 'react-chartjs-2'
import JiraCORSInfo from '../JiraCORSInfo'
import StoryPointEstimatorComponent from '../StoryPointEstimator'

export default function UnifiedProjectDashboard({ repository, onBack }) {
  const { 
    projectProvider, 
    isLinearAuthenticated, 
    isJiraAuthenticated,
    linearToken,
    jiraToken,
    jiraDomain,
    loginLinear,
    loginJira
  } = useAuth()
  
  const [data, setData] = useState({
    issues: [],
    teams: [],
    projects: [],
    loading: false
  })
  const [selectedTeam] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [dateRange, setDateRange] = useState(30)

  const isAuthenticated = isLinearAuthenticated || isJiraAuthenticated

  useEffect(() => {
    if (isAuthenticated) {
      fetchProjectData()
    }
  }, [isAuthenticated, projectProvider, selectedTeam, dateRange])

  const fetchProjectData = async () => {
    setData(prev => ({ ...prev, loading: true }))
    
    try {
      let providerInstance
      
      if (projectProvider === PROJECT_PROVIDERS.LINEAR && isLinearAuthenticated) {
        providerInstance = createProjectProvider(PROJECT_PROVIDERS.LINEAR, linearToken)
      } else if (projectProvider === PROJECT_PROVIDERS.JIRA && isJiraAuthenticated) {
        const jiraEmail = localStorage.getItem('jira_email') // You'd need to store this during login
        providerInstance = createProjectProvider(PROJECT_PROVIDERS.JIRA, jiraToken, jiraDomain, jiraEmail)
      }

      if (!providerInstance) {
        throw new Error('No authenticated project provider available')
      }

      // Fetch data based on provider
      const [issues, teams] = await Promise.all([
        providerInstance.fetchIssues({ limit: 100 }),
        providerInstance.fetchTeams()
      ])

      // Filter issues by date range
      const cutoffDate = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000)
      const recentIssues = issues.filter(issue => 
        new Date(issue.updatedAt) >= cutoffDate
      )

      // Calculate metrics
      const velocityMetrics = calculateVelocityMetrics(recentIssues)
      
      setData({
        issues: recentIssues,
        teams,
        projects: teams, // For JIRA, teams are projects
        loading: false
      })
      
      setMetrics(velocityMetrics)
      
    } catch (error) {
      console.error('Error fetching project data:', error)
      toast.error(`Failed to fetch ${projectProvider} data`)
      setData(prev => ({ ...prev, loading: false }))
    }
  }

  const handleProviderLogin = () => {
    if (projectProvider === PROJECT_PROVIDERS.LINEAR) {
      loginLinear()
    } else {
      loginJira()
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="p-8">
        {projectProvider === PROJECT_PROVIDERS.JIRA && <JiraCORSInfo />}
        
        <div className="text-center">
          <div className="mx-auto w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Connect to {projectProvider === PROJECT_PROVIDERS.LINEAR ? 'Linear' : 'JIRA'}</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Connect your {projectProvider === PROJECT_PROVIDERS.LINEAR ? 'Linear' : 'JIRA'} account to analyze project metrics, story points, and team performance.
          </p>
          <button
            onClick={handleProviderLogin}
            className="btn-primary"
          >
            Connect {projectProvider === PROJECT_PROVIDERS.LINEAR ? 'Linear' : 'JIRA'}
          </button>
        </div>
      </div>
    )
  }

  const statusChartData = {
    labels: [...new Set(data.issues.map(issue => issue.status))],
    datasets: [{
      data: [...new Set(data.issues.map(issue => issue.status))].map(status =>
        data.issues.filter(issue => issue.status === status).length
      ),
      backgroundColor: [
        '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316'
      ],
      borderWidth: 2,
      borderColor: '#374151'
    }]
  }

  const priorityChartData = {
    labels: [...new Set(data.issues.map(issue => issue.priority).filter(Boolean))],
    datasets: [{
      label: 'Issues by Priority',
      data: [...new Set(data.issues.map(issue => issue.priority).filter(Boolean))].map(priority =>
        data.issues.filter(issue => issue.priority === priority).length
      ),
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
            <h1 className="text-2xl font-bold text-white">{projectProvider === PROJECT_PROVIDERS.LINEAR ? 'Linear' : 'JIRA'} Analytics</h1>
            <p className="text-gray-400">Project metrics and team performance insights</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(parseInt(e.target.value))}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 6 months</option>
          </select>
        </div>
      </div>

      {data.loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card text-center">
              <div className="text-3xl font-bold text-blue-400">{data.issues.length}</div>
              <div className="text-gray-400 text-sm">Total Issues</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-green-400">{metrics?.completedCount || 0}</div>
              <div className="text-gray-400 text-sm">Completed</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-purple-400">{metrics?.totalStoryPoints || 0}</div>
              <div className="text-gray-400 text-sm">Story Points</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-yellow-400">{metrics?.avgTimeToComplete || 0}</div>
              <div className="text-gray-400 text-sm">Avg Days</div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Issues by Status</h3>
              <div className="h-64">
                <Doughnut 
                  data={statusChartData} 
                  options={{ 
                    responsive: true, 
                    plugins: { 
                      legend: { labels: { color: '#ffffff' } } 
                    } 
                  }} 
                />
              </div>
            </div>
            
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Issues by Priority</h3>
              <div className="h-64">
                <Bar data={priorityChartData} options={chartOptions} />
              </div>
            </div>
          </div>

          {/* AI Story Point Estimator - Works with both Linear and JIRA */}
          {((projectProvider === PROJECT_PROVIDERS.LINEAR && isLinearAuthenticated) || 
            (projectProvider === PROJECT_PROVIDERS.JIRA && isJiraAuthenticated)) && 
            repository && (
            <StoryPointEstimatorComponent repository={repository} />
          )}

          {/* Issues Table */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Issues</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-gray-400 pb-2">Issue</th>
                    <th className="text-left text-gray-400 pb-2">Status</th>
                    <th className="text-left text-gray-400 pb-2">Assignee</th>
                    <th className="text-left text-gray-400 pb-2">Story Points</th>
                    <th className="text-left text-gray-400 pb-2">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {data.issues.slice(0, 10).map((issue) => (
                    <tr key={issue.id} className="border-b border-gray-800">
                      <td className="py-2">
                        <div>
                          <a 
                            href={issue.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 font-medium"
                          >
                            {issue.key}
                          </a>
                          <div className="text-white text-xs mt-1 truncate max-w-xs">
                            {issue.title}
                          </div>
                        </div>
                      </td>
                      <td className="py-2">
                        <span className="px-2 py-1 bg-gray-700 text-white text-xs rounded">
                          {issue.status}
                        </span>
                      </td>
                      <td className="py-2">
                        <div className="text-white text-xs">
                          {issue.assignee?.displayName || 'Unassigned'}
                        </div>
                      </td>
                      <td className="py-2">
                        <div className="text-white text-xs">
                          {issue.storyPoints || '-'}
                        </div>
                      </td>
                      <td className="py-2">
                        <div className="text-gray-400 text-xs">
                          {new Date(issue.updatedAt).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}