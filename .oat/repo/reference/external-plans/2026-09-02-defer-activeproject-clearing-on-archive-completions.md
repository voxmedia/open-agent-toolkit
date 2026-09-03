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

For every archive-enabled completion scope, `oat-project-complete` keeps the
`activeProject` pointer until `oat project archive` returns a validated
receipt, then clears it in Step 12. Non-archive completions keep the
immediate clear. An interruption after `complete-state` but before archive
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
  - `SKILL.md:110-113`, `:930-932` — `IS_DURABLE_PROJECT` is true for shared
    and synced, and Step 8 archives whenever archive is enabled and the
    project is durable, so shared archive completions run with a cleared
    pointer.
  - `SKILL.md:1471-1486` — Step 12's deferred clear is synced-only and
    validates the terminal receipt through `finalize-synced-archive.mjs`.
  - `SKILL.md:88-122` — the resume entry (`execute-synced-archive-entry.mjs`,
    routes `continue-active | archive-resumed`) is synced-only.
  - `SKILL.md:634-648` — the seal contract: "No project-log append may follow
    the seal"; a resume that replays Step 3.7 risks a second seal.
  - `SKILL.md:963-968` — the shared/local archive receipt shape
    (`status: "ok"`, `mode: "apply"`, non-empty `archivePath`).
  - `review-skill-contracts.test.ts:1134` (ordering guard, contains
    `'No project-log append may follow the seal'` at `:1170`), `:1560`
    (asserts the synced-scoped sentence `'before Step 12, retain the active
pointer, and let the next invocation resume'` at `:1620-1623`), and the
    bash-guard evaluator `executeFinalProjectPushGuard` at `:34-68`.
- Constraining decisions:
  [DR-260831-durability-before-retirement](../decisions/DR-260831-durability-before-retirement.md)
  (authorizes deferring retirement until durability succeeds),
  [DR-260831-transactional-active-records](../decisions/DR-260831-transactional-active-records.md).

## Dependencies

| Type          | Dependency                                                                                                                  | Required state                                                         | Current state          |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------- |
| Satisfied     | [PR #254](https://github.com/voxmedia/open-agent-toolkit/pull/254) synced deferred clear and resume                         | Preserve the synced finalizer path and its five scripts byte-for-byte. | Merged at `49aeb5075`. |
| Soft ordering | Sibling plan [Make consolidated-project retirement semantic](./2026-09-02-make-consolidated-project-retirement-semantic.md) | Land this plan first; it owns the Step 6 → 8 → 12 spine.               | Pending.               |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                          | Affected | Files in common                         | Required update                                             |
| ---------------------------------------------- | -------- | --------------------------------------- | ----------------------------------------------------------- |
| `tool-pack-scope-provider-truthfulness` merges | Minor    | `review-skill-contracts.test.ts` (+17). | Rebase and re-anchor the `:1134`, `:1152`, `:1560` anchors. |
| `review-plan-workflow` (draft PR #190) merges  | Minor    | `review-skill-contracts.test.ts`.       | Same re-anchor; the completion skill is not in either diff. |

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
  `:1002`; `version:` bump.
- `oat-project-complete/scripts/` — a non-synced receipt validator (new
  script) with a test under `tests/` following
  `resolve-synced-archive-entry.test.mjs`.
- `review-skill-contracts.test.ts` — three new cases.
- Docs: `lifecycle.md:333-335`, `picking-up-projects.md`.
- Five public package manifests.

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

Change the guard at `:709` to retain the pointer whenever
`SHOULD_ARCHIVE == "true"` and the scope will archive (shared, synced, and
local-with-archive), keeping the `else` immediate clear for non-archive
completions.

**Verify:** `pnpm exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts`
→ green, including `:1560` after its sentence is deliberately widened in the
same commit.

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
  → retain for (synced,true), (shared,true), (local,true); clear for all
  (·,false).
- `clears the deferred pointer only after a validated archive receipt` →
  `archiveIndex < step12ClearIndex`.
- `resumes an interrupted archive completion without a second completion seal`
  → resume branch names shared/local; `'No project-log append may follow the
seal'` still present.
- Existing `:1117`, `:1134`, `:1175`, `:1278`, `:1388`, `:1560` green.

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
- widening the guard would strand pointers for projects that never archive;
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
