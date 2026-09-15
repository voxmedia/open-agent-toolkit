---
oat_generated: true
oat_generated_at: 2026-09-15T04:23:41Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/recon-1-1-2-follow-ups
oat_gate_headless: true
oat_gate_run_id: 928567ff-e70a-4d5a-b2cc-4d208e621edf
oat_gate_target: claude-fable-skip-permissions
oat_gate_runtime: claude
oat_invocation_model: fable
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-09-15T04:23:41Z
**Scope:** `plan.md` for the lite project `recon-1-1-2-follow-ups` (Summary, Decisions, Product Behavior, Technical Design, Assumptions, Out of Scope, Validation Criteria, and the five `p01` tasks), checked against the current recon source tree and its hidden consumers
**Files reviewed:** 1 artifact (`plan.md`), plus `implementation.md`, the triage record it cites, and the recon scripts, tests, references, docs, and CLI validation tests the tasks touch
**Commits:** n/a (artifact review; plan committed at `ac012b556`)

## Dispatch Audit

- Gate route: inline (runtime=claude, cliRoot=/Users/tstang/Library/pnpm/store/v11/links/@open-agent-toolkit/cli/0.2.73/afc23552d6e99f827184b64b9edc26ee5de02e57cf7345ac4c64143732be1c02/node_modules)
- Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:opus effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=opus target=opus
- target: opus (launcher-selected/config-declared)
- model_axis: selected:opus (launcher-selected/config-declared)
- effort_axis: not-applicable (launcher-selected/config-declared)
- runtimeIdentity: not-reported
- Reviewer role: `~/.agents/agents/oat-reviewer.md` (canonical, executed inline per the validated `inline` gate route)

## Summary

The plan is complete, internally consistent, and correctly scoped to the seven triage claims: it removes the two proposed state machines, keeps fail-closed evidence and approval boundaries, and maps each product behavior to a task with a proportionate proof strategy. Two findings block as written: a CLI validation test pins both the recon skill version and the "exactly one terminal reconciliation wave" wording that tasks p01-t04 and p01-t05 change, and the plan's Cursor materialization proof command cannot run from the repository root. Three medium gaps concern the new reconcile-ledger CLI entry guard, an unpinned Decision about Cursor catalog discovery, and the triage record's backlog and status disposition.

Findings: 0 critical, 2 important, 3 medium, 2 minor

## Findings

### Critical

None

### Important

1. **Hidden consumer: the CLI validation suite pins the recon wording and version that p01-t04 and p01-t05 change** — `packages/cli/src/validation/skills.test.ts:8447-8468` reads `.agents/skills/recon/SKILL.md` and `.agents/agents/recon-worker.md`; line 8456 asserts the declared skill version is `1.1.2`, and line 8465 asserts `/exactly one terminal `reconciliation` wave/i`. p01-t04 (`plan.md:367-371`) removes the terminal reconciliation wave from the skill and p01-t05 (`plan.md:463-464`) bumps recon from 1.1.2, so `pnpm test` (validation criterion 8, `plan.md:153`) fails at both tasks, yet neither task's Files list, proof command, or commit (`plan.md:334-355`, `426-427`, `434-445`, `494-495`) includes that test. Fix: add `packages/cli/src/validation/skills.test.ts` to the Files and `git add` lists of p01-t04 (retarget the reconciliation assertion to the controller-stage wording, e.g. `controller:reconcile-ledger-v1`) and p01-t05 (update the version pin), and add `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts` to each task's Step 2 and Step 4 commands.

2. **Validation criterion 1 and p01-t01's proof command cannot run as written** — `plan.md:146`, `193`, and `206` invoke `pnpm exec vitest run packages/cli/src/providers/cursor/codec/materialize.test.ts` from the repository root. Verified on this checkout: the root has no vitest binary, so pnpm exits 127 with `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "vitest" not found`. Verified working form: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/cursor/codec/materialize.test.ts` (3 tests pass). In lite mode the Validation Criteria are the requirements contract, so a non-runnable criterion leaves Product Behavior 1 without executable proof. Fix: replace the command at all three lines with the package-filtered form.

### Medium

1. **p01-t04 turns `reconcile-ledger.mjs` into a sixth direct CLI without the p01-t02 entry guard or symlink control** — `plan.md:376-387` makes `scripts/reconcile-ledger.mjs` directly invocable, but p01-t04's Files list (`plan.md:334-355`) omits `scripts/lib/cli-entry.mjs` and `tests/cli-entry.test.mjs`, and its proof commands never run the symlink matrix. Product Behavior 4 (`plan.md:74-76`) and criterion 3 (`plan.md:148`) promise "every recon CLI" and "all five bundled CLIs", which becomes false once a sixth CLI exists; copying the current `import.meta.url === pathToFileURL(process.argv[1]).href` guard (the pattern at `scripts/validate-artifact.mjs:89-90`) would reintroduce the exact silent no-op p01-t02 fixes. Fix: state in p01-t04 Step 1 that the new entry guard uses the shared `cli-entry.mjs` helper, add `tests/cli-entry.test.mjs` to the task's Files and Step 2/4 commands, and reword Product Behavior 4 and criterion 3 to "all six bundled CLIs" or "every bundled CLI including `reconcile-ledger.mjs`".

