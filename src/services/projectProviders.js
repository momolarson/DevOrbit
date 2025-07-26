// Project Management Provider Abstraction Layer
// Supports Linear and JIRA integrations

export const PROJECT_PROVIDERS = {
  LINEAR: 'linear',
  JIRA: 'jira'
}

export class LinearProvider {
  constructor(token) {
    this.token = token
    this.baseUrl = 'https://api.linear.app/graphql'
    this.name = PROJECT_PROVIDERS.LINEAR
  }

  getHeaders() {
    return {
      'Authorization': this.token,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'DevOrbit/1.0'
    }
  }

  async query(query, variables = {}) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ query, variables })
    })

    if (!response.ok) {
      throw new Error(`Linear API error: ${response.status}`)
    }

    const responseData = await response.json()
    
    if (responseData.errors) {
      throw new Error(`GraphQL errors: ${responseData.errors.map(e => e.message).join(', ')}`)
    }

    return responseData.data
  }

  async fetchUser() {
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
    
    const data = await this.query(query)
    
    return {
      id: data.viewer.id,
      username: data.viewer.email,
      displayName: data.viewer.displayName || data.viewer.name,
      email: data.viewer.email,
      avatarUrl: data.viewer.avatarUrl,
      provider: this.name
    }
  }

  async fetchTeams() {
    const query = `
      query GetTeams {
        teams {
          edges {
            node {
              id
              name
              key
              description
              color
              members {
                edges {
                  node {
                    id
                    name
                    displayName
                    email
                    avatarUrl
                    active
                  }
                }
              }
            }
          }
        }
      }
    `

    const data = await this.query(query)
    return data.teams.edges.map(edge => ({
      id: edge.node.id,
      name: edge.node.name,
      key: edge.node.key,
      description: edge.node.description,
      color: edge.node.color,
      members: edge.node.members.edges.map(memberEdge => ({
        id: memberEdge.node.id,
        name: memberEdge.node.name,
        displayName: memberEdge.node.displayName,
        email: memberEdge.node.email,
        avatarUrl: memberEdge.node.avatarUrl,
        active: memberEdge.node.active
      })),
      provider: this.name,
      _raw: edge.node
    }))
  }

  async fetchIssues(filters = {}) {
    const { teamId, assigneeId, limit = 50, state } = filters
    
    let filterCondition = ''
    if (teamId) filterCondition += `team: { id: { eq: "${teamId}" } }`
    if (assigneeId) filterCondition += `assignee: { id: { eq: "${assigneeId}" } }`
    if (state) filterCondition += `state: { type: { eq: ${state} } }`

    const query = `
      query GetIssues($first: Int) {
        issues(
          first: $first
          ${filterCondition ? `filter: { ${filterCondition} }` : ''}
          orderBy: updatedAt
        ) {
          edges {
            node {
              id
              identifier
              title
              description
              estimate
              priority
              createdAt
              updatedAt
              completedAt
              dueDate
              assignee {
                id
                name
                displayName
                email
                avatarUrl
              }
              team {
                id
                name
                key
              }
              state {
                id
                name
                type
                color
              }
              project {
                id
                name
              }
              labels {
                edges {
                  node {
                    id
                    name
                    color
                  }
                }
              }
            }
          }
        }
      }
    `

    const data = await this.query(query, { first: limit })
    return data.issues.edges.map(edge => ({
      id: edge.node.id,
      key: edge.node.identifier,
      title: edge.node.title,
      description: edge.node.description,
      storyPoints: edge.node.estimate,
      priority: edge.node.priority,
      status: edge.node.state.name,
      statusType: edge.node.state.type,
      statusColor: edge.node.state.color,
      assignee: edge.node.assignee ? {
        id: edge.node.assignee.id,
        name: edge.node.assignee.name,
        displayName: edge.node.assignee.displayName,
        email: edge.node.assignee.email,
        avatarUrl: edge.node.assignee.avatarUrl
      } : null,
      team: edge.node.team ? {
        id: edge.node.team.id,
        name: edge.node.team.name,
        key: edge.node.team.key
      } : null,
      labels: edge.node.labels.edges.map(labelEdge => ({
        id: labelEdge.node.id,
        name: labelEdge.node.name,
        color: labelEdge.node.color
      })),
      createdAt: edge.node.createdAt,
      updatedAt: edge.node.updatedAt,
      completedAt: edge.node.completedAt,
      dueDate: edge.node.dueDate,
      url: `https://linear.app/issue/${edge.node.identifier}`,
      provider: this.name,
      _raw: edge.node
    }))
  }
}

export class JiraProvider {
  constructor(token, domain, email = null) {
    this.token = token
    this.domain = domain
    this.email = email
    // Use proxy in development to avoid CORS issues
    this.baseUrl = import.meta.env.DEV 
      ? '/api/jira' 
      : `https://${domain}.atlassian.net/rest/api/3`
    this.name = PROJECT_PROVIDERS.JIRA
  }

