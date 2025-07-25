# DevOrbit - GitHub Analytics Dashboard

A React-based web application for analyzing software engineers' performance and team compatibility using GitHub data. Provides insights into commits, pull request comments, and improvement analytics for engineering managers.

## Features

- **GitHub Authentication**: OAuth login with GitHub for secure API access
- **Repository Selection**: Browse and select repositories with caching
- **Performance Analytics**:
  - Commits per day visualization with configurable time ranges
  - Comment response time analysis
  - Team compatibility and collaboration metrics
  - Summary cards with key performance indicators
- **Improvement Recommendations**: Actionable best practices based on industry standards
- **Dark Theme UI**: Clean, responsive design with teal accent colors
- **Export Capabilities**: CSV export and PDF reporting (planned)

## Tech Stack

- **Frontend**: React 18 with Vite
- **Styling**: Tailwind CSS with custom dark theme
- **Charts**: Chart.js with react-chartjs-2
- **GitHub API**: @octokit/core for API interactions
- **State Management**: React Context for authentication
- **Storage**: LocalStorage for caching and user preferences
- **Development**: ESLint (Airbnb), Prettier, Jest

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- GitHub account with repositories to analyze

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd devorbit
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up GitHub OAuth (for production):
   - Go to GitHub Settings > Developer settings > OAuth Apps
   - Create a new OAuth App with callback URL: `http://localhost:3000/auth/callback`
   - Add your Client ID to environment variables

4. For development, you can use a Personal Access Token:
   - Go to GitHub Settings > Developer settings > Personal access tokens
   - Generate a token with `repo` and `user` scopes
   - The app will prompt for this token on login

### Running the Application

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Lint code
npm run lint
```

## Usage

1. **Login**: Click "Login with GitHub" and enter your Personal Access Token when prompted
2. **Select Repository**: Choose a repository from the dropdown in the sidebar
3. **Analyze Data**: View commit trends, comment analysis, and team compatibility metrics
4. **Review Recommendations**: Check the best practices sidebar for improvement suggestions

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Header.jsx      # Top navigation with auth
│   ├── Sidebar.jsx     # Repository selection & tips
│   ├── CommitChart.jsx # Commit activity visualization
│   ├── CommentAnalysis.jsx # PR comment analysis table
│   ├── TeamCompatibility.jsx # Collaboration metrics
│   └── SummaryCards.jsx # KPI summary cards
├── pages/              # Main application pages
│   └── Dashboard.jsx   # Primary dashboard view
├── hooks/              # Custom React hooks
│   └── useAuth.jsx     # Authentication context
├── utils/              # Utility functions (planned)
├── App.jsx            # Main application component
└── main.jsx           # Application entry point
```

## API Rate Limits

The GitHub API has rate limits (5,000 requests/hour for authenticated users). The application implements:
- Response caching in LocalStorage
- Limited concurrent requests
- Error handling for rate limit exceeded

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## Security Notes

- Never commit personal access tokens or client secrets
- Tokens are stored securely in LocalStorage (consider more secure alternatives for production)
- The app only requests necessary GitHub scopes (`repo` and `user`)

## Roadmap

- [ ] Export functionality (CSV/PDF)
- [ ] Advanced filtering and search
- [ ] Team member comparison views
- [ ] Integration with additional Git platforms
- [ ] Real-time notifications
- [ ] Custom metrics and dashboards

## License

MIT License - see LICENSE file for details