---
oat_generated: true
oat_generated_at: 2026-07-30T16:12:39Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/review-plan-workflow
---

# Artifact Review: plan

**Reviewed:** 2026-07-30T16:12:39Z
**Scope:** `plan.md` against `spec.md` and `design.md` (spec-driven mode)
**Files reviewed:** 3
**Commits:** n/a (artifact review)

## Summary

The plan is structurally sound and unusually rigorous: 74 monotonic task IDs
across 7 phases with zero duplicates, complete bidirectional
requirement-to-task traceability across all 16 requirements, correct
create-before-modify sequencing for all 270 declared file entries, and
verification commands that all resolve to real package scripts and real CLI
subcommands. Two gaps would surface during execution rather than at planning
time: no phase declares the phase-wide verification command that the
phase-implementer contract expects to read from the plan, and no task ever adds
the `## Review Accounting` block to the reviewer's artifact template that
Phase 4's strict parser requires. Two smaller design details are unmapped or
non-conformant, and one formatting artifact obscures a precedence contract.

Findings: 0 critical, 2 important, 2 medium, 1 minor

## Findings

### Critical

None.

### Important

- **No phase declares a phase-wide verification command** (`plan.md:72`, `387`,
  `1072`, `1204`, `1414`, `1577`, `1835`)
  - Issue: All seven phase preambles contain only a `**Milestone:**` line. The
    phase-implementer contract at
    `.agents/agents/oat-phase-implementer.md:93-94` requires the implementer to
    "Extract all phase tasks, dependency order, file boundaries, verification
    commands, commit messages, and phase-wide verification before editing," and
    `.agents/agents/oat-phase-implementer.md:151` requires it to "run phase-wide
    verification." The root workflow then verifies that phase verification
    passed
    (`.agents/skills/oat-project-implement/references/phase-execution.md:94`).
    The plan supplies nothing to extract. `design.md` did declare a
    `**Verification:**` line for each of its seven implementation phases
    (`design.md:2170`, `2190`, `2207`, `2225`, `2242`, `2259`, `2275`); the
    decomposition dropped them. Compounding this, the repository
    Definition-of-Done gate set (`pnpm check`, `pnpm type-check`, `pnpm test`,
    `pnpm build`) appears in only two of 74 tasks — `p06-t06` and `p07-t05`.
    Tasks in Phases 1 through 5 (61 tasks) run only file-scoped
    `vitest run <specific files>`, so a type error or a regression in a test
    file that no task names would stay hidden until task 68 of 74. That risk is
    concrete here because Phases 2, 4, and 5 modify `config/oat-config.ts`,
    `config/resolve.ts`, `commands/gate/index.ts`,
    `commands/review/index.ts`, and `review-remote/reviewer-dispatch.ts`, all of
    which have existing test suites outside the named files.
  - Fix: Add a `**Verification:**` line to each phase preamble, carrying the
    design's per-phase intent plus a repository gate subset. For Phases 1
    through 5, `pnpm --filter @open-agent-toolkit/cli exec vitest run src/review`
    plus `pnpm type-check` is a proportionate floor; Phases 6 and 7 already
    declare the full gate set inside `p06-t06` and `p07-t05`.
  - Requirement: NFR5

- **Reviewer artifact template never gains the `## Review Accounting` block its
  parser requires** (`plan.md:1210`, `1078`)
  - Issue: `p04-t01` builds `extractReviewAccounting` and
    `parseStrictReviewAccountingJson` against `accounting-grammar/v1`, which
    per `design.md:586-595` requires "exactly one exact `## Review Accounting`
    line outside other fences" immediately followed by a ```json fence. The
canonical reviewer template in `.agents/agents/oat-reviewer.md`contains no
such section today (verified absent).`p03-t01`is the only task that
modifies the reviewer contract before its version bump, and its RED and
GREEN steps enumerate the intake sequence, mandatory FR5-FR7 fields, the
no-replacement rule, typed terminal output, and the removal of unconditional
source reads — but never the artifact accounting block. Searching the plan
for "Review Accounting", "accounting-grammar", or "artifact template" finds
only the`p04-t01`parser task. The result is a producer/consumer asymmetry
on a P0 requirement: in enforce mode the artifact sink would emit artifacts
the new parser rejects, so every enforced artifact review would terminate as`review_complete_accounting_invalid`. That failure is translated correctly by
`p05-t05`, which means it fails loudly rather than silently, but no enforced
artifact review would ever reach a `complete`terminal. It would first
surface at the`p06-t06`dogfood row that requires a "Published local review
artifact from a`complete` terminal."
  - Fix: Extend `p03-t01` to add the `## Review Accounting` heading and its
    fenced `ReviewAccountingV1` block to the reviewer's artifact template, and
    assert in that task's RED step that the emitted template satisfies
    `accounting-grammar/v1` while preserving the existing gate parsing contract
    (the `Findings:` count line and the four severity subsections). A
    round-trip assertion between the `p03-t01` template and the `p04-t01`
    parser would pin the producer and consumer together.
  - Requirement: FR9

