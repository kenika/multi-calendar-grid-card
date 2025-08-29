# Troubleshooting

> Baseline: **v0.8.0-dev.15**

## “Unknown card type encountered ‘multi-calendar-grid-card’”
The resource isn’t loaded. Add the module under **Settings → Dashboards → Resources**, or fix the URL.

## “slot_min_time must be HH:MM:SS”
Use quotes and include seconds:
```yaml
slot_min_time: '07:00:00'
slot_max_time: '22:00:00'
```

## No events until you click a legend item
If you previously hid a calendar in this card, its state is persisted in `localStorage`. Toggle it back on in the legend. Clearing browser storage also resets the legend.

## Weather doesn’t show
- Verify `weather_entity` is set
- Some providers only support hourly forecast; the card aggregates hourly → daily
- If all strategies fail, the card simply omits weather for that day (no error shown)

## Visual editor not supported / setConfig is not a function
HA tried to use the editor before it was defined. Ensure the editor bundle is included in the same built file (or lazy‑loaded) and that you hard‑reload the editor after updating.

## Slight misalignment of left time scale vs grid
Fixed in dev.14. All-day events overlay the grid, and the time column automatically pads to match the header height.

## All-day events disappear when scrolling
Fixed in dev.15. Full-day events now stick below the header and use their calendar colors; the focus window also starts beneath this area.

