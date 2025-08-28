# Multi-Calendar Grid Card v0.8.0

**Highlights**
- ✅ Weather in each day header (icon + high/low).  
- ✅ Rolling “today-first” 7-day view (`start_today: true`).  
- 🧰 Internal refactors, better laneing for overlapping events, and small fixes.

---

## Install / Update

1. Download `multi-calendar-grid-card.js` from this release.
2. Upload to your HA host: `/config/www/multi-calendar-grid-card/multi-calendar-grid-card.js`
3. In **Settings → Dashboards → (⋮) Resources**, ensure a resource exists with:
   - URL: `/local/multi-calendar-grid-card/multi-calendar-grid-card.js`
   - Type: **JavaScript Module**
4. Hard refresh your browser (Ctrl/Cmd-Shift-R).

> If you keep a dev copy too, double-check your resource path points to the updated file.

---

## New Configuration

```yaml
type: custom:multi-calendar-grid-card
entities:
  - entity: calendar.family
    name: Family
    color: '#3f51b5'

# Show rolling week starting today
start_today: true

# Optional weather in headers
weather_entity: weather.home
weather_days: 7
weather_compact: false
```

- `start_today` (boolean) — **NEW**. When `true`, the 7-day view begins at “today”.  
- `weather_entity` (string) — Optional `weather.*` entity to render daily weather in day headers.  
- `weather_days` (number) — Days to show (default 7).  
- `weather_compact` (boolean) — Compact header layout for weather.

---

## Fixes / Notes

- Duplicate weather header rows removed.
- TypeScript decorator and lint cleanups.
- Footer now shows running version string.

Thanks for testing and all the great feedback!
