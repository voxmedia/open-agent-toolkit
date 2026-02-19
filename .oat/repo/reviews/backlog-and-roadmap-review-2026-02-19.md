# Backlog & Roadmap Review

**Date:** 2026-02-19
**Scope:** All active items in `.oat/repo/reference/backlog.md` (Inbox + Planned; excluding completed `[x]` items)
**Roadmap:** `.oat/repo/reference/roadmap.md`
**Purpose:** Prioritize by value/effort, surface dependencies, and recommend an execution sequence

---

## 1. Executive Summary

The backlog contains **15 active items** (1 Inbox, 14 Planned) spanning 5 themes:

| Theme | Count | Key Observation |
|---|---|---|
| CLI lifecycle commands | 5 | Foundation for multi-project and config hygiene; several are quick to add given established patterns |
| Workflow skills | 5 | Documentation synthesis, review expansion, and PM governance; mixed urgency |
| Init & distribution | 1 | `oat init ideas` and `oat init workflows` already shipped; idea promotion is the remaining item |
| Provider interop | 3 | Codex adapter is the key gap; prompt wrappers and skill uninstall are lower priority |
| Future-facing / external | 1 | Jira integration is far out; defer |

**Top-line recommendations:**

1. **Front-load quick wins**: Switch `pnpm run cli` to direct `oat` (B05) and add context management (B08) — both are low-effort, high-daily-impact
2. **Invest in CLI project lifecycle** (B15) as the prerequisite for Phase 9 multi-project and config consolidation
3. **Complete the review loop** (B09) before expanding to PR review skills — this is the highest-value skills gap remaining

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

### B01 — Backlog Refinement Flow (Jira ticket generation)

> Structured conversational flow to break initiatives into epics/stories/tasks, then create Jira tickets.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Low** | External integration with narrow current audience; OAT is not yet multi-user enough to justify Jira orchestration |
| **Effort** | **High** | Requires Atlassian CLI integration, interview/template flow, iterative refinement loop |
| **Quadrant** | **Avoid / Defer** | |

- **Dependencies:** None
- **Blocked by:** Nothing
- **Blocks:** Nothing

---

### B02 — Config consolidation Phase B/C (`.oat/config.json`)

> Migrate `.oat/projects-root` (Phase B) and evaluate active-project/idea pointers (Phase C) into `.oat/config.json`.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Medium** | Reduces config sprawl, but existing system works; no one is blocked on this today |
| **Effort** | **Medium** | Phase B is straightforward (add key + compat reads). Phase C requires coordinated skill updates (every skill reads `.oat/active-project` directly) |
| **Quadrant** | **Fill-in** | |

- **Dependencies:** B15 soft-depends on this (project lifecycle commands benefit from consolidated config)
- **Blocked by:** Nothing
- **Blocks:** Nothing (soft: B15, B16)

---

### B03 — `oat-project-document` (post-implementation docs synthesis)

> Skill to generate documentation update recommendations after implementation, based on project artifacts + diffs.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **High** | Directly addresses the docs drift we keep hitting (reference docs go stale after every project); improves closeout discipline |
| **Effort** | **Medium** | New skill (~250 lines); needs to diff project artifacts against `docs/oat/**` and `.oat/repo/reference/**`, produce delta plan |
| **Quadrant** | **Strategic** | |

- **Dependencies:** None (but soft-enables B04 by providing a building block for the PM workflow family)
- **Blocked by:** Nothing
- **Blocks:** Nothing (soft: B04)

---

### B04 — First-class OAT project/repo management workflow family

> Formalize ad-hoc internal flows: backlog capture, decision-record updates, reference refresh, review/external-plan hygiene.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **High** | Every session currently runs these flows ad-hoc; formalizing saves significant time and reduces drift |
| **Effort** | **High** | Multiple skills, two operating modes (tracked vs local-only), config layer, interactive multi-select |
| **Quadrant** | **Strategic** | |

