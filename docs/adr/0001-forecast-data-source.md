# ADR 0001 — Forecast Data Source

**Status**: Accepted  
**Date**: 2025-08-28

## Context
We need daily forecast per day header. Across HA versions/integrations we observed:

- `weather.get_forecasts` (WS via `call_service`) sometimes returns `400 Bad Request` or `unknown_command` (notably via Nabu Casa).
- `/api/weather/forecast?entity_id=...&type=daily` often returns `404` under HA Cloud proxy.
- Some `weather.*` entities **don’t expose** `forecast` attributes in state.

## Decision
Implement a tolerant, layered fetch (in the **weather addon**, not in core):

1. **WebSocket service**: try `domain: "weather", service: "get_forecasts"` with `return_response: true`.
2. **Simple REST**: try `GET /api/weather/forecast?entity_id=<id>&type=daily` (works on many local installs).
3. **Attributes fallback**: read `hass.states[entity].attributes.forecast`, and if only hourly exists, **aggregate** hourly → daily (max temp, min temp, most frequent condition, max precip prob, max wind).

If all fail, render a compact “no forecast” placeholder but keep the card functional.

## Consequences
- Users on HA Cloud or with certain weather integrations still get a result via attributes or hourly aggregation.
- Weather code lives in a separate addon file so we can iterate without shipping breaking changes in the main card.

## Alternatives considered
- Hard-depend on a single service/endpoint: rejected (too brittle).
- Ship colored native HA weather icon set: deferred; we currently use minimal MDI icons for performance and theming.
