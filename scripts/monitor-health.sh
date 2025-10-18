#!/bin/bash

# Health Monitor with Alerts
# Usage: ./monitor-health.sh [backend-url] [slack-webhook-url]

BACKEND_URL="${1:-http://localhost:3001}"
SLACK_WEBHOOK="${2:-}"
CHECK_INTERVAL=60  # Check every minute

echo "🏥 Health Monitor"
echo "================"
echo "Backend: $BACKEND_URL"
echo "Check interval: ${CHECK_INTERVAL}s"
if [ ! -z "$SLACK_WEBHOOK" ]; then
  echo "Slack alerts: ENABLED"
else
  echo "Slack alerts: DISABLED (provide webhook URL as 2nd argument)"
fi
echo ""

ERROR_COUNT=0
LAST_ERROR_TIME=0

send_alert() {
  local message="$1"
  echo "🚨 ALERT: $message"

  if [ ! -z "$SLACK_WEBHOOK" ]; then
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"🚨 Vibe Coder: $message\"}" \
      "$SLACK_WEBHOOK" 2>/dev/null
  fi
}

while true; do
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

  # Check health endpoint
  HEALTH=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/health" 2>/dev/null)
  HTTP_CODE=$(echo "$HEALTH" | tail -n1)
  BODY=$(echo "$HEALTH" | head -n-1)

  if [ "$HTTP_CODE" = "200" ]; then
    HEALTHY=$(echo "$BODY" | jq -r '.healthy // false')
    REDIS=$(echo "$BODY" | jq -r '.redis // false')
    MEMORY=$(echo "$BODY" | jq -r '.memory // false')
    UPTIME=$(echo "$BODY" | jq -r '.uptime // 0')

    if [ "$HEALTHY" = "true" ]; then
      # System healthy
      if [ $ERROR_COUNT -gt 0 ]; then
        send_alert "System recovered! Was down for $ERROR_COUNT checks."
      fi
      ERROR_COUNT=0
      echo "[$TIMESTAMP] ✅ Healthy | Redis: $REDIS | Memory: $MEMORY | Uptime: ${UPTIME}s"
    else
      # System unhealthy but reachable
      ERROR_COUNT=$((ERROR_COUNT + 1))
      echo "[$TIMESTAMP] ⚠️  Unhealthy | Redis: $REDIS | Memory: $MEMORY (Count: $ERROR_COUNT)"

      if [ $ERROR_COUNT -eq 3 ]; then
        send_alert "System unhealthy for 3 minutes! Redis: $REDIS, Memory: $MEMORY"
      fi
    fi
  else
    # Endpoint unreachable
    ERROR_COUNT=$((ERROR_COUNT + 1))
    echo "[$TIMESTAMP] ❌ Unreachable (HTTP $HTTP_CODE) (Count: $ERROR_COUNT)"

    # Alert after 3 failed checks
    if [ $ERROR_COUNT -eq 3 ]; then
      send_alert "Backend unreachable for 3 minutes! HTTP $HTTP_CODE"
    fi

    # Alert every 15 minutes if still down
    CURRENT_TIME=$(date +%s)
    if [ $ERROR_COUNT -gt 15 ] && [ $((CURRENT_TIME - LAST_ERROR_TIME)) -ge 900 ]; then
      send_alert "Backend still down after $ERROR_COUNT minutes!"
      LAST_ERROR_TIME=$CURRENT_TIME
    fi
  fi

  sleep "$CHECK_INTERVAL"
done
