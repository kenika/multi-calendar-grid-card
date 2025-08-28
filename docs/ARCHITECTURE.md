# Architecture Overview

**Multi-Calendar Grid Card** renders a 7-day time grid for multiple `calendar.*` entities and (optionally) overlays daily weather in each day header.

## Key parts

- **Card (Lit element)**: `<multi-calendar-grid-card>`
  - Fetches events via Home Assistant REST API:  
    `GET /api/calendars/<calendar.entity>?start=<ISO>&end=<ISO>`
  - Lays out all-day and timed events, computes lanes, draws “now” line.
  - Supports options: `first_day`, `slot_*`, `px_per_min`, `remember_offset`, etc.
  - (From v0.8.0) Week start can be **today**.

- **Weather overlay (addon script)**
  - Small, separate JS that hooks into the card to render forecast in headers when:
    - `weather_entity` is set (e.g. `weather.integra_langsbau_1_3`)
    - The addon script is loaded as a Lovelace Resource.
  - Fetch strategy prefers official HA services/endpoints but falls back to the simplest working calls (see ADR-0001).

## Why an addon script?

- Decouples weather experiments from the card core (fewer rebuilds, safer iterations).
- Lets users opt-in and disable independently.
- Keeps the main bundle smaller and avoids mixed concerns.

See `/docs/adr` for design decisions and trade-offs.
