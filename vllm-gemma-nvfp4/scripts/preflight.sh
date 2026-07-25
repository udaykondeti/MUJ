#!/usr/bin/env bash
# Preflight checks for serving Gemma 4 12B NVFP4 with vLLM on a Blackwell GPU.
# Verifies the GPU is present, is Blackwell (SM100/SM120), and has enough VRAM.
set -euo pipefail

echo "== GPU =="
if ! command -v nvidia-smi >/dev/null 2>&1; then
  echo "ERROR: nvidia-smi not found. Install the NVIDIA driver first." >&2
  exit 1
fi
nvidia-smi --query-gpu=name,memory.total,driver_version,compute_cap \
  --format=csv,noheader

# Compute capability must be >= 10.0 (Blackwell) for NVFP4.
cc=$(nvidia-smi --query-gpu=compute_cap --format=csv,noheader | head -n1 | tr -d ' ')
major=${cc%%.*}
if [ "${major:-0}" -lt 10 ]; then
  echo "ERROR: compute capability $cc is not Blackwell (need >= 10.0)." >&2
  echo "NVFP4 activation quantization requires SM100 (B200) or SM120 (RTX 50xx / PRO 6000)." >&2
  exit 1
fi
echo "OK: Blackwell GPU (SM${cc/./}) detected — NVFP4 supported."

# VRAM sanity: NVFP4 12B weights (~6.5 GB) + KV cache need headroom.
vram=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits | head -n1)
echo
echo "== VRAM: ${vram} MiB =="
if [ "$vram" -lt 15000 ]; then
  echo "WARN: <16 GB VRAM. Keep MAX_MODEL_LEN small (<=8192) and MAX_NUM_SEQS low." >&2
elif [ "$vram" -lt 20000 ]; then
  echo "OK: 16 GB class. Defaults (8k ctx, kv fp8) fit; push ctx up cautiously."
else
  echo "OK: plenty of VRAM — you can raise MAX_MODEL_LEN significantly."
fi

echo
echo "== Docker + NVIDIA runtime (only needed for the Docker path) =="
if command -v docker >/dev/null 2>&1; then
  if docker info 2>/dev/null | grep -qi nvidia; then
    echo "OK: docker sees the nvidia runtime."
  else
    echo "WARN: nvidia container runtime not detected. Install nvidia-container-toolkit." >&2
  fi
else
  echo "note: docker not installed — use the native (venv) path instead."
fi
echo
echo "Preflight complete."
