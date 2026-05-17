---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-05-13
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

**Goal:** Add runtime dispatch-selection guidance to OAT so phase implementation uses the lowest available model/effort that can confidently complete the task, review inherits the parent session controls unless explicitly overridden by the user, and every dispatch logs the selected control and rationale.

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

- Reviews, re-reviews, and review-fix evaluation should inherit the parent session controls unless the user explicitly requested a review override.
- In Codex, review dispatch should omit `model` and `reasoning_effort` overrides and record `dispatch_control: model=inherited, reasoning_effort=inherited`.
- Do not read `plan.md` Dispatch Profile rows to self-select a tier; the orchestrator owns dispatch control.

**Step 2: Verify**

```bash
grep -q "Confidence" .agents/agents/oat-phase-implementer.md
grep -q "reasoning" .agents/agents/oat-phase-implementer.md
grep -q "reasoning_effort=inherited" .agents/agents/oat-reviewer.md
grep -q "orchestrator owns dispatch control" .agents/agents/oat-reviewer.md
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

## Phase 4: Final review fixes

Addresses final review findings before PR readiness.

### Task p04-t01: (review) Add dispatch fields to scope templates

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`

**Step 1: Understand the issue**

Review finding: `dispatch_control` is documented as an agent input, but the orchestrator's Phase Scope and Review Scope packet templates omit `dispatch_control` and `dispatch_rationale`.
Location: `.agents/skills/oat-project-implement/SKILL.md:461`

**Step 2: Implement fix**

Add `dispatch_control:` and `dispatch_rationale:` to both the Phase Scope and Review Scope template blocks, with wording that they may be omitted when unknown. Keep the existing runtime-selection guidance authoritative.

**Step 3: Verify**

```bash
grep -q "dispatch_control" .agents/skills/oat-project-implement/SKILL.md
grep -q "dispatch_rationale" .agents/skills/oat-project-implement/SKILL.md
```

Expected: both commands exit 0.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md
git commit -m "fix(p04-t01): add dispatch fields to scope templates"
```

---

## Phase p-rev1: Revision 1

Source: inline dogfood feedback (2026-05-13)

### Task prev1-t01: (revision) Clarify implementation reasoning effort versus review inheritance

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `.agents/agents/oat-reviewer.md`
- Modify: `.codex/agents/oat-reviewer.toml` (generated sync output)
- Modify: `apps/oat-docs/docs/workflows/projects/implementation-execution.md`
- Modify: `.oat/projects/shared/subagent-model-selection/summary.md`

**Step 1: Tighten implementation dispatch guidance**

Clarify that when the host exposes dispatch controls, phase implementation dispatch should log the actual selected controls. In Codex, prefer `model=inherited` unless an override is justified, but choose and pass `reasoning_effort` per phase complexity when supported. Reserve `host-auto` for hosts that do not expose the relevant controls.

**Step 2: Tighten review dispatch guidance**

Clarify that review dispatches should inherit the parent session controls unless the user explicitly requests an override. In Codex, omit `model` and `reasoning_effort` overrides for reviewer subagents and log `model=inherited, reasoning_effort=inherited`.

**Step 3: Verify**

```bash
grep -q "reasoning_effort=inherited" .agents/skills/oat-project-implement/SKILL.md
grep -q "host-auto" .agents/skills/oat-project-implement/SKILL.md
grep -q "Review dispatches inherit" apps/oat-docs/docs/workflows/projects/implementation-execution.md
pnpm build:docs
```

Expected: all commands exit 0.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md apps/oat-docs/docs/workflows/projects/implementation-execution.md .oat/projects/shared/subagent-model-selection/summary.md
git commit -m "fix(prev1-t01): clarify review effort inheritance"
```

---

## Phase p-rev2: Revision 2

Source: inline Claude Code dogfood feedback (2026-05-13)

### Task prev2-t01: (revision) Split dispatch logging into model and effort axes

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `.agents/agents/oat-phase-implementer.md`
- Modify: `.agents/agents/oat-reviewer.md`
- Modify: `.codex/agents/oat-phase-implementer.toml` (generated sync output if changed)
- Modify: `.codex/agents/oat-reviewer.toml` (generated sync output if changed)
- Modify: `apps/oat-docs/docs/workflows/projects/implementation-execution.md`
- Modify: `.oat/projects/shared/subagent-model-selection/summary.md`

