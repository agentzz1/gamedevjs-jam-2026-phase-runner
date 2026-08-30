# Architecture: attack-then-fix on the local-masked NTT

Scope decision (per `foundations.md`): reproduce and extend Carrera
Rodriguez, Valea, Bruguier & Benoit, "Hardware Implementation and Security
Analysis of Local-Masked NTT for CRYSTALS-Kyber" (IACR ePrint 2024/1194),
read in full this session directly from the source PDF (not a secondhand
summary — see citation details below). No code/repository was found
published alongside the paper, so the reproduction is from the paper's
own architectural description, which is detailed enough to work from.

## What the target paper actually did

They implement Ravi et al.'s ([RPBC20]) "local masking" for Kyber's NTT —
**multiplicative randomization of twiddle factors**, not secret-sharing
masking — as a configurable hardware NTT/INTT/PWM engine, then show it
leaks anyway.

- **Countermeasure mechanism**: each twiddle factor ζ is replaced by
  x·ζ for a random x, changing per execution. Configurable via `u` (number
  of masks/parallel butterflies per stage) and butterfly type: MSISO
  ("mask same input, same output," 2 modular multiplications, cheap) vs.
  MDIDO ("mask different input, different output," 4 modular
  multiplications, more expensive). u=1 uses only MSISO; u=128 uses
  MDIDO for all intermediate layers.
- **Two vulnerabilities they identify analytically, then confirm
  empirically**:
  1. **Zero-value leakage**: multiplicative masking doesn't hide a zero
     coefficient (0 × anything = 0). They explicitly note this is the same
     class of flaw Golić & Tymen showed against Akkar & Giraud's 2001 DPA
     countermeasure — i.e., a known 2003-vintage attack pattern applied to
     a 2020-vintage lattice-crypto countermeasure. Averaging traces
     reveals zero occurrences even without knowing the mask.
  2. **Non-surjective mapping**: for a fixed secret coefficient x, the
     map `x ↦ x·ζⁱ mod q` only reaches n=256 of the 3328 nonzero
     residues — collapsing the candidate space to 256, and partitioning
     Z_q into only **13 equivalence classes** (Wₖ, k ∈
     {1,2,3,4,5,8,9,10,11,15,20,25,31}) distinguishable even by a
     Hamming-weight-only power model, since each class has a
     characteristically different Hamming-weight distribution (Table 5 in
     the paper).
- **Real measurement, on this project's exact board**: Tektronix MSO64 +
  Femto HSA-X-2-40 LNA + Langer RF-U 5-2 EM probe, on a **Digilent
  Basys-3 with XC7A35TCPG236** — confirmed both leakage mechanisms via
  non-specific t-test at u=1 (20k traces) and, more slowly but still
  positively, at u=128 (up to 1M traces, "leakage detected in round 5").
- **Their own stated fix, not built by them**: "this countermeasure
  should be used mainly with MDIDO butterflies and in conjunction with
  usual additive masking" — i.e., real secret-sharing masking layered on
  top, not multiplicative randomization alone.
- **Explicit open future work, stated verbatim**: "we leave the
  evaluation of a practical SASCA attack on a local-masked NTT taking
  advantage of the possible vulnerabilities identified in this paper" —
  they detected leakage, but never built the actual key-recovery attack.
  Also open: extending the scheme to protect PWM, and a comparative study
  vs. shuffling.

