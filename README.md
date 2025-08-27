# Multi-Calendar Grid Card

A 7‑day time-grid Lovelace card that overlays multiple Home Assistant calendar entities.

## Quick start (for users)

1. Download `multi-calendar-grid-card.js` from the latest GitHub Release.
2. Copy it to your HA host: `/config/www/multi-calendar-grid-card/multi-calendar-grid-card.js`
3. Add a Lovelace resource:
   ```yaml
   url: /local/multi-calendar-grid-card/multi-calendar-grid-card.js?v=0.6.0
   type: module
   ```
4. Add the card:
   ```yaml
   type: custom:multi-calendar-grid-card
   entities:
     - entity: calendar.family
       name: Family
       color: "#3f51b5"
     - entity: calendar.me
       name: Me
       color: "#9c27b0"
   first_day: 1
   slot_min_time: "07:00:00"
   slot_max_time: "22:00:00"
   slot_minutes: 30
   locale: en
   show_now_indicator: true
   show_all_day: true
   remember_offset: true
   header_compact: false
   height_vh: 80
   data_refresh_minutes: 5
   px_per_min: 0.8
   ```

## Dev

```bash
npm ci
npm run build
```

This bundles `src/multi-calendar-grid-card.ts` -> `dist/multi-calendar-grid-card.js` using esbuild.

## CI

GitHub Actions (see `.github/workflows/build.yml`) builds on every push/PR.
Tagging a commit like `v0.6.0` automatically creates a Release with the JS asset.
