# Backlog Review — 2026-02-17

**Scope:** All items in `backlog.md` (Inbox + Planned) cross-referenced against `backlog-completed.md`, recent PRs, and codebase state
**Purpose:** Identify stale items, prioritize remaining work, and recommend execution sequence
**Supersedes:** `.oat/repo/reviews/backlog-and-roadmap-review.md` (2026-02-15)

---

## 1. Staleness Report

The backlog has **two items that are already completed** but still listed as Planned. Additionally, several items from the original review (2026-02-15) have been completed since then.

### Items to move to Completed Archive

| Backlog Item | Evidence | PR |
|---|---|---|
| **(P1) Migrate `new-oat-project.ts` to CLI** | `oat project new` exists in `packages/cli/src/commands/project/new/`. Script removed from `.oat/scripts/`. | PR #12 |
| **(P1) Migrate `validate-oat-skills.ts` to CLI** | `oat internal validate-oat-skills` exists in `packages/cli/src/commands/internal/`. Script removed from `.oat/scripts/`. | PR #12 |

### Work completed but never tracked in backlog

| Work | Evidence | PR |
|---|---|---|
| Plan writing unification (`oat-project-plan-writing` skill) | Canonical plan writing contract shared across all plan-producing skills | PR #13 |
| File-based agent sync (`.md` files in `.agents/`) | `isFile` support in sync pipeline | PR #11 |
| Repo records consolidation (`.oat/repo/` layout) | `.oat/repo/{reference,reviews,archive,knowledge}` established | PR #10 |
| CLI import convention enforcement | Alias-only imports, command module restructuring | PR #9 |
| Ideas workflow (`oat-idea-*` skills) | Four idea skills live in `.agents/skills/` | PR #5 |

---

## 2. Current Backlog Inventory

After removing completed items, **19 items remain** (1 Inbox, 18 Planned):

### New items since last review (2026-02-15)

| Item | Priority | Area | Notes |
|---|---|---|---|
| `oat-project-document` (post-implementation docs synthesis) | P1 | skills | Fills a real gap in the closeout flow |
| Mode-aware reviewer for quick/import projects | P1 | skills | Prevents reviewer failures on missing artifacts |
| Git worktree workflow skill | P1 | skills | Onboarding reliability |
| Subagent orchestration skills | P1 | skills | Phase 6 readiness |
| `--help` parsing bug | P1 | tooling | Creates side effects — scaffolds a `--help` project |
| Web-research convention (`markdown.new`) | P2 | docs | Docs-only guidance |

### Carried forward from last review (still open)

| Item | Priority | Area | Status |
|---|---|---|---|
| Migrate `generate-oat-state.sh` (B14) | P1 | tooling | Not started — script still in `.oat/scripts/` |
| Migrate `generate-thin-index.sh` (B15) | P1 | tooling | Not started — script still in `.oat/scripts/` |
| Remove `.oat/scripts/` directory (B16) | P2 | tooling | Blocked on B14+B15 (2 of 4 scripts remain) |
| Context management commands (B04) | P1 | tooling | Not started |
| `oat init ideas` (B07) | P1 | tooling | Not started |
| `oat init workflows` (B10) | P1 | tooling | Not started |
| Review receive + PR-review intake | P1 | skills | Partial — `oat-project-review-receive` exists; standalone `oat-review-receive` and `oat-review-pr-receive` do not |
| Codex prompt-wrapper generation | P2 | tooling | Not started |
| PR review follow-on skill set | P2 | skills | Not started; blocked on review receive |
| Dependency intelligence | P2 | skills | Not started |
| Skill uninstall command | P2 | tooling | Not started |
| Idea promotion flow | P2 | skills | Not started |
| Backlog Refinement Flow / Jira (Inbox) | P2 | workflow | Needs scoping |

---

## 3. Analysis: What Matters Most Now

The foundation work from the original review is **done** — naming normalization, invocation standardization, skills-table retirement, and the first two script migrations are all complete. The question is no longer "what do we need to unblock?" but "what delivers the most value next?"

Three themes emerge from the remaining work:

### Theme A: Finish consolidation (low risk, reduces debt)

The remaining two shell scripts (B14, B15) are the last pieces of infrastructure debt. Completing them unlocks B16 (scripts dir removal) and makes the CLI the single source of truth for all automation.

### Theme B: Distribution story (high strategic value)

`oat init ideas` (B07) and `oat init workflows` (B10) are how OAT reaches other repos. With naming settled, there's no technical reason to wait. These are the gateway to adoption beyond this repo.

### Theme C: Workflow quality (fills real gaps in daily use)

Several new P1 items address real friction points encountered during dogfooding:
- The `--help` bug creates side effects every time someone asks for help
- The mode-aware reviewer fails or degrades on quick/import projects
- `oat-project-document` fills the gap between implementation and closeout
- The worktree skill codifies a setup sequence that's currently tribal knowledge

---

## 4. Recommended Execution Sequence

### Wave 1: Quick wins + bug fix

| Item | Effort | Rationale |
|---|---|---|
| **Fix `--help` parsing bug** | Low | Bug that creates side effects. Fix before it bites someone. |
| **Mode-aware reviewer** | Low–Medium | Skill update (not a new skill). Prevents reviewer failures on quick/import projects that are already shipping. |

**Why first:** These are quality-of-existing-work items. The `--help` bug is embarrassing; the reviewer gap affects every quick/import project review.

### Wave 2: Finish script migrations

