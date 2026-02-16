# Backlog & Roadmap Review

**Date:** 2026-02-15
**Scope:** All items in `backlog.md` (Inbox + Planned) cross-referenced against `roadmap.md` phases
**Purpose:** Prioritize by value/effort, surface dependencies, and recommend an execution sequence

---

## 1. Executive Summary

The backlog contains **17 items** (1 Inbox, 16 Planned) spanning four themes:

| Theme | Count | Key Observation |
|---|---|---|
| CLI consolidation (script migrations) | 5 | Mechanical, parallelizable work; low risk |
| CLI capability expansion (`init`, context, skills table) | 4 | Foundation for distribution and onboarding |
| Skill quality & naming | 3 | High-touch refactor; blocks clean naming for new skills |
| New workflow capabilities (review, ideas, deps) | 5 | Highest user-facing value; some depend on naming |

**Top-line recommendations:**

1. **Start with the "unblocking foundation" pair**: AGENTS skills-table CLI command + invocation-language standardization. These are prerequisites or strongly beneficial for nearly every other item.
2. **Run script-to-CLI migrations as a parallel lane** - they're independent of each other and of the skill/naming work.
3. **Defer naming normalization until after the first wave** - it touches everything and benefits from having the skills-table CLI and invocation language settled first.
4. **Keep new workflow capabilities (review family, dependency intelligence) for a later wave** - they add scope without unblocking anything.

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

### B01 - CLI: Refresh AGENTS skills table

> Add CLI command to regenerate AGENTS.md `<available_skills>` block from `.agents/skills/*/SKILL.md` frontmatter.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **High** | Eliminates manual drift between skills and AGENTS.md. Prerequisite for naming migration (B08) and any skill add/remove/rename. Every skill change benefits. |
| **Effort** | **Low** | Read frontmatter, render XML block, write between markers. Deterministic, testable, no side effects. Similar pattern to existing `sync` command. |
| **Quadrant** | **Quick Win** | |

- **Dependencies:** None
- **Blocked by:** Nothing
- **Blocks:** B08 (naming normalization benefits from automated table updates)

---

### B02 - Skills: Standardize invocation language to skill-first

> Replace `/oat:*` slash-only guidance with skill-first wording (`oat-project-implement` skill); keep slash text as host-specific alias only.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **High** | Consistency across providers (Codex, Cursor, Claude Code). Roadmap Phase 4 polish item. Prevents confusion for new users. |
| **Effort** | **Medium** | Touches templates, skills, and internal-project-reference docs. Mostly text changes but across ~30+ files. Needs a validation check to prevent regression. |
| **Quadrant** | **Quick Win / Strategic** (borderline) | |

- **Dependencies:** None (standalone)
- **Blocked by:** Nothing
- **Blocks:** B03 (Codex prompt wrappers assume standardized invocation)

---

### B03 - Tooling: Optional Codex prompt-wrapper generation

> Opt-in generation of thin `.codex/prompts` wrappers for `oat-*` skills during sync.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Low** | Nice-to-have for Codex users. Only relevant once invocation is standardized and Codex is actively used. |
| **Effort** | **Low** | Thin wrappers, minimal logic. Could be an extension of the existing sync command. |
| **Quadrant** | **Fill-in** | |

- **Dependencies:** B02 (invocation standardization should be done first)
- **Blocked by:** B02
- **Blocks:** Nothing

---

### B04 - Tooling: Context management commands (`oat context sync/validate`)

> CLI commands to ensure `CLAUDE.md` contains `@AGENTS.md` and report missing/invalid context files.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Medium** | Prevents a subtle but real failure mode (CLAUDE.md missing @AGENTS.md). Useful for CI. Not blocking other work. |
| **Effort** | **Medium** | Recursive scan, interactive conflict handling, dry-run/force modes. Moderate complexity, well-scoped. |
| **Quadrant** | **Strategic** (medium priority) | |

- **Dependencies:** None
- **Blocked by:** Nothing
- **Blocks:** Nothing

---

### B05 - Skills: Review provide/receive workflow skill family

> Add `oat-review-provide`, `oat-review-receive`, `oat-review-pr-receive` for structured reviews outside of project workflow.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **High** | Major workflow capability. Enables review workflows independent of OAT project lifecycle. Roadmap Phase 3 extension. |
| **Effort** | **High** | Three new skills with distinct contracts. Needs artifact format design, PR comment ingestion (GitHub API), task list generation. |
| **Quadrant** | **Strategic** | |

