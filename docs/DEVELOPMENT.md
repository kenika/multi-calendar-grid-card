# Development

> Baseline: **v0.8.0-dev.19**

## Prereqs

- Node 18+
- PNPM or NPM

## Scripts

```bash
npm ci
npm run lint       # ESLint (no warnings allowed)
npm run check      # tsc --noEmit
npm run build      # bundle for HA
```

## Linting rules

- No `console.*` calls left in source
- Avoid decorators that *return values* (some HA toolchains choke on them)
- Keep TypeScript strict enough to catch `any` leaks in public APIs

## Local testing in HA

1. Build with a versioned name (the `.map` will match automatically):

   ```bash
   BUILD_NAME=multi-calendar-grid-card-0.8.0-dev19 npm run build
   ```

2. Copy `dist/multi-calendar-grid-card-0.8.0-dev19.js` to `/config/www/dev/`.
3. Add a **Resource** pointing to `/local/dev/multi-calendar-grid-card-0.8.0-dev19.js` (type `module`).
4. In a test view, add the card via YAML (see README examples).
5. Shift+Reload the dashboard after each build (or clear cache).

## Release hygiene

- Update `CHANGELOG.md`
- Bump the footer version string in the card if needed
- Confirm:
  - initial load shows events
  - headers are sticky
  - weather band renders without errors even if service calls fail
  - no ESLint warnings
