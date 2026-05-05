---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-05-05
oat_current_task_id: null
oat_generated: false
---

# Implementation: independent-brainstorming

**Started:** 2026-05-01
**Last Updated:** 2026-05-03

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, ensure `## Final Summary (for PR/docs)` is filled with what was actually implemented.

## Review History

### Review Received: design (artifact)

**Date:** 2026-05-01
**Review artifact:** `reviews/archived/artifact-design-review-2026-05-01.md`

**Findings:**

- Critical: 0
- Important: 1 (`I1`: default user-scope installer behavior)
- Medium: 1 (`M1`: fold-back commit-safety contract)
- Minor: 1 (`m1`: dogfood scenario count wording)

**Disposition:** all three resolved in artifact (`resolve_in_artifact`).

**Edits applied to `design.md`:**

- `I1`: added "Pack-default-scope metadata" subsection to Component B specifying `PACK_METADATA` with `defaultScope: 'user' | 'project'`, installer changes for both interactive picker and non-interactive resolution paths, and required test coverage. Updated Component B design decisions to call out metadata-driven defaults.
- `M1`: added "Fold-back commit safety contract" subsection under Architecture covering preflight `git status` check, clean / dirty / abort paths, scoped staging discipline, and the rule that the handoff prompt prints only after the scoped commit succeeds.
- `m1`: clarified Dogfood scenarios paragraph to describe ten scenarios across nine destination families (with doc-to-path split into in-repo / off-repo cases).

**No plan tasks created** (artifact reviews resolve in-place per skill convention).

**Next:** continue to plan generation via `oat-project-quick-start` (re-review optional; the user opted to proceed without re-review for these targeted edits).

### Review Received: plan (artifact)

**Date:** 2026-05-01
**Review artifact:** `reviews/archived/artifact-plan-review-2026-05-01.md`

**Findings:**

- Critical: 0
- Important: 2 (`I1`: pack registration omits bundle-assets / types.ts / per-pack install helper; `I2`: docs task references invented `docs/skills/` path and skips nav contract)
- Medium: 1 (`M1`: release task omits `public-package-versions.json` regeneration)
- Minor: 1 (`m1`: plan keeps template review placeholders)

**Disposition:** all four resolved in artifact (`resolve_in_artifact`).

**Edits applied to `plan.md`:**

- `I1`: expanded p02-t01 file list to include `packages/cli/scripts/bundle-assets.sh` (SKILLS array entry) and `packages/cli/src/commands/tools/shared/types.ts` (PackName union); split the previous p02-t02 into a new p02-t02 (per-pack install helper directory under `packages/cli/src/commands/init/tools/brainstorm/`) and a new p02-t03 (runInitTools dispatcher imports + dependency interface + default deps + dispatch branch + update/remove handlers + picker description + default-on set entry); renumbered remaining Phase 2 tasks (visual-companion bundle, persistence paths, guide port, destinations playbook, brainstorm-doc template) to t04 through t08. Phase 2 grew from 7 to 8 tasks; total plan from 22 to 23.
- `I2`: rewrote p04-t01 file list to use concrete docs paths (`apps/oat-docs/docs/cli-utilities/tool-packs.md` and `apps/oat-docs/docs/workflows/skills/index.md`), dropped the proposed `apps/oat-docs/docs/skills/oat-brainstorm.md` standalone page (no such directory; would have violated the AGENTS.md nav contract), documented why no `cli-utilities/index.md` update is needed (existing link).
- `M1`: added `packages/cli/assets/public-package-versions.json` to p04-t03 file list, inserted explicit `bash packages/cli/scripts/bundle-assets.sh` regeneration step, updated `git add` commands to stage the regenerated asset.
- `m1`: stripped the two template placeholder paragraphs from `## Reviews` section (`{Track reviews here...}` and `{Keep both code + artifact rows below...}`).

**No plan tasks created** (artifact reviews resolve in-place per skill convention).

**Next:** continue to implementation via `oat-project-implement` (re-review optional; user can re-run `oat-project-review-provide artifact plan` if they want a confirmation pass).

## Progress Overview

| Phase        | Status   | Tasks | Completed |
| ------------ | -------- | ----- | --------- |
| Phase 1      | complete | 4     | 4/4       |
| Phase 2      | complete | 8     | 8/8       |
| Phase 3      | complete | 7     | 7/7       |
| Phase 4      | complete | 5     | 5/5       |
| Phase 5      | complete | 8     | 8/8       |
| Phase p-rev1 | complete | 3     | 3/3       |
| Phase p-rev2 | complete | 8     | 8/8       |

**Total:** 43/43 tasks completed

### Revision Received: Inline Feedback

**Date:** 2026-05-03
**Source:** inline conversation

**Changes requested:**

- Make `oat-brainstorm` explicitly own destinationless "let's brainstorm" / "brainstorm this" phrasing instead of letting `oat-idea-ideate` win by mentioning brainstorming in its description.
- Narrow `oat-idea-ideate` to existing tracked ideas or explicit scratchpad seeds, with a negative rule for brand-new destinationless brainstorms.
- Stop offering the visual companion immediately for text-likely brainstorms; classify visual need first, defer silently when text-likely, and resurface only when the conversation turns visual.
- Remove fixed progress counters that force a visual-companion offer.
- Refresh bundled assets, skill versions, lockstep public package versions, and release validation for the shipped skill changes.

**New tasks added:** `prev1-t01`, `prev1-t02`, `prev1-t03`

