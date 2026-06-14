#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-http://localhost:3000}"

echo "== Agent Bazar smoke tests =="
echo "Base: $BASE"
echo

echo "1. KV health"
curl -sf "$BASE/api/health/kv" | jq -r '.ok // "FAIL"'
echo

echo "2. Chat without auth (expect 401 or 503)"
CODE=$(curl -s -o /tmp/chat.json -w "%{http_code}" -X POST "$BASE/api/chat" \
  -H "Content-Type: application/json" -d '{"messages":[]}')
echo "HTTP $CODE — $(cat /tmp/chat.json)"
echo

echo "3. ENS setup API (needs ENS_AGENT_PARENT on server)"
curl -s "$BASE/api/ens/setup" | jq '.success, .error // empty, (.agents | length // 0)'
echo

echo "4. MCP manifest (concierge)"
curl -sf "$BASE/api/mcp/agent-bazar-concierge" | jq '{name, tools: [.tools[].name]}'
echo

echo "5. Agents catalog page"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/agents")
echo "GET /agents → HTTP $CODE"
echo

echo "Done. For chat: set OPENAI_API_KEY in web/.env and test at $BASE/chat"
