---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-05-12
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: []
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

**Goal:** Add an optional, plan-authored Dispatch Profile to OAT so users can review and approve per-phase model/effort choices before dispatch, with silent escalation within their invocation cap and explicit gates only when escalation would cross the cap.

**Architecture:** Prompt/skill/template guidance only. The profile lives in `plan.md`, a resolver in `oat-project-implement` reads it at runtime, and `oat-phase-implementer` / `oat-reviewer` receive resolved tier parameters per dispatch. No new components, no library code.

**Tech Stack:** Skill prompts (Markdown), agent prompts (Markdown), plan template (Markdown). Verification is by file inspection + scenario walkthrough against fixture plans.

**Commit Convention:** `{type}(p{NN}-t{NN}): {description}` — e.g., `feat(p01-t01): add Dispatch Profile section to plan template`

## Planning Checklist

- [x] HiLL checkpoints confirmed with user (default = pause every phase, quick mode)
- [x] `oat_plan_hill_phases` set in frontmatter (empty = every phase)
- [x] Parallelism evaluated (see Parallelism section)
- [x] `oat_plan_parallel_groups` set in frontmatter

---

## Dispatch Profile

| Phase | Claude model | Codex effort | Rationale                                                                                                                                                                        |
| ----- | ------------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| p03   | opus         | xhigh        | encodes resolver, preflight gate, approval state, and escalation logic in `oat-project-implement` prompts — cross-cutting orchestrator behavior that downstream phases depend on |

Other phases run on `auto`. Decision-rule justification: p01/p02/p04 are skill-text additions following existing structural conventions; complexity is medium and well-bounded. p03 introduces new resolution logic and a multi-trigger escalation flow into the orchestrator skill — it's the architectural backbone of the feature and warrants top-tier dispatch.

---

## Parallelism

Sequential, no parallel groups declared.

**Dependency / write-set analysis:**

- p01 and p02 both edit `.agents/skills/oat-project-plan-writing/SKILL.md` → must run sequentially (shared file).
- p03 depends on p01 (resolver needs the format spec) and edits `.agents/skills/oat-project-implement/SKILL.md` → after p01/p02.
- p04 tasks touch four different files (`oat-phase-implementer`, `oat-reviewer`, `oat-project-import-plan`, `oat-project-review-provide`). They depend on p03 (subagent dispatch rules reference resolver outputs; import preservation references the proposal contract from p02; review advisory references the format from p01).

**Why not parallelize p04 tasks across worktrees:**
The four p04 tasks are genuinely file-disjoint and could run in separate worktrees. Keeping them sequential because (a) the project is small (4 short tasks), (b) each task is a short prompt edit that's easier to validate against the cumulative state of the previous task, and (c) HiLL pause-per-phase is the quick-mode default — splitting p04 into a parallel group adds worktree-orchestration overhead with marginal time savings.

---

## Phase 1: Dispatch Profile format spec + plan template

Adds the format definition for the Dispatch Profile table and surfaces it in the plan template so users discover the feature when authoring plans.

### Task p01-t01: Update plan template with Dispatch Profile section

**Files:**

- Modify: `.oat/templates/plan.md`

**Step 1: Edit**

Add a new optional section to the plan template, positioned after `## Planning Checklist` and before `## Phase 1`:

```markdown
## Dispatch Profile

_Optional. Pin per-phase model/effort targets for phases that should run at a non-default tier. Phases not listed run on `auto` (provider/runtime picks)._

| Phase | Claude model              | Codex effort                   | Rationale                      |
| ----- | ------------------------- | ------------------------------ | ------------------------------ |
| pNN   | haiku\|sonnet\|opus\|auto | low\|medium\|high\|xhigh\|auto | why this tier suits this phase |

**Cell rules:**

- Blank or `auto` = defer to provider/runtime.
- A phase not in the table = `auto` for both providers.
- Rationale is optional but recommended. If you can't explain why, the row probably shouldn't exist.

Omit this section entirely when no phases need a non-default tier.
```

