# Backlog & Roadmap Review

**Date:** 2026-02-18
**Scope:** Active items in `.oat/repo/reference/backlog.md` (Inbox + Planned; placeholders excluded)
**Roadmap:** `.oat/repo/reference/roadmap.md`
**Purpose:** Prioritize by value/effort, surface dependencies, and recommend an execution sequence

---

## 1. Executive Summary

The backlog contains **19 active items** (1 Inbox, 18 Planned) spanning 5 themes:

| Theme | Count | Key Observation |
|---|---|---|
| Tooling/lifecycle hardening | 9 | Most actionable value is here; several items can ship independently in parallel |
| Skills/workflow depth | 7 | High-value roadmap-aligned work, but some is large and should be sequenced |
| Distribution/adoption | 2 | `oat init ideas/workflows` is still a major growth lever |
| Terminology/docs polish | 1 | One item (`markdown.new`) appears largely implemented and should be cleaned up in backlog |
| Workflow/Jira extension | 1 | Valuable but not core to OAT’s near-term roadmap |

**Top-line recommendations:**

1. Execute the unified cleanup lane first: **B16 + B17** (now planned as one implementation) and then **B18**.
2. Ship **B09 mode-aware reviewer** immediately as a high-impact quick win for current quick/import usage.
3. Start distribution lane next: **B13 (`oat init ideas`) -> B14 (`oat init workflows`)**, then **B15 skill uninstall**.

---

## 2. Item Catalog

### Rating Key

| Rating | Value | Effort |
|---|---|---|
| **High** | Unblocks other items, daily workflow impact, or product milestone prerequisite | > 3 days, high complexity, or touches many files |
| **Medium** | Improves quality/consistency but not blocking | 1-3 days, moderate complexity |
| **Low** | Nice-to-have or future-facing | < 1 day, straightforward, isolated change |

### Priority Quadrants

```
                     High Value
                        |
         STRATEGIC      |      QUICK WIN
        (plan carefully)|    (do first)
                        |
  High Effort ----------+---------- Low Effort
                        |
         AVOID /        |      FILL-IN
         DEFER          |    (slot into gaps)
                        |
                     Low Value
```

---

### B01 - Backlog Refinement Flow (Jira ticket generation)

> Conversational backlog decomposition + optional Jira ticket creation.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Low** | Useful for process productivity, but not tied to current roadmap bottlenecks |
| **Effort** | **High** | Requires workflow design, templates, Jira integration, and iterative UX |
| **Quadrant** | **Avoid / Defer** | |

- **Dependencies:** None
- **Blocked by:** Nothing
- **Blocks:** Nothing

---

### B02 - Continue `.oat/config.json` consolidation (Phase B/C)

> Continue migration of legacy pointers/settings into `.oat/config.json` with compatibility.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Medium** | Reduces long-term config fragmentation and maintenance burden |
| **Effort** | **Medium** | Requires compatibility reads/migration handling across skills/CLI |
| **Quadrant** | **Strategic** | |

- **Dependencies:** None (soft dependency on cleanup/normalization work)
- **Blocked by:** Nothing
- **Blocks:** B18 (cleaner config surface for policy controls)

---

### B03 - Stronger subagent orchestration skills

> Add sequential + parallel orchestration contracts with autonomous worktree flow.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **High** | Core roadmap Phase 6 capability; major leverage for parallel delivery |
| **Effort** | **High** | Large contract design across orchestration, review gates, merge/reconcile, and state |
| **Quadrant** | **Strategic** | |

- **Dependencies:** Soft: B09, B10 (review contracts harden orchestration quality gates)
- **Blocked by:** Nothing
- **Blocks:** B04 (terminology migration safer after checkpoint semantics settle)

---

### B04 - Rename HiL terminology to HiLL

> Terminology and possibly key-name migration for checkpoint semantics.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Low** | Mostly naming consistency, not capability |
| **Effort** | **Medium** | Cross-cutting docs/skills/frontmatter compatibility risk |
| **Quadrant** | **Fill-in** | |

- **Dependencies:** Soft: B03
- **Blocked by:** Nothing
- **Blocks:** Nothing

---

### B05 - Add `oat-project-document`

> Post-implementation documentation synthesis/update workflow.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **High** | Directly improves closeout quality and prevents docs drift |
| **Effort** | **Medium** | New skill with moderate artifact/diff synthesis logic |
| **Quadrant** | **Strategic** | |

