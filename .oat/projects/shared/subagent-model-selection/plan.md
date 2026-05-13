---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-05-12
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p03']
oat_auto_review_at_hill_checkpoints: true
oat_plan_parallel_groups: []
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: subagent-model-selection

> Execute this plan using `oat-project-implement` — sequential, no parallelism declared.

**Goal:** Add runtime dispatch-selection guidance to OAT so phase implementation uses the lowest available model/effort that can confidently complete the task, review uses the strongest available tier, and every dispatch logs the selected control and rationale.

**Architecture:** Prompt/skill/template guidance only. `plan.md` supports optional user-authored Dispatch Profile overrides, but this plan intentionally has no Dispatch Profile rows because runtime selection is the default. The orchestrator chooses/logs dispatch controls at runtime and escalates based on confidence or review outcomes.

**Tech Stack:** Skill prompts (Markdown), agent prompts (Markdown), plan template (Markdown). Verification is by file inspection plus scenario walkthroughs against fixture plans.

**Commit Convention:** `{type}(p{NN}-t{NN}): {description}` — e.g., `feat(p01-t01): document override-only Dispatch Profile syntax`

## Planning Checklist

- [x] HiLL checkpoints confirmed from `workflow.hillCheckpointDefault` (final phase only)
- [x] `oat_plan_hill_phases` set in frontmatter (`["p03"]` = final phase only)
- [x] Auto-review at HiLL checkpoints enabled from `workflow.autoReviewAtHillCheckpoints`
- [x] Parallelism evaluated (see Parallelism section)
- [x] `oat_plan_parallel_groups` set in frontmatter
- [x] Dispatch Profile omitted intentionally; runtime selection is the default

---

## Parallelism

Sequential, no parallel groups declared.

**Dependency / write-set analysis:**

- p01 edits the plan/template/import authoring surfaces that define override syntax. p02 depends on that terminology.
- p02 edits `oat-project-implement` and defines runtime selection/escalation behavior. p03 agent/review guidance references that orchestrator behavior.
- p03 edits three mostly independent prompt files, but keeping it sequential makes the final review easier and avoids unnecessary worktree overhead for short prompt edits.

---

## Phase 1: Override-only plan syntax and authoring guidance

Documents the optional Dispatch Profile as a user-authored override surface and removes generated recommendation behavior from planning.

### Task p01-t01: Update plan template with override-only Dispatch Profile guidance

**Files:**

- Modify: `.oat/templates/plan.md`

**Step 1: Edit**

Update the optional Dispatch Profile section in the plan template:

- Describe it as user-authored constraints/preferences only.
- State that the section should be omitted when runtime selection should choose the tier.
- Keep columns: `Phase`, `Claude model`, `Codex effort`, `Rationale`.
- State that blank/`auto` means no explicit constraint for that provider.
- Avoid language that suggests the planner should generate rows by default.

**Step 2: Verify**

```bash
grep -q "override" .oat/templates/plan.md
grep -q "runtime selection" .oat/templates/plan.md
```

Expected: both commands exit 0.

**Step 3: Commit**

```bash
git add .oat/templates/plan.md
git commit -m "feat(p01-t01): document override-only Dispatch Profile syntax"
```

---

### Task p01-t02: Update plan-writing skill for runtime-selection defaults

**Files:**

- Modify: `.agents/skills/oat-project-plan-writing/SKILL.md`

**Step 1: Edit**

Add/update Dispatch Profile guidance:

- The planner omits `## Dispatch Profile` by default.
- The section is only for explicit user constraints/preferences.
- Remove any per-phase proposal step or generated recommendation behavior.
- Warn that routine hand-tuning can be worse than runtime selection.
- Keep validation rules for explicit rows:
  - Phase IDs match real `pNN` phases.
  - Claude model cell: `haiku`, `sonnet`, `opus`, `auto`, or blank.
  - Codex effort cell: `low`, `medium`, `high`, `xhigh`, `auto`, or blank.
  - Rationale is recommended.

**Step 2: Verify**

```bash
grep -q "override" .agents/skills/oat-project-plan-writing/SKILL.md
grep -q "runtime selection" .agents/skills/oat-project-plan-writing/SKILL.md
```

