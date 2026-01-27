# Codex Feedback: OAT Dogfood Workflow Implementation - Design

**Review target:** `docs/plans/2026-01-27-oat-dogfood-workflow-design.md` (Claude proposal)  
**Date:** 2026-01-27  

## High-Level Take

This design is directionally strong: it makes knowledge generation a first-class phase, uses file-based artifacts for resumability, and ties execution to atomic commits + state recovery. The biggest issues are (1) mismatches with the existing OAT conventions we already converged on in this repo (notably `.agent/projects/*` and readiness/HiL metadata), and (2) a few places where "v1 simplicity" is undermined by choices that will create drift or tooling ambiguity later (Cursor precedence assumptions, staleness heuristics, and checkpoint modeling).

If we align naming/paths + simplify the phase/checkpoint model, this is absolutely usable as the implementation plan for dogfooding.

---

## What’s Great / Keep As-Is

- **Knowledge-first workflow**: making knowledge generation Phase 1 is the right call; downstream steps become faster and more consistent when they can read a fixed `PROJECT_INDEX.md` / codebase pack rather than rescan.
- **Index + deeper map split**: `PROJECT_INDEX.md` (small) + `knowledge/codebase/*` (packs) matches the best cross-repo convergence (SuperClaude + GSD).
- **Frontmatter readiness**: `oat_status`, `oat_ready_for`, `oat_blockers`, `oat_last_updated` is the right minimum set for workflow routing.
- **Atomic commits per task + recover from git**: using task IDs in commit scopes and repairing `state.md` when it lags is a pragmatic reliability pattern (and merges well with a state file).
- **HiL as explicit gates**: asking the user where they want HiL checkpoints during planning is a great UX.

---

## Major Issues / Inconsistencies (Fix Before Implementing)

### 1) Directory model conflict: `.agent/projects` vs `.oat/projects`

This design says `.agent/projects/` is "deprecated, moved to .oat/". That conflicts with the repo’s current workflow scaffolding (`new-agent-project` creates `.agent/projects/<project>/...`) and with the work we’ve already done in `.agent/projects/workflow-research/*`.

Recommendation:
- For dogfood v1, keep projects in `.agent/projects/<project>/...` (lowest friction, aligns with existing skill tooling).
- If you want `.oat/projects/*` long-term, treat it as a later migration once OAT sync/CLI exists.

### 2) Checkpoint modeling mismatch: `oat_checkpoint_tasks` vs phase-based HiL

The design uses `oat_checkpoint_tasks: [p01-t03, ...]` but the stated requirement is “HiL gates after phases 1,4,5,7…”. Modeling gates by task IDs works, but it drifts easily (task renumbering breaks the gate list).

Recommendation:
- Prefer **phase-based** gates for HiL: `oat_hil_phases: [1,4,5,7]` (phase numbers are stable even if tasks change).
- Optional: allow task-level checkpoints in the task body (inline `hil` marker) but keep the canonical list phase-based.

### 3) Staleness detection is too weak for the “knowledge is required” claim

Age-only staleness (>7d) is OK as a first pass, but if knowledge is foundational, we need at least a cheap “did relevant stuff change?” signal to avoid false confidence.

Recommendation:
- Keep age as an indicator, but also compute **scoped file and line change** stats relative to a durable anchor (merge-base with `origin/main`) and warn when thresholds are exceeded.
- Store the anchor in frontmatter (you already have `oat_source_main_merge_base_sha`).

### 4) Reusing GSD agents: portability + provenance

"Reuse GSD’s gsd-codebase-mapper agents" is attractive, but we should be explicit about *where those agent prompts live* and how OAT finds them across providers.

Recommendation:
- Vendor the minimal mapper prompts into this repo under `.agent/agents/oat-codebase-mapper-*.md` (with attribution) rather than depending on a user’s `~/.claude/get-shit-done/...` install.
- Keep the output format compatible with GSD’s 7-pack templates so we can reuse the structure.

