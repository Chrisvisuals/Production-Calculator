# Pallet Production Calculator

A fully offline-capable web app for calculating pallet counts, production times, and sample pallets across all production lines.

---

## File Structure

```
pallet-calculator/
│
├── index.html          — HTML structure (no logic, just markup)
├── manifest.json       — PWA config (makes it installable on iPhone)
├── service-worker.js   — Caches files for full offline support
│
├── css/
│   └── styles.css      — All styles (light + dark theme)
│
├── js/
│   ├── config.js       — Line configs and tank capacities (edit this to add/update lines)
│   ├── calculator.js   — Core calculation logic (no DOM access)
│   ├── history.js      — localStorage batch history
│   └── ui.js           — All rendering, event handlers, DOM interaction
│
└── icons/
    ├── icon-192.png    — App icon (192×192) for home screen
    └── icon-512.png    — App icon (512×512) for splash screen
```

> **Note:** The `icons/` folder is referenced in `manifest.json` but not included here.
> Add your own PNG icons (192×192 and 512×512) or generate free ones at https://favicon.io

---

## Deploying to GitHub Pages

1. Create a free account at [github.com](https://github.com) if you don't have one
2. Click **New repository** → name it `pallet-calculator` → set to **Public** → click **Create**
3. Upload all files (drag and drop works in the GitHub web UI) — keep the folder structure intact
4. Go to **Settings → Pages → Source** → select `main` branch → click **Save**
5. Your app will be live at: `https://YOUR-USERNAME.github.io/pallet-calculator/`

---

## Installing on iPhone (Add to Home Screen)

Once deployed to GitHub Pages:

1. Open Safari on your iPhone
2. Go to your GitHub Pages URL
3. Tap the **Share** button (box with arrow pointing up)
4. Scroll down and tap **Add to Home Screen**
5. Give it a name and tap **Add**

The app will now appear on your home screen like a native app — full screen, no browser bar, and works completely **offline**.

---

## Adding or Updating Production Lines

Open `js/config.js` and edit the `LINE_CONFIGS` object.

Each line needs:
```javascript
"key name": {
    displayName:             "Display Name",   // shown in the dropdown
    cases_per_pallet:        120,              // cases stacked on one pallet
    units_per_case:          24,              // bottles per case
    unit_volume_l:           0.25,           // volume per unit in LITRES (e.g. 250ml = 0.25)
    time_per_pallet:         20,             // minutes to produce one pallet
    fixed_samples:           null,           // null = calculate dynamically, or set a fixed number
    force_two_samples_at_20: false,          // set true for the 1L special rule only
},
```
