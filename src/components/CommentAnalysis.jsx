import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function CommentAnalysis({ repository }) {
  const { token } = useAuth()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('desc')

  useEffect(() => {
    if (repository && token) {
      fetchCommentData()
    }
  }, [repository, token])

  const fetchCommentData = async () => {
    setLoading(true)
    setComments([])
    
    try {
      // Fetch recent pull requests
      const prsUrl = `https://api.github.com/repos/${repository.owner.login}/${repository.name}/pulls?state=all&per_page=20`
      console.log('Fetching PRs for comments from:', prsUrl)
      
      const prsResponse = await fetch(prsUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })

      console.log('PRs response status:', prsResponse.status)

      if (prsResponse.ok) {
        const prs = await prsResponse.json()
        console.log('Fetched PRs:', prs.length)
        
        // Fetch comments for each PR
        const allComments = []
        for (const pr of prs.slice(0, 5)) { // Limit to avoid rate limits
          try {
            const commentsUrl = `https://api.github.com/repos/${repository.owner.login}/${repository.name}/issues/${pr.number}/comments`
            console.log(`Fetching comments for PR ${pr.number}`)
            
            const commentsResponse = await fetch(commentsUrl, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            })
            
            if (commentsResponse.ok) {
              const prComments = await commentsResponse.json()
              console.log(`PR ${pr.number} has ${prComments.length} comments`)
              
              prComments.forEach(comment => {
                allComments.push({
                  id: comment.id,
                  prNumber: pr.number,
                  prTitle: pr.title,
                  body: comment.body,
                  author: comment.user.login,
                  created_at: comment.created_at,
                  responseTime: calculateResponseTime(comment.created_at, pr.created_at)
                })
              })
            }
          } catch (error) {
            console.error(`Error fetching comments for PR ${pr.number}:`, error)
          }
        }
        
        console.log('Total comments collected:', allComments.length)
        setComments(allComments)
      } else {
        const errorText = await prsResponse.text()
        console.error('PR API Error:', prsResponse.status, errorText)
      }
    } catch (error) {
      console.error('Error fetching comment data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateResponseTime = (commentDate, prDate) => {
    const comment = new Date(commentDate)
    const pr = new Date(prDate)
    const diffHours = Math.abs(comment - pr) / (1000 * 60 * 60)
    return Math.round(diffHours * 10) / 10
  }

  const sortedComments = [...comments].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getSortIcon = (field) => {
    if (sortField !== field) return null
    
    return (
      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
        />
      </svg>
    )
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-white mb-6">PR Comment Analysis</h3>
      
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
        </div>
      ) : comments.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th 
                  className="text-left p-3 text-gray-400 font-medium cursor-pointer hover:text-white"
                  onClick={() => handleSort('prNumber')}
                >
                  <div className="flex items-center">
                    PR #{getSortIcon('prNumber')}
                  </div>
                </th>
                <th 
                  className="text-left p-3 text-gray-400 font-medium cursor-pointer hover:text-white"
                  onClick={() => handleSort('author')}
                >
                  <div className="flex items-center">
                    Author {getSortIcon('author')}
                  </div>
                </th>
                <th className="text-left p-3 text-gray-400 font-medium">Comment</th>
                <th 
                  className="text-left p-3 text-gray-400 font-medium cursor-pointer hover:text-white"
                  onClick={() => handleSort('responseTime')}
                >
                  <div className="flex items-center">
                    Response Time {getSortIcon('responseTime')}
                  </div>
                </th>
                <th 
                  className="text-left p-3 text-gray-400 font-medium cursor-pointer hover:text-white"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center">
                    Date {getSortIcon('created_at')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedComments.map((comment) => (
                <tr key={comment.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="p-3">
                    <div className="text-teal-400 font-medium">#{comment.prNumber}</div>
                    <div className="text-xs text-gray-500 truncate max-w-32" title={comment.prTitle}>
                      {comment.prTitle}
                    </div>
                  </td>
                  <td className="p-3 text-white">{comment.author}</td>
                  <td className="p-3">
                    <div className="text-gray-300 truncate max-w-64" title={comment.body}>
                      {comment.body.substring(0, 100)}
                      {comment.body.length > 100 && '...'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {comment.body.length} characters
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`font-medium ${
                      comment.responseTime <= 24 ? 'text-green-400' : 
                      comment.responseTime <= 72 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {comment.responseTime}h
                    </span>
                  </td>
                  <td className="p-3 text-gray-400">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-400 mb-2">No PR Comments Found</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            This repository doesn't have any recent pull request comments, or they may be in private repositories that require different permissions.
          </p>
          <p className="text-gray-600 text-xs mt-2">
            Check the browser console for API debugging information.
          </p>
        </div>
      )}
    </div>
  )
}