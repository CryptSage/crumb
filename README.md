# Crumb

A private, offline-first sourdough calculator and bake journal localized for Ottawa, Ontario. It includes a classic country loaf and the workspace recipe in `Max-Overnight No-Fuss Sourdough.pdf`.

## Run locally

Service workers require HTTP rather than opening `index.html` directly:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

The hosted version is configured for `https://cryptsage.github.io/crumb/`. Pushes to `main` deploy automatically through the GitHub Pages workflow.

The app has no backend, account, analytics, or cloud storage. Calculator inputs and in-progress form values are stored in first-party cookies. Saved journal entries live in the browser's `localStorage` on the current device.

Current outdoor temperature, relative humidity, and dew point come from Environment and Climate Change Canada's public GeoMet API. It is anonymous and does not require an API key. The reading is contextual: the measured kitchen temperature—not outdoor temperature—drives the fermentation estimate.

The schedule protects a 10 PM–7 AM sleep window. **Fit schedule around sleep** works backward from either a 7 AM dough check (no-fuss mode) or a 9:30 PM cold-proof start (classic mode).

## Install as a PWA

Open the app in a supported browser and use **Install app** (or the browser's **Add to Home Screen** command). The core calculator, schedule, and journal continue to work offline after the first visit.

## Calculation model

Classic mode uses total-formula baker's percentages. Starter flour and water are included in the displayed total flour, total water, and true hydration. The “Put in the bowl” line subtracts the flour and water already present in the starter.

No-fuss mode follows the PDF's additive formula. At its original size that is 900 g bread flour, 630 g water, 100 g active starter, and 18 g salt. The PDF contains an internal discrepancy: its notes refer to a 50 g starter baseline (65 g below 18°C), while its ingredient list specifies 100 g. The app uses the ingredient list's 100 g default and leaves starter percentage adjustable.
