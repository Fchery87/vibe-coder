#!/bin/bash

# Cache Performance Monitor
# Usage: ./monitor-cache.sh [backend-url] [interval-seconds]

BACKEND_URL="${1:-http://localhost:3001}"
INTERVAL="${2:-300}"  # Default: 5 minutes

echo "📊 Cache Performance Monitor"
echo "============================"
echo "Backend: $BACKEND_URL"
echo "Check interval: ${INTERVAL}s"
echo ""

LOG_FILE="cache-monitor-$(date +%Y%m%d).log"
echo "Logging to: $LOG_FILE"
echo ""

# Create CSV header if file doesn't exist
if [ ! -f "$LOG_FILE" ]; then
  echo "timestamp,hits,misses,hit_rate,savings" > "$LOG_FILE"
fi

while true; do
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

  # Get cache stats
  STATS=$(curl -s "$BACKEND_URL/llm/cache/stats" 2>/dev/null)

  if [ $? -eq 0 ]; then
    HITS=$(echo "$STATS" | jq -r '.hits // 0')
    MISSES=$(echo "$STATS" | jq -r '.misses // 0')
    HIT_RATE=$(echo "$STATS" | jq -r '.hitRate // 0')
    SAVINGS=$(echo "$STATS" | jq -r '.estimatedSavings // "$0.00"')

    # Display
    echo "[$TIMESTAMP] Hits: $HITS | Misses: $MISSES | Hit Rate: $HIT_RATE% | Savings: $SAVINGS"

    # Log to CSV
    echo "$TIMESTAMP,$HITS,$MISSES,$HIT_RATE,$SAVINGS" >> "$LOG_FILE"

    # Alert if hit rate drops below 40%
    if command -v bc &> /dev/null; then
      if (( $(echo "$HIT_RATE < 40 && $HITS > 10" | bc -l) )); then
        echo "⚠️  WARNING: Cache hit rate below 40%!" | tee -a "$LOG_FILE"
      fi

      if (( $(echo "$HIT_RATE > 75" | bc -l) )); then
        echo "✅ Excellent performance! Hit rate >75%" | tee -a "$LOG_FILE"
      fi
    fi
  else
    echo "[$TIMESTAMP] ❌ Failed to fetch cache stats"
  fi

  sleep "$INTERVAL"
done
