---
oat_generated: true
oat_generated_at: 2026-08-28T22:49:08Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/portable-agent-references
oat_gate_run_id: 3b405d21-c1c2-46fa-a691-b5f84adb712b
oat_gate_target: claude-fable-skip-permissions
oat_gate_runtime: claude
oat_invocation_model: fable
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-08-28T22:49:08Z
**Scope:** Re-review of the revised quick-workflow artifact bundle for
`portable-agent-references` — `plan.md` against `discovery.md` and the
lightweight `design.md`, verifying the fixes for the prior gate review's I1,
M1, and m1–m5 findings
**Files reviewed:** 3 (`plan.md`, `discovery.md`, `design.md`), plus
`state.md`, `implementation.md`, the archived prior review, and the repository
surfaces the plan makes claims about
**Commits:** not applicable (artifact review); branch head at review time
`5c370c1857bd7445be4bb57bf76407482228536f`
**Recommendation:** Pass at the `important` threshold — no Critical or
Important findings; one Medium and two Minor items for disposition

**Reconnaissance:** not-attempted

**Gate route:** inline (runtime=claude,
cliRoot=/Users/tstang/orca/workspaces/open-agent-toolkit/oat-plugin)
**Reviewer dispatch report (schemaVersion 1, `oat project dispatch-ceiling resolve --provider claude --role reviewer --preflight --report-scope plan --report-action review`):**
`Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:opus effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=opus target=opus`
The gate's configured invocation (`claude-fable-skip-permissions`, model
`fable`) is recorded verbatim in frontmatter as gate-owned metadata; gates
resolve their exec target independently of the `opus` reviewer ceiling.
Runtime identity is `not-reported`.

## Summary

All seven prior findings are resolved in the artifacts. I1 is fixed the way
the prior review recommended: p01-t05 Step 3 now materializes canonical
agents through the sync harness into a temporary root and explicitly stops
reading the stale tracked provider views (`plan.md:278-288`), leaving the
tracked refresh to p02-t02. M1's directory-form grammar is present in both
design and plan (`design.md:98-99,127-131`; `plan.md:26-27,55-57`). m1's
root-bound short-form classification, m2's ledger normalization of the
structured-review row, m3's state/design metadata refresh, m4's explicit
"Phase gate review: disabled" line, and m5's conditional pin wording are all
in place. Task coverage remains complete: an independent sweep of every
repository-relative or parent-relative cross-skill read in `.agents/` confirms
that all hits in user-default packs are scheduled (three agents, three utility
skills, two research skills, one workflow skill), the remaining hits are
self-references, the existing historical baseline, or skills not shipped by
any pack, and the `oat-phase-implementer` exemption at
`packages/cli/src/validation/skills.test.ts:4652-4654` is still explicitly
deleted in p01-t05. Lockstep release, docs, and the ordered gate sequence are
unchanged and correct (current lockstep is 0.2.39 on both the branch and
`origin/main`).

One Medium remains from the I1 fix itself: the sync harness's existing
user-scope disk route reads agents from the gitignored bundled assets
directory, not from canonical `.agents/agents`, so p01-t05 must name its input
source or its temp-root assertion silently tests whichever bundle was last
built. Two Minors cover a ledger-cell vocabulary slip introduced by the m2
fix and a clarification of which mechanism enforces the short-form anchoring
rule.

Findings: 0 critical, 0 important, 1 medium, 2 minor

## Findings

### Critical

None

### Important

None

### Medium

