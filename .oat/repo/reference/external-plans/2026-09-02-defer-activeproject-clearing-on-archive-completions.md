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

# Defer activeProject clearing on shared archive completions

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
> scope and adds a narrowly scoped resume path (post-archive receipt
> validation only) without a second completion seal.

## Outcome

For every completion that will actually archive (`SHOULD_ARCHIVE` and
`IS_DURABLE_PROJECT`, that is shared and synced scopes), `oat-project-complete`
keeps the `activeProject` pointer until `oat project archive` returns a
validated receipt, then clears it in Step 12. Local projects never archive and
keep the immediate clear, as do non-archive completions. The resume promise
is deliberately narrow: when a shared archive has already succeeded and the
run was interrupted between the archive receipt and the Step 12 clear, the
next invocation discovers the created archive from the retained pointer,
validates it, and clears the pointer without running a second archive and
without appending a second completion seal. An interruption before archive
(after `complete-state`, or after the Step 7 PR artifact) resumes through the
normal completion entry, which must complete any missing Step 7 artifact
before archiving; it never jumps to Step 8. Post-archive interruptions whose
archive location cannot be discovered have a documented manual recovery path.
Contract tests execute the Step 6 guard across scopes, pin the ordering, and
exercise the three interruption points.

## Source and live evidence

- Source backlog item:
  [BL-260902-defer-activeproject-clearing — Defer activeProject clearing on shared and local archive completions (item title; the plan covers shared, the only non-synced durable scope)](../../pjm/backlog/items/BL-260902-defer-activeproject-clearing.md)
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
  - `SKILL.md:963-968` — the shared-scope archive receipt shape
    (`status: "ok"`, `mode: "apply"`, non-empty `archivePath`, plus
    `lifecycleCommit`, `completedRef`, `verifiedSourceSha`,
    `summaryExportFile`); `ARCHIVE_OUTPUT` is a shell variable of the running
    process, so it is not durable resume evidence.
  - `SKILL.md:718-776` — Step 7 generates the PR description before archive
    and is mandatory; a resume that routes straight to Step 8 skips it.
  - `packages/cli/src/commands/project/archive/archive-utils.ts:1880` — for
    non-synced archives the source project directory is removed after the
    move, so after a successful shared archive the retained pointer names a
    path that no longer exists; resume cannot read that directory's state.
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

