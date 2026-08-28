---
oat_generated: true
oat_generated_at: 2026-08-28T22:30:52Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/portable-agent-references
oat_gate_run_id: d0d90f8c-bd3d-417e-b115-48c493349453
oat_gate_target: claude-fable-skip-permissions
oat_gate_runtime: claude
oat_invocation_model: fable
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-08-28T22:30:52Z
**Scope:** Quick-workflow artifact bundle for `portable-agent-references` —
`plan.md` against `discovery.md` and the optional lightweight `design.md`
**Files reviewed:** 3 (`plan.md`, `discovery.md`, `design.md`), plus `state.md`
and the repository surfaces the plan makes claims about
**Commits:** not applicable (artifact review); branch head at review time
`80da50b0490f93a70408f11b1a3c9095844d331b`
**Recommendation:** Block at the `important` threshold — one Important
plan-verifiability finding (I1) must be resolved before implementation

**Reconnaissance:** not-attempted

**Gate route:** inline (runtime=claude,
cliRoot=/Users/tstang/orca/workspaces/open-agent-toolkit/oat-plugin)
**Reviewer dispatch report (schemaVersion 1, `oat project dispatch-ceiling resolve --role reviewer --report-scope plan --report-action review`):**
`Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:opus effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=opus target=opus`
The gate's configured invocation (`claude-fable-skip-permissions`, model
`fable`) is recorded verbatim in frontmatter as gate-owned metadata and sits
above the `opus` reviewer ceiling; runtime identity is `not-reported`.

## Summary

The bundle is internally consistent and complete for quick mode: every
discovery success criterion maps to a plan task, the design's two resolver
contracts (loaded-skill and materialized-agent) are carried into the tasks
verbatim, the `oat-phase-implementer` exemption at
`packages/cli/src/validation/skills.test.ts:4652-4654` is explicitly deleted in
p01-t05, docs and lockstep-release work are scheduled in Phase 2 in the
repository's Definition-of-Done order, and implementation phase-gate review is
disabled consistently across `plan.md` and `state.md`. An independent sweep of
all 192 authored Markdown files shipped by user-default packs confirms the
plan's remediation inventory covers every repository-relative cross-skill read
(three agents, three utility skills, two research skills, one workflow skill).

One Important finding blocks: task p01-t05 asks for a sync contract that reads
"every generated role" while deferring the actual provider-view refresh to
p02-t02, and the provider views are tracked files that still carry the bare
paths. As written the task's own verification cannot pass. One Medium finding
notes that the ratchet's target grammar (`SKILL.md` or `references/**/*.md`)
misses the directory-form reads that are the only cross-skill reads in
`oat-codebase-mapper` and also appear in the other two agents.

Findings: 0 critical, 1 important, 1 medium, 5 minor

## Findings

### Critical

None

### Important

- **I1: p01-t05 verifies generated provider roles that the plan does not regenerate until p02-t02**
  (`.oat/projects/shared/portable-agent-references/plan.md:272-290`)
  - Issue: Step 3 of p01-t05 says to "read every generated role, require the
    portable resolver markers in each copy, and reject executable bare
    sibling-skill paths", and its verification runs
    `vitest run ... src/commands/sync/index.test.ts` followed by
    `pnpm run cli -- sync --scope all --dry-run`. The generated roles are
    tracked files (74 under `.claude/agents`, `.cursor/agents`,
    `.codex/agents` per `git ls-files`), the existing sync contract reads them
    from the repository checkout
    (`packages/cli/src/commands/sync/index.test.ts:1982-1995`), and the
    committed copies still contain the bare paths
    (`.claude/agents/oat-phase-implementer.md:76-82`,
    `.claude/agents/oat-reviewer.md:84`,
    `.claude/agents/oat-codebase-mapper.md:224,257`). A dry-run writes
    nothing, p01-t05's commit stages only six canonical/test files
    (`plan.md:294-296`), and the real refresh plus "generated provider views
    selected by `oat sync --scope all`" are scheduled in p02-t02
    (`plan.md:378-379,394-397`). The new assertions therefore fail at p01-t05
    and stay failing through p01-t06, or the implementer must commit files
    outside the task's declared scope. The design's Testing Strategy has the
    same ambiguity ("provider sync dry-run/materialization contracts",
    `design.md:220-221`).
  - Fix (choose one and state it in the task): (a) specify that the new sync
    contract materializes the current canonical agents into a temporary root
    through the sync harness — the same pattern the Codex user-scope role test
    already uses at `sync/index.test.ts:1880-1953` — and asserts on that
    output, so p01-t05 is self-contained; or (b) move the non-dry-run
    `pnpm run cli -- sync --scope all`, `.oat/sync/manifest.json`, and the
    regenerated provider views into p01-t05's Files and commit, and remove
    them from p02-t02. Option (a) keeps the design's "verify generated
    provider content" promise without coupling it to a later task.

