---
oat_status: complete
oat_ready_for: oat-project-spec
oat_blockers: []
oat_last_updated: 2026-04-17
oat_generated: true
---

# Discovery: subagent-implement-refactor

## Phase Guardrails (Discovery)

Discovery captures problem framing, exploration, and decisions. Implementation details live in design.

## Initial Request

> "Can you do deep research on our subagent implement skill and comparative analysis on the superpowers one and evaluate if we should move closer to this model?"

The request started as a research question but evolved into a concrete brainstorm about evolving `oat-project-implement` to address two observed pains: context pressure on large plans, and merge-conflict overhead in `oat-project-subagent-implement`. A full brainstorm spec was produced at `.superpowers/specs/2026-04-17-oat-project-implement-phase-subagent.md` and provides the source material for this project.

## Clarifying Questions

### Question 1: Scope of change — revise existing skills, replace, or add new?

**Q:** Should the evolution replace `oat-project-subagent-implement`, merge both implement skills, or keep them separate with targeted edits?
**A:** After exploring trade-offs, landed on merging into a single evolved `oat-project-implement`. Parallelism becomes plan metadata rather than a skill choice.
**Decision:** One skill, unified model. `oat-project-subagent-implement` is deprecated and removed.

### Question 2: Where does the context burden actually live?

**Q:** Is the context-window pain in `oat-project-implement` coming from review work, implementation work, or both?
**A:** Implementation work — file reads, writes, task-by-task accumulation. Review is not the primary burden; adding a review subagent alone would not move the needle.
**Decision:** The context offload must target implementation work, not review. Phase-level subagent dispatch is the primitive.

### Question 3: What is the unit of dispatch — phase or task?

**Q:** Should we dispatch one subagent per task (Superpowers-style) or one subagent per phase?
**A:** Phase. Tasks within a phase are usually sequentially dependent (TDD pattern: test → implement → refactor). Phase is the natural "cohesive unit of meaningful work" boundary. Task-level dispatch puts context pressure back on the main orchestrator (many summaries accumulate) and requires re-reading plan/design context per task.
**Decision:** Phase-level dispatch is the default. Task-level parallelism is rejected.

### Question 4: Nested subagents (phase subagent dispatches task subagents)?

**Q:** Should a phase subagent be allowed to dispatch task subagents internally?
**A:** No. Superpowers consciously chose flat dispatch; OAT follows the same rationale. Nesting adds error-propagation cost, debug complexity, and provider-specific behavior differences.
**Decision:** Flat dispatch only.

### Question 5: How does parallelism get expressed?

**Q:** Runtime flag, plan metadata, or inferred from file analysis?
**A:** Plan metadata. Runtime inference puts the orchestrator back in the "context-heavy" hole it's trying to avoid. The planner already knows file boundaries and can declare parallelism explicitly.
**Decision:** New frontmatter field `oat_plan_parallel_groups: [[pNN, pMM], ...]`. Plans without the field run fully sequentially (backward compatible).

### Question 6: Codex compatibility — can Codex dispatch subagents?

**Q:** Does Codex support subagent dispatch, or do we need a non-subagent fallback?
**A:** Codex supports subagents (verified via Superpowers' own documentation and OAT's existing `oat-reviewer` being dispatchable in both Claude Code and Codex). However, Codex occasionally requires explicit authorization for dispatch.
**Decision:** Two-tier capability detection at skill start. Single authorization prompt on Codex `authorization required`. Tier locked for the run.

### Question 7: Tiered dispatch — two tiers or three?

**Q:** Should we adopt the three-tier pattern from `oat-project-review-provide` (Subagent / Fresh session / Inline)?
**A:** No. Three-tier includes a "fresh session" option that requires user to start a new session manually. That works for user-invoked review at HiLL checkpoints but would hang autonomous implementation if no human is present. Two-tier (Subagent / Inline) is correct for autonomous execution.
**Decision:** Two-tier dispatch. Single capability check at skill start. If authorization declined, fall back to inline immediately.