- **Dependencies:** Soft-depends on B03 (documentation synthesis would feed into PM workflow)
- **Blocked by:** Nothing
- **Blocks:** Nothing

---

### B05 — Switch `pnpm run cli` to direct `oat` CLI in user-facing guidance

> Update all skills, docs, and templates to use `oat <command>` instead of `pnpm run cli -- <command>`.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **High** | Daily friction; inconsistency between docs and actual usage; confusing for worktree/CI contexts |
| **Effort** | **Low** | Grep and replace across ~10 skills + docs + templates; add a global-link setup guide. Codebase exploration shows 10 skills reference CLI commands |
| **Quadrant** | **Quick Win** | |

- **Dependencies:** None
- **Blocked by:** Nothing
- **Blocks:** Nothing

---

### B06 — Optional Codex prompt-wrapper generation

> Generate thin `.codex/prompts` wrappers for `oat-*` skills during Codex sync.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Low** | Narrow audience; Codex already uses `nativeRead: true` for skills (reads `.agents/skills` directly) |
| **Effort** | **Low** | Template generation during sync; straightforward extension of existing sync engine |
| **Quadrant** | **Fill-in** | |

- **Dependencies:** Soft-depends on B07 (Codex adapter improvements)
- **Blocked by:** Nothing
- **Blocks:** Nothing

---

### B07 — Codex markdown→TOML subagent adapter

> Convert canonical `.agents/agents/*.md` into Codex role config (`.codex/config.toml` entries + optional per-role `.toml` files).

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Medium** | Enables multi-agent Codex support; important for the interop story but narrow immediate audience |
| **Effort** | **Medium** | New adapter logic, TOML generation, `config.toml` modification. Current Codex adapter is minimal (22 lines); this adds significant scope |
| **Quadrant** | **Fill-in** | |

- **Dependencies:** None
- **Blocked by:** Nothing
- **Blocks:** B06 (soft)

---

### B08 — Context management commands (`AGENTS.md` ↔ `CLAUDE.md` integrity)

> Add `oat context sync` and `oat context validate` to ensure `CLAUDE.md` files point at co-located `AGENTS.md`.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Medium** | Prevents integrity drift; useful for CI. Currently only 2 AGENTS.md locations in this repo, but scales to any repo |
| **Effort** | **Low** | Recursive scan + file write; follows established CLI command pattern (~200 lines + tests) |
| **Quadrant** | **Quick Win** | |

- **Dependencies:** None
- **Blocked by:** Nothing
- **Blocks:** Nothing

---

### B09 — Review receive + PR-review intake skill family

> Add `oat-review-receive` (non-project review feedback → fix tasks) and `oat-review-pr-receive` (GitHub PR comments → task lists).

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **High** | Completes the review loop for ad-hoc and PR contexts; key workflow gap. Unblocks B10 |
| **Effort** | **Medium** | Two new skills; follows established review skill patterns (~200-300 lines each). PR variant needs `gh api` integration |
| **Quadrant** | **Strategic** | |

- **Dependencies:** None
- **Blocked by:** Nothing
- **Blocks:** B10 (hard)

---

### B10 — PR review follow-on skills (`provide/respond/summarize`)

> Add optional PR review extensions after base review receive is stable.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Low** | Nice-to-have extensions; the core review loop works without these |
| **Effort** | **Medium** | 3 new skills with distinct contracts |
| **Quadrant** | **Avoid / Defer** | |

- **Dependencies:** Hard depends on B09
- **Blocked by:** B09
- **Blocks:** Nothing

---

### B11 — Dependency intelligence skill family

> Analyze `package.json`, compare versions, summarize changelog impact, classify breaking changes.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Low** | Nice-to-have; no one is currently blocked; dependency management isn't a pain point |
| **Effort** | **Medium** | Package analysis, changelog parsing, breaking change detection; moderate complexity |
| **Quadrant** | **Avoid / Defer** | |

- **Dependencies:** None
- **Blocked by:** Nothing
- **Blocks:** Nothing

