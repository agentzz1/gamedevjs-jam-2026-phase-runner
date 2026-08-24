# Module-level resource budget

Backing detail for [`foundations.md`](./foundations.md). Eight modules,
each dimensioned by an independent literature-research agent against the
XC7A35T's 20,800 LUT / 41,600 FF / 90 DSP / 50×36Kb-BRAM budget. Every
number is a literature-derived estimate or a directly-sourced figure from
a real design — none is measured or synthesized by this project. Where a
module has no directly-reported literature figure for its exact scope,
that's stated explicitly rather than left implicit; treat those lines as
lower-confidence than the ones anchored to a real paper's own table.

## Summary

| Module | Unmasked LUT | First-order masked LUT | Binding resource | Confidence |
|---|---:|---:|---|---|
| Keccak/SHAKE core | ~800-2,900 | **16,293** (measured, HOPE-MLKEM) | LUT — by far the dominant module | High (real design) |
| NTT/INTT/ModMult engine | ~800-2,600 | ~2,000-5,500 (up to 6-9k if formally verified) | LUT, secondarily FF | Medium |
| CBD/rejection-sampling | ~300-750 | ~500-1,900 (extrapolated — no direct data exists) | LUT | Low (no direct source) |
| Controller/FSM + UART | 600-2,200 | (included in above) | — | Medium (UART part unsourced) |
| Memory (BRAM) allocation | 600-1,800 LUT / 3-6.5 BRAM | 800-3,200 LUT / 5-10 BRAM | Not BRAM — LUT/FF glue around it | Medium |
| **Masking overhead (the delta itself)** | — | **+9,000 to +28,000** (central ~10-16k if Keccak is lighter-masked) | LUT | High for the anchor points, wide range |
| RNG/PRNG for mask randomness | 150-2,500 (n-dependent) | same — excluded from every other module's figures | LUT, if masked-Keccak ends up wide | Medium on multiplier, low on n |
| Top-level integration/glue | 800-4,500 | same | LUT, trending FF≥LUT | Low (derived, not sourced) |

Summing central (not worst-case) first-order estimates across all eight
lines lands around **~25,000-26,000 LUT** — roughly **1.2-1.3x** the
XC7A35T's 20,800-LUT budget. That's a materially tighter gap than a naive
comparison to HOPE-MLKEM's whole-system first-order number (43,473 LUT,
~2.1x) suggests, because HOPE-MLKEM's architecture (full spatial
replication per share) isn't the leanest possible option for every module,
and because RNG cost is excluded from its headline figure. It's still
over budget, though — see risk notes below for what would need to give.

BRAM and DSP are not binding anywhere in this budget (every module stays
under ~20% of either device-wide resource); this matches every comparable
design surveyed across the whole literature sweep. **LUT is the sole
binding constraint**, with FF becoming a secondary concern specifically
for masking/glitch-isolation logic (barrier registers are FF-heavy,
consistently ≥1:1 FF:LUT in every masked design found, vs. <1:1 for
ordinary combinational logic).

## Keccak-f[1600] / SHAKE-128/256 core

**This is the single most load-bearing number in the whole budget.**
HOPE-MLKEM's real, measured Artix-7-family figures: unmasked round-based
~2,463 LUT (via Saarinen's SLotH core, eprint 2024/367, which HOPE-MLKEM
explicitly reuses rather than building custom); **first-order (3-share TI)
= 16,293 LUT / 4,814 FF — ~78% of the entire XC7A35T budget by itself**;
high-order (4-share DOM) = **27,035 LUT / 6,414 FF — exceeds the entire
device budget alone**, full stop.

That's ~6.6x overhead at first order versus the unmasked baseline, far
higher than ASIC-gate-equivalent masking literature would suggest (DOM-
Keccak ASIC results run only ~2-2.4x overhead) — plausibly because LUT6
granularity is a poor match for the narrow 1-2-bit masked-AND/XOR gadgets
TI/DOM constructions use, though this specific explanation isn't
independently confirmed.

This module is also the literal architecture this project's threat model
targets: one small ALU/XOR-rotate-AND block reused across all 25 state
lanes, all 24 rounds, and (once masked) all shares sequentially — the
exact "resource sharing across time" pattern shown to break masked
designs via glitches (Mangard et al. 2005) and via Hamming-distance
leakage on real masked FPGA hardware (Ji & Dubrova, 99% key-recovery).
Do not leave it unmasked as a shortcut: Ranney et al.'s 2026 finding
(`literature.md`, claim 2) shows FPGA-parallelized Keccak-based
verification logic leaks first-order-exploitable information even when
nominally protected.

