import { useState, useEffect } from 'react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'
import { useAuth } from '../../hooks/useAuth'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

export default function CodeDashboard({ repository, onBack }) {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [codeData, setCodeData] = useState({
    files: [],
    languages: {},
    stats: {},
    patterns: {},
    recommendations: []
  })

  useEffect(() => {
    if (repository && token) {
      fetchDetailedCodeData()
    }
  }, [repository, token])

  const fetchDetailedCodeData = async () => {
    setLoading(true)
    
    try {
      // Fetch recent commits with file information
      const commitsResponse = await fetch(
        `https://api.github.com/repos/${repository.owner.login}/${repository.name}/commits?per_page=50`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      )

      if (commitsResponse.ok) {
        const commits = await commitsResponse.json()
        console.log('Fetched commits for code analysis:', commits.length)
        
        // Fetch detailed commit information
        const detailedCommits = []
        for (const commit of commits.slice(0, 20)) {
          try {
            const commitResponse = await fetch(commit.url, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            })
            
            if (commitResponse.ok) {
              const detailedCommit = await commitResponse.json()
              detailedCommits.push(detailedCommit)
            }
          } catch (error) {
            console.error(`Error fetching detailed commit ${commit.sha}:`, error)
          }
        }

        // Fetch repository languages
        const languagesResponse = await fetch(
          `https://api.github.com/repos/${repository.owner.login}/${repository.name}/languages`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        )

        let languages = {}
        if (languagesResponse.ok) {
          languages = await languagesResponse.json()
        }

        processCodeAnalytics(detailedCommits, languages)
      }
    } catch (error) {
      console.error('Error fetching detailed code data:', error)
    } finally {
      setLoading(false)
    }
  }

  const processCodeAnalytics = (commits, languages) => {
    const fileTypes = {}
    const fileChanges = {}
    const codeChurn = []
    const complexityMetrics = []
    let totalAdditions = 0
    let totalDeletions = 0
    let totalFiles = 0
    let refactorCommits = 0

    commits.forEach(commit => {
      if (commit.files) {
        const commitAdditions = commit.stats?.additions || 0
        const commitDeletions = commit.stats?.deletions || 0
        const commitTotal = commitAdditions + commitDeletions
        
        totalAdditions += commitAdditions
        totalDeletions += commitDeletions
        totalFiles += commit.files.length

        // Detect refactoring (high deletions relative to additions)
        if (commitDeletions > commitAdditions && commitTotal > 50) {
          refactorCommits++
        }

        // Calculate code churn
        codeChurn.push({
          date: commit.commit.author.date,
          additions: commitAdditions,
          deletions: commitDeletions,
          churn: commitDeletions / (commitAdditions + commitDeletions) || 0
        })

        commit.files.forEach(file => {
          const extension = file.filename.split('.').pop()?.toLowerCase() || 'unknown'
          
          // File type analysis
          if (!fileTypes[extension]) {
            fileTypes[extension] = { count: 0, additions: 0, deletions: 0 }
          }
          fileTypes[extension].count++
          fileTypes[extension].additions += file.additions || 0
          fileTypes[extension].deletions += file.deletions || 0

          // File change frequency
          if (!fileChanges[file.filename]) {
            fileChanges[file.filename] = { changes: 0, additions: 0, deletions: 0 }
          }
          fileChanges[file.filename].changes++
          fileChanges[file.filename].additions += file.additions || 0
          fileChanges[file.filename].deletions += file.deletions || 0

          // Complexity heuristics
          const fileComplexity = calculateFileComplexity(file)
          if (fileComplexity > 0) {
            complexityMetrics.push({
              filename: file.filename,
              complexity: fileComplexity,
              changes: file.changes || 0
            })
          }
        })
      }
    })

    // Calculate refactor rate
    const refactorRate = commits.length > 0 ? (refactorCommits / commits.length) * 100 : 0

    // Top changed files
    const topChangedFiles = Object.entries(fileChanges)
      .sort(([,a], [,b]) => b.changes - a.changes)
      .slice(0, 10)

    // Most complex files
    const mostComplexFiles = complexityMetrics
      .sort((a, b) => b.complexity - a.complexity)
      .slice(0, 10)

    // Generate recommendations
    const recommendations = generateCodeRecommendations(
      refactorRate, 
      totalAdditions, 
      totalDeletions, 
      topChangedFiles, 
      mostComplexFiles,
      fileTypes
    )

    setCodeData({
      files: topChangedFiles,
      languages,
      stats: {
        totalCommits: commits.length,
        totalAdditions,
        totalDeletions,
        totalFiles,
        refactorRate: Math.round(refactorRate * 10) / 10,
        avgFilesPerCommit: Math.round((totalFiles / commits.length) * 10) / 10,
        churnRate: Math.round(((totalDeletions / (totalAdditions + totalDeletions)) * 100) * 10) / 10
      },
      patterns: {
        fileTypes: Object.entries(fileTypes)
          .sort(([,a], [,b]) => b.count - a.count)
          .slice(0, 8),
        codeChurn: codeChurn.slice(-30), // Last 30 commits
        complexFiles: mostComplexFiles,
        topChangedFiles
      },
      recommendations
    })
  }

  const calculateFileComplexity = (file) => {
    // Simple complexity heuristic based on file size and change frequency
    const sizeComplexity = ((file.additions || 0) + (file.deletions || 0)) / 100
    const changeComplexity = (file.changes || 1) * 0.5
    return Math.round((sizeComplexity + changeComplexity) * 10) / 10
  }

  const generateCodeRecommendations = (refactorRate, additions, deletions, topFiles, complexFiles, fileTypes) => {
    const recommendations = []
    
    // Refactor rate recommendations
    if (refactorRate > 15) {
      recommendations.push({
        type: 'warning',
        title: 'High Refactoring Activity',
        message: `${refactorRate}% of commits involve significant refactoring.`,
        action: 'Consider planning dedicated refactoring phases to maintain code stability.'
      })
    } else if (refactorRate < 5) {
      recommendations.push({
        type: 'info',
        title: 'Low Refactoring Activity',
        message: `Only ${refactorRate}% of commits involve refactoring.`,
        action: 'Consider periodic code cleanup to prevent technical debt accumulation.'
      })
    }

    // Code churn recommendations
    const churnRate = (deletions / (additions + deletions)) * 100
    if (churnRate > 40) {
      recommendations.push({
        type: 'warning',
        title: 'High Code Churn',
        message: `${churnRate.toFixed(1)}% of code changes involve deletions.`,
        action: 'High churn may indicate unstable requirements or over-engineering.'
      })
    }

    // Hot spot files
    if (topFiles.length > 0 && topFiles[0][1].changes > 10) {
      recommendations.push({
        type: 'info',
        title: 'Frequently Modified Files',
        message: `${topFiles[0][0]} has been changed ${topFiles[0][1].changes} times.`,
        action: 'Consider refactoring frequently changed files to improve maintainability.'
      })
    }

    // File type diversity
    const jsFiles = fileTypes.js || fileTypes.jsx || fileTypes.ts || fileTypes.tsx
    const testFiles = fileTypes.test || fileTypes.spec
    if (!testFiles && jsFiles) {
      recommendations.push({
        type: 'warning',
        title: 'Limited Test Files',
        message: 'No test files detected in recent changes.',
        action: 'Ensure adequate test coverage for new and modified code.'
      })
    }

    // Complex files
    if (complexFiles.length > 0 && complexFiles[0].complexity > 5) {
      recommendations.push({
        type: 'info',
        title: 'Complex Files Detected',
        message: `${complexFiles[0].filename} shows high complexity metrics.`,
        action: 'Consider breaking down complex files into smaller, more focused modules.'
      })
    }

    return recommendations
  }

  const churnChartData = {
    labels: codeData.patterns.codeChurn?.map((_, i) => `Commit ${i + 1}`) || [],
    datasets: [
      {
        label: 'Additions',
        data: codeData.patterns.codeChurn?.map(c => c.additions) || [],
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true
      },
      {
        label: 'Deletions',
        data: codeData.patterns.codeChurn?.map(c => c.deletions) || [],
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true
      }
    ]
  }

  const fileTypeChartData = {
    labels: codeData.patterns.fileTypes?.map(([type]) => type) || [],
    datasets: [{
      label: 'Files Modified',
      data: codeData.patterns.fileTypes?.map(([, stats]) => stats.count) || [],
      backgroundColor: [
        '#2DD4BF', '#3B82F6', '#8B5CF6', '#F59E0B', 
        '#EF4444', '#10B981', '#F97316', '#6B7280'
      ],
      borderWidth: 2,
      borderColor: '#374151'
    }]
  }

  const languageChartData = {
    labels: Object.keys(codeData.languages || {}),
    datasets: [{
      data: Object.values(codeData.languages || {}),
      backgroundColor: [
        '#F7DF1E', '#3178C6', '#E34F26', '#1572B6', 
        '#339933', '#CC6699', '#FF6B6B', '#4ECDC4'
      ],
      borderWidth: 2,
      borderColor: '#374151'
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
          <h1 className="text-2xl font-bold text-white">Code Analysis</h1>
          <p className="text-gray-400">Code quality metrics and architectural insights</p>
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
              <div className="text-3xl font-bold text-green-400">+{codeData.stats.totalAdditions}</div>
              <div className="text-gray-400 text-sm">Lines Added</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-red-400">-{codeData.stats.totalDeletions}</div>
              <div className="text-gray-400 text-sm">Lines Deleted</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-blue-400">{codeData.stats.refactorRate}%</div>
              <div className="text-gray-400 text-sm">Refactor Rate</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-purple-400">{codeData.stats.churnRate}%</div>
              <div className="text-gray-400 text-sm">Code Churn</div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Code Churn Over Time</h3>
              <div className="h-64">
                <Line data={churnChartData} options={chartOptions} />
              </div>
            </div>
            
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">File Types Modified</h3>
              <div className="h-64">
                <Bar data={fileTypeChartData} options={chartOptions} />
              </div>
            </div>
            
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Language Distribution</h3>
              <div className="h-64">
                <Doughnut data={languageChartData} options={{ responsive: true, plugins: { legend: { labels: { color: '#ffffff' } } } }} />
              </div>
            </div>
            
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Frequently Changed Files</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {codeData.patterns.topChangedFiles?.slice(0, 8).map(([filename, stats], index) => (
                  <div key={filename} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-mono text-sm truncate" title={filename}>
                        {filename}
                      </div>
                      <div className="text-xs text-gray-400">
                        +{stats.additions} -{stats.deletions}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-teal-400 font-bold">{stats.changes}</div>
                      <div className="text-xs text-gray-400">changes</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Code Quality Metrics */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Code Quality Metrics</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Average Files per Commit</span>
                  <span className="text-white font-bold">{codeData.stats.avgFilesPerCommit}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Total Files Modified</span>
                  <span className="text-white font-bold">{codeData.stats.totalFiles}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Change/Add Ratio</span>
                  <span className="text-white font-bold">
                    {codeData.stats.totalAdditions > 0 ? 
                      Math.round((codeData.stats.totalDeletions / codeData.stats.totalAdditions) * 100) / 100 : 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Commits Analyzed</span>
                  <span className="text-white font-bold">{codeData.stats.totalCommits}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">File Complexity</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {codeData.patterns.complexFiles?.slice(0, 6).map((file, index) => (
                  <div key={file.filename} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-mono text-sm truncate" title={file.filename}>
                        {file.filename}
                      </div>
                      <div className="text-xs text-gray-400">
                        {file.changes} changes
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className={`font-bold ${
                        file.complexity > 7 ? 'text-red-400' :
                        file.complexity > 4 ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {file.complexity}
                      </div>
                      <div className="text-xs text-gray-400">complexity</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {codeData.recommendations.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Code Quality Recommendations</h3>
              <div className="space-y-4">
                {codeData.recommendations.map((rec, index) => (
                  <div key={index} className={`p-4 rounded-lg border-l-4 ${
                    rec.type === 'warning' ? 'bg-yellow-900/20 border-yellow-400' : 'bg-blue-900/20 border-blue-400'
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