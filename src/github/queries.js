// One PR shape serves both "PRs I authored" and "PRs I reviewed".
// Page size is kept small because each PR carries nested reviews and comments.
export const PR_FIELDS = `
  fragment PRFields on PullRequest {
    repository { nameWithOwner isPrivate }
    number
    title
    url
    body
    state
    isDraft
    createdAt
    mergedAt
    closedAt
    updatedAt
    additions
    deletions
    changedFiles
    author { login __typename }
    closingIssuesReferences(first: 1) { totalCount }
    commits(first: 100) {
      totalCount
      nodes {
        commit {
          oid
          messageHeadline
          message
          committedDate
          url
          author { user { login } }
        }
      }
    }
    reviews(first: 50) {
      totalCount
      nodes {
        author { login __typename }
        submittedAt
        state
        url
        comments(first: 50) {
          nodes { author { login __typename } createdAt body url }
        }
      }
    }
    comments(first: 100) {
      totalCount
      nodes { author { login __typename } createdAt body url }
    }
  }
`

export const SEARCH_PRS = `
  ${PR_FIELDS}
  query SearchPRs($q: String!, $after: String) {
    rateLimit { remaining limit resetAt cost }
    search(query: $q, type: ISSUE, first: 25, after: $after) {
      issueCount
      pageInfo { hasNextPage endCursor }
      nodes { ...PRFields }
    }
  }
`

export const VIEWER = `
  query Viewer {
    rateLimit { remaining limit resetAt cost }
    viewer { login name }
  }
`
