# Phase 1.3 Deployment Checklist for Vercel & Render

## Current Status

✅ **Backend Code Complete** - All Phase 1.3 services implemented
✅ **Integration Complete** - LLM caching and rate limiting integrated
⚠️ **Deployment Pending** - Need to verify environment variables on Vercel/Render

## What Needs to be Deployed

### Backend (Render)

**Files to Deploy:**
- ✅ `backend/src/services/llm-cache-service.ts` - LLM response caching
- ✅ `backend/src/services/session-service.ts` - Redis sessions
- ✅ `backend/src/middleware/cache.ts` - Caching middleware
- ✅ `backend/src/middleware/rate-limit.ts` - Rate limiting middleware
- ✅ `backend/src/routes/llm.ts` - Updated with caching and rate limiting

### Frontend (Vercel)

**No changes needed** - Frontend uses iron-session locally, which is fine for now.

**Optional Future Enhancement:** Migrate frontend to use backend Redis sessions via API.

## Environment Variables Required

### Render (Backend) - CRITICAL ⚠️

You **MUST** add these environment variables to your Render backend service:

1. **Upstash Redis Credentials** (Required for Phase 1.3):
   ```
   UPSTASH_REDIS_REST_URL=https://your-endpoint.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your_token_here
   ```

2. **Existing Variables** (Already set):
   ```
   DATABASE_URL=postgres://postgres.your-project...
   DIRECT_URL=postgresql://postgres:...
   SUPABASE_URL=https://...
   SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_KEY=...
   OPENAI_API_KEY=...
   ANTHROPIC_API_KEY=...
   GOOGLE_API_KEY=...
   XAI_API_KEY=...
   NODE_ENV=production
   FRONTEND_URL=https://your-frontend.vercel.app
   ```

### Vercel (Frontend) - No Changes Needed

Frontend doesn't need Redis variables. It uses:
- `SESSION_SECRET` (for iron-session)
- `NEXT_PUBLIC_BACKEND_URL` (to connect to Render backend)
- GitHub OAuth variables (if using GitHub integration)

## Deployment Steps

### Step 1: Get Upstash Redis Credentials

1. Go to https://console.upstash.com/
2. Sign in or create account (FREE tier available)
3. Click "Create Database"
4. Choose:
   - **Name:** vibe-coder-redis
   - **Type:** Regional (cheaper, faster)
   - **Region:** Same as your Render region (e.g., us-east-1)
5. Click "Create"
6. In database dashboard, find **REST API** section
7. Copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### Step 2: Add Environment Variables to Render

1. Go to https://dashboard.render.com/
2. Select your backend service
3. Click "Environment" tab
4. Click "Add Environment Variable"
5. Add both:
   ```
   Key: UPSTASH_REDIS_REST_URL
   Value: https://your-endpoint.upstash.io

   Key: UPSTASH_REDIS_REST_TOKEN
   Value: your_token_here
   ```
6. Click "Save Changes"

### Step 3: Deploy to Render

**Option A: Automatic (if connected to GitHub)**
```bash
# Just push to main branch
git add .
git commit -m "feat: add Phase 1.3 caching and session layer"
git push origin main

# Render will auto-deploy
```

**Option B: Manual Deploy**
1. Go to Render dashboard
2. Click "Manual Deploy" → "Deploy latest commit"

### Step 4: Verify Deployment

**Test 1: Health Check**
```bash
curl https://your-backend.onrender.com/health
# Should return: {"status":"ok"}
```

**Test 2: Cache Statistics**
```bash
curl https://your-backend.onrender.com/llm/cache/stats
# Should return: {"hits":0,"misses":0,"hitRate":0,"estimatedSavings":"$0.00"}
```

**Test 3: LLM Request (will be cached)**
```bash
curl -X POST https://your-backend.onrender.com/llm/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a hello world function",
    "model": "gpt-4o",
    "routingMode": "single-model"
  }'
# First request: "cached": false
# Second identical request: "cached": true
```

**Test 4: Rate Limiting**
```bash
# Make 25 requests rapidly - should rate limit after 20
for i in {1..25}; do
  curl -w "\n%{http_code}\n" -X POST https://your-backend.onrender.com/llm/generate \
    -H "Content-Type: application/json" \
    -d '{"prompt":"test","model":"gpt-4o"}'
done
# Requests 21-25 should return: 429 Rate Limit Exceeded
```

## What Phase 1.3 Provides in Production

### 1. LLM Response Caching
- **Before:** Every request hits OpenAI/Anthropic API ($0.01 each, 2-5 seconds)
- **After:** Identical requests served from cache ($0.00, 50ms)
- **Benefit:** 40-60% cost reduction, 40x faster responses

