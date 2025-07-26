import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function SummaryCards({ repository }) {
  const { gitProvider } = useAuth()
  const [metrics, setMetrics] = useState({
    totalCommits: 0,
    avgCommitsPerDay: 0,
    medianResponseTime: 0,
    activeDays: 0,
    loading: true
  })

  useEffect(() => {
    if (repository && gitProvider) {
      fetchMetrics()
    } else {
      // Reset metrics when no repository is selected
      setMetrics({
        totalCommits: 0,
        avgCommitsPerDay: 0,
        medianResponseTime: 0,
        activeDays: 0,
        loading: false
      })
    }
  }, [repository, gitProvider])

  const fetchMetrics = async () => {
    setMetrics(prev => ({ ...prev, loading: true }))
    
    try {
      // Fetch commits for the last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      
      console.log('Fetching commits...')
      
      const commits = await gitProvider.fetchCommits(repository, thirtyDaysAgo, 100)
      console.log('Fetched commits:', commits.length)
      
      // Calculate metrics
      const commitsByDay = {}
      commits.forEach(commit => {
        const date = new Date(commit.author.date).toDateString()
        commitsByDay[date] = (commitsByDay[date] || 0) + 1
      })
      
      const activeDays = Object.keys(commitsByDay).length
      const totalCommits = commits.length
      const avgCommitsPerDay = activeDays > 0 ? totalCommits / activeDays : 0

      setMetrics({
        totalCommits,
        avgCommitsPerDay: Math.round(avgCommitsPerDay * 10) / 10,
        medianResponseTime: 8.5, // Placeholder - would need PR comment analysis
        activeDays,
        loading: false
      })
    } catch (error) {
      console.error('Error fetching metrics:', error)
      setMetrics({
        totalCommits: 'Error',
        avgCommitsPerDay: 'Error',
        medianResponseTime: 'Error',
        activeDays: 'Error',
        loading: false
      })
    }
  }

  const cards = [
    {
      title: 'Total Commits',
      value: metrics.loading ? '...' : metrics.totalCommits,
      subtitle: 'Last 30 days',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'text-blue-400'
    },
    {
      title: 'Avg Commits/Day',
      value: metrics.loading ? '...' : metrics.avgCommitsPerDay,
      subtitle: 'Active days only',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      color: 'text-green-400'
    },
    {
      title: 'Active Days',
      value: metrics.loading ? '...' : metrics.activeDays,
      subtitle: 'Days with commits',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: 'text-purple-400'
    },
    {
      title: 'Response Time',
      value: metrics.loading ? '...' : `${metrics.medianResponseTime}h`,
      subtitle: 'Median PR response',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-teal-400'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div key={index} className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">{card.title}</p>
              <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
              <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
            </div>
            <div className={`${card.color}`}>
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}