DSP = 0 with high confidence in every scenario (Keccak-f[1600] is
exclusively XOR/AND/NOT/rotate — no multiply-accumulate anywhere in the
primitive).

## NTT/INTT + modular butterfly/ModMult engine

Six independent Artix-7 standalone-engine figures cluster at 800-2,600
LUT unmasked (KiD: 799 LUT; Bisheh-Niasar et al.: 801 LUT; HOPE-MLKEM's
own Butterfly Unit: 1,513 LUT — the closest architectural match to "one
shared datapath for NTT+INTT+PWM+add/sub across every parameter set and
operation").

Masking this module is algebraically cheaper than a generic gadget port:
every point-wise multiplication in ML-KEM multiplies a *public* operand
against a *secret-share* operand, never secret×secret, so no ISW/DOM-style
secure-multiplication gadget is needed in principle — each share can pass
through the same public-coefficient operations independently. Central
first-order estimate: ~2,000-4,000 LUT (roughly 1.8-3.5x the unmasked
baseline, far gentler than Keccak's ~6.6x).

But it isn't free on a *genuinely* time-multiplexed single physical
datapath (this project's stated goal, as opposed to HOPE-MLKEM's actual
mitigation of replicating a whole Butterfly Unit per share): if shares
pass through the same registers/MUX/adder on consecutive cycles, a glitch
or transition at the share boundary can leak the Hamming *distance*
between successive shares, correlating with the secret even though no
single share alone leaks. **No paper in the entire sweep combines
"aggressively time-multiplexed single-instance masked NTT" with
"glitch-extended verification" for ML-KEM** — this component of the
estimate is reasoned, not literature-reported. Upside-risk cross-check:
NTRU Prime's genuinely glitch-extended-verified masked arithmetic (Land et
al.) implies ~7,800-8,600 LUT if the project needs that level of rigor
rather than HOPE-MLKEM's replication-plus-empirical-TVLA approach — this
is the basis for the "could run 6,000-9,000 LUT" upside flagged in the
summary table.

**Directly relevant, same-target-board finding**: Carrera Rodriguez,
Valea, Bruguier & Benoit (eprint 2024/1194) built masking-*readiness*
infrastructure (widened memory words, masking-control unit) into a shared
NTT engine — 3,651 LUT/1,430 FF/6 BRAM/4 DSP with masking *disabled*, 44%
to 356% more than unprotected comparables purely from configurability
overhead — and then physically measured their actual (non-masking,
randomization-only) countermeasure on a **real Basys-3 XC7A35TCPG236**
with a Tektronix MSO64 and Langer EM probe: it **fails non-specific
t-tests at every setting tried**. See `foundations.md` for why this is
the project's best available attack-then-fix anchor. (Note: their
synthesis figures above are reported for XC7A100T-3; confirm which
configuration the physical Basys-3 measurement actually used before
citing specific numbers together.)

## CBD sampler / rejection-sampling + PRF-to-noise pipeline

Small in absolute terms: three independent Artix-7 data points put a
complete unmasked uniform rejection sampler at 106-246 LUT / 79-141 FF
(Baidya et al., arXiv:2505.01782, read in full, is the most detailed:
their own sub-block breakdown shows the actual extract-and-compare
arithmetic is only ~11-22 LUT, the rest is buffering/control — and
buffering uses LUT-based distributed RAM, not a wide flip-flop shift
register, resolving an initial concern about FF cost).

One clean, load-bearing simplification, confirmed directly from
HOPE-MLKEM's own architecture text: "public operations, such as the
generation of the matrix A-hat in the RS module, operate entirely on the
blue path using the public seed (rho), maintaining physical and logical
isolation from the secret data path" — **the uniform-sampling half of this
module doesn't need power-side-channel masking at all**, only FIPS-203's
own constant-time/bounded-iteration hardening. All masking burden
concentrates on the CBD half (secret/noise vectors s, e, y, e1, e2).

**No paper anywhere reports an actual synthesized, glitch-extended-
verified masked CBD sampler's area in isolation** — confirmed by reading
HOPE-MLKEM cover to cover (the closest possible source) plus this
project's own sweep. HOPE-MLKEM itself computed and rejected the "obvious"
approach (scaling a real 2nd-order-secure Boolean-to-arithmetic gadget,
Shahmirzadi & Hutter CiC 2024, to 34 parallel instances: 47,430 LUT / 416
DSP *per share* — their own word: "prohibitive") and built a cheaper
Secure-Double-Rate-Register scheme instead, but never reports *that*
scheme's own area. Both masked-CBD estimates in the summary table (SDRR-
style ~500-1,200 LUT; composable-gadget-style ~700-1,900 LUT depending on
order) are this project's own extrapolations, not literature-measured
figures — treat as genuinely uncertain in both directions.