---

### B12 — `oat init ideas` subcommand — COMPLETED

> Shipped as `oat init tools ideas`. Already implemented.

---

### B13 — `oat init workflows` subcommand — COMPLETED

> Shipped as `oat init tools workflows`. Already implemented.

---

### B14 — Skill uninstall command (`oat remove skill`)

> CLI command to remove skills from canonical storage and propagate deletion to provider views.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Medium** | Lifecycle completeness; currently manual deletion + sync |
| **Effort** | **Medium** | Manifest management, provider view cleanup, dry-run/apply. Follows sync engine patterns |
| **Quadrant** | **Fill-in** | |

- **Dependencies:** None
- **Blocked by:** Nothing
- **Blocks:** Nothing

---

### B15 — `oat project open|switch|pause` lifecycle commands

> CLI-native project activation, switching, and pause with state metadata.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **High** | Prerequisite for Phase 9 multi-project; replaces manual pointer editing; daily workflow impact |
| **Effort** | **Medium** | 3 subcommands under `oat project`; needs active-project pointer management, `state.md` updates, dashboard refresh. Pattern established by `oat project new` |
| **Quadrant** | **Strategic** | |

- **Dependencies:** Soft-depends on B02 (would benefit from consolidated config, but can work with current pointer files)
- **Blocked by:** Nothing
- **Blocks:** Nothing (enables Phase 9 direction)

---

### B16 — Configurable VCS policy + worktree sync behavior

> Config-driven gitignore policy for artifact directories + worktree copy propagation.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Medium** | Solves artifact noise in worktrees; `active-project` propagation already handled. Remaining scope is directory-level policy |
| **Effort** | **High** | Config model, gitignore management, worktree copy policy, bi-directional sync, dry-run/apply |
| **Quadrant** | **Avoid / Defer** | Wait for more dogfood data on pain severity |

- **Dependencies:** Soft-depends on B02 (config would live in `.oat/config.json`)
- **Blocked by:** Nothing
- **Blocks:** Nothing

---

### B17 — Idea promotion and auto-discovery flow in `oat-project-new`

> Enhance `oat-project-new` to detect summarized ideas and offer promotion with auto-discovery.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Low** | Nice UX improvement for idea→project transition; not blocking any workflow |
| **Effort** | **Medium** | Modify existing skill (oat-project-new ~70 lines currently); add idea detection, context passing, backlog update |
| **Quadrant** | **Fill-in** | |

- **Dependencies:** Soft-depends on B12 (idea promotion is more useful after `oat init ideas` enables idea workflow in target repos)
- **Blocked by:** Nothing
- **Blocks:** Nothing

---

## 3. Dependency Graph

```
Legend:  ──▶  hard dependency (must complete first)
         - -▶  soft dependency (beneficial but not required)

B09  ──▶  B10          (review receive → PR review follow-on)

B07  - -▶  B06         (Codex TOML adapter → Codex prompt wrappers)
B12  - -▶  B17         (init ideas [completed] → idea promotion; promotion needs ideas infra)
B03  - -▶  B04         (project-document → PM workflow family)
B02  - -▶  B15         (config consolidation → project lifecycle commands)
B02  - -▶  B16         (config consolidation → VCS policy)

Independent items (no meaningful dependencies):
B01 [independent]
B05 [independent]
B08 [independent]
B11 [independent]
B14 [independent]
```

---

## 4. Parallel Lanes

These are independent work streams that can be tackled concurrently without conflicts.

### Lane A: Quick Fixes & Hygiene

Low-effort items that improve daily workflow immediately.

```
B05 (oat CLI rename)  ──  B08 (context management)
```

**Total estimated effort:** Low (1-2 days combined)
**Cross-lane dependencies:** None

### Lane B: Init & Distribution — COMPLETED

Both `oat init tools ideas` (B12) and `oat init tools workflows` (B13) are already shipped.

**Remaining:** B17 (idea promotion) is the only remaining init-adjacent item; moved to Lane E.

