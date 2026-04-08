---
skill: deep-research
schema: analysis
topic: 'March 15 OAT Dashboard Design Audit — Delta Analysis'
model: opus-4-6
generated_at: 2026-04-03
context: .oat/repo/research/2026-03-15-oat-dashboard-design.md
---

# March 15 OAT Dashboard Design — What's Changed

An audit of the March 15, 2026 design spec (`2026-03-15-oat-dashboard-design.md`) and implementation plan (`2026-03-15-oat-dashboard.md`) against the current OAT codebase as of April 3, 2026. **39 commits** have landed on main since March 15, introducing new skills, state fields, config systems, and a more sophisticated post-implementation routing state machine.

## Summary

The March 15 design is **structurally sound** — the three-layer architecture (control plane → server → UI) and core types are mostly accurate. However, several areas need updates before implementation can begin. The most significant changes are: (1) a new `pr_open` phase status and PR tracking fields, (2) a much more complex post-implementation routing state machine, (3) new lifecycle skills (summary, revise, complete, pr-final), (4) dispatch mechanism clarification, and (5) new config schema additions.

Nothing in the March 15 design needs to be _thrown away_ — it needs to be _extended_.

---

## Type Accuracy

### Phase — ACCURATE

```typescript
type Phase = 'discovery' | 'spec' | 'design' | 'plan' | 'implement';
```

All five phases remain the only values. Confirmed in `oat-project-next/SKILL.md`, `templates/state.md`, and `scaffold.ts`. No new phases added.

### PhaseStatus — NEEDS UPDATE

```typescript
// March 15:
type PhaseStatus = 'in_progress' | 'complete';

// Current (April 3):
type PhaseStatus = 'in_progress' | 'complete' | 'pr_open';
```

`pr_open` was added in commit `6a80c6a` (March 30). It's set after `oat-project-pr-final` creates the PR but before `oat-project-complete` marks the project done. This is used in the post-implementation router (Step 5.6 of `oat-project-next`).

**Impact on control plane:** The `ProjectState` type and any status-dependent rendering logic need to handle `pr_open`. The skill recommender table needs a new row for `implement` + `pr_open`.

### WorkflowMode — ACCURATE

```typescript
type WorkflowMode = 'spec-driven' | 'quick' | 'import';
```

Unchanged. Confirmed in `scaffold.ts` and `templates/state.md`.

### ExecutionMode — ACCURATE

```typescript
type ExecutionMode = 'single-thread' | 'subagent-driven';
```

Unchanged. Routing logic correctly switches between `oat-project-implement` and `oat-project-subagent-implement`.

---

## New State Fields

Two new frontmatter fields added to `state.md` (commit `6a80c6a`, March 30):

| Field           | Type           | Purpose                                        |
| --------------- | -------------- | ---------------------------------------------- |
| `oat_pr_status` | string \| null | PR state tracking (null, open, merged, closed) |
| `oat_pr_url`    | string \| null | URL of the created PR                          |

**Impact on control plane:** `ProjectState` interface needs these fields. The `parseStateFrontmatter` function (Task 2 in the plan) must extract them. The UI should display PR status and link when available.

---

## New Artifact: summary.md

A new project artifact template was added (commit `85eccb6`, March 27):

**File:** `.oat/templates/summary.md`

**Frontmatter fields:**

- `oat_summary_last_task` — last task completed when summary was generated
- `oat_summary_revision_count` — number of post-PR revision cycles
- `oat_summary_includes_revisions` — whether revisions are captured

**Impact on control plane:**

- `ArtifactType` union needs `'summary'` added
- `checkArtifacts` function (Task 2, Step 8) must check for `summary.md`
- The skill recommender must account for summary generation as a post-implementation step

---

## Skill Recommender — Major Changes

### Early Phase Routing — ACCURATE

The March 15 recommendation table for phases `discovery` through `plan` is still correct:

| Phase     | Status   | Mode         | Recommendation             |
| --------- | -------- | ------------ | -------------------------- |
| discovery | complete | spec-driven  | oat-project-spec           |
| discovery | complete | quick/import | oat-project-plan           |
| spec      | complete | —            | oat-project-review-provide |
| design    | complete | —            | oat-project-review-provide |
| plan      | complete | —            | oat-project-implement      |

### Post-Implementation Routing — SIGNIFICANTLY EXPANDED

