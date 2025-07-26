import { useAuth } from '../hooks/useAuth'
import { PROVIDERS, getProviderDisplayName } from '../services/gitProviders'
import { PROJECT_PROVIDERS, getProjectProviderDisplayName } from '../services/projectProviders'

export default function Header({ sidebarOpen, setSidebarOpen }) {
  const { 
    user, provider, login, logout, isAuthenticated, 
    linearUser, loginLinear, logoutLinear, isLinearAuthenticated,
    jiraUser, loginJira, logoutJira, isJiraAuthenticated,
    projectProvider, setProvider, setProjectProvider
  } = useAuth()

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Toggle sidebar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div>
            <h1 className="text-xl font-bold text-white">DevOrbit</h1>
            <p className="text-sm text-gray-400">{getProviderDisplayName(provider)} & Project Analytics Dashboard</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Project Management Authentication */}
          {!isLinearAuthenticated && !isJiraAuthenticated && (
            <div className="flex items-center space-x-2">
              <select
                value={projectProvider}
                onChange={(e) => setProjectProvider(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value={PROJECT_PROVIDERS.LINEAR}>Linear</option>
                <option value={PROJECT_PROVIDERS.JIRA}>JIRA</option>
              </select>
            </div>
          )}

          {/* Linear Authentication */}
          {isLinearAuthenticated ? (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 bg-gray-700 px-3 py-1 rounded-lg">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-sm text-white">{linearUser?.displayName || linearUser?.name}</span>
                <span className="text-xs text-gray-400">Linear</span>
                <button
                  onClick={logoutLinear}
                  className="text-gray-400 hover:text-white text-xs"
                >
                  ×
                </button>
              </div>
            </div>
          ) : projectProvider === PROJECT_PROVIDERS.LINEAR && (
            <button
              onClick={loginLinear}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              Connect Linear
            </button>
          )}

          {/* JIRA Authentication */}
          {isJiraAuthenticated ? (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 bg-gray-700 px-3 py-1 rounded-lg">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span className="text-sm text-white">{jiraUser?.displayName}</span>
                <span className="text-xs text-gray-400">JIRA</span>
                <button
                  onClick={logoutJira}
                  className="text-gray-400 hover:text-white text-xs"
                >
                  ×
                </button>
              </div>
            </div>
          ) : projectProvider === PROJECT_PROVIDERS.JIRA && (
            <button
              onClick={loginJira}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              Connect JIRA
            </button>
          )}

          {/* Provider Selection */}
          {!isAuthenticated && (
            <div className="flex items-center space-x-2">
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value={PROVIDERS.GITHUB}>GitHub</option>
                <option value={PROVIDERS.BITBUCKET}>Bitbucket</option>
              </select>
            </div>
          )}

          {/* Git Provider Authentication */}
          {isAuthenticated ? (
            <div className="flex items-center space-x-3">
              <img
                src={user?.avatarUrl || user?.avatar_url}
                alt={user?.username || user?.login}
                className="w-8 h-8 rounded-full"
              />
              <div className="text-right">
                <p className="text-sm font-medium text-white">{user?.username || user?.login}</p>
                <p className="text-xs text-gray-400">{user?.displayName || user?.name}</p>
              </div>
              <div className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                {getProviderDisplayName(provider)}
              </div>
              <button
                onClick={logout}
                className="btn-secondary text-sm"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => login(provider)}
              className="btn-primary flex items-center space-x-2"
            >
              {provider === PROVIDERS.GITHUB ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.075 1.5L12 5.5L19.925 1.5C21.025 1 22.125 1.825 22.125 3.075V17.025C22.125 18.025 21.425 18.9 20.475 19.225L12 22.5L3.525 19.225C2.575 18.9 1.875 18.025 1.875 17.025V3.075C1.875 1.825 2.975 1 4.075 1.5ZM8.25 8.25V6.75H15.75V8.25H8.25ZM8.25 11.25V9.75H15.75V11.25H8.25Z"/>
                </svg>
              )}
              <span>Login with {getProviderDisplayName(provider)}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}