  getHeaders() {
    // JIRA uses Basic Auth with email:token
    if (this.email) {
      const credentials = btoa(`${this.email}:${this.token}`)
      return {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    } else {
      // Bearer token for server instances
      return {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }
  }

  async fetchUser() {
    try {
      const response = await fetch(`${this.baseUrl}/myself`, {
        headers: this.getHeaders()
      })
      
      if (!response.ok) throw new Error('Failed to fetch JIRA user')
      const userData = await response.json()
      
      return {
        id: userData.accountId,
        username: userData.emailAddress,
        displayName: userData.displayName,
        email: userData.emailAddress,
        avatarUrl: userData.avatarUrls?.['48x48'],
        provider: this.name
      }
    } catch (error) {
      if (error.message.includes('CORS') || error.name === 'TypeError') {
        throw new Error('CORS_ERROR: JIRA API blocked by browser. Please use a CORS extension or configure your JIRA instance to allow cross-origin requests from localhost:3000')
      }
      throw error
    }
  }

  async fetchProjects() {
    const response = await fetch(`${this.baseUrl}/project/search`, {
      headers: this.getHeaders()
    })
    
    if (!response.ok) throw new Error('Failed to fetch JIRA projects')
    const data = await response.json()
    
    return data.values.map(project => ({
      id: project.id,
      key: project.key,
      name: project.name,
      description: project.description,
      lead: project.lead ? {
        id: project.lead.accountId,
        displayName: project.lead.displayName,
        email: project.lead.emailAddress
      } : null,
      projectTypeKey: project.projectTypeKey,
      url: project.self,
      provider: this.name,
      _raw: project
    }))
  }

  async fetchIssues(filters = {}) {
    const { projectKey, assignee, issueType, status, maxResults = 50 } = filters
    
    let jql = ''
    const conditions = []
    
    if (projectKey) conditions.push(`project = "${projectKey}"`)
    if (assignee) conditions.push(`assignee = "${assignee}"`)
    if (issueType) conditions.push(`issuetype = "${issueType}"`)
    if (status) conditions.push(`status = "${status}"`)
    
    jql = conditions.join(' AND ')
    if (!jql) jql = 'ORDER BY updated DESC'
    else jql += ' ORDER BY updated DESC'

    const searchUrl = `${this.baseUrl}/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&fields=summary,description,status,assignee,priority,created,updated,resolutiondate,customfield_10016,labels,project,issuetype`
    
    const response = await fetch(searchUrl, {
      headers: this.getHeaders()
    })
    
    if (!response.ok) throw new Error('Failed to fetch JIRA issues')
    const data = await response.json()
    
    return data.issues.map(issue => ({
      id: issue.id,
      key: issue.key,
      title: issue.fields.summary,
      description: issue.fields.description,
      storyPoints: issue.fields.customfield_10016, // Standard story points field
      priority: issue.fields.priority?.name,
      status: issue.fields.status?.name,
      statusColor: issue.fields.status?.statusCategory?.colorName,
      assignee: issue.fields.assignee ? {
        id: issue.fields.assignee.accountId,
        name: issue.fields.assignee.displayName,
        displayName: issue.fields.assignee.displayName,
        email: issue.fields.assignee.emailAddress,
        avatarUrl: issue.fields.assignee.avatarUrls?.['48x48']
      } : null,
      team: null, // JIRA doesn't have teams like Linear
      project: {
        id: issue.fields.project.id,
        key: issue.fields.project.key,
        name: issue.fields.project.name
      },
      issueType: {
        id: issue.fields.issuetype.id,
        name: issue.fields.issuetype.name,
        iconUrl: issue.fields.issuetype.iconUrl
      },
      labels: issue.fields.labels || [],
      createdAt: issue.fields.created,
      updatedAt: issue.fields.updated,
      completedAt: issue.fields.resolutiondate,
      url: `https://${this.domain}.atlassian.net/browse/${issue.key}`,
      provider: this.name,
      _raw: issue
    }))
  }

  async fetchTeams() {
    // JIRA doesn't have built-in teams, but we can simulate with projects
    const projects = await this.fetchProjects()
    return projects.map(project => ({
      id: project.id,
      name: project.name,
      key: project.key,
      description: project.description,
      members: [], // Would need additional API calls to get project members
      provider: this.name,
      _raw: project
    }))
  }
}

export function createProjectProvider(providerType, ...args) {
  switch (providerType) {
    case PROJECT_PROVIDERS.LINEAR:
      return new LinearProvider(...args)
    case PROJECT_PROVIDERS.JIRA:
      return new JiraProvider(...args)
    default:
      throw new Error(`Unsupported project provider: ${providerType}`)
  }
}

export function getProjectProviderDisplayName(providerType) {
  switch (providerType) {
    case PROJECT_PROVIDERS.LINEAR:
      return 'Linear'
    case PROJECT_PROVIDERS.JIRA:
      return 'JIRA'
    default:
      return providerType
  }
}

// Utility functions for cross-provider analytics
export function calculateVelocityMetrics(issues) {
  const completedIssues = issues.filter(issue => 
    (issue.statusType === 'completed' || issue.status === 'Done' || issue.status === 'Closed') && 
    issue.completedAt
  )

  const totalStoryPoints = completedIssues.reduce((sum, issue) => 
    sum + (issue.storyPoints || 0), 0
  )

  const avgTimeToComplete = completedIssues.length > 0 
    ? completedIssues.reduce((sum, issue) => {
        const created = new Date(issue.createdAt)
        const completed = new Date(issue.completedAt)
        return sum + (completed - created) / (1000 * 60 * 60 * 24) // days
      }, 0) / completedIssues.length
    : 0

  const estimateAccuracy = completedIssues.length > 0 
    ? completedIssues.filter(issue => issue.storyPoints > 0).length / completedIssues.length
    : 0

  return {
    completedCount: completedIssues.length,
    totalStoryPoints,
    avgTimeToComplete: Math.round(avgTimeToComplete * 10) / 10,
    estimateAccuracy: Math.round(estimateAccuracy * 100),
    issuesWithoutEstimate: issues.filter(issue => !issue.storyPoints).length
  }
}