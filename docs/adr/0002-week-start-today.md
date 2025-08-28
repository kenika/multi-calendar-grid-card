# ADR 0002 — Week Start = Today

**Status**: Accepted  
**Date**: 2025-08-28

## Context
Previously, the grid always started on Monday (`first_day: 1`). Users mainly plan forward; showing past days wastes space and mismatches with the weather horizon.

## Decision
Support `first_day: "today"` and make it the default in examples. This shifts the 7-day window to start at midnight local **today**.

## Consequences
- Weather overlay cleanly shows the next 7 days.
- Existing configs using `first_day: 1` continue to work.
