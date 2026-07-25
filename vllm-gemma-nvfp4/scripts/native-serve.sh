#!/usr/bin/env bash
# Launch vLLM natively (venv) with the same 16 GB-tuned settings as the Docker
# path. Reads configuration from .env. Run ./scripts/native-setup.sh first.
set -euo pipefail

cd "$(dirname "$0")/.."
VENV=${VENV:-.venv}
[ -f .env ] && set -a && . ./.env && set +a

if [ ! -d "${VENV}" ]; then
  echo "ERROR: ${VENV} missing — run ./scripts/native-setup.sh first." >&2
  exit 1
fi
# shellcheck disable=SC1091
. "${VENV}/bin/activate"

export HUGGING_FACE_HUB_TOKEN="${HF_TOKEN:-}"
export HF_HOME="${HF_HOME:-$HOME/.cache/huggingface}"
export HF_HUB_ENABLE_HF_TRANSFER=1
export VLLM_ATTENTION_BACKEND="${VLLM_ATTENTION_BACKEND:-FLASHINFER}"

args=(
  --model "${MODEL:-AxionML/Gemma-4-12B-NVFP4}"
  --served-model-name "${SERVED_MODEL_NAME:-gemma-4-12b}"
  --host "${HOST:-0.0.0.0}"
  --port "${PORT:-8000}"
  --max-model-len "${MAX_MODEL_LEN:-8192}"
  --gpu-memory-utilization "${GPU_MEMORY_UTILIZATION:-0.90}"
  --max-num-seqs "${MAX_NUM_SEQS:-4}"
  --max-num-batched-tokens "${MAX_NUM_BATCHED_TOKENS:-4096}"
  --kv-cache-dtype "${KV_CACHE_DTYPE:-fp8}"
  --dtype "${DTYPE:-bfloat16}"
)
[ -n "${API_KEY:-}" ]       && args+=(--api-key "${API_KEY}")
[ -n "${QUANTIZATION:-}" ]  && args+=(--quantization "${QUANTIZATION}")

echo "vllm serve ${args[*]}"
exec vllm serve "${args[@]}"
