import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function TeamCompatibility({ repository }) {
  const { token } = useAuth()
  const [collaborations, setCollaborations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (repository && token) {
      fetchCollaborationData()
    }
  }, [repository, token])

  const fetchCollaborationData = async () => {
    setLoading(true)
    
    try {
      // Fetch recent pull requests with reviews
      const prsResponse = await fetch(
        `https://api.github.com/repos/${repository.owner.login}/${repository.name}/pulls?state=all&per_page=30`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      )

      if (prsResponse.ok) {
        const prs = await prsResponse.json()
        
        // Track collaborations between authors and reviewers
        const collaborationMap = new Map()
        
        for (const pr of prs.slice(0, 10)) { // Limit to avoid rate limits
          try {
            // Fetch reviews for this PR
            const reviewsResponse = await fetch(
              `https://api.github.com/repos/${repository.owner.login}/${repository.name}/pulls/${pr.number}/reviews`,
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Accept': 'application/vnd.github.v3+json'
                }
              }
            )
            
            if (reviewsResponse.ok) {
              const reviews = await reviewsResponse.json()
              
              reviews.forEach(review => {
                if (review.user.login !== pr.user.login) { // Don't count self-reviews
                  const key = `${pr.user.login}-${review.user.login}`
                  const existing = collaborationMap.get(key) || {
                    author: pr.user.login,
                    reviewer: review.user.login,
                    prsReviewed: 0,
                    totalComments: 0,
                    avgResponseTime: 0,
                    reviews: []
                  }
                  
                  existing.prsReviewed++
                  existing.reviews.push({
                    prNumber: pr.number,
                    prTitle: pr.title,
                    reviewDate: review.submitted_at,
                    state: review.state
                  })
                  
                  collaborationMap.set(key, existing)
                }
              })
            }
          } catch (error) {
            console.error(`Error fetching reviews for PR ${pr.number}:`, error)
          }
        }
        
        // Convert map to array and sort by collaboration frequency
        const collaborationArray = Array.from(collaborationMap.values())
          .filter(collab => collab.prsReviewed > 0)
          .sort((a, b) => b.prsReviewed - a.prsReviewed)
        
        setCollaborations(collaborationArray)
      }
    } catch (error) {
      console.error('Error fetching collaboration data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCompatibilityScore = (collaboration) => {
    // Simple compatibility score based on review frequency
    // In a real app, this would include response time, comment quality, etc.
    const score = Math.min(100, collaboration.prsReviewed * 20)
    return score
  }

  const getCompatibilityColor = (score) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-white mb-6">Team Compatibility</h3>
      
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
        </div>
      ) : collaborations.length > 0 ? (
        <div className="space-y-4">
          {collaborations.map((collab, index) => {
            const score = getCompatibilityScore(collab)
            return (
              <div key={index} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">
                        {collab.author.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white font-medium">{collab.author}</span>
                    </div>
                    <div className="text-gray-400">→</div>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-xs font-bold">
                        {collab.reviewer.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white font-medium">{collab.reviewer}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getCompatibilityColor(score)}`}>
                      {score}%
                    </div>
                    <div className="text-xs text-gray-400">Compatibility</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">PRs Reviewed</div>
                    <div className="text-white font-medium">{collab.prsReviewed}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Avg Response</div>
                    <div className="text-white font-medium">
                      {collab.avgResponseTime || '< 24h'}
                    </div>
                  </div>
                </div>
                
                {collab.reviews.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <div className="text-xs text-gray-400 mb-2">Recent Reviews:</div>
                    <div className="space-y-1">
                      {collab.reviews.slice(0, 3).map((review, reviewIndex) => (
                        <div key={reviewIndex} className="text-xs text-gray-300 flex justify-between">
                          <span className="truncate">PR #{review.prNumber}: {review.prTitle}</span>
                          <span className={`ml-2 ${
                            review.state === 'APPROVED' ? 'text-green-400' :
                            review.state === 'CHANGES_REQUESTED' ? 'text-red-400' :
                            'text-yellow-400'
                          }`}>
                            {review.state}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          
          {collaborations.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No collaboration data found. Try analyzing a repository with more pull request activity.
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          No collaboration data available
        </div>
      )}
      
      <div className="mt-6 p-4 bg-gray-700 rounded-lg">
        <h4 className="text-sm font-medium text-teal-400 mb-2">Team Recommendations</h4>
        <ul className="text-xs text-gray-300 space-y-1">
          <li>• Encourage cross-team reviews for knowledge sharing</li>
          <li>• Aim for multiple reviewers on complex changes</li>
          <li>• Maintain consistent review patterns across team members</li>
          <li>• Foster collaborative relationships through regular code reviews</li>
        </ul>
      </div>
    </div>
  )
}