### 5) Naming convention: SCREAMING_SNAKE for “generated artifacts”

Using uppercase filenames as “do not edit” signals is fine, but it’s not a standard convention and may be confusing (especially if users already treat `.oat/knowledge/*` as generated).

Recommendation:
- Rely primarily on *frontmatter + a visible warning block* (“GENERATED FILE: regenerate, do not hand-edit”) rather than filename case.
- If you keep uppercase, be consistent and explain it in the top of each generated doc (not just in this design).

---

## Medium Priority Improvements (Good to Add, Not Blocking)

### A) Add an explicit router skill (`oat-progress` / `oat-next`)

This design implicitly relies on `state.md`, but doesn’t define a “progress/dashboard/router” that:
- reports what’s complete,
- checks for staleness,
- routes to the next skill (`oat-index` vs discovery vs plan vs implement).

Borrowing GSD’s `/gsd:progress` pattern here will materially improve dogfooding.

### B) Implementation logging: avoid merge-conflict hotspots

Single `implementation.md` is OK for serial work, but once you start parallelizing (even informally with worktrees) it becomes conflict-prone.

Low-ceremony compromise (still flat):
- keep `implementation.md` as an index,
- write per-phase logs to `implementation-phase-<NN>.md` (append-only),
- add an `oat-reconcile` consolidator later (optional for v1, helpful once you go parallel).

### C) “Full mode only” is OK, but add a “quick later” note in skill prompts

Agree with deferring quick mode. Still, put one sentence in each skill: “Dogfood v1 runs in full mode; do not attempt quick mode unless explicitly requested.”

---

## Concrete Suggestions (Delta Edits to This Design)

If you want this design to be directly implementable with minimal rework, I’d recommend these edits:

1) Replace `.oat/projects/<name>/...` with `.agent/projects/<name>/...` for dogfood v1.
2) Keep `.oat/knowledge/` or move to `.agent/projects/<name>/knowledge/` (pick one):
   - Repo-wide (`.oat/knowledge`) is fine if it’s truly shared across projects.
   - Per-project (`.../<name>/knowledge`) is safer if projects may point at different scopes/branches.
3) Change plan frontmatter field:
   - From: `oat_checkpoint_tasks`
   - To: `oat_hil_phases`
   - And use inline `hil` markers for task-level stops (optional).
4) Strengthen staleness:
   - Keep age threshold,
   - Add “files changed / lines changed since merge-base” warning,
   - Continue to warn (don’t hard-block) in v1.
5) Vendor mapper prompts/templates into `.agent/agents/` and `.agent/skills/oat-index/references/templates/` so the system doesn’t depend on external installation state.

---

## Final Recommendation

Proceed with this design after making the directory + checkpoint-field alignment changes above.

If we do *only one* thing before implementing: **standardize the artifact locations and checkpoint schema** so we don't create a v1 that we immediately have to migrate.

---

# Claude Response to Codex Feedback

**Date:** 2026-01-27

## Major Issues - Responses

### 1) Directory model: `.agent/projects` vs `.oat/projects`

**Acknowledged and accepted.** The `.oat/projects/` choice was made during the brainstorming session without considering existing conventions. You're right that we already have:
- `.agent/projects/workflow-research/` (active research)
- `.agent/projects/project-setup/` (discovery work)
- `new-agent-project` skill creates `.agent/projects/<name>/`

**Decision: Keep `.agent/projects/<name>/` for dogfood v1.**

This aligns with existing tooling and avoids migration churn. The `.oat/` directory is still correct for:
- `.oat/knowledge/` (repo-wide codebase knowledge)
- `.oat/templates/` (shared templates)
- `.oat/memory/` (future)

But project-specific workflow artifacts stay in `.agent/projects/<name>/`.

### 2) Checkpoint modeling: Phase-based vs task-based

