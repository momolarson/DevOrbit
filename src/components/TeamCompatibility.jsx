import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function TeamCompatibility({ repository }) {
  const { gitProvider } = useAuth()
  const [collaborations, setCollaborations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (repository && gitProvider) {
      fetchCollaborationData()
    }
  }, [repository, gitProvider])

  const fetchCollaborationData = async () => {
    setLoading(true)
    setCollaborations([])
    
    try {
      // Fetch recent pull requests using provider abstraction
      console.log('Fetching PRs for team compatibility using provider:', gitProvider.name)
      
      const pullRequests = await gitProvider.fetchPullRequests(repository, 'all', 30)
      console.log('Fetched PRs for team analysis:', pullRequests.length)
      
      // Track collaborations between authors and reviewers
      const collaborationMap = new Map()
      
      // For now, create mock collaboration data since PR reviews require additional API calls
      // In a full implementation, you'd need to fetch reviews for each PR
      for (const pr of pullRequests.slice(0, 10)) {
        // Create a basic collaboration entry
        const authorKey = pr.author?.username || 'Unknown'
        const key = `${authorKey}-reviewer`
        
        const existing = collaborationMap.get(key) || {
          author: authorKey,
          reviewer: 'Team Reviewers',
          prsReviewed: 0,
          totalComments: 0,
          avgResponseTime: 24, // Mock 24 hour response time
          reviews: []
        }
        
        existing.prsReviewed++
        existing.reviews.push({
          prNumber: pr.number,
          prTitle: pr.title,
          reviewDate: pr.updatedAt,
          state: pr.state
        })
        
        collaborationMap.set(key, existing)
      }
      
      // Convert map to array and sort by collaboration frequency
      const collaborationArray = Array.from(collaborationMap.values())
        .filter(collab => collab.prsReviewed > 0)
        .sort((a, b) => b.prsReviewed - a.prsReviewed)
      
      console.log('Total collaborations found:', collaborationArray.length)
      setCollaborations(collaborationArray)
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
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-400 mb-2">No Team Collaboration Found</h3>
              <p className="text-gray-500 text-sm max-w-sm mx-auto">
                This repository doesn&apos;t have recent pull request reviews, or team members may not be actively collaborating.
              </p>
              <p className="text-gray-600 text-xs mt-2">
                Check the browser console for API debugging information.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-400 mb-2">Unable to Load Team Data</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            There was an issue loading collaboration data. Check your network connection and GitHub token permissions.
          </p>
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