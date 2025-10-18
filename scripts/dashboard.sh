#!/bin/bash

# Vibe Coder Performance Dashboard
# Usage: ./dashboard.sh [backend-url]

BACKEND_URL="${1:-http://localhost:3001}"

clear
echo "╔════════════════════════════════════════════════╗"
echo "║     Vibe Coder Performance Dashboard           ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "Backend: $BACKEND_URL"
echo ""

# Health Check
echo "🏥 HEALTH CHECK"
echo "─────────────────────────────────────────────────"
HEALTH=$(curl -s "$BACKEND_URL/health" 2>/dev/null)

if [ $? -eq 0 ]; then
  echo "$HEALTH" | jq '.' 2>/dev/null || echo "$HEALTH"
else
  echo "❌ Backend unreachable!"
fi
echo ""

# Cache Performance
echo "💾 CACHE PERFORMANCE"
echo "─────────────────────────────────────────────────"
CACHE=$(curl -s "$BACKEND_URL/llm/cache/stats" 2>/dev/null)

if [ $? -eq 0 ]; then
  HITS=$(echo "$CACHE" | jq -r '.hits // 0')
  MISSES=$(echo "$CACHE" | jq -r '.misses // 0')
  HIT_RATE=$(echo "$CACHE" | jq -r '.hitRate // 0')
  SAVINGS=$(echo "$CACHE" | jq -r '.estimatedSavings // "$0.00"')

  echo "Hits:     $HITS"
  echo "Misses:   $MISSES"
  echo "Hit Rate: $HIT_RATE%"
  echo "Savings:  $SAVINGS"

  # Visual hit rate bar
  if command -v bc &> /dev/null; then
    FILLED=$(echo "$HIT_RATE / 2" | bc)
    EMPTY=$((50 - FILLED))
    BAR=$(printf '█%.0s' $(seq 1 $FILLED))$(printf '░%.0s' $(seq 1 $EMPTY))
    echo "Progress: [$BAR] $HIT_RATE%"
  fi
else
  echo "❌ Cache stats unavailable"
fi
echo ""

# Metrics
echo "📊 PERFORMANCE METRICS"
echo "─────────────────────────────────────────────────"
METRICS=$(curl -s "$BACKEND_URL/metrics" 2>/dev/null)

if [ $? -eq 0 ]; then
  echo "HTTP Requests:"
  echo "$METRICS" | jq '.httpRequests' 2>/dev/null || echo "  N/A"
  echo ""
  echo "LLM Requests:"
  echo "$METRICS" | jq '.llmRequests' 2>/dev/null || echo "  N/A"
  echo ""
  echo "Memory:"
  RSS=$(echo "$METRICS" | jq -r '.memory.rss // 0')
  HEAP=$(echo "$METRICS" | jq -r '.memory.heapUsed // 0')
  RSS_MB=$(echo "scale=2; $RSS / 1024 / 1024" | bc 2>/dev/null || echo "0")
  HEAP_MB=$(echo "scale=2; $HEAP / 1024 / 1024" | bc 2>/dev/null || echo "0")
  echo "  RSS:  ${RSS_MB}MB"
  echo "  Heap: ${HEAP_MB}MB"
else
  echo "❌ Metrics unavailable"
fi
echo ""

# Recommendations
echo "💡 RECOMMENDATIONS"
echo "─────────────────────────────────────────────────"

if command -v bc &> /dev/null && [ ! -z "$HIT_RATE" ]; then
  if (( $(echo "$HIT_RATE < 50" | bc -l) )); then
    echo "⚠️  Cache hit rate is low (<50%)"
    echo "   → Increase TTL for common queries"
    echo "   → Review prompt patterns"
  fi

  if (( $(echo "$HIT_RATE > 70" | bc -l) )); then
    echo "✅ Excellent cache hit rate (>70%)!"
  fi
fi

if [ ! -z "$METRICS" ]; then
  AVG=$(echo "$METRICS" | jq -r '.httpRequests.avg // 0')
  if command -v bc &> /dev/null && (( $(echo "$AVG > 1000" | bc -l) )); then
    echo "⚠️  Average response time >1s"
    echo "   → Optimize slow endpoints"
    echo "   → Add more caching"
  fi
fi

echo ""
echo "Last updated: $(date '+%Y-%m-%d %H:%M:%S')"