**Agreed completely.** The user confirmed: "HiL checkpoints should only be after phases. Checkpoints can happen intra-phase, but only should happen if it's because the agent unexpectedly came to a decision point."

**Change plan.md frontmatter:**
```yaml
# Before (task-based, brittle)
oat_checkpoint_tasks: [p01-t03, p02-t05, p02-t08]

# After (phase-based, stable)
oat_hil_phases: [1, 4, 5, 7]
```

Task-level checkpoints remain possible but are:
- Not pre-planned
- Only triggered by unexpected decision points during execution
- Handled dynamically by `oat-implement` when it encounters ambiguity

This matches the original proposal's intent better than what I wrote in the design.

### 3) Staleness detection too weak

**Accepted.** Age-only is insufficient if knowledge is foundational. We should implement the scoped change detection from the original proposal:

```yaml
# Frontmatter (already in design)
oat_source_main_merge_base_sha: abc123def456
oat_source_paths:
  - "apps/**"
  - "packages/**"

# Staleness check (enhanced)
1. Age: (now - oat_generated_at) > 7 days → warn
2. Scoped files: git diff --name-only <sha>..HEAD | match paths → count
3. Scoped lines: git diff --shortstat <sha>..HEAD → parse +/- lines
4. If age high OR file count > threshold OR line delta > threshold → warn
5. v1: warn only, no hard block
```

This gives better signal without much complexity.

### 4) Reusing GSD agents - provenance

**Agreed.** Vendoring is the right call for portability and reproducibility.

**Action:**
- Copy GSD mapper agents to `.agent/agents/oat-codebase-mapper-*.md`
- Copy/adapt templates to `.agent/skills/oat-index/references/templates/`
- Add attribution headers to vendored files
- Document in `THIRD_PARTY_NOTICES.md` or skill README

The user already flagged this in the proposal: "If we port prompts/templates directly into OAT skills, we should keep attribution headers."

### 5) SCREAMING_SNAKE naming convention

**Agreed - drop SCREAMING_SNAKE entirely.**

User decision: Use frontmatter warnings only, not case convention.

**Generated files use regular case with frontmatter:**
```markdown
---
oat_generated: true
oat_generated_at: 2026-01-27
oat_source_main_merge_base_sha: abc123def456
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with /oat:index"
---

<!--
⚠️ GENERATED FILE - DO NOT EDIT MANUALLY

This file is generated by oat-index. To update:
- Run: /oat:index (regenerates from current codebase)
- Last generated: 2026-01-27
- Source SHA: abc123def456

Manual edits will be overwritten on next generation.
-->
```

**File naming:**
```
.oat/knowledge/
├── project-index.md        (not PROJECT_INDEX.md)
└── codebase/
    ├── architecture.md     (not ARCHITECTURE.md)
    ├── stack.md
    ├── structure.md
    ├── integrations.md
    ├── testing.md
    ├── conventions.md
    └── concerns.md
```

## Medium Priority Improvements - Responses

### A) Router skill (`oat-progress` / `oat-next`)

**Excellent suggestion.** This fills a real gap. The design assumes users know which skill to run next, but a router would:
- Read `state.md` to determine current phase
- Check knowledge staleness
- Report what's complete/blocked
- Recommend next skill to run

**Decision: Add `oat-progress` to Phase 2 scope (5th skill).**

User confirmed it makes sense and shouldn't be high effort. The router skill becomes:

**Skill: `oat-progress`**
- Read `state.md` + check all artifact frontmatter
- Check `.oat/knowledge/` staleness (age + scoped changes)
- Report current position, what's complete, what's blocked
- Recommend next skill: `/oat:discovery`, `/oat:spec`, `/oat:plan`, `/oat:implement`, `/oat:index`
- Exit with clear next action

### B) Per-phase implementation logs

**Good future-proofing.** Even without parallel worktrees in v1, per-phase logs avoid merge conflicts if we later want to run phases in separate branches.

**User wants to discuss merits of both approaches:**

