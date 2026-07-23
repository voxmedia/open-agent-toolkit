---
oat_generated: true
oat_generated_at: 2026-07-23T02:43:25Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/subagent-orchestration
oat_gate_run_id: 2ea7caf3-17d1-4994-907d-efee3b2e860b
oat_gate_target: cursor-fable-5-xhigh
oat_gate_runtime: cursor
oat_invocation_model: claude-fable-5-xhigh
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-07-23T02:43:25Z
**Scope:** artifact plan — `plan.md` against `discovery.md` and `design.md`
(quick mode; design present and used as upstream context)
**Files reviewed:** 3 (`plan.md`, `discovery.md`, `design.md`; plus repository
verification of every plan-referenced file, script, and claim)
**Commits:** n/a (artifact review; no git range)

Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable dispatch_policy=high dispatch_ceiling=gpt-5.6-sol-high target=oat-reviewer-gpt-5-6-sol-high

Gate route: inline (runtime=cursor, cliRoot=/Users/tstang/.nvm/versions/node/v22.17.0/lib/node_modules).
Reviewer resolver returned the managed target above; the validated gate route
helper selected the inline route, so the complete `oat-reviewer` role contract
was executed inline in the gate exec target. Runtime identity is not promoted
into configured-invocation fields.

## Summary

The plan is structurally sound, canonical-format conformant, and passes the
CLI's own `oat project validate-plan` check. All 30+ referenced files, all
verification scripts (`cli:source`, `docs:check-links`,
`release:check-versions`, `release:validate`, `bundle-assets.sh`), the
`docs generate-index` flags, and the `[p02, p03]` parallel-group file
disjointness were verified against the repository and hold. The blocking
concern is factual-premise drift in Phase 1 task descriptions: p01-t02
instructs removal of named model matrices that do not exist in the current
dispatch provider references (they exist only in the imported prior-project
draft), which risks over-deletion in safeguard-carrying files, and p01-t04
cites a `1.1.5` version-pin assertion that does not exist in the test suite.

Findings: 0 critical, 1 important, 1 medium, 3 minor

**Reconnaissance:** not-attempted

## Findings

### Critical

None

### Important

- **p01-t02 instructs removing model matrices that do not exist in the current dispatch references** (`.oat/projects/shared/subagent-orchestration/plan.md:130`)
  - Issue: Step 1 says "Remove dated model families and recommendation
    matrices from the dispatch provider references." The current
    `.agents/skills/oat-dispatch-subagents/references/provider-{claude,codex,cursor}.md`
    contain no named model families, dated matrices, or recommendation
    ladders — verified at HEAD and at prior revisions 616adb08 and 4578e261
    (searches for `opus|sonnet|haiku|fable|gpt-5|composer|luna|terra|sol`
    match nothing). Named matrices exist only in the imported draft at
    `references/prior-project/skills/oat-subagent-dispatch/`. The plan
    apparently conflates the imported draft with the repo's current skill.
    Risk: an implementer told removable selection content exists may
    (a) delete the current generic Task-Class Resolution / class-floor
    sections, which `design.md` explicitly permits mechanics to keep
    ("Mechanics may discuss selectors and class floors"), or (b) substitute
    the imported draft's reference bodies wholesale — both regress exactly
    the safeguard content the design's top risk ("Safeguard regression")
    warns about. Meanwhile the real, needed reference cleanup is unnamed:
    the stale self-references "the dated model-family examples in this
    provider reference"
    (`.agents/skills/oat-dispatch-subagents/references/provider-claude.md:36`,
    `.agents/skills/oat-dispatch-subagents/references/provider-cursor.md:21`)
    describe examples that are not present and should be repointed at the new
    guidance layer.
  - Fix: Reword p01-t02 Step 1 to state the current dispatch references are
    already free of named matrices, and scope the edit to: (1) the Required
    Loading composition rewrite (real — `SKILL.md:50-57` currently loads only
    one provider reference), (2) repairing the stale "dated model-family
    examples in this provider reference" wording to defer to the new
    `subagent-orchestration` selection references, (3) the additive
    record-schema evidence fields, while explicitly preserving the
    Task-Class Resolution class-floor language per design.

### Medium

- **p01-t04 cites a `1.1.5` version-pin assertion that does not exist** (`.oat/projects/shared/subagent-orchestration/plan.md:246`)
  - Issue: Step 1 says to "Update existing assertions that pin
    `oat-dispatch-subagents` version `1.1.5`." No such assertion exists:
    `rg "1\.1\.5"` across `packages/cli/` and `.agents/` matches only the
    dispatch skill's own frontmatter. The suite pins versions for other
    skills (e.g. `packages/cli/src/validation/skills.test.ts:735-746`, `:816`)
    but not for `oat-dispatch-subagents`. The task's other migration targets
    are real (single-reference consumer-contract assertions at
    `packages/cli/src/validation/skills.test.ts:844` and `:3757`; dispatch
    reference-path assertions at `:891-905`, `:1002-1008`, `:3742-3790`), so
    the task itself stands.
  - Fix: Drop the `1.1.5` pin claim and name the actual assertion families to
    migrate (single-reference Required Loading contract, dispatch
    reference-path selection assertions), or state that a dispatch version
    pin would be new coverage belonging to p02-t01 rather than an existing
    assertion.

### Minor

