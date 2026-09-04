---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/triage/2026-09-02-program-intake-triage.md
  - .oat/repo/pjm/backlog/items/BL-260902-defer-activeproject-clearing.md
oat_external_plan_commit: 49aeb5075971180b48c131bbd2b21b82d455bfc9
oat_external_plan_date: '2026-09-02'
oat_execution_status: READY
oat_backlog_items:
  - BL-260902-defer-activeproject-clearing
oat_issue_url: https://github.com/voxmedia/open-agent-toolkit/issues/252
created: '2026-09-02T23:59:00Z'
---

# Defer activeProject clearing on shared and local archive completions

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** PR #254 delivered the deferred-clear pattern
> for synced projects only. This plan generalizes it to every archive-enabled
> scope and adds the matching resume path without a second completion seal.

## Outcome

For every completion that will actually archive (`SHOULD_ARCHIVE` and
`IS_DURABLE_PROJECT`, that is shared and synced scopes), `oat-project-complete`
keeps the `activeProject` pointer until `oat project archive` returns a
validated receipt, then clears it in Step 12. Local projects never archive and
keep the immediate clear, as do non-archive completions. An interruption after `complete-state` but before archive
resumes directly at the archive step from the retained pointer, without
replaying Steps 2–8 and without appending a second completion seal. Contract
tests execute the Step 6 guard across scopes and pin the ordering.

## Source and live evidence

- Source backlog item:
  [BL-260902-defer-activeproject-clearing — Defer activeProject clearing on shared and local archive completions](../../pjm/backlog/items/BL-260902-defer-activeproject-clearing.md)