| Type          | Dependency                                                                                                                                                     | Required state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Current state                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Satisfied     | [PR #254](https://github.com/voxmedia/open-agent-toolkit/pull/254) synced deferred clear and resume                                                            | Preserve the synced finalizer path and its five scripts byte-for-byte.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Merged at `49aeb5075`.                                                                                     |
| Soft ordering | Sibling plan [Make the autonomous recap capability-aware](./2026-09-02-make-autonomous-project-recap-capability-aware.md)                                      | Land first; it edits Step 3.6 of the same skill. Never in one parallel group with this plan.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Pending (W5 group 3).                                                                                      |
| Soft ordering | Sibling plan [Make consolidated-project retirement semantic](./2026-09-02-make-consolidated-project-retirement-semantic.md)                                    | Land this plan first; it owns the Step 6 → 8 → 12 spine.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Pending.                                                                                                   |
| Soft ordering | W5 group 1 plan [Route incomplete quick projects to quick-start from plan, progress, and next](./2026-09-02-route-incomplete-quick-projects-to-quick-start.md) | Runs before this plan; both edit `apps/oat-docs/docs/workflows/projects/picking-up-projects.md`, so never in one parallel group.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Pending.                                                                                                   |
| Soft ordering | W5 group 4 plan [Make terminal project status agree with completed revision plans](./2026-09-04-make-terminal-project-status-agree-with-revision-plans.md)     | Runs after this plan; both write `packages/cli/src/validation/skills.test.ts` version pins (this plan: `oat-project-complete` at `:4002`; that plan: `oat-project-next` at `:4003`) and both add cases to `review-skill-contracts.test.ts`, so never in one parallel group.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Pending.                                                                                                   |
| Soft ordering | Shared write: the skill version pins and contract cases in `packages/cli/src/validation/skills.test.ts` (2026-09-05 audit)                                     | Never in one parallel group with any other plan that writes this file; the program serializes them by group. The other writers are: W4 group 1 [Let one project disable configured lifecycle gates explicitly](./2026-08-30-disable-configured-gates-per-project.md); W4 group 2 [Emit the canonical dispatch stamp with resolver JSON](./2026-08-30-emit-dispatch-stamp-with-resolver-json.md); W2 group 1 [Repair four bundled-skill truthfulness contracts](./2026-08-30-repair-bundled-skill-contract-drift.md); W3 group 2 [Require executable backstops for standing contract claims](./2026-08-30-require-executable-backstops-for-contract-claims.md); W2 group 2 [Require lifecycle orchestrators to load every named execution skill](./2026-08-30-require-named-lifecycle-skills-to-be-loaded.md); W2 group 3 [Document patch-and-restore recovery for lost child handles with staged work](./2026-09-02-document-patch-and-restore-for-lost-child-handles.md); W5 group 3 [Make the autonomous project recap capability-aware and non-blocking](./2026-09-02-make-autonomous-project-recap-capability-aware.md); W5 group 5 [Make consolidated-project retirement checks semantic](./2026-09-02-make-consolidated-project-retirement-semantic.md); W5 group 1 [Route incomplete quick projects to quick-start from plan, progress, and next](./2026-09-02-route-incomplete-quick-projects-to-quick-start.md); W6 group 1 [Validate review-ledger paths and archive only terminal reviews before the final PR](./2026-09-03-validate-review-ledger-paths-before-final-pr.md); W6 group 2 [Honor metadata.version as the canonical skill version](./2026-09-04-honor-metadata-version-for-skills.md); W5 group 4 [Make terminal project status agree with completed revision plans](./2026-09-04-make-terminal-project-status-agree-with-revision-plans.md); W5 group 3 [Enforce plan-readiness versus execution-readiness in oat-repo-improve](./2026-09-02-enforce-external-plan-readiness-contract.md); W5 group 2 [Validate every shipped skill-to-script reference against its pack manifest](./2026-09-02-validate-skill-script-references-against-pack-manifests.md). | Pending; the execution program orders every group so at most one of these lanes writes the file at a time. |

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
- Shipped skills require the five-package lockstep bump, owned by the wave
  fan-in in lane mode (see Scope).

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
- `review-skill-contracts.test.ts` — six new cases (three guard/ordering
  cases plus three interruption cases).
- `packages/cli/src/validation/skills.test.ts:4002` — `oat-project-complete`
  version pin update.
- Docs: `lifecycle.md:333-335`, `picking-up-projects.md` (including the manual
  recovery paragraph).
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

Keep the synced finalizer; for shared require `status: "ok"`,
`mode: "apply"`, and non-empty `archivePath` re-validated from
`ARCHIVE_OUTPUT` by the new validator script before
`oat config set activeProject ""`.

**Verify:** `pnpm test:skills` → new `.mjs` validator test passes.

### 3. Add the narrow shared-scope resume branch

At `:88-140`, add a shared-scope branch with exactly one recognized
checkpoint: the pointer is retained, the pointed-to source directory no
longer exists (`archive-utils.ts:1880` removed it), and
`.oat/projects/archived/<PROJECT_NAME>/state.md` (the destination
`archive-utils.ts:413` computes) exists with `oat_lifecycle: complete` and
the `Lifecycle complete; archived locally` phase marker that
`complete-state --archived` writes (`state-utils.ts:126-127`). That state
means the archive succeeded and the run died before the Step 12 clear. The
branch validates the discovered archive with the new validator in a
directory mode (the same `oat_lifecycle`/marker checks Step 2 derives from
`ARCHIVE_OUTPUT`, re-derived from the archived `state.md`), then runs Step
12's clear. It never invokes
`oat project archive` again and never re-enters Steps 2–8 or the Step 3.7
seal append. If the source directory is missing and zero or more than one
archived candidate matches, the branch stops with a message pointing at the
manual recovery path below.

Every other interruption (after `complete-state`, after the Step 7 PR
artifact, before the archive receipt) is not a resume checkpoint: the pointer
still names an existing source directory, so the normal completion entry
runs, Step 3.7's status probe sees the existing seal and skips the append,
and Step 7 regenerates the PR artifact only if it is missing. Document in
`picking-up-projects.md` the manual recovery for a post-archive interruption
whose archive cannot be discovered: locate the archive directory, confirm
`oat_lifecycle: complete` in its `state.md`, then run
`oat config set activeProject ""` by hand.

**Verify:** same focused test run → green; the interruption cases in the test
plan pass.

### 4. Add the contract tests

Clone `executeFinalProjectPushGuard` into `executeActivePointerGuard(content,
scope, shouldArchive)` and add the six cases in the test plan. Revert step 1
to prove the guard cases red; move the resume branch's archive-validation
sentence after the clear to prove the ordering case red.

**Verify:** `pnpm exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts -t 'active pointer'` → pass.

### 5. Docs, bump, gates

Update the two docs pages; format.

**Verify (lane mode, the default under the execution program):** bump the
`oat-project-complete` `version:` field and its pin at
`packages/cli/src/validation/skills.test.ts:4002`; run the focused tests
above and `pnpm test:skills`, then `pnpm check`, `pnpm type-check`, and
`pnpm run check:skill-bumps` with captured exit codes, plus `pnpm lint`,
`pnpm format`, and `pnpm oat:validate-skills` because this plan changes
`.agents/skills`. Do not edit lockstep release files or run
`pnpm release:check-versions` / `pnpm release:validate`; the wave fan-in
owns the lockstep bump and the full definition-of-done sequence.
**Standalone mode only:** bump the five public packages above freshly
fetched `origin/main` and run the eight AGENTS.md gates in order.

## Test plan

- `retains the active pointer until archive validates for every archive-enabled scope`
  → retain for (synced,true) and (shared,true); clear for (local,true) because
  local is never durable, and for every (·,false).
- `clears the deferred pointer only after a validated archive receipt` →
  `archiveIndex < step12ClearIndex`.
- `resumes an interrupted archive completion without a second completion seal`
  → resume branch names shared scope only; `'No project-log append may follow the
seal'` still present.
- Interruption cases, each executed through the bash guard evaluator against
  a temp project fixture, not string-matched:
  - `interruption after complete-state re-enters normal completion and does not skip the PR artifact`
    → source directory present, pointer retained, no archive: the resume
    branch is not taken; Step 7 runs; exactly one seal entry in the log.
  - `interruption after the PR artifact archives once and clears`
    → Step 7 artifact present, no archive: normal path archives exactly once;
    `oat project archive` invocation count is 1; pointer cleared afterwards.
  - `interruption after archive but before clear validates the archive and never archives again`
    → source directory absent, archived `state.md` present: resume branch
    validates then clears; `oat project archive` invocation count is 0; no
    log append; one seal.
  - `resume stops when the archive cannot be discovered` → source absent, no
    archived candidate: exits non-zero with the manual-recovery message; the
    pointer is untouched.
- Existing `:1117`, `:1134`, `:1175`, `:1278`, `:1388`, `:1577` green.

## Done criteria

- [ ] Every archive-enabled scope retains the pointer until the receipt
      validates; non-archive completions clear immediately.
- [ ] The shared-scope resume covers exactly the post-archive checkpoint,
      never runs a second archive, never appends a second seal, and never
      skips the Step 7 artifact; pre-archive interruptions resume through the
      normal entry; the manual recovery path is documented.
- [ ] Synced behavior from PR #254 is unchanged.
- [ ] Six new contract tests fail on revert and pass on the change.
- [ ] Lane mode: focused tests, `pnpm check`, `pnpm type-check`, and
      `pnpm run check:skill-bumps` pass and no lockstep release file is
      edited. Standalone mode: one lockstep bump and all eight gates pass.

## STOP conditions

Stop and report instead of improvising when:

- shared archive receipts lack enough terminal evidence to validate
  (then a CLI receipt addition is needed and the estimate changes);
- widening the guard beyond `SHOULD_ARCHIVE && IS_DURABLE_PROJECT` would strand
  pointers for local projects, which never archive;
- the synced finalizer would need to accept non-synced input (use a separate
  validator instead);
- the resume design would require a second `oat project archive` invocation,
  a project-log append after the seal, or skipping the Step 7 artifact;
- discovering the created archive needs state that neither the retained
  pointer nor `.oat/projects/archived/<PROJECT_NAME>/state.md` carries (then
  the receipt-persistence fields named in Step 3 must be added to the
  archive CLI first, and the estimate changes); or
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
- The resume branch's checkpoint predicate is exactly one state (archive
  succeeded, clear did not); a text-presence test is not evidence of recovery,
  so the interruption cases execute the guard.
- No synced path regressed.
