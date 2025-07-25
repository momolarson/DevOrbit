# DevOrbit - Because Managers Love Data, Right?

*The ultimate "help-yourself" GitHub analytics dashboard for engineers who want to vibe their way to peak performance while accidentally making their managers' jobs obsolete through sheer data-driven excellence.*

## What's This About?

Why wait for managers to ask about productivity when you can eliminate the middleman entirely? DevOrbit transforms your GitHub activity into actionable data that helps you prioritize work, optimize workflows, and make engineering decisions without needing someone else to tell you what's important. Because the best manager is no manager at all.

This React-based dashboard analyzes your commits, PRs, and code reviews to help you:
- **Optimize your workflow** (so you can work smarter, not harder)
- **Identify bottlenecks** (spoiler: it's usually meetings)
- **Track team compatibility** (find out who actually reviews your code vs. who just approves it)
- **Generate actionable insights** (that you'll actually use, unlike most performance reviews)

## Features That Actually Matter

- **📊 Commit Analytics**: Visualize your productivity patterns and prove you're not just pushing whitespace changes
- **💬 PR Comment Analysis**: Track response times and see who's really engaging with your code (hint: it's probably not management)
- **🤝 Team Compatibility Metrics**: Discover your real code review allies and collaboration patterns
- **📈 Code Churn Analysis**: Identify which developers are actually refactoring vs. just thrashing code
- **📋 Smart Recommendations**: Get data-backed suggestions for improvement (because you asked for feedback, not feelings)
- **🌙 Dark Theme**: Because your eyes matter more than your manager's preference for "clean white interfaces"
- **📄 Export Everything**: CSV and PDF reports for when you need to justify your existence to higher-ups

## The Stack (For Fellow Engineers)

- **React 18** + **Vite** (fast builds, faster deploys)
- **Tailwind CSS** (utility-first, manager-friendly-second)
- **Chart.js** (pretty graphs that speak louder than words)
- **GitHub API** (the source of truth your standup updates wish they were)
- **LocalStorage** (because not everything needs a database)

## Getting Started (It's Actually Easy)

### Prerequisites
- Node.js 18+ (you're already using it, right?)
- A GitHub account with actual repositories (not just tutorial repos)
- The desire to let data do the talking

### Installation

```bash
# Clone this beautiful chaos
git clone <repository-url>
cd devorbit

# Install the good stuff
npm install

# Fire it up
npm run dev
```

### Authentication Setup

**Option 1: Personal Access Token (Recommended for Developers)**
1. GitHub Settings → Developer settings → Personal access tokens
2. Generate token with `repo` and `user` scopes
3. Paste it when DevOrbit asks (it will ask nicely)

**Option 2: OAuth (For When You Want to Impress People)**
1. Create GitHub OAuth App
2. Set callback URL: `http://localhost:3000/auth/callback`
3. Add Client ID to environment variables
4. Feel slightly more professional

## How to Use This Power

1. **Login** with your GitHub credentials
2. **Select a repository** (pick one you actually work on)
3. **Watch the magic happen** as your GitHub activity transforms into meaningful insights
4. **Use the data** to optimize your workflow, identify improvement areas, and prove your worth
5. **Optional**: Share these insights in your next performance review and watch managers struggle to find fault with objective data

## Project Structure (For the Curious)

```
src/
├── components/          # UI components that actually work
│   ├── dashboards/     # Specialized analytics views
│   ├── CommitChart.jsx # Your productivity, visualized
│   ├── CommentAnalysis.jsx # PR engagement metrics
│   └── TeamCompatibility.jsx # Who really has your back
├── pages/              # Main application views
├── hooks/              # Custom React hooks (useAuth, etc.)
└── utils/              # Helper functions (coming soon™)
```

## API Considerations (The Fine Print)

GitHub gives you 5,000 API requests per hour. DevOrbit caches responses locally because:
- We respect rate limits (unlike some managers respect your time)
- Performance matters
- Your data stays on your machine

## The Roadmap (What's Coming Next)

- [ ] **Advanced Filtering**: Drill down into specific time periods, file types, and team members
- [ ] **Predictive Analytics**: Machine learning models to predict productivity trends
- [ ] **Integration APIs**: Connect with Slack, Jira, and other tools you actually use
- [ ] **Team Dashboards**: Aggregate views for technical leads who want to support (not micromanage) their teams
- [ ] **Custom Metrics**: Define your own KPIs that actually matter to engineering work

## Contributing (Join the Revolution)

Found a bug? Want to add a feature? PRs welcome! This project is built by engineers, for engineers.

1. Fork it
2. Branch it (`git checkout -b feature/awesome-addition`)
3. Commit it (`git commit -m 'Add awesome feature'`)
4. Push it (`git push origin feature/awesome-addition`)
5. PR it

## Security & Privacy

- Your GitHub token stays local (we're not interested in your repos)
- All data processing happens in your browser
- No tracking, no analytics, no BS
- Open source because transparency matters

## License

MIT License - Because good tools should be free for everyone.

---

*DevOrbit: Helping engineers prove their worth, one commit at a time. 🚀*

**Disclaimer**: This tool may cause spontaneous increases in productivity, clearer communication with stakeholders, and accidentally making middle management nervous. Use responsibly.