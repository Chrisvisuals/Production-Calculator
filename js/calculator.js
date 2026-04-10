/* ============================================================
   calculator.js
   Core production calculation logic.
   No DOM access here — pure data in, data out.
============================================================ */


// ============================================================
// VOLUME HELPERS
// ============================================================

/** Litres that fill one case for the given line */
function litersPerCase(cfg) {
    return cfg.units_per_case * cfg.unit_volume_l;
}

/** Litres that fill one full pallet for the given line */
function litersPerPallet(cfg) {
    return litersPerCase(cfg) * cfg.cases_per_pallet;
}

/** Format a number of minutes as a readable "Xh Ym" string */
function formatTime(totalMinutes) {
    const h = Math.floor(totalMinutes / 60);
    const m = Math.round(totalMinutes % 60);
    return `${h}h ${m}m`;
}


// ============================================================
// CORE CALCULATION
// ============================================================

/**
 * Calculate a full production run for a given batch size and line config.
 *
 * Returns an object with:
 *   fullPallets      — complete saleable pallets
 *   partialPallet    — 1 if there is leftover volume, else 0
 *   remainderLiters  — litres in the partial pallet
 *   samplePallets    — pallets reserved for QC
 *   totalPallets     — full + partial + sample
 *   timeMinutes      — total run time in minutes
 *   productionTime   — human-readable time e.g. "2h 30m"
 */
function calculateRun(batchLiters, cfg) {
    const lpCase   = litersPerCase(cfg);
    const lpPallet = litersPerPallet(cfg);

    // Guard: return zeros if there is nothing to calculate
    if (batchLiters < 1e-9 || !cfg) {
        return {
            totalPallets: 0, fullPallets: 0, partialPallet: 0,
            samplePallets: 0, productionTime: '0h 0m',
            remainderLiters: 0, timeMinutes: 0,
        };
    }

    // ── Step 1: Iteratively find full pallet count ──
    // Sample cases (3 per full pallet) consume volume from the batch,
    // so we loop until the estimate stabilises (usually 2–3 passes).
    let fullPallets = Math.floor(batchLiters / lpPallet);
    let prevGuess   = -1;
    let iterations  = 0;

    while (fullPallets !== prevGuess && iterations < 50) {
        prevGuess        = fullPallets;
        const samplesVol = (fullPallets * 3) * lpCase;
        const remaining  = Math.max(batchLiters - samplesVol, 0);
        fullPallets      = Math.floor(remaining / lpPallet);
        iterations++;
    }

    // ── Step 2: Remainder after samples and full pallets ──
    const totalSampleCases   = fullPallets * 3;
    const volumeAfterSamples = Math.max(batchLiters - (totalSampleCases * lpCase), 0);
    let   remainderLiters    = volumeAfterSamples - (fullPallets * lpPallet);
    if (remainderLiters < 1e-9) remainderLiters = 0;  // Ignore tiny floating-point noise

    const partialPallet = remainderLiters > 1e-9 ? 1 : 0;

    // ── Step 3: Sample pallets ──
    let samplePallets;
    if (cfg.fixed_samples !== null) {
        // Line has a fixed rule (e.g. TBA19 always = 1)
        samplePallets = cfg.fixed_samples;
    } else {
        // Default: round up total sample cases to nearest pallet
        samplePallets = Math.ceil(totalSampleCases / cfg.cases_per_pallet);
    }
    // 1 Liter special rule: bump to 2 sample pallets at >= 20 full pallets
    if (cfg.force_two_samples_at_20 && fullPallets >= 20) {
        samplePallets = 2;
    }

    // ── Step 4: Totals and time ──
    const totalPallets = fullPallets + partialPallet + samplePallets;
    const timeMinutes  = totalPallets * cfg.time_per_pallet;

    return {
        fullPallets,
        partialPallet,
        remainderLiters,
        samplePallets,
        totalPallets,
        timeMinutes,
        productionTime: formatTime(timeMinutes),
    };
}


// ============================================================
// BALANCED SPLIT CALCULATION  (A3CF 250ml + TBA19)
// ============================================================

/**
 * Splits a batch between A3CF 250ml and TBA19 so both lines finish
 * at the same time.
 *
 * Maths:
 *   Each line produces litres at a fixed rate (litres/min).
 *   We solve: (rateA3cf + rateTba19) × T = batchLiters
 *   Then assign each line: volume = rate × T
 */
function calculateBalancedSplit(batchLiters) {
    const cfgA3cf  = LINE_CONFIGS["a3cf 250ml"];
    const cfgTba19 = LINE_CONFIGS["tba19"];

    // Litres each line produces per minute
    const lpmA3cf  = litersPerPallet(cfgA3cf)  / cfgA3cf.time_per_pallet;
    const lpmTba19 = litersPerPallet(cfgTba19) / cfgTba19.time_per_pallet;

    // Shared run time so both lines finish together
    const sharedTimeMinutes = batchLiters / (lpmA3cf + lpmTba19);

    const litersA3cf  = lpmA3cf  * sharedTimeMinutes;
    const litersTba19 = lpmTba19 * sharedTimeMinutes;

    return {
        runA3cf:          calculateRun(litersA3cf,  cfgA3cf),
        runTba19:         calculateRun(litersTba19, cfgTba19),
        litersA3cf,
        litersTba19,
        sharedTimeMinutes,
        sharedFinishTime: formatTime(sharedTimeMinutes),
    };
}
