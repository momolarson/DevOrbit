// Git Provider Abstraction Layer
// Supports both GitHub and Bitbucket APIs

export const PROVIDERS = {
  GITHUB: 'github',
  BITBUCKET: 'bitbucket'
}

export class GitHubProvider {
  constructor(token) {
    this.token = token
    this.baseUrl = 'https://api.github.com'
    this.name = PROVIDERS.GITHUB
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  }

  async fetchUser() {
    const response = await fetch(`${this.baseUrl}/user`, {
      headers: this.getHeaders()
    })
    
    if (!response.ok) throw new Error('Failed to fetch user')
    const userData = await response.json()
    
    return {
      id: userData.id,
      username: userData.login,
      displayName: userData.name,
      email: userData.email,
      avatarUrl: userData.avatar_url,
      provider: this.name
    }
  }

  async fetchRepositories() {
    const response = await fetch(`${this.baseUrl}/user/repos?sort=updated&per_page=50`, {
      headers: this.getHeaders()
    })
    
    if (!response.ok) throw new Error('Failed to fetch repositories')
    const repos = await response.json()
    
    return repos.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      private: repo.private,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      owner: {
        username: repo.owner.login,
        avatarUrl: repo.owner.avatar_url
      },
      provider: this.name,
      _raw: repo
    }))
  }

  async fetchCommits(repository, since, perPage = 100) {
    const owner = repository._raw?.owner?.login || repository.owner.username
    const name = repository._raw?.name || repository.name
    const url = `${this.baseUrl}/repos/${owner}/${name}/commits?since=${since}&per_page=${perPage}`
    
    const response = await fetch(url, {
      headers: this.getHeaders()
    })
    
    if (!response.ok) throw new Error('Failed to fetch commits')
    const commits = await response.json()
    
    return commits.map(commit => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: {
        name: commit.commit.author.name,
        email: commit.commit.author.email,
        date: commit.commit.author.date
      },
      stats: commit.stats,
      files: commit.files,
      url: commit.html_url,
      provider: this.name,
      _raw: commit
    }))
  }

  async fetchPullRequests(repository, state = 'all', perPage = 100) {
    const owner = repository._raw?.owner?.login || repository.owner.username
    const name = repository._raw?.name || repository.name
    const url = `${this.baseUrl}/repos/${owner}/${name}/pulls?state=${state}&per_page=${perPage}`
    
    const response = await fetch(url, {
      headers: this.getHeaders()
    })
    
    if (!response.ok) throw new Error('Failed to fetch pull requests')
    const prs = await response.json()
    
    return prs.map(pr => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      state: pr.state,
      author: {
        username: pr.user.login,
        avatarUrl: pr.user.avatar_url
      },
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      mergedAt: pr.merged_at,
      url: pr.html_url,
      provider: this.name,
      _raw: pr
    }))
  }

  async fetchPullRequestComments(repository, pullNumber) {
    const owner = repository._raw?.owner?.login || repository.owner.username
    const name = repository._raw?.name || repository.name
    const url = `${this.baseUrl}/repos/${owner}/${name}/issues/${pullNumber}/comments`
    
    const response = await fetch(url, {
      headers: this.getHeaders()
    })
    
    if (!response.ok) throw new Error('Failed to fetch PR comments')
    const comments = await response.json()
    
    return comments.map(comment => ({
      id: comment.id,
      body: comment.body,
      author: {
        username: comment.user.login,
        avatarUrl: comment.user.avatar_url
      },
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      provider: this.name,
      _raw: comment
    }))
  }
}

export class BitbucketProvider {
  constructor(token, username = null) {
    this.token = token
    this.username = username
    this.baseUrl = 'https://api.bitbucket.org/2.0'
    this.name = PROVIDERS.BITBUCKET
  }

  getHeaders() {
    // Bitbucket uses Basic Auth with username and app password
    if (this.username) {
      const credentials = btoa(`${this.username}:${this.token}`)
      return {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json'
      }
    } else {
      // If no username provided, try Bearer token (for OAuth tokens)
      return {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/json'
      }
    }
  }

  async fetchUser() {
    const response = await fetch(`${this.baseUrl}/user`, {
      headers: this.getHeaders()
    })
    
    if (!response.ok) throw new Error('Failed to fetch user')
    const userData = await response.json()
    
    return {
      id: userData.uuid,
      username: userData.username,
      displayName: userData.display_name,
      email: userData.email,
      avatarUrl: userData.links?.avatar?.href,
      provider: this.name
    }
  }

