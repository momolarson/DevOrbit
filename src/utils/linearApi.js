// Linear API utilities for fetching issues, story points, and team data

// Use proxy in development to avoid CORS issues
const LINEAR_API_URL = import.meta.env.DEV 
  ? '/api/linear/graphql' 
  : 'https://api.linear.app/graphql'

class LinearAPI {
  constructor(token) {
    this.token = token
  }

  async query(query, variables = {}) {
    try {
      console.log('Making Linear API request with query:', query.slice(0, 100) + '...')
      
      const response = await fetch(LINEAR_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': this.token,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'DevOrbit/1.0'
        },
        body: JSON.stringify({ query, variables })
      })

      console.log('Linear API response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Linear API error response:', errorText)
        throw new Error(`Linear API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const responseData = await response.json()
      console.log('Linear API response data:', responseData)
      
      if (responseData.errors) {
        console.error('Linear GraphQL errors:', responseData.errors)
        throw new Error(`GraphQL errors: ${responseData.errors.map(e => e.message).join(', ')}`)
      }

      return responseData.data
    } catch (error) {
      console.error('Linear API error:', error)
      
      // Check if it's a network error
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Network error: Unable to connect to Linear API. This might be due to CORS restrictions or network issues.')
      }
      
      throw error
    }
  }

  // Fetch issues with estimates and assignees
  async getIssues(filters = {}) {
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
              cycle {
                id
                name
                startsAt
                endsAt
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
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `

    const data = await this.query(query, { first: limit })
    return data.issues.edges.map(edge => edge.node)
  }