- **Dependencies:** None
- **Blocked by:** Nothing
- **Blocks:** Nothing

---

### B06 - Add `markdown.new` web-research convention

> Prefer markdown conversion URL prefix for web fetches where viable.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Low** | Nice workflow optimization |
| **Effort** | **Low** | Docs/instruction update |
| **Quadrant** | **Fill-in** | |

- **Dependencies:** None
- **Blocked by:** Nothing
- **Blocks:** Nothing

---

### B07 - Optional Codex prompt-wrapper generation

> Opt-in generation of thin `.codex/prompts` wrappers for synced OAT skills.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Low** | Optional enhancement with limited immediate product impact |
| **Effort** | **Low** | Straightforward generation toggle and docs |
| **Quadrant** | **Fill-in** | |

- **Dependencies:** None
- **Blocked by:** Nothing
- **Blocks:** Nothing

---

### B08 - Context management commands (`oat context sync/validate`)

> Ensure `AGENTS.md` ↔ `CLAUDE.md` integrity and add validation/reporting.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Medium** | Prevents drift and enables CI guardrails for instruction integrity |
| **Effort** | **Medium** | Recursive scanning + conflict-resolution UX + reporting |
| **Quadrant** | **Strategic** | |

- **Dependencies:** None
- **Blocked by:** Nothing
- **Blocks:** Nothing

---

### B09 - Make `oat-reviewer` mode-aware for quick/import

> Ensure reviewer contracts handle missing `spec.md`/`design.md` in non-full lanes.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **High** | Directly affects correctness of active quick/import workflows |
| **Effort** | **Low** | Prompt/contract updates + routing tests |
| **Quadrant** | **Quick Win** | |

- **Dependencies:** None
- **Blocked by:** Nothing
- **Blocks:** B10 (review family consistency)

---

### B10 - Complete review receive + PR-review intake family

> Add standalone `oat-review-receive` and `oat-review-pr-receive`.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Medium** | Completes ingestion side for review workflows |
| **Effort** | **High** | New flows, contracts, and likely provider/PR API handling |
| **Quadrant** | **Strategic** | |

- **Dependencies:** Soft: B09
- **Blocked by:** Nothing
- **Blocks:** B11

---

### B11 - PR review follow-on set (`provide/respond/summarize`)

> Optional extension set after PR review intake foundation.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Low** | Incremental extension, not core to near-term gaps |
| **Effort** | **Medium** | Multiple skills and contract boundaries |
| **Quadrant** | **Fill-in** | |

- **Dependencies:** Hard: B10
- **Blocked by:** B10
- **Blocks:** Nothing

---

### B12 - Dependency intelligence skill family

> Analyze dependency upgrades and impact/risk guidance.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Low** | Useful, but not directly tied to current roadmap milestones |
| **Effort** | **Medium** | Needs package/changelog/risk analysis design |
| **Quadrant** | **Fill-in** | |

- **Dependencies:** None
- **Blocked by:** Nothing
- **Blocks:** Nothing

---

### B13 - `oat init ideas`

> Scaffold ideas workflow + copy idea skills.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **High** | Distribution/onboarding path for idea workflow |
| **Effort** | **Medium** | Command scaffolding + templates + idempotency tests |
| **Quadrant** | **Strategic** | |

- **Dependencies:** None
- **Blocked by:** Nothing
- **Blocks:** B14 (pattern reuse), B19 (ideas-to-project bridge)

---

### B14 - `oat init workflows`

> Scaffold full project workflow and copy workflow skills.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **High** | Primary adoption path for workflow mode in new repos |
| **Effort** | **High** | Larger scaffold footprint, idempotency, and docs surface |
| **Quadrant** | **Strategic** | |

- **Dependencies:** Soft: B13
- **Blocked by:** Nothing
- **Blocks:** Nothing

---

### B15 - Skill uninstall command

> First-class command to remove skills and clean provider views.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Medium** | Lifecycle completeness for existing sync/install workflows |
| **Effort** | **Medium** | Requires managed/unmanaged handling and safe prompts |
| **Quadrant** | **Strategic** | |

- **Dependencies:** None
- **Blocked by:** Nothing
- **Blocks:** Nothing

---

### B16 - Project cleanup command

> Detect/fix stale active pointer and project state normalization drift.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **High** | Addresses recurring lifecycle reliability issues and drift recovery |
| **Effort** | **Medium** | Well-scoped command with deterministic remediation paths |
| **Quadrant** | **Strategic** | |