- **M1: p01-t05's temporary-root materialization does not say where the harness reads the "current canonical agents" from, and the existing harness route reads the gitignored bundle instead**
  (`.oat/projects/shared/portable-agent-references/plan.md:278-288`; `design.md:225-228`)
  - Issue: the task says to "materialize the current canonical agents through
    the existing sync harness into a temporary root". The existing user-scope
    disk route in that harness (`packages/cli/src/commands/sync/index.test.ts:363-365,1904-1906`,
    the pattern the prior review pointed at) calls `scanBundledManagedAgents()`
    (`packages/cli/src/engine/scanner.ts:77-99`), which reads
    `<assetsRoot>/agents` — the `packages/cli/assets/agents` directory that
    `.gitignore:21` ignores and that only `bundle-assets.sh:54-55` populates
    (invoked by `pnpm run cli`, not by the `vitest run` command in Step 3).
    The bundle copy on this checkout still carries the bare path
    (`packages/cli/assets/agents/oat-reviewer.md` contains
    `.agents/skills/oat-dispatch-subagents/SKILL.md`). An implementer who
    follows the existing pattern verbatim therefore asserts against whatever
    bundle was last built: failing after the canonical port until someone
    runs a bundling command, or passing against a bundle built from an
    unrelated tree. Materialization itself is feasible — the Cursor and Codex
    extensions are real exports (`packages/cli/src/commands/sync/index.ts:32,35,86-90`)
    and the harness accepts `extraMaterializationExtensions`
    (`index.test.ts:60,399`); Claude views are symlinks
    (`git ls-files -s .claude/agents` mode `120000`), so only Cursor ladder
    variants and Codex `.toml` roles need materialized-copy assertions, which
    the task's "wherever each provider materializes that role" already allows.
  - Fix: add one sentence to p01-t05 Step 3 naming the input source: copy the
    canonical `.agents/agents/*.md` into the temporary root before running
    sync — either as a project-scope `.agents/agents` read by
    `scanCanonical` with `useDiskScanner`, or as a temporary assets root
    selected via `OAT_ASSETS_DIR` (`packages/cli/src/fs/assets.ts:85-90`) —
    and state that the contract must never read `packages/cli/assets/agents`
    directly. Optionally mirror that sentence in `design.md` Bundle and
    Provider Tests.

### Minor

- **m1: The gate-review ledger row records `Invocation`/`Gate Target` for an artifact review, which the ledger contract reserves for code reviews**
  (`.oat/projects/shared/portable-agent-references/plan.md:459`)
  - Issue: the prior m2 fix correctly normalized the structured-review row
    (`plan.md:458`), but the gate-artifact row now carries `gate` and
    `claude-fable-skip-permissions` in `Invocation` and `Gate Target`. Both
    `oat-project-review-provide` Step 9 and
    `.agents/skills/oat-project-review-receive/SKILL.md:449-451` define those
    cells as code-review-only (`-` for non-code reviews), and the gate flow
    itself wrote `-`/`-` for this row originally (commit `cfc38287c`). No
    consumer parses these cells for artifact rows (re-review narrowing is
    code-only), so this is ledger hygiene, not routing.
  - Suggestion: set both cells to `-`; the gate provenance already lives in
    the archived artifact's frontmatter.

- **m2: The short-form anchoring rule reads as a scanner condition, but only the caller-contract assertions can enforce it**
  (`.oat/projects/shared/portable-agent-references/design.md:127-131`; `plan.md:129-131`)
  - Issue: "outside the bare-read ratchet only when their anchoring read
    establishes that root first" implies the ratchet evaluates anchoring.
    The ratchet is a spelling-based matcher (`BARE_CROSS_SKILL_READ`,
    `skills-bundled-docs-contract.test.ts:50-51`, widened by p01-t01); short
    forms such as `subagent-orchestration/references/provider-codex.md` never
    match it regardless of anchoring. The "only when" condition is what the
    p01-t02/p01-t05 positive caller assertions prove. An implementer reading
    p01-t01 could otherwise try to add short-form matcher cases.
  - Suggestion: append one clause to the design decision and to p01-t02
    Step 2: "the scanner does not match short forms; the anchoring
    requirement is enforced by the caller-contract assertions."

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `design.md`, `plan.md`,
`state.md`, `implementation.md`, the archived prior review
`reviews/archived/artifact-plan-review-2026-08-28T223052Z.md`, commits
`cfc38287c` and `5c370c185`, `packages/cli/src/commands/tools/shared/pack-manifest.ts`,
`packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`,
`packages/cli/src/validation/skills.test.ts`,
`packages/cli/src/commands/sync/index.test.ts`, `index.ts`,
`packages/cli/src/engine/scanner.ts`, `packages/cli/src/fs/assets.ts`,
`packages/cli/scripts/bundle-assets.sh`, `.gitignore`, `.oxfmtrc.jsonc`,
root `package.json` scripts, `git ls-files -s` over provider agent views, the
three canonical agents, the named canonical skills,
`apps/oat-docs/docs/contributing/skills.md`, `oat gate resolve
oat-project-implement`, `oat gate route`, and a grep sweep of `.agents/` for
repository-relative and parent-relative cross-skill targets.

