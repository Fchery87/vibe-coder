# Optimization Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Run the Dashboard (Baseline Metrics)

```bash
cd /mnt/e/Dev/vibe-coder

# For local backend
./scripts/dashboard.sh http://localhost:3001

# For production (replace with your actual URL)
./scripts/dashboard.sh https://your-backend.onrender.com
```

**Record your baseline:**
- Cache hit rate: ____%
- Average response time: ____ms
- Memory usage: ____MB

---

### Step 2: Deploy Smart Caching (Already Done!)

The smart caching is already implemented! It will:
- Cache documentation queries for **2 hours**
- Cache code generation for **45 minutes**
- Cache user-specific queries for **15 minutes**

**Commit and push:**
```bash
git add backend/src/services/llm-cache-service.ts
git commit -m "feat: smart cache TTL optimization"
git push origin main
```

**Expected improvement:** +10-20% cache hit rate

---

### Step 3: Optimize Database (5 minutes)

1. Go to **Supabase Dashboard**
2. Click **SQL Editor**
3. Copy contents of `scripts/optimize-database.sql`
4. Run the script
5. Done!

**What it does:**
- Creates indexes on frequently queried fields
- Optimizes query planner
- Adds vector search index

**Expected improvement:** 2-5x faster database queries

---

### Step 4: Set Up Monitoring (Optional but Recommended)

**Monitor cache performance:**
```bash
# Run in background
./scripts/monitor-cache.sh https://your-backend.onrender.com 300 &

# View logs
tail -f cache-monitor-*.log
```

**Monitor system health:**
```bash
# Run in background
./scripts/monitor-health.sh https://your-backend.onrender.com &

# Add Slack webhook for alerts (optional)
./scripts/monitor-health.sh https://your-backend.onrender.com https://hooks.slack.com/your-webhook
```

---

### Step 5: Verify Improvements (After 24 Hours)

Run dashboard again:
```bash
./scripts/dashboard.sh https://your-backend.onrender.com
```

**Compare to baseline:**
- Cache hit rate: Should be **10-20% higher**
- Average response time: Should be **20-30% faster**
- LLM costs: Should be **10-15% lower**

---

## Quick Command Reference

```bash
# View live dashboard
./scripts/dashboard.sh https://your-backend.onrender.com

# Monitor cache (updates every 5 min)
./scripts/monitor-cache.sh https://your-backend.onrender.com

# Monitor health (checks every 1 min)
./scripts/monitor-health.sh https://your-backend.onrender.com

# Check cache stats only
curl https://your-backend.onrender.com/llm/cache/stats | jq '.'

# Check health only
curl https://your-backend.onrender.com/health | jq '.'

# Check metrics only
curl https://your-backend.onrender.com/metrics | jq '.'
```

---

## Expected Results

### Before Optimization
- Cache hit rate: ~40-50%
- Average response time: ~800ms
- LLM costs: ~$12/month

### After Optimization
- Cache hit rate: ~60-70% ✅ (+20% improvement)
- Average response time: ~500ms ✅ (40% faster)
- LLM costs: ~$8-10/month ✅ (17-33% savings)

**Additional monthly savings: $2-4**

---

## Troubleshooting

**Dashboard shows "Backend unreachable"?**
- Check backend URL is correct
- Verify backend is running
- Check network connection

**Cache hit rate still low after 24 hours?**
- Check user prompts are similar enough to benefit from cache
- Consider increasing TTL in `llm-cache-service.ts`
- Review logs to see cache types being used

**Scripts won't run?**
```bash
chmod +x scripts/*.sh
```

**Need jq for dashboard?**
```bash
# Install jq
sudo apt-get install jq  # Ubuntu/Debian
brew install jq          # macOS
```

---

## Next Steps

1. ✅ Run dashboard to get baseline
2. ✅ Deploy smart caching (already done!)
3. ✅ Run database optimization script
4. ✅ Set up monitoring scripts
5. ⏳ Wait 24 hours
6. ✅ Check improvements
7. 🎉 Enjoy better performance and lower costs!

---

**Total Time:** ~15 minutes of active work
**ROI:** ~$50/year in savings + better user experience