### Lane C: CLI Project Lifecycle

Foundation for multi-project support and config hygiene.

```
B15 (project open/switch/pause)  ──  B02 (config consolidation)
```

**Total estimated effort:** Medium (3-5 days combined)
**Cross-lane dependencies:** B02 soft-enables B16

### Lane D: Review Expansion

Completing the review feedback loop.

```
B09 (review receive + PR intake)  ──▶  B10 (PR review follow-on)
```

**Total estimated effort:** Medium–High (4-6 days combined)
**Cross-lane dependencies:** None

### Lane E: Workflow Quality & Governance

Post-implementation documentation and reference management.

```
B03 (project-document)  - -▶  B04 (PM workflow family)
```

**Total estimated effort:** Medium–High (5-8 days combined)
**Cross-lane dependencies:** None

### Lane F: Codex Interop

Provider-specific enhancements for Codex multi-agent support.

```
B07 (Codex TOML adapter)  - -▶  B06 (Codex prompt wrappers)
```

**Total estimated effort:** Medium (2-4 days combined)
**Cross-lane dependencies:** None

---

## 5. Recommended Execution Order

### Wave 1: Quick Wins

| Order | Item | Effort | Rationale |
|---|---|---|---|
| 1a | **B05** — Switch to direct `oat` CLI | Low | Highest daily friction; grep-and-replace; clears invocation confusion for everything after |
| 1b | **B08** — Context management commands | Low | Small CLI command; standalone; improves CI readiness |

**Parallelism:** Both can run in parallel (no cross-dependencies).

### Wave 2: Core Lifecycle & Distribution

| Order | Item | Effort | Rationale |
|---|---|---|---|
| 2a | **B15** — `oat project open/switch/pause` | Med | CLI-native project management; prerequisite for Phase 9 |
| 2b | **B09** — Review receive + PR intake | Med | Highest-value skills gap; completes the review loop |

**Parallelism:** Both can run in parallel across different lanes.

### Wave 3: Strategic Investment

| Order | Item | Effort | Rationale |
|---|---|---|---|
| 3a | **B03** — `oat-project-document` | Med | Addresses docs drift; feeds into Wave 4 PM governance |
| 3b | **B07** — Codex TOML adapter | Med | Enables multi-agent Codex; unblocks B06 |
| 3c | **B02** — Config consolidation B/C | Med | Foundation for future config hygiene; nice-to-have after B15 lands |

**Parallelism:** All three can run in parallel (independent lanes).

### Wave 4: Polish & Expansion

| Order | Item | Effort | Rationale |
|---|---|---|---|
| 4a | **B04** — PM workflow family | High | Formalizes ad-hoc governance flows; benefits from B03 landing first |
| 4b | **B14** — Skill uninstall | Med | Lifecycle completeness; fills a gap |
| 4c | **B06** — Codex prompt wrappers | Low | Quick fill-in once B07 is done |

**Parallelism:** B04 is independent from B14 and B06; all three can run in parallel.

### Deferred

| Item | Rationale |
|---|---|
| **B01** — Jira backlog refinement | Low value + High effort; no current need for Jira integration |
| **B10** — PR review follow-on skills | Blocked by B09; P2 priority; not needed until review receive is stable |
| **B11** — Dependency intelligence | Future-facing; not a current pain point |
| **B16** — VCS policy + worktree sync | High effort; needs more dogfood data before investing |
| **B17** — Idea promotion / auto-discovery | Nice UX; not urgent; soft-depends on B12 landing first |

---

## 6. Roadmap Alignment

### How backlog items map to roadmap phases

