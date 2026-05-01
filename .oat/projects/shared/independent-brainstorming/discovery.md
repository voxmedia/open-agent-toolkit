---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-05-01
oat_generated: false
---

# Discovery: independent-brainstorming

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Pick up backlog item **bl-53f0 — Project-independent brainstorming mode** (`.oat/repo/reference/backlog/items/project-independent-brainstorming-mode.md`).

OAT today has two ends of the ideation/execution spectrum:

- **`oat-idea-*` skills** for lightweight idea capture and conversational ideation.
- **`oat-project-*` skills** (full or quick-start) for execution-oriented projects.

There is no first-class "brainstorming mode" in between — a place that:

- starts without committing to a project or even an idea artifact,
- explores an idea conversationally with Superpowers-style structure,
- detects which OAT tool packs are installed and surfaces only the terminal states actually available in this repo,
- always supports two base outcomes (inline-only, write a doc to a user-specified path — including off-repo) so it's useful in any repo,
- and ends in a clean handoff to the right downstream artifact (idea, backlog item, project, etc.) when packs allow.

Acceptance criteria highlights from bl-53f0:

- Always-on activation (proactively offers brainstorming on exploratory phrasing).
- Pack-aware terminal states (only surface outcomes whose packs are installed).
- External / off-repo targets are first-class via the user-specified path mechanism.
- Distinguish lightweight ideation from formal project discovery/design.
- Evaluate skill shape: extend `oat-idea-ideate`, add a new `oat-brainstorm`, or introduce a provider mode.
- Cover both project-level and user-level brainstorming.
- Distinct from `bl-b3f7` (idea-promotion auto-discovery), which works on already-summarized ideas.
- Dogfood scenario per terminal state available in this repo.

## Clarifying Questions

### Question 1: Skill shape

**Q:** Dedicated `oat-brainstorm` skill, extension of `oat-idea-ideate`, or provider-mode handoff via AGENTS.md?
**A:** New dedicated `oat-brainstorm` skill.
**Decision:** Brainstorming gets its own top-level user-invocable skill so its mode assertion (blocked / allowed activities) stays sharp and pack-gating for terminal states is centralized in one place.

### Question 2: Activation model

**Q:** Always-on (proactively offer brainstorming on exploratory phrasing) or user-invocable only?
**A:** Always-on, matching the `superpowers:brainstorming` pattern called out in bl-53f0.
**Decision:** Skill carries an always-on description (`disable-model-invocation: false`) with concrete trigger signals ("I've been thinking about", "what if we did", open-ended design questions). Tightly scoped trigger language is required to avoid over-fire on routine implementation requests.

### Question 3: Active project handling

**Q:** When a project is already active, should brainstorming auto-route to its discovery/design phase, or treat it as one terminal-state option among the others?
**A:** Detect and offer, do not auto-route.
**Decision:** Skill notices the active project, mentions it up front, but treats "feed active project" as one option in the terminal-state picker. User stays in control.

### Question 4: Pack home

**Q:** Which pack ships `oat-brainstorm` — `core`, `ideas`, `workflows`, or a new dedicated pack?
**A:** New dedicated `brainstorm` pack, default-on in `oat init` guided setup.
**Decision:** A new `brainstorm` pack keeps `core` minimal (diagnostics + docs) while still giving the entry point near-universal availability via the default-on init flow. Adds pack plumbing (install / update / remove / list / config-write paths).

### Question 5: Default pack scope

**Q:** Should the `brainstorm` pack always install at user scope (like `core`), be user-eligible with default user scope, or default to project scope?
**A:** User-eligible, default user scope.
**Decision:** Pack mirrors `ideas` / `docs` / `utility` / `research` user-eligible behavior. Default scope is `user` so the always-on trigger works in every directory by default, but users can opt to re-install at project scope or remove entirely if they want per-repo opt-out.

## Solution Space

The backlog item explicitly calls out three architectural shapes to evaluate. Below is the divergent exploration; the chosen direction will be recorded after user validation.

### Approach 1: New dedicated skill — `oat-brainstorm` _(Recommended starting point)_

**Description:** Add a new top-level user-invocable skill (probably named `oat-brainstorm`) that lives alongside `oat-idea-*` and `oat-project-*`. Always-on description (Superpowers-style) so it self-activates on exploratory intent. The skill detects installed packs via `oat config get tools.<pack>` and presents a terminal-state picker filtered to what's available. Always-available outcomes (inline-only, doc-to-user-path) are baked into the skill itself, not gated by any pack. Pack-gated outcomes hand off to `oat-idea-new`/`oat-idea-ideate`/`oat-idea-summarize`/`oat-pjm-add-backlog-item`/`oat-project-new`/`oat-project-discover` rather than reimplementing them.

**When this is the right choice:** When the brainstorming experience differs enough from idea ideation (different blocked/allowed activities, different terminal-state set, no requirement of an active idea or project) that overloading another skill would muddy its mode assertion.

**Tradeoffs:**

