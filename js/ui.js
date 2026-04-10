/* ============================================================
   ui.js
   All UI rendering, DOM interaction, and event handling.
   Depends on: config.js, calculator.js, history.js
============================================================ */


// ============================================================
// APP STATE  (values that change as the user interacts)
// ============================================================

let selectedTank    = 'silo';  // Active tank when in percentage mode
let lastResultTiles = [];       // Tile data kept for the Copy button
let lastCalculation = null;     // Full result kept for the Compare feature


// ============================================================
// RENDER: STANDARD SINGLE-LINE RESULTS
// ============================================================

function renderResultTiles(tiles) {
    const grid           = document.getElementById('results-grid');
    const resultsSection = document.getElementById('results-section');

    // Hide split panel, show standard grid
    document.getElementById('split-results').classList.add('hidden');
    grid.classList.remove('hidden');

    // First tile (Total Pallets) spans full width with a larger number
    const totalTileHTML = `
        <div class="result-tile result-tile-full">
            <div class="result-tile-label">${tiles[0].label}</div>
            <div class="result-number result-number-large">${tiles[0].value}</div>
            <div class="result-unit">${tiles[0].unit}</div>
        </div>`;

    // Remaining tiles in a standard grid
    const otherTilesHTML = tiles.slice(1).map(t => `
        <div class="result-tile">
            <div class="result-tile-label">${t.label}</div>
            <div class="result-number">${t.value}</div>
            <div class="result-unit">${t.unit}</div>
        </div>`).join('');

    grid.innerHTML = totalTileHTML + otherTilesHTML;
    lastResultTiles = tiles;

    resultsSection.classList.remove('hidden');
    resultsSection.classList.add('animate-fade-in');
    switchTab('summary');
}


// ============================================================
// RENDER: SPLIT RESULTS  (A3CF 250ml + TBA19 side by side)
// ============================================================

function renderSplitResults(batchLiters) {
    const split          = calculateBalancedSplit(batchLiters);
    const resultsSection = document.getElementById('results-section');

    // Hide standard grid, show split panel
    document.getElementById('results-grid').classList.add('hidden');
    document.getElementById('split-results').classList.remove('hidden');

    // Shared finish time banner
    document.getElementById('split-finish-time').textContent =
        `Both lines finish in ~${split.sharedFinishTime} (${split.sharedTimeMinutes.toFixed(1)} min)`;

    // Helper to build a stat row inside each panel
    const statRow = (label, value, unit) => `
        <div class="stat-row">
            <span class="stat-label">${label}</span>
            <span class="stat-value">${value}<span class="stat-unit">${unit}</span></span>
        </div>`;

    // Populate A3CF panel
    document.getElementById('split-grid-a3cf').innerHTML = [
        statRow('Full Pallets',   split.runA3cf.fullPallets,   'PLTS'),
        statRow('Partial Pallet', split.runA3cf.partialPallet, 'PLTS'),
        statRow('Sample Pallets', split.runA3cf.samplePallets, 'PLTS'),
        statRow('Total Pallets',  split.runA3cf.totalPallets,  'PLTS'),
        statRow('Run Time',       split.runA3cf.productionTime, ''),
    ].join('');

    // Populate TBA19 panel
    document.getElementById('split-grid-tba19').innerHTML = [
        statRow('Full Pallets',   split.runTba19.fullPallets,   'PLTS'),
        statRow('Partial Pallet', split.runTba19.partialPallet, 'PLTS'),
        statRow('Sample Pallets', split.runTba19.samplePallets, 'PLTS'),
        statRow('Total Pallets',  split.runTba19.totalPallets,  'PLTS'),
        statRow('Run Time',       split.runTba19.productionTime, ''),
    ].join('');

    // Litres allocated to each line
    document.getElementById('split-liters-label').textContent =
        `A3CF: ${split.litersA3cf.toFixed(1)} L  ·  TBA19: ${split.litersTba19.toFixed(1)} L`;

    resultsSection.classList.remove('hidden');
    resultsSection.classList.add('animate-fade-in');
    switchTab('summary');
}


// ============================================================
// MAIN EVALUATE HANDLER
// Called when the user clicks "Evaluate Production" or presses Enter
// ============================================================

