import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api/linear': {
        target: 'https://api.linear.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/linear/, ''),
        headers: {
          'User-Agent': 'DevOrbit/1.0'
        }
      },
      '/api/jira': {
        target: 'https://guitartabcreator.atlassian.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/jira/, '/rest/api/3'),
        headers: {
          'User-Agent': 'DevOrbit/1.0'
        }
      }
    }
  }
})