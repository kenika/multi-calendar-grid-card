# Development Guide

## Requirements
- Node 18+ and npm
- Git
- Home Assistant instance (local or HA Cloud)

## Install
```bash
npm ci
```

## Build (production)
```bash
npm run build
# Output: dist/multi-calendar-grid-card_lit_<hash>.js
```

## Dev workflow with Home Assistant
1. Copy the built JS to HA (dev copy recommended):
   - HA path: `/config/www/dev/multi-calendar-grid-card.dev.js`
   - Or keep the production copy in `/config/www/multi-calendar-grid-card/multi-calendar-grid-card.js`
2. In **Settings → Dashboards → Resources**, add (or edit) a resource:
   - URL: `/local/dev/multi-calendar-grid-card.dev.js`
   - Type: `JavaScript Module`
3. Add the card to your dashboard YAML:
   ```yaml
   type: custom:multi-calendar-grid-card
   entities:
     - entity: calendar.example
       name: Example
       color: '#3f51b5'
   first_day: today
   slot_min_time: '07:00:00'
   slot_max_time: '22:00:00'
   px_per_min: 0.8
   weather_entity: weather.integra_langsbau_1_3
   weather_days: 7
   weather_compact: false
   ```
4. Hard-refresh the dashboard (disable cache) after each change.

### Weather addon (optional)
- Add a resource for the addon script (e.g., `/local/dev/mcg-weather-addon.dev.js`).
- Ensure it loads **after** the card resource.
- No YAML needed beyond setting `weather_entity` in the card config.

## Lint & Typecheck
```bash
npm run lint
npm run typecheck
```

## Release
- Update `CHANGELOG.md`.
- `npm run build`.
- Attach `dist/multi-calendar-grid-card_lit_<hash>.js` to the GitHub Release.
- Update README installation snippet if the filename changed.
