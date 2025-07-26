import { createContext, useContext, useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { createProvider, PROVIDERS } from '../services/gitProviders'

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
  const [provider, setProvider] = useState(PROVIDERS.GITHUB)
  const [gitProvider, setGitProvider] = useState(null)
  const [linearToken, setLinearToken] = useState(null)
  const [linearUser, setLinearUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for stored tokens on app load
    const storedProvider = localStorage.getItem('git_provider') || PROVIDERS.GITHUB
    const storedToken = localStorage.getItem(`${storedProvider}_token`)
    const storedUser = localStorage.getItem(`${storedProvider}_user`)
    const storedUsername = localStorage.getItem(`${storedProvider}_username`)
    const storedLinearToken = localStorage.getItem('linear_token')
    const storedLinearUser = localStorage.getItem('linear_user')
    
    setProvider(storedProvider)
    
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
      
      // Create provider instance with username if it's Bitbucket
      const providerInstance = storedProvider === PROVIDERS.BITBUCKET 
        ? createProvider(storedProvider, storedToken, storedUsername)
        : createProvider(storedProvider, storedToken)
      
      setGitProvider(providerInstance)
    }
    
    if (storedLinearToken && storedLinearUser) {
      setLinearToken(storedLinearToken)
      setLinearUser(JSON.parse(storedLinearUser))
    }
    
    setLoading(false)
  }, [])

  const login = (selectedProvider = provider) => {
    const providerName = selectedProvider === PROVIDERS.GITHUB ? 'GitHub' : 'Bitbucket'
    
    if (selectedProvider === PROVIDERS.BITBUCKET) {
      // For Bitbucket, we need both username and app password
      const username = prompt(
        'Enter your Bitbucket username:\n\n' +
        'This is your Bitbucket account username (not email).'
      )
      
      if (!username) return
      
      const appPassword = prompt(
        'Enter your Bitbucket App Password:\n\n' +
        '1. Go to Bitbucket Settings > App passwords\n' +
        '2. Create a new app password with "Repositories: Read" and "Account: Read" permissions\n' +
        '3. Paste it here:'
      )
      
      if (appPassword) {
        setProvider(selectedProvider)
        setToken(appPassword)
        localStorage.setItem('git_provider', selectedProvider)
        localStorage.setItem(`${selectedProvider}_token`, appPassword)
        localStorage.setItem(`${selectedProvider}_username`, username)
        
        // Create provider instance with username and fetch user info
        const providerInstance = createProvider(selectedProvider, appPassword, username)
        setGitProvider(providerInstance)
        fetchUserInfo(providerInstance)
      }
    } else {
      // GitHub flow
      const instructions = 'For development, please enter your GitHub Personal Access Token with repo and user scopes:\n\n' +
        '1. Go to GitHub Settings > Developer settings > Personal access tokens\n' +
        '2. Generate a new token with "repo" and "user" scopes\n' +
        '3. Paste it here:'
      
      const personalToken = prompt(instructions)
      
      if (personalToken) {
        setProvider(selectedProvider)
        setToken(personalToken)
        localStorage.setItem('git_provider', selectedProvider)
        localStorage.setItem(`${selectedProvider}_token`, personalToken)
        
        // Create provider instance and fetch user info
        const providerInstance = createProvider(selectedProvider, personalToken)
        setGitProvider(providerInstance)
        fetchUserInfo(providerInstance)
      }
    }
  }

  const fetchUserInfo = async (providerInstance) => {
    try {
      const userData = await providerInstance.fetchUser()
      setUser(userData)
      localStorage.setItem(`${provider}_user`, JSON.stringify(userData))
      const providerName = provider === PROVIDERS.GITHUB ? 'GitHub' : 'Bitbucket'
      toast.success(`Welcome, ${userData.username}! Connected to ${providerName}`)
    } catch (error) {
      const providerName = provider === PROVIDERS.GITHUB ? 'GitHub' : 'Bitbucket'
      toast.error(`Failed to authenticate with ${providerName}`)
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
    setGitProvider(null)
    localStorage.removeItem(`${provider}_token`)
    localStorage.removeItem(`${provider}_user`)
    localStorage.removeItem(`${provider}_username`)
    localStorage.removeItem('git_provider')
    toast.info('Logged out successfully')
  }

  const value = {
    user,
    token,
    provider,
    gitProvider,
    linearUser,
    linearToken,
    loading,
    login,
    loginLinear,
    logout,
    logoutLinear,
    setProvider,
    isAuthenticated: !!token,
    isLinearAuthenticated: !!linearToken
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}