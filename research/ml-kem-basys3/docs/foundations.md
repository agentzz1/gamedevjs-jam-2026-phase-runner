# Foundations: feasibility, and where to point the project

Status: complete — synthesized from (a) this session's direct verification
pass and (b) a 24-agent literature workflow (7 claim checks, 9 prior-art
lanes, 8 per-module resource budgets). Full backing detail lives in
[`literature.md`](./literature.md) (claims + prior art, with citations) and
[`module-budget.md`](./module-budget.md) (the LUT/FF/BRAM/DSP budget).
Every number in all three documents is literature-derived — no physical
FPGA, oscilloscope, or EM probe was used to produce any of it. Scite was
unavailable all session (expired OAuth token; the user needs to
re-authorize it via claude.ai connector settings for future sessions) —
everything here was retrieved via WebSearch/WebFetch plus direct PDF
reads instead, which turned out to work well once TCHES's `article/view/`
block was routed around via its `article/download/` path (see the method
note in `literature.md`).

## The headline finding: a real Basys-3, real-hardware negative result already exists

Before any question of designing something new: **someone has already
built and physically measured a side-channel countermeasure on this
project's exact board and chip**, and it failed.

Carrera Rodriguez, Valea, Bruguier & Benoit, "Hardware Implementation and
Security Analysis of Local-Masked NTT for CRYSTALS-Kyber" (IACR ePrint
2024/1194 — preprint, not confirmed peer-reviewed) implement a
twiddle-factor-randomization countermeasure for Kyber's NTT and measure it
on **a Digilent Basys-3 with a Xilinx Artix-7 XC7A35TCPG236 — the literal
board and die this project targets** — using a Tektronix MSO64
oscilloscope and a Langer EM probe. Their countermeasure **fails
non-specific t-tests (|t| > 4.5) at both its cheapest (u=1, 20k traces) and
most-obfuscated (u=128, up to 1M traces) settings**, due to a documented
zero-value leakage and a non-surjective-mapping leakage they identify
analytically and then confirm empirically. Their own conclusion: this class
of countermeasure needs to be paired with real additive masking, not used
as a substitute for it — which they did not themselves build.