function runEvaluation() {
    const lineKey       = document.getElementById('line-select').value;
    const rawInput      = document.getElementById('batch-input').value.trim();
    const isPercentMode = document.getElementById('toggle-unit-type').checked;
    const isSplitMode   = document.getElementById('toggle-split').checked;

    const errorBanner    = document.getElementById('error-banner');
    const resultsSection = document.getElementById('results-section');

    // Reset UI state before re-rendering
    errorBanner.classList.add('hidden');
    resultsSection.classList.remove('animate-fade-in');
    document.getElementById('compare-wrapper').classList.add('hidden');

    // Validate the input value
    const inputValue     = rawInput === '' ? 0 : parseFloat(rawInput);
    const inputIsInvalid = (
        rawInput === '' ||
        isNaN(inputValue) ||
        inputValue < 0 ||
        (isPercentMode && inputValue > 100)
    );

    if (inputIsInvalid) {
        resultsSection.classList.add('hidden');
        if (rawInput !== '') {
            errorBanner.textContent = 'Please enter a valid amount (0–100 for %, positive number for Litres).';
            errorBanner.classList.remove('hidden');
        }
        return;
    }

    // Convert percentage to litres if needed
    const cfg         = LINE_CONFIGS[lineKey];
    const batchLiters = isPercentMode
        ? (inputValue / 100) * TANK_CAPACITIES[selectedTank]
        : inputValue;

    // Route to split mode or standard single-line mode
    if (lineKey === 'a3cf 250ml' && isSplitMode) {
        renderSplitResults(batchLiters);
        return;
    }

    // Standard single-line calculation
    const run = calculateRun(batchLiters, cfg);

    const tiles = [
        { label: 'Total Pallets',  value: run.totalPallets,   unit: 'PLTS' },
        { label: 'Full Pallets',   value: run.fullPallets,    unit: 'PLTS' },
        { label: 'Partial Pallet', value: run.partialPallet,  unit: `(approx. ${run.remainderLiters.toFixed(2)} L)` },
        { label: 'Sample Pallets', value: run.samplePallets,  unit: 'PLTS' },
        { label: 'Prod. Time',     value: run.productionTime, unit: `${run.timeMinutes.toFixed(2)} total min` },
    ];

    renderResultTiles(tiles);

    // Store result data for Copy and Compare features
    if (batchLiters > 1e-9) {
        const unitLabel = isPercentMode ? '%' : 'L';
        const tankLabel = isPercentMode ? ` from ${selectedTank.toUpperCase()} tank` : '';

        lastCalculation = {
            ...run,
            lineName:   cfg.displayName,
            batchLiters,
            batchLabel: `${rawInput}${unitLabel}${tankLabel}`,
        };

        document.getElementById('compare-wrapper').classList.remove('hidden');

        saveToHistory({
            timestamp:       new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            lineKey, cfg,
            inputAmount:     rawInput,
            inputUnit:       isPercentMode ? `% (${selectedTank.toUpperCase()})` : 'L',
            totalPallets:    run.totalPallets,
            fullPallets:     run.fullPallets,
            samplePallets:   run.samplePallets,
            partialPallet:   run.partialPallet,
            remainderLiters: run.remainderLiters.toFixed(2),
            timeMinutes:     run.timeMinutes.toFixed(2),
        });
    } else {
        lastCalculation = null;
    }
}


// ============================================================
// SCENARIO COMPARISON  (fully local — no API needed)
// ============================================================

