# Frozen RTL interface contract

**This file is the contract. Every module is written against it independently,
so it may not be renegotiated mid-implementation.** If something here is
genuinely wrong or impossible, say so in your report and stop — do not
silently change a port, a latency, or a name, because another module was
written against the version on this page.

Shared definitions live in `rtl/pkg_mlkem.vhd` (already written, compiles
clean, and its arithmetic and zeta tables are verified by a running
GHDL self-test). Constants, subtypes, latencies and the butterfly mode
enum all come from there — never redefine them locally.

## Global conventions

- **VHDL-2008.** Every file starts with:
  ```vhdl
  library ieee;
  use ieee.std_logic_1164.all;
  use ieee.numeric_std.all;
  library work;
  use work.pkg_mlkem.all;
  ```
- **Never** use `std_logic_arith`, `std_logic_unsigned`, or `std_logic_signed`.
- **Clock/reset:** single `clk`, rising edge. Single `rst`, **synchronous,
  active high**. No asynchronous resets anywhere.
- **No latches.** Every signal assigned in a combinational process is
  assigned on every path.
- **Fixed latency.** Each module's `in_valid → out_valid` latency is exactly
  the constant named in `pkg_mlkem` and must be **data-independent**. A
  data-dependent latency is itself a timing side channel and defeats the
  entire purpose of this design.
- **No backpressure inside the arithmetic core.** The pipeline is a fixed
  schedule: `in_valid` goes in, `out_valid` comes out `L` cycles later.
  Only `ntt_top` has a handshake with the outside world.
- **Coefficients are always in `[0, Q-1]`** at every module boundary. Never
  pass a lazily-reduced value across an entity boundary.

## Masking-specific coding rules

These come from the Phase 1 findings (`literature.md`, `module-budget.md`)
and are not stylistic:

- Keep signals belonging to different mask domains in **separate named
  signals**; never let a tool-visible common subexpression span two domains.
- Put a **register barrier** at any boundary where values from different
  mask domains could otherwise meet in the same combinational cone.
- Synthesis will eventually need `-no_lc` and `-global_retiming off`
  (Vivado's default LUT-combining and register retiming can silently
  recombine shares even when the RTL is provably correct — Muller et al.,
  ePrint 2026/1426). Write RTL that does not *depend* on those
  optimizations for timing.

## Build and test — every module must pass this before you report done

```bash
cd research/ml-kem-basys3
ghdl -a --std=08 --workdir=build rtl/pkg_mlkem.vhd
ghdl -a --std=08 --workdir=build rtl/<your_module>.vhd
ghdl -a --std=08 --workdir=build tb/tb_<your_module>.vhd
ghdl -e --std=08 --workdir=build tb_<your_module>
ghdl -r --std=08 --workdir=build tb_<your_module>
```

A testbench **passes** only if it runs to completion and prints a line
containing `PASS`, and **fails loudly** (`severity failure`) on any
mismatch. A testbench that prints `PASS` without actually comparing
against independently-computed expected values is worse than no testbench.
Compute expected values from the mathematical definition (e.g. with a
Python one-liner) and hard-code them as vectors — do not compute the
expected value using the same VHDL expression you are testing.

## Entity declarations — copy these exactly

### rtl/mod_reduce.vhd
```vhdl
entity mod_reduce is
  port (
    clk       : in  std_logic;
    rst       : in  std_logic;
    in_valid  : in  std_logic;
    in_data   : in  prod_t;                 -- 24-bit, any value
    out_valid : out std_logic;
    out_data  : out coef_t                  -- in_data mod Q, in [0,Q-1]
  );
end entity;                                 -- latency exactly L_REDUCE
```

### rtl/mod_mul.vhd
```vhdl
entity mod_mul is
  port (
    clk : in std_logic; rst : in std_logic;
    in_valid  : in  std_logic;
    a, b      : in  coef_t;
    out_valid : out std_logic;
    out_data  : out coef_t                  -- (a*b) mod Q
  );
end entity;                                 -- latency exactly L_MUL
```

