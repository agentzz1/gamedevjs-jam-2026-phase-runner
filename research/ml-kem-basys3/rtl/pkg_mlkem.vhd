-- pkg_mlkem.vhd -- SHARED CONTRACT. Do not edit without updating docs/rtl-interfaces.md.
-- Constants derived programmatically (zeta = 17 is the primitive 256th root of
-- unity mod 3329; tables are bit-reversed powers, matching the Kyber reference).
library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

package pkg_mlkem is

  constant Q       : natural := 3329;
  constant N       : natural := 256;
  constant COEF_W  : natural := 12;   -- ceil(log2(3329))
  constant PROD_W  : natural := 24;   -- 12x12 product width
  constant LOGN    : natural := 8;

  subtype coef_t is unsigned(COEF_W-1 downto 0);
  subtype prod_t is unsigned(PROD_W-1 downto 0);

  type coef_array_t is array (natural range <>) of coef_t;
  type zeta_rom_t   is array (0 to 127) of integer range 0 to Q-1;

  -- Butterfly masking modes from Carrera Rodriguez et al. (ePrint 2024/1194).
  -- MSISO: mask same input,      same output      (2 modular mults, cheapest, leakiest)
  -- MSIDO: mask same input,      different output (4 modular mults)
  -- MDIDO: mask different input, different output (4 modular mults, least leaky)
  type bfu_mask_mode_t is (MSISO, MSIDO, MDIDO);

  -- Fixed pipeline latencies. Every module MUST honour these exactly; testbenches
  -- and the top-level scheduler depend on them being constant, not data-dependent
  -- (data-dependent latency is itself a timing side channel).
  constant L_REDUCE : natural := 2;   -- mod_reduce: in_valid -> out_valid
  constant L_MUL    : natural := 4;   -- mod_mul   (1 mult stage + L_REDUCE + 1)
  constant L_ADDSUB : natural := 1;   -- mod_addsub
  constant L_BFU_CT : natural := 6;   -- bfu_ct  (L_MUL + L_ADDSUB + 1 output reg)
  constant L_BFU_GS : natural := 6;   -- bfu_gs

  constant ZETAS : zeta_rom_t := (
    1, 1729, 2580, 3289, 2642, 630, 1897, 848,
    1062, 1919, 193, 797, 2786, 3260, 569, 1746,
    296, 2447, 1339, 1476, 3046, 56, 2240, 1333,
    1426, 2094, 535, 2882, 2393, 2879, 1974, 821,
    289, 331, 3253, 1756, 1197, 2304, 2277, 2055,
    650, 1977, 2513, 632, 2865, 33, 1320, 1915,
    2319, 1435, 807, 452, 1438, 2868, 1534, 2402,
    2647, 2617, 1481, 648, 2474, 3110, 1227, 910,
    17, 2761, 583, 2649, 1637, 723, 2288, 1100,
    1409, 2662, 3281, 233, 756, 2156, 3015, 3050,
    1703, 1651, 2789, 1789, 1847, 952, 1461, 2687,
    939, 2308, 2437, 2388, 733, 2337, 268, 641,
    1584, 2298, 2037, 3220, 375, 2549, 2090, 1645,
    1063, 319, 2773, 757, 2099, 561, 2466, 2594,
    2804, 1092, 403, 1026, 1143, 2150, 2775, 886,
    1722, 1212, 1874, 1029, 2110, 2935, 885, 2154
  );

  constant ZETAS_INV : zeta_rom_t := (
    1, 1600, 40, 749, 2481, 1432, 2699, 687,
    1583, 2760, 69, 543, 2532, 3136, 1410, 2267,
    2508, 1355, 450, 936, 447, 2794, 1235, 1903,
    1996, 1089, 3273, 283, 1853, 1990, 882, 3033,
    2419, 2102, 219, 855, 2681, 1848, 712, 682,
    927, 1795, 461, 1891, 2877, 2522, 1894, 1010,
    1414, 2009, 3296, 464, 2697, 816, 1352, 2679,
    1274, 1052, 1025, 2132, 1573, 76, 2998, 3040,
    1175, 2444, 394, 1219, 2300, 1455, 2117, 1607,
    2443, 554, 1179, 2186, 2303, 2926, 2237, 525,
    735, 863, 2768, 1230, 2572, 556, 3010, 2266,
    1684, 1239, 780, 2954, 109, 1292, 1031, 1745,
    2688, 3061, 992, 2596, 941, 892, 1021, 2390,
    642, 1868, 2377, 1482, 1540, 540, 1678, 1626,
    279, 314, 1173, 2573, 3096, 48, 667, 1920,
    2229, 1041, 2606, 1692, 680, 2746, 568, 3312
  );

  -- The 13 equivalence classes W_k of the non-surjective multiplicative mask map
  -- (Section 4.3 of ePrint 2024/1194): for fixed x, x*zeta^i reaches only 256 of
  -- the 3328 nonzero residues, partitioning Z_q into (q-1)/n = 13 classes.
  -- This is the structure the SASCA attack exploits; kept here so RTL and the
  -- leakage model share one definition.
  type mask_class_t is array (0 to 12) of integer range 1 to 31;
  constant MASK_CLASS_K : mask_class_t :=
    (1, 2, 3, 4, 5, 8, 9, 10, 11, 15, 20, 25, 31);

  function mod_q_add (a, b : coef_t) return coef_t;
  function mod_q_sub (a, b : coef_t) return coef_t;

end package pkg_mlkem;

package body pkg_mlkem is

  function mod_q_add (a, b : coef_t) return coef_t is
    variable s : unsigned(COEF_W downto 0);
  begin
    s := ('0' & a) + ('0' & b);
    if s >= Q then
      s := s - Q;
    end if;
    return s(COEF_W-1 downto 0);
  end function;

  function mod_q_sub (a, b : coef_t) return coef_t is
    variable d : unsigned(COEF_W downto 0);
  begin
    d := ('0' & a) - ('0' & b);
    if d(COEF_W) = '1' then
      d := d + Q;
    end if;
    return d(COEF_W-1 downto 0);
  end function;

end package body pkg_mlkem;