### Prior-Finding Verification

| Prior finding                                  | Status   | Evidence                                                                                                                                                                                                                                          |
| ---------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1 temp-root provider materialization sequence | resolved | `plan.md:278-288` materializes via the sync harness into a temporary root, derives role paths from that plan/manifest, and excludes stale tracked views; `design.md:225-228` matches; p02-t02 keeps the tracked refresh (see M1 for input source) |
| M1 directory-form `references/` grammar        | resolved | `design.md:98-99` (file-form and directory-form), `design.md:78` (file or directory at or below `references/`), `plan.md:26-27,55-57` (with and without trailing slashes)                                                                         |
| m1 root-bound short-form classification        | resolved | `design.md:127-131`, `plan.md:129-131` (see m2 for wording)                                                                                                                                                                                       |
| m2 review-ledger provenance                    | resolved | `plan.md:458` uses `-` cells and carries head/reviewer in the Artifact cell (see m1 for the adjacent row)                                                                                                                                         |
| m3 state/design metadata                       | resolved | `state.md:98-104` Artifacts list matches artifact frontmatter; `design.md:3` `oat_ready_for: oat-project-plan`                                                                                                                                    |
| m4 explicit disabled phase-gate decision       | resolved | `state.md:118-119` "Phase gate review: disabled (user preference; built-in root reviews and final gate remain)"; `implementation.md:135`; `oat gate resolve oat-project-implement` still yields only the final code-review gate                   |
| m5 conditional version-pin wording             | resolved | `plan.md:134-135,177-178,216-217,275-276` "update its explicit validation pin where one exists, otherwise add one"                                                                                                                                |

### Requirements Coverage

