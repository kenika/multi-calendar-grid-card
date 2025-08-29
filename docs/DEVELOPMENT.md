# Development

> Baseline: **v0.8.0-dev.12**

## Prereqs

- Node 18+
- PNPM or NPM

## Scripts

```bash
npm ci
npm test           # run lint + type-check
npm run build      # bundle for HA
```

## Linting rules

- No `console.*` calls left in source
- Avoid decorators that *return values* (some HA toolchains choke on them)
- Keep TypeScript strict enough to catch `any` leaks in public APIs

## Local testing in HA

1. Copy the build to `/config/www/dev/multi-calendar-grid-card-dev12.js`.
2. Add a **Resource** pointing to `/local/dev/multi-calendar-grid-card-dev12.js` (type `module`).
3. In a test view, add the card via YAML (see README examples).
4. Shift+Reload the dashboard after each build (or clear cache).

## Release hygiene

- Update `CHANGELOG.md`
- Bump the footer version string in the card if needed
- Confirm:
  - initial load shows events
  - headers are sticky
  - weather band renders without errors even if service calls fail
  - no ESLint warnings