Expected: both commands exit 0. Also bump the skill frontmatter `version:` per AGENTS.md guidance.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-plan-writing/SKILL.md
git commit -m "feat(p01-t02): make Dispatch Profile override-only"
```

---

### Task p01-t03: Update import-plan handling for explicit dispatch hints

**Files:**

- Modify: `.agents/skills/oat-project-import-plan/SKILL.md`

**Step 1: Edit**

Add/update Dispatch Profile import handling:

- Preserve recognizable OAT-format `## Dispatch Profile` rows as user-authored constraints/preferences.
- Treat foreign model/effort hints as constraints only when the source clearly presents them that way.
- Otherwise preserve the hint as rationale/context and let runtime selection decide.
- Do not generate recommendation rows during import.

**Step 2: Verify**

```bash
grep -q "Dispatch Profile" .agents/skills/oat-project-import-plan/SKILL.md
grep -q "runtime selection" .agents/skills/oat-project-import-plan/SKILL.md
```

Expected: both commands exit 0. Also bump the skill frontmatter `version:` per AGENTS.md guidance.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-import-plan/SKILL.md
git commit -m "feat(p01-t03): preserve dispatch overrides during import"
```

---

## Phase 2: Runtime dispatch selection and escalation

Adds the runtime policy to `oat-project-implement`: choose the lowest confident tier, log the rationale, use host-auto when controls are unavailable, and escalate based on evidence.

### Task p02-t01: Add runtime dispatch-selection policy to `oat-project-implement`

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`

**Step 1: Edit**

Add a "Runtime dispatch selection" section:

- Inputs: phase ID, phase scope, optional Dispatch Profile row, host-exposed provider controls, prior outcomes.
- Selection rule:
  - valid override row + host can honor it -> use requested control
  - no override -> choose lowest available tier/model/effort that can confidently complete the phase
  - host does not expose explicit controls -> use `host-auto` and log rationale
  - low confidence -> choose stronger available tier rather than knowingly underpower
- Dispatch log format examples:
  - `Dispatching p01 with low/haiku: template edits are mechanical and file-local.`
  - `Dispatching p02 with host-auto: Codex host does not expose per-dispatch effort; rationale maps to standard effort.`

**Step 2: Verify**

```bash
grep -q "Runtime dispatch selection" .agents/skills/oat-project-implement/SKILL.md
grep -q "host-auto" .agents/skills/oat-project-implement/SKILL.md
```

Expected: both commands exit 0.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md
git commit -m "feat(p02-t01): add runtime dispatch selection policy"
```

---

### Task p02-t02: Add confidence-based escalation and dispatch history notes

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`

**Step 1: Edit**

Add/update escalation guidance:

- Escalate when the implementer reports low confidence, reports reasoning/capability blockage, or a phase fails substantive review twice.
- Re-dispatch at the next stronger available control when available.
- Count escalation redispatches against the existing bounded retry budget.
- If already at strongest available control, provide context, split the phase, revise the plan, or stop for user direction.
- Record compact dispatch notes in `implementation.md` when practical.

**Step 2: Verify**

```bash
grep -q "low confidence" .agents/skills/oat-project-implement/SKILL.md
grep -q "Dispatch:" .agents/skills/oat-project-implement/SKILL.md
```

