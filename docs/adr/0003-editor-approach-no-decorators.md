# ADR-0003: Editor approach

- **Status**: Accepted (dev.19)
- **Context**: Some HA builds have issues with property decorators returning values.
- **Decision**: Implement the Lovelace editor **without decorators** and avoid heavy frameworks. Keep the YAML schema as the single source of truth.
- **Scope**: Editor exposes the most common options (entities, weather entity, focus window, height, remember offset). Less‑used/advanced options remain YAML‑only.
