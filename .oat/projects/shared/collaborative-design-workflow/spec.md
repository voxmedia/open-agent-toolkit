---
oat_status: complete
oat_ready_for: oat-project-design
oat_blockers: []
oat_last_updated: 2026-04-17
oat_generated: false
---

# Specification: collaborative-design-workflow

## Phase Guardrails (Specification)

Specification is for requirements and acceptance criteria, not design/implementation details.

- Avoid concrete deliverables (specific scripts, file paths, function names).
- Keep the "High-Level Design" section to architecture shape and component boundaries only.
- If a design detail comes up, record it under **Open Questions** for `oat-project-design`.

## Problem Statement

OAT's spec-driven workflow (discovery → spec → design → plan) and quick-start workflow both suffer from the same underlying gap: **design feels mechanical, not collaborative.** Users observe that:

- `oat-project-design` drafts ~12 technical sections (architecture, components, data models, APIs, security, performance, error handling, testing, deployment, migrations, phases, risks) cold from the spec and presents them all at once for review (Step 18). There is no opportunity to course-correct at each design decision, and no divergent "here are 2-3 ways we could do this" presentation inside the design conversation.
- `oat-project-quick-start` has a useful section-by-section interactive pattern in Step 2.75 (lightweight design), but this pattern is only reachable when the user opts into lightweight design — which itself is auto-bypassed for well-understood requests. As a result, most quick-start runs produce a plan without ever experiencing the collaborative pattern.
- The standalone `oat-project-spec` phase creates a hard boundary between discovery and design: discovery builds understanding through conversation, then hands off to spec (which drafts formalized requirements cold), which hands off to design (which drafts technical sections cold). Each boundary resets conversational context.

The target experience is drawn from Obra's Superpowers `brainstorming` skill: section-by-section presentation with incremental validation, divergent "2-3 approaches" at real decision points, and a single continuous conversation from initial request to written design. Users want this _by default_, but also want a **draft-and-review escape hatch** for sessions where they'd rather have the agent draft the full design and have them (or a peer reviewer like Codex/Opus) critique it holistically.

The change is bounded: rework `oat-project-design`, `oat-project-quick-start`, and `oat-project-spec`; touch `oat-project-discover` only to update routing language; leave plan/implement/review skills alone.

See `discovery.md` for the decision trail and `reference/comparative-analysis.md` for the side-by-side comparison that grounds every decision.

## Goals

### Primary Goals

- Make design feel like a collaborative conversation by default, using section-by-section presentation with user validation at each step.
- Introduce divergent thinking (2-3 approaches with tradeoffs + recommendation) at real architectural decision points _inside_ the design skill, not only at the project level in discovery.
- Fold spec authoring into the design skill's conversational flow so users experience one continuous conversation, with `spec.md` produced as a byproduct (not a separate phase).
- Preserve a **draft-and-review** escape hatch mode for users who prefer holistic review, either directly or via independent peer review.
- Apply the same collaborative/draft-and-review mode choice to quick-start's lightweight design path.
- Add a brief conversational requirements-confirmation gate to the quick-start straight-to-plan path to catch unexamined assumptions without meaningfully slowing the flow.

### Secondary Goals

- Port the Superpowers-style design self-review (placeholder / consistency / scope / ambiguity — fix inline) into the design skill.
- Soften the HiLL approval prompt to explicitly invite the user to read the committed artifact.
- Make the YAGNI principle explicit in the design skill's guardrails.
- Reposition `oat-project-spec` as a standalone utility (no longer auto-routed from discovery or referenced as a pipeline step).
- Make the full OAT workflow usable end-to-end by an unattended Claude agent orchestrator via reliable non-interactive fallback (FR9).

## Non-Goals

- No changes to `oat-project-plan`, `oat-project-plan-writing`, `oat-project-implement`, `oat-project-subagent-implement`, or any post-design skill.
- No deletion of `oat-project-spec` — it persists as a standalone utility.
- No merging of `spec.md` and `design.md` into a single artifact. Authorship merges; artifacts remain distinct.
- No changes to `oat-project-import-plan` or the import workflow.
- No adoption of Superpowers' "every project must go through full design" hard gate — OAT's `ceremony scales with complexity` stance is preserved.
- No adoption of Superpowers' `verification-before-completion` discipline. Separate initiative.
- No visual companion / browser-based mockup tooling. Separate initiative.
- No automation of peer review (Codex/Opus) from inside the design skill. Users invoke review manually.
- No new HiLL checkpoints; only folding existing spec HiLL semantics into design HiLL.
- No generalization of the collaborative/draft-and-review mode choice to skills outside design and quick-start.
- No sub-project decomposition advisory inside design — detection already happens in discovery; codified split-escape-hatch is a follow-up project.