### rtl/mod_addsub.vhd
```vhdl
entity mod_addsub is
  port (
    clk : in std_logic; rst : in std_logic;
    in_valid  : in  std_logic;
    a, b      : in  coef_t;
    out_valid : out std_logic;
    sum       : out coef_t;                 -- (a+b) mod Q
    diff      : out coef_t                  -- (a-b) mod Q
  );
end entity;                                 -- latency exactly L_ADDSUB
```

### rtl/bfu_ct.vhd — Cooley-Tukey, used by the forward NTT
```vhdl
entity bfu_ct is
  port (
    clk : in std_logic; rst : in std_logic;
    in_valid  : in  std_logic;
    a, b      : in  coef_t;                 -- already-masked coefficients
    w0        : in  coef_t;                 -- randomized twiddle for b
    w1        : in  coef_t;                 -- 2nd twiddle, used only in MSIDO/MDIDO
    mode      : in  bfu_mask_mode_t;
    out_valid : out std_logic;
    c, d      : out coef_t
  );
end entity;                                 -- latency exactly L_BFU_CT
```
Behaviour: `MSISO` computes `c = a + w0*b`, `d = a - w0*b` (2 modular
multiplications' worth of work, one shared product). `MSIDO`/`MDIDO`
additionally re-mask the outputs with `w1` so the two outputs no longer
share an output mask — 4 modular multiplications. The mask *bookkeeping*
(which mask applies to which coefficient) is `mask_unit`'s job, not yours;
you implement the arithmetic these modes imply.

### rtl/bfu_gs.vhd — Gentleman-Sande, used by the inverse NTT
```vhdl
entity bfu_gs is
  port (
    clk : in std_logic; rst : in std_logic;
    in_valid  : in  std_logic;
    a, b      : in  coef_t;
    w0, w1    : in  coef_t;
    mode      : in  bfu_mask_mode_t;
    out_valid : out std_logic;
    c, d      : out coef_t                  -- c = a+b ; d = w0*(a-b)
  );
end entity;                                 -- latency exactly L_BFU_GS
```

### rtl/twiddle_rom.vhd
```vhdl
entity twiddle_rom is
  port (
    clk     : in  std_logic;
    inv_sel : in  std_logic;                -- '0' = ZETAS, '1' = ZETAS_INV
    addr    : in  unsigned(6 downto 0);
    dout    : out coef_t
  );
end entity;                                 -- latency exactly 1
```

### rtl/prng_trivium.vhd
```vhdl
entity prng_trivium is
  generic ( OUT_W : natural := 8 );         -- unrolled output bits per cycle
  port (
    clk : in std_logic; rst : in std_logic;
    key, iv  : in  std_logic_vector(79 downto 0);
    load     : in  std_logic;               -- 1 cycle: (re)initialise
    en       : in  std_logic;
    dout     : out std_logic_vector(OUT_W-1 downto 0);
    dvalid   : out std_logic                -- low during the 1152-cycle warm-up
  );
end entity;
```
Trivium is a published, fully specified stream cipher with official test
vectors — your testbench **must** check at least one official key/IV test
vector, not just that it produces some bits. Phase 1 chose Trivium over an
LFSR deliberately: same ~3-4 LUT/bit cost, real analyzed security
(Cassiers et al., 2024), and a documented case of LFSR-based mask
generation being broken in a real design (OpenTitan's masked AES).

### rtl/coef_mem.vhd
```vhdl
entity coef_mem is
  generic ( DEPTH : natural := 256; WORD_W : natural := 20 );
  port (
    clk    : in  std_logic;
    we_a   : in  std_logic;
    addr_a : in  unsigned(7 downto 0);
    din_a  : in  std_logic_vector(WORD_W-1 downto 0);
    dout_a : out std_logic_vector(WORD_W-1 downto 0);
    we_b   : in  std_logic;
    addr_b : in  unsigned(7 downto 0);
    din_b  : in  std_logic_vector(WORD_W-1 downto 0);
    dout_b : out std_logic_vector(WORD_W-1 downto 0)
  );
end entity;                                 -- true dual port, read latency 1
```
The 20-bit word carries a 12-bit coefficient plus 8 bits of mask state —
this widening is exactly what Carrera Rodriguez et al. report as a real
source of their area overhead, so it is deliberate, not accidental.

### rtl/addr_gen.vhd
```vhdl
entity addr_gen is
  port (
    clk : in std_logic; rst : in std_logic;
    start     : in  std_logic;
    inv_mode  : in  std_logic;              -- '0' NTT (CT), '1' INTT (GS)
    stage     : in  unsigned(2 downto 0);   -- 0..6, seven layers
    idx       : in  unsigned(6 downto 0);   -- butterfly index within stage
    addr_a    : out unsigned(7 downto 0);
    addr_b    : out unsigned(7 downto 0);
    tw_addr   : out unsigned(6 downto 0)
  );
end entity;                                 -- combinational + 1 output register
```
Kyber's NTT is **incomplete**: q=3329 has a 256th root of unity but no
512th, so there are **7 layers, not 8**, and the transform splits into two
independent 128-point transforms. Point-wise multiplication therefore works
modulo `X^2 - zeta`, not on scalars. Getting this wrong is the single most
common way a Kyber NTT implementation is subtly incorrect.

### rtl/pwm_unit.vhd
```vhdl
entity pwm_unit is
  port (
    clk : in std_logic; rst : in std_logic;
    in_valid   : in  std_logic;
    a0, a1     : in  coef_t;                -- first  degree-1 polynomial
    b0, b1     : in  coef_t;                -- second degree-1 polynomial
    zeta       : in  coef_t;
    out_valid  : out std_logic;
    r0, r1     : out coef_t
  );
end entity;
```
Computes `(a0 + a1*X)(b0 + b1*X) mod (X^2 - zeta)`, i.e.
`r0 = a0*b0 + a1*b1*zeta`, `r1 = a0*b1 + a1*b0`. The naive form needs 5
modular multiplications; Karatsuba brings it to 4 and is what essentially
every Kyber accelerator in the literature does. Implement the 4-multiply
version and state your latency in a comment at the top of the file.

### rtl/mask_unit.vhd
```vhdl
entity mask_unit is
  port (
    clk : in std_logic; rst : in std_logic;
    start      : in  std_logic;
    u_cfg      : in  unsigned(7 downto 0);  -- number of masks per stage, 1..128
    stage      : in  unsigned(2 downto 0);
    rnd        : in  std_logic_vector(11 downto 0);  -- from prng_trivium
    rnd_req    : out std_logic;
    tw_in      : in  coef_t;                -- raw zeta from twiddle_rom
    tw_out     : out coef_t;                -- randomized twiddle x*zeta
    mode       : out bfu_mask_mode_t;       -- which butterfly variant this stage uses
    tw_valid   : out std_logic
  );
end entity;
```
This is the heart of the countermeasure under study. `u_cfg = 1` means one
mask per stage and permits the cheap MSISO butterflies throughout;
`u_cfg = 128` means a fresh mask per butterfly and forces MDIDO for the
intermediate layers. Those are exactly the two configurations Carrera
Rodriguez et al. measured on a real Basys-3 — and **both leaked**, which is
the finding this whole project is built on top of. You are reproducing a
known-broken countermeasure faithfully, on purpose, so that the attack and
then the fix can be demonstrated against it. Do not "improve" its security
while implementing it; an unfaithful reproduction invalidates the
comparison.

### rtl/ntt_ctrl.vhd and rtl/ntt_top.vhd
Sequencing FSM and top-level integration. `ntt_ctrl` walks 7 stages x 128
butterflies, driving `addr_gen`, `mask_unit` and the butterfly pipeline;
`ntt_top` wires everything together and exposes a simple
`start / busy / done` handshake plus a memory-write port for loading
coefficients. Exact ports are yours to define **within these files only** —
nothing else instantiates them, so they are the one place where local
judgement is allowed. Document whatever you choose at the top of the file.

## Reference model

`sw/golden_model.py` is the arbiter of correctness for anything
mathematical. If your module disagrees with it, your module is wrong until
proven otherwise. It emits test vectors to `tb/vectors/`.
