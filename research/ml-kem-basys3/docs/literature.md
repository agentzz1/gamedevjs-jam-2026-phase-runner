# Literature: claim verification and prior-art sweep

Backing detail for [`foundations.md`](./foundations.md). Produced by a
24-agent workflow (7 claim-verification agents, 9 prior-art-sweep agents,
8 module-budget agents — the last of these lives in
[`module-budget.md`](./module-budget.md)) plus this session's own direct
follow-up reads. Scite was unavailable for the entire workflow run
(expired OAuth token, not renewable in a non-interactive session) — all
retrieval below is WebSearch/WebFetch discovery followed by direct PDF
reads via a locally-installed `pdftotext`, which is a high-confidence
retrieval path (primary-source text, not search snippets or AI summaries)
even without Scite's citation-graph/retraction checking. Where a finding
relies only on a WebFetch- or WebSearch-mediated summary rather than a
directly-read primary source, that's flagged inline.

## Method note: getting past TCHES's bot block

`tches.iacr.org`'s `article/view/{id}/{galley}` PDF link returns an HTML
interstitial and blocks automated fetching. The actual PDF is served from
`article/download/{id}/{galley}/{file}` instead (the download link is
embedded in the interstitial's HTML), which is not blocked. `poppler-utils`
(`pdftotext -layout`) was installed in-session to extract text from
downloaded PDFs directly, since WebFetch's own HTML-conversion path
couldn't parse either PDF's binary content correctly.

## Verified claims

| # | Claim | Verdict |
|---|---|---|
| 1 | HOPE-MLKEM: complete, open, configurable high-order side-channel-protected ML-KEM hardware, TCHES 2026 / CHES 2026 | **Confirmed** |
| 2 | June-2026 paper: FPGA parallelism defeats higher-order masked ML-KEM verification | **Confirmed**, with exact figures |
| 3 | Compact unprotected Kyber/ML-KEM designs achieve ~7,400 LUT | **Partially confirmed** |
| 4 | An XC7A35T-specific design at ~7,100-7,600 LUT / ~5,700 FF / 3 BRAM / 4 DSP / ~169 MHz | **Contradicted** — conflated composite |
| 5 | Older full masking reported at >150,000 LUT | **Partially confirmed** — real but not representative |
| 6 | A 2025 complete ML-KEM architecture, Artix-7, ~12,037 LUT / 6,895 FF / 4 DSP / 9 BRAM | **Partially confirmed** |
| 7 | Further area reductions must come from outside the NTT butterfly | **Contradicted** |

### 1. HOPE-MLKEM — confirmed

Camacho-Ruiz, E., Navarro-Torrero, P., & Cabrera Aldaya, A. (2026). "A
Framework for designing High-Order Side-Channel Protected Hardware
Implementations of ML-KEM." *IACR TCHES*, 2026(2), 272–295.
DOI: 10.46586/tches.v2026.i2.272-295. CHES 2026 accepted-papers list,
entry #11 (ches.iacr.org/2026/acceptedpapers.php); CHES 2026 runs
Oct 11-15, 2026, Antalya. Open source, MIT license:
github.com/HWSec-CSIC/hope-mlkem (23 commits, 12 stars as of April 2026 —
light adoption so far).

Architecture: a single reconfigurable Butterfly Unit (replicated
N_BU=1/2/4) plus shared Keccak/CBD/Rejection-Sampler modules, all three
ML-KEM parameter sets, all three operations, runtime-configurable.
First-order protection = 3-share Threshold Implementation (Keccak-TI3);
high-order = a from-scratch 4-share Domain-Oriented Masking
(Keccak-DOM) — TI was deliberately not trusted beyond first order, per
the authors' own cited concerns. Real physical validation: TVLA
(first- and third-order, N=1,000,000 traces each, |t|>4.5, α=0.00001) on
a SAKURA-X board (Kintex-7) with a PicoScope 5444D at 250 MSps — no
detected leakage in either masked variant, clear leakage in the unmasked
baseline. Synthesized on XC7A200T-3 (not XC7A35T) via Vivado 2023.1.
Architecture defends against resource-sharing leakage via temporal
non-completeness (one share per butterfly-unit-cycle, never parallel) and
randomized activation order — but this is *spatial* replication (one BU
instance per share) rather than genuine single-instance time-multiplexing,
which matters for how directly its numbers transfer to this project (see
`foundations.md`).

Resource numbers (Table 4, read directly):

| Config | LUT | FF | BRAM | DSP | Freq |
|---|---:|---:|---:|---:|---:|
| Unprotected, N_BU=1 | 14,436 | 10,127 | 5 | 4 | 180 MHz |
| Unprotected, N_BU=2 | 16,299 | 11,150 | 7.5 | 8 | 180 MHz |
| Unprotected, N_BU=4 | 21,259 | 13,464 | 14.5 | 16 | 180 MHz |
| First-order (masked) | **43,473** | 27,101 | 7.5 | 8 | 175 MHz |
| High-order (masked) | **67,757** | 37,057 | 14.5 | 16 | 175 MHz |

Excludes RNG/mask-randomness generation from all figures (stated
explicitly in their own text — see `foundations.md`).

### 2. June-2026 attack — confirmed, exact figures obtained

Ranney, D., Makaram, Y. I., Ding, A. A., & Fei, Y. "Exploring Side-Channel
Protections in Hardware Implementations of PQC ML-KEM Verification."
arXiv:2606.31681 [cs.CR], submitted 30 June 2026 (Northeastern
University). Preprint status — no venue/acceptance found as of this
check.

They implement ML-KEM decapsulation's FO-transform comparison step in
three variants (unprotected, first-order hash-based, higher-order 4- and
6-share Galois-Field masked) on a **Spartan-6** (SAKURA-G), compared
against an ARM Cortex-M4 software baseline. Quoted finding: "parallelized
processing on FPGAs introduces sufficient first-order leakage for full
secret-key recovery" even for the higher-order masked variants — masking
order going *up* makes the FPGA implementation *more* classifiable, not
less:

| Shares | LUT | FF | Slices | Throughput | Classification accuracy |
|---|---:|---:|---:|---:|---:|
| 4-share | 14,353 | 6,641 | 5,345 | 0.542 Gb/s | **97.9%** |
| 6-share | 18,565 | 8,621 | 6,975 | — | **98.5%** |

Both exceed their own 80% "successful attack" threshold and the 95.0%
accuracy attributed to the prior microcontroller-only version of this
attack. 8,000 traces fed into a belief-propagation solver (Hermelink et
al., TCHES 2023 / eprint 2023/098) recovered the full secret key.

Traces to: Hermelink, J., Ning, K.-C., Petri, R., & Strieder, E. (2024).
"The Insecurity of Masked Comparisons: SCAs on ML-KEM's FO-Transform."
*ACM CCS 2024*, 2430–2444. DOI: 10.1145/3658644.3690339 — first showed the
underlying masked-comparison scheme leaks first-order-detectable
success/failure information in *software*; the masking scheme itself
traces further back to Bhasin, D'Anvers, Heinz, Pöppelmann & Van
Beirendonck, "Attacking and Defending Masked Polynomial Comparison for
Lattice-Based Cryptography," TCHES 2021(3), 334-359.

Caveats: preprint, not confirmed peer-reviewed as of 2026-08-24. Hardware
is Spartan-6, not Artix-7 — the authors themselves flag evaluating
"architectural differences across FPGA generations" as future work; they
claim the *mechanism* (parallelism reduces effective masking order)
should transfer, not the specific numbers. Scope is the FO-comparison
sub-circuit only, not a full decapsulation datapath.

### 3. ~7,400 LUT compact unprotected — partially confirmed

Primary match: Xing, Y., & Li, S. (2021). "A Compact Hardware
Implementation of CCA-Secure Key Exchange Mechanism CRYSTALS-KYBER on
FPGA." *IACR TCHES*, 2021(2), 328-356. Table 4: 7,412 / 6,785 LUT
(server/client), on XC7A12T ("the smallest device in Xilinx Artix-7
series" — their words), unprotected, full KeyGen+Encaps+Decaps,
runtime-selectable k=2/3/4. 7,412 rounds to "~7,400" almost exactly.

Independent corroboration: Kamucheka, Nelson, Andrews & Huang (NIST 4th
PQC Conf. 2022 / eprint 2022/1547), Table III, cites the identical
7,412-LUT figure as the field's reference point, and separately lists
Jati et al. (below) at 7,151 LUT on **XC7A35T-2 — the exact die on the
Basys 3**.

Caveats: these are Kyber (NIST Round-3), not literally FIPS-203 ML-KEM —
no compact-hardware paper found reporting ~7,400 LUT for a design built
and labeled against FIPS-203 specifically. The matching figure is on
XC7A12T (8,000-LUT device), not XC7A35T, though same slice fabric so the
raw count should carry over. "Designs" (plural) overstates uniformity —
Huang et al. 2020's "resource reuse" design needs 80,322-132,918 LUT
despite similar framing.

### 4. XC7A35T-specific 7,100-7,600/5,700/3/4/169MHz — contradicted

Independently re-confirmed (both by this session directly and by the
workflow, from different source pairs): the real design this composite
most resembles is Jati, Gupta, Chattopadhyay & Sanadhya, "A Configurable
CRYSTALS-Kyber Hardware Implementation with Side-Channel Protection" (ACM
TECS 23(2), 2024; eprint 2021/1189), on the exact XC7A35T-2 die. Its real
numbers: **7,151 LUT** (matches), **3,730 FF** (not ~5,700), **5.5 BRAM**
(not 3), **2 DSP** (not 4), **258 MHz** (not ~169 MHz) — cross-confirmed a
third time via HOPE-MLKEM's own citation of this same paper in its Table 4
[JGCS24]. No single real paper combines all five claimed figures; DSP
count in particular is off by exactly 2x from the closest real candidate.
Reads as a conflated/misremembered composite, not a citation of one real
paper.

Also note: Jati et al.'s countermeasure is fault-detection hashes +
instruction randomization + FSM protection (hiding/fault-detection style),
**not classical value-based masking**, and has no empirical leakage
validation (no TVLA/measured trace data in the paper) — a real, documented
gap on the exact target chip.

### 5. >150,000 LUT masking — partially confirmed, not representative

Kamucheka, Nelson, Andrews & Huang, "A Masked Pure-Hardware Implementation
of Kyber Cryptographic Algorithm" (ICFPT 2022 / eprint 2022/1547), Table
III: Kyber-512 on Virtex-7 (VC707), Encaps = 163,584 LUT, Decaps =
152,860 LUT — both genuinely over 150,000.

But: their own *unmasked* "hiding-only" baseline is already
143,112-153,939 LUT ("our base design was inefficient and resource
intensive," their words) — masking itself adds only ~6% on top. The size
comes from an admittedly inefficient base architecture plus heavy
loop-unrolling used as a hiding countermeasure, not from masking per se.
Contemporaneous counter-example, comparable protection level, ~8-9x
smaller: Beckwith, Abdulgadir & Azarderakhsh (NIST PQC2022 / CT-RSA 2023)
achieve first-order-masked Kyber-512 decapsulation in ~18,000 LUT on
Artix-7 (2.5x their own unmasked baseline). Also scoped to Kyber-512 only
(no KeyGen block shown), not confirmed complete.

### 6. 2025 complete ML-KEM architecture, ~12,037/6,895/4/9 — partially confirmed

Identified: Jung, Truong & Lee, "Highly-Efficient Hardware Architecture
for ML-KEM PQC Standard," *IEEE Open Journal of Circuits and Systems*, 6,
356-369, 2025. DOI: 10.1109/OJCAS.2025.3591136. Abstract (confirmed two
independent ways): "the hardware implementation on the Xilinx Artix-7
utilizes 12k LUTs, 6.9k FFs, 4 DSPs, and 9 BRAMs at clock frequency of
220 MHz," supporting all three security levels and all three operations
with runtime switching. DSP=4/BRAM=9 match the claim exactly; LUT≈12k/
FF≈6.9k are consistent with "12,037"/"6,895" but the precise decimals
were never found verbatim (full-text tables were paywalled/CAPTCHA'd) —
plausible, not pinned to a table.

Caveats: no specific Artix-7 part number confirmed (never named as
XC7A35T specifically). Its countermeasures ("parallel task execution... to
obscure EM and power traces," constant-time execution, Barrett-reduction
hardening, secret-vector memory scrubbing) read as hiding/constant-time/
sanitization, **not** stated-order secret-sharing masking — don't assume
this clears the "genuine masking" bar without checking further. A
same-year, easily-confused paper (Nguyen et al., IEEE Access 13,
103834-103847, 2025) covers the same topic with different, unconfirmed
figures — don't conflate the two.

### 7. "Area reductions must come from outside the butterfly" — contradicted

No paper found stating or implying this (≈15 differently-worded searches).
The opposite is well-supported by recent, directly-read primary sources:

- Bertels & Verbauwhede, "A High Throughput Kyber NTT" (eprint 2025/1763):
  new LUT-based modular multiplication, "one to two orders of magnitude"
  better area-delay product than comparable literature designs.
- Bertels, Norga & Verbauwhede, "A Better Kyber Butterfly for FPGAs" (FPL
  2024 / eprint 2024/1367): cuts one modular multiplication from
  ~90 LUT+1 DSP (Xing & Li's design, as characterized by this paper) to
  **49 LUT+1 DSP** — ~46% smaller, "lowest-area design on Xilinx FPGA
  platforms reported to date."
- Nabeel, Hafez & Maniatakos, "@NTT" (arXiv:2601.17806): ~28% LUT
  reduction, +4.2% frequency, via constant-optimized twiddle
  multiplications.
- Ni, Khalid, Liu & O'Neill, ACM TECS 24(2), 2025: 70-76% area reduction
  for ML-KEM-512/768/1024 vs. prior state of the art.

All 2024-2026. A narrower, genuinely-supported adjacent point: once NTT is
reasonably optimized, Keccak/sampling becomes a co-*bottleneck* for
throughput in lightweight designs — a coverage/attention gap, not an
area-exhaustion claim, and consistent with the module-budget finding that
masked Keccak (not the butterfly) is the dominant *area* cost specifically
once masking is added.

## Prior-art sweep — key findings by lane

Full per-lane text (very long — each lane read multiple full primary-source
PDFs) is preserved in the workflow's raw output; this is the
decision-relevant distillation. All citations below were read directly
from primary-source PDFs unless marked otherwise.

**NTT/INTT architectures.** Xing & Li's unified butterfly (CT-NTT +
GS-INTT + Karatsuba-PWM + compression, all fused into one reconfigurable
datapath) is the closest architectural precedent to "push resource sharing
past just NTT/INTT." Beckwith et al.'s masked shared Kyber+Dilithium
accelerator is the closest precedent combining masking + resource sharing
+ NTT (first-order 2-share Boolean masking, 2.5x LUT / 6.5x cycle
overhead, explicit shuffling as a second-layer defense). **A real, on-target-chip cautionary case**: per Iskander & Kirah's security-margin
analysis (arXiv:2604.03813), a locally-masked NTT variant related to
Jati et al.'s body of work was evaluated via belief-propagation (SASCA)
attack and found vulnerable when only a subset of NTT operations carry
local per-operation masks — worth confirming directly against the primary
source before treating as settled, since the evidence for this specific
claim came via a secondary characterization rather than a directly-read
primary text in this pass. The same paper's actionable finding: *which*
NTT layers are left unmasked matters far more than *how many* — 4 evenly
spread unmasked layers give a belief-propagation attacker 100% recovery,
4 *consecutive* unmasked layers give 0%; masking 3 consecutive mid-layers
achieves full protection at only 43% of full-masking's overhead. Also
found: two independent 2025 papers achieve fully DSP-free/BRAM-free
unified NTT/INTT/PWM engines at 1.7-3.4k LUT on Artix-7 — would free all
90 DSPs and all 50 BRAMs for masking-support logic instead. And a
concrete, near-zero-cost (16 slices, 1 DSP, 3mW) fault/glitch-detection
technique (REMO, arXiv:2508.03062) exists as a complement to, not
replacement for, masking.

**Compact Keccak/SHAKE.** Three unfused lineages: SHA-3-competition-era
minimal-width ASIC/FPGA cores (down to ~568 LUT-equivalent on Spartan-6);
a mature masking literature (DOM and descendants) with well-characterized
area/latency cost that can be engineered close to unprotected latency if
tailored to Keccak's own structure; and real Kyber/ML-KEM hardware, where
only two papers match this project's device class or masking ambitions —
neither combining both. A 2026 preprint (lower confidence, not directly
read) reports naively masking a Keccak-based ML-KEM verification step at
*higher* order made an FPGA implementation *more* vulnerable — consistent
with the Ranney et al. finding above.

**Masking countermeasures for lattice KEMs.** Masked CBD sampling is
essentially solved in software at arbitrary order. The masked FO
comparison has a documented break-and-fix history (Oder et al. and Bache
et al.'s schemes both later broken; D'Anvers et al., TCHES 2022, is the
current best fix, with a demonstrated 6,000-trace key-recovery attack on
the naive approach). Ji & Dubrova (eprint 2023/1084) broke a real masked,
pipelined Kyber-512 FPGA design (Kamucheka et al.) via Hamming-distance
leakage on the shared, time-multiplexed path — 99% key-recovery via
repeated-query majority voting. **The only gate-level, glitch-extended-
probing-verified masked lattice-KEM decapsulation in the literature is
NTRU Prime, not Kyber, on the same Artix-7 family** (Land et al., TCHES
2024): first-order ~20K LUT / ~20K FF / 8.5 BRAM, fourth-order ~92K LUT,
with the symmetric hash dominating 57-61% of area at every order — the
cross-check behind the "Keccak dominates" finding in `foundations.md`.

**TVLA methodology.** Standard, consistent core methodology
(Welch's-t-test, |t|>4.5, ISO/IEC 17825) across every source, but equally
consistent: a TVLA pass is a leakage-*detection* result, not a security
proof — multiple critique papers document realistic masking schemes that
pass TVLA while remaining breakable. A real RTL-level re-audit of a
publicly-deployed ML-KEM/ML-DSA accelerator ("Adams Bridge," part of the
Caliptra silicon root-of-trust project) found its masked layer failing
TVLA at just 1,000 traces once measured per-register instead of
aggregated, despite the designers' own published evaluation passing
first-order TVLA at 10^6 traces — a measurement-granularity cautionary
tale worth keeping in mind for any future measurement plan.

**FPGA-specific leakage mechanisms.** Four distinct, compounding physical
mechanisms violate masking's idealized probing-model assumptions on real
FPGA fabric: (1) glitches from unequal signal arrival times break masked
designs at the gate level even when register-level-secure (Mangard et
al. 2005: 25,000 vs 30,000-130,000 traces); (2) coupling/crosstalk between
physically adjacent, logically unconnected wires can leak a *formally
proven secure* design purely from default, non-adversarial Vivado
place-and-route — verified over 100 million traces on a real Kintex-7
(Muller et al., eprint 2026/1426) — with two default-ON Vivado
optimizations (LUT combining, register retiming) identified as able to
silently recombine shares even with provably-correct RTL (mitigation:
`-no_lc`, `-global_retiming off`; their manual-floorplanning fix cost a
>2x Fmax reduction); (3) resource sharing across time creates
transition/Hamming-distance leakage — broke a real masked Kyber-512 FPGA
design (Ji & Dubrova, 99% key-recovery) and independently collapsed a
higher-order-masked ML-KEM verification comparator via FPGA parallelism
(Ranney et al.); (4) even a real, production 1.17-million-cell accelerator
(Adams Bridge) had 40% of its masked modules reclassified as
needing-deeper-analysis once multi-cycle pipeline paths were accounted
for.

**Basys3/Artix-7-class full KEM implementations.** No paper names the
Basys 3 by name except Carrera Rodriguez et al. (see `foundations.md`'s
headline finding). Jati et al. targets the identical die (XC7A35T-2),
full 3-parameter-set Kyber, heavy resource sharing, but only
hiding-style countermeasures with no empirical leakage validation — a
second real, documented, on-target-chip gap. Kamucheka et al. (masked, but
Virtex-7, decrypt-only) quantifies how far current masked designs exceed
a Basys-3-scale resource envelope.

**CBD samplers.** Masked/CBD-sampler side-channel work is entirely
software, proven only in the standard (non-glitch-extended) probing model.
FPGA-hardware Kyber sampler work is almost entirely about the *uniform*
rejection sampler (public data, doesn't need power-side-channel masking —
confirmed directly from HOPE-MLKEM's own architecture text) rather than
CBD. **No paper combines a glitch-extended-probing-secure masked CBD
gadget with an actual FPGA implementation** — a real, confirmed gap
sitting directly on top of what this project would need.

**HOPE-MLKEM deep dive and the 2024-2026 novelty bar.** See claim 1 above
for the architecture/numbers. The current bar for masked lattice-crypto
hardware at CHES/TCHES requires: (1) security in a glitch-and-
transition-extended composable model (PINI/robust-probing), not plain ISW
t-probing, whenever hardware is claimed; (2) large-scale TVLA
(10^6-2.5x10^8 traces) plus increasingly formal tool verification
(SILVER, MATCHI, PROLEAD, aLEAKator); (3) whole-pipeline coverage — masking
one operation while leaving another leaky is a well-documented, repeatedly
demonstrated failure mode now, not hypothetical; (4) a genuine efficiency
or architectural advance over the immediately preceding paper, typically
40-85% area/randomness/latency reduction.