- (+) Clean separation of concerns; mode assertion stays sharp for each skill.
- (+) Pack-gating is centralized in one place.
- (+) Always-on description does not bleed into a pack-gated skill — the brainstorming entry point is universally available.
- (–) Adds a new top-level skill; users must learn one more name.
- (–) Some overlap with `oat-idea-ideate` conversational behavior; risk of drift if the two diverge over time.

### Approach 2: Extend `oat-idea-ideate` with a "no active idea" / "pre-idea" mode

**Description:** Generalize `oat-idea-ideate` so it can run without an active idea — entering an exploratory conversation that may end in any of the bl-53f0 terminal states (idea capture, summary, backlog item, project promotion, doc-to-path, inline). The skill's existing flow becomes the "active idea" branch; the new "pre-idea" branch is the brainstorming mode.

**When this is the right choice:** When brainstorming and idea ideation are seen as two endpoints of one spectrum and the user wants a single skill to remember.

**Tradeoffs:**

- (+) No new skill name to learn; reuses existing user mental model.
- (–) `oat-idea-ideate` is in the `ideas` pack — a brainstorming experience that requires the ideas pack to even start contradicts the "always-available base outcomes" requirement.
- (–) Mode assertion gets crowded: idea ideation has tight blocked-activity rules ("no formal requirements", "no implementation detail") that don't fully match brainstorming-to-project paths.
- (–) Always-on activation belongs at a higher level than the ideas pack; promoting `oat-idea-ideate` to always-on would force the ideas pack to be effectively required for the always-on description to fire.

### Approach 3: Provider mode + handoff (no new skill, no extension)

**Description:** Add a provider-mode behavior or top-of-AGENTS.md instruction that recognizes exploratory phrasing and instructs the agent to run a brainstorming conversation that hands off to existing skills (`oat-idea-new`, `oat-pjm-add-backlog-item`, `oat-project-new`, etc.) when ready.

**When this is the right choice:** When the team wants minimal new artifacts and prefers documentation-driven behavior changes.

**Tradeoffs:**

- (+) Zero new skill code.
- (–) No mode assertion enforcement — the conversation has no canonical "brainstorming mode" file the agent loads.
- (–) Pack detection logic gets duplicated across the AGENTS.md prose and any handoff target.
- (–) Always-on activation works via the always-loaded AGENTS.md, but the actual brainstorming behavior (Superpowers-style cadence, terminal-state picker, doc-to-path mechanism) ends up scattered.
- (–) Hard to dogfood: each terminal state has to be re-explained outside the skill system.

### Chosen Direction

**Approach:** Approach 1 — new dedicated `oat-brainstorm` skill, shipped in a new dedicated `brainstorm` pack (user-eligible, default user scope, default-on in `oat init`), with always-on activation and detect-and-offer behavior when a project is already active.
**Rationale:** Keeps mode assertion sharp, centralizes pack-gating, satisfies the "available in any repo" contract via user-scope default, and avoids putting brainstorming behind any feature pack while keeping `core` minimal.
**User validated:** Yes — confirmed across five clarifying questions.

## Options Considered

Granular options within the chosen approach. Items still open at the end of discovery move forward as design or plan-time decisions.

### Option A: Skill name

**Description:** Name of the new always-on brainstorming skill.

**Pros / Cons:**

- `oat-brainstorm` — matches `oat-idea-*`, `oat-project-*` family naming. Concise. (Chosen.)
- `oat-explore` — broader connotation, but conflicts with mental model of "explore = research".
- `oat-think` — too vague.

**Chosen:** `oat-brainstorm`.

### Option B: Pack name

**Description:** Name of the new pack that ships `oat-brainstorm`.

**Pros / Cons:**

- `brainstorm` — singular, matches the skill's verb. Cleanest. (Chosen.)
- `brainstorming` — gerund form, slightly verbose.
- `ideation` — collides with the existing `ideas` pack's mental model.

**Chosen:** `brainstorm`.

## Key Decisions

1. **Skill shape:** new dedicated `oat-brainstorm` skill (Approach 1) for clean mode assertion and centralized pack-gating.
2. **Activation:** always-on description that proactively fires on exploratory signals; tight trigger language required to limit over-fire.
3. **Active-project routing:** detect and offer, do not auto-route. Active project surfaces as one terminal-state option among the rest.
4. **Pack home:** new dedicated `brainstorm` pack rather than expanding `core` or piggy-backing on `ideas` / `workflows`.
5. **Pack scope:** user-eligible, default user scope, default-on in `oat init` guided setup. Mirrors `ideas` / `docs` / `utility` / `research` behavior.
6. **Pack-gating signal:** `oat config get tools.<pack>` (canonical, already used by `oat-project-document`). No directory heuristics.
7. **Always-available base outcomes:** inline-only and write-doc-to-user-path are baked into the skill itself, not gated by any pack.
8. **External / off-repo paths:** first-class destinations through the doc-to-user-path mechanism.
9. **Relationship to `bl-b3f7`:** `bl-53f0` (this project) defines the brainstorming experience; `bl-b3f7` remains the narrower "summarized-idea → project" promotion path. The two are documented as adjacent, not duplicative.