The March 15 design assumed a simple flow:

```
implement complete → oat-project-review-provide
```

**The current implementation has a 6-step post-implementation state machine** (from `oat-project-next/SKILL.md`, Step 5):

```
implement complete/pr_open → Post-Implementation Router:
  5.1: Incomplete revision tasks?      → oat-project-implement (continue revisions)
  5.2: Unprocessed reviews in reviews/? → oat-project-review-receive
  5.3: Final code review not passed?   → oat-project-review-provide OR review-receive
  5.4: Summary not generated?          → oat-project-summary (NEW)
  5.5: PR not created?                 → oat-project-pr-final (NEW)
  5.6: PR is open?                     → oat-project-complete (NEW)
```

**Impact on control plane:** The `SkillRecommendation` logic (Task 8 in the plan) needs to be substantially rewritten for the implement phase. Instead of a single recommendation, it must evaluate 6 conditions in order and recommend the first matching skill.

### New Skills Not in March 15 Design

| Skill                             | Purpose                                                        | When Called                     |
| --------------------------------- | -------------------------------------------------------------- | ------------------------------- |
| `oat-project-next`                | Lifecycle router — determines next skill based on state        | Entry point for "what's next?"  |
| `oat-project-summary`             | Generates durable summary artifact from project artifacts      | After implementation, before PR |
| `oat-project-pr-final`            | Creates/updates the final PR with artifact-derived description | After summary, before complete  |
| `oat-project-complete`            | Marks project complete, triggers archive if configured         | After PR is open                |
| `oat-project-revise`              | Handles post-PR feedback, creates revision tasks               | When PR review feedback arrives |
| `oat-project-reconcile`           | Merge reconciliation for worktrees                             | Post-merge cleanup              |
| `oat-project-promote-spec-driven` | Promote quick/import projects to spec-driven                   | On-demand workflow upgrade      |
| `oat-project-document`            | Documentation sync with docs site                              | Post-completion or on-demand    |
| `oat-project-import-plan`         | Import external plans into OAT format                          | Import workflow entry           |

**Total oat-project-\* skills: 27** (up from ~18 in March 15 design)

### Boundary Tier Detection — NEW CONCEPT

The March 15 design had no concept of boundary tier detection. The current `oat-project-next` skill uses a **3-tier system** to classify artifact readiness:

| Tier    | Condition                                                 | Action                        |
| ------- | --------------------------------------------------------- | ----------------------------- |
| Tier 1  | `oat_status == "complete"` AND has `oat_ready_for` target | Advance to target skill       |
| Tier 1b | `oat_status == "complete"` WITHOUT target                 | Advance to default next phase |
| Tier 2  | `oat_status == "in_progress"` + substantive content       | Advance to next phase         |
| Tier 3  | `oat_template == true` OR empty artifact                  | Resume current phase          |

**Impact on control plane:** The skill recommender should implement this tiered detection for more accurate recommendations. Reading just `oat_phase` and `oat_phase_status` from `state.md` is no longer sufficient — the recommender should also check artifact frontmatter (`oat_status`, `oat_ready_for`, `oat_template`) for precise routing.

---

## Dispatch Mechanism — Clarification Needed

### March 15 Assumption

```
claude -p "/<skill-name> <args>"    # Launch agent with skill pre-invoked
codex "<prompt>"                    # Launch Codex with prompt
```

### Current Reality

Skills are invoked via **Claude Code's internal Skill tool**, not CLI flags. When `oat-project-next` determines the next skill, it calls the Skill tool to load and execute the next skill within the current conversation.

**For the control plane, dispatch needs two paths:**

1. **Send to existing session** — Use `zellij action write-chars` to type `/<skill-name>` into a pane with a running Claude Code session. This works because Claude Code interprets `/<skill>` as a skill invocation.

2. **Launch new session** — Use `zellij run -- claude --prompt "Run /<skill-name> for project <name>"` to start a fresh agent session. The `--prompt` flag sends an initial message.

The March 15 design's dispatch architecture is conceptually correct but the CLI flag syntax needs verification against current Claude Code CLI.

---

## Config Schema Changes

### New Config Fields