- **Dependencies:** Naming normalization (B08) is beneficial (name them correctly from the start) but not strictly required
- **Blocked by:** Soft dependency on B08
- **Blocks:** B06 (PR review follow-on set)

---

### B06 - Skills: PR review follow-on skill set

> Add `oat-review-pr-provide`, `oat-review-pr-respond`, `oat-review-pr-summarize`.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Low** | Extension of B05. Optional. Only needed after base review workflow is stable and proven. |
| **Effort** | **Medium** | Three additional skills, but contracts are simpler (built on B05 foundation). |
| **Quadrant** | **Avoid / Defer** | |

- **Dependencies:** B05 (base review family must be stable first)
- **Blocked by:** B05
- **Blocks:** Nothing

---

### B07 - Tooling: `oat init ideas` subcommand

> Scaffold `.oat/ideas/` directory + copy `oat-idea-*` skills into project.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **High** | Core distribution mechanism for ideas workflow. Without it, adopting ideas requires manual file copying. Same pattern as B11. |
| **Effort** | **Medium** | Template copying, skill registration, idempotency checks. Follows the same pattern as `oat init workflows`. |
| **Quadrant** | **Quick Win / Strategic** | |

- **Dependencies:** B01 (skills table CLI makes registration automatic)
- **Blocked by:** Soft dependency on B01
- **Blocks:** Nothing directly, but enables idea-to-project flow (B12) in downstream repos

---

### B08 - Skills: Normalize skill naming to namespace model

> Rename all skills to `oat-<domain>-<action>` pattern with compatibility aliases.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **High** | Foundation for a coherent, scalable skill namespace. Every new skill benefits from naming being settled. Prevents painful double-rename later. |
| **Effort** | **High** | Touches every `oat-*` skill directory, AGENTS.md, all templates/docs that reference skill names, and internal-project-reference. Needs compatibility aliases. |
| **Quadrant** | **Strategic** | |

- **Dependencies:** B01 (skills-table CLI makes the AGENTS.md update trivial), B02 (invocation language should be settled first)
- **Blocked by:** B01 (strongly), B02 (moderately)
- **Blocks:** B05 (better to name review skills correctly from the start), B06, B09 (dep intelligence naming)

---

### B09 - Skills: Dependency intelligence skill family

> Analyze `package.json`, compare versions, classify breaking changes, suggest upgrade paths.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Low** | Useful but not core to OAT's value proposition. No items depend on it. |
| **Effort** | **Medium** | API lookups (npm registry), changelog parsing, code usage scanning. Non-trivial but well-scoped. |
| **Quadrant** | **Fill-in / Defer** | |

- **Dependencies:** B08 (naming should be settled for canonical name)
- **Blocked by:** B08
- **Blocks:** Nothing

---

### B10 - Tooling: `oat init workflows` subcommand

> Scaffold `.oat/` directory structure + copy workflow skills into project.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **High** | Core distribution mechanism for the entire OAT workflow. The primary onboarding path for new repos. |
| **Effort** | **Medium** | Similar to B07 but larger scope (more skills, more template dirs). Same implementation pattern. |
| **Quadrant** | **Strategic** | |

- **Dependencies:** B01 (skills table CLI), B08 (naming should ideally be settled before distributing skills)
- **Blocked by:** Soft dependency on B01 and B08
- **Blocks:** Nothing directly, but is the gateway to OAT adoption in other repos

---

### B11 - Skills: Idea-to-project promotion flow

> `oat-project-new` offers to promote summarized ideas; seeds project discovery from idea artifacts.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Medium** | Completes the ideas-to-projects pipeline. Nice workflow continuity. Not blocking other work. |
| **Effort** | **Medium** | Modifies two skills (`oat-project-new`, `oat-idea-summarize`). Needs idea scanning, seeding logic, backlog updates. |
| **Quadrant** | **Strategic** (lower priority) | |

- **Dependencies:** Ideas workflow must be stable (it is)
- **Blocked by:** Nothing strictly; benefits from B08 (naming) being done
- **Blocks:** Nothing

---

### B12 - Tooling: Migrate `new-oat-project.ts` to CLI

