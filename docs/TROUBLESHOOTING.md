# Troubleshooting

## Weather shows twice in day headers
- Likely the weather addon loaded **twice** (duplicate resource).
- Fix: Keep a single addon resource; hard refresh.

## No weather shown
- Verify card YAML has `weather_entity`.
- Open devtools console and run:
  ```js
  customElements.get('multi-calendar-grid-card')
  window.multiCalendarGrid
  ```
  The addon registers itself; if not present, the resource didn’t load.
- HA Cloud (Nabu Casa) can return `400`/`404` for `weather.get_forecast(s)` or `/api/weather/forecast`. See ADR-0001 for the fallback logic we use.

## “Unknown command” / `400` / `404` on weather calls
- Different HA versions/integrations expose different forecast paths.
- We use a tolerant strategy: try service → simple REST → attributes fallback.

## `customElements.define(...) has already been used`
- A sandbox/custom element was defined multiple times in the console.
- Reload the page.

## “browser is not defined”
- From a browser extension content-script. Ignore—it’s not the card.

## Lit “dev mode” or “multiple versions” warnings
- Benign when multiple custom cards include their own Lit. No action required.