## Requirements

### Functional Requirements

**FR1: Design skill offers mode choice at start**

- **Description:** The `oat-project-design` skill must present a mode-choice prompt at the top of its flow, letting the user choose between **Collaborative** (section-by-section with options at decision points) and **Draft-and-review** (full draft generated up front, user reviews holistically). An optional skill argument (e.g., `--mode collaborative|draft`) must be supported as an override.
- **Acceptance Criteria:**
  - Runtime prompt presents both options with a recommendation (default: Collaborative).
  - Optional argument `--mode collaborative` or `--mode draft` skips the prompt and forces the mode.
  - If the user picks Draft-and-review, the skill proceeds to FR8 behavior.
  - If the user picks Collaborative (or the default), the skill proceeds to FR2 behavior.
- **Priority:** P0

**FR2: Collaborative mode presents sections incrementally with validation**

- **Description:** In Collaborative mode, the design skill must present each major design section (architecture, components, data models, APIs, security, performance, error handling, testing, deployment, migrations, phases, risks) one at a time, ask the user whether it looks right, and incorporate feedback before moving to the next section.
- **Acceptance Criteria:**
  - Each section is drafted, presented, and explicitly validated before the next section begins.
  - The validation prompt wording is warm and specific (e.g., "Does this architecture look right, or should we adjust before continuing?").
  - User feedback triggers inline revision of the current section without discarding approved prior sections.
  - Section length scales to complexity: a few sentences for straightforward sections, up to 200-300 words for nuanced ones. Not-applicable sections (e.g., "no data migrations needed") are presented as a one-line statement rather than skipped silently.
- **Priority:** P0

**FR3: Collaborative mode presents 2-3 approaches at real decision points**

- **Description:** When a section involves a genuine architectural decision (multiple viable patterns, component boundary tradeoffs, data-model choice not dictated by convention, API style choice), the design skill must present 2-3 distinct approaches with tradeoffs and a recommendation, and elicit user direction before proceeding.
- **Acceptance Criteria:**
  - Approaches presented are genuinely distinct (not minor variations).
  - Each approach lists concrete tradeoffs and a "when this is the right choice" framing.
  - The agent leads with its recommendation and reasoning.
  - When there is no real decision point (convention-driven, already decided in discovery, trivial), the agent presents a single path with a confirm-or-redirect prompt rather than inventing alternatives.
  - The skill prompt includes a concrete heuristic and examples for when to invoke the divergent pattern vs. when to suppress it.
- **Priority:** P0

**FR4: Design skill confirms requirements and produces `spec.md` as a byproduct**

- **Description:** Before drafting architecture, the design skill must run a requirements confirmation sub-step that formalizes FRs / NFRs / acceptance criteria / priorities from the discovery artifact and presents them to the user for validation. The confirmed requirements are persisted as `spec.md` (using the existing template).
- **Acceptance Criteria:**
  - The requirements-confirmation sub-step runs in both Collaborative and Draft-and-review modes.
  - In Collaborative mode, the user iterates on the requirements list until they confirm completeness.
  - In Draft-and-review mode, the requirements are formalized and committed as part of the full draft, then presented for holistic review.
  - `spec.md` is written to the project directory, includes a populated `Requirement Index` (the format defined in `oat-project-spec/SKILL.md:296-326`), and has frontmatter `oat_status: complete` before design drafting proceeds.
  - `design.md` references `spec.md` as its source of requirements and produces the requirement-to-test mapping in its Testing Strategy section.
- **Priority:** P0

**FR5: Design skill runs a self-review before the user-review gate**

- **Description:** After the design sections are drafted (either incrementally in Collaborative mode or as one pass in Draft-and-review mode), the skill must run a fresh-eyes self-review covering: (1) placeholder scan, (2) internal consistency, (3) scope check, (4) ambiguity check. Issues are fixed inline without re-reviewing.
- **Acceptance Criteria:**
  - Self-review is a documented step in the skill with the four named checks.
  - The skill fixes issues inline and does not recurse on self-review.
  - Self-review runs after all sections are drafted but before the user-review gate.
- **Priority:** P1

**FR6: HiLL approval prompt explicitly invites artifact review**