### Medium

- **`legacy-unvalidated` output marking is unmapped to any task**
  (`design.md:130`, `670`, `1857`)
  - Issue: The design requires legacy-mode output to be marked
    `legacy-unvalidated` in three separate places — the data flow
    (`design.md:130`), the Capability Preflight responsibilities
    (`design.md:670`), and the Error Handling categories (`design.md:1857`).
    The plan's legacy coverage stops at state suppression: `p05-t02` asserts
    "legacy creates no state" and `p05-t03` asserts "legacy uses the current
    path without validation state". The token `legacy-unvalidated` appears
    nowhere in `plan.md`, and no task explicitly defers it or places it out of
    scope. Without the marker, a legacy-mode review is indistinguishable from a
    validated one in local diagnostics, which is the observability the design
    asked for.
  - Fix: Add the marking to `p05-t02`'s RED and GREEN steps alongside the
    existing legacy assertions, or record an explicit deferral if the marker is
    judged unnecessary for Stage A.
  - Requirement: NFR3

- **Reviews table records an invalid `Invocation` value** (`plan.md:2041`)
  - Issue: The `plan` artifact row carries `Invocation: auto-artifact-review`.
    The review-provide contract at
    `.agents/skills/oat-project-review-provide/SKILL.md:1044-1046` specifies
    that `Invocation` holds the artifact's `oat_review_invocation` — `manual`,
    `auto`, or `gate` — for code reviews and `-` for non-code reviews. This is
    an artifact review, so the cell should be `-`. The value
    `auto-artifact-review` appears nowhere else in the repository, and
    `isReviewInvocationKind` at `packages/cli/src/review-remote/narrowing.ts:110`
    accepts only the three canonical values. Current runtime impact is nil,
    because narrowing provenance matches only `Type=code` rows and an
    unrecognized value fails open to full scope rather than erroring. The
    exposure is forward-looking: a stricter ledger validator, which this very
    project is in the business of adding, would reject the row.
  - Fix: Set the cell to `-`. If the intent was to record that the plan review
    came from the planning skill's automatic artifact-review loop, note that in
    prose rather than in a contract-typed column.

### Minor

- **Blockquote artifact obscures the config precedence chain**
  (`plan.md:1431-1434`)
  - Issue: `p05-t01`'s RED step reads "Unset resolves to `legacy`; local >
    shared > user" and then, after a blank line, `> default; invalid values