2. **The Cursor catalog-discovery Decision has no task, test, or file** — Decisions (`plan.md:43-46`) and Product Behavior 3 (`plan.md:71-73`) require that installed role and live Task discovery be treated as separate facts, and the cited triage (`CLAIM-004`) asks for "one explicit sentence and regression that a materialized role file is not catalog evidence". No task step adds that sentence or assertion: p01-t01 only adds background-launch wording, and p01-t05 only records the disposition in the triage. Because a lite plan's Decisions are its requirements contract, this is an unmapped requirement. Fix: add to p01-t01 Step 1 an explicit clause for `.agents/skills/recon/SKILL.md` Step 4/5 ("a materialized `.cursor/agents/recon-worker.md` is not evidence the current Task catalog can launch it; use the observed catalog") with a matching assertion in `tests/skill-contract.test.mjs`, or move Product Behavior 3 to Out of Scope if the existing live-catalog rule at the current `SKILL.md` Step 4 is judged sufficient.

3. **p01-t05's triage revision leaves backlog and status disposition unstated** — the triage record (`.oat/repo/pjm/triage/2026-09-14-recon-1-1-2-feedback.md`) proposes creating one consolidated backlog item, cross-linking `BL-260906-harden-dispatch-launch` (CLAIM-002) and refining `BL-260719-add-pinned-recon-agents` (CLAIM-004), and carries `status: proposed`, `triage_pr: null`, and `Approval: pending` on every claim; both backlog items exist under `.oat/repo/pjm/backlog/items/`. p01-t05 Step 1 (`plan.md:459-466`) says only "revise the proposed triage ledger to the accepted simplified dispositions" and lists no backlog file, so an implementer cannot tell whether a backlog item is created, the two existing items get a cross-reference, or the frontmatter fields are resolved. Note the triage file is currently untracked in git, so p01-t05 is its first commit. Fix: state in p01-t05 Step 1 that no new backlog item is created because this project implements the work directly, give the target values for `status`, `triage_pr`, and each claim's `Approval`/`Post-merge result`, and either add the two backlog item files to the Files list for a one-line cross-reference or say they stay untouched.

### Minor

1. **p01-t05's format command includes a file oxfmt does not target** — `plan.md:479` passes `pnpm-lock.yaml` to `oxfmt --write`; verified that oxfmt reports `Expected at least one target file` for it and does nothing. Drop the lockfile from the command so the step is truthful.

2. **p01-t01 Technical Design wording may send the implementer to the wrong projection** — `plan.md:93-95` says to "preserve Cursor's existing generic frontmatter projection in `materialize.ts` and prove the canonical role's `is_background` field survives it". On this checkout `.cursor/agents/recon-worker.md` is a symlink to the canonical file, so the generic Cursor view reads canonical frontmatter directly; `materializeCursorAgent` (`packages/cli/src/providers/cursor/codec/materialize.ts:80-86`) only projects model-pinned variants, and it already passes `is_background` through (tested with `false` at `materialize.test.ts:51,80`). Reword to "prove the model-pinned Cursor materialization preserves `is_background: true`; the generic view is a symlink and needs no projection".

## Requirements/Design Alignment

### Requirements Coverage

| Requirement                                           | Status  | Notes                                                                                                                                       |
| ----------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| PB1 Cursor continuity (background leaves)             | covered | p01-t01; proof command must be corrected (Important 2)                                                                                      |
| PB2 Durable lane completion (artifact over stream)    | covered | p01-t01 workflow.integration controls                                                                                                       |
| PB3 Truthful role availability (catalog vs install)   | partial | Decision recorded; no task adds the sentence or regression (Medium 2)                                                                       |
| PB4 Reliable bundled commands (realpath entry)        | partial | p01-t02 covers five CLIs; the sixth CLI added by p01-t04 is unguarded (Medium 1)                                                            |
| PB5 Actionable worker output rules                    | covered | p01-t03; `closedObject` already exists at `contracts.mjs:2560`, `unresolvedIssues` element check is a real gap at `contracts.mjs:2191-2193` |
| PB6 Unambiguous reconciliation ownership              | covered | p01-t04; hidden pin in `skills.test.ts:8465` must be added (Important 1)                                                                    |
| Decision: revise triage record in the PR              | partial | p01-t05; backlog and status disposition unstated (Medium 3)                                                                                 |
| Out of Scope (no locator repair, no controller retry) | honored | No task adds either mechanism                                                                                                               |
| Version/lockstep policy                               | covered | recon 1.1.2 and recon-worker 1.0.1 confirmed current; all five packages at 0.2.74 equal `origin/main`, so p01-t05's bump is required        |

### Extra Work (not in declared requirements)

None

### Dispatch Profile

No `## Dispatch Profile` section is present; this is normal and not a finding.

## Verification Commands

```bash
# Important 1: confirm the hidden pin exists and what it asserts
sed -n 8447,8468p packages/cli/src/validation/skills.test.ts

# Important 2: root invocation fails, package-filtered invocation passes
pnpm exec vitest run packages/cli/src/providers/cursor/codec/materialize.test.ts; echo "exit=$?"
pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/cursor/codec/materialize.test.ts; echo "exit=$?"

# Medium 1: current entry-guard pattern that the new CLI must not copy
grep -n "pathToFileURL(process.argv\[1\]" .agents/skills/recon/scripts/*.mjs

# Medium 3: backlog items the triage record references
ls .oat/repo/pjm/backlog/items/BL-260906-harden-dispatch-launch.md .oat/repo/pjm/backlog/items/BL-260719-add-pinned-recon-agents.md
git status --porcelain -- .oat/repo/pjm/triage/2026-09-14-recon-1-1-2-feedback.md

# Minor 1: oxfmt ignores the lockfile
pnpm exec oxfmt --check pnpm-lock.yaml
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
