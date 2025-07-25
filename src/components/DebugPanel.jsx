import { useState } from 'react'

export default function DebugPanel({ repository, token }) {
  const [isOpen, setIsOpen] = useState(false)
  const [testResults, setTestResults] = useState({})
  const [testing, setTesting] = useState(false)

  const testEndpoint = async (name, url) => {
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })
      
      const result = {
        status: response.status,
        ok: response.ok,
        url: url
      }
      
      if (response.ok) {
        const data = await response.json()
        result.dataLength = Array.isArray(data) ? data.length : (data ? 1 : 0)
      } else {
        result.error = await response.text()
      }
      
      return result
    } catch (error) {
      return {
        status: 'ERROR',
        ok: false,
        url: url,
        error: error.message
      }
    }
  }

  const runTests = async () => {
    if (!repository || !token) return
    
    setTesting(true)
    const results = {}
    
    const tests = [
      ['User Info', 'https://api.github.com/user'],
      ['Repository Info', `https://api.github.com/repos/${repository.owner.login}/${repository.name}`],
      ['Commits', `https://api.github.com/repos/${repository.owner.login}/${repository.name}/commits?per_page=5`],
      ['Pull Requests', `https://api.github.com/repos/${repository.owner.login}/${repository.name}/pulls?state=all&per_page=5`],
      ['Rate Limit', 'https://api.github.com/rate_limit']
    ]
    
    for (const [name, url] of tests) {
      results[name] = await testEndpoint(name, url)
    }
    
    setTestResults(results)
    setTesting(false)
  }

  const getStatusColor = (result) => {
    if (!result) return 'text-gray-400'
    if (result.ok) return 'text-green-400'
    if (result.status === 403) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getStatusIcon = (result) => {
    if (!result) return '⏳'
    if (result.ok) return '✅'
    if (result.status === 403) return '⚠️'
    return '❌'
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-full shadow-lg transition-colors"
          title="Open Debug Panel"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-96 overflow-y-auto">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">API Debug Panel</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="p-4">
        {!repository ? (
          <p className="text-gray-400 text-sm">No repository selected</p>
        ) : !token ? (
          <p className="text-gray-400 text-sm">No GitHub token available</p>
        ) : (
          <div className="space-y-4">
            <button
              onClick={runTests}
              disabled={testing}
              className="btn-primary w-full text-sm"
            >
              {testing ? 'Testing APIs...' : 'Test GitHub API Access'}
            </button>
            
            {Object.keys(testResults).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-300">Test Results:</h4>
                {Object.entries(testResults).map(([name, result]) => (
                  <div key={name} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{name}</span>
                    <div className="flex items-center space-x-2">
                      <span className={getStatusColor(result)}>
                        {result.status || 'PENDING'}
                      </span>
                      <span>{getStatusIcon(result)}</span>
                    </div>
                  </div>
                ))}
                
                {testResults['Rate Limit'] && testResults['Rate Limit'].ok && (
                  <div className="mt-3 p-2 bg-gray-700 rounded text-xs">
                    <div className="text-gray-300">GitHub API Rate Limit Status</div>
                    <div className="text-gray-400 mt-1">
                      Check browser console for detailed rate limit info
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="text-xs text-gray-500 space-y-1">
              <div>Repository: {repository.name}</div>
              <div>Owner: {repository.owner.login}</div>
              <div>Token: {token ? '✅ Present' : '❌ Missing'}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}