import { useState, useEffect } from 'react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { useAuth } from '../../hooks/useAuth'

export default function CommentsDashboard({ repository, onBack }) {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [commentData, setCommentData] = useState({
    comments: [],
    reviews: [],
    stats: {},
    patterns: {},
    recommendations: []
  })

  useEffect(() => {
    if (repository && token) {
      fetchDetailedCommentData()
    }
  }, [repository, token])

  const fetchDetailedCommentData = async () => {
    setLoading(true)
    
    try {
      // Fetch pull requests
      const prsResponse = await fetch(
        `https://api.github.com/repos/${repository.owner.login}/${repository.name}/pulls?state=all&per_page=50`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      )

      if (prsResponse.ok) {
        const prs = await prsResponse.json()
        console.log('Fetched PRs for comment analysis:', prs.length)
        
        const allComments = []
        const allReviews = []
        
        // Fetch comments and reviews for each PR
        for (const pr of prs.slice(0, 15)) {
          try {
            // Fetch issue comments
            const commentsResponse = await fetch(
              `https://api.github.com/repos/${repository.owner.login}/${repository.name}/issues/${pr.number}/comments`,
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Accept': 'application/vnd.github.v3+json'
                }
              }
            )
            
            if (commentsResponse.ok) {
              const prComments = await commentsResponse.json()
              prComments.forEach(comment => {
                allComments.push({
                  ...comment,
                  prNumber: pr.number,
                  prTitle: pr.title,
                  prAuthor: pr.user.login,
                  prCreated: pr.created_at
                })
              })
            }

            // Fetch review comments
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
              const prReviews = await reviewsResponse.json()
              prReviews.forEach(review => {
                allReviews.push({
                  ...review,
                  prNumber: pr.number,
                  prTitle: pr.title,
                  prAuthor: pr.user.login,
                  prCreated: pr.created_at
                })
              })
            }
            
          } catch (error) {
            console.error(`Error fetching comments for PR ${pr.number}:`, error)
          }
        }
        
        processCommentAnalytics(allComments, allReviews, prs)
      }
    } catch (error) {
      console.error('Error fetching detailed comment data:', error)
    } finally {
      setLoading(false)
    }
  }

  const processCommentAnalytics = (comments, reviews) => {
    // Response time analysis
    const responseTimes = []
    const commentLengths = []
    const hourlyPattern = new Array(24).fill(0)
    const reviewers = {}
    const sentimentData = { positive: 0, neutral: 0, constructive: 0 }

    comments.forEach(comment => {
      const commentDate = new Date(comment.created_at)
      const prDate = new Date(comment.prCreated)
      const responseTimeHours = Math.abs(commentDate - prDate) / (1000 * 60 * 60)
      
      responseTimes.push(responseTimeHours)
      commentLengths.push(comment.body.length)
      
      const hour = commentDate.getHours()
      hourlyPattern[hour]++
      
      // Simple sentiment analysis
      const body = comment.body.toLowerCase()
      if (body.includes('good') || body.includes('great') || body.includes('nice') || body.includes('approve')) {
        sentimentData.positive++
      } else if (body.includes('issue') || body.includes('problem') || body.includes('fix') || body.includes('change')) {
        sentimentData.constructive++
      } else {
        sentimentData.neutral++
      }
    })

    reviews.forEach(review => {
      const reviewer = review.user.login
      if (!reviewers[reviewer]) {
        reviewers[reviewer] = {
          approved: 0,
          changesRequested: 0,
          commented: 0,
          total: 0
        }
      }
      
      reviewers[reviewer].total++
      if (review.state === 'APPROVED') reviewers[reviewer].approved++
      else if (review.state === 'CHANGES_REQUESTED') reviewers[reviewer].changesRequested++
      else reviewers[reviewer].commented++
    })

    // Calculate statistics
    const avgResponseTime = responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0
    const medianResponseTime = responseTimes.length > 0 ? responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length / 2)] : 0
    const avgCommentLength = commentLengths.length > 0 ? commentLengths.reduce((a, b) => a + b, 0) / commentLengths.length : 0

    // Generate recommendations
    const recommendations = generateCommentRecommendations(avgResponseTime, avgCommentLength, reviewers, sentimentData)

    setCommentData({
      comments,
      reviews,
      stats: {
        totalComments: comments.length,
        totalReviews: reviews.length,
        avgResponseTime: Math.round(avgResponseTime * 10) / 10,
        medianResponseTime: Math.round(medianResponseTime * 10) / 10,
        avgCommentLength: Math.round(avgCommentLength),
        activeReviewers: Object.keys(reviewers).length
      },
      patterns: {
        hourlyPattern,
        reviewers: Object.entries(reviewers)
          .sort(([,a], [,b]) => b.total - a.total)
          .slice(0, 10),
        sentimentData,
        responseTimes
      },
      recommendations
    })
  }

  const generateCommentRecommendations = (avgResponse, avgLength, reviewers, sentiment) => {
    const recommendations = []
    
    // Response time recommendations
    if (avgResponse > 48) {
      recommendations.push({
        type: 'warning',
        title: 'Slow Response Times',
        message: `Average response time is ${avgResponse.toFixed(1)} hours. Target under 24 hours.`,
        action: 'Set up PR notifications and encourage timely reviews.'
      })
    } else if (avgResponse < 24) {
      recommendations.push({
        type: 'success',
        title: 'Excellent Response Times',
        message: `Team maintains ${avgResponse.toFixed(1)} hour average response time.`,
        action: 'Keep up the great communication pace!'
      })
    }

    // Comment length recommendations
    if (avgLength < 50) {
      recommendations.push({
        type: 'info',
        title: 'Brief Comments',
        message: `Average comment length is ${avgLength} characters.`,
        action: 'Consider providing more detailed feedback for better code quality.'
      })
    }

    // Reviewer distribution
    const totalReviews = Object.values(reviewers).reduce((sum, r) => sum + r.total, 0)
    const topReviewer = Object.values(reviewers).sort((a, b) => b.total - a.total)[0]
    if (topReviewer && topReviewer.total > totalReviews * 0.5) {
      recommendations.push({
        type: 'info',
        title: 'Review Load Distribution',
        message: 'One reviewer is handling most of the reviews.',
        action: 'Consider distributing review responsibilities more evenly across the team.'
      })
    }

    // Sentiment analysis
    const totalSentiment = sentiment.positive + sentiment.neutral + sentiment.constructive
    const constructivePercentage = (sentiment.constructive / totalSentiment) * 100
    if (constructivePercentage > 40) {
      recommendations.push({
        type: 'info',
        title: 'High Constructive Feedback',
        message: `${constructivePercentage.toFixed(1)}% of comments are constructive criticism.`,
        action: 'Balance constructive feedback with positive recognition.'
      })
    }

    return recommendations
  }

  const activityChartData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [{
      label: 'Comments by Hour',
      data: commentData.patterns.hourlyPattern || [],
      borderColor: '#2DD4BF',
      backgroundColor: 'rgba(45, 212, 191, 0.1)',
      fill: true,
      tension: 0.4
    }]
  }

  const sentimentChartData = {
    labels: ['Positive', 'Neutral', 'Constructive'],
    datasets: [{
      data: [
        commentData.patterns.sentimentData?.positive || 0,
        commentData.patterns.sentimentData?.neutral || 0,
        commentData.patterns.sentimentData?.constructive || 0
      ],
      backgroundColor: ['#10B981', '#6B7280', '#F59E0B'],
      borderWidth: 2,
      borderColor: '#374151'
    }]
  }

  const responseTimeChartData = {
    labels: ['0-6h', '6-12h', '12-24h', '24-48h', '48h+'],
    datasets: [{
      label: 'Response Time Distribution',
      data: [
        commentData.patterns.responseTimes?.filter(t => t <= 6).length || 0,
        commentData.patterns.responseTimes?.filter(t => t > 6 && t <= 12).length || 0,
        commentData.patterns.responseTimes?.filter(t => t > 12 && t <= 24).length || 0,
        commentData.patterns.responseTimes?.filter(t => t > 24 && t <= 48).length || 0,
        commentData.patterns.responseTimes?.filter(t => t > 48).length || 0
      ],
      backgroundColor: '#2DD4BF',
      borderColor: '#1F2937',
      borderWidth: 1
    }]
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        labels: { color: '#ffffff' }
      }
    },
    scales: {
      x: {
        ticks: { color: '#9CA3AF' },
        grid: { color: '#374151' }
      },
      y: {
        ticks: { color: '#9CA3AF' },
        grid: { color: '#374151' }
      }
    }
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Comments Analysis</h1>
          <p className="text-gray-400">PR discussion patterns and review insights</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card text-center">
              <div className="text-3xl font-bold text-blue-400">{commentData.stats.totalComments}</div>
              <div className="text-gray-400 text-sm">Total Comments</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-green-400">{commentData.stats.totalReviews}</div>
              <div className="text-gray-400 text-sm">Reviews</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-teal-400">{commentData.stats.avgResponseTime}h</div>
              <div className="text-gray-400 text-sm">Avg Response</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-purple-400">{commentData.stats.avgCommentLength}</div>
              <div className="text-gray-400 text-sm">Avg Length</div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Comment Activity by Hour</h3>
              <div className="h-64">
                <Line data={activityChartData} options={chartOptions} />
              </div>
            </div>
            
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Comment Sentiment</h3>
              <div className="h-64">
                <Doughnut data={sentimentChartData} options={{ responsive: true, plugins: { legend: { labels: { color: '#ffffff' } } } }} />
              </div>
            </div>
            
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Response Time Distribution</h3>
              <div className="h-64">
                <Bar data={responseTimeChartData} options={chartOptions} />
              </div>
            </div>
            
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Top Reviewers</h3>
              <div className="space-y-3">
                {commentData.patterns.reviewers?.slice(0, 5).map(([reviewer, stats]) => (
                  <div key={reviewer} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">
                        {reviewer.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-medium">{reviewer}</div>
                        <div className="text-xs text-gray-400">
                          ✅ {stats.approved} 🔄 {stats.changesRequested} 💬 {stats.commented}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-blue-400 font-bold">{stats.total}</div>
                      <div className="text-xs text-gray-400">reviews</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Comments */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Comments</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {commentData.comments.slice(0, 10).map((comment) => (
                <div key={comment.id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-teal-400 font-medium">#{comment.prNumber}</span>
                      <span className="text-gray-400">by</span>
                      <span className="text-white">{comment.user.login}</span>
                    </div>
                    <span className="text-gray-500 text-sm">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">
                    {comment.body.substring(0, 200)}
                    {comment.body.length > 200 && '...'}
                  </p>
                  <div className="text-xs text-gray-500">
                    Length: {comment.body.length} characters
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          {commentData.recommendations.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Recommendations</h3>
              <div className="space-y-4">
                {commentData.recommendations.map((rec, index) => (
                  <div key={index} className={`p-4 rounded-lg border-l-4 ${
                    rec.type === 'warning' ? 'bg-yellow-900/20 border-yellow-400' : 
                    rec.type === 'success' ? 'bg-green-900/20 border-green-400' :
                    'bg-blue-900/20 border-blue-400'
                  }`}>
                    <h4 className="font-medium text-white mb-1">{rec.title}</h4>
                    <p className="text-gray-300 text-sm mb-2">{rec.message}</p>
                    <p className="text-teal-400 text-sm">{rec.action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}