### 2. Rate Limiting
- **Protection:** 20 LLM requests per minute per user/IP
- **Prevents:** API abuse, runaway costs
- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### 3. Session Management (Backend Ready)
- **Redis-based sessions:** Horizontally scalable
- **Auto-expiring:** 24-hour default
- **Future-proof:** Ready for multi-server deployment

## Production Monitoring

### Check Cache Performance

**Daily:**
```bash
curl https://your-backend.onrender.com/llm/cache/stats
```

**Expected After 1 Week:**
- Hit rate: 40-70%
- Estimated savings: $5-20
- Hits: 100-500
- Misses: 50-200

**If hit rate is low (<30%):**
- Users asking very diverse questions (normal)
- Consider increasing TTL from 3600s (1h) to 7200s (2h)

### Monitor Rate Limiting

**Check logs for:**
```
⚠️ Rate limit exceeded: 1.2.3.4 on /llm/generate (21/20)
```

**If seeing many rate limit errors:**
- Legitimate heavy user → Increase limit in `rate-limit.ts`
- Potential abuse → Keep limit, investigate IP

## Cost Comparison

### Without Phase 1.3 (Pre-caching):
- **100 LLM requests/day** @ $0.01 each = **$1.00/day**
- **Monthly cost:** $30.00
- **No protection** from abuse

### With Phase 1.3 (Post-caching):
- **100 LLM requests/day** with 60% cache hit rate:
  - 60 cached (free) + 40 API calls ($0.40)
- **Monthly cost:** $12.00
- **Protected** with rate limiting

**💰 Savings: $18/month (60% reduction)**

## Troubleshooting

### Error: "Missing Redis credentials"

**Problem:** Backend can't connect to Redis

**Solution:**
1. Verify `UPSTASH_REDIS_REST_URL` is set on Render
2. Verify `UPSTASH_REDIS_REST_TOKEN` is set on Render
3. Restart Render service

### Error: "Failed to connect to Upstash"

**Problem:** Redis credentials are invalid

**Solution:**
1. Go to Upstash dashboard
2. Verify credentials are correct
3. Try regenerating token if needed
4. Update Render environment variables

### Cache not working (always "cached": false)

**Problem:** Cache is disabled or Redis connection failed

**Check:**
```typescript
// In llm-cache-service.ts
export const llmCacheService = new LLMCacheService({
  enabled: true, // ← Should be true
  ttl: 3600,
});
```

**Logs to check:**
```
💰 LLM Cache HIT: ... (saved API call!)  ← Good!
💸 LLM Cache MISS: ...                   ← Expected for new prompts
```

### Rate limiting too strict

**Problem:** Legitimate users hitting limit

**Solution:** Adjust in `rate-limit.ts`:
```typescript
export function rateLimitLLM(options = {}) {
  return rateLimit({
    windowMs: 60000, // 1 minute
    max: 30, // ← Increase from 20 to 30
    message: 'Too many LLM requests...',
  });
}
```

## Phase 1.3 Completion Checklist

- [x] ✅ LLM cache service implemented
- [x] ✅ Session service implemented
- [x] ✅ Rate limiting middleware implemented
- [x] ✅ Caching middleware implemented
- [x] ✅ Integrated into `/llm/generate` endpoint
- [x] ✅ Cache statistics endpoint added
- [x] ✅ Tested locally (all tests pass)
- [ ] ⏳ **Upstash Redis created for production**
- [ ] ⏳ **Environment variables added to Render**
- [ ] ⏳ **Deployed to Render**
- [ ] ⏳ **Verified in production**

## Next Steps

### Immediate (Complete Phase 1.3):
1. ✅ Create Upstash Redis database
2. ✅ Add environment variables to Render
3. ✅ Deploy to Render
4. ✅ Verify with curl tests above

### After Deployment (Phase 1.4):
- Structured logging with Pino
- Error tracking with Sentry
- Audit log system
- Performance monitoring

## Production URLs

**Backend (Render):** https://your-backend.onrender.com
**Frontend (Vercel):** https://your-frontend.vercel.app

**Endpoints:**
- Cache stats: `GET /llm/cache/stats`
- Generate: `POST /llm/generate` (rate limited)
- Models: `GET /llm/models`
- Providers: `GET /llm/providers`

---

## Summary

**Phase 1.3 is CODE COMPLETE** ✅

**To finish Phase 1.3 deployment:**
1. Create Upstash Redis (5 minutes)
2. Add 2 environment variables to Render (2 minutes)
3. Deploy and verify (5 minutes)

**Total time: ~15 minutes**

**Benefits:**
- 💰 40-60% cost savings on LLM API calls
- ⚡ 40x faster cached responses
- 🛡️ Protected from API abuse
- 📈 Ready to scale horizontally
