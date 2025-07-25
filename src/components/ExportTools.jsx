import { useState } from 'react'
import { toast } from 'react-toastify'
import jsPDF from 'jspdf'

export default function ExportTools({ repository, data }) {
  const [exporting, setExporting] = useState(false)

  const exportToCSV = (dataType) => {
    setExporting(true)
    
    try {
      let csvContent = ''
      let filename = ''

      switch (dataType) {
        case 'commits':
          csvContent = generateCommitsCSV(data.commits || [])
          filename = `${repository.name}-commits-${new Date().toISOString().split('T')[0]}.csv`
          break
        case 'comments':
          csvContent = generateCommentsCSV(data.comments || [])
          filename = `${repository.name}-comments-${new Date().toISOString().split('T')[0]}.csv`
          break
        case 'compatibility':
          csvContent = generateCompatibilityCSV(data.collaborations || [])
          filename = `${repository.name}-team-compatibility-${new Date().toISOString().split('T')[0]}.csv`
          break
        default:
          throw new Error('Unknown data type')
      }

      // Create and download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', filename)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }

      toast.success(`${dataType} data exported successfully`)
    } catch (error) {
      toast.error(`Failed to export ${dataType} data`)
      console.error('Export error:', error)
    } finally {
      setExporting(false)
    }
  }

  const generateCommitsCSV = (commits) => {
    const headers = ['Date', 'Author', 'Message', 'SHA', 'Files Changed', 'Additions', 'Deletions']
    const rows = commits.map(commit => [
      new Date(commit.commit.author.date).toISOString().split('T')[0],
      commit.commit.author.name,
      `"${commit.commit.message.replace(/"/g, '""')}"`,
      commit.sha.substring(0, 7),
      commit.files?.length || 0,
      commit.stats?.additions || 0,
      commit.stats?.deletions || 0
    ])

    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  const generateCommentsCSV = (comments) => {
    const headers = ['PR Number', 'PR Title', 'Author', 'Comment', 'Created Date', 'Response Time (hours)', 'Character Count']
    const rows = comments.map(comment => [
      comment.prNumber,
      `"${comment.prTitle.replace(/"/g, '""')}"`,
      comment.author,
      `"${comment.body.replace(/"/g, '""').substring(0, 500)}"`,
      new Date(comment.created_at).toISOString().split('T')[0],
      comment.responseTime,
      comment.body.length
    ])

    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  const generateCompatibilityCSV = (collaborations) => {
    const headers = ['Author', 'Reviewer', 'PRs Reviewed', 'Compatibility Score', 'Avg Response Time']
    const rows = collaborations.map(collab => [
      collab.author,
      collab.reviewer,
      collab.prsReviewed,
      Math.min(100, collab.prsReviewed * 20),
      collab.avgResponseTime || '< 24h'
    ])

    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  const exportToPDF = async () => {
    setExporting(true)
    
    try {
      const pdf = new jsPDF()
      const pageWidth = pdf.internal.pageSize.getWidth()
      let yPosition = 20

      // Title
      pdf.setFontSize(20)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`GitPrime Analytics Report`, pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 10

      // Repository info
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Repository: ${repository.name}`, pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 5
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 20

      // Summary metrics
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Summary Metrics', 20, yPosition)
      yPosition += 10

      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      
      const metrics = [
        `Total Commits (30 days): ${data.metrics?.totalCommits || 'N/A'}`,
        `Average Commits per Day: ${data.metrics?.avgCommitsPerDay || 'N/A'}`,
        `Active Days: ${data.metrics?.activeDays || 'N/A'}`,
        `Median Response Time: ${data.metrics?.medianResponseTime || 'N/A'}h`
      ]

      metrics.forEach(metric => {
        pdf.text(metric, 30, yPosition)
        yPosition += 8
      })

      yPosition += 10

      // Best practices
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Recommended Best Practices', 20, yPosition)
      yPosition += 10

      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      
      const recommendations = [
        'Commits: Keep commits small and focused (<85 lines changed)',
        'Comments: Respond to PR comments within 24 hours',
        'Code: Maintain refactor rates below 11% per release',
        'Team: Encourage cross-team reviews for knowledge sharing'
      ]

      recommendations.forEach(rec => {
        const lines = pdf.splitTextToSize(rec, pageWidth - 50)
        lines.forEach(line => {
          pdf.text(line, 30, yPosition)
          yPosition += 6
        })
        yPosition += 2
      })

      // Footer
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'italic')
      pdf.text('Generated by GitPrime - GitHub Analytics Dashboard', pageWidth / 2, pdf.internal.pageSize.getHeight() - 10, { align: 'center' })

      // Save PDF
      const filename = `${repository.name}-analytics-report-${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(filename)

      toast.success('PDF report exported successfully')
    } catch (error) {
      toast.error('Failed to export PDF report')
      console.error('PDF export error:', error)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-white mb-6">Export & Reporting</h3>
      
      <div className="space-y-4">
        {/* CSV Exports */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">CSV Data Export</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => exportToCSV('commits')}
              disabled={exporting}
              className="btn-secondary text-sm flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Commits</span>
            </button>
            
            <button
              onClick={() => exportToCSV('comments')}
              disabled={exporting}
              className="btn-secondary text-sm flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Comments</span>
            </button>
            
            <button
              onClick={() => exportToCSV('compatibility')}
              disabled={exporting}
              className="btn-secondary text-sm flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Team Data</span>
            </button>
          </div>
        </div>

        {/* PDF Report */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">PDF Report</h4>
          <button
            onClick={exportToPDF}
            disabled={exporting}
            className="btn-primary flex items-center space-x-2"
          >
            {exporting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            <span>Generate Analytics Report</span>
          </button>
        </div>

        {/* Export Info */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-teal-400 mb-2">Export Information</h4>
          <ul className="text-xs text-gray-300 space-y-1">
            <li>• CSV files contain raw data for external analysis</li>
            <li>• PDF reports include summary metrics and recommendations</li>
            <li>• All exports are generated locally (no server upload)</li>
            <li>• File names include repository name and current date</li>
          </ul>
        </div>
      </div>
    </div>
  )
}