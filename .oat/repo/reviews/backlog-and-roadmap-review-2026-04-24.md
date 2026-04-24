# Backlog & Roadmap Review

**Date:** 2026-04-24
**Scope:** All 17 active items under `.oat/repo/reference/backlog/items/` plus curated context from `backlog/index.md` and `backlog/completed.md`
**Roadmap:** `.oat/repo/reference/roadmap.md`
**Purpose:** Prioritize by value/effort, surface dependencies, and recommend an execution sequence

---

## 1. Executive Summary

The backlog contains **17 active items** (2 in-progress, 15 open) spanning **6 themes**:

| Theme                              | Count | Key Observation                                                                                                                          |
| ---------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Workflow UX polish                 | 3     | `bl-af93`, `bl-7e68`, `bl-0738` are all S-sized, dogfood-driven, and independently shippable                                             |
| Provider / instruction sync        | 4     | `bl-28ce`, `bl-c745`, `bl-cbdd`, and parts of `bl-281c` all cluster around sync ergonomics post-ship                                     |
| Project-management workflow family | 3     | `bl-42f9` (in-progress XL), `bl-0ace` (in-progress M with bulk landed), `bl-fb3f` (lifecycle automation policy)                          |
| Control-plane adoption             | 2     | `bl-281c` (skill migration + cloud-env fallback) and `bl-931d` (conditional fast-path) share runtime foundations                         |
| Review loop completion             | 1     | `bl-9fb8` (remote PR review skills) is the last missing piece of the review/PR loop                                                      |
| Directional / later-horizon        | 4     | `bl-f9bd`, `bl-71a1`, `bl-3327`, `bl-ff5d` sit further out — two map to roadmap Phase 5/10, two are orphans without a clear roadmap home |

**Top-line recommendations:**

1. **Batch Wave 1 as a "workflow friction polish" PR set.** `bl-af93`, `bl-7e68`, `bl-0738`, and finishing `bl-0ace` are all S/M, independent, and address pain points that showed up in recent dogfooding. Shipping them together retires four backlog entries in a focused sprint.
2. **Consolidate instruction-sync polish into one mini-project.** `bl-28ce`, `bl-c745`, and `bl-cbdd` all touch the same sync surface and the same recently-shipped feature area. Treating them as one scoped follow-up avoids three separate design/testing loops on overlapping code.
3. **Make `bl-281c` the next strategic thread.** It delivers cloud-environment parity (an implicit blocker for remote agent use), retires a large amount of per-skill bootstrap duplication, and produces the measurements that gate `bl-931d`.

---

## 2. Item Catalog

### Rating Key

| Rating     | Value                                                                          | Effort                                           |
| ---------- | ------------------------------------------------------------------------------ | ------------------------------------------------ |
| **High**   | Unblocks other items, daily workflow impact, or product milestone prerequisite | > 3 days, high complexity, or touches many files |
| **Medium** | Improves quality/consistency but not blocking                                  | 1-3 days, moderate complexity                    |
| **Low**    | Nice-to-have or future-facing                                                  | < 1 day, straightforward, isolated change        |

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

### bl-42f9 — Add first-class OAT project/repo management workflow family

> Formalize backlog capture, reference refresh, decision-record maintenance, and artifact cleanup into a first-class PM workflow family.

| Dimension    | Rating        | Rationale                                                                                          |
| ------------ | ------------- | -------------------------------------------------------------------------------------------------- |
| **Value**    | **High**      | Umbrella initiative that several other items roll under; in-progress and actively shaping PM flows |
| **Effort**   | **High**      | XL initiative with cross-cutting scope (skills, CLI, config, artifact policy)                      |
| **Quadrant** | **Strategic** |                                                                                                    |

- **Dependencies:** Soft-depends on `bl-0ace` (completion-state primitives) landing cleanly before automation surfaces expand.
- **Blocked by:** Nothing
- **Blocks:** `bl-fb3f` (lifecycle automation builds on PM-family surfaces); umbrella for `bl-7e68`, `bl-b3f7` workflow polish