### Medium

- **M1: Ratchet target grammar excludes directory-form cross-skill reads, which are the only reads in `oat-codebase-mapper` and also appear in the other two agents**
  (`.oat/projects/shared/portable-agent-references/design.md:98-99`; `plan.md:55-57,269,309-311`)
  - Issue: design and plan define the target class as `SKILL.md` or
    `references/**/*.md`. Live executable reads that end in a directory are
    outside that grammar: `.agents/agents/oat-codebase-mapper.md:224,257`
    (`.agents/skills/oat-repo-knowledge-index/references/templates/`),
    `.agents/agents/oat-phase-implementer.md:80,82`
    (`subagent-orchestration/references/`,
    `oat-dispatch-subagents/references/`), and
    `.agents/agents/oat-reviewer.md:84` (both directory forms). Consequences
    for the plan as written: the codebase mapper never enters the p01-t01
    migration inventory, so p01-t05's "remove all agent entries from the
    migration inventory" and p01-t06's "finding set is empty" cannot prove its
    remediation; and after porting, a directory-form regression in any
    user-default asset would pass the zero-debt invariant. The design's
    `CrossSkillReference.targetPath` field already accommodates this.
  - Fix: widen the target grammar so the path tail matches either `SKILL.md`
    or `references` followed by an optional `/...` segment that stops at
    whitespace, a closing backtick, or a closing bracket/quote (for example
    `references(?:/[^\s)"'>]*)?` with the backtick added to the excluded
    class), so directory targets are captured with `targetPath` ending in `/`;
    add table-driven cases for backticked and plain directory forms in
    p01-t01 Step 1, and keep the
    per-agent positive assertions in p01-t05. Alternatively state in
    design.md that directory reads are outside the ratchet and covered only by
    the per-agent positive assertions — but that leaves the regression hole
    open.

### Minor

- **m1: Skills-root-relative short forms are neither repo-relative nor portable, and the plan's inventory expectation does not say how they classify**
  (`.oat/projects/shared/portable-agent-references/plan.md:85-87,122-129`)
  - Issue: reads spelled without a prefix or root variable — e.g.
    `subagent-orchestration/references/provider-claude.md` at
    `.agents/skills/oat-dispatch-subagents/SKILL.md:59-63,77,267`,
    `.agents/skills/oat-dispatch-subagents/references/provider-{claude,codex,cursor}.md:5`,
    `.agents/skills/subagent-orchestration/references/provider-{claude,codex}.md:12`,
    `.agents/skills/oat-project-dispatch-subagents/SKILL.md:33-36` — resolve
    only under a root established by the enclosing contract. The already-ported
    `oat-project-implement` keeps the same short forms after binding
    `${ORCHESTRATION_SKILLS_ROOT}`
    (`.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md:453`),
    so treating them as non-violations is consistent with PR #226, but nothing
    in `design.md` or p01-t01 says so. The p01-t01 expectation that the
    "exact migration inventory matches the current repository" is only
    unambiguous once this class is named.
  - Suggestion: add one sentence to the design's classifier section (and to
    p01-t02 Step 2) stating that short-form follow-on reads are local to the
    root bound by their anchoring read and are outside the ratchet, and that
    porting the anchoring read at `oat-dispatch-subagents/SKILL.md:55` to a
    bound root makes lines 59-77 resolve under it.

- **m2: Non-canonical cells in the structured plan-review row**
  (`.oat/projects/shared/portable-agent-references/plan.md:448`)
  - Issue: the `plan | artifact | fixes_completed` row records `Reviewed Head`
    as an abbreviated SHA (`c47586ce`) and `Invocation` as
    `native:oat-reviewer-gpt-5-6-sol-high`. The ledger contract reserves
    `Reviewed Head` for full 40-character SHAs on code reviews (`-` otherwise)
    and `Invocation` for `manual|auto|gate` (`-` for non-code). Keep the row;
    do not delete it. Note that `oat-project-pr-final` will require a later
    passed re-review event for this `fixes_completed` scope — the row this
    gate appends, once received, satisfies that.
  - Suggestion: normalize the two cells to `-` and carry the structured-review
    provenance (`c47586cea`, reviewer variant) in the row's Artifact cell or a
    handoff note.