- **p04-t02 "corrects the reviewed design" note is stale** (`.oat/projects/shared/subagent-orchestration/plan.md:595`)
  - Issue: The note claims its provider-view wording "corrects the broader
    provider-view statement in the reviewed design," but `design.md` already
    carries the corrected wording ("Claude receives a generated skill link,
    while Cursor and Codex native-read canonical skills," `design.md:30-33`
    and the Distribution and Synchronization responsibilities). An
    implementer auditing plan-design alignment will look for a discrepancy
    that no longer exists.
  - Suggestion: Reword to "consistent with the reviewed design" or delete the
    sentence.
- **Reviews table carries a permanently unsatisfiable `spec` placeholder** (`.oat/projects/shared/subagent-orchestration/plan.md:664`)
  - Issue: The `| spec | artifact | pending |` row cannot ever be bound:
    `state.md` declares "Spec: N/A (quick mode)" and no task produces
    `spec.md`. Rows must not be deleted per review-table preservation, but an
    unbound `pending` row can mislead completion tooling or a human scanning
    for outstanding reviews.
  - Suggestion: Annotate the row status (e.g. `n/a (quick mode)`) or confirm
    completion routing ignores unbound `pending` placeholders.
- **p04-t02 could pre-empt confusion about the tracked `.cursor/skills` view** (`.oat/projects/shared/subagent-orchestration/plan.md:593`)
  - Issue: The expected sync output is correct — sync writes only the Claude
    skill link (`packages/cli/src/providers/cursor/paths.ts:11-14` treats
    `.agents/skills` as Cursor's native dir, with `.cursor/skills` only an
    adoption source; the sync manifest records no cursor/codex skill
    entries). However, the repo also carries a git-tracked convenience view
    `.cursor/skills/` (74 symlinks, updated by recent skill-adding commits,
    already missing `oat-wave-execute` and `oat-wave-program`). An
    implementer running `git status --short` in p04-t02 Step 3 may wonder
    whether `.cursor/skills/subagent-orchestration` must be added.
  - Suggestion: Add one sentence to p04-t02 noting the tracked
    `.cursor/skills` convenience view is outside sync scope and intentionally
    unchanged by this task.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md` (validated decisions/constraints),
`design.md` (component design, testing strategy), `plan.md`, `state.md`,
`implementation.md` (scaffold state), plus direct repository verification of
plan claims (file existence, scripts, test assertions, sync codec behavior,
`oat project validate-plan`).

### Requirements Coverage

| Requirement                                                         | Status      | Notes                                                                                               |
| ------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------- |
| Canonical guidance skill (5 task classes, axes, refresh)            | implemented | p01-t01 creates all six canonical files at 1.0.0                                                    |
| Opus-first Claude policy (discovery Q2/Key Decision 5)              | implemented | p01-t01 Step 1 names Opus-first, Fable exceptional, cyber-classifier reframing                      |
| Dispatch reduced to mechanics; safeguards preserved                 | partial     | p01-t02 covers Required Loading, safeguards, record schema; removal premise inaccurate (finding I1) |
| Consumer migration (reviewer, planning, implement, cloud, adapters) | implemented | p01-t03 covers all seven design-named consumers incl. `oat-repo-improve`                            |
| Ownership-boundary and compatibility validation                     | implemented | p01-t04 restores baseline; p02-t01 adds hardening incl. legacy/enriched/unknown-tier records        |
| Directional utility dependency (discovery Q6)                       | implemented | p03-t01 dispatch→guidance auto-include, guidance standalone, no reverse dependency                  |
| Documentation of the split                                          | implemented | p03-t02 five docs pages + generated index, correct generator command and flags                      |
| Lockstep five-package release + bundled version metadata            | implemented | p04-t01 registry-verified version selection; p04-t02 runs `release:validate`                        |
| Provider sync with no cursor/codex skill mirrors                    | implemented | p04-t02 matches actual sync codec behavior (Claude link only)                                       |
| One version bump per changed canonical skill (constraint)           | implemented | p01-t01/t02/t03 each state single version advance                                                   |
| Quick-mode readiness bookkeeping (`oat_template`, `oat_ready_for`)  | implemented | Draft-state frontmatter matches documented lifecycle contract (`skills.test.ts:3348-3366`)          |

### Extra Work (not in declared requirements)

None — all nine tasks map to design components or discovery decisions.
Dispatch Profile advisory: the plan has no `## Dispatch Profile` section,
which is normal and not flagged; no named-ceiling rows exist to evaluate.

## Verification Commands

Run these to verify the plan fixes:

```bash
# Structural validation still passes after edits
pnpm run --silent cli:source -- project validate-plan --project-path .oat/projects/shared/subagent-orchestration

# I1: confirm no named model matrices exist in current dispatch references
rg -n -i "opus|sonnet|haiku|fable|gpt-5|composer|luna|terra" .agents/skills/oat-dispatch-subagents/references/

# I1: stale self-references the reworded task should address
rg -n "dated model-family examples in this provider reference" .agents/skills/oat-dispatch-subagents/references/

# M1: confirm no 1.1.5 pin exists to update
rg -n "1\.1\.5" packages/cli/src/ .agents/ || echo "no pin found"

# m1: confirm design already carries the corrected provider-view wording
rg -n "native-read canonical" .oat/projects/shared/subagent-orchestration/design.md
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan
tasks.