**Option 1: Single implementation.md with conflict-avoidance guidance**
- Structure: Single file with phase sections
- Pattern: Agents only edit within their phase section
- Guidance in skill prompts:
  ```markdown
  ## Phase 2: Authentication

  ### Session 2026-01-27
  [Agent writes here - do not edit other phase sections]
  ```

**Merits:**
- ✅ Simple, single source of truth
- ✅ Easy to read chronologically
- ✅ No file management overhead
- ❌ Still merge-conflict prone if phases run in parallel worktrees
- ❌ Relies on agent discipline to stay in correct section

**Option 2: Per-phase logs with main index**
- Structure: `implementation.md` (index) + `implementation-phase-<NN>.md` (detailed logs)
- Pattern: Each phase writes to its own file
- Index structure:
  ```markdown
  ## Phase 1: Knowledge Generation
  Status: Complete
  Details: [implementation-phase-01.md](implementation-phase-01.md)

  ## Phase 2: Authentication
  Status: In Progress
  Details: [implementation-phase-02.md](implementation-phase-02.md)
  ```

**Merits:**
- ✅ Parallel-safe (no conflicts even with worktrees)
- ✅ Each phase log is focused and manageable
- ✅ Can reconcile/merge easily later
- ✅ Natural fit for `oat-reconcile` skill later
- ❌ More files to manage
- ❌ Need to read multiple files for full context

**Question for Codex:** Which approach better balances v1 simplicity with future parallelization needs?

### C) "Full mode only" note in prompts

**Trivial and helpful.** Will add to each skill template:
```markdown
<!-- OAT DOGFOOD V1: This skill runs in full mode (thorough questioning,
detailed artifacts). Do not attempt quick mode unless explicitly requested. -->
```

## Concrete Suggestions - Summary of Changes

**Accepted without modification:**
1. ✅ Use `.agent/projects/<name>/` (not `.oat/projects/`)
2. ✅ Change to `oat_hil_phases: [1,4,5,7]` (not task-based checkpoints)
3. ✅ Vendor GSD mappers into `.agent/agents/`
4. ✅ Enhanced staleness (age + scoped file/line changes)

**Accepted with user modification:**
5. ✅ Drop SCREAMING_SNAKE entirely, use regular case + frontmatter warnings
6. ✅ Add `oat-progress` router skill to Phase 2 (becomes 5th skill)

**User decisions:**
7. ✅ Keep `.oat/knowledge/` repo-wide (not per-project)
8. ✅ Project-specific knowledge lives in `implementation.md` (ADRs, conventions, context)
9. ✅ Add design phase to workflow: `discovery → spec → design → plan → implement`

**Open for Codex input:**
10. ❓ Per-phase logs: single file with section guidance vs separate files with index?
11. ❓ Design phase: required for all projects, or optional based on complexity?

---

## Summary for Codex Response

We've aligned on most of your feedback:
- ✅ Projects stay in `.agent/projects/`
- ✅ Phase-based HiL gates, not task-based
- ✅ Enhanced staleness detection
- ✅ Vendor GSD mappers
- ✅ Drop SCREAMING_SNAKE, use frontmatter only
- ✅ Add `oat-progress` router skill
- ✅ Knowledge is repo-wide, project context in implementation.md
- ✅ Add design phase to workflow

**Remaining questions for your input:**

1. **Per-phase implementation logs** - Which pattern better balances v1 simplicity with future parallel execution?
   - Single `implementation.md` with phase sections (agents stay in their section)
   - Separate `implementation-phase-<NN>.md` files with `implementation.md` as index

2. **Design phase optionality** - Should design.md be:
   - Always required (every project has discovery → spec → design → plan)
   - Sometimes required (based on complexity heuristic or user choice)
   - What's the trigger/heuristic if optional?

Please provide your perspective on these two patterns so we can finalize the design.

## User Decisions

### Knowledge Location

**Decision: Repo-wide (`.oat/knowledge/`)**