| Requirement (discovery Success Criteria / review brief)                                    | Status   | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase implementer and reviewer contain no executable bare sibling reads                    | planned  | p01-t05 ports `.agents/agents/oat-phase-implementer.md:76-82` and `oat-reviewer.md:84`; user → project order matches `design.md:149-167`                                                                                                                                                                                                                                                                                                                                                                                              |
| `oat-dispatch-subagents` resolves `subagent-orchestration` through an installed-scope root | planned  | p01-t02 covers the anchor at `SKILL.md:55`; short forms on lines 59-77 classified per `design.md:127-131`                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Independent per-dependency resolution, exact target check, fail-closed recovery            | planned  | p01-t02/t03/t04/t05 Step 1 assertions; carried from the PR #226 contract                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Tests for user/project agent order, loaded/user/project skill order, mixed scope, recovery | planned  | p01-t02 Step 1, p01-t03 Step 1, p01-t05 Step 1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Remove `oat-phase-implementer` special branch; positive assertions replace it              | planned  | p01-t05 Step 2; branch still present at `skills.test.ts:4652-4654`                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Ratchet enumerates user-default skill and agent Markdown across spelling variants          | planned  | p01-t01 derives from `PACK_MANIFEST` (`pack-manifest.ts:44-67`); grammar now includes directory forms. Note: every pack currently has `defaultScope: 'user'`, so the "non-user-default excluded" case must use a synthetic manifest fixture, which p01-t01 Step 1 already implies                                                                                                                                                                                                                                                     |
| All executable violations ported (workflow, utility, research, codebase mapper)            | planned  | Sweep confirms coverage: p01-t02 (`oat-dispatch-subagents:55`, `oat-review-provide-remote:106`, `oat-repo-improve:120-124`), p01-t03 (`analyze:263-264`, `compare:170`), p01-t04 (`oat-project-review-provide:896`), p01-t05 (three agents). Remaining hits are self-references (`oat-repo-knowledge-index`, `oat-project-design`), the pinned historical baseline (`oat-brainstorm/references/dogfood-results.md`), or skills in no pack (`codex-skill`, `create-oat-skill`, `review-backlog`, `docs-completed-projects-gap-review`) |
| Only exact self-reference or historical baselines remain                                   | planned  | p01-t01 keeps `PINNED_HISTORICAL_BARE_READS` separate from a temporary migration inventory removed in p01-t06                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Provider/bundled views contain the updated agent and utility instructions                  | planned  | p01-t05 temp-root materialization (M1 input-source note), p01-t06 bundle assertions, p02-t02 tracked refresh via `oat sync --scope all`                                                                                                                                                                                                                                                                                                                                                                                               |
| Version bumps, lockstep release, full repository gates                                     | planned  | p02-t02 lists all five public packages plus `packages/cli/assets/public-package-versions.json` (tracked; regenerated by `bundle-assets.sh:70-90`); gate order matches AGENTS.md steps 1-8 plus `lint`/`format`/`diff --check` with explicit exit capture; 0.2.39 on both branch and `origin/main`                                                                                                                                                                                                                                     |
| Documentation of the global portability invariant                                          | planned  | p02-t01 targets the existing "Portable sibling-skill reads" section (`apps/oat-docs/docs/contributing/skills.md:27`) with a conditional `tool-packs.md` edit; `pnpm check` covers markdownlint                                                                                                                                                                                                                                                                                                                                        |
| Implementation phase-gate review remains disabled (review brief)                           | verified | Recorded explicitly in `state.md:118-119`; `oat_plan_hill_phases: []`, `oat_hill_checkpoints: []`; only the final code-review gate is configured                                                                                                                                                                                                                                                                                                                                                                                      |
| Dispatch Profile named-ceiling advisory                                                    | n/a      | No `## Dispatch Profile` section in `plan.md`; not flagged per contract                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

### Extra Work (not in declared requirements)

None.

### Plan-format checklist

- Frontmatter and required sections present; `oat_template: true`,
  `oat_status: in_progress`, and `oat_ready_for: null` are the expected
  pre-gate-pass state and flip at the quick-start post-gate write.
- Task IDs `p01-t01`..`p01-t06`, `p02-t01`..`p02-t02` are monotonic; commit
  messages follow `{type}({task-id}): {description}`.
- Reviews table uses the widened eight-column header; all prior rows are
  preserved.
- `oat_plan_parallel_groups: []` agrees with the Parallelism rationale.
- Verification commands reference real files and scripts (`--scope all` is a
  valid choice; `--dry-run` exits 0; `bundle-assets.sh` lives at
  `packages/cli/scripts/`; oxfmt does not ignore `.agents/agents`).

## Verification Commands

Run after the plan is revised:

```bash
# M1: p01-t05 names the canonical input source for temp-root materialization
grep -nE 'OAT_ASSETS_DIR|copy the canonical|scanCanonical|never read `packages/cli/assets/agents`' .oat/projects/shared/portable-agent-references/plan.md

# m1: artifact gate row uses `-` for Invocation and Gate Target
grep -nE '^\| plan +\| artifact' .oat/projects/shared/portable-agent-references/plan.md

# m2: anchoring rule names the enforcing mechanism
grep -nE 'caller-contract assertions' .oat/projects/shared/portable-agent-references/design.md .oat/projects/shared/portable-agent-references/plan.md
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to disposition the Medium and
Minor findings; the gate passes at the `important` threshold, so the plan can
proceed to `oat-project-implement` once the post-gate write flips the plan
frontmatter.
