# GitHub Integration Setup Guide

This guide will help you integrate GitHub OAuth + GitHub App + Repo Workspace into your Vibe Coder application.

## Prerequisites

- A GitHub account
- Node.js installed
- Your Vibe Coder app running locally

## Step 1: Install Dependencies

```bash
cd frontend
npm install @octokit/rest @octokit/auth-app iron-session
```

## Step 2: Create GitHub OAuth App

1. Go to [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in the details:
   - **Application name**: `Vibe Coder` (or your preferred name)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/github/oauth/callback`
4. Click **Register application**
5. Copy the **Client ID**
6. Click **Generate a new client secret** and copy it

## Step 3: Create GitHub App

1. Go to [GitHub Settings > Developer settings > GitHub Apps](https://github.com/settings/apps)
2. Click **New GitHub App**
3. Fill in the details:
   - **GitHub App name**: `Vibe Coder App` (must be globally unique)
   - **Homepage URL**: `http://localhost:3000`
   - **Webhook URL**: `http://localhost:3000/api/github/webhook` (or use ngrok for local testing)
   - **Webhook secret**: Generate a random secret (e.g., `openssl rand -hex 32`)

4. **Permissions** (Repository permissions):
   - Contents: **Read and write**
   - Pull requests: **Read and write**
   - Metadata: **Read-only**
   - Issues: **Read and write** (optional)
   - Checks: **Read and write** (optional)

5. **Subscribe to events**:
   - [x] Push
   - [x] Pull request
   - [x] Issue comment
   - [x] Pull request review comment
   - [x] Check suite
   - [x] Check run

6. **Where can this GitHub App be installed?**
   - Select "Only on this account" for testing

7. Click **Create GitHub App**

8. **Generate a private key**:
   - Scroll down to "Private keys"
   - Click **Generate a private key**
   - Save the downloaded `.pem` file

9. Copy the **App ID** from the top of the page

## Step 4: Configure Environment Variables

Create a `.env.local` file in the `frontend` directory:

```bash
# GitHub OAuth App (for user identity)
GITHUB_CLIENT_ID=your_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_oauth_app_client_secret

# GitHub App (for repository access)
GITHUB_APP_ID=your_github_app_id
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
Your private key contents here (from the .pem file)
-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Session (generate with: openssl rand -hex 32)
SESSION_SECRET=your_random_32_char_secret_here

# Next.js
NEXT_PUBLIC_API_URL=http://localhost:3000

# Optional GitHub defaults
GITHUB_OWNER=
GITHUB_BASE_BRANCH=main
```

**Important**: Replace the placeholder values with your actual credentials.

### Reading the Private Key

Open the `.pem` file you downloaded and copy its entire contents, including the `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----` lines.

## Step 5: Install the GitHub App

1. Go to your GitHub App page: `https://github.com/apps/your-app-name`
2. Click **Install**
3. Select the account/organization where you want to install it
4. Choose **All repositories** or **Only select repositories**
5. Click **Install**

## Step 6: Set Up Webhooks (for local development)

For local development, you'll need to expose your local server to the internet so GitHub can send webhooks.

### Option 1: Using ngrok

```bash
# Install ngrok
brew install ngrok  # macOS
# or download from https://ngrok.com/download

# Start ngrok
ngrok http 3000
```

Copy the `https://` URL (e.g., `https://abc123.ngrok.io`) and:
1. Go to your GitHub App settings
2. Update the **Webhook URL** to `https://abc123.ngrok.io/api/github/webhook`
3. Click **Save changes**

### Option 2: Using Cloudflare Tunnel

```bash
# Install cloudflared
brew install cloudflared  # macOS

# Start tunnel
cloudflared tunnel --url http://localhost:3000
```

## Step 7: Start the Application

```bash
# From the project root
npm run dev

# Or from frontend directory
cd frontend
npm run dev
```

## Step 8: Test the Integration

1. **Connect GitHub**:
   - Open `http://localhost:3000`
   - Click **Connect GitHub** in the header
   - Authorize the OAuth app
   - You should be redirected back to the app

2. **Select a Repository**:
   - After connecting, use the repo picker to select a repository
   - The workspace will open with the selected repo

3. **Test Workspace Operations**:
   - Files are loaded from the repo
   - You can create branches, commit changes, and open PRs

4. **Test Webhooks**:
   - Make a change in your GitHub repository (push, open PR, comment)
   - Watch the Atlas CLI for webhook events
   - Events should appear in real-time

## Usage

### Connect GitHub
- Click **Connect GitHub** in the header
- Sign in with your GitHub account
- Grant access to the OAuth app

### Select Repository
- After connecting, the installation picker will appear (if you have multiple)
- Select the installation
- Choose a repository from the dropdown
- The workspace will open

### Workspace Features

#### File Explorer
- Browse files in your repository
- Click files to open in the editor

#### Atlas CLI Integration
- Webhook events stream into the CLI
- Push, PR, and comment events appear in real-time
- Events show with appropriate icons and details

#### Create Branch
```bash
# Via API
POST /api/github/branch
{
  "owner": "username",
  "repo": "repo-name",
  "base": "main",
  "feature": "feature-branch-name",
  "installation_id": 12345
}
```

#### Commit Changes
```bash
# Via API
PUT /api/github/commit
{
  "owner": "username",
  "repo": "repo-name",
  "branch": "feature-branch",
  "path": "src/file.ts",
  "content": "file contents here",
  "message": "Update file",
  "installation_id": 12345
}
```

#### Open Pull Request
```bash
# Via API
POST /api/github/pr
{
  "owner": "username",
  "repo": "repo-name",
  "title": "My Feature",
  "head": "feature-branch",
  "base": "main",
  "body": "Description",
  "installation_id": 12345
}
```

#### Post Review Comment
```bash
# Via API
POST /api/github/comments
{
  "owner": "username",
  "repo": "repo-name",
  "pr_number": 123,
  "body": "Comment text",
  "path": "src/file.ts",
  "line": 10,
  "side": "RIGHT",
  "commit_id": "abc123...",
  "installation_id": 12345
}
```

## API Routes

### OAuth
- `GET /api/github/oauth/login` - Redirect to GitHub OAuth
- `GET /api/github/oauth/callback` - OAuth callback handler
- `POST /api/github/oauth/logout` - Logout user
- `GET /api/github/user` - Get current user

### Installations & Repos
- `GET /api/github/installations` - List user's GitHub App installations
- `GET /api/github/repos?installation_id=XXX` - List repos for installation

### Workspace Operations
- `GET /api/github/tree?owner=X&repo=Y&branch=Z&installation_id=XXX` - Get file tree
- `GET /api/github/compare?owner=X&repo=Y&base=Z&head=W&installation_id=XXX` - Compare branches
- `POST /api/github/branch` - Create new branch
- `PUT /api/github/commit` - Create/update file
- `POST /api/github/pr` - Create pull request
- `GET /api/github/pr?owner=X&repo=Y&installation_id=XXX` - List pull requests
- `POST /api/github/comments` - Create comment (issue or review)
- `GET /api/github/comments?owner=X&repo=Y&pr_number=Z&installation_id=XXX` - List comments

### Webhooks
- `POST /api/github/webhook` - Receive webhook events
- `GET /api/github/webhook?limit=20&type=push` - Get recent webhook events

## Troubleshooting

### "Invalid signature" error on webhooks
- Verify your `GITHUB_WEBHOOK_SECRET` matches the one in your GitHub App settings
- Make sure you're using the raw request body for signature verification

### "Unauthorized" errors
- Check that your OAuth credentials are correct
- Ensure the session secret is set
- Clear your browser cookies and try logging in again

### Private key errors
- Ensure the private key includes the BEGIN and END lines
- Check that there are no extra spaces or newlines
- Try wrapping the key in double quotes in `.env.local`

### Webhooks not received
- Verify ngrok or tunnel is running
- Check the webhook URL in GitHub App settings
- Look at Recent Deliveries in GitHub App settings to see errors

### Installation not found
- Make sure you've installed the GitHub App on your account/org
- Verify the installation has access to the repositories you want to use

## Security Notes

- **Never commit** `.env.local` or private keys to version control
- Use environment variables for all secrets
- Session cookies are HTTP-only and secure in production
- OAuth uses state parameter for CSRF protection
- Webhook signatures are verified before processing
- Installation tokens are used (not personal access tokens)

## Production Deployment

1. Update OAuth App callback URL to your production domain
2. Update GitHub App webhook URL to your production domain
3. Set `NODE_ENV=production` in your environment
4. Ensure all environment variables are set in your hosting platform
5. Enable HTTPS (required for GitHub webhooks)

## Support

For issues or questions:
- Check the [GitHub API documentation](https://docs.github.com/en/rest)
- Review [Octokit documentation](https://github.com/octokit/rest.js)
- Open an issue in the repository
