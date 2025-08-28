# Multi-Calendar Grid Card

A modern 7-day, time-grid calendar card for Home Assistant. Overlay multiple calendar entities, stack overlapping events, keep all-day events tidy in a pill row, and (optionally) show **daily weather in each day header**.

**Tech:** Lit + TypeScript • Works in normal dashboards and kiosk displays.

> Footer shows the running version. Example: `Multi-Calendar Grid Card v0.8.0`.

---

## Features

- **Multi-calendar overlay** with automatic laneing of overlapping events
- **All-day pills** (optional)
- **“Today” indicator** line (optional)
- **Rolling “today-first” week** (new in v0.8.0)
- **Daily weather in day headers** (new in v0.8.0)
- Remembered scroll offset (optional)
- Lightweight, no external dependencies

Tested on **Home Assistant 2025.8**. Should work on 2024.12+.

---

## Installation

### 1) Download the release asset
Grab `multi-calendar-grid-card.js` from the latest GitHub Release and place it at: /config/www/multi-calendar-grid-card/multi-calendar-grid-card.js


### 2) Add a Lovelace resource
**Settings → Dashboards → (⋮) Resources → + Add resource**

- URL: `/local/multi-calendar-grid-card/multi-calendar-grid-card.js`
- Resource type: **JavaScript Module**

> Tip: After updates, hard-refresh the browser (Ctrl/Cmd-Shift-R) to bust cache.

---

## Configuration (YAML)

Add the card to a view:

```yaml
type: custom:multi-calendar-grid-card
entities:
  - entity: calendar.nuesken_family_gmail
    name: Family
    color: '#3f51b5'
  - entity: calendar.dennis_nuesken_gmail
    name: Dennis
    color: '#9c27b0'
  - entity: calendar.auri_nuesken_gmail_com
    name: Auri
    color: '#03a9f4'

# Time-grid & layout
first_day: 1               # 0=Sun … 6=Sat (used if start_today: false)
start_today: true          # NEW: start the 7-day view at “today”
slot_min_time: '07:00:00'
slot_max_time: '22:00:00'
slot_minutes: 60
px_per_min: 0.8
height_vh: 80
header_compact: false
show_now_indicator: true
show_all_day: true
remember_offset: true
data_refresh_minutes: 5

# Weather in day headers (optional)
weather_entity: weather.integra_langsbau_1_3
weather_days: 7            # default 7
weather_compact: false     # false = show icon + hi/low; true = tighter


