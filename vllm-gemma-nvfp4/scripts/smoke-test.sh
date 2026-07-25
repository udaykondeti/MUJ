#!/usr/bin/env bash
# Smoke-test the running vLLM server: check /health, list models, and run one
# chat completion. Reads PORT / API_KEY / SERVED_MODEL_NAME from .env if present.
set -euo pipefail

cd "$(dirname "$0")/.."
[ -f .env ] && set -a && . ./.env && set +a

PORT=${PORT:-8000}
BASE="http://localhost:${PORT}"
MODEL_NAME=${SERVED_MODEL_NAME:-gemma-4-12b}
AUTH=()
[ -n "${API_KEY:-}" ] && AUTH=(-H "Authorization: Bearer ${API_KEY}")

echo "== /health =="
curl -fsS "${BASE}/health" && echo "  -> OK" || { echo "server not healthy" >&2; exit 1; }

echo
echo "== /v1/models =="
curl -fsS "${AUTH[@]}" "${BASE}/v1/models"

echo
echo "== chat completion =="
curl -fsS "${AUTH[@]}" "${BASE}/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"${MODEL_NAME}\",
    \"messages\": [
      {\"role\": \"user\", \"content\": \"In one sentence, what is NVFP4?\"}
    ],
    \"max_tokens\": 128,
    \"temperature\": 0.7
  }"
echo
echo "Smoke test done."