**Next:** Revision tasks implemented in commit `42a8d2db`; push the PR update and run a focused re-review.

### Revision Completed: Inline Feedback

**Date:** 2026-05-03
**Commit:** `42a8d2db` (`fix(prev1): incorporate brainstorm UX revisions`)

**Tasks completed:** `prev1-t01`, `prev1-t02`, `prev1-t03`

**Outcome:**

- `oat-brainstorm` now explicitly owns destinationless "let's brainstorm" / "brainstorm this" / "brainstorm <topic>" phrasing and warns against inferring a destination before convergence.
- `oat-idea-ideate` now applies only to tracked ideas or explicit scratchpad seeds and routes blank-slate brainstorms back to `oat-brainstorm`.
- The visual companion is now gated by visual-need assessment. Text-likely brainstorms set `VISUAL_COMPANION = "deferred"` and continue without an immediate offer; the offer resurfaces later only if the conversation turns visual.
- Fixed progress guidance so there is no mandatory `[3/9] Offering the visual companion...` step.
- Updated docs and bumped changed skill frontmatter versions plus the lockstep public package versions to `0.0.60`.

**Verification:**

- `pnpm format`: pass
- `pnpm lint`: pass when run sequentially
- `pnpm type-check`: pass when run sequentially
- `pnpm release:validate`: pass for 5 public packages at `0.0.60`
- `pnpm oat:validate-skills`: expected failure only on pre-existing unrelated skill metadata issues (`oat-pjm-add-backlog-item`, `oat-pjm-update-repo-reference`, `oat-project-document`, `oat-project-pr-final`, `oat-project-spec`, `oat-project-summary`). The new `oat-brainstorm` and `oat-idea-ideate` validation issues were fixed and no longer appear.

**Note:** An initial parallel run of `pnpm lint` and `pnpm type-check` raced `packages/cli/scripts/bundle-assets.sh` against itself because both commands transitively run the CLI build. Sequential reruns passed.

### Revision Received: Activation Contract Tightening

**Date:** 2026-05-04
**Source:** inline conversation (continued dogfood pass after `prev1-review-2026-05-03.md`)

**Changes requested:**

- Tighten `oat-brainstorm` activation: drop weak conversational openers ("I've been thinking about", "what if we did") from the frontmatter description because they are too generic and cause the always-on skill to fire on ordinary advisory conversation.
- Establish behavior-vs-mode separation: brainstorm-quality response (options, tradeoffs, no premature implementation) is the default for any exploratory phrasing; the OAT brainstorm banner + mode assertion is reserved for explicit hard-activation triggers or user confirmation.
- Add an Activation Contract section with three tiers: Hard Activation (banner + mode), Soft Exploratory Path (no banner; brainstorm-quality response by default; offer mode after ≥2 sustained exploratory turns), No Activation (advisory/review/debug/PR/status/implementation/active-workflow questions never auto-activate).
- Add anti-cases to dogfood-results.md so the activation discrimination is dogfood-testable.
- Absorb the three non-blocking minors from `prev1-review-2026-05-03.md` (BLOCKED visual-companion redundancy in `oat-brainstorm/SKILL.md`, missing "resume an existing idea" hint in `apps/oat-docs/docs/workflows/skills/index.md`, missing direct-entry note in `apps/oat-docs/docs/workflows/ideas/index.md`).
- Bump the 5 lockstep public packages to `0.0.61`. Per AGENTS.md the skill `version:` bump is PR-scoped and was already applied during prev1, so `oat-brainstorm/SKILL.md` stays at `1.0.1`.

**New tasks added:** `prev2-t01`, `prev2-t02`, `prev2-t03`

**Next:** Implement the revision and push the PR update; have Codex run a focused re-review.

### Revision Completed: Activation Contract Tightening

**Date:** 2026-05-04
**Commit:** `589434ce` (`fix(prev2): tighten brainstorm activation contract`)

**Tasks completed:** `prev2-t01`, `prev2-t02`, `prev2-t03`

**Outcome:**