**Step 2: Verify**

```bash
grep -q "## Dispatch Profile" .oat/templates/plan.md && grep -q "Blank or \`auto\`" .oat/templates/plan.md
```

Expected: exits 0 (both grep patterns found).

**Step 3: Commit**

```bash
git add .oat/templates/plan.md
git commit -m "feat(p01-t01): add Dispatch Profile section to plan template"
```

---

### Task p01-t02: Add Dispatch Profile format spec to plan-writing skill

**Files:**

- Modify: `.agents/skills/oat-project-plan-writing/SKILL.md`

**Step 1: Edit**

Add a new section to the skill (positioned with the other canonical-format sections) documenting the Dispatch Profile format:

1. **Format definition** — same table structure as the template.
2. **Validation rules:**
   - Phase IDs match `pNN` format used elsewhere in the plan.
   - Claude model cell: one of `haiku`, `sonnet`, `opus`, `auto`, or blank.
   - Codex effort cell: one of `low`, `medium`, `high`, `xhigh`, `auto`, or blank.
   - Rationale: free text, optional.
3. **Per-provider tier ordering** (for resolver comparison): `haiku < sonnet < opus`; `low < medium < high < xhigh`. Cite this so downstream skills can refer to it.
4. **"No row = auto"** principle — phases not in the table run on `auto`.
5. **Section omission** — when no rows are warranted (all phases on auto), the section header is omitted entirely.

Reference `design.md` §3.1 for the canonical wording; skill text should be a tightened version, not a copy.

**Step 2: Verify**

```bash
grep -q "Dispatch Profile" .agents/skills/oat-project-plan-writing/SKILL.md && grep -q "haiku < sonnet < opus" .agents/skills/oat-project-plan-writing/SKILL.md
```

Expected: exits 0. Also bump skill `version:` in frontmatter per AGENTS.md guidance.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-plan-writing/SKILL.md
git commit -m "feat(p01-t02): add Dispatch Profile format spec to plan-writing skill"
```

---

## Phase 2: Per-phase proposal step in plan-writing skill

Adds the proposal behavior — analyze each phase as it's authored and emit a Dispatch Profile row only when analysis clearly suggests a non-default tier.

### Task p02-t01: Add tier heuristic decision rule to plan-writing skill

**Files:**

- Modify: `.agents/skills/oat-project-plan-writing/SKILL.md`

**Step 1: Edit**

Add a "Tier heuristic" subsection inside the Dispatch Profile section. Content per `design.md` §3.6:

- **Mechanical (1–2 files, scaffolding, clear spec)** → propose row at `haiku` / `low` with rationale grounded in scope signals.
- **Integration / debugging / pattern-matching (multi-file, judgment but not architectural)** → no row, stays `auto`.
- **Architectural (cross-cutting refactor, design judgment, broad codebase touch)** → propose row at `opus` / `xhigh` with rationale grounded in scope/risk signals.
- **Uncertain — can't write a defensible rationale** → no row.

State the underlying rule explicitly: "`auto` means the analysis didn't find a strong reason to deviate from defaults. The bar for proposing a row is being able to write a defensible rationale."

**Step 2: Verify**

```bash
grep -q "Tier heuristic" .agents/skills/oat-project-plan-writing/SKILL.md && grep -q "Architectural" .agents/skills/oat-project-plan-writing/SKILL.md
```

Expected: exits 0.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-plan-writing/SKILL.md
git commit -m "feat(p02-t01): add tier heuristic to plan-writing skill"
```

---

### Task p02-t02: Add per-phase proposal step and reusable contract

**Files:**

- Modify: `.agents/skills/oat-project-plan-writing/SKILL.md`

**Step 1: Edit**

Add a "Per-phase proposal step" subsection describing the workflow:

1. After authoring each phase's content (tasks, verification, commits), analyze the phase against the tier heuristic.
2. If the analysis produces a defensible deviation from typical, append a row to the running `## Dispatch Profile` table.
3. Typical phases get no row.
4. After all phases authored, omit the section entirely if no rows were emitted.

Add a "Proposal contract" subsection so other skills can reuse the unit:

- **Input:** phase content + optional pre-baked rationale signals (used by import-plan).
- **Output:** `{ claude_model, codex_effort, rationale }` or `null`.

**Step 2: Verify**

```bash
grep -q "Per-phase proposal step" .agents/skills/oat-project-plan-writing/SKILL.md && grep -q "Proposal contract" .agents/skills/oat-project-plan-writing/SKILL.md
```

Expected: exits 0. Bump skill `version:` per AGENTS.md.

**Step 3: Verify by sanity walkthrough**

Mentally walk through authoring this very plan with the heuristic applied:

- p01, p02, p04 phases → typical → no rows.
- p03 → architectural → row with opus/xhigh.
  Expected outcome matches the Dispatch Profile at the top of this plan.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-plan-writing/SKILL.md
git commit -m "feat(p02-t02): add per-phase proposal step + contract"
```

---

## Phase 3: Resolver, preflight gate, approval state, and tier escalation in `oat-project-implement`

Adds the runtime behavior. This is the architectural core — orchestrator reads the profile, resolves tiers per phase, runs preflight, holds approvals, and handles escalation. Dispatched at `opus`/`xhigh` per the Dispatch Profile.

### Task p03-t01: Add resolver to `oat-project-implement`

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`

**Step 1: Edit**

Add a "Dispatch tier resolver" section to the skill, codifying the procedure from `design.md` §3.2:

- **Inputs:** `phase_id`, `invocation = {provider, tier}`, parsed profile from `plan.md`, session-local approvals map.
- **Outputs:** `{ dispatch_tier, review_tier }`.
- **Logic:** the four-case resolution from design (auto / below-cap / above-cap-with-approval / above-cap-needs-approval).
- **Notes:** per-provider tier ordering referenced from `oat-project-plan-writing`; resolver is a documented procedure, not code.

**Step 2: Verify**

```bash
grep -q "Dispatch tier resolver" .agents/skills/oat-project-implement/SKILL.md && grep -q "needs_approval" .agents/skills/oat-project-implement/SKILL.md
```

Expected: exits 0.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md
git commit -m "feat(p03-t01): add dispatch-tier resolver to oat-project-implement"
```

---

### Task p03-t02: Add preflight scan and batched approval gate

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`

**Step 1: Edit**

Add a "Preflight scan" section codifying `design.md` §3.3:

- **Trigger:** once at run start, before phase 1 dispatches. Re-fires on resume for still-pending flagged phases.
- **UX:** the four-option batched gate from design (downgrade-flagged, abort, approve-specific, approve-all), with `(1)` and `(2)` listed first per Codex's long-plan guardrail. Include the "Phases on auto: …" footer.
- **Behavior on each option:**
  - Downgrade → replace target with invocation tier for the run.
  - Abort → exit cleanly.
  - Approve specific / all → record session-local approval(s).

**Step 2: Verify**

```bash
grep -q "Preflight scan" .agents/skills/oat-project-implement/SKILL.md && grep -q "Phases on auto" .agents/skills/oat-project-implement/SKILL.md
```

Expected: exits 0.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md
git commit -m "feat(p03-t02): add preflight scan and approval gate"
```

---

### Task p03-t03: Add session-local approval state

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`

**Step 1: Edit**

Add an "Approval state" subsection codifying `design.md` §3.4:

- Session-local in first pass; held in orchestrator memory; cleared at run end.
- Forward-compatible schema documented (do not write to `implementation.md` in first pass).
- Resume re-prompts; prior session approvals not assumed valid.

**Step 2: Verify**