---

### bl-af93 — Add `oat config unset <key>` command

> Add a first-class CLI verb for removing config values; enum workflow keys have no existing "unset" path short of hand-editing JSON.

| Dimension    | Rating        | Rationale                                                                                                         |
| ------------ | ------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Value**    | **High**      | Dogfooded gap — surfaced within minutes of using workflow preferences; blocks clean preference experimentation    |
| **Effort**   | **Low**       | S, detailed implementation sketch already in item (new command handler under `packages/cli/src/commands/config/`) |
| **Quadrant** | **Quick Win** |                                                                                                                   |

- **Dependencies:** None — config surface is stable, pattern mirrors existing `get`/`set`/`list`.
- **Blocked by:** Nothing
- **Blocks:** Nothing hard; unblocks clean iteration on workflow preference keys

---

### bl-fb3f — Configurable autonomous project lifecycle follow-through

> Let the workflow continue deterministically past review→fix and final-review→PR boundaries when policy allows.

| Dimension    | Rating        | Rationale                                                                                        |
| ------------ | ------------- | ------------------------------------------------------------------------------------------------ |
| **Value**    | **High**      | Compounds per project — every automation seam removed saves manual prompts on every workflow run |
| **Effort**   | **High**      | L with policy/config design, multiple lifecycle hooks across receive/PR/complete surfaces        |
| **Quadrant** | **Strategic** |                                                                                                  |

- **Dependencies:** Soft on `bl-0ace` (needs clean CLI-owned completion primitives before layering policy on top).
- **Blocked by:** `bl-0ace` (soft)
- **Blocks:** Expansions of `bl-42f9` automation surface

---

### bl-3327 — Add dependency intelligence skill family

> New skill family (`oat-dep-audit`/`oat-dep-plan-upgrade`/etc.) for upgrade-risk analysis and code-impact classification.

| Dimension    | Rating            | Rationale                                                                                                     |
| ------------ | ----------------- | ------------------------------------------------------------------------------------------------------------- |
| **Value**    | **Medium**        | Useful but speculative — no explicit dogfood demand, standalone skill set, narrow touchpoint with current OAT |
| **Effort**   | **High**          | L — new skill family, changelog/impact analysis is non-trivial                                                |
| **Quadrant** | **Avoid / Defer** |                                                                                                               |

- **Dependencies:** None structural
- **Blocked by:** Nothing
- **Blocks:** Nothing

---

### bl-b3f7 — Idea promotion and auto-discovery in `oat-project-new`

> Promote summarized ideas into projects, seed discovery with prior idea context, archive the idea with `promoted to project`.

| Dimension    | Rating        | Rationale                                                                                                        |
| ------------ | ------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Value**    | **Medium**    | Roadmap-aligned (Phase 7); ergonomic rather than blocking; reduces context-reexplanation in idea→project handoff |
| **Effort**   | **Medium**    | L-claimed but mostly skill glue — detects existing idea files, threads summary into discovery, archives entry    |
| **Quadrant** | **Strategic** |                                                                                                                  |

- **Dependencies:** None new — `oat-idea-summarize` and `oat-project-discover` are both shipped.
- **Blocked by:** Nothing
- **Blocks:** Nothing hard

---

### bl-c745 — Per-`CLAUDE.md` adoption opt-out for instruction sync

> Let users keep some `CLAUDE.md` files Claude-only without having them promoted into canonical `AGENTS.md`.

| Dimension    | Rating        | Rationale                                                                                                       |
| ------------ | ------------- | --------------------------------------------------------------------------------------------------------------- |
| **Value**    | **Medium**    | Closes an escape-hatch gap in the recently shipped instruction-sync feature; guards against surprising adoption |
| **Effort**   | **Medium**    | M, design-heavy first (`--adopt-strays` vs path-based vs sentinel); implementation is modest once chosen        |
| **Quadrant** | **Strategic** |                                                                                                                 |