function generateComparison() {
    if (!lastCalculation) return;

    const output      = document.getElementById('comparison-output');
    const altLineKey  = document.getElementById('compare-line-select').value;
    const baseLineKey = document.getElementById('line-select').value;
    const altCfg      = LINE_CONFIGS[altLineKey];

    // Calculate the alternative line using the same batch size
    const altRun = calculateRun(lastCalculation.batchLiters, altCfg);

    // Pallets per hour for each line
    const baselinePPH = lastCalculation.timeMinutes > 0
        ? (lastCalculation.totalPallets / (lastCalculation.timeMinutes / 60)).toFixed(2) : '—';
    const altPPH = altRun.timeMinutes > 0
        ? (altRun.totalPallets / (altRun.timeMinutes / 60)).toFixed(2) : '—';

    // Determine which line wins each metric
    const baselineWinsPallets = lastCalculation.totalPallets >= altRun.totalPallets;
    const baselineWinsTime    = lastCalculation.timeMinutes  <= altRun.timeMinutes;
    const baselineWinsPPH     = parseFloat(baselinePPH)      >= parseFloat(altPPH);

    // Highlight the winning value in each cell
    const cell = (value, wins) => wins
        ? `<td style="color:var(--color-highlight);font-weight:700">${value} ✓</td>`
        : `<td>${value}</td>`;

    const tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Metric</th>
                    <th>${lastCalculation.lineName}</th>
                    <th>${altCfg.displayName}</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Total Pallets</td>
                    ${cell(lastCalculation.totalPallets, baselineWinsPallets)}
                    ${cell(altRun.totalPallets, !baselineWinsPallets)}
                </tr>
                <tr>
                    <td>Full Pallets</td>
                    <td>${lastCalculation.fullPallets}</td>
                    <td>${altRun.fullPallets}</td>
                </tr>
                <tr>
                    <td>Sample Pallets</td>
                    <td>${lastCalculation.samplePallets}</td>
                    <td>${altRun.samplePallets}</td>
                </tr>
                <tr>
                    <td>Production Time</td>
                    ${cell(lastCalculation.productionTime, baselineWinsTime)}
                    ${cell(altRun.productionTime, !baselineWinsTime)}
                </tr>
                <tr>
                    <td>Pallets per Hour</td>
                    ${cell(baselinePPH, baselineWinsPPH)}
                    ${cell(altPPH, !baselineWinsPPH)}
                </tr>
                <tr>
                    <td>Litres per Pallet</td>
                    <td>${litersPerPallet(LINE_CONFIGS[baseLineKey]).toFixed(2)} L</td>
                    <td>${litersPerPallet(altCfg).toFixed(2)} L</td>
                </tr>
            </tbody>
        </table>`;

    // Auto-generate a text recommendation
    const fasterLine  = baselineWinsTime    ? lastCalculation.lineName : altCfg.displayName;
    const morePallets = baselineWinsPallets ? lastCalculation.lineName : altCfg.displayName;
    const isTie       = lastCalculation.totalPallets === altRun.totalPallets
                        && lastCalculation.timeMinutes === altRun.timeMinutes;

    let recommendation;
    if (isTie) {
        recommendation = 'Both lines produce identical results for this batch.';
    } else if (fasterLine === morePallets) {
        recommendation = `<strong>${fasterLine}</strong> is the better option — it finishes faster and produces more pallets.`;
    } else {
        recommendation = `<strong>${fasterLine}</strong> finishes faster, but <strong>${morePallets}</strong> produces more total pallets. Choose based on whether speed or output is the priority.`;
    }

    output.innerHTML = `
        <p style="color:var(--color-muted);margin-bottom:1rem;font-size:0.875rem">
            Batch: <strong>${lastCalculation.batchLiters.toFixed(1)} L</strong> &nbsp;&middot;&nbsp; ${recommendation}
        </p>
        ${tableHTML}`;
}


// ============================================================
// COPY SUMMARY TO CLIPBOARD
// ============================================================

function copyToClipboard() {
    if (!lastCalculation) return;

    let text  = `Production Summary\n${'─'.repeat(20)}\n`;
    text     += `Line:  ${lastCalculation.lineName}\n`;
    text     += `Batch: ${lastCalculation.batchLabel}\n\n`;
    lastResultTiles.forEach(t => { text += `${t.label}: ${t.value} ${t.unit}\n`; });

    // Use a temporary off-screen textarea to trigger the browser copy command
    const ta          = document.createElement('textarea');
    ta.value          = text.trim();
    ta.style.position = 'fixed';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();

    try {
        document.execCommand('copy');
        const label = document.querySelector('#btn-copy span');
        label.textContent = 'Copied!';
        setTimeout(() => { label.textContent = 'Copy Summary'; }, 2000);
    } catch (e) {
        console.error('Copy failed:', e);
    }

    document.body.removeChild(ta);
}


// ============================================================
// UI HELPERS
// ============================================================

/** Switch between Summary and History tabs */
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(panel => {
        panel.classList.toggle('hidden', panel.id !== `tab-content-${tabName}`);
    });
    if (tabName === 'history') renderHistory();
}

/** Handle clicking a tank button in percentage mode */
function selectTank(tankKey, clickedBtn) {
    if (!document.getElementById('toggle-unit-type').checked) return;
    selectedTank = tankKey;
    document.querySelectorAll('.tank-btn').forEach(btn => btn.classList.remove('tank-btn-active'));
    clickedBtn.classList.add('tank-btn-active');
}

/** Show/hide the tank selector and update labels when unit type changes */
function onUnitTypeToggle() {
    const isPercent  = document.getElementById('toggle-unit-type').checked;
    const tankPanel  = document.getElementById('tank-selector');
    const batchInput = document.getElementById('batch-input');

    tankPanel.classList.toggle('hidden', !isPercent);
    batchInput.placeholder = isPercent ? 'Enter Percentage (e.g., 50)' : 'Enter Litres (e.g., 10000)';
    document.getElementById('batch-label').textContent =
        `Batch Amount (${isPercent ? 'Percentage %' : 'Litres L'})`;
    document.getElementById('label-liters').className  =
        `toggle-label ${isPercent ? 'text-muted' : 'text-active'}`;
    document.getElementById('label-percent').className =
        `toggle-label ${isPercent ? 'text-active' : 'text-muted'}`;
}

/** Show/hide the A3CF split toggle when the selected line changes */
function onLineChange() {
    const lineKey      = document.getElementById('line-select').value;
    const splitWrapper = document.getElementById('split-toggle-wrapper');
    const isA3cf       = lineKey === 'a3cf 250ml';
    splitWrapper.classList.toggle('hidden', !isA3cf);
    if (!isA3cf) document.getElementById('toggle-split').checked = false;
}

/** Apply and save the light/dark theme */
function onThemeToggle() {
    const isDark = document.getElementById('toggle-theme').checked;
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    onUnitTypeToggle();  // Re-apply label colours after theme switch
}

/** Strip non-numeric characters from a number input (allows one decimal point) */
function sanitizeNumberInput(event) {
    let val     = event.target.value.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
    event.target.value = val;
}


// ============================================================
// INITIALISATION — runs once the page has loaded
// ============================================================

window.onload = function () {

    // Populate both line dropdowns from LINE_CONFIGS
    const lineSelect        = document.getElementById('line-select');
    const compareLineSelect = document.getElementById('compare-line-select');

    Object.entries(LINE_CONFIGS).forEach(([key, cfg]) => {
        const opt       = document.createElement('option');
        opt.value       = key;
        opt.textContent = cfg.displayName;
        lineSelect.appendChild(opt.cloneNode(true));
        compareLineSelect.appendChild(opt);
    });

    lineSelect.value = '1 liter';  // Default line on load

    // Mark the default tank button as selected
    document.querySelector(`.tank-btn[data-tank="${selectedTank}"]`)
            ?.classList.add('tank-btn-active');

    // ── Attach event listeners ──

    document.getElementById('btn-evaluate')
            .addEventListener('click', runEvaluation);
    document.getElementById('batch-input')
            .addEventListener('keypress', e => { if (e.key === 'Enter') runEvaluation(); });
    document.getElementById('batch-input')
            .addEventListener('input', sanitizeNumberInput);
    document.getElementById('btn-clear')
            .addEventListener('click', () => {
                document.getElementById('batch-input').value = '';
                runEvaluation();
            });

    document.getElementById('line-select')
            .addEventListener('change', onLineChange);
    document.getElementById('toggle-split')
            .addEventListener('change', runEvaluation);
    document.getElementById('toggle-unit-type')
            .addEventListener('change', onUnitTypeToggle);
    document.getElementById('toggle-theme')
            .addEventListener('change', onThemeToggle);

    document.getElementById('tab-summary')
            .addEventListener('click', () => switchTab('summary'));
    document.getElementById('tab-history')
            .addEventListener('click', () => switchTab('history'));

    document.querySelectorAll('.tank-btn').forEach(btn => {
        btn.addEventListener('click', () => selectTank(btn.dataset.tank, btn));
    });

    document.getElementById('btn-show-compare')
            .addEventListener('click', () => {
                document.getElementById('compare-panel').classList.toggle('hidden');
            });
    document.getElementById('btn-generate-compare')
            .addEventListener('click', generateComparison);
    document.getElementById('btn-copy')
            .addEventListener('click', copyToClipboard);
    document.getElementById('btn-clear-history')
            .addEventListener('click', clearHistory);

    // Apply saved theme preference (default to dark if none saved)
    const savedTheme = localStorage.getItem('theme');
    document.getElementById('toggle-theme').checked = (savedTheme === 'dark' || savedTheme === null);
    onThemeToggle();

    // Initial render
    runEvaluation();
    renderHistory();
};