| Roadmap Phase | Status | Backlog Items | Notes |
|---|---|---|---|
| Phase 4: Active project pointer | Completed (polish) | B15 | `open/switch/pause` commands are the remaining polish |
| Phase 5: Staleness + drift | Planned | — | No backlog items yet; consider adding when trigger conditions are met |
| Phase 6: Parallel execution | In Progress | — | Contracts shipped; production validation is roadmap work, not backlog |
| Phase 7: Quick mode + templates | In Progress | — | Template rendering helper is the remaining deliverable; not in backlog |
| Phase 8: Provider interop CLI | In Progress | B02, B05, B06, B07, B08, B14, B15 | Largest cluster; lifecycle commands are the main remaining work (B12, B13 already shipped) |
| Phase 9: Multi-project switching | Later | B15 | Project lifecycle commands are the prerequisite |
| Phase 10: Memory system | Later | — | No backlog coverage yet |
| Cross-cutting | Ongoing | B03, B04 | Docs synthesis and PM workflow family are cross-cutting quality improvements |

### Gaps: Roadmap items without backlog coverage

| Roadmap Item | Phase | Recommendation |
|---|---|---|
| Template rendering helper (`oat template render`) | Phase 7 | Add backlog item or fold into Phase 7 remaining work |
| Staleness + knowledge drift upgrades | Phase 5 | Defer adding backlog items until trigger conditions are hit |
| Phase 6 production validation | Phase 6 | Not a backlog item — it's operational work (run real projects with orchestration) |
| Memory system | Phase 10 | Far future; no action needed |

### Orphans: Backlog items not on the roadmap

| Backlog Item | Recommendation |
|---|---|
| **B01** — Jira backlog refinement | Keep as deferred; too early for the roadmap |
| **B03** — `oat-project-document` | Consider adding as a Phase 4 or cross-cutting deliverable (docs sync at closeout) |
| **B04** — PM workflow family | Consider adding as a cross-cutting governance phase |
| **B09** — Review receive + PR intake | Consider adding to Phase 3 (Reviews + PR loop) as a follow-on deliverable |
| **B11** — Dependency intelligence | Keep as standalone; doesn't fit current roadmap phases |
| **B17** — Idea promotion | Keep as standalone enhancement; too small for a roadmap phase |

---

## 7. Observations & Recommendations

### Strategic observations

1. **The backlog is CLI-heavy**: 8 of 15 active items are `[tooling]` — the CLI is the primary investment area. This aligns with Phase 8 roadmap focus. Consider batching CLI items into a single "CLI lifecycle wave" project.

2. **Documentation synthesis (B03) is the most underrated item**: Every project completion currently triggers ad-hoc reference updates (like the one we just ran). A formal `oat-project-document` skill would pay dividends across every future project closeout.

3. **Phase 9 readiness depends on B15**: The multi-project switching roadmap item can't start without CLI project lifecycle commands. B15 should be prioritized in Wave 2 to keep the Phase 9 trigger timeline realistic.

4. **Codex interop (B07) is a product differentiator**: While the audience is narrow today, multi-agent Codex support demonstrates the interop value proposition. Worth investing in Wave 3 to validate the adapter pattern before more providers need similar work.

5. **The backlog has natural completion horizon**: Waves 1-3 (~10 items) are achievable in 2-3 weeks of focused work. Wave 4 + deferred items can be re-evaluated after.

### Risks

| Risk | Mitigation |
|---|---|
| B05 (CLI rename) causes test snapshot failures | Run full test suite after rename; update `help-snapshots.test.ts` inline snapshots |
| B02 Phase C (active-project migration) breaks skills | Keep Phase C as evaluation-only initially; do not flip writes until coordinated rollout |
| B04 (PM workflow family) scope creep | Timebox initial implementation to 3-4 core flows; defer VCS mode switching to B16 |
| B09 PR-review intake requires GitHub API knowledge | Limit initial scope to `gh api` calls; avoid building a full GitHub integration |

### Quick wins to tackle immediately

1. **B05** — Switch `pnpm run cli` to `oat` CLI (Low effort; eliminates daily invocation friction across all skills/docs)
2. **B08** — Context management commands (Low effort; small CLI command; improves integrity checks)
3. **B09** — Review receive + PR intake (Medium effort; highest-value skills gap; completes the review loop)
