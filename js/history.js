/* ============================================================
   history.js
   Handles saving, loading, clearing, and rendering
   the batch history stored in localStorage.
============================================================ */


/** Load history array from localStorage (returns empty array if none saved) */
function getHistory() {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
}

/** Save a new entry to history, keeping only the most recent items */
function saveToHistory(entry) {
    let history = getHistory();
    history.unshift(entry);                              // Add newest to the front
    if (history.length > HISTORY_MAX_ITEMS) {
        history = history.slice(0, HISTORY_MAX_ITEMS);  // Trim old entries
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistory();
}

/** Clear all history from localStorage */
function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
}

/** Render history entries into the history tab */
function renderHistory() {
    const history   = getHistory();
    const container = document.getElementById('history-list');
    const clearBtn  = document.getElementById('btn-clear-history');

    // Disable the clear button when there's nothing to clear
    clearBtn.disabled = history.length === 0;

    if (history.length === 0) {
        container.innerHTML = '<div class="empty-history">No previous batches saved.</div>';
        return;
    }

    // Helper to build a coloured badge
    const badge = (text, cssClass) =>
        `<span class="badge ${cssClass}">${text}</span>`;

    container.innerHTML = history.map(entry => {
        const hrs  = Math.floor(entry.timeMinutes / 60);
        const mins = Math.round(entry.timeMinutes % 60);

        return `
            <div class="history-card">
                <div class="history-card-top">
                    <span>Input</span>
                    <span>${entry.timestamp}</span>
                </div>
                <div class="badge-row">
                    ${badge(`Line: ${entry.cfg.displayName}`, 'badge-blue')}
                    ${badge(`Amount: ${entry.inputAmount} ${entry.inputUnit.split(' ')[0]}`, 'badge-green')}
                </div>
                <p class="history-details-label">Production Details:</p>
                <div class="history-details-grid">
                    <p><strong>Total Pallets:</strong> ${entry.totalPallets} PLTS</p>
                    <p><strong>Run Time:</strong> ${hrs}h ${mins}m</p>
                    <p><strong>Litres/Pallet:</strong> ${litersPerPallet(entry.cfg).toFixed(2)} L</p>
                    <p><strong>Sample Pallets:</strong> ${entry.samplePallets}</p>
                </div>
            </div>`;
    }).join('');
}