This is a better attack-then-fix anchor than anything else surfaced: it's
not "same chip family," it's the same board. Reproducing their negative
result and then designing and validating the additive-masking fix they
themselves call for (and didn't build) is a concrete, scoped, achievable
project — more so than a from-scratch novel architecture. (One thing to
verify directly before building on it: their synthesis baseline figures
are reported for an XC7A100T-3, while the physical TVLA measurement ran on
the Basys-3's XC7A35T — worth confirming exactly which configuration maps
to which device before citing specific numbers. See `literature.md`.)

## The area question, revised

The earlier interim version of this document said a complete first-order
masked ML-KEM "categorically" doesn't fit the Basys 3 — a real constraint,
but stated more starkly than the fuller evidence now supports. The full
picture is more specific and more useful:

**It is not that masking is uniformly ~2-3x too expensive. It's that one
specific sub-block — masked Keccak/SHAKE — dominates the cost, by a wide
and now twice-confirmed margin, while the arithmetic (NTT/butterfly) side
is comparatively cheap to mask and still has real optimization headroom.**

- HOPE-MLKEM's own numbers (read directly, Table 4): first-order masking
  the whole design costs +27,174 LUT over the matched unmasked baseline.
  Of that, **+16,293 LUT — roughly 60% — is the masked Keccak module
  alone** (their own reported Keccak-TI3 figure). High-order Keccak
  (Keccak-DOM) is +27,035 LUT **by itself**, which already exceeds the
  entire XC7A35T budget before counting anything else.
- Independently, Land, Marotzke, Richter-Brockmann & Güneysu's
  glitch-extended-verified masked NTRU Prime decapsulation (TCHES 2024,
  same Artix-7 family) reports its symmetric hash (SHA-512, serving the
  same FO-confirmation role Keccak serves in ML-KEM) dominates **57-61%**
  of total LUT/FF at every masking order tested. Two independent designs,
  two different hash primitives, same ~60% figure. This is a real,
  convergent structural finding, not an artifact of one paper's choices.
- The NTT/butterfly side is comparatively gentle to mask: point-wise
  multiplication in ML-KEM always multiplies a *public* operand (matrix
  A-hat, ciphertext) against a *secret-share* operand, never secret×secret
  — so it needs no ISW/DOM-style secure-multiplication gadget in
  principle. And per-claim-7's correction below, active 2024-2026 work is
  still finding real gains here (a modular multiplier down from
  ~90 LUT+1 DSP to 49 LUT+1 DSP; 28-76% area reductions in recent papers) —
  contrary to the original "butterfly optimization is exhausted" framing.
- A genuine counterpoint worth holding onto: Beckwith, Abdulgadir &
  Azarderakhsh's shared Kyber+Dilithium accelerator masks Kyber-512
  decapsulation in **~18,000 LUT** on Artix-7 (2.5x over their own
  unmasked baseline) — which would very nearly fit the Basys 3's entire
  budget by itself, for decap alone. The likely explanation, not fully
  confirmed: their hash/sampling unit isn't masked to the same
  glitch-extended-verified rigor HOPE-MLKEM and Land et al. apply — its
  own text describes needing "fresh PRNG randomness to refresh shares"
  without a stated non-completeness proof. If true, this is itself a
  finding: there's a real, uncharacterized gap between "labeled first-order
  masked" and "formally glitch-extended-verified first-order masked," and
  that gap is worth roughly 10,000+ LUT — which is a research question in
  its own right, not just a nuisance in the literature.
- Summing the 8 module-budget estimates at their *central* (not most
  pessimistic) first-order values lands around ~25,000-26,000 LUT — about
  1.2-1.3x the XC7A35T's budget, not the ~2.1x a naive HOPE-MLKEM
  whole-design comparison suggests. Full breakdown and the reasoning
  behind each module's number is in `module-budget.md`.

**Revised bottom line:** a complete, formally-rigorous, first-order masked
ML-KEM is still probably out of reach on this device without either a
real architectural win on masked-Keccak specifically, or a deliberate
scope cut (fewer parameter sets resident at once, a weaker-but-explicitly-
characterized masking rigor, or masking fewer of the leakage-critical
points and formally justifying which ones can stay unmasked — the
partial-NTT-masking layer-ablation result in `literature.md` is a real
example of that last approach done rigorously). The gap to close is
roughly 1.2-1.5x on LUTs with a lean design, not 2-3x. That's a
meaningfully different, more encouraging engineering target than the
interim version of this document stated.

## What this suggests for scope

Two concrete, complementary angles, both better-fitted to a solo
evenings/weekends project than "build a smaller HOPE-MLKEM":

1. **Reproduce-and-fix the Carrera Rodriguez et al. Basys-3 result.**
   Concrete, bounded, already has real measured baseline data to compare
   against, and targets a real documented gap (they say a fix needs real
   additive masking; they didn't build one).
2. **Masked-Keccak-under-resource-sharing specifically** — since that's
   the confirmed dominant cost driver (~60%, two independent sources) and
   HOPE-MLKEM's own authors list "developing optimized modules for
   protected Keccak implementations" as explicit open future work. This
   connects naturally to the FO-transform/comparison leakage class (Ranney
   et al. 2026, building on Hermelink et al.'s CCS 2024 break of masked
   comparisons) since that's a Keccak-based sub-circuit specifically, cheap
   to instantiate and study in isolation rather than needing a whole KEM.

Neither requires beating HOPE-MLKEM's or Buschkowski et al.'s whole-system
numbers, which the evidence above says isn't achievable with current
techniques on this device. Both are genuinely unoccupied: nobody in the
retrieved literature targets anything as small as the XC7A35T except
Carrera Rodriguez et al. (twiddle-randomization only, not masking, and
found to fail) and Jati et al. (hiding-only, no leakage validation at all).

## Corrected / newly confirmed since the interim update

- **The June-2026 FPGA-parallelism-defeats-masking attack is now fully
  confirmed with exact figures**, not just qualitatively: Ranney, Makaram,
  Ding & Fei (arXiv:2606.31681) report 97.9% classification accuracy at
  4 shares (14,353 LUT) and 98.5% at 6 shares (18,565 LUT), both on a
  **Spartan-6** (not Artix-7). The masking scheme they attack traces to
  Bhasin et al. (TCHES 2021) and was first broken in software by
  Hermelink et al., "The Insecurity of Masked Comparisons: SCAs on
  ML-KEM's FO-Transform" (ACM CCS 2024) — this answers the earlier open
  follow-up about reading that paper.
- **"Further area reductions must come from outside the butterfly" is
  contradicted, not confirmed.** Multiple 2024-2026 papers report
  continuing, non-marginal gains inside the NTT/butterfly/modular-multiply
  itself (see `literature.md`, claim 7). Don't carry the original framing
  into any related-work section.
- **The >150,000-LUT masking figure is real but not representative**:
  it's Kamucheka et al.'s Kyber-512 design on Virtex-7, and masking itself
  is only ~6% of that size — the bulk is an admittedly inefficient
  unmasked baseline. Beckwith et al.'s ~18k-LUT design (same era, same
  Artix-7 family) achieves comparable first-order protection at roughly
  8x less area.
- **RNG/mask-randomness cost is excluded from every headline number in
  this literature** — both HOPE-MLKEM and Land et al.'s NTRU Prime paper
  explicitly say so in their own text. Any LUT total quoted from this
  literature needs the RNG module (`module-budget.md`, ~150-2,500 LUT,
  highly dependent on how wide the masked-Keccak core ends up) added on
  top, every time.
- **Vivado's default synthesis optimizations can silently break masking
  even with provably-correct RTL.** Muller, Lammers, Osterheider & Moradi
  (ePrint 2026/1426) showed register retiming and LUT-combining can
  recombine shares post-synthesis on a real Kintex-7, confirmed via a
  100-million-trace TVLA campaign, on a design formally verified secure at
  the netlist level. Concrete, cheap mitigation for whenever RTL work
  starts: `-no_lc`, `-global_retiming off`. Worth remembering this is a
  correctness risk that no area budget protects against by itself.

## Roadmap status

Phase 1 (this document + its two companions) is done. Architecture
specification is next, and should start from the two scope options above
rather than a whole-KEM target.