Expected: both commands exit 0. Also bump the skill frontmatter `version:` per AGENTS.md guidance.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md
git commit -m "feat(p02-t02): add confidence-based dispatch escalation"
```

---

## Phase 3: Agent dispatch guidance and plan-review advisory

Aligns dispatched agents and review checks with the runtime-selection model.

### Task p03-t01: Update phase implementer and reviewer dispatch guidance

**Files:**

- Modify: `.agents/agents/oat-phase-implementer.md`
- Modify: `.agents/agents/oat-reviewer.md`

**Step 1: Edit**

Update the phase implementer prompt:

- Include confidence (`high`, `medium`, `low`) in implementation and fix reports.
- If blocked because more reasoning/capability is needed, say that explicitly.
- Include the current dispatch control if it was provided by the orchestrator.
- Do not keep retrying at the same capability when the issue is reasoning capacity rather than missing context.

Update reviewer guidance:

- Reviews, re-reviews, and review-fix evaluation should run at the strongest available tier/control unless explicitly constrained.
- If the host uses `host-auto`, the reviewer should still receive the rationale that review is judgment-heavy.
- Do not read `plan.md` Dispatch Profile rows to self-select a tier; the orchestrator owns dispatch control.

**Step 2: Verify**

```bash
grep -q "Confidence" .agents/agents/oat-phase-implementer.md
grep -q "reasoning" .agents/agents/oat-phase-implementer.md
grep -q "strongest available" .agents/agents/oat-reviewer.md
grep -q "host-auto" .agents/agents/oat-reviewer.md
```

Expected: both commands exit 0.

**Step 3: Commit**

```bash
git add .agents/agents/oat-phase-implementer.md .agents/agents/oat-reviewer.md
git commit -m "feat(p03-t01): align phase agents with runtime dispatch policy"
```

---

### Task p03-t02: Add override-row advisory to `oat-project-review-provide`

**Files:**

- Modify: `.agents/skills/oat-project-review-provide/SKILL.md`

**Step 1: Edit**

Add a "Dispatch Profile override advisory" to artifact plan review:

- Missing Dispatch Profile section is normal and should not be flagged.
- Important:
  - invalid phase ID
  - unknown active-provider tier
  - low-tier override for multi-file integration, architecture, or review-heavy work
  - low-tier override with missing/generic rationale
- Medium:
  - malformed but recoverable table structure
  - mid-tier override for architecture-heavy work without convincing rationale
- Minor:
  - rationale present but weakly tied to phase scope

**Step 2: Verify**

```bash
grep -q "Dispatch Profile override advisory" .agents/skills/oat-project-review-provide/SKILL.md
grep -q "invalid phase" .agents/skills/oat-project-review-provide/SKILL.md
```

Expected: both commands exit 0. Also bump the skill frontmatter `version:` per AGENTS.md guidance.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-review-provide/SKILL.md
git commit -m "feat(p03-t02): add Dispatch Profile override review advisory"
```

---

## Reviews

| Scope  | Type     | Status   | Date       | Artifact                                              |
| ------ | -------- | -------- | ---------- | ----------------------------------------------------- |
| p01    | code     | passed   | 2026-05-13 | reviews/p01-review-2026-05-13-v2.md                   |
| p02    | code     | passed   | 2026-05-13 | reviews/p02-review-2026-05-13.md                      |
| p03    | code     | passed   | 2026-05-13 | reviews/p03-review-2026-05-13-v2.md                   |
| final  | code     | received | 2026-05-13 | reviews/final-review-2026-05-13-v2.md                 |
| design | artifact | passed   | 2026-05-12 | reviews/archived/artifact-design-review-2026-05-12.md |
| plan   | artifact | passed   | 2026-05-12 | reviews/archived/artifact-plan-review-2026-05-12.md   |

**Status values:** `pending` -> `received` -> `fixes_added` -> `fixes_completed` -> `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 3 tasks - Override-only plan syntax and authoring/import guidance
- Phase 2: 2 tasks - Runtime dispatch selection and escalation in `oat-project-implement`
- Phase 3: 2 tasks - Agent reporting, reviewer tiering, and plan-review advisory

**Total: 7 tasks across 3 phases.**

Follow-up items to file at project completion:

- Backlog item: `minimum_dispatch_tier` (plan-level floor, deferred from this project).
- Optional future: hard-vs-soft Dispatch Profile constraint syntax.
- Optional future: persistent dispatch decision history if live logs are insufficient.

Ready for implementation.

---

## References

- Design: `design.md`
- Discovery: `discovery.md`
- Plan template: `.oat/templates/plan.md`
- Canonical plan-writing skill: `.agents/skills/oat-project-plan-writing/`
- Entry skills: `.agents/skills/oat-project-plan/`, `.agents/skills/oat-project-quick-start/`, `.agents/skills/oat-project-import-plan/`
- Implementation orchestrator: `.agents/skills/oat-project-implement/`
- Phase implementer agent: `.agents/agents/oat-phase-implementer.md`
- Reviewer agent: `.agents/agents/oat-reviewer.md`
- Plan-review skill: `.agents/skills/oat-project-review-provide/`
- Superpowers reference: `/Users/thomas.stang/Code/vox/open-agent-toolkit/.oat/projects/archived/collaborative-design-workflow/reference/superpowers-subagent-driven-development.md`
- Backlog item: `.oat/repo/reference/backlog/items/phase-subagent-reasoning-budget-guidance.md` (bl-0738)
