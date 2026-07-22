# Local AI PC — Build Notes & Decisions

_Last updated: 2026-07-22_

## Goal
Primary goal is **local AI** (running LLMs / image generation locally). Secondary: gaming, and running the MUJ Secure Exam Browser (SEB) for practical exams.

## Current system ("kirakon")
| Part | Detail | Verdict |
|------|--------|---------|
| GPU | **NVIDIA RTX 5060 Ti 16 GB** (16311 MiB) | 🌟 Keep — great for local AI; the part that matters most |
| Motherboard | Gigabyte **Z170M-D3H** (LGA1151, 100-series, ~2015) | Dead-end platform |
| CPU | Intel **Core i5-6402P** (6th gen Skylake, 4c/4t, 2.8 GHz) | Ancient (2016) |
| RAM | **32 GB DDR4-2400** (2×16 GB) | OK capacity, slow; **DDR4 will NOT carry to a DDR5 board** |
| PSU | 850 W 80+ Gold | Keep — plenty |
| Cooler | Tower cooler (AM4/AM5 mount reusable) | Keep |

## Key facts / constraints
- **CPU + board + RAM are a locked triple.** Can't buy a modern CPU and add DDR5 board/RAM later — they must be bought together as one matched set.
- Z170 is **LGA1151 + DDR4**: best CPU it can ever take is a 7th-gen i7-7700K (pointless). No modern CPU fits. DDR4 can't move to DDR5.
- Moving forward = **full platform swap** (new CPU + AM5 board + DDR5 RAM), **keeping only the GPU/PSU/cooler**.
- Intel i7 ≠ AMD board. AM5 boards take only AMD Ryzen (but upgradeable to Ryzen 7/9 later — AM5 supported through 2027+).

## Local AI — can run NOW (no upgrade needed)
For inference the GPU does ~all the work; the old CPU/PCIe 3.0 barely matters (only slightly slower model loading). Current system already handles anything fitting in **16 GB VRAM**:
- LLMs: 7B–8B full speed, 13–14B quantized (Ollama / LM Studio / llama.cpp)
- Image gen: Stable Diffusion / ComfyUI
- Small LoRA fine-tunes

**Start experimenting now. Upgrade only when hitting the 16 GB VRAM wall / wanting bigger models via RAM offload.**

## Priority order for local AI spending
**VRAM ≫ system RAM > fast/large SSD > CPU** (CPU matters least for GPU inference).

## Recommended upgrade (when ready) — AM5 platform, bought as a set
| Part | Pick | Notes |
|------|------|-------|
| CPU | **Ryzen 5 7600** (~₹17–18k, cooler incl.) or **7500F** (~₹16k, use own cooler) | Reasonable base; upgrade to Ryzen 7 7700 / 7800X3D / 9800X3D or Ryzen 9 later on same board |
| Board | **B650** (e.g. ASRock B650 Pro RS ATX ~₹17.3k, or a cheaper B650M) | AM5, DDR5, BIOS Flashback for future CPUs |
| RAM | **64 GB (2×32) DDR5-6000 CL30 EXPO** for AI (or 32 GB min) | The AI-relevant upgrade — enables offloading big models. G.Skill Flare X5 / Kingston Fury Beast / Corsair Vengeance |
| SSD | 1–2 TB NVMe Gen4 | Model files are large (7B ≈ 4–8 GB, 70B quantized ≈ 40 GB) |
| GPU/PSU/cooler | Reuse existing | — |

- Buy **32 GB** in 2×16 (or **64 GB** in 2×32) — never fill all 4 DIMM slots on AM5 (drops speed).
- Enable **EXPO** in BIOS or RAM idles at 4800 instead of 6000.
- Ryzen sweet spot is **DDR5-6000 CL30** (don't buy faster expecting gains).

## Exam context (MUJ Online, Roll 261410609980)
- Mock exam: **24-Jul-2026**, 12:00–15:00 IST (mandatory — real SEB test).
- Practicals: **DCA6132 RDBMS 18-Aug**, **DCA6133 C 19-Aug**, **DCA6134 Python 20-Aug**.
- SEB requires **native Windows 10/11 desktop** (not a VM, not Linux/Mac), webcam + mic ON throughout, antivirus disable-able. Runs on AMD fine (fTPM → TPM 2.0).
- Current PC runs Linux → for the proctored exam need Windows, or **rent an i5 laptop** (built-in webcam/mic; ~₹3–6k for 2–3 months). RentoMojo is legit but mixed reviews (slow deposit refunds, KYC leak history) — document condition, small deposit, short term. A cheap refurb i5 laptop (~₹20–25k, owned) avoids rental hassle.

## Decision log
- **2026-07-22:** Defer the AM5 upgrade (CPU + board + DDR5) to the future. Keep the current system (i5-6402P / Z170 / 32 GB DDR4 / RTX 5060 Ti) for now — local AI already works on the 5060 Ti for anything fitting in 16 GB VRAM, so no spend needed yet.
  - Current board (Z170M-D3H, LGA1151) accepts only Intel 6th/7th-gen CPUs (max i7-7700K) — not worth upgrading; no Ryzen and no Windows 11 possible on it.
  - When upgrading: buy **Ryzen 9 7900 + B650 board + DDR5** together as one set (can't split across time), reuse GPU/PSU/cooler.
  - RAM plan: start with **1×16 GB DDR5-6000 CL30 EXPO**, add a matching 1×16 GB later for 2×16 = 32 GB (avoids the 4-DIMM speed penalty on AM5).
  - Board depends on case size: **4 rear slots = micro-ATX → Gigabyte B650M Aorus Elite AX ICE (~₹21.7k)**; **7 slots = ATX → Gigabyte B650 Aorus Elite AX V2 (~₹24k)**.

## Open decisions
- When to actually pull the trigger on the AM5 upgrade (driven by hitting the 16 GB VRAM wall / wanting a modern base).
- Windows-for-exam approach: dual-boot Windows 10 on current PC (free, CPU supports it), rent a laptop, or buy a cheap refurb laptop.
- Confirm case size (4 vs 7 rear slots) before buying an AM5 board.
