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
  const [linearToken, setLinearToken] = useState(null)
  const [linearUser, setLinearUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for stored tokens on app load
    const storedToken = localStorage.getItem('github_token')
    const storedUser = localStorage.getItem('github_user')
    const storedLinearToken = localStorage.getItem('linear_token')
    const storedLinearUser = localStorage.getItem('linear_user')
    
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
    
    if (storedLinearToken && storedLinearUser) {
      setLinearToken(storedLinearToken)
      setLinearUser(JSON.parse(storedLinearUser))
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

  const loginLinear = () => {
    const personalToken = prompt(
      'For Linear integration, please enter your Linear Personal Access Token:\n\n' +
      '1. Go to Linear Settings > API > Personal API keys\n' +
      '2. Create a new API key with read permissions\n' +
      '3. Paste it here:'
    )
    
    if (personalToken) {
      setLinearToken(personalToken)
      localStorage.setItem('linear_token', personalToken)
      
      // Fetch user info to validate token
      fetchLinearUserInfo(personalToken)
    }
  }

  const fetchLinearUserInfo = async (authToken) => {
    try {
      const query = `
        query {
          viewer {
            id
            name
            email
            displayName
            avatarUrl
          }
        }
      `
      
      console.log('Attempting Linear authentication...')
      
      const linearApiUrl = import.meta.env.DEV 
        ? '/api/linear/graphql' 
        : 'https://api.linear.app/graphql'
      
      const response = await fetch(linearApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': authToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'DevOrbit/1.0'
        },
        body: JSON.stringify({ query })
      })
      
      console.log('Linear API response status:', response.status)
      
      const responseData = await response.json()
      console.log('Linear API response:', responseData)
      
      if (response.ok) {
        if (responseData.data?.viewer) {
          setLinearUser(responseData.data.viewer)
          localStorage.setItem('linear_user', JSON.stringify(responseData.data.viewer))
          toast.success(`Linear connected: ${responseData.data.viewer.displayName || responseData.data.viewer.name}!`)
        } else if (responseData.errors) {
          console.error('Linear GraphQL errors:', responseData.errors)
          toast.error(`Linear API error: ${responseData.errors[0]?.message || 'Unknown error'}`)
          logoutLinear()
        } else {
          console.error('Unexpected Linear API response:', responseData)
          toast.error('Unexpected response from Linear API')
          logoutLinear()
        }
      } else {
        console.error('Linear API HTTP error:', response.status, responseData)
        if (response.status === 401) {
          toast.error('Invalid Linear API key. Please check your token has the correct permissions.')
        } else if (response.status === 403) {
          toast.error('Linear API key lacks required permissions. Please ensure it has read access.')
        } else {
          toast.error(`Linear API error (${response.status}): ${responseData.error || 'Unknown error'}`)
        }
        logoutLinear()
      }
    } catch (error) {
      console.error('Linear authentication error:', error)
      toast.error(`Failed to connect to Linear: ${error.message}`)
      logoutLinear()
    }
  }

  const logoutLinear = () => {
    setLinearUser(null)
    setLinearToken(null)
    localStorage.removeItem('linear_token')
    localStorage.removeItem('linear_user')
    toast.info('Disconnected from Linear')
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
    linearUser,
    linearToken,
    loading,
    login,
    loginLinear,
    logout,
    logoutLinear,
    isAuthenticated: !!token,
    isLinearAuthenticated: !!linearToken
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}