### Question 8: Skill structure — extract phase-implementation into an agent file or inline in the skill?

**Q:** Should the phase-execution behavior live in `.agents/agents/oat-phase-implementer.md` or inline in the skill?
**A:** A canonical agent file. Follows existing OAT convention (`oat-reviewer` pattern). The agent file IS the prompt — loaded as system prompt on native dispatch, read as reference on inline fallback. No separate "reference file" needed; the agent file serves both roles.
**Decision:** Create `oat-phase-implementer` as a canonical OAT agent.

### Question 9: Where are fallback guidance and graceful degradation handled?

**Q:** If the subagent isn't dispatched, how does the orchestrator know what to do?
**A:** The skill's Tier 2 path instructs the orchestrator to read `.agents/agents/oat-phase-implementer.md` and follow its process inline. The canonical path is universal (present in all provider checkouts).
**Decision:** Graceful degradation via agent-file reference on inline path. No content duplication.

## Solution Space

### Approach 1: Unified phase-subagent model in a single evolved skill _(Recommended)_

**Description:** Evolve `oat-project-implement` so each phase runs inside a fresh subagent (dispatched to `oat-phase-implementer`). Main orchestrator never reads implementation files. Reviewer runs as `oat-reviewer` subagent per phase. Parallelism is plan metadata — when declared, each parallel phase gets its own worktree. `oat-project-subagent-implement` is removed entirely.
**When this is the right choice:** When both context pressure and conflict overhead are real pains and the user is willing to consolidate two skills into one.
**Tradeoffs:** Larger single PR with migration concerns; however, unified mental model and reduced maintenance burden outweigh the risk.

### Approach 2: Surgical updates to `oat-project-implement` only

**Description:** Add phase-subagent dispatch to the existing skill. Do not touch `oat-project-subagent-implement`. No parallelism work in this project.
**When this is the right choice:** When you want to solve only the context-pressure pain and defer conflict-overhead work indefinitely.
**Tradeoffs:** Leaves the conflict-pain in the less-used skill unresolved. Creates two skills with overlapping models, risking "which do I use?" confusion.

### Approach 3: Status quo, no action

**Description:** Current skills are fine for most use cases. Mitigate context pressure via better plan decomposition (smaller phases → natural HiLL breakpoints).
**When this is the right choice:** When the pain is too narrow to justify investment.
**Tradeoffs:** Underinvests in a problem the user has already flagged. Pain recurs on every large plan.

### Chosen Direction

**Approach:** Approach 1 — unified phase-subagent model in a single evolved skill.
**Rationale:** Solves both observed pains with a single coherent design. Reuses existing OAT infrastructure (`oat-reviewer`, `oat-worktree-bootstrap-auto`, capability-detection pattern from `oat-project-review-provide`). Plan metadata for parallelism scales cleanly — absent metadata means today's behavior.
**User validated:** Yes — confirmed after explicit comparison of all three approaches.

## Options Considered

### Option A: Worktree per task vs. Worktree per phase

**Description:** Current `oat-project-subagent-implement` creates a worktree per task. Proposed: worktree per phase, and only when the plan declares the phase as parallel-safe.

**Pros (per-phase):**

- Phase is the cohesive unit; one artifact read per phase, not per task
- Far fewer worktrees for typical plans
- Merge conflicts at phase boundaries are rare when plan-authored correctly
- Plan-time decision rather than runtime inference

**Cons (per-phase):**

- Lose intra-phase parallelism (but intra-phase tasks are typically sequentially dependent anyway)

**Chosen:** B — worktree per phase

**Summary:** Task-level worktrees generated most of the merge-conflict pain. Phase-level granularity is the sweet spot for both context management and parallelism.

### Option B: Agent file vs. prompt template vs. inline in skill