```bash
grep -q "Approval state" .agents/skills/oat-project-implement/SKILL.md && grep -q "session-local" .agents/skills/oat-project-implement/SKILL.md
```

Expected: exits 0.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md
git commit -m "feat(p03-t03): add session-local approval state"
```

---

### Task p03-t04: Add unified tier-escalation flow

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`

**Step 1: Edit**

Add a "Tier escalation" section codifying `design.md` §3.3a:

- **Two triggers:** implementer-initiated (BLOCKED with reasoning), orchestrator-detected (N=2 consecutive review-cycle failures on the same phase).
- **Resolution:** compute next tier up; if ≤ resolved phase ceiling → escalate silently with log entry; if > ceiling → fire preflight-style gate; if at top-of-scale → non-escalation response (context/stop/split/plan-wrong).
- **Retry-budget interaction:** escalations count against `oat_orchestration_retry_limit` as redispatches.
- **Log entry format example:** `Phase 3 escalated to sonnet after 2 review-cycle failures`.

**Step 2: Verify**

```bash
grep -q "Tier escalation" .agents/skills/oat-project-implement/SKILL.md && grep -q "review-cycle failures" .agents/skills/oat-project-implement/SKILL.md
```

Expected: exits 0. Bump skill `version:` per AGENTS.md.

**Step 3: Verify by scenario walkthrough**

Read the modified skill end-to-end. Mentally walk the design's Testing Strategy scenarios and confirm the skill text covers each case:

- Empty profile, all-auto, below-cap, above-cap-approved, above-cap-downgraded, above-cap-aborted.
- Mid-run BLOCKED at ceiling vs within cap.
- Repeated review-failure silent escalation vs gate-on-cap-crossing.
- Cross-provider portability, malformed cell, resume re-prompt.

Note any scenario the skill text doesn't clearly cover and add clarification before commit.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md
git commit -m "feat(p03-t04): add unified tier-escalation flow"
```

---

## Phase 4: Subagent dispatch rules, import integration, and plan-review advisory

Wires the resolved tier parameters through the dispatched roles, adds import-plan preservation/signal-injection, and adds the plan-review advisory.

### Task p04-t01: Add `dispatch_tier` parameter to `oat-phase-implementer`

**Files:**

- Modify: `.agents/agents/oat-phase-implementer.md`

**Step 1: Edit**

Per `design.md` §3.5, add to the agent prompt:

- Receives `dispatch_tier` parameter from the orchestrator; runs at that tier.
- No internal model selection.
- BLOCKED-with-reasoning report mentions the tier; orchestrator decides next steps.
- Implementer does not manage its own tier across retries; orchestrator handles escalation.

**Step 2: Verify**

```bash
grep -q "dispatch_tier" .agents/agents/oat-phase-implementer.md
```

Expected: exits 0.

**Step 3: Commit**

```bash
git add .agents/agents/oat-phase-implementer.md
git commit -m "feat(p04-t01): add dispatch_tier parameter to phase implementer"
```

---

### Task p04-t02: Add `review_tier` parameter to `oat-reviewer`

**Files:**

- Modify: `.agents/agents/oat-reviewer.md`

**Step 1: Edit**

Per `design.md` §3.5, add to the agent prompt:

- Receives `review_tier` parameter; runs at that tier.
- Includes the semantics note: meaningful only on approved-escalation phases; matches invocation tier in the default case; passed always to keep the dispatch site uniform.
- Role scope: only per-phase `oat-reviewer` participates in the dispatch profile. Non-phase reviewer contexts run at invocation tier (no profile read).

**Step 2: Verify**

```bash
grep -q "review_tier" .agents/agents/oat-reviewer.md
```

Expected: exits 0.

**Step 3: Commit**

```bash
git add .agents/agents/oat-reviewer.md
git commit -m "feat(p04-t02): add review_tier parameter to reviewer"
```

---

### Task p04-t03: Add preservation short-circuit and signal injection to `oat-project-import-plan`

**Files:**

- Modify: `.agents/skills/oat-project-import-plan/SKILL.md`

**Step 1: Edit**

Per `design.md` §3.6, add a "Dispatch Profile handling" section:

- **Preservation:** if source has a recognizable OAT-format `## Dispatch Profile` section, preserve as-is; skip the proposal step for those phases; surface preservation in the import summary.
- **Signal injection:** if source has foreign-format model/effort hints, parse them and feed into `oat-project-plan-writing`'s proposal step as additional rationale signals. The proposal logic still runs and produces its own decision.
- **Reference, don't duplicate:** the proposal logic itself lives in `oat-project-plan-writing`. Import-plan adds layers on top.