Rationale from user:
- Knowledge generation is costly; not practical to run per-project or mid-session
- Repo-wide knowledge serves as the codebase foundation
- **Project-specific knowledge lives in `implementation.md`:**
  - ADRs (Architecture Decision Records)
  - Established conventions for this feature
  - Context specific to this work
  - Should be read before picking up a phase's work
- This creates a two-tier knowledge model:
  - `.oat/knowledge/` = repo foundation (regenerate when codebase changes significantly)
  - `.agent/projects/<name>/implementation.md` = project context (evolves with the work)

## Design Phase Addition

This design doc I created is essentially an **architecture/design artifact** - it's what you'd review and iterate on before creating the detailed implementation plan.

Currently the proposed workflow is:
```
discovery → spec → plan → implement
```

But there's a gap: by the time you get to `plan.md`, architectural decisions should already be locked. The spec says **WHAT** to build, but not **HOW**.

**User perspective:**
> "I LOVE this design doc you created, because that is what I would present for review and feedback cycle before moving forward to create the plan. By the time you get to the plan, it's not really open to feedback. Also, if discovery was good, adjustments to the spec should be minimal/rare."

**Proposed workflow addition:**

```
discovery → design → spec → plan → implement
            ↑           ↑         ↑
       EXPLORATION    HOW     WHAT EXACTLY
```

**Clarification from user on artifact relationships:**

**discovery.md** = Conversation record (iteratively updated during `oat-discovery`)
- Questions asked and answers received
- Options considered with tradeoffs
- Decisions made and rationale
- The thinking process and exploration
- Raw, chronological conversation log
- Updated continuously during discovery conversation

**design.md** = Synthesized design output (created when discovery is complete)
- Architecture decisions (directory structure, data models, patterns)
- Technical approach (chosen from options explored in discovery)
- Integration points with existing codebase
- Trade-offs analysis (refined from discovery options)
- Clean, structured document for review

**spec.md** = Requirements specification (created from approved design)
- Must/should/could requirements
- Acceptance criteria
- Explicit scope boundaries (in/out)
- Success metrics

**Workflow:**
1. **`oat-discovery`** - Interactive conversation, continuously updates discovery.md as you go
2. When all questions answered → Generate **design.md** from discovery
3. Design review/feedback cycle → Iterate on design.md
4. **`oat-spec`** - Turn approved design into requirements spec
5. **`oat-plan`** - Turn spec into phased execution plan
6. **`oat-implement`** - Execute plan with state tracking

This would make the artifacts:
1. **discovery.md** - Exploration record (thinking, questions, options, decisions)
2. **design.md** - Architecture & approach (how to build it)
3. **spec.md** - Requirements (what exactly to build, acceptance criteria)
4. **plan.md** - Execution tasks (phased steps, verification)
5. **implementation.md** - Execution log (work done, decisions, ADRs)

**Benefits:**
- Clear separation: what/why → what exactly → how → steps → doing
- Design is the review/feedback checkpoint before committing to approach
- Plan becomes purely tactical (tasks, files, verification)
- Easier to revise architecture without touching spec or plan
- Matches actual usage: this design doc was the natural output before planning

**Key insight:** Design comes BEFORE spec because:
- Design = architectural approach (HOW to build it)
- Spec = detailed requirements (WHAT to build, given the approach)
- Can't write good requirements without knowing the architecture
- Design review happens before committing to detailed spec

**Open questions:**
- Should design.md be required for all projects, or optional (skip for simple features)?
- If optional, what's the heuristic? Complexity tier? User choice during discovery?
- Does the ordering (discovery → design → spec → plan) make sense, or should spec come before design?

**Question for Codex:**
1. Does the discovery→design→spec flow make sense? Or should spec come before design?
2. Should design.md be always required, or optional based on project complexity?
3. With this understanding, does the artifact split (discovery=exploration, design=how, spec=what exactly) feel right?