- **Dependencies:** None
- **Blocked by:** Nothing
- **Blocks:** B18 (policy follow-through easier on normalized state)

---

### B17 - Artifact cleanup command

> Clean duplicate/stale review/external-plan artifacts with safe guardrails.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **High** | Reduces repo noise and manual cleanup burden significantly |
| **Effort** | **Medium** | Candidate detection, guardrails, interactive triage, audit output |
| **Quadrant** | **Strategic** | |

- **Dependencies:** None
- **Blocked by:** Nothing
- **Blocks:** B18 (artifact policy operations)

---

### B18 - Configurable VCS policy + worktree artifact sync behavior

> Policy controls for gitignored artifact dirs and worktree copy-back behavior.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Medium** | High flexibility value for advanced usage; less urgent than baseline cleanup |
| **Effort** | **High** | Config model + worktree propagation + safety semantics |
| **Quadrant** | **Strategic** | |

- **Dependencies:** Soft: B02, B16, B17
- **Blocked by:** Nothing
- **Blocks:** Nothing

---

### B19 - Idea promotion + auto-discovery in `oat-project-new`

> Promote summarized ideas into projects and optionally auto-start discovery.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Medium** | Strong UX bridge between ideas and projects |
| **Effort** | **Medium** | Multiple prompt flows and backlog synchronization logic |
| **Quadrant** | **Strategic** | |

- **Dependencies:** Soft: B13
- **Blocked by:** Nothing
- **Blocks:** Nothing

---

## 3. Dependency Graph

```
Legend:  ──▶  hard dependency (must complete first)
         - -▶  soft dependency (beneficial but not required)

B09 ──▶ B10 ──▶ B11
B13 - -▶ B14
B13 - -▶ B19
B16 - -▶ B18
B17 - -▶ B18
B02 - -▶ B18
B03 - -▶ B04

Independent core items:
B01, B05, B06, B07, B08, B12, B15
```

---

## 4. Parallel Lanes

These are independent work streams that can be tackled concurrently without conflicts.

### Lane A: Workflow Reliability

Mode-aware review + docs-closeout + review-family completion.

```
B09 ──▶ B10 ──▶ B11
B05 [parallel]
```

**Total estimated effort:** High  
**Cross-lane dependencies:** None hard; B09 should precede B10

### Lane B: Lifecycle Cleanup & Artifact Governance

Normalize project/artifact hygiene and then layer policy controls.

```
B16 [parallel] B17 - -▶ B18
```

**Total estimated effort:** High  
**Cross-lane dependencies:** Soft dependency on B02 for config policy follow-through

### Lane C: Distribution & Adoption

Ship init onboarding commands and lifecycle completeness commands.

```
B13 - -▶ B14
B15 [parallel]
B08 [parallel]
```

**Total estimated effort:** High  
**Cross-lane dependencies:** B19 benefits once B13 is done

### Lane D: Parallel Execution Roadmap

Long-horizon orchestration and terminology cleanup.

```
B03 - -▶ B04
```

**Total estimated effort:** High  
**Cross-lane dependencies:** B09/B10 are soft quality enablers for B03

### Lane E: Fill-ins / Optional Extensions

```
B06, B07, B12, B19, B01
```

**Total estimated effort:** Medium  
**Cross-lane dependencies:** B19 soft on B13

---

## 5. Recommended Execution Order

### Wave 1: Correctness + Hygiene Quick Start

| Order | Item | Effort | Rationale |
|---|---|---|---|
| 1 | **B09** - Mode-aware reviewer | Low | High-impact quick win on active quick/import paths |
| 2 | **B16** - Project cleanup command | Medium | Stabilizes project-state drift and pointer hygiene |
| 3 | **B17** - Artifact cleanup command | Medium | Removes recurring manual cleanup overhead; now fully planned |

**Parallelism:** B16 and B17 can run in parallel after B09 starts.

### Wave 2: Distribution Commands

| Order | Item | Effort | Rationale |
|---|---|---|---|
| 1 | **B13** - `oat init ideas` | Medium | Establishes init command pattern for distribution |
| 2 | **B14** - `oat init workflows` | High | Primary onboarding path; can reuse B13 pattern |
| 3 | **B15** - Skill uninstall | Medium | Lifecycle completeness for interop CLI |
| 4 | **B08** - Context sync/validate commands | Medium | Adds CI-friendly instruction integrity controls |

**Parallelism:** B15 and B08 can run in parallel with B13/B14.

