# DevOrbit - Technical Architecture

## Project Overview

DevOrbit is a React-based GitHub analytics dashboard designed to help engineering managers analyze team performance, collaboration patterns, and code quality metrics. The application integrates with the GitHub REST API to provide actionable insights for software engineering teams.

## Architecture

### Frontend Architecture
- **Framework**: React 18 with functional components and hooks
- **Build Tool**: Vite for fast development and optimized production builds
- **Styling**: Tailwind CSS with custom dark theme and teal accent colors (#2DD4BF)
- **State Management**: React Context API for authentication state
- **Data Persistence**: LocalStorage for caching API responses and user preferences

### Component Structure

#### Core Components
- `App.jsx`: Main application wrapper with routing and global state
- `Header.jsx`: Top navigation with authentication controls
- `Sidebar.jsx`: Repository selection and improvement tips
- `Dashboard.jsx`: Main content area with analytics components

#### Analytics Components
- `SummaryCards.jsx`: KPI overview cards (commits, response times, active days)
- `CommitChart.jsx`: Time-series visualization of commit activity using Chart.js
- `CommentAnalysis.jsx`: Sortable table of PR comments with response time analysis
- `TeamCompatibility.jsx`: Collaboration metrics and team interaction patterns

#### Hooks
- `useAuth.jsx`: Authentication context provider with GitHub OAuth flow

### Data Flow

1. **Authentication**: User logs in via GitHub OAuth or Personal Access Token
2. **Repository Selection**: Fetch user repositories via GitHub API, cache in LocalStorage
3. **Data Fetching**: Selected repository triggers API calls for:
   - Commit history (`/repos/{owner}/{repo}/commits`)
   - Pull requests (`/repos/{owner}/{repo}/pulls`)
   - PR comments (`/repos/{owner}/{repo}/issues/{number}/comments`)
   - PR reviews (`/repos/{owner}/{repo}/pulls/{number}/reviews`)
4. **Data Processing**: Transform API responses into chart-ready formats
5. **Visualization**: Render charts and tables with processed data
6. **Caching**: Store processed data in LocalStorage to reduce API calls

### API Integration

#### GitHub REST API Endpoints
- **Authentication**: `/user` - Validate token and fetch user profile
- **Repositories**: `/user/repos` - List user's accessible repositories
- **Commits**: `/repos/{owner}/{repo}/commits` - Fetch commit history with date filtering
- **Pull Requests**: `/repos/{owner}/{repo}/pulls` - List PRs with state filtering
- **Comments**: `/repos/{owner}/{repo}/issues/{number}/comments` - PR discussion comments
- **Reviews**: `/repos/{owner}/{repo}/pulls/{number}/reviews` - PR code reviews

#### Rate Limiting Strategy
- Cache API responses in LocalStorage with timestamp-based expiration
- Batch requests where possible to minimize API calls
- Implement exponential backoff for rate limit errors
- Display user-friendly error messages for quota exceeded scenarios

### Performance Metrics

#### Commit Analysis
- **Commits per day**: Time-series data with configurable date ranges (7/30/90 days)
- **Average commits per active day**: Excludes zero-commit days to avoid skewing metrics
- **Active days**: Count of days with at least one commit

#### Comment Response Analysis
- **Response time calculation**: Time difference between PR creation and first comment
- **Comment quality metrics**: Character count, sentiment analysis (planned)
- **Reviewer engagement**: Frequency and depth of review comments

#### Team Compatibility
- **Collaboration frequency**: Number of PRs reviewed between team members
- **Response time patterns**: Median time to review requests
- **Cross-team interaction**: Knowledge sharing through code reviews
- **Compatibility scoring**: Algorithm based on review frequency and response times

### Security Considerations

#### Token Management
- Personal Access Tokens stored in LocalStorage (consider upgrading to secure storage)
- Tokens transmitted via HTTPS only
- Minimal scope requests (`repo` and `user` only)
- No server-side token storage (client-side only application)

#### Data Privacy
- No sensitive data logging or external transmission
- User data cached locally only
- Repository data access limited to user's authorized repositories

### Development Workflow

#### Code Quality
- **ESLint**: Airbnb configuration with React and accessibility rules
- **Prettier**: Consistent code formatting
- **Jest**: Unit testing for components and utility functions
- **Git Hooks**: Pre-commit linting and formatting (planned)

#### Build and Deployment
- **Development**: `npm run dev` - Vite dev server with hot reload
- **Production**: `npm run build` - Optimized bundle with tree shaking
- **Testing**: `npm test` - Jest test runner with coverage reporting
- **Linting**: `npm run lint` - ESLint with error reporting

### Future Enhancements

#### Export and Reporting
- **CSV Export**: Raw data export for external analysis
- **PDF Reports**: Formatted reports with charts and recommendations using jsPDF
- **Scheduled Reports**: Email delivery of weekly/monthly summaries (planned)

#### Advanced Analytics
- **Predictive Metrics**: Machine learning models for performance trends
- **Custom Dashboards**: User-configurable metrics and visualizations
- **Real-time Updates**: WebSocket integration for live data updates
- **Multi-repository Analysis**: Cross-repository team performance tracking

#### Integration Enhancements
- **GitLab Support**: Extend API integration to GitLab repositories
- **Slack Integration**: Performance notifications and summaries
- **JIRA Integration**: Link code metrics with issue tracking
- **CI/CD Metrics**: Integration with build and deployment pipelines

## Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Quality Assurance
npm run lint         # Run ESLint
npm run test         # Run Jest tests
npm run test:coverage # Run tests with coverage report

# Utility
npm run format       # Format code with Prettier (planned)
npm audit            # Check for security vulnerabilities
```

## Environment Variables

```bash
# GitHub OAuth (for production deployment)
VITE_GITHUB_CLIENT_ID=your_github_client_id
VITE_GITHUB_CLIENT_SECRET=your_github_client_secret

# API Configuration
VITE_API_BASE_URL=https://api.github.com
VITE_RATE_LIMIT_REQUESTS=5000
```

## Performance Targets

- **Bundle Size**: < 500KB gzipped
- **First Contentful Paint**: < 2 seconds
- **Time to Interactive**: < 3 seconds
- **GitHub API Response Time**: < 1 second average
- **Chart Rendering**: < 500ms for datasets up to 1000 points

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Mobile responsive design optimized for tablets and desktop viewing.