# ML-KEM on Basys 3 — Leakage-Resilient Architecture Research

This folder is an unrelated research project living inside this repository at
the repo owner's request. It has nothing to do with the Gamedev.js Jam 2026
game ("Phase Runner") in the rest of this repository — treat the two as
independent projects that happen to share a git history.

## Research question

How small can a fully FIPS-203-compliant ML-KEM accelerator be made on a
resource-constrained Artix-7 FPGA (Xilinx XC7A35T / Digilent Basys 3:
20,800 LUTs, 41,600 FFs, 90 DSP slices, 50×36 kbit BRAM) while remaining
resistant to power/EM side-channel leakage under the specific failure modes
that aggressive hardware resource sharing introduces (glitches,
routing/coupling, time-shared datapaths) — rather than just porting a
generic masking scheme?

## Status

Phase 1 in progress: literature verification of the specific prior-art
claims behind this research angle, a broader prior-art sweep, and a
module-level LUT/FF/BRAM/DSP resource budget against the XC7A35T ceiling.

## Hard constraints of the development environment

These are environment facts, not caveats to work around later:

- **No physical Basys 3 board, oscilloscope, or EM probe is available** in
  the sandbox this project is developed in. Any side-channel "measurement"
  produced here before real hardware validation is a simulated/behavioral
  estimate, always labeled as such — never presented as measured data.
- **No FPGA synthesis toolchain (Vivado) is installed.** Resource figures
  produced before a real synthesis run are literature-grounded estimates,
  not synthesis reports. They need to be confirmed by actually running
  Vivado on real hardware before they go in a paper as results.

## Roadmap

1. Literature verification + prior-art sweep + module-level resource budget
   *(in progress)*
2. Architecture specification: shared datapath, masking scheme, module
   interfaces, LUT budget allocation
3. RTL implementation: Keccak/SHAKE core, NTT/INTT + modular arithmetic
   engine, CBD sampler, controller/FSM, masked arithmetic, top-level
   integration
4. Simulation-based functional verification against FIPS-203 known-answer
   test vectors, plus a behavioral/simulated leakage estimate
5. Synthesis + real hardware bring-up on an actual Basys 3, and real
   power/EM trace acquisition + TVLA — requires physical hardware and
   acquisition equipment this sandbox does not have
6. Paper draft, with every claim traceable to either a cited source or a
   result actually produced in this repo