> Move project scaffolding from `.oat/scripts/new-oat-project.ts` to `packages/cli/`.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Medium** | Consolidates tooling, improves testability. Script already has migration notes in comments. |
| **Effort** | **Low** | 231 lines of TypeScript. Already well-structured. Flag handling exists. Mostly a move + CLI wiring. |
| **Quadrant** | **Quick Win** | |

- **Dependencies:** None
- **Blocked by:** Nothing
- **Blocks:** B16 (scripts directory removal)

---

### B13 - Tooling: Migrate `validate-oat-skills.ts` to CLI

> Move skill validation from `.oat/scripts/validate-oat-skills.ts` to `packages/cli/`.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Medium** | Consolidates tooling. 132 lines, already TypeScript. Natural fit as `oat validate skills` or part of `oat doctor`. |
| **Effort** | **Low** | Smallest script. Straightforward migration. |
| **Quadrant** | **Quick Win** | |

- **Dependencies:** None
- **Blocked by:** Nothing
- **Blocks:** B16 (scripts directory removal)

---

### B14 - Tooling: Migrate `generate-oat-state.sh` to CLI

> Move state dashboard generation from `.oat/scripts/generate-oat-state.sh` to `packages/cli/`.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Medium** | Largest script (419 lines). Shell-to-TypeScript rewrite improves testability and cross-platform support. |
| **Effort** | **Medium** | Shell script with frontmatter parsing, git state, and template rendering. Rewrite is moderate complexity. |
| **Quadrant** | **Quick Win / Strategic** | |

- **Dependencies:** None
- **Blocked by:** Nothing
- **Blocks:** B16 (scripts directory removal)

---

### B15 - Tooling: Migrate `generate-thin-index.sh` to CLI

> Move thin index generation from `.oat/scripts/generate-thin-index.sh` to `packages/cli/`.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Medium** | 200-line shell script using find/grep/awk. TypeScript rewrite adds testability and cross-platform support. |
| **Effort** | **Medium** | File system traversal logic, git SHA handling, template rendering. Moderate complexity. |
| **Quadrant** | **Quick Win / Strategic** | |

- **Dependencies:** None
- **Blocked by:** Nothing
- **Blocks:** B16 (scripts directory removal)

---

### B16 - Tooling: Remove `.oat/scripts/` directory

> Clean up after all script migrations.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Low** | Pure cleanup. No functional change. |
| **Effort** | **Low** | Delete directory, grep for stale references. Trivial. |
| **Quadrant** | **Fill-in** | |

- **Dependencies:** B12, B13, B14, B15 (all four migrations)
- **Blocked by:** B12, B13, B14, B15
- **Blocks:** Nothing

---

### B17 - Workflow: Backlog Refinement Flow (Jira ticket generation)

> Conversational skill to break initiatives into epics/stories/tasks and create Jira tickets.

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **Low** | Team-specific (Jira). Not core to OAT's value proposition. Still in Inbox with no clear scope. |
| **Effort** | **High** | Conversational interview flow, structured backlog artifact, iterative refinement, Jira API integration. |
| **Quadrant** | **Avoid / Defer** | |

- **Dependencies:** None
- **Blocked by:** Nothing
- **Blocks:** Nothing

---

## 3. Dependency Graph

```
Legend:  ──▶  hard dependency (must complete first)
         - -▶  soft dependency (beneficial but not required)

B01 (skills table CLI)
 │
 ├──▶ B08 (naming normalization) ──▶ B09 (dep intelligence)
 │     │
 │     ├─ -▶ B05 (review family) ──▶ B06 (PR review follow-on)
 │     │
 │     └─ -▶ B10 (init workflows)
 │
 └─ -▶ B07 (init ideas)

B02 (invocation standardization)
 │
 ├──▶ B03 (Codex prompt wrappers)
 │
 └─ -▶ B08 (naming normalization)

B12 (migrate new-oat-project.ts) ──┐
B13 (migrate validate-oat-skills.ts) ──┤
B14 (migrate generate-oat-state.sh) ──┼──▶ B16 (remove scripts dir)
B15 (migrate generate-thin-index.sh) ──┘

B04 (context management)         [independent]
B11 (idea-to-project promotion)  [independent]
B17 (backlog refinement / Jira)  [independent]
```

---

## 4. Parallel Lanes

These are independent work streams that can be tackled concurrently without conflicts.

### Lane A: Foundation & Naming

Sequenced work that establishes the skill/invocation foundation.

```
B01 (skills table CLI)  →  B02 (invocation std)  →  B08 (naming normalization)
      Low effort              Medium effort              High effort
```

