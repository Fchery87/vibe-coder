# Production Environment Variables Checklist

## Render Backend - Environment Variables

Go to: https://dashboard.render.com → Your Service → Environment

### ✅ Required (Should Already Have)

```bash
# Database (Supabase)
DATABASE_URL=postgres://postgres.PROJECT:PASSWORD@...pooler.supabase.com:5432/postgres
DIRECT_URL=postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres
SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# LLM Providers (at least one)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AI...
XAI_API_KEY=xai-...
```

### 📝 Recommended (Add If Missing)

```bash
# Environment
NODE_ENV=production

# Logging
LOG_LEVEL=info
# LOGTAIL_SOURCE_TOKEN=...  # Optional - for BetterStack

# Server
PORT=3001  # Render sets this automatically, but good to have
FRONTEND_URL=https://your-frontend.vercel.app
```

### ⚙️ Optional Performance Tuning

```bash
# Cache TTL (if you want to override defaults)
# CACHE_TTL=3600  # Default is fine

# Rate Limits (if you want to adjust)
# RATE_LIMIT_LLM=30  # Default: 20
# RATE_LIMIT_STANDARD=150  # Default: 100
```

---

## Vercel Frontend - Environment Variables

Go to: https://vercel.com/dashboard → Your Project → Settings → Environment Variables

### ✅ Required

```bash
# Backend URL
NEXT_PUBLIC_BACKEND_URL=https://your-backend.onrender.com

# Session
SESSION_SECRET=your-secure-random-string-here  # Generate with: openssl rand -base64 32
```

### 📝 Optional (If Using GitHub Integration)

```bash
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_APP_ID=...
GITHUB_APP_PRIVATE_KEY=...
```

### 📝 Optional (If Using Jira Integration)

```bash
JIRA_HOST=your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=...
```

---

## Security Checklist

### Render Backend

- [ ] All API keys are set as environment variables (not in code)
- [ ] `NODE_ENV=production` is set
- [ ] Database uses connection pooling (SESSION_POOLER URL)
- [ ] CORS is configured with actual frontend URL
- [ ] Rate limiting is enabled

### Vercel Frontend

- [ ] `SESSION_SECRET` is secure (32+ random characters)
- [ ] `NEXT_PUBLIC_BACKEND_URL` points to production backend
- [ ] Sensitive keys are NOT prefixed with `NEXT_PUBLIC_`

---

## Verification Steps

### 1. Check Backend Environment

```bash
# Test health endpoint
curl https://your-backend.onrender.com/health

# Should return:
{
  "healthy": true,
  "redis": true,
  "memory": true,
  "uptime": 123.45
}
```

### 2. Check Frontend Environment

```bash
# Visit your frontend
https://your-frontend.vercel.app

# Check browser console for:
# - No CORS errors
# - Successful API calls to backend
# - No "undefined" environment variable errors
```

### 3. Check Database Connection

```bash
# Test a backend endpoint that uses database
curl https://your-backend.onrender.com/llm/models

# Should return list of available models (not an error)
```

### 4. Check Redis Connection

```bash
# Test cache stats
curl https://your-backend.onrender.com/llm/cache/stats

# Should return valid stats (not error)
```

---

## Common Issues & Fixes

### Backend shows "Missing Redis credentials"

**Fix:**
1. Go to Render dashboard
2. Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set
3. Click "Manual Deploy" to restart with new variables

### Frontend can't connect to backend

**Fix:**
1. Check `NEXT_PUBLIC_BACKEND_URL` in Vercel
2. Verify CORS in backend `src/index.ts`:
   ```typescript
   app.use(cors({
     origin: ['https://your-frontend.vercel.app']  // Your actual URL
   }));
   ```
3. Redeploy both frontend and backend

### Database queries failing

**Fix:**
1. Verify `DATABASE_URL` and `DIRECT_URL` in Render
2. Check Supabase dashboard that database is running
3. Test connection: `npx prisma db push` locally

### LLM requests failing

**Fix:**
1. Verify at least one LLM API key is set (OpenAI, Anthropic, Google, or xAI)
2. Check API key is valid (not expired, has credits)
3. Check rate limits haven't been exceeded

---

## Performance Tuning Variables

### If Cache Hit Rate is Low (<50%)

Consider adding:
```bash
# Increase default cache TTL
CACHE_TTL=7200  # 2 hours instead of 1
```

### If Getting Rate Limited

Consider adding:
```bash
# Increase rate limits
RATE_LIMIT_LLM=40  # From 20
RATE_LIMIT_STANDARD=200  # From 100
```

### If Memory Usage is High

Check logs and consider:
```bash
# Reduce log verbosity
LOG_LEVEL=warn  # Instead of info

# Or reduce cache size by lowering TTL
CACHE_TTL=1800  # 30 minutes instead of 1 hour
```

---

## Monthly Review Checklist

Every month, review:

- [ ] Are all API keys still valid?
- [ ] Are we still within free tiers? (Supabase, Upstash, Render)
- [ ] Is cache hit rate acceptable? (>50%)
- [ ] Are there any new security patches?
- [ ] Are logs showing any errors?

---

## Environment Variable Templates

### Generate Secure Secrets

```bash
# Generate SESSION_SECRET
openssl rand -base64 32

# Generate API keys
# - OpenAI: https://platform.openai.com/api-keys
# - Anthropic: https://console.anthropic.com/
# - Google: https://makersuite.google.com/app/apikey
# - xAI: https://console.x.ai/
```

### Copy Template

```bash
# Backend (.env in Render)
NODE_ENV=production
LOG_LEVEL=info
DATABASE_URL=postgres://...
DIRECT_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AI...
XAI_API_KEY=xai-...
FRONTEND_URL=https://your-frontend.vercel.app

# Frontend (.env in Vercel)
NEXT_PUBLIC_BACKEND_URL=https://your-backend.onrender.com
SESSION_SECRET=<GENERATE_WITH_OPENSSL>
```

---

**Last Updated:** Check after each deployment
**Next Review:** Monthly