| Item | Effort | Rationale |
|---|---|---|
| **Migrate `generate-oat-state.sh` (B14)** | Medium | Largest script (419 lines shell). Rewrite in TypeScript for testability. |
| **Migrate `generate-thin-index.sh` (B15)** | Medium | 200-line shell script. Same rationale. |
| **Remove `.oat/scripts/` (B16)** | Trivial | Cleanup after B14+B15. |

**Why second:** These are parallelizable, independent of everything else, and eliminate the last infrastructure debt. After this, no more shell scripts.

### Wave 3: Distribution

| Item | Effort | Rationale |
|---|---|---|
| **`oat init ideas` (B07)** | Medium | Simpler version of the pattern. Do first to establish the template. |
| **`oat init workflows` (B10)** | Medium | The primary onboarding path for new repos. Same pattern as B07 but larger scope. |
| **Context management commands (B04)** | Medium | `oat context sync/validate` prevents the `CLAUDE.md ↔ AGENTS.md` drift failure mode. Good for CI. |

**Why third:** With the CLI consolidated and scripts migrated, `oat init` subcommands become the natural next step. They're the distribution story — how OAT goes from "works in this repo" to "works in any repo."

### Wave 4: Workflow depth

| Item | Effort | Rationale |
|---|---|---|
| **`oat-project-document`** | Medium | Fills the docs-before-closeout gap. Natural extension of the existing review/complete flow. |
| **Review receive + PR-review intake** | High | Completes the review feedback loop. `oat-review-receive` (standalone) + `oat-review-pr-receive` (GitHub PR comments). |
| **Git worktree workflow skill** | Medium | Codifies worktree setup that's currently ad-hoc. Important as multi-worktree usage grows. |

**Why fourth:** These add real workflow capability but don't unblock other items. Better to ship distribution first, then deepen the workflow.

### Wave 5: Extensions + fill-ins

| Item | Effort | Rationale |
|---|---|---|
| Subagent orchestration skills | Medium–High | Phase 6 readiness. Important but not urgent until parallel execution is a priority. |
| Idea promotion flow | Medium | Completes ideas-to-projects pipeline. Nice but not blocking. |
| Skill uninstall command | Medium | Lifecycle completeness. |
| PR review follow-on skills | Medium | Extension of review receive. Wait until base is stable. |
| Codex prompt wrappers | Low | Fill-in. Wait until Codex usage is active. |
| Dependency intelligence | Medium | Not core to OAT value proposition. |
| Web-research convention | Low | Docs-only. Slot into a gap. |

### Deferred

| Item | Rationale |
|---|---|
| Backlog Refinement Flow / Jira | Still in Inbox. Not core to OAT. Revisit when Jira demand is clearer. |

---

## 5. Dependency Graph (Updated)

```
B14 (migrate generate-oat-state.sh) ──┐
B15 (migrate generate-thin-index.sh) ──┴──▶ B16 (remove scripts dir)

B07 (init ideas)         [independent, benefits from B14/B15 being done]
B10 (init workflows)     [independent, benefits from B07 pattern]
B04 (context management) [independent]

Review receive ──▶ PR review follow-on set
                   Subagent orchestration     [independent]
                   oat-project-document       [independent]
                   Git worktree skill         [independent]
                   Mode-aware reviewer        [independent]
                   --help bug fix             [independent]
                   Idea promotion             [independent]
```

Key observation: Most remaining items are **independent**. The tight dependency chains from the original review (B01→B08→B05, B02→B03) have been resolved. The main remaining chain is B14+B15→B16, which is straightforward.

---

## 6. Parallel Lanes

### Lane A: Script migrations (B14 + B15 → B16)
Fully independent of all other work. Can run in parallel with everything.

### Lane B: Distribution (B07 → B10 + B04)
B07 first to establish the `init` subcommand pattern, then B10 follows the same pattern at larger scale. B04 is standalone but thematically related.

### Lane C: Workflow quality (bug fix + reviewer + document skill)
Three independent items that improve daily workflow. Can be interleaved with Lane A or B.

### Lane D: Later capabilities (review receive, worktree, subagents, etc.)
Held for after Waves 1–3 complete.

---

## 7. Changes from Previous Review

| Previous Recommendation | Current Status |
|---|---|
| "Start with B01 (skills table CLI)" | Done — retired in favor of provider sync |
| "B02 (invocation standardization) in parallel" | Done — PR #7 |
| "B08 (naming normalization) is the biggest risk" | Done — PR #7, clean execution |
| "Script migrations as a parallel lane" | Half done — B12+B13 complete (PR #12), B14+B15 remain |
| "Defer review family until naming done" | Naming is done. Partial review work shipped (ad-hoc review provide). Remaining review receive work is now unblocked. |
| "Keep new workflow capabilities for later wave" | Several new P1 skills added (document, mode-aware reviewer). These reflect real dogfooding gaps, not speculative scope. |

### Net assessment

The original review's strategy was correct — foundation first, then distribution, then capabilities. Waves 1 and 3 of that plan executed well. The remaining work is mostly "finish what's started" (script migrations) and "build what's needed" (distribution + workflow quality). There are no major strategic pivots needed, just continued execution on the established trajectory.

---

## 8. Backlog Hygiene Recommendations

1. **Move B12 and B13 to Completed Archive** — they're done (PR #12).
2. **Consider tracking the plan-writing unification** in completed archive — it was a significant cross-cutting change (PR #13) that isn't captured anywhere in the backlog.
3. **The original review file** (`.oat/repo/reviews/backlog-and-roadmap-review.md`) can be archived — its item catalog (B01–B17 numbering) is now partially stale. This review supersedes it.
4. **The `--help` bug** should arguably be P0, not P1. It creates filesystem mutations from a help request. That's a correctness issue, not a nice-to-have.
