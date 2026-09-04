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
ledger row is terminal and enumerates the exact files whose references it
rewrites, and a new guard immediately before `gh pr create` verifies every
non-empty Artifact cell in the ledger resolves on disk, stopping with a named
gate code otherwise. Contract tests pin both the narrowed archive rule and the
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

| Type             | Dependency                                                                                                                 | Required state                                                                                                   | Current state         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------- |
| Soft integration | W5 lanes that add cases to `skills.test.ts` and `review-skill-contracts.test.ts`                                           | Sequence after W5 so the version pins and new cases do not collide.                                              | Pending.              |
| Soft integration | [Require named lifecycle skills to be loaded](./2026-08-30-require-named-lifecycle-skills-to-be-loaded.md)                 | Its sweep covers pr-final; write any new skill pointer with a load-and-follow clause.                            | Pending (W2).         |
| Soft ordering    | W6 group 2 plan [Honor metadata.version as the canonical skill version](./2026-09-04-honor-metadata-version-for-skills.md) | Runs after this plan; both edit the version pins in `validation/skills.test.ts`, so never in one parallel group. | Pending (W6 group 2). |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                         | Affected | Files in common                                                                                                                                                                | Required update                                                   |
| --------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `review-plan-workflow` (draft PR #190) merges | Minor    | None written here: pr-final's `references/docs/autonomy-contract.md` is a symlink to `.agents/docs/autonomy-contract.md`, and the review-provide skills are read-only sources. | Rebase and re-run the inventory test; no copy and no plan change. |

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
- Shipped skill: five-package lockstep bump. Never edit
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
paths (`:369-380` and `:411-416`), add one new block both paths pass through:
for
every Artifact cell in `## Reviews` that is not `-`, require
`test -e "$PROJECT_PATH/$ARTIFACT"`; on a miss stop with a named gate code
and the offending row. Do not modify the Step 2 block.

**Verify:** `pnpm exec vitest run src/validation/skills.test.ts` → the three
Step 2 pins still pass.

### 2. Narrow Step 0.5

Archive only artifacts whose ledger row is `passed` or `fixes_completed`;
enumerate `plan.md`, `implementation.md`, and `state.md` as the files
whose references are rewritten; reword Success Criteria `:459` to match.

**Verify:** same command plus
`pnpm exec vitest run src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts`
→ the Step 3 hard-newline pin still passes.

### 3. Add the contract tests and bump

Cases in the test plan; bump `SKILL.md:3` and both pins in the same commit.

**Verify:** `pnpm exec vitest run src/validation/skills.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts`
→ pass; `pnpm run check:skill-bumps` → pass.

### 4. Validate, format, gate

**Verify:** `pnpm oat:validate-skills`, `pnpm format`,
`pnpm exec vitest run src/validation/autonomy-gate-inventory.test.ts`, then
the eight AGENTS.md gates in order.

## Test plan

- `skills.test.ts` (pattern `:4118`): `validates every Reviews ledger
artifact path before creating the final PR` — guard text present and
  positioned before both `gh pr create` paths (`:378` and `:415`).
- `review-skill-contracts.test.ts` (pattern: the indexOf ordering guard at
  `:1134`; the summary-handling case at `:1538` is unrelated): `archives only
terminal review artifacts during pr-final preflight` — exclusion clause and
  enumerated rewrite list present, and the guard precedes both `gh pr create`
  paths.
- Regression proved: a dangling ledger path cannot reach `gh pr create`; a
  late final review is never moved before it is consumed.

## Done criteria

- [ ] Guard present, positioned, and tested; Step 2 block byte-identical.
- [ ] Step 0.5 archives only terminal rows and names the rewrite list.
- [ ] Version pins and skill bump consistent; inventory mirror byte-equal.
- [ ] Lockstep bump, format, and all gates pass; clean tree.

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
- `oat-project-pr-progress` retains the same inversion; a follow-up item is
  filed rather than silently widened into this plan.
