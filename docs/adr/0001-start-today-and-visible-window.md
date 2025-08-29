# ADR-0001: Rolling window starting today

- **Status**: Accepted (dev.12)
- **Context**: Users want the view to always start “today” without jumping to previous days mid‑week.
- **Decision**: Default `start_today: true`. When true, the 7‑day range starts at the current local day. If `false`, start at `first_day` (0=Sun … 6=Sat).
- **Consequences**: Week navigation shifts by 7 days; localStorage stores week offset keyed by entity set.