- **m3: `state.md` prose is stale relative to its own frontmatter and the artifact files**
  (`.oat/projects/shared/portable-agent-references/state.md:97-101`)
  - Issue: the Artifacts list says discovery is `in_progress`, design is
    `N/A`, and plan/implementation are "scaffolded template — not started",
    while `discovery.md` and `design.md` are `oat_status: complete` and the
    plan is drafted and reviewed. `design.md` also leaves `oat_ready_for: null`
    despite `oat_status: complete`. Frontmatter drives routing, so this is
    prose drift only.
  - Suggestion: refresh the Artifacts list during the quick-start Step 4 state
    sync and set `design.md` `oat_ready_for` to the planning skill.

- **m4: The phase-gate-review decision is recorded only as an absence**
  (`.oat/projects/shared/portable-agent-references/plan.md:1-16`;
  `state.md:11-12,24-35`)
  - Issue: verified consistent — neither `plan.md` nor `state.md` contains
    `oat_phase_review_gate`, which the shared setup contract treats as
    disabled; `oat_plan_hill_phases: []` and `oat_hill_checkpoints: []` agree;
    the configured `oat-project-implement` gate is a final code review only.
    But the choice is visible only by key absence; a future reader of the
    bundle cannot tell a deliberate decline from a never-asked probe.
  - Suggestion: add one Progress line to `state.md` such as
    "Phase gate review: disabled (user preference; built-in per-phase root
    reviews and final gate remain)".

- **m5: "Update its explicit validation pin" is stated for skills that have no pin**
  (`.oat/projects/shared/portable-agent-references/plan.md:130-131,172-173,211-212,270`)
  - Issue: explicit version pins exist for `oat-dispatch-subagents`
    (`skills.test.ts:4609`), `oat-review-provide-remote` (`:4533`),
    `oat-project-review-provide` (`:2217`), `oat-phase-implementer` and
    `oat-reviewer` (`:2215-2216`). No pin exists for `oat-repo-improve`,
    `analyze`, `compare`, or `oat-codebase-mapper`.
  - Suggestion: reword to "update its explicit validation pin where one
    exists, otherwise add one", so the implementer adds the missing pins rather
    than searching for them.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `design.md` (lightweight, present),
`plan.md`, `state.md`, `implementation.md` (scaffold), prior exit review
`.oat/projects/archived/portable-skill-references/reviews/archived/final-review-2026-08-28T175129Z.md`,
`packages/cli/src/commands/tools/shared/pack-manifest.ts`,
`packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`,
`packages/cli/src/validation/skills.test.ts`,
`packages/cli/src/commands/sync/index.test.ts`, the three canonical agents,
the named canonical skills, `apps/oat-docs/docs/contributing/skills.md`,
`apps/oat-docs/docs/cli-utilities/tool-packs.md`, repo and user gate
configuration (`oat gate resolve`), and a full sweep of user-default pack
Markdown for cross-skill targets in any spelling.

### Requirements Coverage

