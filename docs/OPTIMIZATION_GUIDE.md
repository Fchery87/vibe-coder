# Vibe Coder Optimization Guide

## Current Status Analysis

You have a solid foundation! Now let's make it even better.

## Quick Wins (Do These First!)

### 1. Optimize LLM Cache TTL ⚡

**Current:** 1 hour (3600s) for all cached responses
**Recommendation:** Different TTLs based on use case

**Update `backend/src/services/llm-cache-service.ts`:**

```typescript
// Instead of fixed TTL, use dynamic based on prompt type
async set(params, response, customTtl?: number): Promise<void> {
  if (!this.enabled) return;

  const key = this.generateKey(params);

  // Smart TTL based on prompt content
  let ttl = customTtl ?? this.ttl;

  // Longer cache for static/documentation prompts
  if (params.prompt.toLowerCase().includes('documentation') ||
      params.prompt.toLowerCase().includes('explain') ||
      params.prompt.toLowerCase().includes('what is')) {
    ttl = 7200; // 2 hours
  }

  // Shorter cache for user-specific or time-sensitive
  if (params.prompt.toLowerCase().includes('my ') ||
      params.prompt.toLowerCase().includes('current') ||
      params.prompt.toLowerCase().includes('latest')) {
    ttl = 900; // 15 minutes
  }

  await redisClient.set(key, response, { ex: ttl });
  console.log(`💾 LLM Response cached: ${key} (TTL: ${ttl}s)`);
}
```

**Expected Impact:**
- 10-20% better cache hit rate
- Fresher results for time-sensitive queries
- Longer cache for static content

---

### 2. Monitor Cache Performance 📊

**Create a monitoring script:**

```bash
# Save as: monitor-cache.sh
#!/bin/bash

echo "📊 Cache Performance Monitor"
echo "============================"
echo ""

BACKEND_URL="https://your-backend.onrender.com"

while true; do
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

  # Get cache stats
  STATS=$(curl -s "$BACKEND_URL/llm/cache/stats")

  HITS=$(echo $STATS | jq -r '.hits')
  MISSES=$(echo $STATS | jq -r '.misses')
  HIT_RATE=$(echo $STATS | jq -r '.hitRate')
  SAVINGS=$(echo $STATS | jq -r '.estimatedSavings')

  echo "[$TIMESTAMP] Hits: $HITS | Misses: $MISSES | Hit Rate: $HIT_RATE% | Savings: $SAVINGS"

  # Alert if hit rate drops below 40%
  if (( $(echo "$HIT_RATE < 40" | bc -l) )); then
    echo "⚠️  WARNING: Cache hit rate below 40%!"
  fi

  sleep 300  # Check every 5 minutes
done
```

**Run it:**
```bash
chmod +x monitor-cache.sh
./monitor-cache.sh
```

---

### 3. Set Up Error Alerts 🚨

**Create alert script:**

```bash
# Save as: monitor-errors.sh
#!/bin/bash

BACKEND_URL="https://your-backend.onrender.com"
WEBHOOK_URL="YOUR_SLACK_WEBHOOK_OR_EMAIL"  # Optional

ERROR_COUNT=0
CHECK_INTERVAL=60  # Check every minute

while true; do
  # Check health endpoint
  HEALTH=$(curl -s "$BACKEND_URL/health")
  HEALTHY=$(echo $HEALTH | jq -r '.healthy')

  if [ "$HEALTHY" != "true" ]; then
    ERROR_COUNT=$((ERROR_COUNT + 1))
    echo "❌ [$( date )] System unhealthy! (Count: $ERROR_COUNT)"

    # Send alert if webhook configured
    if [ ! -z "$WEBHOOK_URL" ]; then
      curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"🚨 Vibe Coder Backend Unhealthy!"}' \
        $WEBHOOK_URL
    fi
  else
    if [ $ERROR_COUNT -gt 0 ]; then
      echo "✅ [$( date )] System recovered!"
    fi
    ERROR_COUNT=0
  fi

  sleep $CHECK_INTERVAL
done
```

---

### 4. Optimize Rate Limits Based on Usage 🛡️

**Check current usage patterns first:**

```bash
# In Render logs, search for:
"Rate limit exceeded"

# If you see many, consider adjusting limits
```

**Update `backend/src/middleware/rate-limit.ts` if needed:**

```typescript
// Current: 20 req/min for LLM
// If users are legitimate and hitting limits, increase:

export function rateLimitLLM(options = {}) {
  return rateLimit({
    windowMs: 60000,
    max: 30,  // Increased from 20 → 30
    message: 'Too many LLM requests...',
  });
}
```

---

### 5. Database Query Optimization 🗄️

**Check slow queries in your logs:**

```bash
# In Render logs, search for:
"DB query"
# Look for queries taking >100ms
```

**Add database indexes if needed:**

```sql
-- In Supabase SQL Editor
-- Index frequently queried fields

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_executions_created_at ON executions(created_at DESC);
```

---

## Performance Monitoring Dashboard

**Create a comprehensive monitoring script:**

