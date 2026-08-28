#!/bin/bash
# Start the NewsFlow Trader agent-service mini-service in the background.
# Run from /home/z/my-project/ as:  bash scripts/start-agent-service.sh
set -e

PROJECT_DIR="/home/z/my-project"
SERVICE_DIR="$PROJECT_DIR/mini-services/agent-service"
LOG_FILE="$PROJECT_DIR/.zscripts/mini-service-agent-service.log"

# Kill any existing instance on port 3003
EXISTING_PID=$(lsof -ti :3003 2>/dev/null || true)
if [ -n "$EXISTING_PID" ]; then
  echo "Killing existing agent-service on port 3003 (pid $EXISTING_PID)"
  kill -9 "$EXISTING_PID" 2>/dev/null || true
  sleep 1
fi

cd "$SERVICE_DIR"

# Load .env (Alpaca keys, DATABASE_URL, etc.) so the agent-service picks them up.
set -a
source "$PROJECT_DIR/.env"
set +a

# Default DATABASE_URL if .env didn't set it
export DATABASE_URL="${DATABASE_URL:-file:/home/z/my-project/db/custom.db}"

setsid -f bun --hot src/index.ts > "$LOG_FILE" 2>&1

sleep 4
echo "agent-service started"
echo "  log:  $LOG_FILE"
echo "  port: 3003 (socket.io)"
echo "  ws:   /?XTransformPort=3003 via the gateway"
echo ""
echo "Last 8 log lines:"
tail -8 "$LOG_FILE"
echo ""
PORT_LISTENING=$(lsof -ti :3003 2>/dev/null || true)
if [ -n "$PORT_LISTENING" ]; then
  echo "✅ agent-service is listening on port 3003 (pid $PORT_LISTENING)"
else
  echo "❌ agent-service failed to start — check $LOG_FILE"
  exit 1
fi