**Description:** Three ways to carry the phase-execution guidance: (1) canonical agent file like `oat-reviewer`, (2) Superpowers-style prompt template alongside the skill, (3) inline within the skill's SKILL.md.

**Pros (agent file):**

- Matches existing OAT convention
- Loaded as system prompt on dispatch; read as reference on fallback
- One file serves both paths without content duplication
- Sync tooling handles provider-specific views

**Cons (agent file):**

- Additional file introduced (offset by clarity gains)

**Chosen:** A — canonical agent file at `.agents/agents/oat-phase-implementer.md`

**Summary:** Follows OAT convention, cleanest fallback semantics, no bloat in the skill.

### Option C: Single landing vs. phased rollout

**Description:** Ship the evolution in one PR or split across multiple PRs (sequential-phase-subagent first, parallelism second, deprecation third).

**Pros (single landing):**

- Coherent design reviewed in one place
- No awkward transition period where two skills with overlapping behavior coexist
- Lower confusion for users
- The evolved skill needs both sequential and parallel paths to be internally consistent

**Cons (single landing):**

- Larger blast radius per PR
- Harder to revert if issues found

**Chosen:** A — single landing

**Summary:** The low usage of `oat-project-subagent-implement` reduces deprecation risk. Phased rollout's extended transition period is worse than the single-PR blast radius.

## Key Decisions

1. **Unit of dispatch:** Phase, not task. Flat dispatch only.
2. **Parallelism expression:** `oat_plan_parallel_groups` frontmatter field in plan.md.
3. **Tiered dispatch:** Two-tier (Subagent / Inline) with single auth prompt on Codex. Tier locked for the run.
4. **Agent extraction:** New canonical `oat-phase-implementer` agent; fallback is orchestrator reading the agent file as reference.
5. **Worktree usage:** Only for phases in declared parallel groups. Sequential phases run on orchestration branch directly.
6. **Bootstrap failure handling:** Degrade whole parallel group to sequential inline (not per-phase exclusion).
7. **Merge conflict handling:** Orchestrator attempts resolution; STOPS if unresolvable — never proceeds past a broken merge.
8. **Skill consolidation:** One skill (evolved `oat-project-implement`). Delete `oat-project-subagent-implement` entirely.
9. **Release sequencing:** Single PR, lockstep public package bumps per AGENTS.md.
10. **Execution tooling for this project:** Superpowers `subagent-driven-development` — avoids self-modification of `oat-project-implement` while the project is being executed. OAT artifacts are used for planning; Superpowers for execution.

## Constraints

