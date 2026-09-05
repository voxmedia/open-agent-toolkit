---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/reviews/priority-alignment.md
  - .oat/repo/pjm/backlog/items/BL-260903-pr-final-archives-reviews.md
oat_external_plan_commit: dd41adb9bed53aa2389e911b601615fc2b26f0b7
oat_external_plan_date: '2026-09-03'
oat_execution_status: READY
oat_backlog_items:
  - BL-260903-pr-final-archives-reviews
oat_issue_url: null
created: '2026-09-03T22:30:00Z'
---

# Validate review-ledger paths and archive only terminal reviews before the final PR

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency. Draft PR #190
> touches the autonomy contract that this skill mirrors byte-for-byte; see
> the landing-event table. The same inversion exists in
> `oat-project-pr-progress`; it is named, not fixed, here.

## Outcome

`oat-project-pr-final` can no longer produce a `## Reviews` ledger row whose
artifact path does not resolve. Step 0.5 archives only review artifacts whose
ledger row is archive-eligible (processed: `passed` or `fixes_completed`),
selects each event by scope, type, and artifact filename when it moves the
file and rewrites references, and enumerates the exact files it rewrites.
Archive eligibility is a separate predicate from final-review approval: the
Step 2 gate still requires the latest `final`/`code` event to be `passed`,
so an archived `fixes_completed` artifact stays discoverable while autonomous
PR finalization still stops for re-review. A new guard immediately before
`gh pr create` parses every non-`-` Artifact cell, requires it to normalize
to a regular file inside the project directory, and stops with a named gate
code otherwise. Contract tests pin both the narrowed archive rule and the
guard's position; the pinned Step 2 block is untouched.

## Source and live evidence

- Source backlog item:
  [BL-260903-pr-final-archives-reviews — pr-final archives reviews before a late final review exists](../../pjm/backlog/items/BL-260903-pr-final-archives-reviews.md)
- Planned at: `origin/main` commit `dd41adb9bed53aa2389e911b601615fc2b26f0b7` on `2026-09-03`.
- Verified evidence:
  - `.agents/skills/oat-project-pr-final/SKILL.md:125` (Step 0.5, archive)
    precedes `:167` (Step 2, final review status); `:130` archives every
    `reviews/*.md` unconditionally.
  - `:172-179` — Step 2 reads the ledger textually and never resolves the
    Artifact cell; no path-resolution language exists in the file.
  - `oat-project-plan-writing/SKILL.md:537-540` — a move from `reviews/` to
    `reviews/archived/` keeps event identity only if the ledger row is
    rewritten; pr-final's `:136` "references touched during this preflight"
    does not guarantee that.
  - `oat-project-review-receive/SKILL.md:419,451,515-521` — `archived/` is
    the receive destination, written only after references are updated;
    `oat-project-review-provide/SKILL.md:912-913` forbids authoring there.
  - `oat-project-complete/SKILL.md:355` before `:650` — the correct order
    exists nearby; `oat-project-pr-progress/SKILL.md:108-122` shares the
    inversion but enumerates the rewrite list.
  - `.gitignore:85` ignores `.oat/**/reviews/archived/`, so a dangling
    ledger path is invisible in a PR diff.
  - Pins: `validation/skills.test.ts:4118-4131` (the Step 2 awk/grep block,
    verbatim), `:4047-4056` (append-ordered events), `:2776` and `:4000`
    (version `1.6.0`); `review-skill-contracts.test.ts:1134` (ordering guard)
    and `:1538` (adjacent, unrelated);
    `post-implement-sequence-contracts.test.ts:779-788` (a Step 3 string
    spanning a hard newline); `autonomy-gate-inventory.test.ts:360-368`
    (byte-equal autonomy-contract mirror).
- Constraining decisions:
  [DR-260729-dual-durable-review-provenance](../decisions/DR-260729-dual-durable-review-provenance.md)
  (artifact and ledger must agree),
  [DR-260706-review-artifacts-use-seconds](../decisions/DR-260706-review-artifacts-use-seconds.md)
  (timestamp suffix format).

## Dependencies