- `oat-brainstorm` frontmatter description tightened to explicit `brainstorm`-verb triggers only. Weak generic openers ("I've been thinking about", "what if we did") removed from the discovery surface.
- Added a new `## Activation Contract` section before Mode Assertion that establishes the behavior-vs-mode distinction: brainstorm-quality response is the default for any exploratory phrasing; banner + mode is reserved for explicit Hard Activation or user-confirmed escalation.
- Three-tier contract: **Hard Activation** (explicit `brainstorm` verb or `/oat-brainstorm` → banner + mode), **Soft Exploratory Path** ("help me think through", "I've been thinking", "what if we" → no banner; brainstorm-quality response by default; offer mode after ≥2 sustained exploratory turns), **No Activation** (advisory / review / debug / PR / status / implementation / active-workflow questions → direct response, no banner, no offer).
- BLOCKED Activities: collapsed the two redundant visual-companion rules into one combined rule (resolves prev1-review minor #1); added a new top rule that suppresses banner / mode / pack detection / visual offer for Soft and No Activation paths.
- Self-Correction Protocol: new top rule for printing the banner on Soft / No Activation paths.
- Step 1 Activate: rewritten to gate the Process flow on the Activation Contract; documents the soft-offer escalation path explicitly.
- Progress Indicators: added a gating note that the indicators apply only on Hard Activation.
- `references/dogfood-results.md`: added an Activation Anti-Cases section with 12 walkthrough rows across the three tiers (6 Hard Activation, 6 Soft Exploratory Path including the post-2-turn offer, 10 No Activation).
- Docs: `apps/oat-docs/docs/cli-utilities/tool-packs.md` brainstorm pack section rewritten to reflect the contract; `apps/oat-docs/docs/workflows/skills/index.md` adds the "resume an existing idea or expand a scratchpad seed" hint to the `oat-idea-ideate` catalog entry (resolves prev1-review minor #2); `apps/oat-docs/docs/workflows/ideas/index.md` adds an explicit direct-entry note that `oat-idea-ideate` requires an existing target (resolves prev1-review minor #3).
- 5 lockstep public packages bumped `0.0.60` → `0.0.61`. Per AGENTS.md the skill `version:` field is PR-scoped and was already bumped during prev1; `oat-brainstorm/SKILL.md` stays at `1.0.1`.

**Verification:**

- `pnpm release:validate`: pass on all 5 public packages at `0.0.61`.
- `pnpm format`: pass.
- `pnpm lint`: pass (0 warnings, 0 errors).
- `pnpm type-check`: pass (10 packages).
- `pnpm --filter @open-agent-toolkit/cli test`: pass (1463 tests across 163 files).
- `pnpm oat:validate-skills`: `oat-brainstorm` and `oat-idea-ideate` validate clean. Pre-existing 6 unrelated failures unchanged (`oat-pjm-add-backlog-item`, `oat-pjm-update-repo-reference`, `oat-project-document`, `oat-project-pr-final`, `oat-project-spec`, `oat-project-summary`).

### Review Received: prev2

**Date:** 2026-05-04
**Review artifact:** `reviews/archived/prev2-review-2026-05-04.md`

**Findings:**

- Critical: 0
- Important: 3 (`I1`: `thoughts?` contradicts No Activation; `I2`: visual-companion smoke tests fail under `CODEX_CI=1`; `I3`: PR #70 DIRTY against `origin/main`)
- Medium: 0
- Minor: 2 (`m1`: state.md / plan.md bookkeeping drift; `m2`: `bl-f19a` markdown spacing)

**Disposition:** all 5 findings converted to fix tasks (no deferrals; both minors have `Negligible` scope and are likely future cleanup).

**New tasks added:** `prev2-t04`, `prev2-t05`, `prev2-t06`, `prev2-t07`, `prev2-t08`

**Next:** Execute fix tasks via the `oat-project-implement` skill. After completion, run `oat-project-review-provide code prev2` then `oat-project-review-receive` to reach `passed`.

After the fix tasks are complete:

- Update the prev2 review row status to `fixes_completed`
- Re-run `oat-project-review-provide code prev2` then `oat-project-review-receive` to reach `passed`

### Revision Completed: prev2 Review Fixes

**Date:** 2026-05-05
**Commit:** `877fbdc5` (`fix(prev2-review): apply review findings`)

**Tasks completed:** `prev2-t04`, `prev2-t05`, `prev2-t06`, `prev2-t07`, `prev2-t08`

**Outcome:**

- prev2-t04 (I1): removed `thoughts?` from the Soft Exploratory Path example list in both `oat-brainstorm/SKILL.md` frontmatter and `apps/oat-docs/docs/cli-utilities/tool-packs.md`. The classification is now consistent — `thoughts?` appears only in No Activation / advisory contexts.
- prev2-t05 (I2): scrubbed `CODEX_CI` from the spawned child env in `packages/cli/src/integration/visual-companion-smoke.test.ts`. `start-server.sh` runtime behavior is intentionally unchanged (foreground fallback for real Codex usage). All 5 smoke tests now pass under `CODEX_CI=1`.
- prev2-t06 (I3): rebased onto `origin/main` (177d67f5). No conflicts — the prev2 branch was already ahead. Bumped lockstep `0.0.62 → 0.0.63` to cover the new shipped content from prev2-t04/t05; regenerated `packages/cli/assets/public-package-versions.json`. Push deferred to the orchestrator.
- prev2-t07 (m1): refreshed `state.md` (`oat_last_commit`, `oat_project_state_updated`, body, Next Milestone), `plan.md` `## Implementation Complete` totals, and `implementation.md` Progress Overview. `.oat/state.md` regenerated via `pnpm run cli -- state refresh`.
- prev2-t08 (m2): repaired the inline-code spacing in `.oat/repo/reference/backlog/items/strict-yaml-validation-in-validate-skills.md` line 21. The original sentence was being collapsed by `oxfmt` because of the unparseable nested escaped-backtick code span; restructured the example into a fenced YAML code block, which preserves the trailing prose spacing through the formatter.

**Verification:**

- `pnpm release:validate`: pass on all 5 public packages at `0.0.63`.
- `pnpm format`: pass.
- `pnpm lint`: pass (0 warnings, 0 errors).
- `pnpm type-check`: pass (10 packages).
- `pnpm --filter @open-agent-toolkit/cli test`: pass (1465 tests across 163 files; visual-companion smoke 5/5 included).
- `CODEX_CI=1 pnpm --filter @open-agent-toolkit/cli exec vitest run src/integration/visual-companion-smoke.test.ts`: 5/5 pass.
- `pnpm oat:validate-skills`: 48/48 pass.
- `gh pr view 70 --json mergeStateStatus`: `DIRTY` (expected — orchestrator will push and CI will re-run).

**Next:** Orchestrator force-pushes the rebased branch (`--force-with-lease`), then re-runs `oat-project-review-provide code prev2` + `oat-project-review-receive` to reach `passed`.

---

## Orchestration Runs

<!-- orchestration-runs-start -->

### Run 1 — 2026-05-01 23:49

**Branch:** feat/independent-brainstorming-mode
**Tier:** 1
**Policy:** merge-strategy=merge, retry-limit=2
**Phases:** 5 executed, 5 passed, 0 failed, 0 stopped

#### Phase Outcomes

| Phase | Implementer        | Review | Fix Iterations | Disposition |
| ----- | ------------------ | ------ | -------------- | ----------- |
| p01   | DONE               | pass   | 0/2            | merged      |
| p02   | DONE_WITH_CONCERNS | pass   | 0/2            | merged      |
| p03   | DONE_WITH_CONCERNS | pass   | 0/2            | merged      |
| p04   | DONE               | pass   | 0/2            | merged      |
| p05   | DONE               | pass   | 0/2            | merged      |

#### Parallel Groups

- p01, p02, p03, p04, p05: sequential (no parallel groups declared)

#### Outstanding Items

- p01 minor findings (recorded, not blocking): (1) `PACK_METADATA` mutability comment — advisory; (2) empty-map guard test update — addressed in p02-t01.
- p02 minor findings (recorded, not blocking): (1) stub test that's redundant with a real picker test in `commands/init/tools/index.test.ts:918-938` — flagged for cleanup; (2) Mustache placeholders in `brainstorm-doc.md` are convention-only in this repo — advisory; (3) smoke-test cleanup hardening note for visual-companion server — advisory.
- p02 implementer noted scope expansion in p02-t01 was forced by the `PackName` union extension (cascading exhaustive-switch updates across `BUNDLED_PACK_MEMBERS` / `BUNDLED_PACK_ASSETS` / `install-sync-context` / `scan-tools` / `VALID_PACKS` / `PACK_DESCRIPTIONS`) — confirmed by reviewer as necessary type-completeness work, not scope drift.
- p03 reviewer flagged one Medium: `pnpm format --check` fails on bundled MIT-port files (`frame-template.html`, `helper.js`, `server.cjs`) under `packages/cli/assets/skills/oat-brainstorm/scripts/`. Pre-existing from Phase 2's verbatim port (confirmed via stash test). **Hard prerequisite for `p04-t04` (`pnpm release:validate`)** — Phase 4 implementer must add the bundled scripts path to `.oxfmtrc.jsonc` ignore patterns or fix the format issue before release validation runs.
- Pre-existing skill validation failures (`oat-pjm-update-repo-reference`, `oat-project-spec`) predate this run; not in scope.

<!-- orchestration-runs-end -->

---

---

## Phase 1: Pack-metadata mechanism

**Status:** complete
**Started:** 2026-05-01
**Completed:** 2026-05-01

### Phase Summary

**Outcome (what changed):**

- Introduced generalized `PackMetadata` mechanism in the installer (interface + empty `PACK_METADATA` map + `resolvePackDefaultScope` helper). No `brainstorm`-specific entry yet — that lands in Phase 2.
- Wired `resolvePackDefaultScope` into both installer paths: `buildUserScopeChoices` (interactive picker default-checked state) and the non-interactive branch of `resolvePackScopes`.
- Existing-install detection now short-circuits before `PACK_METADATA` consultation in both paths, so a user with a prior project-scope install doesn't get an unexpected scope migration. The interactive path was already correct (location-first short-circuit in `buildUserScopeChoices`); the non-interactive path required a real reorder.
- Added regression tests for both interactive and non-interactive scope-resolution paths using stubbed `PACK_METADATA` fixtures with `afterEach` cleanup.

**Key files touched:**

- `packages/cli/src/commands/init/tools/shared/skill-manifest.ts` — added `PackMetadata` interface, `PACK_METADATA` map, `resolvePackDefaultScope` helper.
- `packages/cli/src/commands/init/tools/shared/pack-metadata.test.ts` (new) — TDD coverage for the helper.
- `packages/cli/src/commands/init/tools/index.ts` — wired metadata lookup into both picker and non-interactive resolver; preserved existing-install precedence.
- `packages/cli/src/commands/init/tools/index.test.ts` — added picker + non-interactive defaultScope tests; added migration-safety regression guards.

**Verification:**

- `pnpm lint`: pass
- `pnpm type-check`: pass
- `pnpm --filter @open-agent-toolkit/cli test`: pass (1424 tests across 160 files)
- Per-task RED→GREEN cycles confirmed for p01-t01, p01-t02, p01-t03, and the non-interactive branch of p01-t04. The interactive case in p01-t04 was already passing pre-change (existing short-circuit) and serves as a regression guard.

**Commits:** `9602b06f`, `2575b028`, `fb7da4ca`, `fee63c7b`

**Review:** passed (0/0/0/2). Artifact: `reviews/archived/p01-code-review-2026-05-01.md`. Minor findings recorded under Outstanding Items.

**Notes / Decisions:**

- {trade-offs or deviations discovered during implementation}

### Task p01-t01: {Task Name}

**Status:** completed / in_progress / pending / blocked
**Commit:** {sha} (if completed)

**Outcome (required when completed):**

- {what materially changed (not “did task”, but “system now does X”)}

**Files changed:**

- `{path}` - {why}

**Verification:**

- Run: `{command(s)}`
- Result: {pass/fail + notes}

**Notes / Decisions:**

- {gotchas, trade-offs, design deltas, important context for future sessions}

**Issues Encountered:**

- {Issue and resolution}

---

### Task p01-t02: {Task Name}

**Status:** pending
**Commit:** -

**Notes:**

- {Notes will be added during implementation}

---

## Phase 2: Brainstorm pack registration + skill scaffolding + bundle

**Status:** complete
**Started:** 2026-05-01
**Completed:** 2026-05-01

### Phase Summary

**Outcome (what changed):**

- Registered the `brainstorm` pack across the OAT install/update/remove pipelines: manifest constants (`BRAINSTORM_SKILLS`, `PACK_METADATA[brainstorm]: { defaultScope: 'user' }`), `PackName` union, `bundle-assets.sh` SKILLS array, exhaustive switches across `BUNDLED_PACK_MEMBERS` / `BUNDLED_PACK_ASSETS` / `install-sync-context` / `scan-tools` / `VALID_PACKS` / `PACK_DESCRIPTIONS`, dispatcher imports + dependency interface + default deps + dispatch branch, update/remove handlers, interactive picker description, and `oat init tools` default-on set entry.
- Created the per-pack install helper at `packages/cli/src/commands/init/tools/brainstorm/` mirroring the existing `ideas/` and `docs/` patterns (`install-brainstorm.ts` + tests + `index.ts` + tests).
- Ported the visual-companion bundle from `superpowers:brainstorming@5.0.7` (MIT): `server.cjs`, `stop-server.sh`, `frame-template.html`, `helper.js` byte-for-byte verbatim, plus `start-server.sh` patched only in its persistence-path resolution to use OAT-managed prefixes (`.oat/brainstorm/<session-id>/` repo-scope, `~/.oat/brainstorm/<session-id>/` user-scope, `<project-dir>/.oat/brainstorm/<session-id>/` when `--project-dir` is passed).
- Ported `references/visual-companion.md` with prose updated for OAT path conventions; extended `NOTICES.md` with a "visual companion" subsection enumerating verbatim vs patched files.
- Created the destinations playbook (`references/destinations.md`) with stanzas for all 9 destination families: name, pack required, trigger phrases, required template fields, optional fields, confirmation pattern, handoff target, and "if user wants to keep brainstorming" rule.
- Created the doc-to-path output template (`templates/brainstorm-doc.md`) matching the synthesized-payload field set.
- Scaffolded `.agents/skills/oat-brainstorm/SKILL.md` with frontmatter and section stubs (Mode Assertion, Progress Indicators, Process, Success Criteria) — body content fills in Phase 3.

**Key files touched:**

- `.agents/skills/oat-brainstorm/{SKILL.md, scripts/*, references/*, templates/brainstorm-doc.md}` — skill bundle.
- `packages/cli/src/commands/init/tools/shared/skill-manifest.ts` — `BRAINSTORM_SKILLS` constant + `PACK_METADATA[brainstorm]` entry.
- `packages/cli/src/commands/tools/shared/types.ts` — `PackName` union extended with `'brainstorm'`.
- `packages/cli/scripts/bundle-assets.sh` — SKILLS array entry.
- `packages/cli/src/commands/init/tools/brainstorm/{install-brainstorm.ts, install-brainstorm.test.ts, index.ts, index.test.ts}` — per-pack install helper.
- `packages/cli/src/commands/init/tools/index.ts` — runInitTools dispatcher wiring + picker description + default-on set.
- `packages/cli/src/commands/tools/{update/update-tools.ts, remove handlers}` — pack-name registration in update/remove handlers.
- Cascading exhaustive-switch updates across pack-aware modules: `BUNDLED_PACK_MEMBERS`, `BUNDLED_PACK_ASSETS`, `install-sync-context`, `scan-tools`, `VALID_PACKS`, `PACK_DESCRIPTIONS`.
- `NOTICES.md` — visual companion attribution subsection.
- `packages/cli/src/commands/help-snapshots.test.ts` — 5 help-text snapshots updated for the new pack.

**Verification:**

- `pnpm lint`: pass
- `pnpm type-check`: pass
- `pnpm --filter @open-agent-toolkit/cli test`: pass (1449 tests, +5 over Phase 1 baseline)
- `pnpm --filter @open-agent-toolkit/cli exec vitest run packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts`: 13/13 pass
- `bash packages/cli/scripts/bundle-assets.sh && ls packages/cli/assets/skills/oat-brainstorm/SKILL.md`: bundle regenerates with `oat-brainstorm/{SKILL.md, scripts/, references/, templates/}` placed correctly.
- `pnpm oat:validate-skills`: `oat-brainstorm` validates cleanly. Pre-existing failures (`oat-pjm-update-repo-reference`, `oat-project-spec`) were present in HEAD `05b658fc` before Phase 2 and are unrelated.
- Visual-companion smoke test runs the full lifecycle (start, GET /, stop) and exercises all 3 persistence-path branches cleanly.

**Commits:** `16756f94`, `0b6fbc86`, `7a305a6a`, `de83601b`, `6107d57f`, `a2022e67`, `c5dfba2b`, `52ae3e13`

**Review:** passed (0/0/0/3). Artifact: `reviews/archived/p02-code-review-2026-05-01.md`. Reviewer confirmed scope expansion in p02-t01 was necessary type-completeness work (not scope drift), MIT-port files are byte-for-byte verbatim, and `oat-brainstorm` is the only skill validating cleanly that wasn't already (pre-existing failures unrelated). Three minor advisory findings recorded under Outstanding Items.

---

## Phase 3: Skill flow implementation

**Status:** complete
**Started:** 2026-05-01
**Completed:** 2026-05-01

### Phase Summary

**Outcome (what changed):**

- Filled in `.agents/skills/oat-brainstorm/SKILL.md` end-to-end. Phase 2 left it as a scaffold; Phase 3 turned it into a complete dispatcher. All 7 commits modify the same file (verified — only `SKILL.md` touched across the phase).
- **Always-on description** is now final: tightly tuned for exploratory phrasing ("I've been thinking about", "what if we did", design uncertainty, thinking-out-loud signals) with explicit "Do NOT use" exclusions for routine implementation requests and named-destination work where the user would invoke a destination skill directly. Adapted from `superpowers:brainstorming` with OAT vocabulary.
- **Mode Assertion** has all five sub-sections (purpose, blocked, allowed, self-correction protocol, recovery).
- **Process steps 1-9** are filled in completely with no placeholders.
- **Visual companion offer** is its own message with a `node` pre-flight check (suppresses offer if missing).
- **Pack and active-project detection** uses `oat config get tools.<pack>` and `oat config get activeProject` (the canonical patterns).
- **Conversation cadence** matches Superpowers (one question at a time, 2-3 approaches with recommendation, scaled-section design presentation).
- **Destination identification** uses opportunistic trigger surfacing against `references/destinations.md` plus convergence cues; ambiguous matches confirmed before commit.
- **Synthesis with confirmation** consults the destinations playbook for full / minimal / none confirmation pattern; the `SynthesizedPayload` schema matches the design verbatim.
- **All 9 handoff branches** are present (inline / doc-to-path / capture-as-new-idea / extend-existing-idea / summarize-idea-directly / scoped-backlog-item / promote-to-new-OAT-project / active-project router / fold-back / active-project reference file).
- **Promote-to-new-OAT-project handoff** writes `discovery.md` only — never `design.md` — and stops with a pointer to `oat-project-quick-start` / `oat-project-design`.
- **Active-project 3-way router** appears before the standard pack-filtered picker.
- **Fold-back commit safety contract** is word-for-word aligned with the design's subsection: preflight `git status --porcelain -- "$ARTIFACT_PATH"`, scoped staging `git add -- "$ARTIFACT_PATH"` (never `-A`, never globs), three-option dirty-tree picker, conditional handoff prompt printed only after the scoped commit succeeds.
- **Success Criteria** items are concrete and testable.

**Key files touched:**

- `.agents/skills/oat-brainstorm/SKILL.md` — exclusively. Phase boundary held cleanly.

**Verification:**

- `pnpm lint`: pass
- `pnpm type-check`: pass
- `pnpm --filter @open-agent-toolkit/cli test`: pass (1449 tests)
- `pnpm oat:validate-skills`: `oat-brainstorm` validates clean. Two pre-existing failures (`oat-pjm-update-repo-reference`, `oat-project-spec`) confirmed unrelated and predate this run.
- `git show --stat 88a1c829..c3a0596b` confirms the only file changed is `SKILL.md`.

**Commits:** `c9c01382`, `c636540d`, `e788f0ae`, `04668680`, `54cffb7f`, `b47ac1bd`, `c3a0596b`

**Review:** passed (0/0/1/0). Artifact: `reviews/archived/p03-code-review-2026-05-01.md`. The single Medium finding is `pnpm format --check` failing on the bundled MIT-port files (`frame-template.html`, `helper.js`, `server.cjs`) under `packages/cli/assets/skills/oat-brainstorm/scripts/` — confirmed pre-existing from Phase 2's verbatim port via stash test, out-of-scope for Phase 3 but flagged as a **hard prerequisite for `p04-t04` (`pnpm release:validate`)**. Phase 4 implementer must address by adding the bundled scripts path to `.oxfmtrc.jsonc` ignore patterns before running `release:validate`.

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-05-01

**Session Start:** {time}

- [x] p01-t01: {Task name} - {commit sha}
- [ ] p01-t02: {Task name} - in progress

**What changed (high level):**

- {short bullets suitable for PR/docs}

**Decisions:**

- {Decision made and rationale}

**Follow-ups / TODO:**

- {anything discovered during implementation that should be captured for later}

**Blockers:**

- {Blocker description} - {status: resolved/pending}

**Session End:** {time}

---

### 2026-05-01

**Session Start:** {time}

{Continue log...}

---

## Deviations from Plan

Document any deviations from the original plan.

| Task | Planned | Actual | Reason |
| ---- | ------- | ------ | ------ |
| -    | -       | -      | -      |

## Test Results

Track test execution during implementation.

| Phase | Tests Run | Passed | Failed | Coverage |
| ----- | --------- | ------ | ------ | -------- |
| 1     | -         | -      | -      | -        |
| 2     | -         | -      | -      | -        |

### Review Received: final (code)

**Date:** 2026-05-02
**Review artifact:** `reviews/archived/final-review-2026-05-02.md`

**Findings:**

- Critical: 0
- Important: 6
  - `I1`: `tools.brainstorm` not registered in config schema (`oat-config.ts`, `resolve.ts`, `commands/config/index.ts`)
  - `I2`: pack-specific brainstorm install bypasses standard lifecycle (existing-install scan, scope precedence, config write)
  - `I3`: SKILL.md visual-companion path hard-coded to project-scope (breaks under user-scope default install)
  - `I4`: `.oat/brainstorm/` not actually gitignored despite docs claiming it is
  - `I5`: OAT state artifacts stale (`.oat/state.md` and project state.md body)
  - `I6`: plan claimed end-to-end dogfood, artifact is walkthrough — disagreement
- Medium: 2
  - `M1`: active-project reference destination tracked-vs-local semantics ambiguous
  - `M2`: current-state.md workflow path references point at non-existent `apps/oat-docs/docs/guide/workflow/...` paths
- Minor: 1
  - `m1`: current-state.md pack list omits `brainstorm`

**Disposition:** all 9 findings converted to fix tasks (user-approved disposition; final-scope minor `m1` explicitly converted per user direction). No deferrals.

**Path (b) chosen for `I6`:** revise plan and dogfood-results to honestly reflect walkthrough; create a dogfood backlog item with a copy of `dogfood-results.md` in its body; copy `dogfood-results.md` to user vault path (`/Users/thomas.stang/Library/Mobile Documents/iCloud~md~obsidian/Documents/Vault/02 - Projects/Open Agent Toolkit/References/dogfood-results.md`) so it's available while the user manually does _some_ dogfooding before merging.

**New tasks added:** `p05-t01` through `p05-t08` (8 tasks total). Phase 5 created as a "Final-review fixes" phase. Plan total: 24 → 32 tasks.

**Next:** Execute fix tasks via the `oat-project-implement` skill. After all p05 tasks complete:

- Update the `final` review row status to `fixes_completed`
- Re-run `oat-project-review-provide code final` (or scoped to p05 fix commits per re-review narrowing) and `oat-project-review-receive` to reach `passed`
- Then proceed to `oat-project-pr-final`

### Review Received: final (code, re-review v2)

**Date:** 2026-05-02
**Review artifact:** `reviews/archived/final-review-2026-05-02-v2.md`

**Findings:**

- Critical: 0
- Important: 0
- Medium: 0
- Minor: 1 (pre-existing `oat-pjm-update-repo-reference` and `oat-project-spec` skill validation failures — unrelated and out of scope)

**Verdict:** **pass.** All 9 prior-final-review findings (I1-I6, M1-M2, m1) confirmed closed by their corresponding p05 fix commits (`98ee69c7..3bf611ad`).

**Action:** `final` review row marked `passed` against this v2 artifact (commit `5ef44230`).

### Review Received: final (code, re-review v3 — cycle-override applied inline)

**Date:** 2026-05-02
**Review artifact:** `reviews/archived/final-review-2026-05-02-v3.md`

**Findings:**

- Critical: 0
- Important: 1 — `I1` (v3): post-final-pass state artifacts stale (`.oat/state.md` shows `Current Task | p05-t01`; project `state.md` body still says "Phase 5 in progress")
- Medium: 2 — `M1` (v3): `## Implementation Complete` Phase 4 summary still claims "run all 10 dogfood scenarios end-to-end"; `M2` (v3): p05 review row reverted from `passed` back to `pending` somewhere between the v2 review and v3 (likely during a plan.md edit by a p05 task)
- Minor: 0

**Cycle-override decision:** This was the 4th `final` review cycle, exceeding the bounded-loop limit of 3. The v3 reviewer's own recommendation explicitly said: _"No implementation-code changes appear necessary; the remaining failures are project-state and documentation/bookkeeping drift."_ User chose to apply the three fixes inline as a single bookkeeping commit and skip another formal re-review cycle.

**Edits applied inline (no fix tasks created):**

- `I1` (v3): ran `oat state refresh`; updated project `state.md` body sections (Status / Current Phase / Artifacts / Progress / Next Milestone) to match the now-complete frontmatter.
- `M1` (v3): updated `## Implementation Complete` Phase 4 line from "run all 10 dogfood scenarios end-to-end" → "document walkthrough plans for all 10 dogfood scenarios (live-dogfood follow-up captured as backlog item `bl-7d5b`)".
- `M2` (v3): set `p05` Reviews-table row to `passed` against `reviews/archived/p05-code-review-2026-05-02.md`. Also reset `final` row from the v3-introduced `received` back to `passed` against the v2 artifact (the last formally-passing final review).

**No plan tasks created** (cycle-override; user-approved direct fixes).

**Next:** Run `oat-project-pr-final` to generate the PR description and open the PR. The user will manually do _some_ dogfooding via the vault-copied `dogfood-results.md` reference before merging.

## Final Summary (for PR/docs)

**What shipped:**

- New `oat-brainstorm` skill — always-on, user-invocable dispatcher for project-independent brainstorming conversations. Activates proactively on exploratory phrasing, runs a Superpowers-style design conversation without committing to an idea or project artifact, and ends in a pack-aware terminal-state picker.
- New `brainstorm` tool pack — single-skill pack, user-eligible, default user scope, default-on in `oat init` guided setup. Available across `oat tools install / update / remove / list / info` lifecycle.
- New generalized `PackMetadata` mechanism — `PACK_METADATA[name]?.defaultScope` driving both the interactive picker and non-interactive scope resolver. `brainstorm` is the first user-default-scope pack; the abstraction supports future opt-ins (and is shaped to consolidate `core`'s special-case in a follow-up).
- Visual companion bundle ported from `superpowers:brainstorming@5.0.7` (MIT). Five script files plus the reference guide. Four files byte-for-byte verbatim; `start-server.sh` patched only for OAT-managed persistence-path resolution (`.oat/brainstorm/<session-id>/` repo-scope, `~/.oat/brainstorm/<session-id>/` user-scope, `<project-dir>/.oat/brainstorm/<session-id>/` when `--project-dir` is passed).
- Per-destination playbook (`destinations.md`) — stanzas for all 9 terminal-state destination families (inline, doc-to-path, capture-as-idea, extend-idea, summarize-idea, backlog-item, project-promotion, active-project fold-back, active-project reference file). Each stanza specifies trigger phrases, required template fields, confirmation pattern, handoff target, and the keep-brainstorming rule.
- Doc-to-path output template (`brainstorm-doc.md`) — minimal-frontmatter markdown for off-repo destinations.
- Active-project fold-back commit safety contract — preflight `git status --porcelain` against the selected upstream artifact, scoped staging via `git add --` (never `-A`, never globs), three-option dirty-tree picker, conditional handoff prompt printed only after the scoped commit succeeds. Word-for-word aligned between design and SKILL.md.
- Documentation in `apps/oat-docs/docs/cli-utilities/tool-packs.md` (new "Brainstorm pack" section) and `apps/oat-docs/docs/workflows/skills/index.md` (entry under "Key Skills by Use Case" + Full Catalog).
- 10 dogfood scenario walkthroughs documented in `.agents/skills/oat-brainstorm/references/dogfood-results.md` covering all destination families.
- `NOTICES.md` extended with visual-companion attribution subsection (verbatim files vs patched).
- 5 lockstep public package version bumps to `0.0.59` (rebased over `f33c6597` which had already shipped `0.0.58`).
- `.oxfmtrc.jsonc` ignore patterns for bundled MIT-port scripts and bundled docs.

**Behavioral changes (user-facing):**

- Users get an always-on brainstorming entry point that fires on exploratory phrasing without requiring an existing idea or project record.
- `oat tools install brainstorm` (default-on in `oat init`) lands the skill at user scope by default — universal availability across directories.
- `oat tools list / update / remove` recognize the `brainstorm` pack alongside existing packs.
- Brainstorming conversations end in a pack-filtered terminal-state picker (only outcomes whose packs are installed surface).
- Active project routing offers a 3-way choice (related → fold-back, independent → other terminal states, supplementary → reference file).
- Doc-to-path destination supports in-repo and off-repo paths with explicit confirmation when writing outside the repo.

**Key files / modules:**

- `.agents/skills/oat-brainstorm/SKILL.md` — the dispatcher skill (always-on description, mode assertion, full process flow, all handoff branches).
- `.agents/skills/oat-brainstorm/scripts/{server.cjs, start-server.sh, stop-server.sh, frame-template.html, helper.js}` — visual-companion bundle.
- `.agents/skills/oat-brainstorm/references/{visual-companion.md, destinations.md, dogfood-results.md}` — per-destination playbook + visual-companion guide + dogfood scenarios.
- `.agents/skills/oat-brainstorm/templates/brainstorm-doc.md` — doc-to-path output template.
- `packages/cli/src/commands/init/tools/shared/skill-manifest.ts` — `BRAINSTORM_SKILLS`, `PACK_METADATA`, `resolvePackDefaultScope` helper.
- `packages/cli/src/commands/init/tools/brainstorm/{install-brainstorm.ts, install-brainstorm.test.ts, index.ts, index.test.ts}` — per-pack install helper.
- `packages/cli/src/commands/init/tools/index.ts` — runInitTools dispatcher wiring + picker description + default-on set.
- `packages/cli/src/commands/tools/{shared/types.ts, update/update-tools.ts, remove handlers}` — `PackName` union + update/remove handlers.
- `packages/cli/scripts/bundle-assets.sh` — SKILLS array entry.
- `apps/oat-docs/docs/cli-utilities/tool-packs.md`, `apps/oat-docs/docs/workflows/skills/index.md` — documentation.
- `NOTICES.md` — visual-companion attribution.
- `.oxfmtrc.jsonc` — ignore patterns for bundled MIT-port and bundled docs.
- `packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json` — lockstep version bumps to `0.0.59` (post-rebase over `f33c6597`).

**Verification performed:**

- Per-phase Tier 1 reviews (p01–p04): all passed.
- Final HiLL-checkpoint review (scope `final`): passed (0/0/0/3, 3 minor cosmetic suggestions, non-blocking).
- `pnpm release:validate`: pass on all 5 public packages at `0.0.59` (post-rebase).
- `pnpm format`: pass.
- `pnpm lint`: pass.
- `pnpm type-check`: pass.
- `pnpm build:docs`: pass.
- `pnpm --filter @open-agent-toolkit/cli test`: pass (1449 tests across 163 files, including the 5-case visual-companion smoke covering all three persistence-path branches).
- Bundle integrity: `bash packages/cli/scripts/bundle-assets.sh` regenerates assets including `oat-brainstorm/{SKILL.md, scripts/, references/, templates/}` at canonical paths.

**Design deltas (if any):**

- One additive task added during execution: `p04-t05` (`chore(p04-t05): exclude bundled MIT-port scripts and bundled docs from oxfmt`) to address the Phase 3 reviewer's flagged Medium prerequisite (pre-existing format failures on bundled MIT-port files). Captured in plan.md `## Implementation Complete` totals (Phase 4: 5 tasks, total: 24).
- Implementer scope-expansion in p02-t01: adding `'brainstorm'` to the `PackName` union forced cascading exhaustive-switch updates across `BUNDLED_PACK_MEMBERS`, `BUNDLED_PACK_ASSETS`, `install-sync-context`, `scan-tools`, `VALID_PACKS`, `PACK_DESCRIPTIONS`. The phase reviewer confirmed this as necessary type-completeness work, not scope drift. Documented under p02 Outstanding Items.
- No design changes during implementation — the design + 4-finding plan-review fix were sufficient.

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
