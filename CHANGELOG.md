# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.7.0] — 2025-08-27

> Feature bundle focusing on correctness, UX, and resilience.

### Highlights

* All-day events: proper **exclusive end** handling (ICS/Google semantics).
* Legend filter **persists** per card instance (namespaced `localStorage`).
* `slot_minutes` now drives the time grid ticks.
* **Accessible event dialog**: uses `ha-dialog` when present; otherwise themed overlay.
* Toolbar buttons: `type="button"` + **ARIA** labels.

### Added

* `getStubConfig()` for the card picker (auto-detects up to 2 calendars).
* Lightweight i18n helper (English base).
* Sourcemaps included in build artifacts/releases.

### Changed

* Storage namespace derived from card config to avoid cross-card clashes.
* Build: version is injected at bundle time; CI publishes both a **versioned** and **stable** filename.

### Fixed

* Stale fetch protection: newer requests win; no more flicker on fast week switches.
* Better per-entity errors (show which calendar failed to load).

[Unreleased]: https://github.com/kenika/multi-calendar-grid-card/compare/v0.7.0...HEAD
[v0.7.0]: https://github.com/kenika/multi-calendar-grid-card/releases/tag/v0.7.0
