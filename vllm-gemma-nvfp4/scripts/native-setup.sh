#!/usr/bin/env bash
# Native (no-Docker) install of vLLM with Blackwell/SM120 support into a venv.
# Use this only if you prefer not to run the Docker image. Requires a recent
# NVIDIA driver (>= 570) and Python 3.10-3.12 on the host.
set -euo pipefail

cd "$(dirname "$0")/.."
VENV=${VENV:-.venv}

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 not found." >&2; exit 1
fi

echo "== Creating venv at ${VENV} =="
python3 -m venv "${VENV}"
# shellcheck disable=SC1091
. "${VENV}/bin/activate"
python -m pip install --upgrade pip wheel

# vLLM ships CUDA wheels. For Blackwell (SM120) you need a build compiled with
# CUDA 12.8+. Nightly is the safest bet until your target release is out.
# hf_transfer speeds up the ~7 GB weight download.
echo "== Installing vLLM (nightly, cu128) + tooling =="
python -m pip install --pre vllm \
  --extra-index-url https://wheels.vllm.ai/nightly
python -m pip install "huggingface_hub[cli]" hf_transfer

echo
echo "Installed vLLM version:"
python -c "import vllm; print(vllm.__version__)"
echo
echo "Done. Log in to HuggingFace (once) with:  ${VENV}/bin/hf auth login"
echo "Then start the server with:  ./scripts/native-serve.sh"
