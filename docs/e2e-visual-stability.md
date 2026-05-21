# E2E & Visual Stability Guide

Date: 2026-05-21

## Goal
Make CI results reproducible across environments for:
- `npm run test:e2e`
- `npm run test:visual`

## Deterministic inputs
Use fixed env vars:
- `E2E_BASE_URL=http://127.0.0.1:3000`
- `E2E_LEARNING_PATH=/learning/courses/<stable-course-id>` (optional but recommended in CI if authenticated fixture exists)

## Visual stabilization
`apps/web/e2e/visual.spec.ts` applies runtime CSS to hide volatile UI elements:
- timers/countdowns
- date/time labels
- toasts/modal overlays
- dynamic badges

It also disables animations and uses `maxDiffPixelRatio: 0.01`.

## CI execution order
1. `npm run build`
2. `npm run lint`
3. `npm run test`
4. `npm run test:e2e`

## Snapshot lifecycle
Generate/update baseline snapshots:
- `npm run test:visual:update`

Review diffs before commit:
- `apps/web/e2e/visual.spec.ts-snapshots/*`

## Known constraint
Learning page visual test is skipped if `E2E_LEARNING_PATH` is not set.
This is intentional to avoid flaky auth/data-dependent runs.

