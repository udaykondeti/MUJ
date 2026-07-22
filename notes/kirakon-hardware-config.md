# kirakon — Hardware Configuration

_Captured: 2026-07-22_

## Summary
| Component | Value |
|-----------|-------|
| Hostname | kirakon |
| Motherboard | Gigabyte Z170M-D3H-CF (LGA1151, Intel 100-series) |
| CPU | Intel Core i5-6402P @ 2.80GHz (6th gen Skylake, 4c/4t) |
| RAM | 32 GB total — 2 × 16 GB DDR4-2400 |
| GPU | NVIDIA GeForce RTX 5060 Ti, 16 GB (16311 MiB) |
| OS | Linux |

## Raw command output

```
kirakon@kirakon:~$ echo "=== BOARD ==="; sudo dmidecode -t baseboard | grep -E "Manufacturer|Product Name"; \
echo "=== CPU ==="; lscpu | grep -E "Model name|Socket"; \
echo "=== RAM ==="; sudo dmidecode -t memory | grep -E "Size|Type:|Speed" | grep -v "No Module\|Unknown"; \
echo "=== GPU ==="; (nvidia-smi --query-gpu=name,memory.total --format=csv 2>/dev/null || lspci | grep -i vga)
=== BOARD ===
	Manufacturer: Gigabyte Technology Co., Ltd.
	Product Name: Z170M-D3H-CF
=== CPU ===
Model name:                              Intel(R) Core(TM) i5-6402P CPU @ 2.80GHz
Socket(s):                               1
=== RAM ===
	Error Correction Type: None
	Size: 16 GB
	Type: DDR4
	Speed: 2400 MT/s
	Configured Memory Speed: 2400 MT/s
	Size: 16 GB
	Type: DDR4
	Speed: 2400 MT/s
	Configured Memory Speed: 2400 MT/s
=== GPU ===
name, memory.total [MiB]
NVIDIA GeForce RTX 5060 Ti, 16311 MiB
kirakon@kirakon:~$
```

## Notes
- Socket: **LGA1151** (Z170 chipset) — accepts only 6th/7th-gen Intel; max upgrade is i7-7700K (dead-end platform).
- RAM: **DDR4** — will not carry to a future DDR5/AM5 platform.
- Keep for any future build: **GPU (RTX 5060 Ti 16 GB)**, 850 W Gold PSU, tower cooler.
- See `notes/local-ai-pc-build.md` for the upgrade plan and local-AI recommendations.