**Total estimated effort:** High (cumulative)
**Why this order:** B01 gives you the tool to automate AGENTS.md updates. B02 settles invocation language. B08 uses both to rename everything cleanly.

### Lane B: Script-to-CLI Migrations

Four independent migrations, fully parallelizable with each other.

```
B12 (new-oat-project.ts)     ─┐
B13 (validate-oat-skills.ts)  ─┼─→  B16 (remove scripts dir)
B14 (generate-oat-state.sh)   ─┤
B15 (generate-thin-index.sh)  ─┘
```

**Total estimated effort:** Medium (parallelizable)
**Note:** B12 and B13 are Low effort each; B14 and B15 are Medium. Can be split across sessions or tackled in pairs.

### Lane C: CLI Capability Expansion

Independent CLI features, can be done in any order.

```
B04 (context management)    [Medium effort, standalone]
B07 (init ideas)            [Medium effort, soft dep on B01]
B10 (init workflows)        [Medium effort, soft dep on B01 + B08]
```

**Note:** B07 and B10 benefit from B01 being done (auto-registration). B10 additionally benefits from B08 (distribute correctly-named skills). Recommended to do B07 before B10 since it's a simpler version of the same pattern.

### Lane D: New Workflow Capabilities (Later)

Depends on Lane A completing.

```
B05 (review family)     →  B06 (PR review follow-on)
B09 (dep intelligence)  [after B08]
B11 (idea promotion)    [standalone]
```

### Lane E: Deferred / Low Priority

```
B03 (Codex wrappers)         [after B02, fill-in]
B17 (backlog refinement)     [defer, needs scoping]
```

---

## 5. Recommended Execution Order

### Wave 1: Foundations (unblocks everything else)

| Order | Item | Effort | Rationale |
|---|---|---|---|
| 1a | **B01** - Skills table CLI | Low | Unblocks B08, useful immediately for any skill change |
| 1b | **B02** - Invocation standardization | Medium | Can run in parallel with B01. Settles language before naming migration |
| 1c | **B12** - Migrate `new-oat-project.ts` | Low | Quick win, independent, start script migration lane |
| 1d | **B13** - Migrate `validate-oat-skills.ts` | Low | Quick win, independent, pairs with B12 |

**Parallelism:** B01 + B12 + B13 can run fully in parallel. B02 can start in parallel but is independent.

### Wave 2: Consolidation

| Order | Item | Effort | Rationale |
|---|---|---|---|
| 2a | **B14** - Migrate `generate-oat-state.sh` | Medium | Continue migration lane |
| 2b | **B15** - Migrate `generate-thin-index.sh` | Medium | Continue migration lane |
| 2c | **B04** - Context management commands | Medium | Standalone, useful for CI |
| 2d | **B07** - `oat init ideas` | Medium | Distribution. Soft dep on B01 (done in Wave 1) |

**Parallelism:** B14 + B15 in parallel. B04 and B07 independent of each other and of migrations.

### Wave 3: The Big Rename

| Order | Item | Effort | Rationale |
|---|---|---|---|
| 3a | **B08** - Naming normalization | High | Foundation complete from Wave 1. Do this before adding new skills. |
| 3b | **B16** - Remove scripts directory | Low | Cleanup after Wave 1-2 migrations complete. |

**Note:** B08 is the single largest item. Best done as focused work with B01's skills-table CLI available to automate AGENTS.md updates.

### Wave 4: Capability Expansion

| Order | Item | Effort | Rationale |
|---|---|---|---|
| 4a | **B10** - `oat init workflows` | Medium | Distribution with correctly-named skills |
| 4b | **B05** - Review workflow family | High | Major new capability, correctly named from start |
| 4c | **B11** - Idea-to-project promotion | Medium | Completes ideas pipeline |

**Parallelism:** B10 and B11 can run in parallel. B05 is a larger effort best done focused.

### Wave 5: Extensions & Fill-ins

| Order | Item | Effort | Rationale |
|---|---|---|---|
| 5a | **B03** - Codex prompt wrappers | Low | Fill-in, depends on B02 |
| 5b | **B06** - PR review follow-on skills | Medium | Extension of B05 |
| 5c | **B09** - Dependency intelligence | Medium | New capability, not urgent |

### Deferred

| Item | Rationale |
|---|---|
| **B17** - Backlog refinement / Jira | Needs scoping. Not core to OAT. Revisit when Jira integration demand is clearer. |

