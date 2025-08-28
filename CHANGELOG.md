# Changelog

All notable changes to this project will be documented in this file.

## [0.8.0] - 2025-08-28
### Added
- **Daily weather in day headers** via `weather_entity`, `weather_days`, `weather_compact`.
- **Rolling “today-first” week** using `start_today: true` (defaults to true).
- Footer version stamp shows running version.

### Changed
- Better lane packing for overlapping events.
- All-day pills kept tidy at top of each day.
- Internal refactors for performance and maintainability.

### Fixed
- Duplicate weather header entries in some configurations.
- Minor build warnings and TypeScript decorator issues.

## [0.7.0] - 2025-08-20
### Added
- Initial public release: 7-day multi-calendar time-grid, all-day pill row,
  “Now” indicator, persisted scroll, compact header mode.