**Step 1: Replace single-axis dispatch labels**

Define model and effort as separate dispatch axes. Each axis should log one of: `selected:<value>`, `inherited`, `not-applicable`, or `host-auto`. Reserve `host-auto` for the exceptional case where the host owns an axis and the orchestrator cannot read or pin it; do not use it for deliberate inheritance.

**Step 2: Add provider-specific examples**

Clarify:

- Claude Code exposes a model axis for subagents and does not expose a separate `reasoning_effort` axis; implementation dispatch should choose the lowest sufficient model when available and log effort as `not-applicable`.
- Codex exposes a `reasoning_effort` axis and normally inherits the session model; implementation dispatch should choose/pass the lowest sufficient effort when supported.
- Reviewer dispatch inherits both axes by default unless the user explicitly requests an override.

**Step 3: Verify**

```bash
grep -q "model_axis" .agents/skills/oat-project-implement/SKILL.md
grep -q "effort_axis" .agents/skills/oat-project-implement/SKILL.md
grep -q "not-applicable" .agents/skills/oat-project-implement/SKILL.md
grep -q "model_axis=inherited, effort_axis=inherited" .agents/skills/oat-project-implement/SKILL.md
grep -q "model axis" apps/oat-docs/docs/workflows/projects/implementation-execution.md
pnpm build:docs
```

Expected: all commands exit 0.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md .agents/agents/oat-phase-implementer.md .agents/agents/oat-reviewer.md .codex/agents/oat-phase-implementer.toml .codex/agents/oat-reviewer.toml apps/oat-docs/docs/workflows/projects/implementation-execution.md .oat/projects/shared/subagent-model-selection/summary.md
git commit -m "fix(prev2-t01): split dispatch model and effort axes"
```

---

## Phase p-rev3: Revision 3

Source: inline follow-up review feedback (2026-05-13)

### Task prev3-t01: (revision) Wire selected model axis to host dispatch calls and document design drift

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `.agents/agents/oat-phase-implementer.md`
- Modify: `.codex/agents/oat-phase-implementer.toml` (generated sync output)
- Modify: `.oat/projects/shared/subagent-model-selection/design.md`
- Modify: `.oat/projects/shared/subagent-model-selection/summary.md`

**Step 1: Tie selected axes to host dispatch calls**

Clarify that the dispatch log and actual host invocation must agree:

- Claude Code implementation dispatch with `model_axis=selected:<value>` must pass `model: "<value>"` on the Task tool call.
- Claude Code implementation dispatch with `model_axis=inherited` must omit the Task tool `model` parameter.
- Codex implementation dispatch with `effort_axis=selected:<value>` must pass `reasoning_effort: "<value>"` on `spawn_agent`.
- Review dispatch on either host inherits both axes and omits reviewer model/effort overrides by default.

**Step 2: Fix phase implementer framing**

Replace the misleading implementer prompt instruction that appears to ask the dispatched implementer to pass its own model parameter. The model/effort axis fields are descriptive context for the implementer report; dispatch responsibility belongs to the orchestrator.

**Step 3: Document design revision 2**

Add a design audit-trail subsection explaining that single-axis `dispatch_control` sections are superseded by the two-axis model/effort contract, and point readers to `oat-project-implement` as the canonical current reference.

**Step 4: Verify**

```bash
grep -q "never log a \`selected:<value>\` axis without passing" .agents/skills/oat-project-implement/SKILL.md
grep -q "model_axis=selected:<value>" .agents/skills/oat-project-implement/SKILL.md
grep -q "descriptive context for your report" .agents/agents/oat-phase-implementer.md
grep -q "Revision 2: Two-axis dispatch logging" .oat/projects/shared/subagent-model-selection/design.md
pnpm run cli -- sync --scope project --dry-run
pnpm run cli -- internal validate-skill-version-bumps --base-ref origin/main
pnpm release:validate
pnpm build:docs
```

Expected: all commands exit 0.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md .agents/agents/oat-phase-implementer.md .codex/agents/oat-phase-implementer.toml .oat/projects/shared/subagent-model-selection/design.md .oat/projects/shared/subagent-model-selection/summary.md
git commit -m "fix(prev3-t01): wire selected model axis to dispatch call"
```