- Must work on both Claude Code and Codex (OAT's supported providers)
- Must not block on user input mid-run except at declared HiLL checkpoints or legitimate stops
- Must preserve backward compatibility: plans without parallelism metadata execute identically to today
- Must preserve OAT conventions: bookkeeping commits, frontmatter fields, review table lifecycle, HiLL checkpoint semantics
- Must follow release discipline per AGENTS.md: skill version bumps, template version bumps, public-package lockstep, `pnpm release:validate` before PR
- Project scaffolding already includes skill changes; executing the plan must not self-modify the running skill (use Superpowers for execution)

## Success Criteria

- Main orchestrator context stays lean on large plans (phase summaries only, not implementation file content)
- Plans with `oat_plan_parallel_groups` execute phases concurrently in worktrees and merge back cleanly in plan order
- Plans without parallelism metadata behave identically to today's sequential `oat-project-implement`
- Merge conflicts during fan-in trigger stop-and-surface behavior, not silent progression
- Codex runs work with the single authorization prompt at start
- `oat-project-subagent-implement` is fully removed with no dangling references
- Release validation passes: `pnpm release:validate` succeeds, all public packages bump together

## Out of Scope

- Task-level parallelism within a phase (rejected as overcomplicated for rare benefit)
- Nested subagents (rejected for complexity and provider-drift risk)
- Changes to `oat-reviewer` agent (unchanged)
- Changes to `oat-project-review-provide` / `oat-project-review-receive` (unchanged)
- Changes to HiLL checkpoint system (unchanged)
- Provider-specific capability detection beyond Claude Code + Codex (other providers out of scope for this project)
- Live LLM dispatch automated tests (manual verification per release instead)
- Automated quality evaluation of merge-conflict resolution (manual spot-checks)

## Deferred Ideas

- **Task-level subagent dispatch within a phase** — Deferred because typical OAT plans have sequential task dependencies within phases; not worth the complexity now.
- **Nested phase-coordinator-dispatches-task-subagents** — Deferred; reopen only if phase-level granularity proves insufficient in practice.
- **Phased rollout over multiple PRs** — Deferred; single landing recommended for this project.

## Open Questions

- **Project scoping:** Should deprecation of `oat-project-subagent-implement` be a separate OAT project from the `oat-project-implement` evolution? Recommendation is one project; user to confirm during planning.
- **Fix-loop quality:** Will fix implementer subagents meaningfully act on review findings when given the review artifact? Empirical — may need tuning after first runs.
- **Merge conflict auto-resolution quality:** First implementations may be conservative (bail more readily) until confidence builds. What's the right default aggression level?
- **Plan authoring UX:** How invasive is the parallel-group authoring step in `oat-project-plan`? Should skip unless phases are obviously independent.

## Assumptions

- Both Claude Code and Codex support subagent dispatch in current and near-future releases
- OAT's existing tiered-dispatch pattern (from `oat-project-review-provide`) generalizes cleanly to implementation dispatch
- Phase-level granularity matches the way OAT plans are typically authored (supported by examination of existing templates and fixtures)
- Users authoring plans can reasonably evaluate phase file-independence at plan time
- `oat-worktree-bootstrap-auto` and its cleanup counterpart handle per-phase worktree lifecycle correctly

## Risks

- **Provider capability drift:**
  - Likelihood: Low
  - Impact: Medium
  - Mitigation: Skill's capability check uses existing pattern from `oat-project-review-provide`; any future divergence would require the same update across both skills.

- **Bootstrap / self-modification during execution:**
  - Likelihood: Medium
  - Impact: High
  - Mitigation: Use Superpowers for execution of this specific project (decided).

- **Merge conflict resolution quality unpredictable:**
  - Likelihood: Medium
  - Impact: Medium
  - Mitigation: Conservative defaults — orchestrator bails to user when resolution is uncertain. Tune after empirical runs.

- **Backward-compat edge cases:**
  - Likelihood: Low
  - Impact: Medium
  - Mitigation: Comprehensive test fixtures for plans with and without parallelism metadata; manual runs on active projects before merge.

- **Release lockstep error:**
  - Likelihood: Low
  - Impact: High (blocks PR)
  - Mitigation: `pnpm release:validate` gate before PR; checklist in migration doc.

## Next Steps

- Review this discovery artifact for completeness
- Proceed to `spec.md` (formalize requirements with FR/NFR IDs and Requirement Index)
- Proceed to `design.md` (architecture, component design, testing strategy)
- Then transition to Superpowers for plan authoring and execution (hybrid decision — see Key Decisions #10)

## References

- Brainstorm spec: `.superpowers/specs/2026-04-17-oat-project-implement-phase-subagent.md`
- Comparative analysis (sibling project): `.claude/worktrees/hungry-khorana/.oat/projects/shared/collaborative-design-workflow/reference/comparative-analysis.md`
- Current skills (to evolve / deprecate):
  - `.agents/skills/oat-project-implement/SKILL.md` (v1.3.0)
  - `.agents/skills/oat-project-subagent-implement/SKILL.md` (v1.2.0)
- Existing agent for reuse: `.agents/agents/oat-reviewer.md` (v1.0.0)
- Pattern source for tiered dispatch: `.agents/skills/oat-project-review-provide/SKILL.md`