- Source issue: [#252](https://github.com/voxmedia/open-agent-toolkit/issues/252)
- Planned at: `origin/main` commit
  `49aeb5075971180b48c131bbd2b21b82d455bfc9` on `2026-09-02`.
- Verified evidence:
  - `.agents/skills/oat-project-complete/SKILL.md:702-716` — Step 6 retains
    the pointer only for `PROJECT_SCOPE == "synced" && SHOULD_ARCHIVE ==
"true"`; every other scope clears immediately.
  - `SKILL.md:127-129`, `:678`, `:932` — `IS_DURABLE_PROJECT` is true only for
    shared and synced; `complete-state` and Step 8 both gate on
    `SHOULD_ARCHIVE && IS_DURABLE_PROJECT`, so local projects never archive and
    shared archive completions run with a cleared pointer.
  - `SKILL.md:1471-1486` — Step 12's deferred clear is synced-only and
    validates the terminal receipt through `finalize-synced-archive.mjs`.
  - `SKILL.md:88-122` — the resume entry (`execute-synced-archive-entry.mjs`,
    routes `continue-active | archive-resumed`) is synced-only.
  - `SKILL.md:634-648` — the seal contract: "No project-log append may follow
    the seal"; a resume that replays Step 3.7 risks a second seal.
  - `SKILL.md:963-968` — the shared/local archive receipt shape
    (`status: "ok"`, `mode: "apply"`, non-empty `archivePath`).
  - `review-skill-contracts.test.ts:1134` (ordering guard, contains
    `'No project-log append may follow the seal'` at `:1189`), `:1577`
    (`syncs the open PR description after archive so blob links keep
resolving`, asserting the synced-scoped sentence `'before Step 12, retain
the active pointer, and let the next invocation resume'` at `:1638`; the
    sentence lives at `SKILL.md:1465`), and the bash-guard evaluator
    `executeFinalProjectPushGuard` at `:35-68`.
- Constraining decisions:
  [DR-260831-durability-before-retirement](../decisions/DR-260831-durability-before-retirement.md)
  (authorizes deferring retirement until durability succeeds),
  [DR-260831-transactional-active-records](../decisions/DR-260831-transactional-active-records.md).

## Dependencies

| Type          | Dependency                                                                                                                                                     | Required state                                                                                                                   | Current state          |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Satisfied     | [PR #254](https://github.com/voxmedia/open-agent-toolkit/pull/254) synced deferred clear and resume                                                            | Preserve the synced finalizer path and its five scripts byte-for-byte.                                                           | Merged at `49aeb5075`. |
| Soft ordering | Sibling plan [Make the autonomous recap capability-aware](./2026-09-02-make-autonomous-project-recap-capability-aware.md)                                      | Land first; it edits Step 3.6 of the same skill. Never in one parallel group with this plan.                                     | Pending (W5 group 3).  |
| Soft ordering | Sibling plan [Make consolidated-project retirement semantic](./2026-09-02-make-consolidated-project-retirement-semantic.md)                                    | Land this plan first; it owns the Step 6 → 8 → 12 spine.                                                                         | Pending.               |
| Soft ordering | W5 group 1 plan [Route incomplete quick projects to quick-start from plan, progress, and next](./2026-09-02-route-incomplete-quick-projects-to-quick-start.md) | Runs before this plan; both edit `apps/oat-docs/docs/workflows/projects/picking-up-projects.md`, so never in one parallel group. | Pending.               |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                                                                | Affected | Files in common                                                                                                                        | Required update                                                                                                           |
| ------------------------------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `tool-pack-scope-provider-truthfulness` **landed** (PR #255 `a06e9713a`, 2026-09-03) | Minor    | `review-skill-contracts.test.ts` (+17).                                                                                                | Anchors re-applied 2026-09-04: `:1134`, `:1189`, `:1577`, `:1638`.                                                        |
| `review-plan-workflow` (draft PR #190) merges                                        | Yes      | `review-skill-contracts.test.ts`, `apps/oat-docs/docs/workflows/projects/lifecycle.md`, `picking-up-projects.md` (both in scope here). | Re-anchor the test cases and re-read both docs pages before editing; the completion skill itself is not in the #190 diff. |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat 49aeb5075971180b48c131bbd2b21b82d455bfc9..origin/main -- .agents/skills/oat-project-complete packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts packages/cli/src/commands/project/archive/archive-utils.ts apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/workflows/projects/picking-up-projects.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
```

If Step 6, Step 12, or the resume entry changed, re-anchor before editing.

## Repository conventions

- Skill validation and bumps: `pnpm oat:validate-skills`,
  `pnpm run check:skill-bumps`, `pnpm format`.
- Focused tests: from `packages/cli`,
  `pnpm exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts`;
  `pnpm test:skills` for `.mjs` tests under `.agents/skills/*/tests/`.
- Implementation pattern: the synced deferred-clear and finalizer from PR
  #254; a separate validator for non-synced receipts rather than flags on the
  synced one.
- Shipped skills require the five-package lockstep bump.

## Scope

### In scope

- `oat-project-complete/SKILL.md` — Step 6 guard (`:709-716`), Step 12 clear
  (`:1476-1486`), the resume entry (`:88-140`), and the retention sentence at
  `:1005-1006`; `version:` bump.
- `oat-project-complete/scripts/` — a new `validate-durable-archive-receipt.mjs`
  for shared-scope archive receipts, with a test under `tests/` following
  `resolve-synced-archive-entry.test.mjs`. Do not reuse or rename the existing
  `validate-nonarchive-lifecycle-receipt.mjs` (`SKILL.md:51,68,1181`), which
  validates non-archive synced lifecycle commits, a different concept with a
  similar name.
- `review-skill-contracts.test.ts` — three new cases.
- Docs: `lifecycle.md:333-335`, `picking-up-projects.md`.
- Lockstep release files (`packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`, `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`): never edited by this plan when it runs as a wave lane; the wave fan-in step makes exactly one lockstep bump for the integrated wave and regenerates the version asset through the build. Only a standalone execution bumps them itself, above fresh `origin/main`.

### Out of scope

- `packages/cli/src/commands/project/archive/**` — the CLI already returns
  the receipt; the gap is skill-side ordering.
- `refs/oat/completed/**` machinery — synced-only, settled by #254.
- `oat-project-pr-final` — inlined by Step 7, unchanged.

## Current state

Step 6 clears the pointer unless the project is synced with archive enabled.
Step 8 archives shared and synced projects; Step 12 clears the retained
pointer for synced only after the finalizer validates the terminal report.
The resume entry routes synced projects around Steps 2–8. Shared archive
completions therefore run archive with the pointer already gone, and an
interruption after `complete-state` leaves no resumable state.

## Implementation steps

### 1. Generalize the Step 6 guard

Change the guard at `:709` to `SHOULD_ARCHIVE == "true" && IS_DURABLE_PROJECT
== "true"`, mirroring the `complete-state` gate at `:678`, so shared joins
synced in retaining the pointer. Local scope is never durable and keeps the
`else` immediate clear, as do non-archive completions; a guard keyed on
`SHOULD_ARCHIVE` alone would strand local pointers.

**Verify:** `pnpm exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts`
→ green, including `:1577` after the sentence at `SKILL.md:1465` is
deliberately widened in the same commit.

### 2. Generalize the Step 12 clear

Keep the synced finalizer; for shared/local require `status: "ok"`,
`mode: "apply"`, and non-empty `archivePath` re-validated from
`ARCHIVE_OUTPUT` by the new validator script before
`oat config set activeProject ""`.

**Verify:** `pnpm test:skills` → new `.mjs` validator test passes.

### 3. Add the shared/local resume branch

At `:88-140`: a retained pointer plus `oat_lifecycle: complete`, archive
enabled, and no `archivePath` routes directly to Step 8 without replaying
Steps 2–8 and without re-entering the Step 3.7 seal append.

**Verify:** same focused test run → green.

### 4. Add the contract tests

Clone `executeFinalProjectPushGuard` into `executeActivePointerGuard(content,
scope, shouldArchive)` and add the three cases in the test plan. Revert step
1 to prove red.

**Verify:** `pnpm exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts -t 'active pointer'` → pass.

### 5. Docs, bump, gates

Update the two docs pages; bump the skill and the five packages; format.

**Verify:** `pnpm run check:skill-bumps`, `pnpm oat:validate-skills`,
`pnpm format`, then the eight AGENTS.md gates in order.

## Test plan

- `retains the active pointer until archive validates for every archive-enabled scope`
  → retain for (synced,true) and (shared,true); clear for (local,true) because
  local is never durable, and for every (·,false).
- `clears the deferred pointer only after a validated archive receipt` →
  `archiveIndex < step12ClearIndex`.
- `resumes an interrupted archive completion without a second completion seal`
  → resume branch names shared/local; `'No project-log append may follow the
seal'` still present.
- Existing `:1117`, `:1134`, `:1175`, `:1278`, `:1388`, `:1577` green.

## Done criteria

- [ ] Every archive-enabled scope retains the pointer until the receipt
      validates; non-archive completions clear immediately.
- [ ] The interrupted-archive resume works for shared/local and never appends
      a second seal.
- [ ] Synced behavior from PR #254 is unchanged.
- [ ] Three new contract tests fail on revert and pass on the change.
- [ ] Skill bump, lockstep bump, format, and all gates pass; clean tree.

## STOP conditions

Stop and report instead of improvising when:

- shared or local archive receipts lack enough terminal evidence to validate
  (then a CLI receipt addition is needed and the estimate changes);
- widening the guard beyond `SHOULD_ARCHIVE && IS_DURABLE_PROJECT` would strand
  pointers for local projects, which never archive;
- the synced finalizer would need to accept non-synced input (use a separate
  validator instead); or
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Revalidate against current `origin/main`, the backlog item, issue #252, PR
#254's delivered scripts, and the completion contract tests when substantial
time passes, main advances materially from
`49aeb5075971180b48c131bbd2b21b82d455bfc9`, a named landing event lands,
cited contracts change, or a load-bearing claim cannot be reproduced. Apply
the landing-event table above.

## Review focus

- The Step 6 guard is executed under bash in tests, not string-matched.
- Seal idempotency across resume is explicit and pinned.
- No synced path regressed.