One device-targeting precision point carried over from `module-budget.md`:
their **resource numbers** (3,651 LUT / 1,430 FF / 6 BRAM / 4 DSP /
167.37 MHz) are from synthesizing for an **XC7A100T-3**, via Vivado
2021.1 default settings — not the XC7A35T the physical measurement
actually used. Re-synthesizing for XC7A35T specifically is a needed first
step, not an assumption to carry forward; the design should still fit
(3,651 LUT is ~17.6% of the XC7A35T's budget) but the exact number will
differ.

## The project's contribution: close both gaps they left open

**Gap 1 — attack.** Build the actual SASCA key-recovery attack the
authors explicitly left as future work, exploiting the two mechanisms
they characterized but didn't weaponize:
- A power/leakage model targeting zero-coefficient occurrence (trace
  averaging) and Hamming-weight discrimination between the 13 Wₖ classes.
- A belief-propagation or maximum-likelihood solver over the NTT's factor
  graph, informed by which Wₖ class each intermediate value's traces
  place it in, following the same general attack shape as Hermelink et
  al.'s belief-propagation solver used against ML-KEM elsewhere
  (`literature.md`, claim 2) — a structurally similar problem (reduce
  candidate space via side information, then solve algebraically), reused
  here rather than invented from scratch.
- Going from "t-test detects leakage" to "key extracted" is exactly the
  rigor gap the current CHES/TCHES bar demands (`literature.md`'s novelty-
  bar summary) and exactly what the original paper stopped short of.

**Gap 2 — fix.** Design and implement the additive-masking layer the
authors recommend but never built, on top of an MDIDO-only datapath
(already identified as the less-leaky variant):
- This is where Phase 1's own module budget applies directly rather than
  needing new research: `module-budget.md`'s NTT/ModMult module estimate
  (~2,000-4,000 LUT central, first-order) is for exactly this kind of
  engine, and the reasoning behind why it's comparatively cheap to mask
  (point-wise multiplication is always public×secret-share, never
  secret×secret in ML-KEM) applies unchanged here.
- Twiddle-factor randomization can plausibly stay as a *second* layer on
  top of real masking (matching the authors' own "in conjunction with"
  phrasing) rather than being discarded — worth deciding once the masked
  datapath is designed, not assumed now.
- Validate by re-running both the reproduced t-test methodology *and* the
  new SASCA attack from Gap 1 against the fixed design — a clean
  before/after result: attack succeeds on the reproduction, fails (or
  needs drastically more traces) on the fix. That comparison, on the
  same board, with the same attack, is the actual paper-worthy result —
  stronger than either half alone.

## Why this is the right scope, not just an available one

- It doesn't require beating HOPE-MLKEM's or Buschkowski et al.'s
  whole-system LUT numbers, which `foundations.md` already establishes
  isn't achievable on this device with current techniques — this is a
  single NTT engine, not a full KEM.
- It matches the "measurement craft over architecture reinvention"
  preference: the attack half is signal-processing and cryptanalysis on
  top of an already-defined leakage model; the fix half reuses this
  project's own Phase 1 masking-cost analysis rather than inventing a new
  architecture.
- It's concretely unclaimed: the authors named the exact gap themselves,
  eight-plus months ago as of this writing, with no published follow-up
  or code found.
- It stays honest about this sandbox's limits (`foundations.md`): the
  SASCA attack can be developed and validated against a behavioral/
  simulated leakage model now; the real t-test reproduction and the real
  before/after comparison need the physical Basys-3 + oscilloscope + EM
  probe setup this environment doesn't have, which is exactly the
  equipment-access question already on the table.

## Immediate next steps

1. Reproduce the NTT/INTT/PWM datapath and local-masking scheme (MSISO/
   MDIDO/MSIDO butterflies, variable-parallelism memory scheme, masking
   unit) from the paper's Section 3 description, targeting XC7A35T
   directly rather than XC7A100T-3.
2. Build a behavioral leakage simulator (Hamming-weight model over the
   Wₖ classes, per Table 5) to develop and validate the SASCA solver
   before any real hardware is involved.
3. Design the additive-masking layer for the MDIDO datapath, sized
   against `module-budget.md`'s NTT engine estimate.
4. Only once 1-3 are solid: real synthesis, real t-test reproduction, and
   real before/after measurement, which need the physical setup this
   sandbox cannot provide.

## Citation

Carrera Rodriguez, R., Valea, E., Bruguier, F., & Benoit, P. "Hardware
Implementation and Security Analysis of Local-Masked NTT for
CRYSTALS-Kyber." Cryptology ePrint Archive, Paper 2024/1194 (LIRMM,
Univ. Montpellier/CNRS + CEA List, Grenoble). Preprint, peer-review
status not confirmed as of this check. https://eprint.iacr.org/2024/1194

Builds on: Ravi, Poussier, Bhasin & Chattopadhyay (cited as [RPBC20] in
the paper above) — the original local-masking proposal — and applies the
same general zero-value-leakage argument as Golić & Tymen (CHES 2003)
against Akkar & Giraud's 2001 masked-DES/AES countermeasure.