**Step 2: Verify**

```bash
grep -q "Dispatch Profile" .agents/skills/oat-project-import-plan/SKILL.md && grep -q "Preservation" .agents/skills/oat-project-import-plan/SKILL.md
```

Expected: exits 0. Bump skill `version:` per AGENTS.md.

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-import-plan/SKILL.md
git commit -m "feat(p04-t03): add Dispatch Profile preservation + signal injection to import-plan"
```

---

### Task p04-t04: Add plan-review tier advisory to `oat-project-review-provide`

**Files:**

- Modify: `.agents/skills/oat-project-review-provide/SKILL.md`

**Step 1: Edit**

Per `design.md` §3.7, add a "Dispatch Profile advisory" section to the review checklist:

- For each row in the plan's `## Dispatch Profile`, evaluate against phase scope and complexity.
- **Important** findings: bottom-tier choice on multi-file/integration/cross-cutting work; missing or generic rationale on low-tier row; architecture phase with low-tier row.
- **Minor** findings: mid-tier on architecture phase; rationale present but doesn't address scope.
- **Silent (no flag):** high-tier rows; phases not in the table.
- Output format uses standard review-finding format with `dispatch-profile` category.

**Step 2: Verify**

```bash
grep -q "Dispatch Profile advisory" .agents/skills/oat-project-review-provide/SKILL.md && grep -q "dispatch-profile" .agents/skills/oat-project-review-provide/SKILL.md
```

Expected: exits 0. Bump skill `version:` per AGENTS.md.

**Step 3: Verify by scenario walkthrough**

Construct a small fixture plan with one row of each category (high, mid-arch, bottom-cross-cutting, missing-rationale, no-table) and walk through the advisory rules mentally; confirm the expected flags match `design.md` §3.7.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-review-provide/SKILL.md
git commit -m "feat(p04-t04): add Dispatch Profile advisory to plan review"
```

---

## Reviews

| Scope  | Type     | Status   | Date       | Artifact                                   |
| ------ | -------- | -------- | ---------- | ------------------------------------------ |
| p01    | code     | pending  | -          | -                                          |
| p02    | code     | pending  | -          | -                                          |
| p03    | code     | pending  | -          | -                                          |
| p04    | code     | pending  | -          | -                                          |
| final  | code     | pending  | -          | -                                          |
| design | artifact | pending  | -          | -                                          |
| plan   | artifact | received | 2026-05-12 | reviews/artifact-plan-review-2026-05-12.md |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks — Dispatch Profile format spec + plan template update
- Phase 2: 2 tasks — Per-phase proposal step + tier heuristic in plan-writing skill
- Phase 3: 4 tasks — Resolver, preflight gate, approval state, escalation flow in `oat-project-implement`
- Phase 4: 4 tasks — Subagent dispatch rules + import-plan integration + plan-review advisory

**Total: 12 tasks across 4 phases.**

Follow-up items to file at project completion:

- Backlog item: `minimum_dispatch_tier` (plan-level floor, deferred from this project's discovery).
- Optional future: persist approvals across resume in `implementation.md` if real workflows need it.
- Optional future: standalone "propose dispatch profile for existing plan" command.

Ready for code review and merge.

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
