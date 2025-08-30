# Changelog

## 0.8.0-dev.17
- Anchor all-day overlay at the top so it no longer shifts the grid or freezes the dashboard.
- Start the time scale beneath the header and all-day area without crashing.

## 0.8.0-dev.16
- Prevent crash when day data is missing for all-day events.
- Offset time column for all-day overlay so the scale starts beneath the header.

## 0.8.0-dev.15
- Keep all-day events visible while scrolling and color them like timed events.
- Fix focus window scroll offset so the first visible hour starts below the header.

## 0.8.0-dev.14
- Overlay all-day events on the grid and remove per-day spacer.
- Fix all-day events incorrectly showing on the following day.

## 0.8.0-dev.13
- Fix misalignment between time scale and calendar grid.

## 0.8.0-dev.12
- Stable UI editor for common options (entities, weather, focus window, height).
- Robust native weather in headers (HA strategies + aggregation for hourly).
- Rolling 7-day view starting today; sticky headers; now indicator (optional).
- localStorage persistence for week offset and scroll position.
- **Known**: minor time-scale/grid offset under some themes.
