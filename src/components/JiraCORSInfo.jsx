export default function JiraCORSInfo() {
  return (
    <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4 mb-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-400 mb-2">
            CORS Configuration Required for JIRA
          </h3>
          <div className="text-sm text-yellow-200 space-y-2">
            <p>
              JIRA APIs are blocked by browser CORS policy. To use JIRA integration in development:
            </p>
            <div className="pl-4">
              <p className="font-medium">Option 1: Browser Extension (Recommended)</p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-xs">
                <li>Install &quot;CORS Unblock&quot; or similar extension</li>
                <li>Enable it for localhost:3000</li>
                <li>Refresh the page and try connecting again</li>
              </ul>
            </div>
            <div className="pl-4 mt-3">
              <p className="font-medium">Option 2: Chrome with Disabled Security</p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-xs">
                <li>Close all Chrome instances</li>
                <li>Launch: <code className="bg-yellow-800 px-1 rounded">chrome --disable-web-security --user-data-dir=/tmp/chrome_dev</code></li>
                <li>Navigate to localhost:3000</li>
              </ul>
            </div>
            <p className="text-xs mt-3 text-yellow-300">
              <strong>Note:</strong> In production, JIRA integration would use server-side proxy to avoid CORS issues.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}