## Key Decisions

_To be filled during discovery._

## Constraints

- Must work in any OAT-initialized repo, including those with **no** packs installed beyond `core`. Always-available base outcomes (inline-only, doc-to-user-path) are mandatory.
- Pack detection must use the canonical `oat config get tools.<pack>` signal (already used by `oat-project-document`), not directory heuristics.
- Must support both project-level and user-level brainstorming (mirrors `oat-idea-*` resolution).
- External / off-repo paths are first-class outcomes — a Stoa vault note, a personal scratchpad, or any absolute path outside the current repo must be acceptable destinations.
- Must not duplicate `bl-b3f7` (idea-promotion-auto-discovery) — that backlog item starts from an already-summarized idea; this one starts earlier.
- Brainstorming mode must remain conversational and lightweight; no implementation work happens inside it. Implementation only happens via downstream `oat-project-*` flows.

## Success Criteria

- A project-independent brainstorming entry point exists with explicit blocked / allowed activities and an always-on description.
- The set of terminal states surfaced to the user is filtered by `oat config get tools.<pack>` checks.
- The two pack-independent outcomes (inline, doc-to-user-path) work in a fresh repo with only `core` installed.
- When the `ideas` pack is installed, the brainstorm can capture / extend / summarize an idea via `oat-idea-*` skills.
- When the `project-management` pack is installed, the brainstorm can produce a scoped backlog item via `oat-pjm-add-backlog-item`.
- When the `workflows` pack is installed, the brainstorm can seed a new project via `oat-project-new` or feed an active project's discovery / design phase.
- External / off-repo destinations are supported by the doc-to-user-path mechanism.
- The relationship to `bl-b3f7` is documented so idea-promotion work doesn't get duplicated.
- At least one dogfood scenario per terminal state available in this repo (this repo has all packs, so all terminal states must be covered).

## Out of Scope

- Implementing `bl-b3f7` (idea-promotion auto-discovery from `oat-project-new`) — that remains a separate backlog item, though the relationship is documented.
- Replacing or deprecating any of the `oat-idea-*` skills — they continue to own conversational idea ideation once an idea exists.
- Provider plan-mode integration beyond the existing import-plan flow.

## Deferred Ideas

- Smarter "active project transition" — automatic detection that an in-flight project's discovery/design phase is the right destination instead of the user choosing it. Defer to a follow-up once basic terminal-state routing works.

## Open Questions

These remain open and will be resolved during design (lightweight) or plan generation:

- **Doc-to-path output format:** is the brainstorming document a structured markdown artifact (overview / approaches / chosen direction / next steps) or free-form prose? Should there be a template under `.oat/templates/` (or a user-scope analogue) for it?
- **Terminal-state picker shape:** flat list of available outcomes vs a recommendation-led picker (e.g., "Looks like the natural fit is X — proceed, or pick a different outcome?"). The recommendation logic would inspect signals like active project, freshness of last idea brainstorm, etc.
- **Trigger language for always-on:** the exact description string that fires the skill. Must be tight enough to avoid over-fire on routine implementation work.
- **Project-level vs user-level brainstorming context:** mirrors `oat-idea-*` `--global` resolution. When the user asks for an idea-pack outcome, the skill should resolve project vs user level the same way `oat-idea-new` does. For doc-to-path outcomes the choice is implicit in the path. Confirm during design.
- **Per-pack default-on behavior in `oat init`:** verify the install plumbing already supports adding a new pack to the default-on set, or capture as a plan task if it requires new code paths.

## Assumptions

- Pack detection via `oat config get tools.<pack>` is reliable in any OAT-initialized repo (verified for `project-management` in `oat-project-document`; the same convention extends to `ideas` and `workflows`).
- The `oat-idea-*`, `oat-pjm-add-backlog-item`, `oat-project-new`, and `oat-project-discover` skills can be invoked as handoffs from a dispatcher skill without modifying them.
- The user's preferred default destination for brainstorming docs varies (vault note, in-repo scratchpad, etc.), so the path picker must accept both relative and absolute paths.

## Risks

- **Skill proliferation confusion:** _Likelihood: Medium / Impact: Medium._ Adding a new top-level skill without crisp boundaries against `oat-idea-ideate` and `oat-project-discover` could confuse users. _Mitigation:_ explicit blocked/allowed activities and a clear "when to use which" section in the skill docs.
- **Always-on noise:** _Likelihood: Medium / Impact: Low._ An always-on brainstorming description could over-fire on questions that are not really exploratory. _Mitigation:_ tight description with concrete signals (matches `superpowers:brainstorming` discipline).
- **Pack-detection drift:** _Likelihood: Low / Impact: Medium._ If `tools.<pack>` ever drifts from reality (e.g., manual filesystem edits), the picker could surface or hide outcomes incorrectly. _Mitigation:_ rely on the same single signal that `oat-project-document` already uses; not this project's responsibility to fix `tools.*` drift.

## Next Steps

After solution space exploration converges, present design-depth decision (straight to plan / lightweight design / promote to spec-driven) per quick-mode workflow.
