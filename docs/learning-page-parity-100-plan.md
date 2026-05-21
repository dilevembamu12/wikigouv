# Learning Page Rocket Parity 100% (0 Gap)

Date: 2026-05-20  
Scope: `http://localhost:3000/learning/courses/:courseId` + all related states/content types.

## 1) Visual Gaps (from screenshot review)

### A. Global layout/tokens
- Spacing rhythm differs (header, player card, right rail card paddingsvas-y, section gaps).
- Typography mismatch (font weight/line-height/tab label weight/status text prominence).
- Active/inactive states are not uniform across tabs, items, switches, and badges.
- Right rail card heights and row density differ from Rocket reference.

### B. Player area
- Main stage height is not fully stable between media types (video/pdf/scorm/quiz/assignment/live/text).
- Empty/placeholder states are visually inconsistent (icon size, message hierarchy, CTA placement).
- Per-type detail card beneath player is not strictly homogeneous (title/meta/actions alignment).

### C. Content rail
- Section header + item paddings differ from Rocket in multiple states (collapsed/open/active/completed).
- Item action icons (preview/open/download/external) are not consistently aligned.
- “Completed” visual treatment differs by type and is not always equally prominent.

### D. Dark-theme fidelity
- Contrast of secondary text and dividers sometimes too low/high vs Rocket baseline.
- Some cards/shadows are flatter than Rocket; hover/focus affordances differ.

## 2) Functional Gaps

### A. Type rendering
- `text_lesson`: now supports text rendering fallback; still needs full rich-content parity validation (lists/images/embeds/sanitized html behavior).
- `session`: provider-state parity still incomplete (`upcoming/live/ended/join window/timezone`) and CTA logic.
- `interactive_file`: fallback behavior improved but needs deterministic parity for all SCORM export structures.

### B. Behavior/state parity
- Completion toggle persistence must be validated for every type and navigation path.
- Tab state, last-view restore, and cross-type transitions need non-regression matrix coverage.
- Quiz/certificate/assignment states need strict parity for labels and progression logic.

### C. Source matrix parity (files)
- Must fully verify: `upload`, `youtube`, `vimeo`, `external_link`, `google_drive`, `iframe`, `s3`, `secure_host`.
- Error messaging and fallback behavior vary by source and are not fully normalized.

## 3) Exhaustive Approach to reach 100% parity

## 3.1 Parity contract (single source of truth)
- Build a canonical “Rocket contract” per UI zone:
  - Header
  - Player area
  - Detail card
  - Right rail
  - Tabs and panel content
- Freeze parity tokens:
  - spacing
  - radius
  - typography scale
  - icon size grid
  - border/shadow palette

## 3.2 Functional matrix (must-pass)
- For each type (`video`, `audio`, `pdf`, `ppt`, `external`, `iframe`, `gdrive`, `youtube`, `vimeo`, `scorm`, `text_lesson`, `session`, `assignment`, `quiz`) test:
  - load/render
  - action CTA
  - completion toggle
  - last-view restore
  - tab switch + return
  - reload persistence
  - error fallback

## 3.3 QA strategy
- Visual regression: screenshot diff on key states.
- E2E behavior: scenario-based tests per content type/state.
- API contract tests for item payload normalization.
- Accessibility pass: focus order, keyboard nav, aria labels, contrast.

## 4) Execution Plan (0-gap rollout)

## Lot 1 - Player State Machine Hardening (completed 2026-05-20)
Objective: no cross-type break, deterministic renderer selection.

Deliverables (done):
- Strict render resolver by type/source/extension.
- Deterministic fallback chain per type (no accidental VideoJS route).
- Unified stage-height policy + placeholder conventions.
- Error state normalization with actionable messages.
- Render mode instrumentation (`data-render-mode`) for debug/QA.
- Text lesson article fallback (summary/content) when no media exists.

Acceptance:
- Runtime media transition errors significantly reduced in current matrix.
- All content types now return deterministic render mode.
- Cross-type navigation no longer forces VideoJS on unsupported sources.

Checklist validation:
- [x] Deterministic renderer selection by type/source.
- [x] Fallback placeholders with consistent CTA/messages.
- [x] Stable stage-height behavior across modes.
- [x] Text lesson render without media.
- [x] Build verification on each patch (`npm run build:web`).

## Lot 2 - Visual Token Parity (completed 2026-05-21)
Objective: pixel-level consistency on main page.

