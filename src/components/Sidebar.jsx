import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { toast } from 'react-toastify'

export default function Sidebar({ isOpen, onViewChange }) {
  const { gitProvider, isAuthenticated } = useAuth()
  const [repositories, setRepositories] = useState([])
  const [selectedRepo, setSelectedRepo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showImprovements, setShowImprovements] = useState(true)

  useEffect(() => {
    if (isAuthenticated && gitProvider) {
      fetchRepositories()
      // Clear selected repo when provider changes
      setSelectedRepo(null)
      localStorage.removeItem('selected_repository')
      
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('repositoryChanged', { detail: null }))
    }
  }, [isAuthenticated, gitProvider])

  const fetchRepositories = async () => {
    setLoading(true)
    try {
      const repos = await gitProvider.fetchRepositories()
      setRepositories(repos)
      
      // Cache repositories with provider prefix
      localStorage.setItem(`${gitProvider.name}_repositories`, JSON.stringify(repos))
    } catch (error) {
      toast.error('Failed to fetch repositories')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleRepoSelect = (repo) => {
    setSelectedRepo(repo)
    localStorage.setItem('selected_repository', JSON.stringify(repo))
    toast.success(`Selected repository: ${repo.name}`)
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('repositoryChanged', { detail: repo }))
  }

  const improvementTips = [
    {
      category: 'Commits',
      tips: [
        'Keep commits small and focused (<85 lines changed)',
        'Use conventional commit messages (feat:, fix:, docs:)',
        'Commit frequently to maintain clear history'
      ]
    },
    {
      category: 'Comments',
      tips: [
        'Respond to PR comments within 24 hours',
        'Provide detailed feedback (>50 characters)',
        'Ask clarifying questions when needed'
      ]
    },
    {
      category: 'Code',
      tips: [
        'Keep refactor rates below 11% per release',
        'Request multiple reviewers for complex changes',
        'Write comprehensive tests for new features'
      ]
    },
    {
      category: 'Team',
      tips: [
        'Encourage cross-team reviews for knowledge sharing',
        'Avoid "in-squad only" review patterns',
        'Share expertise through code review comments'
      ]
    },
    {
      category: 'Projects',
      tips: [
        'Connect Linear or JIRA to analyze story points vs performance',
        'Track velocity and estimate accuracy across sprints',
        'Optimize workload distribution and team capacity'
      ]
    }
  ]

  if (!isOpen) {
    return null
  }

  return (
    <aside className="fixed left-0 top-16 w-80 h-[calc(100vh-4rem)] bg-gray-800 border-r border-gray-700 overflow-y-auto">
      <div className="p-6">
        {/* Repository Selection */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Repository Selection</h2>
          
          {!isAuthenticated ? (
            <p className="text-gray-400 text-sm">Please login to select repositories</p>
          ) : loading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-400"></div>
              <span className="text-gray-400 text-sm">Loading repositories...</span>
            </div>
          ) : (
            <div>
              <select
                value={selectedRepo?.id || ''}
                onChange={(e) => {
                  // Handle both string (Bitbucket UUID) and integer (GitHub) IDs
                  const repo = repositories.find(r => r.id.toString() === e.target.value.toString())
                  if (repo) handleRepoSelect(repo)
                }}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="">Select a repository...</option>
                {repositories.map((repo) => (
                  <option key={repo.id} value={repo.id}>
                    {repo.name} ({repo.private ? 'Private' : 'Public'})
                  </option>
                ))}
              </select>
              
              {selectedRepo && (
                <div className="mt-3 p-3 bg-gray-700 rounded-lg">
                  <p className="text-sm text-white font-medium">{selectedRepo.name}</p>
                  <p className="text-xs text-gray-400">{selectedRepo.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Language: {selectedRepo.language || 'N/A'} | 
                    Stars: {selectedRepo.stars || selectedRepo.stargazers_count || 0}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Improvement Analytics */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Best Practices</h2>
            <button
              onClick={() => setShowImprovements(!showImprovements)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg
                className={`w-5 h-5 transform transition-transform ${showImprovements ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          {showImprovements && (
            <div className="space-y-4">
              {improvementTips.map((section) => (
                <button
                  key={section.category}
                  onClick={() => onViewChange && onViewChange(section.category.toLowerCase())}
                  className="w-full bg-gray-700 hover:bg-gray-600 rounded-lg p-4 text-left transition-colors duration-200 group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-teal-400 group-hover:text-teal-300">
                      {section.category}
                    </h3>
                    <svg 
                      className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <ul className="space-y-1">
                    {section.tips.slice(0, 2).map((tip, index) => (
                      <li key={index} className="text-xs text-gray-400 flex items-start">
                        <span className="text-teal-400 mr-2">•</span>
                        {tip}
                      </li>
                    ))}
                    {section.tips.length > 2 && (
                      <li className="text-xs text-gray-500 italic">
                        +{section.tips.length - 2} more insights...
                      </li>
                    )}
                  </ul>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}