- **Dependencies:** Benefits from landing after `bl-28ce` so the persisted strategy and opt-out controls land as a coherent set.
- **Blocked by:** `bl-28ce` (soft — design coherence)
- **Blocks:** Nothing

---

### bl-9fb8 — PR review follow-on skills (provide-remote / respond-remote / summarize-remote)

> Companion skills for posting OAT review findings to GitHub PRs, responding to resolved threads, and generating PR summaries.

| Dimension    | Rating        | Rationale                                                                                                             |
| ------------ | ------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Value**    | **Medium**    | Completes the review/PR loop remote story; local receive-remote flows already work, so this is the last missing piece |
| **Effort**   | **High**      | L — three skill pairs (provide, respond, summarize) × (project, ad-hoc); each needs GitHub confirmation flow          |
| **Quadrant** | **Strategic** |                                                                                                                       |

- **Dependencies:** None new — receive-remote family shipped, PR loop in place.
- **Blocked by:** Nothing
- **Blocks:** Nothing

---

### bl-ff5d — Backlog refinement flow (Jira ticket generation)

> Structured interview flow that decomposes initiatives into epics/stories/tasks and pushes them to Jira.

| Dimension    | Rating            | Rationale                                                                                            |
| ------------ | ----------------- | ---------------------------------------------------------------------------------------------------- |
| **Value**    | **Low**           | Jira-specific; narrow audience; no obvious dogfood pain point; duplicates existing Atlassian tooling |
| **Effort**   | **High**          | L — new workflow + Jira integration + iterative refinement UX                                        |
| **Quadrant** | **Avoid / Defer** |                                                                                                      |

- **Dependencies:** External (Jira / Atlassian CLI)
- **Blocked by:** Nothing
- **Blocks:** Nothing

---

### bl-7e68 — Clarify quick-mode resume routing from `oat-project-plan`

> Make the quick-mode stop in `oat-project-plan` read as continuation via `oat-project-quick-start`, not a dead end. Copy + routing consistency across `oat-project-plan`, `oat-project-progress`, `oat-project-next`.

| Dimension    | Rating        | Rationale                                                          |
| ------------ | ------------- | ------------------------------------------------------------------ |
| **Value**    | **High**      | Direct friction users hit today; fix-before-broader-PM-work        |
| **Effort**   | **Low**       | S — message and routing consistency across three skills plus tests |
| **Quadrant** | **Quick Win** |                                                                    |

- **Dependencies:** None
- **Blocked by:** Nothing
- **Blocks:** Nothing

---

### bl-0738 — Reasoning-budget guidance for phase-subagent dispatch

> Fix-model, vary-thinking-depth policy for `oat-phase-implementer`; portable mapping to Codex `reasoning_effort` and Claude thinking budget, precedence rules, and minimal skill/agent/template edits.

| Dimension    | Rating        | Rationale                                                                                                |
| ------------ | ------------- | -------------------------------------------------------------------------------------------------------- |
| **Value**    | **Medium**    | Policy clarity that affects every phase dispatch; low-risk because CLI helper is explicitly out of scope |
| **Effort**   | **Low**       | S — prompt/skill/template guidance only; no code or CLI surface                                          |
| **Quadrant** | **Quick Win** |                                                                                                          |

- **Dependencies:** None
- **Blocked by:** Nothing
- **Blocks:** Nothing

---

### bl-281c — Migrate skills to control-plane-backed CLI with cloud-env fallback

> Replace manual `state.md`/`plan.md` parsing in read-only skills with `oat project status --json` etc.; add consistent `npx @open-agent-toolkit/cli` fallback for environments without `oat` installed.

| Dimension    | Rating        | Rationale                                                                                                                                      |
| ------------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**    | **High**      | Cloud-env parity is an implicit blocker for remote agent use; retires large amount of skill bootstrap duplication; produces `bl-931d` evidence |
| **Effort**   | **High**      | L — multiple skill surfaces + convention + smoke-test + docs                                                                                   |
| **Quadrant** | **Strategic** |                                                                                                                                                |

