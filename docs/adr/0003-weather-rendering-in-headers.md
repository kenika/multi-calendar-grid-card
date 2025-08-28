# ADR 0003 — Weather Rendering in Day Headers

**Status**: Accepted  
**Date**: 2025-08-28

## Context
We tested popups and richer detail views, but they conflicted with the card flow and duplicated HA’s native more-info.

## Decision
Render **simple, minimal** daily weather in the day header:
- Icon (MDI mapping from HA condition)
- High / Low temperature
- (Optional) precip probability if available

Avoid extra “More info” links and popups; keep click behavior focused on calendar events.

## Consequences
- Consistent, compact UI.
- Lower cognitive load and fewer dependencies on HA internals.