---

## Phase p-rev4: Revision 4

Source: live Codex dogfood feedback (2026-05-14)

### Task prev4-t01: (revision) Add Codex spawn-agent pre-dispatch parameter assertion

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `.oat/projects/shared/subagent-model-selection/summary.md`

**Step 1: Tighten Codex selected-effort execution**

Add a Codex-specific pre-dispatch assertion near the Tier 1 phase dispatch instructions:

- If `effort_axis=selected:<value>` for implementation dispatch, the `spawn_agent` call must include `reasoning_effort: "<value>"`.
- If the spawned Codex status reports a different effort than the selected value, treat it as an orchestration deviation: stop, record it in `implementation.md`, and redispatch with corrected parameters before continuing.
- Do not rely on the Phase Scope packet alone to apply selected effort; the selected effort must be a top-level `spawn_agent` argument.

**Step 2: Verify**

```bash
grep -q "pre-dispatch assertion" .agents/skills/oat-project-implement/SKILL.md
grep -q "reasoning_effort: \"<value>\"" .agents/skills/oat-project-implement/SKILL.md
grep -q "top-level `spawn_agent` argument" .agents/skills/oat-project-implement/SKILL.md
pnpm run cli -- internal validate-skill-version-bumps --base-ref origin/main
pnpm release:validate
pnpm build:docs
```

Expected: all commands exit 0.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md .oat/projects/shared/subagent-model-selection/summary.md
git commit -m "fix(prev4-t01): assert Codex selected effort before dispatch"
```

---

## Phase p-rev5: Revision 5

Source: repeated live Codex dogfood feedback (2026-05-16)

### Task prev5-t01: (revision) Make Codex selected-effort dispatch payload-first

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `.oat/projects/shared/subagent-model-selection/summary.md`

**Step 1: Tighten Codex selected-effort execution again**

Revise the dispatch instructions so selected effort cannot be represented only in human-readable text:

- Require the orchestrator to build the actual `spawn_agent` argument map before printing the dispatch log.
- Require `effort_axis=selected:<value>` to be derived from a top-level `reasoning_effort: "<value>"` entry in that argument map.
- State that a selected axis that exists only in the Phase Scope packet is invalid.
- State that if the orchestrator cannot or will not pass the host-tool parameter, the axis must be logged as `inherited`, `not-applicable`, or `host-auto` instead of `selected:<value>`.
- Include a concrete Codex payload shape showing `agent_type`, top-level `reasoning_effort`, and matching Phase Scope text.
- Promote the existing mismatch rule into a post-spawn verification gate: compare the returned Codex status line before waiting on the agent, stop on mismatch, record the orchestration deviation, and redispatch.

**Step 2: Verify**

```bash
grep -q "Payload-first dispatch invariant" .agents/skills/oat-project-implement/SKILL.md
grep -q "Build the `spawn_agent` argument map before logging" .agents/skills/oat-project-implement/SKILL.md
grep -q "reasoning_effort: \"low\"" .agents/skills/oat-project-implement/SKILL.md
grep -q "Post-spawn verification gate" .agents/skills/oat-project-implement/SKILL.md
pnpm run cli -- internal validate-skill-version-bumps --base-ref origin/main
pnpm release:validate
pnpm build:docs
```

Expected: all commands exit 0.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md .oat/projects/shared/subagent-model-selection/summary.md
git commit -m "fix(prev5-t01): make Codex effort dispatch payload-first"
```

---

## Phase p-rev6: Revision 6

Source: inline Codex dogfood feedback (2026-05-16)

### Task prev6-t01: (revision) Use Codex effort-specific implementer variants

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `.codex/config.toml`
- Add: `.codex/agents/oat-phase-implementer-low.toml`
- Add: `.codex/agents/oat-phase-implementer-medium.toml`
- Add: `.codex/agents/oat-phase-implementer-high.toml`
- Modify: `packages/cli/src/providers/codex/codec/sync-extension.ts`
- Modify: `packages/cli/src/providers/codex/codec/sync-extension.test.ts`
- Modify: `apps/oat-docs/docs/workflows/projects/implementation-execution.md`
- Modify: `.oat/projects/shared/subagent-model-selection/summary.md`

**Step 1: Replace per-call effort override as the standard Codex path**

Revise the Codex selected-effort dispatch contract:

