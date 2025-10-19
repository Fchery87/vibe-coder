# GitHub Production Setup - Ready to Enable

**Status:** GitHub integration code is ready, just needs production URLs configured

---

## ✅ What's Already Done

- GitHub OAuth flow implemented
- GitHub App integration ready
- API routes for repos, branches, commits, PRs
- Frontend components ready (disabled in settings)
- Webhook handlers implemented

---

## 🚀 Complete Setup Now (10 Minutes)

### Step 1: Update GitHub OAuth App URLs

1. Go to [GitHub Settings > OAuth Apps](https://github.com/settings/developers)
2. Find your "Vibe Coder" OAuth App
3. **Update these URLs:**
   - **Homepage URL:** `https://your-frontend.vercel.app`
   - **Authorization callback URL:** `https://your-frontend.vercel.app/api/github/oauth/callback`
4. Click **Update application**

---

### Step 2: Update GitHub App URLs

1. Go to [GitHub Settings > GitHub Apps](https://github.com/settings/apps)
2. Find your "Vibe Coder App"
3. **Update these URLs:**
   - **Homepage URL:** `https://your-frontend.vercel.app`
   - **Webhook URL:** `https://your-frontend.vercel.app/api/github/webhook`
   - **Callback URL:** `https://your-frontend.vercel.app`
4. Click **Save changes**

---

### Step 3: Add Environment Variables to Vercel

Go to [Vercel Dashboard](https://vercel.com/dashboard) → Your Project → Settings → Environment Variables

**Add these variables:**

```bash
# GitHub OAuth (from your OAuth App)
GITHUB_CLIENT_ID=Ov23li...  # Your existing OAuth client ID
GITHUB_CLIENT_SECRET=...     # Your existing OAuth client secret

# GitHub App (from your GitHub App)
GITHUB_APP_ID=123456         # Your existing App ID
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
...your private key here...
-----END RSA PRIVATE KEY-----"

# Webhook (from your GitHub App)
GITHUB_WEBHOOK_SECRET=...    # Your existing webhook secret

# Session (generate new if needed)
SESSION_SECRET=...           # openssl rand -hex 32
```

**Where to find these:**
- OAuth Client ID/Secret: [GitHub OAuth Apps](https://github.com/settings/developers)
- App ID: [GitHub Apps](https://github.com/settings/apps) → Your App → App ID at top
- Private Key: The `.pem` file you downloaded when creating the app
- Webhook Secret: The one you set when creating the GitHub App

---

### Step 4: Redeploy Vercel

After adding environment variables:
1. Go to Vercel → Deployments
2. Click the **⋯** menu on latest deployment
3. Click **Redeploy**
4. Or just push a new commit to trigger deployment

---

### Step 5: Test the Integration

1. Visit `https://your-frontend.vercel.app`
2. Click **Connect GitHub** (should be visible now)
3. Authorize the OAuth app
4. You should see your GitHub repos

---

## 🔒 Security Checklist

Before enabling:
- [ ] All secrets are in Vercel environment variables (not in code)
- [ ] GitHub App has minimal permissions (only what you need)
- [ ] OAuth callback URL matches exactly
- [ ] Webhook secret is strong (32+ characters)
- [ ] SESSION_SECRET is unique and strong
- [ ] HTTPS is enabled on Vercel (automatic)

---

## 🎯 When You're Ready to Enable

**In your app settings UI:**
1. Uncomment or enable the GitHub integration toggle
2. The feature should work immediately with production URLs

**Files to check:**
```typescript
// frontend/components/GitHubConnect.tsx
// Should show "Connect GitHub" button

// frontend/app/api/github/* routes
// All should work with production env vars
```

---

## 📋 Environment Variables Summary

### Vercel (Frontend) - Required for GitHub
```bash
# Required
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_APP_ID=...
GITHUB_APP_PRIVATE_KEY="..."
GITHUB_WEBHOOK_SECRET=...
SESSION_SECRET=...

# Already set
NEXT_PUBLIC_BACKEND_URL=https://your-backend.onrender.com
```

### Render (Backend) - Optional for GitHub features
```bash
# Only if backend needs GitHub access
GITHUB_TOKEN=...  # Personal access token (optional)
```

---

## 🐛 Common Issues

### "Invalid callback URL"
- Ensure OAuth app callback URL ends with `/api/github/oauth/callback`
- Must be exact match (https, no trailing slash before /api)

### "Invalid installation"
- Make sure you've **installed** the GitHub App on your account
- Go to: `https://github.com/apps/your-app-name` → Install

### "Signature verification failed"
- Webhook secret in Vercel must match GitHub App webhook secret
- Check for extra spaces or newlines

### Private key errors
- Ensure entire key is copied including BEGIN/END lines
- Wrap in double quotes in Vercel
- No extra spaces at start/end

---

## 📊 What Works After Setup

✅ **OAuth Login**
- Users can sign in with GitHub
- Access their repositories

✅ **Repository Operations**
- Browse files
- Create branches
- Commit changes
- Open pull requests
- Add PR comments

✅ **Webhooks** (real-time events)
- Push notifications
- PR updates
- Comments
- Checks

✅ **Multi-repo Support**
- Users can switch between repos
- Installation-based access control

---

## 🎉 After Setup Complete

Your users can:
1. Connect their GitHub account
2. Select repositories they have access to
3. Make changes in Vibe Coder
4. Push commits directly to GitHub
5. Create PRs from the UI
6. Receive real-time webhook events

**Total setup time:** ~10 minutes
**Cost:** $0 (GitHub APIs are free)

---

## 🚀 Optional: Test Locally First

If you want to test before production:

```bash
# Use ngrok to expose local server
ngrok http 3000

# Update GitHub App webhook URL to:
https://your-ngrok-url.ngrok.io/api/github/webhook

# Test OAuth flow locally
# Update OAuth callback to:
http://localhost:3000/api/github/oauth/callback
```

---

**Ready to enable?** Just update the GitHub App/OAuth URLs and add the env vars to Vercel! 🚀
