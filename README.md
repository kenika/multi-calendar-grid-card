# Multi-Calendar Grid Card

A compact, **7‑day** time‑grid view that overlays multiple Home Assistant calendar entities on a single card. Built with **Lit + TypeScript** as a single custom element: `multi-calendar-grid-card`.

> **This document reflects the `v0.8.0-dev.12` baseline** (the last known good UX prior to later experimental changes).

---

## Features

- **Rolling 7‑day window** starting **today** by default (`start_today: true`).
- **Overlay multiple calendars** with per‑calendar color + name.
- **All‑day row** + timed events with smart overlap layout (lanes).
- **Weather summary in each day header** (icon + low/high), using a robust multi‑strategy forecast fetch.
- **Sticky day headers** (date + weather) while you scroll the time grid.
- **“Now” indicator** line (optional).
- **Remember scroll & week offset** (per unique card config) using localStorage.
- **Minimal dependencies**; single custom element; no extra popups beyond a small built‑in detail dialog.

---

## Installation

1. Copy the built JS bundle to your HA `www` directory, e.g.:
   - Dev: `/local/dev/multi-calendar-grid-card-dev12.js`
   - Prod: `/local/multi-calendar-grid-card/multi-calendar-grid-card.js`
2. In **Settings → Dashboards → Resources**, add:
   ```yaml
   url: /local/dev/multi-calendar-grid-card-dev12.js
   type: module
   ```
3. Refresh your dashboard (Shift+Reload).

> You can keep both a dev and prod resource and toggle which one is enabled.

---

## Configuration (YAML)

```yaml
type: custom:multi-calendar-grid-card
entities:
  - entity: calendar.family
    name: Family
    color: '#3f51b5'
  - entity: calendar.me
    name: Me
    color: '#9c27b0'

# Time-grid & layout
first_day: 1               # 0=Sun … 6=Sat (used only if start_today: false)
start_today: true          # start the 7-day view at “today”
slot_min_time: '07:00:00'  # HH:MM:SS
slot_max_time: '22:00:00'  # HH:MM:SS
slot_minutes: 60           # grid step; 1–180 (30–180 recommended)
height_vh: 80              # card height (viewport %). 60–90 typical
px_per_min: 1.6            # minute scale; leave default unless tuning
legend_button_ch: 15       # legend button width in ch units
header_compact: false
show_now_indicator: true
show_all_day: true
remember_offset: true
data_refresh_minutes: 5

# Weather in day headers (optional)
weather_entity: weather.home
weather_days: 7
weather_compact: false
```

### Entities
Each calendar entry accepts:
- `entity` (required) — ID of a `calendar.*` entity
- `name` (optional) — label in the legend
- `color` (optional) — hex `#rrggbb` preferred (rgba and CSS vars also work)

### Time & layout
- The grid always renders a full day (00:00–24:00); **`slot_min_time`/`slot_max_time`** control **focus** and default scroll position.
- **`px_per_min`** defines vertical scale. In dev.12 this is **explicit**; (later versions may derive this value).
- **`legend_button_ch`** sets the minimum width of each legend button (in `ch`). Use `0` for no minimum.

### Weather
The card tries, in order:
1. `weather.get_forecasts` WS (`daily`)
2. `weather.get_forecasts` WS (`hourly` → aggregated to daily)
3. `/api/weather/forecast` REST
4. Entity `attributes.forecast`

Low/high, icon, and (if available) precipitation chance are shown per day.

---

## Lovelace UI editor (dev.12)

A simple editor is available to set common options **without editing YAML**:
- Manage calendars (entity, display name, color)
- Weather entity
- Focus window (start/end)
- Card height (vh)
- Remember offset

> If the editor fails to load, you can always switch to **YAML mode**.

---

## Notes & conventions

- **Week start**: If you set `start_today: false`, the week begins on `first_day` (0=Sun … 6=Sat). Otherwise, it always rolls from “today” for 7 days.
- **Local storage**: Week offset and scroll are namespaced by the set of entities to avoid collisions between cards.
- **Accessibility**: Buttons have aria-labels; event dialog is keyboard‑dismissible.
- **No `console.*`** in production builds (keeps ESLint clean).

---

## Known issues in dev.12

- In some themes, a **small vertical offset** may appear between the left time scale and the first grid line under the sticky headers. (Tracked and scheduled to fix by measuring header height and inserting an equal spacer in the time column.)

---

## Example

```yaml
type: custom:multi-calendar-grid-card
entities:
  - entity: calendar.nuesken_family_gmail
    name: Family
    color: '#3f51b5'
  - entity: calendar.dennis_nuesken_gmail
    name: Dennis
    color: '#9c27b0'

slot_min_time: '07:00:00'
slot_max_time: '22:00:00'
height_vh: 60
remember_offset: true

weather_entity: weather.integra_langsbau_1_3
weather_days: 7
```