- Keep base `oat-phase-implementer` as the inherited-effort role.
- Add configured Codex role variants for `low`, `medium`, and `high`, each setting `model_reasoning_effort`.
- Map `effort_axis=selected:low|medium|high` to `agent_type=oat-phase-implementer-low|medium|high`.
- Do not use top-level `reasoning_effort` as the standard selected-effort mechanism because dogfooding showed it can be inconsistent.
- Treat `xhigh` as inherited-only: use it only when the parent/orchestrator session is already xhigh; otherwise stop for user re-invocation, split the phase, or choose the strongest configured variant (`high`) when sufficient.
- Keep the post-spawn verification gate: selected-effort variant must match the returned spawn status before waiting on the agent.
- Generate the effort variants through the Codex sync extension so they are managed provider views rather than unmanaged `.codex/agents` files.

**Step 2: Verify**

```bash
grep -q "oat-phase-implementer-low" .agents/skills/oat-project-implement/SKILL.md
grep -q "model_reasoning_effort = \"low\"" .codex/agents/oat-phase-implementer-low.toml
grep -q "model_reasoning_effort = \"medium\"" .codex/agents/oat-phase-implementer-medium.toml
grep -q "model_reasoning_effort = \"high\"" .codex/agents/oat-phase-implementer-high.toml
grep -q "oat-phase-implementer-low" .codex/config.toml
pnpm exec vitest run packages/cli/src/providers/codex/codec/sync-extension.test.ts
pnpm run cli -- sync --scope project --dry-run
pnpm run cli -- internal validate-skill-version-bumps --base-ref origin/main
pnpm release:validate
pnpm build:docs
```

Expected: all commands exit 0.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md .codex/config.toml .codex/agents/oat-phase-implementer-low.toml .codex/agents/oat-phase-implementer-medium.toml .codex/agents/oat-phase-implementer-high.toml packages/cli/src/providers/codex/codec/sync-extension.ts packages/cli/src/providers/codex/codec/sync-extension.test.ts apps/oat-docs/docs/workflows/projects/implementation-execution.md .oat/projects/shared/subagent-model-selection/summary.md
git commit -m "fix(prev6-t01): use Codex effort-specific implementer roles"
```

---

## Reviews

| Scope  | Type     | Status | Date       | Artifact                                              |
| ------ | -------- | ------ | ---------- | ----------------------------------------------------- |
| p01    | code     | passed | 2026-05-13 | reviews/archived/p01-review-2026-05-13-v2.md          |
| p02    | code     | passed | 2026-05-13 | reviews/archived/p02-review-2026-05-13.md             |
| p03    | code     | passed | 2026-05-13 | reviews/archived/p03-review-2026-05-13-v2.md          |
| p04    | code     | passed | 2026-05-13 | reviews/archived/p04-review-2026-05-13.md             |
| final  | code     | passed | 2026-05-13 | reviews/archived/final-review-2026-05-13-v4.md        |
| design | artifact | passed | 2026-05-12 | reviews/archived/artifact-design-review-2026-05-12.md |
| plan   | artifact | passed | 2026-05-12 | reviews/archived/artifact-plan-review-2026-05-12.md   |

**Status values:** `pending` -> `received` -> `fixes_added` -> `fixes_completed` -> `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 3 tasks - Override-only plan syntax and authoring/import guidance
- Phase 2: 2 tasks - Runtime dispatch selection and escalation in `oat-project-implement`
- Phase 3: 2 tasks - Agent reporting, reviewer tiering, and plan-review advisory
- Phase 4: 1 task - Final review fix for dispatch scope template consistency
- Phase p-rev1: 1 task - Dogfood revision clarifying implementation effort selection vs review inheritance
- Phase p-rev2: 1 task - Dogfood revision splitting dispatch logging into model and effort axes
- Phase p-rev3: 1 task - Follow-up review fix for selected-axis dispatch wiring and design audit trail
- Phase p-rev4: 1 task - Live dogfood fix for Codex selected-effort spawn-agent assertion
- Phase p-rev5: 1 task - Repeated dogfood fix requiring Codex selected-effort dispatch to be payload-first
- Phase p-rev6: 1 task - Codex selected effort now maps to configured low/medium/high implementer variants

**Total: 14 tasks across 10 phases.**

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
