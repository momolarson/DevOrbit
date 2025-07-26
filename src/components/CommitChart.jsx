import { useState, useEffect } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { useAuth } from '../hooks/useAuth'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

export default function CommitChart({ repository }) {
  const { gitProvider } = useAuth()
  const [chartData, setChartData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState(30)

  useEffect(() => {
    if (repository && gitProvider) {
      fetchCommitData()
    } else {
      // Reset chart data when no repository is selected
      setChartData(null)
      setLoading(false)
    }
  }, [repository, gitProvider, timeRange])

  const fetchCommitData = async () => {
    setLoading(true)
    setChartData(null)
    
    try {
      const daysAgo = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000).toISOString()
      
      console.log('Fetching commit chart data...')
      
      const commits = await gitProvider.fetchCommits(repository, daysAgo, 100)
      console.log('Chart commits fetched:', commits.length)
      processCommitData(commits)
    } catch (error) {
      console.error('Error fetching commits for chart:', error)
      // Show empty chart on error
      processCommitData([])
    } finally {
      setLoading(false)
    }
  }

  const processCommitData = (commits) => {
    // Group commits by date
    const commitsByDate = {}
    const today = new Date()
    
    // Initialize all dates in range with 0 commits
    for (let i = 0; i < timeRange; i++) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      commitsByDate[dateStr] = 0
    }
    
    // Count actual commits
    commits.forEach(commit => {
      const date = new Date(commit.author.date).toISOString().split('T')[0]
      if (Object.prototype.hasOwnProperty.call(commitsByDate, date)) {
        commitsByDate[date]++
      }
    })
    
    // Sort dates and prepare chart data
    const sortedDates = Object.keys(commitsByDate).sort()
    const labels = sortedDates.map(date => {
      const d = new Date(date)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })
    const data = sortedDates.map(date => commitsByDate[date])

    setChartData({
      labels,
      datasets: [
        {
          label: 'Commits per day',
          data,
          borderColor: '#2DD4BF',
          backgroundColor: 'rgba(45, 212, 191, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    })
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#ffffff'
        }
      },
      title: {
        display: true,
        text: 'Commits Over Time',
        color: '#ffffff'
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#9CA3AF'
        },
        grid: {
          color: '#374151'
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#9CA3AF',
          stepSize: 1
        },
        grid: {
          color: '#374151'
        }
      }
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Commit Activity</h3>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(parseInt(e.target.value))}
          className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
        </div>
      ) : chartData ? (
        <div className="h-64">
          <Line data={chartData} options={options} />
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 text-gray-400">
          No commit data available
        </div>
      )}
    </div>
  )
}