- **Description:** The design skill's HiLL approval prompt must be reworded to explicitly invite the user to read the committed artifact before approving.
- **Acceptance Criteria:**
  - Current prompt ("Design artifact is ready. Approve design and unlock `oat-project-plan`?") is replaced with language like: "Design written and committed to `<path>`. Please review it and let me know if you want to make any changes before we move to planning."
  - The prompt still satisfies the HiLL checkpoint mechanics (explicit user approval required, state.md frontmatter updates, optional independent review path).
  - The user can still request changes; on change request, the skill revises and re-presents without resetting prior progress.
- **Priority:** P1

**FR7: (removed — deferred to follow-up project)**

Originally: "Design skill runs a sub-project decomposition sanity check." Dropped from scope; detection of multi-subsystem projects already happens organically in `oat-project-discover`'s solution-space exploration. A codified split-escape-hatch (two modes: decompose-and-park vs brainstorm-broadly-execute-one) is tracked in `discovery.md` Deferred Ideas as a follow-up project. FR7 is intentionally left numbered to preserve stable IDs across other FRs; do not reuse this ID for new requirements in this project.

**FR8: Draft-and-review mode produces complete design in one pass**

- **Description:** In Draft-and-review mode, the design skill drafts the entire design (all applicable sections + spec.md) without per-section user prompts, then runs self-review (FR5), then presents the full artifact via the user-review gate (FR6).
- **Acceptance Criteria:**
  - No per-section user prompts fire in Draft-and-review mode.
  - The skill still produces both `spec.md` and `design.md` with complete content.
  - Self-review still runs.
  - The user-review gate fires once, inviting the user (or their peer reviewer) to read the committed artifact.
  - If the user requests changes, the skill revises without discarding the rest of the draft.
- **Priority:** P0

**FR9: Non-interactive context falls back to Draft-and-review (primary automation use case)**

- **Description:** When the design skill is invoked in a non-interactive context (no TTY, or `OAT_NON_INTERACTIVE=1`), it must fall back to Draft-and-review mode automatically, without blocking on prompts. This is not merely a defensive safety net — it's the core enabler for running the full OAT workflow (`discover → design → plan → implement`) end-to-end in a Claude agent where a user is not present (CI pipelines, scheduled triggers, agent orchestrators).
- **Acceptance Criteria:**
  - Mode detection happens at the top of the skill, before any prompts are emitted.
  - A banner is printed (and appended to `design.md` as a note) announcing: "Ran in draft-and-review mode — no interactive user present. Review manually before plan generation."
  - The skill exits cleanly with both `spec.md` and `design.md` committed; no prompts block.
  - The same fallback applies to `oat-project-quick-start` Step 2.75 (lightweight design mode choice) and Step 2.6 (requirements gate — which should be auto-confirmed or no-op in non-interactive mode rather than blocking).
  - `OAT_NON_INTERACTIVE=1` is the canonical env-var signal for agent orchestrators to announce unattended mode when TTY detection is unreliable.
- **Priority:** P0 _(upgraded from P1 — this is the enabler for unattended full-workflow runs, not an edge case)_

**FR10: `oat-project-spec` repositioned as standalone utility**

- **Description:** The `oat-project-spec` skill's description and prose must be updated to reflect that it is a standalone, optional utility — not a required step between discovery and design.
- **Acceptance Criteria:**
  - Skill frontmatter `description:` mentions that it is optional and independent of the design workflow.
  - The skill's closing output references `oat-project-design` as the next step (with language indicating the user _may_ proceed to design, not that they _must_ go through spec first).
  - `AGENTS.md` workflow-triage prose no longer implies spec is a pipeline step.
  - `oat-project-discover`'s `Next Steps` language (Step 15) no longer routes automatically to `oat-project-spec` — instead routes to `oat-project-design` (with spec as an optional alternative for "not ready to design yet" users).
  - Discovery template's `Next Steps` section is updated accordingly.
  - Existing spec.md artifact contract is unchanged; downstream skills continue to read it as before.
- **Priority:** P0

**FR11: Quick-start straight-to-plan path gains a conversational requirements gate**

- **Description:** On the quick-start → straight-to-plan path (including the auto-advance case for well-understood requests), the skill must insert a brief in-conversation requirements-confirmation gate before generating the plan.
- **Acceptance Criteria:**
  - Before plan generation, a one-screen bullet list of requirements (extracted from discovery) is presented.
  - The user confirms, redirects, or adds. Any additions are captured in discovery.md and re-presented.
  - No artifact is written for the gate — it is purely conversational.
  - The gate fires on both the auto-advance path (well-understood requests) and the explicit "Straight to plan" choice at Step 2.5.
  - A flag / env var can bypass the gate for truly no-ceremony usage (e.g., `OAT_NO_REQUIREMENTS_GATE=1` or a skill argument).