- **Dependencies:** Uses shipped control-plane package (PR #38).
- **Blocked by:** Nothing
- **Blocks:** `bl-931d` (provides the measurement baseline to justify a fast-path)

---

### bl-0ace — Move `oat-project-complete` state mutations into a CLI helper

> Delegate `state.md` completion mutations (frontmatter + body) to a CLI-owned helper instead of encoding them in the skill body.

| Dimension    | Rating        | Rationale                                                                                                                                            |
| ------------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**    | **Medium**    | Mostly de-risking drift between skill copy and CLI behavior; implementation note indicates core helper (`oat project complete-state`) already landed |
| **Effort**   | **Low**       | M-claimed but largely done — remaining is verification, test coverage, and skill-side delegation cleanup                                             |
| **Quadrant** | **Quick Win** |                                                                                                                                                      |

- **Dependencies:** Already depends on archive-utils (shipped).
- **Blocked by:** Nothing
- **Blocks:** `bl-fb3f` (soft — lifecycle automation is cleaner on top of a stable completion primitive)

---

### bl-cbdd — Optional Codex prompt-wrapper generation for synced OAT skills

> Opt-in generation of minimal `.codex/prompts/` wrappers for `oat-*` skills so Codex users can invoke them as slash prompts.

| Dimension    | Rating      | Rationale                                                                               |
| ------------ | ----------- | --------------------------------------------------------------------------------------- |
| **Value**    | **Low**     | Provider ergonomics for one provider; opt-in only; narrow audience                      |
| **Effort**   | **Medium**  | M — template + opt-in flag + sync hook; must stay thin to avoid duplicating skill logic |
| **Quadrant** | **Fill-in** |                                                                                         |

- **Dependencies:** Codex TOML sync (shipped); should reuse canonical agent parser.
- **Blocked by:** Nothing
- **Blocks:** Nothing

---

### bl-28ce — Persist instruction sync strategy in config and expose in `oat init`

> Dedicated `sync.instructions.defaultStrategy` (or equivalent) config key; CLI → config → fallback precedence; guided-setup prompt.

| Dimension    | Rating        | Rationale                                                                                                         |
| ------------ | ------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Value**    | **Medium**    | Discoverability + ergonomics follow-on to the shipped instruction-sync feature; blocks clean design for `bl-c745` |
| **Effort**   | **Medium**    | M — new config key + precedence + init prompt + docs                                                              |
| **Quadrant** | **Strategic** |                                                                                                                   |

- **Dependencies:** Instruction sync (shipped).
- **Blocked by:** Nothing
- **Blocks:** `bl-c745` (soft — design coherence)

---

### bl-f9bd — Staleness and knowledge-drift upgrades

> Diff-based staleness detection in addition to age + file/line counts; strict blocking mode; documented thresholds and edge cases.

| Dimension    | Rating        | Rationale                                                                |
| ------------ | ------------- | ------------------------------------------------------------------------ |
| **Value**    | **Medium**    | Roadmap Phase 5; proactive hardening rather than an immediate pain point |
| **Effort**   | **High**      | L — diff-based detection, strict mode, thorough edge-case documentation  |
| **Quadrant** | **Strategic** |                                                                          |

- **Dependencies:** None
- **Blocked by:** Nothing
- **Blocks:** Nothing

---

### bl-71a1 — Memory system and provider enhancements

> `.oat/memory/` surface for cross-session context and learned patterns; expanded provider capability matrix and provider-specific features.

| Dimension    | Rating            | Rationale                                                                                    |
| ------------ | ----------------- | -------------------------------------------------------------------------------------------- |
| **Value**    | **Low**           | Roadmap Phase 10; directional "later" work; explicitly gated behind Phase 8/9 proof in usage |
| **Effort**   | **High**          | XL initiative                                                                                |
| **Quadrant** | **Avoid / Defer** |                                                                                              |

- **Dependencies:** Soft — expects Phase 8/9 work stable first.
- **Blocked by:** Roadmap ordering
- **Blocks:** Nothing

---

### bl-931d — Optimize control-plane `listProjects()` summary fast path

> Conditional: introduce a lighter-weight summary path only if measurements show the current full-state assembly is too expensive for real repos.

| Dimension    | Rating            | Rationale                                                                                            |
| ------------ | ----------------- | ---------------------------------------------------------------------------------------------------- |
| **Value**    | **Low**           | Conditional — undefined until measured; architectural complexity without evidence would be premature |
| **Effort**   | **Medium**        | M — measurement + optional fast path + contract-preserving refactor                                  |
| **Quadrant** | **Avoid / Defer** |                                                                                                      |

- **Dependencies:** Needs measurement baseline, which grows as more skills use `listProjects()`.
- **Blocked by:** `bl-281c` (soft — more callers enable better measurement)
- **Blocks:** Nothing

---

## 3. Dependency Graph

```
Legend:  ──▶  hard dependency (must complete first)
         - -▶  soft dependency (beneficial but not required)

bl-42f9 (PM workflow initiative, in-progress)
    ├- -▶ bl-0ace (completion-state helper polish)
    ├- -▶ bl-7e68 (quick-mode routing polish)
    └- -▶ bl-b3f7 (idea promotion)

bl-0ace - -▶ bl-fb3f (lifecycle follow-through)

bl-28ce (persist instruction sync strategy)
    └- -▶ bl-c745 (per-CLAUDE.md adoption opt-out)

bl-281c (skill migration + cloud-env fallback)
    └- -▶ bl-931d (conditional fast-path, needs measurement baseline)

Independent:
  bl-af93   [config unset]
  bl-0738   [reasoning-budget guidance]
  bl-9fb8   [PR review remote]
  bl-cbdd   [Codex prompt wrapper]
  bl-f9bd   [staleness upgrades]
  bl-3327   [dependency intelligence]
  bl-ff5d   [Jira refinement]
  bl-71a1   [memory system]
```

---

## 4. Parallel Lanes

These are independent work streams that can be tackled concurrently without conflicts.

### Lane A: Workflow UX polish

Fast, independent paper-cuts surfaced in dogfooding. Each can be a solo PR in a day.

```
bl-af93  ──▶  bl-7e68  ──▶  bl-0738
(or any ordering — fully independent)
```

**Total estimated effort:** Low (3×S)
**Cross-lane dependencies:** None. Best shipped as a single "workflow friction polish" batch to amortize review.

### Lane B: Instruction sync polish

Tight cluster around the shipped instruction-sync feature. Design decisions in `bl-28ce` naturally inform `bl-c745`.

```
bl-28ce  ──▶  bl-c745
                 - -▶  bl-cbdd (can also lead; unrelated to CLAUDE.md adoption)
```

**Total estimated effort:** Medium-High (M + M + M)
**Cross-lane dependencies:** `bl-cbdd` is functionally independent but shares the "provider sync ergonomics" surface — good to land in the same area.

### Lane C: PM workflow family

Umbrella initiative plus its adjacent follow-ons.

```
bl-0ace (finish polish)  ──▶  bl-fb3f (lifecycle follow-through)
                                    ├▶ continues into bl-42f9 scope
bl-42f9 (ongoing umbrella)  ◀- - - -┘
```

**Total estimated effort:** High (M + L + XL umbrella)
**Cross-lane dependencies:** `bl-7e68` and `bl-b3f7` are PM-adjacent but can run independently if not rolled into this lane.

### Lane D: Control-plane adoption

```
bl-281c (migration + cloud-env fallback)  ──▶  bl-931d (conditional fast-path)
```

**Total estimated effort:** High (L) with conditional M tail
**Cross-lane dependencies:** `bl-931d` cannot profitably start without `bl-281c`'s measurement baseline.

### Lane E: Review loop remote skills

```
bl-9fb8 (provide-remote / respond-remote / summarize-remote)
```

**Total estimated effort:** High (L)
**Cross-lane dependencies:** None — shippable anytime.

### Lane F: Long horizon / roadmap

```
bl-f9bd  (Phase 5 staleness)
bl-71a1  (Phase 10 memory)
bl-3327  (dependency intelligence — no roadmap home)
bl-ff5d  (Jira — no roadmap home)
```

**Total estimated effort:** Very High (L + XL + L + L)
**Cross-lane dependencies:** None; treat as separate decisions about roadmap horizon.

---

## 5. Recommended Execution Order

### Wave 1: Workflow friction polish (days)

| Order | Item                                         | Effort | Rationale                                                                                |
| ----- | -------------------------------------------- | ------ | ---------------------------------------------------------------------------------------- |
| 1a    | **bl-af93** — config unset                   | Low    | Dogfooded gap; detailed sketch already in item; retires a sharp UX paper-cut immediately |
| 1b    | **bl-7e68** — quick-mode routing clarity     | Low    | Direct friction users hit today; copy/routing fix across three skills                    |
| 1c    | **bl-0738** — reasoning-budget guidance      | Low    | Skill/template guidance only; no code; unblocks consistent phase-dispatch policy         |
| 1d    | **bl-0ace** — finish completion-state helper | Low-M  | Mostly landed; remaining is delegation + test coverage; naturally feeds into Wave 3      |

**Parallelism:** All four are independent; can run as separate PRs in parallel or one bundled "workflow friction polish" PR.

### Wave 2: Instruction sync polish (1-2 weeks)

| Order | Item                                            | Effort | Rationale                                                                                 |
| ----- | ----------------------------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| 2a    | **bl-28ce** — persist instruction sync strategy | Med    | Foundation — establishes the config surface that `bl-c745` decisions need                 |
| 2b    | **bl-c745** — per-CLAUDE.md adoption opt-out    | Med    | Designed against `bl-28ce`'s config surface; closes the recent instruction-sync follow-up |
| 2c    | **bl-cbdd** — Codex prompt-wrapper generation   | Med    | Provider ergonomics; independent but thematically in the same sync surface                |

**Parallelism:** `bl-cbdd` can run in parallel with 2a/2b. `bl-28ce` → `bl-c745` is sequential for design coherence.

### Wave 3: Strategic enablement (2-4 weeks)

| Order | Item                                                       | Effort | Rationale                                                                               |
| ----- | ---------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------- |
| 3a    | **bl-281c** — control-plane migration + cloud-env fallback | High   | Enables cloud-env usage, retires bootstrap duplication, produces baseline for `bl-931d` |
| 3b    | **bl-b3f7** — idea promotion in `oat-project-new`          | Med    | Roadmap Phase 7 ergonomic improvement; independent of 3a                                |

**Parallelism:** Both run concurrently.

### Wave 4: Automation + review completeness (3-6 weeks)

| Order | Item                                              | Effort | Rationale                                                                                         |
| ----- | ------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| 4a    | **bl-fb3f** — lifecycle follow-through automation | High   | Builds on stable completion primitives from `bl-0ace`; multiplies per-project workflow efficiency |
| 4b    | **bl-9fb8** — remote PR review follow-on skills   | High   | Completes the review/PR loop story; last missing piece after receive-remote family                |

**Parallelism:** Both run concurrently.

### Wave 5: Roadmap horizon advancement (when capacity allows)

| Order | Item                                               | Effort | Rationale                                                     |
| ----- | -------------------------------------------------- | ------ | ------------------------------------------------------------- |
| 5a    | **bl-f9bd** — staleness / knowledge-drift upgrades | High   | Roadmap Phase 5; proactive hardening for higher-risk OAT uses |

### Deferred

| Item                                           | Rationale                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------ |
| **bl-42f9** — PM workflow family (in-progress) | Continue in place via active PM project; not a discrete wave                   |
| **bl-931d** — listProjects fast path           | Wait for measurement evidence from `bl-281c` adoption                          |
| **bl-3327** — dependency intelligence          | Speculative; no roadmap home; revisit when dogfooding surfaces explicit demand |
| **bl-ff5d** — Jira refinement flow             | Narrow audience, no roadmap home; decide whether to keep or archive            |
| **bl-71a1** — memory system                    | Roadmap Phase 10; wait for Phase 8/9 proven in usage                           |

---

## 6. Roadmap Alignment

### How backlog items map to roadmap phases

| Roadmap Phase / Area                                 | Status                         | Backlog Items                              | Notes                                                                                      |
| ---------------------------------------------------- | ------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Phase 4 polish: Active project lifecycle + Dashboard | Completed (polish remaining)   | `bl-42f9`, `bl-0ace`, `bl-fb3f`            | PM workflow family is the polish channel; `bl-0ace` is a completion primitive              |
| Phase 5: Staleness + knowledge drift                 | Planned                        | `bl-f9bd`                                  | Direct 1:1 alignment                                                                       |
| Phase 6: Parallel execution + reconcile              | Deferred (groundwork expanded) | _(none)_                                   | Groundwork shipped (subagent orchestration); no active item for parallel fan-out contracts |
| Phase 7: Quick mode + template rendering helper      | In Progress                    | `bl-7e68`, `bl-b3f7`, `bl-0ace`            | Quick-mode routing polish + idea promotion; template rendering helper not yet in backlog   |
| Phase 8: Provider interop + sync manifest            | In Progress                    | `bl-28ce`, `bl-c745`, `bl-cbdd`, `bl-281c` | Largest active cluster; all four extend shipped provider/instruction sync surfaces         |
| Control-plane follow-through                         | Planned                        | `bl-931d`, `bl-281c`                       | `bl-281c` drives adoption; `bl-931d` is conditional                                        |
| Phase 9: Multi-project switching + branch awareness  | Later                          | _(none)_                                   | No active item                                                                             |
| Phase 10: Memory system + provider enhancements      | Later                          | `bl-71a1`                                  | Direct 1:1 alignment                                                                       |
| Cross-cutting: skill invocation normalization        | Completed (guardrails ongoing) | _(none — handled via validation)_          | Retired items live in `completed.md`                                                       |

### Gaps: Roadmap items without backlog coverage

| Roadmap Item                                             | Phase   | Recommendation                                                                                                   |
| -------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------- |
| Template rendering helper (`oat template render ...`)    | Phase 7 | **Add backlog item** — the only remaining Phase 7 deliverable per roadmap; currently not tracked                 |
| Parallel fan-out execution contracts + reconcile tooling | Phase 6 | **Add backlog item(s)** once Phase 6 is de-deferred; groundwork is done, contracts are not                       |
| Repo State Dashboard "first-class" contract polish       | Phase 4 | Rolls under `bl-42f9`; consider extracting into its own item if scope grows                                      |
| Multi-project switching + branch awareness               | Phase 9 | No coverage — acceptable for "Later" horizon, but flag if demand surfaces                                        |
| Expanded provider capability matrix + provider hardening | Phase 8 | Partially covered by `bl-cbdd` + `bl-c745`; the broader matrix documentation work is not tracked as its own item |

### Orphans: Backlog items not on the roadmap

| Backlog Item                            | Recommendation                                                                                                          |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **bl-af93** — config unset              | Add under Phase 8 ergonomics or leave as CLI-polish orphan; value is high regardless                                    |
| **bl-0738** — reasoning-budget guidance | Add under Phase 6 (subagent orchestration) or Phase 8 (provider capabilities); item is provider-portable                |
| **bl-fb3f** — lifecycle follow-through  | Add under Phase 4 polish or create a new "Lifecycle automation" thread; material enough to be roadmap-visible           |
| **bl-9fb8** — PR review remote skills   | Add as Phase 3 extension ("Reviews + PR Loop") or under Phase 8 provider ergonomics — this closes the review loop story |
| **bl-3327** — dependency intelligence   | Either commit to a home (e.g., a new "Repo intelligence" area) or mark as directional-later and archive if inactive     |
| **bl-ff5d** — Jira refinement flow      | Same — commit or archive; currently has no roadmap home                                                                 |

### Status consistency check

- Roadmap claims Phase 8 is "In Progress" with "lifecycle polish remains" — backlog confirms this; four active items trace to it.
- Roadmap claims Phase 7 is "In Progress" with "template rendering helper still planned" — this item is **not** in the backlog and should be added if it's a real deliverable.
- `backlog/index.md` curated overview references `bl-42f9` as "currently being delivered through the active local-project-management project," but the active projects under `.oat/projects/shared/` are `docs-readability-reorg` and `remote-project-management`. The index note appears stale and should be refreshed.

---

## 7. Observations & Recommendations

### Strategic observations

1. **Dogfood-derived quick wins are concentrated.** Wave 1 (4 items) captures the entire near-term "workflow friction" pain surface. Shipping them as one batch is the fastest way to retire recent dogfood findings.
2. **Phase 8 (provider interop + sync manifest) is the largest active cluster.** Four items (`bl-28ce`, `bl-c745`, `bl-cbdd`, `bl-281c`) all extend shipped provider/instruction sync surfaces. Treating the non-`bl-281c` trio as one mini-project prevents three overlapping design loops on the same code.
3. **`bl-42f9` is an umbrella that partially absorbs other items.** `bl-0ace` and `bl-fb3f` are functionally PM-family work. As the initiative matures, consider rolling them into its plan or extracting explicit sub-items.
4. **The backlog is generally well-scoped and dogfood-driven** — most items have clear acceptance criteria, explicit out-of-scope notes (e.g., `bl-0738` defers a CLI helper unless evidence demands it), and link to the surface they modify. This is healthy backlog hygiene.
5. **Two items are at risk of bit-rot** — `bl-3327` (dependency intelligence) and `bl-ff5d` (Jira) have no clear roadmap home, no active demand, and have been open since 2026-01/02. Either commit or archive.
6. **Roadmap has two concrete gaps that should become items** — Phase 7's template rendering helper and Phase 6's parallel fan-out contracts both appear in the roadmap but have no corresponding backlog file.

### Risks

| Risk                                                                                                     | Mitigation                                                                                                             |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `bl-42f9` is an XL in-progress initiative without an explicit plan link — scope drift is likely          | Audit the `local-project-management` → current active project link; refresh `index.md` curated note                    |
| Three instruction-sync items (`bl-28ce`, `bl-c745`, `bl-cbdd`) could each drift if shipped independently | Treat as a single "instruction-sync polish" mini-project with one design doc                                           |
| `bl-0ace` labeled `in_progress` but implementation note says the helper already shipped                  | Close the remaining delegation/test work and move to `completed.md`, or explicitly scope the "polish" tail in its plan |
| `bl-931d` risks being built without evidence                                                             | Keep the conditional contract: no implementation until `bl-281c` produces measurement baseline                         |
| Orphans `bl-3327` and `bl-ff5d` have been open 2-3 months without motion                                 | Archive if no champion; or promote into roadmap with explicit horizon                                                  |
| Roadmap Phase 7/6 gaps have no backlog coverage                                                          | Add explicit backlog items for template rendering helper and parallel fan-out contracts                                |

### Quick wins to tackle immediately

1. **bl-af93** — `oat config unset` (S, retires a dogfooded CLI gap; sketch already complete)
2. **bl-7e68** — quick-mode routing clarity (S, copy/UX fix users hit today)
3. **bl-0738** — reasoning-budget guidance (S, no-code policy update; ships with template tweaks only)
4. **bl-0ace** — finish the completion-state CLI helper tail (M, largely landed; retire the `in_progress` label)
