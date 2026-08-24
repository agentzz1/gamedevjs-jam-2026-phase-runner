# Foundations: literature verification and feasibility check

Status: interim update from direct verification (2026-08-24), ahead of the
broader 24-agent Phase 1 workflow (still running — will be reconciled into
this document when it lands). Every number below was pulled from a primary
source's actual PDF text (see method note at the end), not from an abstract,
a search snippet, or a memory of the paper.

## Decisive finding: a complete, first-order side-channel-protected ML-KEM does not fit an XC7A35T

This is the finding that should drive the project's direction, ahead of any
novelty question:

| Design | Scope | LUTs | Device | Source |
|---|---|---:|---|---|
| HOPE-MLKEM, first-order | complete: KeyGen+Encaps+Decaps, configurable | **43,473** | XC7A200T | Table 4, Camacho-Ruiz et al. 2026 |
| HOPE-MLKEM, high-order | complete, configurable | **67,757** | XC7A200T | Table 4, Camacho-Ruiz et al. 2026 |
| HOPE-MLKEM, unprotected (NBU=1) | complete, configurable | 14,436 | XC7A200T | Table 4, Camacho-Ruiz et al. 2026 |
| Buschkowski et al., first-order, leanest ("A") | **decapsulation only** | **19,400** | XC7A-200 | Table 3, Buschkowski et al. 2026 |
| Buschkowski et al., first-order, other variants | decapsulation only | 19,400–33,200 | XC7A-200 | Table 3, Buschkowski et al. 2026 |
| [JGCS24] (Jati et al.), "partially first-order" | partial protection, specific components only | 7,151 | Artix-7 | Table 4 (HOPE-MLKEM's own citation); cross-confirmed independently |
| **Basys 3 / XC7A35T total budget** | — | **20,800** | — | Digilent/Xilinx datasheet |

The Basys 3's entire LUT budget (20,800) is smaller than HOPE-MLKEM's
first-order design by more than 2x, and smaller than its high-order design
by more than 3x — and that's on the XC7A200T, which has roughly 6x the
Basys 3's LUT count. Buschkowski et al.'s leanest first-order design covers
*decapsulation alone* and already exceeds the Basys 3's whole budget by
itself, before KeyGen, Encaps, Keccak/SHAKE, a controller, or an RNG.

**Conclusion: fitting a complete, first-order-or-higher masked ML-KEM
(KeyGen+Encaps+Decaps) inside the Basys 3's LUT budget is not achievable
with current published masking techniques — this is a hard resource-count
wall, not a competitive/novelty concern.** The earlier module-by-module
budget estimate (~14.5k–29.5k LUT total, first-order) undershoots what the
two most relevant real designs actually needed once fully built and
measured; it was a reasonable bottom-up estimate from smaller building
blocks, but the top-down published numbers are what should govern the
project's scope from here.

### Recommendation

Do not target "smaller than HOPE-MLKEM, still fully protected, still
complete." Narrow the project to a **specific masked primitive studied
under the resource-sharing a XC7A35T forces**, rather than a complete KEM:　
the masked FO-transform comparison is the standard documented weak point in
ML-KEM decapsulation (see Open follow-ups below — the specific paper on
this has not been read yet). Every design found so far targets XC7A200T,
Kintex-7, or Spartan-6 — none targets anything as small as the Basys 3.
"What changes about a known leakage class when the design is forced onto a
chip 6x smaller than anyone has used for it" is a claim that (a) actually
fits the LUT budget, since it's one component, not a full KEM, and (b) is
still a real, defensible gap, since nobody has published at this device
scale. This is also a better fit for a solo project running evenings/
weekends alongside a full-time job: it needs careful measurement craft on a
narrow, well-defined target rather than a from-scratch full-KEM masked
architecture.

## Verified claims

| # | Claim | Verdict | Detail |
|---|---|---|---|
| 1 | HOPE-MLKEM exists: first fully configurable, open, full-hardware ML-KEM implementation with integrated high-order timing/power side-channel protection, evaluated on FPGA and ASIC | **Confirmed** | Camacho-Ruiz, E., Navarro-Torrero, P., & Cabrera Aldaya, A. (2026). "A Framework for designing High-Order Side-Channel Protected Hardware Implementations of ML-KEM." *IACR TCHES*, 2026(2), 272–295. |
| 2 | A June-2026 paper shows FPGA parallelization undermines higher-order masked ML-KEM verification, enabling key-material classification with reported ~97.9%/98.5% accuracy at 4/6 shares | **Partially confirmed** | Ranney, D., Makaram, Y. I., Ding, A. A., & Fei, Y. "Exploring Side-Channel Protections in Hardware Implementations of PQC ML-KEM Verification." arXiv:2606.31681 (submitted 2026-06-30). Confirmed real, confirmed the qualitative conclusion ("parallelized processing on FPGAs introduces sufficient first-order leakage for full secret-key recovery" even for higher-order masked designs). The specific 97.9%/98.5% figures were **not** independently verified — only the abstract was read; the full PDF would be needed to confirm exact numbers. |
| 3 | A second active 2026 group (Bochum + collaborators) extended a Boolean-masking framework (HADES, CHES 2025) to arithmetic masking for ML-KEM, motivated by area overhead, with real side-channel measurements on a first-order masked decapsulation | **Confirmed, with corrections** | Buschkowski, F., Höher, N., Sasdrich, P., & Güneysu, T. "A Billion Hard CRYSTALS: Exploring Practical Aspects of Arithmetic Masking for PQC in Hardware." IACR ePrint 2026/1265 (received 2026-06-16). All four authors are Ruhr University Bochum; Güneysu's second affiliation in the paper is the German Research Center for Artificial Intelligence (DFKI) — **not NXP** as stated in the original claim, worth double-checking your source on that detail. Original HADES: Buschkowski, Land, Höher, Richter-Brockmann, Sasdrich, Güneysu, "HADES: Automated Hardware Design Exploration for Cryptographic Primitives," eprint 2024/130 / TCHES (CHES 2025). The real measurements (500,000-trace first-order t-test, TVLA thresholds ±4.5/±6.5, fixed-vs-random-secret-key methodology) ran on a **Kintex-7 (SAKURA-X board)** for the full decapsulation and a **Spartan-6 (SAKURA-G board)** for an isolated B2A/A2B masking-conversion template — **not Artix-7/Basys-3**. |
| 4 | Prior compact unprotected Kyber/ML-KEM designs achieve ~7,400 LUTs | **Confirmed (range holds)** | Multiple real designs cluster in this range: HOPE-MLKEM's own unmasked "new" variants run 7.6k–8.9k LUT; [JGCS24]/Jati et al. unprotected/partial baseline is 7,151 LUT. |
| 5 | An XC7A35T-specific compact design at ~7,100–7,600 LUT, ~5,700 FF, 3 BRAM, 4 DSP, ~169 MHz | **Contradicted (conflated composite)** | Independently re-confirmed via HOPE-MLKEM's own citation table: the real [JGCS24]/Jati et al. numbers are 7,151 LUT (matches), but 3,730 FF (not ~5,700), 5.5 BRAM (not 3), 2 DSP (not 4), 258 MHz (not ~169 MHz). Two independent lookups (this session's direct research, and the separately-run Phase 1 workflow) reached the same contradiction from different source pairs. |
| 6 | Older full masking approaches reported at >150,000 LUTs | Not yet independently re-checked in this pass | Plausible given older Boolean-masked designs' overhead, but no specific source pinned down yet in this session. |
| 7 | A 2025 complete ML-KEM architecture for Artix-7 (all 3 security levels, KeyGen+Encaps+Decaps, ~12,037 LUT / 6,895 FF / 4 DSP / 9 BRAM) | Not re-checked in this pass (was in the broader Phase 1 workflow's scope) | — |
| 8 | Further Kyber/ML-KEM area reductions must be sought outside the NTT butterfly unit | Not re-checked in this pass | — |

Claims 6–8 were in the original 24-agent Phase 1 workflow's scope; this
document will be updated with its findings once it completes.

## Open follow-ups

- Read eprint 2024/060, "The Insecurity of Masked Comparisons: SCAs on
  ML-KEM's FO-Transform" — found via search, not yet read. Likely directly
  relevant to the narrowed "masked FO-comparison under resource sharing"
  angle above.
- Confirm the exact 97.9%/98.5% classification-accuracy figures from the
  Ranney et al. paper by reading the full PDF (same method as used for
  HOPE-MLKEM and Buschkowski et al. below — should work the same way).
- Equipment access for real power/EM measurement (oscilloscope, EM probe,
  TVLA setup) — e.g. via ITIV or Fraunhofer IOSB — is an open question or
  the user to pursue; can research what's publicly documented about their
  side-channel lab capabilities if useful, but actual access isn't
  something resolvable from this sandbox.

## Method note

TCHES's article-view PDF link (`.../article/view/{id}/{galley}`) returns an
HTML interstitial and blocks automated fetching — the same wall the user
hit independently. The actual PDF is served from the `.../article/download/
{id}/{galley}/{file}` path instead, which is not blocked; the download link
itself is embedded in the interstitial HTML. `poppler-utils` (`pdftotext
-layout`) was installed in this sandbox to extract text from the downloaded
PDFs directly, since the WebFetch tool's HTML-conversion path could not
parse either PDF's binary content correctly. All figures above are quoted
directly from the extracted text of the papers' own tables, not from
abstracts or search-result summaries.