- **Priority:** P1

**FR12: Quick-start lightweight design path offers the mode choice**

- **Description:** The quick-start Step 2.75 (lightweight design) must offer the same Collaborative / Draft-and-review mode choice as the full design skill, scaled down to match quick-start's lighter section set.
- **Acceptance Criteria:**
  - Mode choice prompt fires at the top of Step 2.75 (before sections are drafted).
  - Collaborative mode matches the existing incremental-validation pattern in `oat-project-quick-start/SKILL.md:244-251`.
  - Draft-and-review mode drafts the full lightweight design in one pass, runs self-review, and invokes the user-review gate.
  - The reduced section set is preserved in both modes (architecture, components, data flow, testing; skip security/performance/deployment/migration; data models / APIs / error handling remain optional).
- **Priority:** P1

**FR13: `oat-project-discover` routing language updated**

- **Description:** `oat-project-discover` Step 15 output and its `Next Steps` template language no longer route users automatically to `oat-project-spec`. Instead, route to `oat-project-design` with `oat-project-spec` mentioned as an optional alternative for "not ready to design yet" users.
- **Acceptance Criteria:**
  - Step 15 output lists `oat-project-design` as the next command in spec-driven mode.
  - `Next Steps` template text is updated to match.
  - Spec is mentioned as optional for users who want to formalize requirements without designing.
  - Discovery HiLL approval prompt (Step 11) language updated to reflect the new downstream (unlock `oat-project-design` rather than `oat-project-spec`).
- **Priority:** P0

### Non-Functional Requirements

**NFR1: Backward compatibility with artifact contract**

- **Description:** `spec.md` and `design.md` produced by the new flow must remain parseable by all existing downstream skills (`oat-project-plan`, `oat-project-plan-writing`, `oat-project-implement`, `oat-project-subagent-implement`, `oat-project-review-provide`, `oat-project-review-receive`, `oat-project-pr-progress`, `oat-project-pr-final`, `oat-project-revise`, `oat-project-reconcile`).
- **Acceptance Criteria:**
  - All existing sections of `spec.md` continue to be produced.
  - All existing sections of `design.md` continue to be producible (though some may be replaced with "N/A" one-liners where not applicable).
  - Frontmatter fields (`oat_status`, `oat_ready_for`, `oat_blockers`, `oat_last_updated`, `oat_generated`) are unchanged in shape.
- **Priority:** P0

**NFR2: HiLL semantics preserved**

- **Description:** The new design flow must correctly handle projects whose `oat_hill_checkpoints` includes `"spec"`, `"design"`, or both.
- **Acceptance Criteria:**
  - If a project's state has `"spec"` in `oat_hill_checkpoints`, the design HiLL gate treats it as satisfied on approval (append both `"spec"` and `"design"` to `oat_hill_completed`).
  - If only `"design"` is configured, behavior is unchanged.
  - If only `"spec"` is configured and the user runs `oat-project-design` directly (bypassing the standalone `oat-project-spec`), the design HiLL gate still requires explicit approval.
  - No state-migration logic is needed; the folded HiLL semantics handle existing projects transparently.
- **Priority:** P0

**NFR3: Release validation passes**

- **Description:** The implementation PR must pass `pnpm release:validate` before being considered done.
- **Acceptance Criteria:**
  - All touched canonical skills at `.agents/skills/*/SKILL.md` have `version:` bumped in the same PR.
  - All five lockstep public packages (`packages/cli`, `packages/control-plane`, `packages/docs-config`, `packages/docs-theme`, `packages/docs-transforms`) have version bumps.
  - Any touched templates (`.oat/templates/*.md`) also trigger the lockstep bump.
  - `pnpm release:validate` exits 0.
- **Priority:** P0

**NFR4: Collaborative mode does not meaningfully slow design for simple projects**

- **Description:** A simple project in Collaborative mode should complete in similar or only marginally greater wall-clock time than the current single-review flow, because section depth scales with complexity.
- **Acceptance Criteria:**
  - Sections that would be trivial (e.g., "no migration needed") present as one-liners.
  - Non-applicable sections are explicitly surfaced ("no security considerations in scope for this change") rather than suppressed.
  - Empirical validation during dogfooding: run the new design skill on a small OAT change and compare interaction count + elapsed time vs. a current design run.
- **Priority:** P1

**NFR5: Skill files remain readable and maintainable**