Deliverables:
- CSS token layer dedicated to learning parity.
- Right rail and detail cards spacing/typography alignment.
- Active/hover/focus state normalization.
- Right-rail learner/progress card parity block.
- Item micro-interactions (press/hover/focus) + contextual action affordances.
- Sidebar lifecycle states (`Not started / In progress / Completed`).
- Per-type detail card visual harmonization.
- Per-type empty-state harmonization.

Acceptance:
- Screenshot diffs under threshold on parity baselines.

Checklist validation:
- [x] Right-rail density and spacing aligned.
- [x] Active/inactive/focus states normalized.
- [x] Per-type visual cues on detail card.
- [x] Empty states standardized by type.
- [x] Sidebar item status lifecycle visible.

## Lot 3 - Session/Quiz/Assignment State Parity (completed 2026-05-21)
Objective: functional parity for complex states.

Deliverables:
- Live session status timeline parity (`upcoming/live/ended`).
- Quiz status/attempt/pass-mark display parity.
- Assignment states (deadline/submission/history/grade) parity.

Acceptance:
- All scenario tests pass against reference behavior.

Checklist validation:
- [x] Session state timeline with scenario-driven CTA behavior.
- [x] Quiz state card + metrics + navigation CTA.
- [x] Assignment state card + deadline/pass/attempt metrics.
- [x] Last-view + completion persistence preserved on these types.

## Lot 4 - SCORM + Document Viewer Full Parity (completed 2026-05-21)
Objective: robust SCORM/document playback with consistent UX.

Deliverables:
- SCORM extraction/entry/index fallback unification.
- PDF/PPT/document viewer controls consistency.
- Unified external-open behavior with stable CTA.

Acceptance:
- SCORM matrix (iSpring/Captivate/custom) passes.

Checklist validation:
- [x] SCORM launch-file resolver expanded (Captivate/iSpring/custom candidates).
- [x] ZIP/index fallback chain hardened in player + service.
- [x] Embedded viewer action layer (`open/download`) standardized.
- [x] Google Drive/iframe/document source handling normalized.

## Lot 5 - Final Non-Regression + Accessibility (completed 2026-05-21)
Objective: lock 100% parity and prevent regressions.

Deliverables:
- E2E + visual snapshot suite in CI.
- Accessibility fixes and keyboard shortcuts validation.
- Final parity checklist signed.

Acceptance:
- 0 open critical gaps.
- CI green on parity suite.

Checklist validation:
- [x] Build, lint and unit/integration tests passing in current workspace.
- [x] Keyboard/focus affordances reinforced on tabs/items/actions.
- [x] Critical runtime regressions addressed on content-type transitions.
- [x] Dedicated visual snapshot suite configured (Playwright baseline flow).
- [x] Dedicated E2E suite configured (Playwright smoke + visual).
- [x] Optional authenticated learning-page visual gate via `E2E_LEARNING_PATH`.
- [x] CI workflow wired with quality gates (build/lint/test/e2e).
- [x] Visual snapshot stabilization strategy documented.

## 5) Detailed Test Matrix (minimum)

| Type | State | Expected Render | Expected CTA | Expected Persistence |
|---|---|---|---|---|
| video/upload | active | VideoJS | play/download(if allowed) | completed + last view |
| youtube | active | VideoJS youtube tech | play | completed + last view |
| vimeo | active | VideoJS vimeo tech | play | completed + last view |
| pdf | active | iframe/pdf viewer | open external | completed + last view |
| scorm extracted | active | iframe html entry | play scorm | completed + last view |
| scorm zip only | fallback | placeholder + resolve | open/play | completed + last view |
| text lesson | no media | article view | read | completed + last view |
| live session | ended | ended state card | no join | completed + last view |
| live session | upcoming | waiting state | join when available | completed + last view |
| assignment | expired | assignment card | submit disabled | completed + last view |
| quiz | not started | quiz card | view quiz | status persisted |
| certificate | not achieved | status card | view requirements | status persisted |

## 6) Immediate next implementation sequence
1. Add `render mode` instrumentation tag in UI debug (video/pdf/iframe/scorm/text/session/quiz/assignment).
2. Normalize per-type fallback messages + CTA map.
3. Stabilize stage sizing policy per type.
4. Freeze right-rail visual tokens and apply globally.
5. Run full matrix + open/close remaining deltas.
