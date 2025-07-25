import { createContext, useContext, useState, useEffect } from 'react'
import { toast } from 'react-toastify'

const AuthContext = createContext()

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for stored token on app load
    const storedToken = localStorage.getItem('github_token')
    const storedUser = localStorage.getItem('github_user')
    
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
    
    setLoading(false)
  }, [])

  const login = () => {
    // GitHub OAuth flow
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID || 'your_github_client_id'
    const redirectUri = `${window.location.origin}/auth/callback`
    const scope = 'repo user'
    
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`
    
    // For demo purposes, we'll use personal access token flow
    const personalToken = prompt(
      'For development, please enter your GitHub Personal Access Token with repo and user scopes:\n\n' +
      '1. Go to GitHub Settings > Developer settings > Personal access tokens\n' +
      '2. Generate a new token with "repo" and "user" scopes\n' +
      '3. Paste it here:'
    )
    
    if (personalToken) {
      setToken(personalToken)
      localStorage.setItem('github_token', personalToken)
      
      // Fetch user info to validate token
      fetchUserInfo(personalToken)
    }
  }

  const fetchUserInfo = async (authToken) => {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })
      
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        localStorage.setItem('github_user', JSON.stringify(userData))
        toast.success(`Welcome, ${userData.login}!`)
      } else {
        throw new Error('Invalid token')
      }
    } catch (error) {
      toast.error('Failed to authenticate with GitHub')
      logout()
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('github_token')
    localStorage.removeItem('github_user')
    toast.info('Logged out successfully')
  }

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!token
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}