- **Description:** The rework must not produce a single monolithic skill file that is impractical to reason about.
- **Acceptance Criteria:**
  - The reworked `oat-project-design/SKILL.md` should not exceed 700 lines. (Current is ~460 lines; budget ~240 more for mode choice, requirements confirmation, self-review, user-review gate rewording, decomposition check, YAGNI principle, heuristic examples, draft-and-review branch.)
  - New substeps are named and numbered consistently with existing conventions.
  - Long decision-point heuristics live in a single named sub-step, not scattered.
- **Priority:** P2

**NFR6: Existing quick-start minimal-ceremony contract preserved for truly simple requests**

- **Description:** The quick-start → straight-to-plan path, even with the new requirements gate, must remain noticeably faster than the full spec-driven flow.
- **Acceptance Criteria:**
  - The requirements gate is a single-prompt conversational step (not a multi-turn iteration).
  - Auto-advance behavior for well-understood requests is preserved except for the gate insertion.
  - Gate can be bypassed via flag / env var for truly no-ceremony usage.
- **Priority:** P1

**NFR7: Heuristic for "real architectural decision point" is concrete enough to be followed reliably**

- **Description:** The skill prompt language for deciding when to present 2-3 options must be specific enough that different runs of the skill on similar projects produce similar outcomes.
- **Acceptance Criteria:**
  - Skill prompt lists 3-5 concrete examples of "present options" cases and 3-5 examples of "confirm single path" cases.
  - A negative example is included ("Do not invent alternatives for convention-driven choices like which test runner to use when the codebase already uses one").
  - Dogfooding during design/implementation validates that the heuristic doesn't produce perfunctory option-invention.
- **Priority:** P1

## Constraints

- **Artifact contract preservation** (see NFR1): Downstream skills must continue to read existing section structures. Specific load-bearing sections: `Requirement Index` in spec.md (`oat-project-spec/SKILL.md:296-326`); Component Design, Data Models, API Design, Testing Strategy with Requirement-to-Test Mapping in design.md (`oat-project-design/SKILL.md:137-268`).
- **HiLL semantics** (see NFR2): No new checkpoints, no new gate mechanics; folded spec HiLL into design HiLL without state migration.
- **Allowed-tools**: `oat-project-design/SKILL.md:7` already lists `AskUserQuestion` — sufficient for mode-choice and validation prompts. Verify `oat-project-spec` and `oat-project-discover` allowed-tools as implementation proceeds.
- **Template compatibility**: `.oat/templates/spec.md` and `.oat/templates/design.md` may receive minor tweaks; no wholesale replacement. `.oat/templates/discovery.md`'s `Next Steps` section will be updated.
- **Quick-start growth bound**: `oat-project-quick-start/SKILL.md` is ~370 lines; the two additions (requirements gate + mode choice for lightweight design) should not exceed ~100 additional lines.
- **Version bump lockstep** (AGENTS.md): Any `.agents/skills/*/SKILL.md` change in this PR triggers version bumps on all five public packages. Template changes trigger the same.
- **`pnpm release:validate` must pass** before PR is done (AGENTS.md).
- **Solo authorship during design conversation**: Skill must not pause indefinitely waiting for external review. Draft-and-review mode exits cleanly after producing the draft.

## Dependencies

### External Dependencies

- **None.** No new third-party libraries, MCP servers, or external services introduced.

### Internal Dependencies