  // Fetch teams and their members
  async getTeams() {
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
      ...edge.node,
      members: edge.node.members.edges.map(memberEdge => memberEdge.node)
    }))
  }

  // Fetch user's assigned issues with performance metrics
  async getUserIssues(userId, dateRange = 30) {
    const since = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000).toISOString()
    
    const query = `
      query GetUserIssues($userId: String!, $since: DateTime) {
        issues(
          filter: { 
            assignee: { id: { eq: $userId } }
            updatedAt: { gte: $since }
          }
          orderBy: updatedAt
        ) {
          edges {
            node {
              id
              identifier
              title
              estimate
              priority
              createdAt
              updatedAt
              completedAt
              state {
                type
              }
              team {
                name
                key
              }
              cycle {
                name
                startsAt
                endsAt
              }
            }
          }
        }
      }
    `

    const data = await this.query(query, { userId, since })
    return data.issues.edges.map(edge => edge.node)
  }

  // Fetch cycles for velocity tracking
  async getCycles(teamId = null) {
    const teamFilter = teamId ? `team: { id: { eq: "${teamId}" } }` : ''
    
    const query = `
      query GetCycles {
        cycles(
          ${teamFilter ? `filter: { ${teamFilter} }` : ''}
          orderBy: startsAt
        ) {
          edges {
            node {
              id
              name
              description
              startsAt
              endsAt
              completedAt
              team {
                id
                name
                key
              }
              issues {
                edges {
                  node {
                    id
                    estimate
                    completedAt
                    assignee {
                      id
                      name
                    }
                    state {
                      type
                    }
                  }
                }
              }
            }
          }
        }
      }
    `

    const data = await this.query(query)
    return data.cycles.edges.map(edge => ({
      ...edge.node,
      issues: edge.node.issues.edges.map(issueEdge => issueEdge.node)
    }))
  }

  // Calculate velocity and performance metrics
  calculateVelocityMetrics(issues) {
    const completedIssues = issues.filter(issue => 
      issue.state.type === 'completed' && issue.completedAt
    )

    const totalEstimate = completedIssues.reduce((sum, issue) => 
      sum + (issue.estimate || 0), 0
    )

    const avgTimeToComplete = completedIssues.length > 0 
      ? completedIssues.reduce((sum, issue) => {
          const created = new Date(issue.createdAt)
          const completed = new Date(issue.completedAt)
          return sum + (completed - created) / (1000 * 60 * 60 * 24) // days
        }, 0) / completedIssues.length
      : 0

    const estimateAccuracy = completedIssues.length > 0 
      ? completedIssues.filter(issue => issue.estimate > 0).length / completedIssues.length
      : 0

    return {
      completedCount: completedIssues.length,
      totalEstimate,
      avgTimeToComplete: Math.round(avgTimeToComplete * 10) / 10,
      estimateAccuracy: Math.round(estimateAccuracy * 100),
      issuesWithoutEstimate: issues.filter(issue => !issue.estimate).length
    }
  }

  // Get team performance summary
  async getTeamPerformance(teamId, dateRange = 30) {
    const issues = await this.getIssues({ teamId, limit: 100 })
    const recentIssues = issues.filter(issue => {
      const updatedAt = new Date(issue.updatedAt)
      const cutoff = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000)
      return updatedAt >= cutoff
    })

    const memberPerformance = {}
    
    recentIssues.forEach(issue => {
      if (issue.assignee) {
        const assigneeId = issue.assignee.id
        if (!memberPerformance[assigneeId]) {
          memberPerformance[assigneeId] = {
            assignee: issue.assignee,
            issues: []
          }
        }
        memberPerformance[assigneeId].issues.push(issue)
      }
    })

    // Calculate metrics for each team member
    Object.keys(memberPerformance).forEach(assigneeId => {
      const memberData = memberPerformance[assigneeId]
      memberData.metrics = this.calculateVelocityMetrics(memberData.issues)
    })

    return {
      teamIssues: recentIssues,
      memberPerformance,
      teamMetrics: this.calculateVelocityMetrics(recentIssues)
    }
  }

  // Generate workload optimization recommendations
  generateWorkloadRecommendations(teamPerformance) {
    const recommendations = []
    const members = Object.values(teamPerformance.memberPerformance)
    
    if (members.length === 0) {
      return recommendations
    }

    // Calculate team averages
    const avgCompletedCount = members.reduce((sum, m) => sum + m.metrics.completedCount, 0) / members.length
    const avgStoryPoints = members.reduce((sum, m) => sum + m.metrics.totalEstimate, 0) / members.length
    const avgTimeToComplete = members.reduce((sum, m) => sum + m.metrics.avgTimeToComplete, 0) / members.length

    // Find over/under performers
    const overPerformers = members.filter(m => 
      m.metrics.completedCount > avgCompletedCount * 1.3 && 
      m.metrics.avgTimeToComplete < avgTimeToComplete * 0.8
    )
    
    const underPerformers = members.filter(m => 
      m.metrics.completedCount < avgCompletedCount * 0.7 || 
      m.metrics.avgTimeToComplete > avgTimeToComplete * 1.5
    )

    const overloaded = members.filter(m => 
      m.metrics.totalEstimate > avgStoryPoints * 1.5
    )

    const underutilized = members.filter(m => 
      m.metrics.totalEstimate < avgStoryPoints * 0.5
    )

    // Generate recommendations
    if (overPerformers.length > 0) {
      recommendations.push({
        type: 'success',
        priority: 'medium',
        title: 'High Performers Identified',
        description: `${overPerformers.length} team members showing excellent velocity`,
        actionItems: [
          'Consider assigning more complex/high-value tasks',
          'Utilize as mentors for knowledge sharing',
          'Review their practices for team adoption'
        ],
        members: overPerformers.map(m => m.assignee.displayName || m.assignee.name)
      })
    }

    if (underPerformers.length > 0) {
      recommendations.push({
        type: 'warning',
        priority: 'high',
        title: 'Performance Support Needed',
        description: `${underPerformers.length} team members may need additional support`,
        actionItems: [
          'Schedule 1:1s to understand blockers',
          'Consider pairing with high performers',
          'Review task complexity and provide guidance'
        ],
        members: underPerformers.map(m => m.assignee.displayName || m.assignee.name)
      })
    }

    if (overloaded.length > 0) {
      recommendations.push({
        type: 'warning',
        priority: 'high',
        title: 'Workload Imbalance Detected',
        description: `${overloaded.length} team members have high story point loads`,
        actionItems: [
          'Review current sprint commitments',
          'Redistribute tasks from overloaded to available members',
          'Consider breaking down large tasks'
        ],
        members: overloaded.map(m => m.assignee.displayName || m.assignee.name)
      })
    }

    if (underutilized.length > 0) {
      recommendations.push({
        type: 'info',
        priority: 'medium',
        title: 'Capacity Available',
        description: `${underutilized.length} team members have additional capacity`,
        actionItems: [
          'Assign additional tasks or stretch goals',
          'Involve in cross-team initiatives',
          'Consider training or skill development opportunities'
        ],
        members: underutilized.map(m => m.assignee.displayName || m.assignee.name)
      })
    }

    // Issue-specific recommendations
    const issuesWithoutEstimate = teamPerformance.teamIssues.filter(issue => !issue.estimate)
    if (issuesWithoutEstimate.length > 0) {
      recommendations.push({
        type: 'info',
        priority: 'medium',
        title: 'Estimation Coverage',
        description: `${issuesWithoutEstimate.length} issues lack story point estimates`,
        actionItems: [
          'Schedule estimation sessions for unestimated work',
          'Establish estimation guidelines for the team',
          'Review and refine estimation processes'
        ]
      })
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }
}

export default LinearAPI