| Type             | Dependency                                                                                                                 | Required state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Current state                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Soft integration | W5 lanes that add cases to `skills.test.ts` and `review-skill-contracts.test.ts`                                           | Sequence after W5 so the version pins and new cases do not collide.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Pending.                                                                                                   |
| Soft integration | [Require named lifecycle skills to be loaded](./2026-08-30-require-named-lifecycle-skills-to-be-loaded.md)                 | Its sweep covers pr-final; write any new skill pointer with a load-and-follow clause.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Pending (W2).                                                                                              |
| Soft ordering    | W6 group 2 plan [Honor metadata.version as the canonical skill version](./2026-09-04-honor-metadata-version-for-skills.md) | Runs after this plan; both edit the version pins in `validation/skills.test.ts`, so never in one parallel group.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Pending (W6 group 2).                                                                                      |
| Soft ordering    | Shared write: the skill version pins and contract cases in `packages/cli/src/validation/skills.test.ts` (2026-09-05 audit) | Never in one parallel group with any other plan that writes this file; the program serializes them by group. The other writers are: W4 group 1 [Let one project disable configured lifecycle gates explicitly](./2026-08-30-disable-configured-gates-per-project.md); W4 group 2 [Emit the canonical dispatch stamp with resolver JSON](./2026-08-30-emit-dispatch-stamp-with-resolver-json.md); W2 group 1 [Repair four bundled-skill truthfulness contracts](./2026-08-30-repair-bundled-skill-contract-drift.md); W3 group 2 [Require executable backstops for standing contract claims](./2026-08-30-require-executable-backstops-for-contract-claims.md); W2 group 2 [Require lifecycle orchestrators to load every named execution skill](./2026-08-30-require-named-lifecycle-skills-to-be-loaded.md); W5 group 4 [Defer activeProject clearing on shared archive completions](./2026-09-02-defer-activeproject-clearing-on-archive-completions.md); W2 group 3 [Document patch-and-restore recovery for lost child handles with staged work](./2026-09-02-document-patch-and-restore-for-lost-child-handles.md); W5 group 3 [Make the autonomous project recap capability-aware and non-blocking](./2026-09-02-make-autonomous-project-recap-capability-aware.md); W5 group 5 [Make consolidated-project retirement checks semantic](./2026-09-02-make-consolidated-project-retirement-semantic.md); W5 group 1 [Route incomplete quick projects to quick-start from plan, progress, and next](./2026-09-02-route-incomplete-quick-projects-to-quick-start.md); W6 group 2 [Honor metadata.version as the canonical skill version](./2026-09-04-honor-metadata-version-for-skills.md); W5 group 4 [Make terminal project status agree with completed revision plans](./2026-09-04-make-terminal-project-status-agree-with-revision-plans.md); W5 group 3 [Enforce plan-readiness versus execution-readiness in oat-repo-improve](./2026-09-02-enforce-external-plan-readiness-contract.md); W5 group 2 [Validate every shipped skill-to-script reference against its pack manifest](./2026-09-02-validate-skill-script-references-against-pack-manifests.md). | Pending; the execution program orders every group so at most one of these lanes writes the file at a time. |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                         | Affected | Files in common                                                                                                                                                                                                                                                                                                                                    | Required update                                                                                                                                                              |
| --------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `review-plan-workflow` (draft PR #190) merges | Minor    | `packages/cli/src/validation/skills.test.ts`, which this plan writes for the pr-final version pin and one new case (PR #190 head `63161897dd40a66e1b29cf19e286665895c40dde` edits it). pr-final's `references/docs/autonomy-contract.md` is a symlink to `.agents/docs/autonomy-contract.md`, and the review-provide skills are read-only sources. | Rebase; re-anchor the `:2776`/`:4000` pins and the `:4118` block in the merged `skills.test.ts` before editing; re-run the inventory test; no copy and no other plan change. |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat dd41adb9bed53aa2389e911b601615fc2b26f0b7..origin/main -- .agents/skills/oat-project-pr-final .agents/skills/oat-project-pr-progress/SKILL.md .agents/skills/oat-project-complete/SKILL.md .agents/skills/oat-project-review-receive/SKILL.md .agents/skills/oat-project-plan-writing/SKILL.md .agents/docs/autonomy-contract.md packages/cli/src/validation/skills.test.ts packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts packages/cli/src/validation/autonomy-gate-inventory.test.ts packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
```

If Step 0.5, Step 2, or the version pins moved, re-anchor before editing.

## Repository conventions

- Skill validation and bumps: `pnpm oat:validate-skills`,
  `pnpm run check:skill-bumps`, `pnpm format`.
- Focused tests: from `packages/cli`,
  `pnpm exec vitest run src/validation/skills.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts src/validation/autonomy-gate-inventory.test.ts`.
- Implementation pattern: the enumerated rewrite list in
  `oat-project-pr-progress/SKILL.md:119-122`; new guard as a new block,
  never inside the pinned Step 2.
- Shipped skill: in lane mode the wave fan-in owns the lockstep bump; only
  a standalone execution bumps the five packages itself. Never edit
  `packages/cli/assets/skills/**` (generated).

## Scope

### In scope

- `oat-project-pr-final/SKILL.md` — Step 0.5 (`:125-143`) narrowed to
  terminal rows with an explicit rewrite list; a new ledger-path guard before
  `gh pr create` (`:378-415`); Success Criteria `:459` reworded;
  `version:` bump.
- `validation/skills.test.ts` — version pins at `:2776` and `:4000`; one
  new case.
- `review-skill-contracts.test.ts` — one new case.
- Lockstep release files (`packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`, `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`): never edited by this plan when it runs as a wave lane; the wave fan-in step makes exactly one lockstep bump for the integrated wave and regenerates the version asset through the build. Only a standalone execution bumps them itself, above fresh `origin/main`.

### Out of scope

- The Step 2 awk/grep block — pinned verbatim.
- `oat-project-pr-progress` — same class of bug, separate item; named in the
  plan's review focus.
- `oat-project-review-receive` and `-provide` — read-only contract sources.
- `packages/cli/assets/**` and the autonomy-contract mirror unless the root
  contract changes.

## Current state

Step 0.5 moves every active review file, including a late final gate artifact
Step 2 has not yet consumed, and the ledger row keeps pointing at the old path.
Because archived reviews are gitignored, nothing in CI can see the dangling
path; only a human reading the ledger catches it.

## Implementation steps

### 1. Add the ledger-path guard

Immediately before Step 5 splits into its synced and non-synced `gh pr create`
paths (`:369-380` and `:411-416`), add one new block both paths pass through.
For every row of `## Reviews`, parse the Artifact cell (not a textual grep of
the whole section); skip `-`; otherwise require that
`$PROJECT_PATH/$ARTIFACT` normalizes (no `..` escape, no symlink leaving the
project) to a path inside `$PROJECT_PATH` and is a regular file
(`test -f` on the normalized path, plus a containment check on the resolved
path). A directory, an escaping path, or a missing file stops with a named
gate code and the offending row (scope, type, artifact filename). Do not
modify the Step 2 block.

**Verify:** `pnpm exec vitest run src/validation/skills.test.ts` → the three
Step 2 pins still pass.

### 2. Narrow Step 0.5

Define archive eligibility as its own predicate: a row is archive-eligible
when its status is `passed` or `fixes_completed` (both are processed per
`oat-project-review-receive/SKILL.md:457-460`; `fixes_completed` still awaits
re-review). Archive only eligible rows. When moving a file, select the ledger
event by scope, type, and artifact filename (`oat-project-plan-writing/SKILL.md:535-540`)
so duplicate scope/type rows keep their identity, and rewrite that event's
Artifact cell to `reviews/archived/<filename>`; enumerate `plan.md`,
`implementation.md`, and `state.md` as the files whose references are
rewritten. Leave Step 2's approval rule untouched: the latest `final`/`code`
event must be `passed` (`oat-project-pr-final/SKILL.md:180-186`), and an
archived `fixes_completed` final row still stops autonomous finalization
with `PRFINAL-03`. Reword Success Criteria `:459` to match.

**Verify:** same command plus
`pnpm exec vitest run src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts`
→ the Step 3 hard-newline pin still passes.

### 3. Add the contract tests and bump

Cases in the test plan; bump `SKILL.md:3` and both pins in the same commit.

**Verify:** `pnpm exec vitest run src/validation/skills.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts`
→ pass; `pnpm run check:skill-bumps` → pass.

### 4. Validate, format, gate

**Verify (lane mode, the default under the execution program):** bump the
changed skill `version:` and update its pins in
`packages/cli/src/validation/skills.test.ts`; run the focused tests above and
`pnpm exec vitest run src/validation/autonomy-gate-inventory.test.ts`, then
`pnpm check`, `pnpm type-check`, and `pnpm run check:skill-bumps` with
captured exit codes, plus `pnpm lint`, `pnpm format`, and
`pnpm oat:validate-skills` because this plan changes `.agents/skills`. Do not
edit lockstep release files or run `pnpm release:check-versions` /
`pnpm release:validate`; the wave fan-in owns the lockstep bump and the full
definition-of-done sequence. **Standalone mode only:** bump the five public
packages above freshly fetched `origin/main` and run the eight AGENTS.md
gates in order.

## Test plan

- `skills.test.ts` (pattern `:4118`): `validates every Reviews ledger
artifact path before creating the final PR` — guard text present, parses
  cells rather than grepping the section, requires a project-contained
  regular file, and is positioned before both `gh pr create` paths (`:378`
  and `:415`).
- Guard behavior, executed against a fixture project directory with the
  guard block extracted and run under `bash`: duplicate scope/type events
  with distinct artifacts both validate; a directory at the artifact path
  fails; an escaping path (`../outside.md` or a symlink leaving the project)
  fails; a missing file fails; a valid `reviews/archived/<file>` passes.
  Each failing case names the offending row.
- `review-skill-contracts.test.ts` (pattern: the indexOf ordering guard at
  `:1134`; the summary-handling case at `:1538` is unrelated): `archives only
terminal review artifacts during pr-final preflight` — exclusion clause and
  enumerated rewrite list present, event selection by scope, type, and
  artifact filename present, and the guard precedes both `gh pr create`
  paths; `archive eligibility is distinct from final approval` — Step 2's
  `passed` gate is byte-identical and an archived `fixes_completed` final row
  still routes to `PRFINAL-03` under `OAT_AUTONOMOUS=1`.
- Regression proved: a dangling ledger path cannot reach `gh pr create`; a
  late final review is never moved before it is consumed.

## Done criteria

- [ ] Guard present, positioned, and tested; Step 2 block byte-identical.
- [ ] Step 0.5 archives only archive-eligible rows, selects events by
      scope/type/artifact filename, and names the rewrite list; archive
      eligibility never grants final approval.
- [ ] Version pins and skill bump consistent; inventory mirror byte-equal.
- [ ] Lane mode: focused tests, `pnpm check`, `pnpm type-check`, and
      `pnpm run check:skill-bumps` pass and no lockstep release file is
      edited. Standalone mode: one lockstep bump and all eight gates pass.

## STOP conditions

Stop and report instead of improvising when:

- the fix would edit the pinned Step 2 block or reflow Step 3;
- the guard would need CI-side verification (archived reviews are ignored;
  it is a runtime skill guard);
- the autonomy-contract symlink is broken or replaced by a copy; or
- a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Revalidate against current `origin/main`, the backlog item, the two decision
records, and the four pinned tests when substantial time passes, main
advances materially from `dd41adb9bed53aa2389e911b601615fc2b26f0b7`, PR #190 lands, W5 lanes
change the contract-test files, or a load-bearing claim cannot be reproduced.

## Review focus

- The guard is a new block; the Step 2 pins are untouched.
- Archive eligibility (`passed` or `fixes_completed`) versus final approval
  (latest `final`/`code` event `passed`) are two predicates and stay so.
- `oat-project-pr-progress` retains the same inversion; a follow-up item is
  filed rather than silently widened into this plan.