- **`oat-project-discover`** — provides `discovery.md` input to design. Routing language must be updated.
- **`oat-project-spec`** — must be updated for standalone positioning. Runtime dependency of design (the spec-authoring logic inside design duplicates / shares the existing spec skill's structure).
- **`oat-project-plan` / `oat-project-plan-writing`** — must continue to read `spec.md` and `design.md` without modification (NFR1). No changes required to these skills.
- **`oat-project-review-provide`** — referenced as the optional independent-review path. No changes required.
- **`.oat/templates/spec.md`, `.oat/templates/design.md`, `.oat/templates/discovery.md`** — templates consumed by the skills; minor tweaks only.
- **`AGENTS.md`** — workflow triage language must be updated to reflect the new shape.
- **`.oat/state.md` dashboard** — must continue to render correctly for projects in the new flow.

### Development Dependencies

- **`pnpm release:validate`** — must pass before PR merge.
- **`oat state refresh`** — called by quick-start after updates; must continue to work.

## High-Level Design (Proposed)

The core of the change is a rework of `oat-project-design/SKILL.md` that replaces the current linear Steps 5-17 (draft each section) + Step 18 (single end-of-draft review) with a mode-branched flow:

1. **Preamble (new sub-step):** Mode choice prompt (with non-interactive fallback for unattended agent orchestration).
2. **Requirements confirmation (new — absorbed from `oat-project-spec`):** Formalize FRs/NFRs from discovery, confirm with user, write `spec.md`.
3. **Design sections (reworked):**
   - _Collaborative mode:_ Iterate over the existing section list (architecture → components → data models → APIs → security → performance → error handling → testing → deployment → migrations → phases → risks), drafting one at a time, presenting, validating, moving on. At genuine architectural decision points, present 2-3 approaches with a recommendation before proceeding.
   - _Draft-and-review mode:_ Draft all sections in one pass, then proceed.
4. **Self-review (new):** Placeholder / consistency / scope / ambiguity check; fix inline.
5. **User-review gate (reworded):** Explicitly invite artifact review before approval.
6. **HiLL + state update + commit (existing):** Unchanged mechanics; reworded user prompt (FR6) and folded spec-HiLL semantics (NFR2).

Companion changes in `oat-project-quick-start`:

- Insert requirements-confirmation gate before plan generation on straight-to-plan path (FR11).
- Add mode-choice prompt at top of Step 2.75 lightweight design (FR12).
- The existing incremental-validation pattern at `oat-project-quick-start/SKILL.md:244-251` becomes the Collaborative behavior; new Draft-and-review branch added.

Companion changes in `oat-project-spec`:

- Update `description:` frontmatter for standalone positioning (FR10).
- Update closing output to reflect new non-pipeline status.

Companion changes in `oat-project-discover`:

- Update Step 15 output + `Next Steps` template text to route to `oat-project-design` (not `oat-project-spec`).
- Minor wording updates in HiLL prompt.

**Key Components:**

- **Mode-choice preamble** — Runtime prompt + argument / env-var override + non-interactive fallback.
- **Requirements-confirmation sub-step** — Absorbs the core authoring logic from `oat-project-spec` Steps 6-16 (draft FRs/NFRs, refine with user, populate Requirement Index, run quality checklist).
- **Section iterator (Collaborative mode)** — Per-section draft / present / validate loop with optional divergent-options branch.
- **"Real decision point" heuristic** — Prose in the skill prompt with concrete examples.
- **Draft-and-review branch** — Alternative path that drafts all sections in one pass.
- **Design self-review** — Fresh-eyes pass with four named checks.
- **User-review gate** — Reworded HiLL prompt.
- **Quick-start requirements gate** — Single-prompt conversational step before plan generation.
- **Quick-start mode-choice preamble** — Same structure as design skill, scaled down.

**Alternatives Considered:**

- **New `oat-project-brainstorm` skill replacing spec + design** — Rejected because the breaking change across every downstream consumer isn't worth the structural cleanup. (See discovery §"Solution Space" Approach 2.)
- **Separate `oat-project-design-collaborative` variant** — Rejected because two design skills would fragment docs, muscle memory, and automation. (See discovery §"Solution Space" Approach 3.)

_Design-related open questions are tracked in the [Open Questions](#open-questions) section below._

## Success Metrics

- A dogfood run of `oat-project-design` in Collaborative mode on a real OAT feature change surfaces at least one architectural option (divergent thinking at a decision point) and the user reports the experience as "collaborative, not mechanical."
- A dogfood run in Draft-and-review mode produces both `spec.md` and `design.md` in one pass with no intermediate prompts.
- Existing OAT projects in `.oat/projects/shared/*` that have `spec.md` and `design.md` in their current format continue to be operable by downstream skills (spot-check `oat-project-plan`, `oat-project-implement` against one existing project).
- `pnpm release:validate` exits 0 on the implementation PR.
- `oat-project-spec` invoked standalone terminates with a message pointing at `oat-project-design` as the optional next step rather than asserting it as required.
- Quick-start straight-to-plan on a real well-understood request (e.g., "add a `--verbose` flag") catches a deliberate introduced error in the requirements gate — demonstrating the gate's value.
- Quick-start Collaborative-mode lightweight design preserves the reduced section set (no security/performance/deployment/migration sections appear by default).

## Requirement Index

| ID   | Description                                                                        | Priority | Verification                                                                 | Planned Tasks     |
| ---- | ---------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------- | ----------------- |
| FR1  | Design skill offers mode choice at start                                           | P0       | manual: runtime prompt + argument flow                                       | TBD - see plan.md |
| FR2  | Collaborative mode presents sections incrementally with validation                 | P0       | manual: dogfood run + skill prose inspection                                 | TBD - see plan.md |
| FR3  | Collaborative mode presents 2-3 approaches at real decision points                 | P0       | manual: dogfood + heuristic-prose inspection                                 | TBD - see plan.md |
| FR4  | Design skill confirms requirements and produces spec.md as byproduct               | P0       | manual: skill prose + spec.md shape verification                             | TBD - see plan.md |
| FR5  | Design skill runs self-review before user-review gate                              | P1       | manual: skill prose inspection + dogfood                                     | TBD - see plan.md |
| FR6  | HiLL approval prompt explicitly invites artifact review                            | P1       | manual: skill prose inspection                                               | TBD - see plan.md |
| FR7  | _(removed — see FR7 stub above; deferred to follow-up split-escape-hatch project)_ | —        | —                                                                            | —                 |
| FR8  | Draft-and-review mode produces complete design in one pass                         | P0       | manual: dogfood in `--mode draft`                                            | TBD - see plan.md |
| FR9  | Non-interactive context falls back to Draft-and-review (unattended-agent enabler)  | P0       | integration: run skill in piped stdin / TTY-off + agent-orchestrator dogfood | TBD - see plan.md |
| FR10 | `oat-project-spec` repositioned as standalone utility                              | P0       | manual: skill description + AGENTS.md inspection                             | TBD - see plan.md |
| FR11 | Quick-start straight-to-plan gains conversational requirements gate                | P1       | manual: dogfood well-understood request                                      | TBD - see plan.md |
| FR12 | Quick-start lightweight design offers mode choice                                  | P1       | manual: dogfood both modes                                                   | TBD - see plan.md |
| FR13 | `oat-project-discover` routing language updated                                    | P0       | manual: skill prose + template inspection                                    | TBD - see plan.md |
| NFR1 | Backward compatibility with spec.md / design.md artifact contract                  | P0       | integration: `oat-project-plan` on existing proj                             | TBD - see plan.md |
| NFR2 | HiLL semantics preserved across folded spec-HiLL-in-design-HiLL                    | P0       | integration: synthetic state with both HiLLs                                 | TBD - see plan.md |
| NFR3 | `pnpm release:validate` passes                                                     | P0       | perf + integration: command exit 0                                           | TBD - see plan.md |
| NFR4 | Collaborative mode does not meaningfully slow design for simple projects           | P1       | manual: empirical wall-clock comparison                                      | TBD - see plan.md |
| NFR5 | Skill files remain readable (design skill ≤ 700 lines)                             | P2       | manual: line count inspection                                                | TBD - see plan.md |
| NFR6 | Quick-start minimal-ceremony contract preserved for simple requests                | P1       | manual: dogfood well-understood request                                      | TBD - see plan.md |
| NFR7 | "Real architectural decision point" heuristic is concrete enough to follow         | P1       | manual: prose inspection + dogfood iteration                                 | TBD - see plan.md |

## Open Questions

These questions are flagged for resolution in `oat-project-design`:

- **Mode-choice argument surface:** Skill argument (`--mode`), env var (`OAT_DESIGN_MODE`), or both? If both, which takes precedence?
- **Non-interactive detection mechanism:** TTY detection (`[ -t 0 ]`), env var (`OAT_NON_INTERACTIVE`), or both? How reliable is TTY detection inside the Skill tool runtime? (Design should lean toward making the env var the canonical signal, so agent orchestrators can reliably opt into unattended mode.)
- **`oat-project-spec` codepath reuse inside design:** Is the spec-authoring logic extracted into a shared helper (script or skill include), or duplicated prose? The duplication is ~200 lines (spec.md Steps 6-16); reuse is cleaner but introduces a new shared surface.
- **Requirements-gate bypass flag for quick-start:** Flag on quick-start (`--no-requirements-gate`), env var (`OAT_NO_REQUIREMENTS_GATE`), or both?
- **Self-review timing vs HiLL:** Confirm self-review runs _before_ HiLL (since self-review is a quality-improvement pass and HiLL is user-approval).
- **HiLL prompt wording finalization:** Confirm the exact phrasing — current proposal in FR6 is illustrative but needs final copy.
- **Version bump coordination:** All touched skills use a minor bump, or coordinated major bump across the five public packages? The spec change is a behavior change, so a minor (not patch) is defensible.
- **Backward-compatibility messaging for `oat-project-spec` standalone runs:** A one-time deprecation-style note, or permanent change in the closing output?
- **Template changes required for `spec.md`:** Walk the template against the new folded-authoring sequence during design — confirm no structural change needed.
- **Dogfooding plan:** Design phase should specify at least one real OAT task to dogfood the new flow against (either mode) as part of implementation verification.
- **Unattended-orchestrator dogfood:** Design phase should identify at least one end-to-end full-workflow run where a Claude agent executes `discover → design → plan → implement` without a human in the loop, to verify FR9's automation use case works in practice.

## Assumptions

- The `AskUserQuestion` tool handles mode-choice prompts reliably across the skill's runtime.
- TTY detection is feasible from within the Skill tool's shell context — or, when it isn't, `OAT_NON_INTERACTIVE=1` is a reliable substitute that agent orchestrators can set.
- Downstream skills do not hardcode an assumption that spec is authored before design.
- The existing `spec.md` template's sections map directly to what the folded authoring flow will produce; no structural template changes are required.
- Users who prefer draft-and-review won't resist it remaining available — they want it off by default.
- Adding ~1 runtime prompt to design does not meaningfully degrade experience.
- The "real decision point" heuristic can be captured in skill-prompt language that LLMs will follow reliably.
- HiLL checkpoint configuration rarely includes both `"spec"` and `"design"` simultaneously. Folding spec's HiLL into design's HiLL is not a meaningful loss.

## Risks

- **Risk: Divergent "2-3 options" at decision points becomes perfunctory.**
  - **Likelihood:** Medium–High | **Impact:** Medium
  - **Mitigation:** Heuristic prose with explicit "don't invent options for convention-driven choices" negative example (NFR7); dogfooding during implementation.

- **Risk: Folded spec+design skill becomes bloated and unmaintainable.**
  - **Likelihood:** Medium | **Impact:** Medium
  - **Mitigation:** NFR5 line budget; named sub-steps for each new concern; consider shared helper for spec-authoring logic (see Open Questions).

- **Risk: Existing users confused when spec standalone no longer advances to design.**
  - **Likelihood:** Medium | **Impact:** Low–Medium
  - **Mitigation:** Clear closing-output language in `oat-project-spec`; AGENTS.md triage update; PR description note.

- **Risk: Downstream skill depends implicitly on spec-before-design ordering.**
  - **Likelihood:** Low | **Impact:** Medium–High
  - **Mitigation:** Audit all downstream references to `spec.md` frontmatter / timestamps during design phase.

- **Risk: Mode-choice prompt clashes with automation.**
  - **Likelihood:** Low | **Impact:** Medium
  - **Mitigation:** FR9 non-interactive fallback; `--mode` override.

- **Risk: Version-bump lockstep missed.**
  - **Likelihood:** Low | **Impact:** High (release breaks)
  - **Mitigation:** NFR3 acceptance criterion; `pnpm release:validate` gate; explicit checklist in plan.md.

- **Risk: Collaborative mode feels slow on simple projects.**
  - **Likelihood:** Medium | **Impact:** Medium
  - **Mitigation:** Section depth scaling (FR2); one-liners for N/A sections; genuine one-keystroke opt-out to Draft-and-review.

- **Risk: Self-review + HiLL creates redundant friction.**
  - **Likelihood:** Low | **Impact:** Low
  - **Mitigation:** Skill text clarifies self-review is silent agent-side pass; HiLL is user-facing.

- **Risk: Quick-start requirements gate annoys "just do it" users.**
  - **Likelihood:** Low–Medium | **Impact:** Low
  - **Mitigation:** Single-prompt gate; bypass flag for true no-ceremony.

## References

- Discovery: `discovery.md`
- Comparative analysis: `reference/comparative-analysis.md`
- Obra Superpowers source (all checked into `reference/`):
  - `superpowers-brainstorming.md`
  - `superpowers-brainstorming-visual-companion.md`
  - `superpowers-brainstorming-spec-reviewer.md`
  - `superpowers-writing-plans.md`
  - `superpowers-writing-plans-reviewer.md`
  - `superpowers-using-superpowers.md`
  - `superpowers-verification-before-completion.md`
  - `superpowers-executing-plans.md`
  - `superpowers-subagent-driven-development.md`
- OAT skills (read in full during discovery):
  - `.agents/skills/oat-project-discover/SKILL.md` (v1.3.0)
  - `.agents/skills/oat-project-spec/SKILL.md` (v1.2.0)
  - `.agents/skills/oat-project-design/SKILL.md` (v1.2.0)
  - `.agents/skills/oat-project-quick-start/SKILL.md` (v1.3.3)
- Templates: `.oat/templates/{discovery,spec,design}.md`
- Project conventions: `AGENTS.md`
- Knowledge Base: `.oat/repo/knowledge/project-index.md`