| Requirement (discovery Success Criteria / review brief)                                    | Status   | Notes                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase implementer and reviewer contain no executable bare sibling reads                    | planned  | p01-t05 ports `.agents/agents/oat-phase-implementer.md:76-82` and `oat-reviewer.md:84`; user → project order matches design.md:145-163                                                                                                                                                                |
| `oat-dispatch-subagents` resolves `subagent-orchestration` through an installed-scope root | planned  | p01-t02 covers `SKILL.md:55` (anchor) — see m1 for the follow-on short forms                                                                                                                                                                                                                          |
| Independent per-dependency resolution, exact target check, fail-closed recovery            | planned  | Carried from PR #226 contract (`oat-project-implement/SKILL.md:22-31`) into p01-t02/t05 assertions                                                                                                                                                                                                    |
| Tests for user/project agent order, loaded/user/project skill order, mixed scope, recovery | planned  | p01-t02 Step 1, p01-t03 Step 1, p01-t05 Step 1                                                                                                                                                                                                                                                        |
| Remove `oat-phase-implementer` special branch; positive assertions replace it              | planned  | p01-t05 Step 2 names the branch at `skills.test.ts:4652-4654` explicitly                                                                                                                                                                                                                              |
| Ratchet enumerates user-default skill and agent Markdown across spelling variants          | partial  | p01-t01 derives from `PACK_MANIFEST` (`asset.kind` skill and agent) — feasible against `pack-manifest.ts:44-67`; directory-form targets are outside the stated grammar (M1)                                                                                                                           |
| All executable violations ported (workflow, utility, research, codebase mapper)            | planned  | Independent sweep of 192 files: every repository-relative hit is covered by p01-t02 (`oat-dispatch-subagents`, `oat-review-provide-remote`, `oat-repo-improve`), p01-t03 (`analyze`, `compare`), p01-t04 (`oat-project-review-provide:896`), p01-t05 (three agents); `codex-skill` is not in any pack |
| Only exact self-reference or historical baselines remain                                   | planned  | p01-t01 keeps the existing six-entry `PINNED_HISTORICAL_BARE_READS` (`skills-bundled-docs-contract.test.ts:227-244`) separate from a temporary migration inventory removed in p01-t06                                                                                                                 |
| Provider/bundled views contain the updated agent and utility instructions                  | partial  | p01-t06 bundle assertions are self-contained; p01-t05 generated-role assertions conflict with the p02-t02 refresh order (I1)                                                                                                                                                                          |
| Version bumps, lockstep release, full repository gates                                     | planned  | p02-t02 lists all five public packages plus `packages/cli/assets/public-package-versions.json`; gate order matches AGENTS.md steps 1-8 plus `lint`/`format`/`diff --check`; current lockstep is 0.2.39 on both branch and `origin/main`, so the bump is required and scheduled                        |
| Documentation of the global portability invariant                                          | planned  | p02-t01 targets `apps/oat-docs/docs/contributing/skills.md` (existing "Portable sibling-skill reads" section at line 27) with a conditional `tool-packs.md` edit                                                                                                                                      |
| Implementation phase-gate review remains disabled (review brief)                           | verified | No `oat_phase_review_gate` in `plan.md`/`state.md`; `oat_plan_hill_phases: []`; `oat_hill_checkpoints: []`; only plan-artifact and final-code gates are configured — recorded by absence only (m4)                                                                                                    |
| Dispatch Profile named-ceiling advisory                                                    | n/a      | No `## Dispatch Profile` section in `plan.md`; not flagged per contract                                                                                                                                                                                                                               |

### Extra Work (not in declared requirements)

None. Phase 2's docs and release tasks are required by the discovery
constraints (`discovery.md:98-102`), not additions.

### Plan-format checklist

- Frontmatter and required sections present; `oat_template: true` is the
  documented interruption-safe pre-review state for quick mode
  (`oat-project-quick-start/SKILL.md:512-520`) and is expected to flip at the
  post-gate write.
- Task IDs `p01-t01`..`p01-t06`, `p02-t01`..`p02-t02` are monotonic; commit
  messages follow `{type}({task-id}): {description}`.
- Reviews table exists with the widened eight-column header; existing rows
  preserved.
- `oat_plan_parallel_groups: []` agrees with the Parallelism rationale
  (shared inventory and test files across all Phase 1 tasks).

## Verification Commands

Run after the plan is revised:

```bash
# I1: confirm which route was chosen — either the sync contract is temp-root based
grep -nE 'temporary root|materializ' .oat/projects/shared/portable-agent-references/plan.md
# ...or the provider refresh moved into p01-t05's file list
grep -nE 'oat sync --scope all$|\.oat/sync/manifest\.json' .oat/projects/shared/portable-agent-references/plan.md

# M1: target grammar names directory targets
grep -nE 'references/\*\*/\*\.md|references(/|\\/)' .oat/projects/shared/portable-agent-references/design.md .oat/projects/shared/portable-agent-references/plan.md

# Re-run the artifact gate
oat --json gate review --project .oat/projects/shared/portable-agent-references --review-type artifact --review-scope plan --exit-nonzero-on important "Use oat-project-review-provide artifact plan to review the current project plan."
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan
revisions; the gate blocked at the `important` threshold, so I1 must be
resolved (and the Medium/Minor items dispositioned) before
`oat-project-implement`.