## Controller / FSM + UART host interface

Well-bounded: 600-2,200 LUT, point estimate ~1,000-1,200 (3-11% of
budget). Two genuinely XC7A35T-class anchors: Jati et al.'s Harvard-
architecture instruction-set control plane (Fetch+Decode = 150 LUT/168 FF
bare; their own stated SCA-hardening overhead is "<5% of total area," ~
260-360 LUT, for Fisher-Yates address randomization + duplicate FSMs +
checksum-verified fetch); HOPE-MLKEM's converging microcoded pattern
(ROM-stored control words, plus the "temporal non-completeness" scheduler
that randomizes replicated-unit activation order — a real, small,
additional control cost this project's masking strategy will need).

UART PHY specifically has **no literature grounding at all** — every
retrieval path (product-guide fetch, GitHub search, WebSearch) failed or
returned unciteable figures. The ~150-350 LUT folded into the range above
is first-principles engineering judgment (baud counter, RX/TX shift
registers, framing FSM), not a retrieved number. Re-derive once RTL
exists.

DSP=0 with high confidence, fine-grained-confirmed by Jati et al.'s own
per-block table (every control-plane row shows 0 DSP; only the arithmetic
row uses DSPs).

## On-chip memory (BRAM) allocation

BRAM itself is comfortably never the binding resource here (3-14.5
BRAM36 across every real design found, against a 50-block budget). Real
anchor: HOPE-MLKEM's Butterfly Unit uses 2.5 BRAM36 (two 24×1024 true-
dual-port RAMs); three independent whole-KEM designs converge on 3-6.5
BRAM36 for a complete unmasked core, including Jati et al. on the exact
XC7A35T-2 die (5.5-6.5 BRAM36).

The LUT/FF cost *around* the memory (address generation, port
arbitration, bit-packing glue) is this project's own decomposition, not a
directly-isolated literature figure — flagged as the least-confident part
of this module's estimate. One concrete, free area-saving note from
reading FIPS 203's own encoding formulas directly: `dk` literally
concatenates a full copy of `ek` inside it (`dk = dkPKE||ek||H(ek)||z`) —
reusing one physical buffer for both roles saves real BRAM at zero
functional cost.