fail; explicit enforce persists; existing config is not rewritten.` The
    intended text is the precedence chain `local > shared > user > default`, but
    a line wrap placed `>` at the start of the continuation line, so Markdown
    renders the remainder as a blockquote and the first sentence terminates at
    "user". These are the only unintended `^> ` lines in the file; the pair at
    `plan.md:21-22` is the deliberate plan directive. Because `.oat/projects/**`
    is outside the markdownlint scope (`package.json` restricts it to
    `apps/oat-docs/docs`), nothing will flag this automatically.
  - Suggestion: Rewrite as a single line using non-breaking phrasing, for
    example "resolution order is local, then shared, then user, then default",
    which avoids the leading-`>` wrap hazard entirely.

## Spec/Design Alignment

**Evidence sources used:** `spec.md`, `design.md`, `plan.md` (spec-driven mode);
`.agents/agents/oat-reviewer.md`, `.agents/agents/oat-phase-implementer.md`,
`.agents/skills/oat-project-implement/references/phase-execution.md`,
`.agents/skills/oat-project-review-provide/SKILL.md`, `.oat/sync/manifest.json`,
and root/package `package.json` scripts for contract verification.

### Requirements Coverage

All 16 requirements carry non-empty Planned Tasks in the `spec.md` Requirement
Index, every referenced task ID resolves to a real plan task, and all 74 plan
tasks are claimed by at least one requirement. Traceability is complete in both
directions.

| Requirement | Status  | Notes                                                                              |
| ----------- | ------- | ---------------------------------------------------------------------------------- |
| FR1         | mapped  | 23 tasks; ordered intake pinned by `p03-t01` contract and `p03-t03` integration    |
| FR2         | mapped  | 10 tasks; `p02-t02` through `p02-t06` cover metadata, denial precheck, and capping |
| FR3         | mapped  | 17 tasks; exact-set accounting in `p02-t22`, output projection in `p04-t02`        |
| FR4         | mapped  | 13 tasks; selective evidence and Tier 3 replacement in `p03-t04`                   |
| FR5         | mapped  | 5 tasks; structural delegation gates in `p03-t02`                                  |
| FR6         | mapped  | 12 tasks; dossier contracts in `p03-t02`, no-replacement pinned in `p03-t03`       |
| FR7         | mapped  | 11 tasks; claim-addressable verification in `p04-t02`                              |
| FR8         | mapped  | 14 tasks; P1 budget allocation in `p02-t15`/`p02-t16`, 120s floor in `p05-t02`     |
| FR9         | partial | Parser exists (`p04-t01`); artifact-template emission unmapped — see Important I2  |
| FR10        | mapped  | 6 tasks; prior-evidence sanitization in `p02-t13`                                  |
| FR11        | mapped  | 8 tasks; compact inline fast path fixtures in `p03-t05`                            |
| NFR1        | mapped  | 16 tasks; severity semantics preserved, reviewer authority unchanged               |
| NFR2        | mapped  | 19 tasks; provider sync in `p06-t04` covers all 32 generated reviewer views        |
| NFR3        | partial | Broadly covered; `legacy-unvalidated` marker unmapped — see Medium M1              |
| NFR4        | mapped  | 13 tasks; `p01-t02` records the baseline, `p03-t05` proves the reduction           |
| NFR5        | partial | Release integrity covered; phase-level verification absent — see Important I1      |

### Extra Work (not in requirements)

None. Every task maps to at least one requirement, and no task introduces scope
beyond the spec.

### Plan-Specific Checklist

| Check                          | Result | Evidence                                                                                                            |
| ------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------- |
| Canonical-format conformance   | pass   | Required frontmatter keys present; `## Reviews`, `## Implementation Complete`, `## References` all present          |
| Stable task IDs                | pass   | 74 IDs, monotonic 1..N within every phase, zero duplicates                                                          |
| Phase counts match summary     | pass   | 13/29/5/8/6/7/6 on disk equals the `## Implementation Complete` table and its stated total of 74                    |
| Review-table preservation      | pass   | All 11 rows retained in the widened 8-column shape; one non-conformant cell noted as Medium M2                      |
| Task atomicity                 | pass   | Bounded `Files` lists; release tasks correctly confine edits to bookkeeping files and use a throwaway worktree      |
| Verification actually runnable | pass   | Every referenced script and CLI subcommand verified to exist, including `backlog archive --summary`, `sync --scope` |
| Create-before-modify ordering  | pass   | All 270 file entries checked; every Modify/Delete target exists on disk or is created by an earlier task            |
| File-list accuracy             | pass   | `p06-t04` correctly lists the 32 generated views and correctly omits the two symlinked base views                   |
| Version-bump discipline        | pass   | `p06-t03` bumps exactly the 4 owning canonical assets once each; earlier tasks explicitly defer to it               |
| Design component coverage      | pass   | Every design component, data model, and CLI command mapped, with the two gaps recorded as I2 and M1                 |
| Parallelism-claim sanity       | pass   | `oat_plan_parallel_groups: []` matches the `## Parallelism` rationale that adjacent phases share files              |

### Notes on Items Deliberately Not Flagged

- The absent `## Dispatch Profile` section is normal and is not a finding.
- `pnpm --filter @open-agent-toolkit/cli format:fix` (`oxfmt .`) and
  `pnpm format:fix` both format broader trees than any single task declares,
  which could trip the plan's own Task Execution Boundaries rule. Both were
  verified clean right now (594 files in `packages/cli`, 387 at root), so the
  hazard is latent rather than active and the M1 formatter substitution is safe
  in practice.
- `packages/cli/assets/**` is gitignored except `public-package-versions.json`,
  so `bundle-assets.sh` in `p06-t05` and `p07-t04` produces no undeclared
  tracked diff. The narrow `Files` lists there are correct.
- The plan's use of `cli:source` rather than `cli` for CLI invocations avoids
  the `bundle-assets.sh` concurrency hazard tracked in
  `BL-260712-serialize-cli-asset-bundling`. That is a deliberate and correct
  choice.

## Verification Commands

```bash
# Task IDs: monotonic, no duplicates, counts match the summary table
rg -o '^### Task (p\d{2})-t\d{2}' -r '$1' .oat/projects/shared/review-plan-workflow/plan.md | sort | uniq -c

# I1: confirm no phase preamble declares a verification command
rg -n '^## Phase \d+:' -A6 .oat/projects/shared/review-plan-workflow/plan.md | rg -i 'verification'

# I2: confirm the accounting block is neither emitted nor assigned
rg -n 'Review Accounting' .agents/agents/oat-reviewer.md .oat/projects/shared/review-plan-workflow/plan.md

# M1: confirm the legacy marker is unmapped
rg -n 'legacy-unvalidated' .oat/projects/shared/review-plan-workflow/plan.md

# M2: confirm the value is unrecognized repo-wide
rg -n 'auto-artifact-review' .

# m1: confirm the only unintended blockquote lines
rg -n '^> ' .oat/projects/shared/review-plan-workflow/plan.md
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert these findings into plan
tasks or explicit deferrals.

Note separately that the configured plan gate remains blocked: run
`21b68483-5f01-498c-bfb7-60fd79a8504c` terminated as `review_failed` with
`review_did_not_complete` and produced no output, and an accepted gate run
cannot be replaced automatically. This review does not clear that gate. After
receiving these findings, decide explicitly whether to start a fresh gate run,
retarget the gate, or clear the blocker on the recorded evidence.
