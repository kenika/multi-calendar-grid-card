# Development

> Baseline: **v0.8.0-dev.19**

## Prereqs

- Node 18+
- PNPM or NPM

## Branch workflow

- Base all work off the `dev` branch.
- Before starting changes, sync with upstream:
  `git fetch` and `git rebase origin/dev` (or merge).
- Create a topic branch for each change:
  `git checkout -b feature/<topic>`.
- Commit and push: `git push -u origin feature/<topic>` then open a PR
  into `dev`.
- Enable auto-merge (or merge manually) once checks pass.
- Skip the **Update branch** button unless `dev` has moved ahead and you
  need the latest commits.

## Scripts

```bash
npm ci
npm run lint       # ESLint (no warnings allowed)
npm run check      # tsc --noEmit
npm run build      # bundle for HA
```

## Git workflow

- `dev` is the active development branch; `main` tracks stable releases.
- Start new work from the latest `dev` and use short‑lived feature branches:

  ```bash
  git checkout dev
  git pull
  git checkout -b feature/<topic>
  ```

- Push the branch and open a pull request back into `dev`:

  ```bash
  git push -u origin feature/<topic>
  ```

- Enable auto‑merge on the PR. Avoid the **Update branch** button; if `dev` moves ahead, rebase or merge locally and push again.
- The former `work` branch has been removed in favor of this workflow.

## Linting rules

- No `console.*` calls left in source
- Avoid decorators that *return values* (some HA toolchains choke on them)
- Keep TypeScript strict enough to catch `any` leaks in public APIs

## Local testing in HA

1. Build with a versioned name (the `.map` will match automatically):

   ```bash
   BUILD_NAME=multi-calendar-grid-card-0.8.0-dev19 npm run build
   ```

   To skip generating source maps, add `SOURCEMAP=false` or pass `--no-sourcemap`:

   ```bash
   BUILD_NAME=multi-calendar-grid-card-0.8.0-dev19 SOURCEMAP=false npm run build
   ```

2. If you rename an existing build later, rename the map too:

   ```bash
   npm run rename -- multi-calendar-grid-card-0.8.0-dev19.js
   ```

3. Copy `dist/multi-calendar-grid-card-0.8.0-dev19.js` to `/config/www/dev/`.
4. Add a **Resource** pointing to `/local/dev/multi-calendar-grid-card-0.8.0-dev19.js` (type `module`).
5. In a test view, add the card via YAML (see README examples).
6. Shift+Reload the dashboard after each build (or clear cache).

## Release hygiene

- Update `CHANGELOG.md`
- Bump the footer version string in the card if needed
- Confirm:
  - initial load shows events
  - headers are sticky
  - weather band renders without errors even if service calls fail
  - no ESLint warnings
