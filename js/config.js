/* ============================================================
   config.js
   All production line and tank configuration data.
   This is the only file you need to edit when adding or
   updating lines or tank capacities.
============================================================ */

// Tank capacities in litres — used when the user enters a percentage
const TANK_CAPACITIES = {
    juicesilo:     37650,
    milksilo:      30000,
    blending:      20000,
    uscm:          20000,
};

// Production line configurations
// cases_per_pallet         — how many cases are stacked on one pallet
// units_per_case           — bottles/packs per case
// unit_volume_l            — volume of one unit in litres
// time_per_pallet          — minutes needed to produce one pallet
// fixed_samples            — fixed QC sample pallet count (null = calculate dynamically)
// force_two_samples_at_20  — 1L special rule: force 2 sample pallets when >= 20 full pallets
const LINE_CONFIGS = {
    "1 liter": {
        displayName:             "1 Liter",
        cases_per_pallet:        60,
        units_per_case:          12,
        unit_volume_l:           1.0,       // 1000ml
        time_per_pallet:         11,
        fixed_samples:           null,
        force_two_samples_at_20: true,
    },
    "a3 speed (juice)": {
        displayName:             "A3 Speed (Juice)",
        cases_per_pallet:        189,
        units_per_case:          24,
        unit_volume_l:           0.2,       // 200ml
        time_per_pallet:         10,
        fixed_samples:           null,
        force_two_samples_at_20: false,
    },
    "a3 speed (milk)": {
        displayName:             "A3 Speed (Milk)",
        cases_per_pallet:        147,
        units_per_case:          24,
        unit_volume_l:           0.2,       // 200ml
        time_per_pallet:         10,
        fixed_samples:           null,
        force_two_samples_at_20: false,
    },
    "200ml milk": {
        displayName:             "200ml Milk",
        cases_per_pallet:        147,
        units_per_case:          24,
        unit_volume_l:           0.2,       // 200ml
        time_per_pallet:         30,
        fixed_samples:           null,
        force_two_samples_at_20: false,
    },
    "tba19": {
        displayName:             "TBA19",
        cases_per_pallet:        120,
        units_per_case:          24,
        unit_volume_l:           0.25,      // 250ml
        time_per_pallet:         30,
        fixed_samples:           1,         // Always exactly 1 sample pallet
        force_two_samples_at_20: false,
    },
    "a3cf 250ml": {
        displayName:             "A3CF 250ml",
        cases_per_pallet:        120,
        units_per_case:          24,
        unit_volume_l:           0.25,      // 250ml
        time_per_pallet:         20,        // Faster than TBA19
        fixed_samples:           null,
        force_two_samples_at_20: false,
    },
    "a3cf 330ml": {
        displayName:             "A3CF 330ml",
        cases_per_pallet:        90,
        units_per_case:          18,
        unit_volume_l:           0.33,      // 330ml
        time_per_pallet:         25,
        fixed_samples:           null,
        force_two_samples_at_20: false,
    },
};

// localStorage settings
const HISTORY_KEY       = 'palletCalculatorHistory';
const HISTORY_MAX_ITEMS = 3;