---

## 6. Roadmap Alignment

### How backlog items map to roadmap phases

| Roadmap Phase | Status | Backlog Items | Notes |
|---|---|---|---|
| Phase 3: Reviews + PR loop | Completed | B05 extends this (standalone review skills outside project flow) | B05 is an evolution, not a redo |
| Phase 4: Active project + Dashboard | Completed (polish) | B02 (invocation std), B03 (Codex wrappers) | These are the "polish remaining" items |
| Phase 5: Staleness + knowledge drift | Planned | (none in backlog) | No backlog items address this yet |
| Phase 6: Parallel execution + reconcile | Deferred | (none in backlog) | Correctly deferred |
| Phase 7: Quick mode + template rendering | Planned | (none in backlog) | No backlog items address this yet |
| Phase 8: Provider interop CLI | Next | B04 (context mgmt), B07/B10 (init subcommands) | CLI commands extend the existing `oat init/sync/status/doctor` surface |
| Phase 9: Multi-project switching | Later | (none in backlog) | Correctly deferred |
| Phase 10: Memory system | Later | (none in backlog) | Correctly deferred |
| Cross-cutting: Invocation normalization | High priority | B02, B08 | Backlog captures this well |
| Not on roadmap | - | B12-B16 (script migrations), B17 (Jira), B09 (deps), B11 (idea promotion) | Script migrations are infrastructure. Others are new scope. |

### Gaps in the backlog (roadmap items not yet captured)

| Roadmap Item | Phase | Recommendation |
|---|---|---|
| Staleness detection & enforcement improvements | Phase 5 | Add backlog item when dogfood pain is felt |
| Quick mode for small changes | Phase 7 | Add backlog item when full-mode overhead becomes a friction point |
| Repo State Dashboard "first-class" contract | Phase 4 | Partially addressed by B14 (state script migration). Consider adding an explicit item for the contract/spec. |

### Items not on roadmap (new scope in backlog)

| Backlog Item | Recommendation |
|---|---|
| B09 - Dependency intelligence | Add to roadmap as a Phase 8+ optional capability |
| B11 - Idea-to-project promotion | Add to roadmap under Phase 4 polish or as standalone |
| B12-B16 - Script migrations | Add as a "Phase 4.5" or cross-cutting infrastructure block on roadmap |
| B17 - Backlog refinement / Jira | Keep in Inbox. Not roadmap-worthy until scoped. |

---

## 7. Observations & Recommendations

### Strategic observations

1. **The foundation-first thesis is strong.** B01 (skills table CLI) is the single highest-leverage item. It's low effort, unblocks the naming migration, and makes every future skill add/remove/rename a one-command operation. Do this first.

2. **Naming normalization (B08) is the biggest risk.** It touches the most files, has the most potential for breakage, and benefits the most from having B01 and B02 done first. Don't rush it - but don't defer it past Wave 3 either, because every new skill created before it will need renaming.

3. **Script migrations are "free" parallelism.** They have zero dependencies on each other or on the naming/skills work. Start them whenever there's bandwidth. The two TypeScript scripts (B12, B13) are especially quick.

4. **`oat init` commands are the distribution story.** B07 and B10 are how OAT reaches other repos. They're blocked on having skills worth distributing - which means naming should be settled first for `init workflows` (B10), but `init ideas` (B07) can go earlier since idea skills are stable.

5. **Review family (B05) is the biggest new capability** but is best deferred until naming is done. Building three new skills under the old naming scheme and then renaming them is wasted effort.

### Risks

| Risk | Mitigation |
|---|---|
| Naming migration breaks existing workflows/prompts | Compatibility aliases with a migration window (already planned in B08) |
| Script migrations introduce regressions | Write tests for each migrated command before deleting the original script |
| `oat init` distributes stale skill versions | Gate B10 behind naming normalization; version or hash distributed skills |
| Backlog grows faster than execution | Keep Inbox as a holding pen; only promote to Planned with clear scope and acceptance criteria |

### Quick wins to tackle immediately

1. **B01** - Skills table CLI refresh (low effort, high leverage)
2. **B12** - Migrate `new-oat-project.ts` (low effort, already has migration notes)
3. **B13** - Migrate `validate-oat-skills.ts` (lowest effort of all items)

These three can be done in a single focused session and immediately reduce tech debt while unblocking future work.
