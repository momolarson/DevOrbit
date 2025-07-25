import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import CommitChart from '../components/CommitChart'
import CommentAnalysis from '../components/CommentAnalysis'
import TeamCompatibility from '../components/TeamCompatibility'
import SummaryCards from '../components/SummaryCards'
import ExportTools from '../components/ExportTools'
import DebugPanel from '../components/DebugPanel'

export default function Dashboard() {
  const { isAuthenticated, token } = useAuth()
  const [selectedRepo, setSelectedRepo] = useState(null)
  const [dashboardData, setDashboardData] = useState({
    commits: [],
    comments: [],
    collaborations: [],
    metrics: {}
  })

  useEffect(() => {
    // Listen for repository selection changes
    const storedRepo = localStorage.getItem('selected_repository')
    if (storedRepo) {
      setSelectedRepo(JSON.parse(storedRepo))
    }

    // Set up listener for repository changes
    const handleStorageChange = () => {
      const repo = localStorage.getItem('selected_repository')
      if (repo) {
        setSelectedRepo(JSON.parse(repo))
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  if (!isAuthenticated) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="mx-auto w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Welcome to GitPrime</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Analyze your team's GitHub performance and discover insights to improve collaboration and code quality.
          </p>
          <p className="text-sm text-gray-500">
            Please login with GitHub to get started.
          </p>
        </div>
      </div>
    )
  }

  if (!selectedRepo) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2V7zm0 0V5a2 2 0 012-2h6l2 2h6a2 2 0 012 2v2" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-4">Select a Repository</h2>
          <p className="text-gray-400 max-w-md mx-auto">
            Choose a repository from the sidebar to start analyzing commits, pull requests, and team collaboration.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      {/* Repository Header */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{selectedRepo.name}</h1>
            <p className="text-gray-400 mt-1">{selectedRepo.description}</p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <span>Language: {selectedRepo.language || 'N/A'}</span>
              <span>Stars: {selectedRepo.stargazers_count}</span>
              <span>Forks: {selectedRepo.forks_count}</span>
            </div>
          </div>
          <div className="text-right">
            <a
              href={selectedRepo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-sm"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCards repository={selectedRepo} />

      {/* Charts and Analysis */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="space-y-8">
          <CommitChart repository={selectedRepo} />
          <CommentAnalysis repository={selectedRepo} />
        </div>
        
        <div className="space-y-8">
          <TeamCompatibility repository={selectedRepo} />
          <ExportTools repository={selectedRepo} data={dashboardData} />
        </div>
      </div>
      
      {/* Debug Panel */}
      <DebugPanel repository={selectedRepo} token={token} />
    </div>
  )
}