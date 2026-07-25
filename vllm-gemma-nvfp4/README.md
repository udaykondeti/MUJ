# vLLM + Gemma 4 12B (NVFP4) on `kirakon`

Serve **Gemma 4 12B** quantized to **NVFP4** with **vLLM**, exposing an
OpenAI-compatible API — tuned for `kirakon`'s **RTX 5060 Ti (16 GB, Blackwell
SM120)**.

NVFP4 is NVIDIA's 4-bit float format with native Blackwell tensor-core support.
The 12B weights compress from ~24 GB (BF16) to **~6.5 GB**, which is what makes a
12B model practical on a 16 GB card. NVFP4 requires a Blackwell GPU (SM100/SM120)
— the 5060 Ti qualifies.

## What's here

| File | Purpose |
|------|---------|
| `.env.example` | All tunables (model, memory, ports, auth). Copy to `.env`. |
| `docker-compose.yml` | **Primary** path — pinned vLLM image with SM120 kernels. |
| `systemd/vllm-gemma.service` | Start the container on boot, restart on failure. |
| `scripts/preflight.sh` | Verify the GPU is Blackwell and has enough VRAM. |
| `scripts/native-setup.sh` | Alternative path — install vLLM into a venv (no Docker). |
| `scripts/native-serve.sh` | Launch vLLM from the venv with the same tuning. |
| `scripts/smoke-test.sh` | Hit `/health`, list models, run one chat completion. |

## Prerequisites on kirakon

- NVIDIA driver **≥ 570** (Blackwell). Check: `nvidia-smi`.
- **Docker** + [`nvidia-container-toolkit`](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html)
  (for the Docker path), **or** Python 3.10–3.12 (for the native path).
- A HuggingFace account with the **Gemma license accepted** on the model page,
  plus a read token — Gemma is gated.

## Quick start (Docker — recommended)

```bash
cd vllm-gemma-nvfp4
./scripts/preflight.sh                 # confirm Blackwell + VRAM + docker runtime

cp .env.example .env
# edit .env: set HF_TOKEN=hf_...  (and API_KEY=... if exposing on the LAN)

docker compose up -d
docker compose logs -f                 # first run downloads ~7 GB; wait for
                                       # "Application startup complete"
./scripts/smoke-test.sh                # verify it answers
```

The API is now at `http://kirakon:8000/v1` (OpenAI-compatible).

### Run it on boot

```bash
sudo cp systemd/vllm-gemma.service /etc/systemd/system/
sudoedit /etc/systemd/system/vllm-gemma.service   # fix WorkingDirectory path
sudo systemctl enable --now vllm-gemma.service
```

## Alternative: native venv (no Docker)

```bash
./scripts/native-setup.sh              # creates .venv, installs vLLM nightly (cu128)
.venv/bin/hf auth login                # paste your HF token
cp .env.example .env                   # edit as above
./scripts/native-serve.sh
```

Nightly is used because Blackwell **SM120** needs vLLM built against CUDA 12.8+;
pin to a released `vllm` version once one works for you.

## Using the server

```bash
curl http://kirakon:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"model":"gemma-4-12b",
       "messages":[{"role":"user","content":"Hello!"}]}'
```

Python (OpenAI SDK):

```python
from openai import OpenAI
client = OpenAI(base_url="http://kirakon:8000/v1", api_key="YOUR_API_KEY")
r = client.chat.completions.create(
    model="gemma-4-12b",
    messages=[{"role": "user", "content": "Hello!"}],
)
print(r.choices[0].message.content)
```

## Tuning for 16 GB (important)

The 16 GB budget is spent on **weights (~6.5 GB) + CUDA context (~1.5 GB) + KV
cache (the rest)**. Defaults in `.env.example` are conservative and known to fit:

| Setting | Default | Notes |
|---------|---------|-------|
| `MAX_MODEL_LEN` | `8192` | Context length. Biggest lever on KV-cache size. |
| `GPU_MEMORY_UTILIZATION` | `0.90` | Leave headroom if kirakon also drives a display. |
| `MAX_NUM_SEQS` | `4` | Concurrent requests; each costs KV cache. |
| `KV_CACHE_DTYPE` | `fp8` | ~Halves KV-cache memory — keep this on 16 GB. |

**Want more context?** Raise `MAX_MODEL_LEN` to `16384`/`32768` **and** drop
`MAX_NUM_SEQS` to `2`. If startup OOMs, lower `MAX_MODEL_LEN` or
`GPU_MEMORY_UTILIZATION` first. Watch usage with `nvidia-smi -l 1` while it warms
up.

## Troubleshooting

- **`CUDA out of memory` at startup** — context/batch too big for 16 GB. Lower
  `MAX_MODEL_LEN`, keep `KV_CACHE_DTYPE=fp8`, or drop `GPU_MEMORY_UTILIZATION`
  to `0.85`.
- **`quantization method ... not supported` / weird NVFP4 errors** — your vLLM
  is too old for SM120. Use the `:nightly` image (Docker) or reinstall from the
  nightly index (native). As a fallback set `QUANTIZATION=modelopt` in `.env`.
- **CUDA-graph / illegal-memory errors on SM120** — add `--enforce-eager` (append
  to the `command:` in compose or the `args` in `native-serve.sh`). Slower, but a
  reliable workaround while SM120 kernels mature.
- **401 pulling the model** — accept the Gemma license on its HF page and make
  sure `HF_TOKEN` is a valid read token.
- **Slow first request** — that's the weight download + CUDA-graph capture. It's
  one-time (cache is persisted via `HF_HOME`).

## Notes

- Auto-detection reads `hf_quant_config.json` from the checkpoint, so
  `QUANTIZATION` is left blank by default and only set if detection fails.
- To swap models, change `MODEL` in `.env` (a HF repo id or a local path) and
  `docker compose up -d` / restart the service.
