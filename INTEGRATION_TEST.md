# Multi-Provider Integration Test Guide

## Overview
DevOrbit now supports both GitHub and Bitbucket providers through a unified abstraction layer.

## What Was Implemented

### 1. Provider Abstraction Layer (`src/services/gitProviders.js`)
- Unified API interface for both GitHub and Bitbucket
- Provider-specific implementations for:
  - User authentication and profile fetching
  - Repository listing
  - Commit history retrieval
  - Pull request management
  - PR comment analysis

### 2. Updated Authentication System (`src/hooks/useAuth.jsx`)
- Multi-provider support with provider selection
- Provider-specific token storage
- Unified user experience across providers

### 3. Updated UI Components
- **Header**: Provider selection dropdown and dynamic login buttons
- **Sidebar**: Provider-agnostic repository listing
- **Dashboard Components**: Updated to use provider abstraction
- **Charts**: Compatible with both GitHub and Bitbucket data formats

## Testing Instructions

### Testing GitHub Integration (Existing)
1. Open the application
2. Ensure "GitHub" is selected in the provider dropdown
3. Click "Login with GitHub"
4. Enter your GitHub Personal Access Token
5. Select a repository and verify data loads correctly

### Testing Bitbucket Integration (New)
1. Open the application
2. Select "Bitbucket" from the provider dropdown
3. Click "Login with Bitbucket"
4. When prompted, enter your Bitbucket username (not email)
5. Enter your Bitbucket App Password with these permissions:
   - Repositories: Read
   - Account: Read
   - Pull requests: Read
6. Select a repository and verify data loads

**Note**: Bitbucket uses Basic Authentication with username + app password, not Bearer tokens like GitHub.

### Expected Behaviors
- Provider selection persists between sessions
- Repository data formats are normalized across providers
- Charts and analytics work with both provider types
- **State Management**: When switching providers, the application:
  - Clears the selected repository
  - Resets all dashboard data to prevent showing stale information
  - Only loads new data after a repository is selected
- User can switch between providers by logging out and selecting different provider
- Appropriate "No Repository Selected" messages are shown when needed

## API Differences Handled

### GitHub vs Bitbucket
- **Authentication**: GitHub uses Bearer tokens, Bitbucket uses App Passwords
- **Repository Structure**: Different field names normalized to common format
- **Commit Data**: Different API response formats unified
- **Pull Requests**: Bitbucket uses different state names and ID systems
- **User Profile**: Different field structures normalized

## Known Limitations
1. Bitbucket commit stats require separate API calls (not implemented yet)
2. Some advanced GitHub-specific features may not have Bitbucket equivalents
3. Rate limiting strategies may differ between providers

## Future Enhancements
1. Add GitLab support
2. Implement commit statistics for Bitbucket
3. Add provider-specific optimizations
4. Enhanced error handling for provider-specific issues