  async fetchRepositories() {
    // First, let's try to get the current user to build the correct endpoint
    let repositoriesUrl = `${this.baseUrl}/repositories?role=member&sort=-updated_on&pagelen=50`
    
    // Alternative: try user-specific endpoint
    try {
      const userResponse = await fetch(`${this.baseUrl}/user`, {
        headers: this.getHeaders()
      })
      
      if (userResponse.ok) {
        const userData = await userResponse.json()
        // Try user-specific repositories endpoint
        repositoriesUrl = `${this.baseUrl}/repositories/${userData.username}?pagelen=50`
      }
    } catch (error) {
      // Fall back to default endpoint
    }
    
    const response = await fetch(repositoriesUrl, {
      headers: this.getHeaders()
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch repositories')
    }
    
    const data = await response.json()
    
    return data.values.map(repo => ({
        id: repo.uuid,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.is_private,
        language: repo.language,
        stars: 0, // Bitbucket doesn't have stars like GitHub
        forks: 0, // Will need separate API call for fork count
        owner: {
          username: repo.owner.username,
          avatarUrl: repo.owner.links?.avatar?.href
        },
        provider: this.name,
        _raw: repo
      }))
  }

  async fetchCommits(repository, since, perPage = 100) {
    const workspace = repository._raw?.workspace?.slug || repository._raw?.owner?.username
    const repoSlug = repository._raw?.name || repository.name
    const url = `${this.baseUrl}/repositories/${workspace}/${repoSlug}/commits?pagelen=${perPage}`
    
    const response = await fetch(url, {
      headers: this.getHeaders()
    })
    
    if (!response.ok) throw new Error('Failed to fetch commits')
    
    const data = await response.json()
    
    // Filter commits by date since Bitbucket API doesn't support since parameter
    const sinceDate = new Date(since)
    
    return data.values
      .filter(commit => new Date(commit.date) >= sinceDate)
      .map(commit => ({
        sha: commit.hash,
        message: commit.message,
        author: {
          name: commit.author?.user?.display_name || commit.author?.raw,
          email: commit.author?.user?.email,
          date: commit.date
        },
        stats: null, // Need separate API call for stats
        files: null, // Need separate API call for files
        url: commit.links?.html?.href,
        provider: this.name,
        _raw: commit
      }))
  }

  async fetchPullRequests(repository, state = 'OPEN', perPage = 100) {
    const workspace = repository._raw?.workspace?.slug || repository._raw?.owner?.username
    const repoSlug = repository._raw?.name || repository.name
    let url = `${this.baseUrl}/repositories/${workspace}/${repoSlug}/pullrequests?pagelen=${perPage}`
    
    if (state !== 'all') {
      const bitbucketState = state === 'open' ? 'OPEN' : state === 'closed' ? 'MERGED,DECLINED' : state
      url += `&state=${bitbucketState}`
    }
    
    const response = await fetch(url, {
      headers: this.getHeaders()
    })
    
    if (!response.ok) throw new Error('Failed to fetch pull requests')
    const data = await response.json()
    
    return data.values.map(pr => ({
      id: pr.id,
      number: pr.id, // Bitbucket uses ID instead of number
      title: pr.title,
      state: pr.state.toLowerCase(),
      author: {
        username: pr.author.username,
        avatarUrl: pr.author.links?.avatar?.href
      },
      createdAt: pr.created_on,
      updatedAt: pr.updated_on,
      mergedAt: pr.state === 'MERGED' ? pr.updated_on : null,
      url: pr.links?.html?.href,
      provider: this.name,
      _raw: pr
    }))
  }

  async fetchPullRequestComments(repository, pullNumber) {
    const workspace = repository._raw?.workspace?.slug || repository._raw?.owner?.username
    const repoSlug = repository._raw?.name || repository.name
    const url = `${this.baseUrl}/repositories/${workspace}/${repoSlug}/pullrequests/${pullNumber}/comments`
    
    const response = await fetch(url, {
      headers: this.getHeaders()
    })
    
    if (!response.ok) throw new Error('Failed to fetch PR comments')
    const data = await response.json()
    
    return data.values.map(comment => ({
      id: comment.id,
      body: comment.content?.raw || '',
      author: {
        username: comment.user.username,
        avatarUrl: comment.user.links?.avatar?.href
      },
      createdAt: comment.created_on,
      updatedAt: comment.updated_on,
      provider: this.name,
      _raw: comment
    }))
  }
}

export function createProvider(providerType, token, username = null) {
  switch (providerType) {
    case PROVIDERS.GITHUB:
      return new GitHubProvider(token)
    case PROVIDERS.BITBUCKET:
      return new BitbucketProvider(token, username)
    default:
      throw new Error(`Unsupported provider: ${providerType}`)
  }
}

export function getProviderDisplayName(providerType) {
  switch (providerType) {
    case PROVIDERS.GITHUB:
      return 'GitHub'
    case PROVIDERS.BITBUCKET:
      return 'Bitbucket'
    default:
      return providerType
  }
}