### Wave 3: Review Workflow Depth + Documentation Closeout

| Order | Item | Effort | Rationale |
|---|---|---|---|
| 1 | **B10** - Review receive + PR intake | High | Completes the receive side of review pipeline |
| 2 | **B05** - `oat-project-document` | Medium | Closes post-implementation docs gap |
| 3 | **B11** - PR follow-on set | Medium | Optional extension once B10 stabilizes |

**Parallelism:** B05 can run in parallel with B10.

### Wave 4: Configuration & Strategic Parallel Execution

| Order | Item | Effort | Rationale |
|---|---|---|---|
| 1 | **B02** - Config consolidation Phase B/C | Medium | Reduces long-term `.oat` fragmentation |
| 2 | **B18** - VCS policy + worktree artifact sync | High | Depends on cleanup/config groundwork |
| 3 | **B03** - Subagent orchestration skills | High | Major roadmap capability requiring concentrated effort |
| 4 | **B04** - HiL -> HiLL terminology | Medium | Safer after orchestration semantics settle |

**Parallelism:** B02 and B03 can run in parallel; B18 should follow cleanup/config confidence.

### Deferred

| Item | Rationale |
|---|---|
| **B01** - Backlog refinement flow/Jira | Useful but not core to current roadmap execution |
| **B12** - Dependency intelligence skill | Nice-to-have extension, not blocking roadmap phases |
| **B07** - Codex prompt wrappers | Optional enhancement; low urgency |

---

## 6. Roadmap Alignment

### How backlog items map to roadmap phases

| Roadmap Phase | Status | Backlog Items | Notes |
|---|---|---|---|
| Phase 5: Staleness + knowledge drift | Planned | B16, B17, B18 | Strong alignment with lifecycle hygiene and drift governance |
| Phase 6: Parallel execution + reconcile | Deferred (groundwork started) | B03, B04 | B03 is the main delivery vehicle |
| Phase 7: Quick mode + template rendering helper | In Progress | B09, B05, B10 | Quality hardening of quick/import review/closeout flow |
| Phase 8: Provider interop CLI + lifecycle completeness | In Progress | B13, B14, B15, B08 | Distribution + lifecycle command expansion |
| Phase 9: Multi-project switching + branch awareness | Later | B02, B19 | Related foundational improvements |

### Gaps: Roadmap items without backlog coverage

| Roadmap Item | Phase | Recommendation |
|---|---|---|
| `oat template render ...` helper | Phase 7 | Add explicit backlog item; currently called out in roadmap but absent in backlog |
| Capability matrix expansion and provider behavior docs hardening | Phase 8 | Add explicit backlog item for provider capability matrix deliverable |
| Strict staleness mode/full diff-based drift enforcement | Phase 5 | Add backlog item if still intended beyond cleanup commands |

### Orphans: Backlog items not clearly represented on the roadmap

| Backlog Item | Recommendation |
|---|---|
| **B01** - Backlog refinement + Jira | Keep as deferred workflow extension |
| **B06** - markdown.new convention | Move to completed/archive (appears substantially implemented in AGENTS) |
| **B07** - Codex prompt wrappers | Keep as optional enhancement in Phase 8 tail work |
| **B12** - Dependency intelligence | Keep as standalone optional skill family |

---

## 7. Observations & Recommendations

### Strategic observations

1. The backlog is now mostly post-foundation hardening and expansion, with many independent items suitable for parallel execution.
2. Cleanup/governance (B16/B17/B18) and mode-aware review (B09) provide the highest immediate reliability payoff.
3. Distribution (`oat init ideas/workflows`) remains the largest adoption lever and should not be delayed behind long-horizon orchestration work.

### Risks

| Risk | Mitigation |
|---|---|
| Backlog drift (items completed but not archived, stale links) | Add a lightweight recurring backlog hygiene pass; update links when plans are archived |
| Overscoping in orchestration work (B03) | Split into staged deliverables with strict contracts and acceptance gates |
| Cleanup commands accidentally removing referenced artifacts | Keep conservative reference guards + dry-run default + explicit apply confirmations |

### Quick wins to tackle immediately

1. **B09** - Make reviewer mode-aware (high value, low effort, directly impacts current workflows)
2. **B16 + B17** - Execute unified cleanup command plan already drafted (`2026-02-18-oat-cleanup-project-and-artifacts.md`)
3. **Backlog hygiene update** - Move/adjust stale items and fix archived-plan links (not a formal backlog item, but immediate quality improvement)