```typescript
// Added to OatConfig interface since March 15:
interface OatConfig {
  // ... existing fields ...
  git?: {
    defaultBranch?: string; // NEW — auto-detected during oat init
  };
  archive?: {
    s3Uri?: string; // NEW — S3 bucket for project archives
    s3SyncOnComplete?: boolean; // NEW — auto-sync on project completion
    summaryExportPath?: string; // NEW — where to export summaries
  };
}
```

### New CLI Command: `oat config`

Full configuration management: `oat config get <key>`, `oat config set <key> <value>`, `oat config list`. The control plane should use the same config reading logic rather than duplicating it.

---

## Package Namespace Change

The CLI package moved from `@tkstang/cli` to `@open-agent-toolkit/cli` (commit April 1). All publishable packages now use the `@open-agent-toolkit` scope.

**Impact:** The control plane package should be `@open-agent-toolkit/control-plane` (not `@oat/control-plane` as in the March 15 design).

---

## Implementation Plan Task-by-Task Impact

### Chunk 1: Control Plane — Types and Project State

| Task                             | Status       | Changes Needed                                                                |
| -------------------------------- | ------------ | ----------------------------------------------------------------------------- |
| Task 1: Package scaffold         | Minor update | Use `@open-agent-toolkit/control-plane` scope                                 |
| Task 2: State parser             | Update       | Add `oat_pr_status`, `oat_pr_url` fields; add `summary.md` to artifact checks |
| Task 3: Project scanner          | Unchanged    | Still accurate                                                                |
| Task 4: Pending action detection | Update       | Add PR-related pending actions (PR open, PR review feedback, revision tasks)  |
| Task 5: File watcher             | Unchanged    | Still accurate                                                                |
| Task 6: Exports                  | Unchanged    | Just re-exports                                                               |

### Chunk 2: Control Plane — Skills and Sessions

| Task                        | Status            | Changes Needed                                                                                                        |
| --------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| Task 7: Skill registry      | Update            | Account for ~27 skills (up from ~18); add new categories                                                              |
| Task 8: Skill recommender   | **Major rewrite** | Post-implementation routing is now a 6-step state machine; add boundary tier detection; add `pr_open` status handling |
| Task 9: Session detector    | Unchanged         | Still accurate                                                                                                        |
| Task 10: Zellij integration | Minor update      | Verify CLI flag syntax (`--prompt` vs `-p`)                                                                           |
| Task 11: Session launcher   | Minor update      | Verify dispatch command format                                                                                        |
| Task 12: Worktree manager   | Unchanged         | Still accurate                                                                                                        |
| Task 13: Integration test   | Update            | Test cases need new fields and routing paths                                                                          |

### Chunk 3: Dashboard Server

| Task                      | Status       | Changes Needed                      |
| ------------------------- | ------------ | ----------------------------------- |
| Task 14: Package scaffold | Unchanged    | Still accurate                      |
| Task 15a: Read-only API   | Minor update | Add PR status to project responses  |
| Task 15b: Dispatch API    | Minor update | Verify dispatch command syntax      |
| Task 16: WebSocket        | Unchanged    | Still accurate                      |
| Task 17: Config loading   | Update       | Add git and archive config sections |

### Chunk 4: Web UI

| Task        | Status | Changes Needed                                                                                                                                                           |
| ----------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tasks 18-23 | Update | UI needs to display PR status/link, summary artifact, revision state. Dispatch modal needs updated skill list. Phase progress should show post-implementation sub-steps. |

### Chunk 5: CLI Integration

| Task        | Status       | Changes Needed                                         |
| ----------- | ------------ | ------------------------------------------------------ |
| Tasks 24-26 | Minor update | `oat dashboard` command is still the right entry point |

---

## Recommendations

1. **Update types first** — Add `pr_open` to `PhaseStatus`, add `oat_pr_status`/`oat_pr_url` to `ProjectState`, add `'summary'` to `ArtifactType`.

2. **Rewrite the skill recommender** — Port the 6-step post-implementation router from `oat-project-next/SKILL.md` into the recommender, plus add boundary tier detection.

3. **Import config reading from CLI** — Don't reimplement config parsing. Share the `OatConfig` interface and reader from `@open-agent-toolkit/cli`.

4. **Consider sharing `oat-project-next` logic** — Rather than reimplementing routing, the control plane could share the routing module with the skill. This avoids drift.

5. **Verify dispatch CLI syntax** — Before implementing the session launcher, test current Claude Code CLI flags in a real terminal session.