```bash
# Save as: dashboard.sh
#!/bin/bash

BACKEND_URL="https://your-backend.onrender.com"

clear
echo "╔════════════════════════════════════════════════╗"
echo "║     Vibe Coder Performance Dashboard           ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Health Check
echo "🏥 HEALTH CHECK"
echo "─────────────────"
HEALTH=$(curl -s "$BACKEND_URL/health")
echo $HEALTH | jq '.'
echo ""

# Cache Performance
echo "💾 CACHE PERFORMANCE"
echo "─────────────────"
CACHE=$(curl -s "$BACKEND_URL/llm/cache/stats")
echo "Hits: $(echo $CACHE | jq -r '.hits')"
echo "Misses: $(echo $CACHE | jq -r '.misses')"
echo "Hit Rate: $(echo $CACHE | jq -r '.hitRate')%"
echo "Savings: $(echo $CACHE | jq -r '.estimatedSavings')"
echo ""

# Metrics
echo "📊 PERFORMANCE METRICS"
echo "─────────────────"
METRICS=$(curl -s "$BACKEND_URL/metrics")
echo "HTTP Requests:"
echo $METRICS | jq '.httpRequests'
echo ""
echo "LLM Requests:"
echo $METRICS | jq '.llmRequests'
echo ""
echo "Memory:"
echo "  RSS: $(echo $METRICS | jq -r '.memory.rss / 1024 / 1024 | floor')MB"
echo "  Heap: $(echo $METRICS | jq -r '.memory.heapUsed / 1024 / 1024 | floor')MB"
echo ""

# Recommendations
echo "💡 RECOMMENDATIONS"
echo "─────────────────"
HIT_RATE=$(echo $CACHE | jq -r '.hitRate')
if (( $(echo "$HIT_RATE < 50" | bc -l) )); then
  echo "⚠️  Cache hit rate is low (<50%). Consider:"
  echo "   - Increasing TTL for common queries"
  echo "   - Reviewing prompt patterns"
fi

AVG_RESPONSE=$(echo $METRICS | jq -r '.httpRequests.avg // 0')
if (( $(echo "$AVG_RESPONSE > 1000" | bc -l) )); then
  echo "⚠️  Average response time >1s. Consider:"
  echo "   - Optimizing slow endpoints"
  echo "   - Adding more caching"
fi

echo ""
echo "Last updated: $(date)"
```

**Run it:**
```bash
chmod +x dashboard.sh
./dashboard.sh
```

---

## Environment Variable Optimization

**Review your Render environment variables:**

### Required (should already have):
```bash
✅ DATABASE_URL
✅ DIRECT_URL
✅ SUPABASE_URL
✅ SUPABASE_ANON_KEY
✅ SUPABASE_SERVICE_KEY
✅ UPSTASH_REDIS_REST_URL
✅ UPSTASH_REDIS_REST_TOKEN
✅ OPENAI_API_KEY
✅ ANTHROPIC_API_KEY
```

### Recommended (add if missing):
```bash
NODE_ENV=production
LOG_LEVEL=info
PORT=3001
```

### Optional Performance Tuning:
```bash
# Increase cache TTL globally
CACHE_TTL=7200  # 2 hours instead of 1

# Adjust rate limits
RATE_LIMIT_LLM=30  # Instead of 20
RATE_LIMIT_STANDARD=150  # Instead of 100
```

---

## Performance Targets

### Current Baseline (measure first)
Run dashboard and record:
- Cache hit rate: _%
- Average response time: _ms
- Memory usage: _MB
- Error rate: _%

### Target Goals
- **Cache hit rate:** >60% (currently ~40-50%)
- **Average response time:** <500ms (non-LLM endpoints)
- **LLM cached response:** <100ms
- **Memory usage:** <400MB
- **Uptime:** >99.5%

---

## Cost Optimization

### Current Costs
- Infrastructure: $0/month (free tiers)
- LLM APIs: ~$12/month (with 60% cache hit rate)

### Target After Optimization
- Infrastructure: $0/month (same)
- LLM APIs: ~$8/month (with 75% cache hit rate)
- **Potential savings:** $4/month additional (total 73% reduction)

---

## Weekly Maintenance Checklist

**Every Monday:**
- [ ] Check cache hit rate (aim for >60%)
- [ ] Review error logs in Render
- [ ] Check memory usage trends
- [ ] Verify all health checks passing

**Every Month:**
- [ ] Review LLM costs vs budget
- [ ] Check for slow database queries
- [ ] Update dependencies if needed
- [ ] Review and adjust cache TTLs

---

## Advanced Optimizations (Phase 2)

Once basics are optimized:

1. **Implement cache warming** - Pre-cache common queries
2. **Add request coalescing** - Deduplicate identical concurrent requests
3. **Implement tiered caching** - Memory → Redis → Database
4. **Add CDN caching** - For static responses
5. **Horizontal scaling** - Multiple worker instances

---

## Monitoring Tools Integration (Optional)

### Free Monitoring Services

**1. UptimeRobot** (Free)
- Monitor /health endpoint
- Email alerts on downtime
- 5 minute check interval
- https://uptimerobot.com/

**2. Cronitor** (Free tier)
- Cron job monitoring
- Heartbeat monitoring
- https://cronitor.io/

**3. Grafana Cloud** (Free tier)
- Advanced metrics visualization
- Custom dashboards
- https://grafana.com/

---

## Quick Command Reference

```bash
# Check cache performance
curl https://your-backend.onrender.com/llm/cache/stats | jq '.'

# Check system health
curl https://your-backend.onrender.com/health | jq '.'

# Check metrics
curl https://your-backend.onrender.com/metrics | jq '.httpRequests, .llmRequests'

# View Render logs
# Go to: https://dashboard.render.com → Your service → Logs

# Search logs for errors
# In Render logs: level:error

# Search for slow requests
# In Render logs: duration > 2000
```

---

## Next Steps

1. **Run dashboard.sh** to establish baseline metrics
2. **Implement smart cache TTL** (code above)
3. **Set up monitoring script** (run in background)
4. **Review Render logs** for patterns
5. **Adjust based on your usage** patterns

---

**Ready to optimize!** Start with the dashboard to see current performance, then implement the quick wins.