A real precedent for *not* time-multiplexing one physical BRAM port
across shares to save area: Ji & Dubrova broke exactly that pattern
(Kamucheka et al.'s shared, time-multiplexed message-decode memory) via
Hamming-distance leakage, 99% key-recovery via repeated-query majority
voting.

## Masking overhead (the incremental delta itself)

This is the module that decides project feasibility. Computed as a
literal delta (masked total − unmasked total at matched configuration),
not an absolute size, to avoid conflating this cost with the base
arithmetic it sits on top of.

HOPE-MLKEM's own numbers give the cleanest real delta: first-order
(N_BU=2) = **+27,174 LUT / +15,951 FF** over the matched unmasked
baseline, of which **+16,293 LUT is Keccak-TI3 specifically** — leaving a
"non-Keccak remainder" (arithmetic share-separation, CBD's SDRR masking,
control/FSM growth, randomness distribution) of **~10,881 LUT**. Land et
al.'s independent NTRU Prime design corroborates the Keccak/hash-dominance
shape (57-61% of area at every order, nearly identical to HOPE-MLKEM's
~60%) but shows much steeper order-scaling (4.6x from 1st to 4th order,
vs. HOPE-MLKEM's 1.7x from 1st to 3rd) — a reminder that scaling steepness
is construction-dependent, not a fixed law.

**Against the XC7A35T's 20,800-LUT budget: even the smallest full-rigor
masking delta found in the literature (+27,174 LUT, HOPE-MLKEM
first-order) exceeds the device's entire capacity by ~31% — before
counting a single LUT of the base arithmetic/Keccak/CBD/control it sits
on top of.** No published design demonstrates full-rigor D-share masking
of a resource-shared ML-KEM-class datapath fitting a device this small.
The low end of the range (~10,000 LUT, per Beckwith et al.'s narrower/
less-formally-rigorous masking) should be read as an aspirational
engineering target, not a number backed by an existing working design at
this device scale — see `foundations.md` for what that gap likely
represents and why it's a legitimate research question rather than just
an obstacle.

One genuinely promising, unproven lever: Dilip Kumar et al.'s "Time
Sharing" technique (TCHES 2024, eprint 2024/925) — a formally-proven
first-order glitch-extended PINI-secure construction that separates
shares *in time* while staying single-cycle, reporting ~3-4x area
reduction on block ciphers (AES S-box, PRINCE). Never demonstrated on
Keccak or lattice/NTT arithmetic — adapting it to Keccak's χ-layer (the
dominant cost driver) would be a real research contribution, not a
citable result yet.

DSP tail risk worth flagging explicitly: if CBD's Boolean-to-Arithmetic
conversion uses fully composable algebraic gadgets rather than SDRR, DSP
cost can spike by roughly two orders of magnitude (HOPE-MLKEM's own
authors computed ~416 DSP for that path and rejected it as "prohibitive"
— over 4x the entire 90-DSP budget by itself).

## RNG/PRNG for mask randomness

**Excluded from every other module's headline figures in this
literature** — confirmed directly from both HOPE-MLKEM's and Land et
al.'s own text (both explicitly say so). Must be added on top of every
comparison to this literature, every time.

Well-grounded per-bit cost: Cassiers, Masure, Momin, Moos, Moradi &
Standaert, "Randomness Generation for Secure Hardware Masking — Unrolled
Trivium to the Rescue" (eprint/CiC 2024): an unrolled Trivium stream
cipher costs ~4 LUT per fresh random bit per cycle (Bivium B: ~3),
essentially the same area as a naive (insecure) LFSR at none of its risk —
recommended over both a bare LFSR and a Keccak/AES-based DRBG, which cost
roughly 30x more per bit. FF cost is flat regardless of throughput
(unrolling grows only the combinational logic between fixed register
taps).

The real uncertainty is entirely in *n* (bits of fresh randomness needed
per cycle), which is set by sibling modules' masking-gadget architecture,
not by this module. A narrow/serialized masked-Keccak front end (this
project's likely direction, given the Keccak-dominance finding) plausibly
needs n≈50-600 bits/cycle (~150-2,500 LUT). A HOPE-MLKEM-style wide,
round-parallel 4-share DOM-Keccak would need on the order of n≈9,600
bits/cycle by a first-principles calculation — which at ~4 LUT/bit alone
costs ~29,000-38,000 LUT, more than the entire device. This is a genuine
first-order feasibility lever for the whole project, decided by the
Keccak-masking architecture choice, not by this module in isolation.

A concrete real-world cautionary tale worth keeping in mind if an
LFSR-based approach is ever considered instead of Trivium/Bivium:
OpenTitan's masked AES core originally used multiple independent 32-bit
LFSRs for mask generation and was found state-recoverable at low cost;
the design team has since committed to switching to a Bivium/Trivium-
based alternative.

## Top-level integration overhead

The least literature-grounded module (no source reports it as an isolated
line item anywhere in the corpus) — every number here is a derived delta
or bottom-up estimate, correspondingly lower-confidence than modules with
directly-reported figures.

HOPE-MLKEM's own N_BU replication-count scaling gives one real anchor:
arbitration-only glue costs ~350 LUT for the 1→2-share step but ~967
LUT *per additional slice* for the 2→4-share step — a worse-than-linear,
roughly-tripling trend per added share. This project's stated goal (one
genuinely time-multiplexed physical datapath, not HOPE-MLKEM's per-share
replication) is architecturally the *harder* case: barrier registers are
needed at every internal point where two shares' signals could pass
through the same physical gates in consecutive cycles, not just at one
top-level RAM arbiter — grounded directly in Zarei et al.'s (TCHES
2021(4)) description of why a register stage must precede any nonlinear
step in a masked design. Two independent masked-design cross-checks (the
HOPE-MLKEM residual and Land et al.'s NTRU Prime numbers) both show
near-1:1-or-higher FF:LUT ratio for this category of cost, which is why
this module's FF estimate trends to parity with or above its LUT estimate
rather than the <1 ratio typical of pure combinational glue.

This module is not optional to get right: it's the direct implementation
of the register-barrier principle that Mangard et al. (2005) showed makes
the difference between masking surviving real silicon (register-captured
values, unbreakable even at 1,000,000 traces) and not (raw combinational
taps, broken at 30,000-130,000 traces) — and Ji & Dubrova's real break of
a resource-shared Kyber-512 FPGA design is direct evidence that skimping
here is a realistic way the project's whole side-channel-hardening goal
fails even if sub-module TVLA looks clean.
