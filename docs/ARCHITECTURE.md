# Architecture

> Baseline: **v0.8.0-dev.12**

## Overview

- **Library**: Lit + TypeScript
- **Custom element**: `<multi-calendar-grid-card>`
- **Goal**: A rolling 7‑day, multi‑calendar **time grid** with native weather in headers.

## Main modules

1. **Rendering (LitElement)**
   - Header toolbar (legend and navigation)
   - Sticky day headers (date + weather)
   - All‑day events overlay
   - Time grid body (00:00–24:00); events positioned using minute offsets

2. **Data fetchers**
   - **Calendar**: Home Assistant REST API `GET /calendars/{entity}?start=...&end=...`
   - **Weather**: robust strategy
     - WS `weather.get_forecasts` (`daily`)
     - WS `weather.get_forecasts` (`hourly` → aggregated to daily)
     - REST `/api/weather/forecast`
     - Fallback to `attributes.forecast`

3. **Layout engine**
   - Event normalization (all‑day vs timed)
   - Per‑day overlap resolution into lanes
   - `px_per_min` controls vertical scale (derived from height and focus window)
   - LocalStorage for `weekOffset` and `scrollTop`

4. **Dialog (minimal)**
   - Built‑in lightweight event details panel
   - No external modal packages; safe fallback if `ha-dialog` unavailable

## Reactive state

- `_config` — merged config with defaults
- `_weekOffset`, `_weekAnchor` — visible window anchor
- `_days[]` — per‑day rendered model
- `_wxByKey` — weather by YYYY‑MM‑DD
- `_error` — aggregated API failures

## Weather aggregation (hourly → daily)

- Group by date (local)
- `hi = max(temperature)`; `lo = min(temperature)`
- `cond = mode(condition/description/state)`
- `pp = max(precipitation_probability)`

## Namespacing / storage

A `hash()` of the entity list (and key flags) forms a `localStorage` namespace; this prevents clashes between multiple cards with different calendar sets.

