---
oat_status: complete
oat_ready_for: oat-project-plan
oat_blockers: []
oat_last_updated: 2026-04-17
oat_generated: false
oat_template: false
---

# Design: collaborative-design-workflow

## Overview

This design reworks three OAT skills (`oat-project-design`, `oat-project-quick-start`, `oat-project-spec`) and lightly touches a fourth (`oat-project-discover`) to make the design phase feel collaborative by default, with a draft-and-review escape hatch. Spec authoring folds into the design skill's conversational flow; `spec.md` continues to exist as a distinct artifact for traceability. `oat-project-spec` is repositioned as a standalone utility, decoupled from the auto-routed pipeline.

The change is bounded to skill prompts, templates, and `AGENTS.md` workflow-triage prose. **No CLI/control-plane code changes are required** — the OAT runtime is unchanged. The implementation is essentially a coordinated edit of four `.agents/skills/*/SKILL.md` files plus their template counterparts in `.oat/templates/` plus `AGENTS.md`, with a release-validation pass to confirm the lockstep version bump.

The design pattern is drawn from Obra Superpowers' `brainstorming` skill (section-by-section presentation with incremental validation, one approach-level divergent-thinking moment before section drafting — matching Superpowers' actual flow rather than speculatively inventing per-section divergence), augmented with OAT-native concepts (mode choice, requirements gate for quick-start, reliable non-interactive fallback for unattended agent-orchestrated runs). Several passages of skill prose are lifted verbatim from Superpowers (MIT licensed); attribution is consolidated in a repo-root `NOTICES.md` (see FR14). Source files for all referenced Superpowers skills are checked into `reference/` for reproducibility.

A sub-project decomposition advisory was considered (Component 2 in earlier drafts) and dropped from scope: detection of multi-subsystem requests already happens organically during `oat-project-discover`. The corresponding gap — a graceful hand-off mechanism when decomposition is the right call — belongs to its own follow-up project (tracked in `discovery.md` Deferred Ideas as the codified split-escape-hatch). Component 2's slot is preserved as a removed-stub in this design for ID stability.

## Architecture

### System Context

The change is **prompt-only / docs-only**. The OAT runtime is untouched. Affected files:

```
.agents/skills/
├── oat-project-design/SKILL.md          ← primary rework (~250 lines added/changed)
├── oat-project-quick-start/SKILL.md     ← two additions (~100 lines)
├── oat-project-spec/SKILL.md            ← description + closing-output edits (~30 lines)
└── oat-project-discover/SKILL.md        ← Step 11 + Step 15 routing edits (~10 lines)

.oat/templates/
├── discovery.md                         ← Next Steps section update
├── spec.md                              ← (verify; no change expected)
└── design.md                            ← (verify; no change expected)

AGENTS.md                                ← workflow triage prose update + single NOTICES.md reference

NOTICES.md                               ← NEW: consolidated attribution for borrowed external prose (Superpowers)

packages/
├── cli/package.json                     ← lockstep version bump
├── control-plane/package.json           ← lockstep version bump
├── docs-config/package.json             ← lockstep version bump
├── docs-theme/package.json              ← lockstep version bump
└── docs-transforms/package.json         ← lockstep version bump
```

There are no new packages, no new MCP servers, no new external dependencies, and no schema changes.

**Key Components:**

- **`oat-project-design` (reworked):** Now hosts mode choice (with non-interactive fallback for unattended agent-orchestrated runs), requirements confirmation (folded from spec), section iterator (collaborative branch), draft-and-review branch, design self-review, reworded HiLL prompt.
- **`oat-project-quick-start` (extended):** Gains requirements-gate sub-step on straight-to-plan path, and mode-choice prompt in lightweight design (Step 2.75).
- **`oat-project-spec` (repositioned):** Description and closing-output prose updated for standalone-utility role; mechanics unchanged.
- **`oat-project-discover` (light edits):** Step 15 output text and HiLL prompt language route to `oat-project-design` instead of `oat-project-spec`.
- **`.oat/templates/discovery.md` (light edits):** `Next Steps` section reflects the new routing.
- **`AGENTS.md` (light edits):** Workflow triage prose drops references to spec as a pipeline step.

### Component Diagram

```
                    ┌──────────────────────────┐
                    │ oat-project-discover     │
                    │ (Steps 1-15 unchanged    │
                    │  except routing in 11+15)│
                    └──────────────┬───────────┘
                                   │
                       discovery.md │
                                   │
                                   ▼
                    ┌──────────────────────────────────┐
                    │ oat-project-design (REWORKED)    │
                    │                                  │
                    │  Sub-step A: Mode choice         │
                    │              (TTY / env-var      │
                    │               fallback for       │
                    │               unattended runs)   │
                    │  Sub-step B: (removed — was      │
                    │              decomposition)      │
                    │  Sub-step C: Requirements        │
                    │              confirmation        │
                    │              ─────► writes spec.md
                    │  Sub-step C.5: Approach          │
                    │              reaffirmation       │
                    │              (one divergent      │
                    │               moment per run —   │
                    │               Superpowers prose) │
                    │  Sub-step D: Section iterator    │
                    │   ┌────────────────────────────┐ │
                    │   │ COLLABORATIVE branch       │ │
                    │   │  for each section:         │ │
                    │   │   - draft (scale depth)    │ │
                    │   │   - present + validate     │ │
                    │   │   - revise on feedback     │ │
                    │   │  (no scripted per-section  │ │
                    │   │   options step)            │ │
                    │   └────────────────────────────┘ │
                    │   ┌────────────────────────────┐ │
                    │   │ DRAFT-AND-REVIEW branch    │ │
                    │   │  draft all sections        │ │
                    │   │  in one pass               │ │
                    │   └────────────────────────────┘ │
                    │              ─────► writes design.md
                    │  Sub-step E: Self-review         │
                    │              (placeholder/       │
                    │               consistency/scope/ │
                    │               ambiguity)         │
                    │  Sub-step F: User-review gate    │
                    │              (reworded)          │
                    │  Sub-step G: HiLL + state +      │
                    │              commit              │
                    └──────────────┬───────────────────┘
                                   │
                  spec.md + design.md
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │ oat-project-plan         │
                    │ (UNCHANGED)              │
                    └──────────────────────────┘


           ┌──────────────────────────────────────┐
           │ oat-project-spec (REPOSITIONED)      │
           │                                      │
           │  Standalone, manually invoked.       │
           │  Description + closing-output edits  │
           │  only. Mechanics unchanged.          │
           │  Closing output points at design     │
           │  as the optional next step.          │
           └──────────────────────────────────────┘


    ┌──────────────────────────────────────────────────┐
    │ oat-project-quick-start (EXTENDED)               │
    │                                                  │
    │  Step 2 (discovery)  ── unchanged                │
    │  Step 2.5 (design depth choice) ── unchanged     │
    │      ├─ Straight to plan ─► (NEW) Step 2.6:      │
    │      │    requirements gate ─► Step 3            │
    │      │                                           │
    │      ├─ Lightweight design ─► (NEW) Step 2.75a:  │
    │      │    mode choice                            │
    │      │      ├─ Collaborative ─► existing 2.75    │
    │      │      └─ Draft-and-review ─► (NEW) one-    │
    │      │            pass draft + self-review       │
    │      │                                           │
    │      └─ Promote to spec-driven ── unchanged      │
    │  Step 3 (plan generation) ── unchanged           │
    └──────────────────────────────────────────────────┘
```

### Data Flow

For the **spec-driven workflow with new design skill**:

```
1. User runs oat-project-discover (unchanged behavior).
   - Outputs discovery.md with oat_ready_for: oat-project-design
     (was: oat-project-spec)

2. User runs oat-project-design.
   a. Mode choice: collaborative (default) | draft (escape hatch).
      - Non-interactive context → auto-falls-back to draft
        (enables unattended agent-orchestrated full-workflow runs).
      - --mode flag → overrides.
      - OAT_NON_INTERACTIVE=1 env var → forces draft.
   b. (Removed — was sub-project decomposition advisory;
       detection happens in discovery; split-escape-hatch is a follow-up project.)
   c. Requirements confirmation:
      - Read discovery.md.
      - Draft FRs / NFRs / acceptance criteria / Requirement Index.
      - In collaborative: iterate with user until confirmed.
      - In draft: write spec.md, mark complete, present alongside design at user-review gate.
      - Output: spec.md (oat_status: complete, oat_ready_for: oat-project-design).
   c.5 Approach reaffirmation (one divergent moment, Superpowers-aligned):
      - Read discovery.md Solution Space / Chosen Direction.
      - If exists: one-sentence summary + confirm/revisit prompt.
      - If not: invoke Superpowers' 2-3-approaches prose inline.
      - Record confirmed approach in design.md Overview.
   d. Section iterator:
      - Collaborative: per-section draft (scaled to complexity) → present → validate → revise on feedback → next. No scripted per-section options step.
      - Draft: draft all sections in one pass.
      - Output: design.md with all sections.
   e. Self-review: silent placeholder/consistency/scope/ambiguity pass; fix inline.
   f. User-review gate: "Design written and committed to <path>. Please review …"
      - User approves or requests changes (loop on changes).
   g. HiLL + state update + commit:
      - If oat_hill_checkpoints includes "spec" or "design": handle appropriately
        (append both to oat_hill_completed when both are configured).
      - Update state.md frontmatter (oat_phase: design, oat_phase_status: complete).
      - Commit artifacts.

3. User runs oat-project-plan (unchanged).
```

For the **quick-start workflow**:

```
1. User runs oat-project-quick-start (Step 0-2 unchanged).

2. Step 2.5 design-depth decision (unchanged options).

3a. If "Straight to plan" chosen (or auto-advance for well-understood):
    NEW Step 2.6: Requirements gate
      - Extract requirements from discovery.
      - Present as one-screen bullet list.
      - User confirms / adds / redirects.
      - On addition: update discovery.md, re-present.
      - Bypass via --no-requirements-gate flag or OAT_NO_REQUIREMENTS_GATE env var.

3b. If "Lightweight design first" chosen:
    NEW Step 2.75a: Mode choice (collaborative | draft).
      - Non-interactive → auto-fall-back to draft.
    Step 2.75 (existing): runs in selected mode.
      - Collaborative: existing incremental-validation pattern.
      - Draft: one-pass draft + self-review + user-review gate.

3c. If "Promote to spec-driven": unchanged.

4. Step 3 plan generation (unchanged).
```

## Component Design

### Component 1: `oat-project-design` mode-choice preamble

**Purpose:** Resolve the interaction mode (collaborative vs draft-and-review) before any drafting begins. Handle non-interactive fallback. Allow CLI / env override.

**Responsibilities:**

- Detect whether the skill is invoked interactively (TTY check) or via automation.
- Read the mode override from skill arguments (`--mode collaborative` / `--mode draft`) or env var (`OAT_DESIGN_MODE`).
- If neither override is set and context is interactive, present the mode-choice prompt via `AskUserQuestion`.
- If non-interactive without override, default to draft mode and emit a banner.
- Persist the chosen mode for the rest of the skill's execution (e.g., as a shell variable inside the skill prose).

**Interfaces:**

```
# Inside oat-project-design SKILL.md (Step 1.5: Resolve Interaction Mode)

# 1. Check for explicit override
DESIGN_MODE="${OAT_DESIGN_MODE:-${ARG_MODE:-}}"

# 2. If no override, check interactivity
if [ -z "$DESIGN_MODE" ]; then
  if [ -t 0 ]; then
    # Interactive: prompt via AskUserQuestion
    # Result populates DESIGN_MODE
  else
    DESIGN_MODE="draft"
    echo "Non-interactive context detected. Falling back to draft-and-review mode."
  fi
fi
```

Then in the AskUserQuestion prompt:

```
Question: "How would you like to work through the design?"
Multi-choice:
  1. Collaborative (recommended) — section-by-section, with options at decision points
  2. Draft-and-review — full draft up front, you review holistically
```

**Dependencies:**

- `AskUserQuestion` (already in `oat-project-design/SKILL.md:7` allowed-tools).
- Bash conditionals (`-t 0`, env-var resolution).

**Design Decisions:**

- **Default to collaborative.** Matches the discovery directive that this is the new norm.
- **Non-interactive falls back to draft, not collaborative.** Collaborative requires user input; if no user is present, collaborative would block. Draft completes without prompts.
- **Both env var and skill argument supported.** Argument takes precedence (more local). Env var supports session-wide preference (e.g., a user who always wants draft).
- **Mode is announced explicitly.** The skill emits "Running in collaborative mode" or "Running in draft-and-review mode" so the user knows what to expect.

### Component 2: (removed — sub-project decomposition advisory deferred)

Originally specified as a soft advisory prompt at the top of the design skill that would ask "does this look like one plan's worth of work?" and help the user decompose multi-subsystem requests. Dropped from this project's scope during discovery review (see `discovery.md` Question 10).

**Why removed:** Detection of multi-subsystem requests already happens organically during `oat-project-discover`'s solution-space exploration — a separate advisory at the top of design was redundant with how discovery naturally surfaces scope. What OAT actually lacks is not a _detection_ step but a _graceful hand-off mechanism_ with two flavors:

1. **Decompose-and-park:** Create N new projects, seed each with a brief discovery summary; user picks one now, others wait.
2. **Brainstorm-broadly-execute-one:** Do a rich cross-cutting discovery in the current conversation, generate full `discovery.md` for each sub-project with cross-references, then pick one to make active.

That hand-off mechanism is its own design problem (natural home: `oat-project-discover` or a new `oat-project-split` skill) and tracked as a follow-up project in `discovery.md` Deferred Ideas.

The Component 2 slot is intentionally preserved (rather than renumbered) to avoid cascading cross-reference churn. Do not reuse this slot for a new component in this project.

### Component 3: Requirements confirmation sub-step (folded from `oat-project-spec`)

**Purpose:** Replace the standalone spec phase with an in-design step that produces the same `spec.md` artifact.

**Responsibilities:**

- Read `discovery.md` to extract Key Decisions, Constraints, Success Criteria, Out of Scope.
- Draft FRs and NFRs with acceptance criteria and priorities.
- Populate the Requirement Index.
- In collaborative mode: present and iterate until the user confirms.
- In draft-and-review mode: write `spec.md` and continue.
- Mark `spec.md` as complete (`oat_status: complete`, `oat_ready_for: oat-project-design`).

**Interfaces:**

The substep is essentially `oat-project-spec` Steps 6-16 transplanted into the design skill, with two adjustments:

1. The requirements-confirmation iteration loop (current spec Step 10) only runs in collaborative mode.
2. The spec quality gate (current spec Step 16) becomes a sub-pass of the new design self-review (Component 6) — its checks merge into the broader self-review.

```
# Step 3: Requirements Confirmation (folded spec authoring)

Read discovery.md. Extract:
  - Key Decisions
  - Constraints
  - Success Criteria
  - Out of Scope

Draft requirements:
  - FR1..N (functional, with acceptance criteria, P0/P1/P2)
  - NFR1..N (non-functional, with measurable criteria)
  - Requirement Index table

If DESIGN_MODE == "collaborative":
  Present requirements list to user.
  Ask: "Do these requirements look complete? Anything missing or unclear?"
  Iterate until user confirms.

Write to spec.md using .oat/templates/spec.md as base.
Update frontmatter:
  oat_status: complete
  oat_ready_for: oat-project-design
  oat_last_updated: <today>

Commit:
  git add "$PROJECT_PATH/spec.md"
  git commit -m "docs: confirm requirements for {project-name}"
```

**Dependencies:**

- `.oat/templates/spec.md` (template).
- File system write.
- Git commit.
- `AskUserQuestion` for collaborative iteration loop.

**Design Decisions:**

- **Same `spec.md` shape.** Template is unchanged; the artifact contract for downstream skills is preserved.
- **Iterate-until-confirmed only in collaborative mode.** In draft-and-review mode, the requirements are part of the holistic review at the user-review gate.
- **Commit `spec.md` separately from `design.md`.** Keeps the commit history clean and lets HiLL gate reviewers fetch the spec independently if they want.
- **No new template fields required.** Verification during implementation: walk the existing spec template against this flow and confirm.

### Component 3.5: Approach reaffirmation before section drafting (Superpowers-aligned)

**Purpose:** Fulfill FR3 by having one divergent-thinking moment at the approach level before section-by-section drafting, matching Superpowers' `brainstorming` checklist item 4 ("Propose 2-3 approaches"). This is the sole divergent moment in the skill.

**Responsibilities:**

- After requirements confirmation (Component 3), before the section iterator (Component 4) runs.
- Read `discovery.md`'s `## Solution Space` section.
- If a Chosen Direction exists: summarize it in one sentence and ask the user to confirm or redirect.
- If no Solution Space exists (well-understood quick-start-style requests that bypassed discovery Step 9): invoke the 2-3-approaches pattern inline using Superpowers' exact prose.
- Record the confirmed approach in `design.md`'s Overview before the section iterator begins.

**Interfaces:**

```
# Step 3.5: Approach Reaffirmation (one divergent moment)

Read "$PROJECT_PATH/discovery.md" — look for "## Solution Space" section
with a "### Chosen Direction" sub-section.

IF Chosen Direction exists:
  Present to user:
    "Based on discovery, we're designing around [Approach N — one-line summary].
     Confirming this is still the right direction before I draft the design?"
  Use AskUserQuestion:
    1. Yes — proceed with this approach
    2. Revisit — I want to explore alternatives again
  If "Revisit": invoke the 2-3-approaches block below.

IF no Chosen Direction (or Solution Space section absent):
  Invoke Superpowers' 2-3-approaches pattern inline. Use their exact
  prose in the skill file:

    > Propose 2-3 different approaches with trade-offs.
    > Present options conversationally with your recommendation and reasoning.
    > Lead with your recommended option and explain why.
    > (— from Obra Superpowers brainstorming skill, MIT licensed; attribution in NOTICES.md)

  Ask user to choose. Document the chosen approach in design.md's
  Overview section.

Continue to Component 4 (section iterator).
```

**Dependencies:** `AskUserQuestion`, Read on `discovery.md`.

**Design Decisions:**

- **One divergent moment per run.** Not per-section. Matches Superpowers' pattern exactly.
- **Reaffirmation, not re-derivation.** If discovery already did the work, we don't redo it — we confirm and move on. Avoids triple-asking the same approach question.
- **Escape hatch for well-understood requests.** If someone went `oat-project-discover → oat-project-design` and discovery skipped Step 9 (because the request was well-understood enough not to need solution-space exploration), design invokes the 2-3-approaches pattern inline so it always happens exactly once before drafting.
- **Prose is lifted from Superpowers, not paraphrased.** FR14 covers the attribution mechanism (repo-root `NOTICES.md`).

### Component 4: Section iterator (collaborative branch)

**Purpose:** Implement the section-by-section design presentation with optional divergent-options branching at real decision points.

**Responsibilities:**

- Iterate over the design section list in order: architecture → components → data models → APIs → security → performance → error handling → testing (with requirement-to-test mapping) → deployment → migrations → phases → risks.
- For each section:
  1. Draft a candidate, scaling depth to complexity (Superpowers' prose, lifted verbatim into the skill: "Scale each section to its complexity: a few sentences if straightforward, up to 200-300 words if nuanced").
  2. Present the section and ask "Does this look right, or should we adjust before continuing?" (Superpowers' exact phrasing.)
  3. Incorporate any feedback inline. Re-present if substantively changed. "Be ready to go back and clarify if something doesn't make sense" (Superpowers' exact phrasing — this is where organic divergent thinking fires: if the user pushes back, the agent naturally explores alternatives in that exchange).
  4. Mark section approved. Move to next section.
- Track which sections have been approved (so re-runs don't redo finalized sections).
- Sections that are not applicable to the project (e.g., "no migrations needed") are presented as a single sentence rather than a multi-paragraph N/A.
- **No scripted per-section "present 2-3 options" step.** This was removed when FR3 was aligned with Superpowers' actual pattern (one approach-level divergent moment, handled by Component 3.5 before this iterator runs). Divergent thinking during sections happens organically in response to user feedback, not on a schedule.

**Interfaces:**

```
# Step 4 (Collaborative Branch): Section-by-Section Design

For SECTION in [
  "Overview + Architecture",
  "Component Design",
  "Data Models",
  "API Design",
  "Security Considerations",
  "Performance Considerations",
  "Error Handling",
  "Testing Strategy (with Requirement-to-Test Mapping)",
  "Deployment Strategy",
  "Migration Plan",
  "Implementation Phases",
  "Risks and Mitigation"
]; do
  - Draft section content based on spec.md + knowledge base.
    Scale depth to complexity (a few sentences if straightforward,
    up to 200-300 words if nuanced — Superpowers' exact language).

  - Present section to user:
      "Here's what I have for [section]: [content]
       Does this look right, or should we adjust before continuing?"
    Use AskUserQuestion (free-text or multi-choice with refinement options).

  - On feedback: revise inline; re-present if substantive.
    Be ready to go back and clarify if something doesn't make sense.
  - Mark section approved.
done
```

**No per-section options step.** Divergent thinking fires organically: if the user pushes back on a section, the agent explores alternatives in that exchange. There is no scripted "Option A / Option B / Option C" step baked into the iterator.

**Dependencies:**

- `AskUserQuestion`.
- `oat-project-design`'s existing section coverage (Steps 5-17 from current version) provide the section content templates; this iterator just wraps them in a per-section validation loop.

**Design Decisions:**

- **Section list mirrors current Steps 5-17.** No new section coverage; only new presentation pattern. Design.md template (Component 9) preserves the same sections.
- **N/A sections shown as one-liners.** Avoids the overhead of "skip silently vs. include placeholder" decisions — explicit one-line statement is the best of both.
- **Approved sections persist.** If the user requests changes mid-iteration, only the affected section is re-drafted, not the whole document.
- **Commit after every section, or batch?** Commit after the full design.md is finalized (matches existing Step 22 commit pattern). Mid-iteration state lives in the in-progress design.md frontmatter (`oat_status: in_progress`).

### Component 5: (removed — per-section decision-point heuristic deferred)

Originally specified a prose heuristic for deciding when to present 2-3 architectural options inside a design section (the "real decision point" heuristic). Removed when FR3 was rewritten to align with Obra Superpowers' actual `brainstorming` skill pattern: one approach-level divergent moment before section drafting (see Component 3.5, Approach Reaffirmation), then section-by-section presentation with no scripted per-section options step. Section-level divergence happens organically when the user pushes back on a drafted section.

With no per-section judgment call, no heuristic is needed, and there is nothing to calibrate. Related NFR7 was removed in spec.md. Component 5's slot is intentionally preserved (rather than renumbered) to avoid cross-reference churn — do not reuse this slot in this project.

### Component 6: Design self-review

**Purpose:** Catch placeholder content, internal contradictions, scope creep, and ambiguity before the user-review gate. Borrowed directly from Superpowers' brainstorming spec self-review (`superpowers-brainstorming.md:116-124`).

**Responsibilities:**

- After all sections are drafted (in either mode), perform a fresh-eyes pass.
- Run four named checks:
  1. **Placeholder scan:** Any "TBD", "TODO", incomplete sections, vague requirements? Fix inline.
  2. **Internal consistency:** Do any sections contradict each other? Does the architecture match component descriptions? Does the data model match the API design?
  3. **Scope check:** Is this focused enough for a single implementation plan, or did it accidentally bloat? If genuine multi-subsystem scope surfaces here, escalate to the user — they may want to split into multiple projects (follow-up split-escape-hatch work, not this skill's responsibility).
  4. **Ambiguity check:** Could any requirement or design statement be interpreted two different ways? If so, pick one and make it explicit.
- Fix issues inline; do not recurse on self-review.

**Interfaces:**

```
# Step 5: Design Self-Review

Look at design.md (and spec.md) with fresh eyes. Check:

1. Placeholder scan — search for: "TBD", "TODO", "FIXME", "...", placeholder
   sections that just say "Not applicable" without elaboration. Fix inline.

2. Internal consistency — does the architecture description match the
   component design? Do the API request/response shapes match the data
   models? Does the testing strategy cover the requirements? Fix inline.

3. Scope check — did the design grow beyond what discovery scoped? If so,
   move out-of-scope items to "Deferred Ideas" in discovery.md. (Or, if
   the scope is genuinely larger than expected, surface this to the user.)

4. Ambiguity check — could any requirement, interface, or behavior be
   interpreted two ways? Pick one and make it explicit.

Apply fixes inline. Do not re-run self-review. Move to user-review gate.
```

**Dependencies:** Read + Edit on design.md and spec.md.

**Design Decisions:**

- **Silent (no user prompt).** This is an agent-side quality pass, not a review cycle.
- **Inline fixes only.** Don't loop on re-reviewing the same content.
- **Scope-creep escalation.** If the self-review surfaces real scope creep, escalate to the user — but this is rare and should not normally fire.

### Component 7: Reworded user-review gate (HiLL prompt)

**Purpose:** Replace the current HiLL approval prompt language with an explicit invitation to read the artifact.

**Responsibilities:**

- After self-review, if `"design"` is in `oat_hill_checkpoints`, prompt the user with the reworded language.
- Preserve all existing HiLL mechanics (state.md frontmatter updates, `oat_hill_completed` append, optional independent-review path via `oat-project-review-provide`).
- Handle the folded spec-HiLL case: if `"spec"` is also in `oat_hill_checkpoints`, append both to `oat_hill_completed` on approval.

**Interfaces:**

```
# Step 6: User-Review Gate (formerly Step 19 HiLL Gate)

Read state.md frontmatter:
  - oat_hill_checkpoints
  - oat_hill_completed

If "design" is in oat_hill_checkpoints (or "spec" is in oat_hill_checkpoints
and was not already completed via the standalone oat-project-spec skill):

  Prompt:
    > "Design written and committed to {design.md path}.
    >  spec.md (with confirmed requirements) is at {spec.md path}.
    >  Please review them and let me know if you want to make any changes
    >  before we move to planning.
    >
    >  Optional: run `oat-project-review-provide artifact design` for an
    >  independent reviewer pass first."

  Wait for user response:
    - Approval → continue to Step 7 (state update + commit).
    - Change requests → revise the relevant section(s); re-run self-review;
      re-prompt.

If neither "design" nor "spec" is in oat_hill_checkpoints, skip user-review
gate (still produce artifacts but no approval blocking).

On approval, update state.md:
  - Append "design" to oat_hill_completed.
  - If "spec" was in oat_hill_checkpoints and not previously completed,
    append "spec" too.
```

**Dependencies:**

- Existing HiLL state-update mechanics (current `oat-project-design/SKILL.md:346-403`).
- `oat-project-review-provide` (referenced as optional path; no changes required to that skill).

**Design Decisions:**

- **Folded HiLL append.** A single approval covers both spec and design HiLL when both are configured. This is the cleanest semantics — no migration logic needed for existing projects.
- **Reword, don't restructure.** Same gate, different prompt. Preserves familiarity for existing users while delivering the Superpowers-style invitation.
- **Independent review path mention.** Existing `oat-project-review-provide` integration is still mentioned in the prompt, satisfying the "Codex/Opus review" use case from discovery.

### Component 8: Quick-start requirements gate (FR11)

**Purpose:** Insert a brief conversational requirements-confirmation step into the quick-start straight-to-plan path.

**Responsibilities:**

- Fire after Step 2.5 if the user chooses (or auto-advances to) "Straight to plan", and before Step 3 (plan generation).
- Extract requirements from `discovery.md` (Key Decisions, Success Criteria, Constraints).
- Present as a one-screen bullet list.
- Wait for confirm / add / redirect.
- On addition: append to discovery.md, re-present.
- On bypass flag: skip silently.

**Interfaces:**

```
# Quick-start Step 2.6: Requirements Gate (NEW)

# Bypass check
if [ "${OAT_NO_REQUIREMENTS_GATE:-}" = "1" ] || [ "$ARG_NO_GATE" = "1" ]; then
  continue  # skip gate
fi

# Extract requirements from discovery
Read discovery.md sections:
  - Key Decisions
  - Success Criteria
  - Constraints

Format as bullet list and present:
  > "Before I generate the plan, here are the requirements I'm building against:
  >
  >    Key decisions:
  >    - [decision 1]
  >    - [decision 2]
  >
  >    Success criteria:
  >    - [criterion 1]
  >    - [criterion 2]
  >
  >    Constraints:
  >    - [constraint 1]
  >
  >  Does this match what you want, or should we adjust?"

Use AskUserQuestion (free-text + multi-choice "confirm | add | redirect").

On "add": prompt for additions, update discovery.md, re-present.
On "redirect": prompt for redirection, update discovery.md, re-present.
On "confirm": continue to Step 3.
```

**Dependencies:**

- `AskUserQuestion`.
- Read + Edit on discovery.md.
- Optional bypass via env var or skill argument.

**Design Decisions:**

- **No artifact written.** Conversational only. Keeps quick-start fast.
- **Bypass flag exists but is undocumented in the default UX.** Users who want to suppress the gate can; new users see it by default.
- **Re-present after edits.** If the user adds requirements, the new list is shown again — catches secondary assumptions surfaced by the first pass.
- **Position: between Step 2.5 (design depth choice) and Step 3 (plan generation).** Numbered as Step 2.6 to slot naturally.

### Component 9: Quick-start mode-choice for lightweight design (FR12)

**Purpose:** Apply the same mode-choice pattern from Component 1 to quick-start's lightweight design path (current Step 2.75).

**Responsibilities:**

- Fire at the top of Step 2.75 if the user chose "Lightweight design first" at Step 2.5.
- Use the same mechanics as Component 1 (TTY check, env var, skill argument, default to collaborative).
- Branch the rest of Step 2.75 into collaborative (existing pattern) or draft (new one-pass behavior).
- In draft mode: draft the lightweight design's reduced section set in one pass, run a scaled-down self-review, present at user-review gate.

**Interfaces:**

```
# Quick-start Step 2.75a: Lightweight Design Mode Choice (NEW)

DESIGN_MODE="${OAT_DESIGN_MODE:-${ARG_MODE:-}}"

if [ -z "$DESIGN_MODE" ]; then
  if [ -t 0 ]; then
    AskUserQuestion:
      "How would you like to work through the lightweight design?"
        1. Collaborative (recommended) — section-by-section
        2. Draft-and-review — full draft up front
  else
    DESIGN_MODE="draft"
  fi
fi

# Quick-start Step 2.75: Lightweight Design (BRANCHED)

if [ "$DESIGN_MODE" = "collaborative" ]; then
  # EXISTING behavior — incremental validation per
  # oat-project-quick-start/SKILL.md:244-251
  ...
else  # draft
  # NEW behavior — one-pass draft
  Draft all required sections (Overview, Architecture, Component Design,
    Testing Strategy) and any applicable optional sections (Data Models,
    API Design, Error Handling).
  Run scaled-down self-review (placeholder + consistency only — scope and
    ambiguity are less likely to bite at quick-start scale).
  Present user-review gate:
    "Lightweight design written and committed to {path}. Please review …"
fi
```

**Dependencies:** Same as Component 1.

**Design Decisions:**

- **Reduced section set preserved in both modes.** Quick-start's lighter touch (no security/performance/deployment/migration sections by default) applies to both collaborative and draft branches.
- **Scaled-down self-review.** At quick-start scale, only placeholder + consistency checks are run; scope and ambiguity are less likely to be issues.
- **Same env-var / skill-arg surface as full design.** Reduces cognitive load — one mode-choice convention for both skills.

### Component 10: `oat-project-spec` repositioning

**Purpose:** Update the spec skill's prose so that running it standalone makes sense, and so that nothing in the broader OAT system implies it is a required pipeline step.

**Responsibilities:**

- Update frontmatter `description:` field.
- Update closing-output prose to point at `oat-project-design` as the optional next step.
- (No mechanical changes — Steps 0-21 retain current logic.)

**Interfaces:**

Frontmatter edit:

```yaml
# Before
description: Use when discovery is complete and the project needs a formal requirements baseline. Transforms discovery output into structured specification artifacts.

# After
description: Optional standalone skill for formalizing requirements into a structured spec.md when discovery is complete but you're not ready to design yet. Independent of the design workflow — `oat-project-design` confirms requirements automatically and does not require this skill to be run first.
```

Closing-output edit (Step 21):

```
# Before
Specification phase complete for {project-name}.

Created:
- {N} functional requirements
- {N} non-functional requirements
- High-level design approach
- Success metrics

Next: Create detailed design with the oat-project-design skill

# After
Specification artifact created for {project-name}.

Created:
- {N} functional requirements
- {N} non-functional requirements
- High-level design approach
- Success metrics

Note: This skill is optional in the default workflow. `oat-project-design`
will confirm requirements automatically when run after discovery.

If you want to proceed to design now, run: `oat-project-design`
If you're parking the project here, the spec.md is committed and ready
to pick up later.
```

**Dependencies:** None new.

**Design Decisions:**

- **Description rewrite is the central change.** This is what shows up in skill discovery.
- **Closing-output prose preserves a path forward.** Users running spec standalone shouldn't feel orphaned.
- **Mechanics unchanged.** The skill's Steps 0-21 work as before.

### Component 11: `oat-project-discover` routing edits

**Purpose:** Stop discovery from auto-routing to spec; route to design instead.

**Responsibilities:**

- Update Step 11 HiLL approval prompt: replace "unlock `oat-project-spec`" with "unlock `oat-project-design`".
- Update Step 12 frontmatter setter: change `oat_ready_for: oat-project-spec` to `oat_ready_for: oat-project-design`.
- Update Step 15 closing-output: replace "Create specification with the oat-project-spec skill" with "Create design with the oat-project-design skill (which will confirm requirements automatically). If you'd rather formalize requirements first without designing, use `oat-project-spec` as a standalone step."
- Update `.oat/templates/discovery.md` `Next Steps` section to match.

**Interfaces:**

```
# Step 11 (current):
"Discovery artifact is ready. Approve discovery and unlock `oat-project-spec`?"

# Step 11 (new):
"Discovery artifact is ready. Approve discovery and unlock `oat-project-design`?"

# Step 12 (current):
oat_ready_for: oat-project-spec

# Step 12 (new):
oat_ready_for: oat-project-design

# Step 15 (current):
Discovery phase complete for {project-name}.
Next: Create specification with the oat-project-spec skill

# Step 15 (new):
Discovery phase complete for {project-name}.
Next: Create design with the oat-project-design skill (which will confirm
requirements automatically and produce both spec.md and design.md).
If you'd rather formalize requirements without designing yet, run
`oat-project-spec` as a standalone step.
```

`.oat/templates/discovery.md` `Next Steps` section update:

```markdown
## Next Steps

Use this discovery artifact to drive the next workflow step:

- **Spec-driven mode:** continue to `oat-project-design` (which confirms
  requirements and produces both `spec.md` and `design.md`).
- **Spec-driven mode → formalize-only:** use `oat-project-spec` standalone
  if you want a formalized requirements artifact but aren't ready to
  design yet.
- **Quick mode → straight to plan:** proceed directly to `plan.md` when
  scope is clear and no architecture decisions remain.
- **Quick mode → optional lightweight design:** produce a focused
  `design.md` (architecture, components, data flow, testing) before
  planning. Choose this when discovery surfaced architecture choices
  or component boundaries.
- **Quick mode → promote:** escalate to spec-driven if discovery revealed
  the scope is larger or more complex than expected.
```

**Dependencies:** Read + Edit on `oat-project-discover/SKILL.md` and `.oat/templates/discovery.md`.

**Design Decisions:**

- **Spec mentioned as optional, not deprecated.** The "formalize without designing" use case is real for some users.
- **Routing is hard-coded to design.** The expected default flow is discovery → design.

### Component 12: `AGENTS.md` workflow triage update

**Purpose:** Reflect the new workflow shape in the project's top-level guidance.

**Responsibilities:**

- Update the "Full spec-driven workflow" line in `AGENTS.md` workflow-options to no longer enumerate "Spec" as a discrete phase.
- Update prose elsewhere in `AGENTS.md` that implies spec is a required pipeline step.

**Interfaces:**

```
# Before
1. **Full spec-driven workflow** — Discovery → Spec → Design → Plan → Implement
   _Best for: complex features, cross-cutting concerns, multiple components, projects needing formal requirements or traceability._
   → Use `oat-project-new` (scaffolds spec-driven project)

# After
1. **Full spec-driven workflow** — Discovery → Design (with confirmed requirements & spec.md) → Plan → Implement
   _Best for: complex features, cross-cutting concerns, multiple components, projects needing formal requirements or traceability. Design produces both spec.md and design.md as part of one collaborative conversation._
   → Use `oat-project-new` (scaffolds spec-driven project)
```

**Dependencies:** Edit on `AGENTS.md`.

**Design Decisions:**

- **Keep workflow numbering and labels.** Don't churn the workflow-option list; just tighten the prose under "Full spec-driven."
- **Mention spec.md still exists as artifact.** Avoids the confusion of "wait, where did spec go?".

### Component 13: Repo-root `NOTICES.md` for borrowed external prose

**Purpose:** Satisfy FR14. Consolidate attribution for external prose lifted into OAT skills into a single repo-root file so skill files themselves stay clean (zero skill-file bloat), and establish a durable convention for future borrowings.

**Responsibilities:**

- Create `NOTICES.md` at the repo root.
- Record the Obra Superpowers attribution as the first entry.
- Establish a format future borrowings can append to.
- Add a single reference from `AGENTS.md` so contributors know where to record future borrowings.

**Interfaces:**

Proposed `NOTICES.md` content (created during implementation):

```markdown
# NOTICES

This file records attribution for externally-sourced prose incorporated
into this repository. When you adapt or lift prose from an external
project into a skill, template, or doc, add an entry here — do not
add attribution footers to the skill files themselves.

## Obra Superpowers

**Source:** https://github.com/obra/superpowers
**License:** MIT
**Version referenced:** 5.0.7

### `brainstorming` skill

Source file: `skills/brainstorming/SKILL.md`

Passages adapted or lifted verbatim into OAT:

- "Exploring approaches" (4 lines) — used in `oat-project-design` Component 3.5 (approach reaffirmation)
- "Presenting the design" (5 lines) — used in `oat-project-design` Component 4 (section iterator)
- "Design for isolation and clarity" (4 lines) — used as a principle in `oat-project-design`
- Self-review four-check template — used in `oat-project-design` Component 6
- User-review gate phrasing — used in `oat-project-design` Component 7

Consumer OAT skills: `oat-project-design`, `oat-project-quick-start`
(via lightweight-design mode choice inheriting the same prose).

The MIT license does not require in-derived-work attribution notices;
this record is kept for transparency and to make the provenance
discoverable without reading the `oat-project-design` history.
```

Proposed `AGENTS.md` addition (single sentence in an appropriate section):

```markdown
## External Attributions

Prose adapted from external projects is tracked in the repo-root
`NOTICES.md`. When borrowing from an external source, add an entry there.
```

**Dependencies:** None. One new file at repo root; one paragraph addition to `AGENTS.md`.

**Design Decisions:**

- **Consolidated, not per-skill.** One entry per external source, listing all consumer OAT skills. Future borrowings append to the same entry or add a new one. Keeps the file easy to scan and avoids duplication if multiple skills borrow from the same source.
- **Skill files themselves stay clean.** No HTML-comment footers, no attribution subsections, no frontmatter license fields. Zero skill-file bloat. A reader who wants provenance knows to consult `NOTICES.md`.
- **Format includes what was borrowed, not just that something was borrowed.** Listing the specific passages (with one-line descriptors) makes the record useful for future contributors deciding whether a change affects a borrowed passage.
- **AGENTS.md reference is one sentence.** Short enough not to dominate, findable via full-text search.

## Data Models

**No new data models or schemas.**

The shape of `discovery.md`, `spec.md`, `design.md`, and `state.md` frontmatter is unchanged. `oat_hill_checkpoints` and `oat_hill_completed` continue to use the same string values (`"discovery"`, `"spec"`, `"design"`, `"plan"`, `"implementation"`) — they retain meaning even though spec is no longer a discrete pipeline step.

## API Design

**No new APIs or interfaces.**

The OAT CLI surface (`oat config`, `oat project new`, `oat state refresh`) is unchanged. No new commands, no new flags on existing commands beyond skill-level arguments documented within each skill's prose (e.g., `--mode collaborative`).

The skill-level argument surface for `oat-project-design`:

```
oat-project-design [--mode collaborative|draft]
```

The skill-level argument surface for `oat-project-quick-start`:

```
oat-project-quick-start <project-name> ["project description"]
                        [--no-requirements-gate]
                        [--mode collaborative|draft]    # only relevant for lightweight design
```

The skill-level argument surface for `oat-project-spec`:

```
oat-project-spec   # unchanged
```

The skill-level argument surface for `oat-project-discover`:

```
oat-project-discover   # unchanged
```

Environment variables:

| Variable                   | Used by                                                      | Purpose                                                                 |
| -------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `OAT_DESIGN_MODE`          | `oat-project-design`, `oat-project-quick-start` (Step 2.75a) | Force `collaborative` or `draft` mode without an explicit prompt        |
| `OAT_NO_REQUIREMENTS_GATE` | `oat-project-quick-start` (Step 2.6)                         | Set to `1` to bypass the requirements gate on the straight-to-plan path |
| `OAT_NON_INTERACTIVE`      | `oat-project-design`, `oat-project-quick-start`              | Set to `1` to force draft mode regardless of TTY detection              |

## Security Considerations

**N/A — no security-sensitive surface.**

The change is prompt-only / docs-only. No authentication, authorization, network requests, file-permission changes, or data-protection considerations are introduced. All file writes target paths within the OAT project directory under the user's existing repo permissions.

## Performance Considerations

**N/A — performance characteristics are unchanged.**

The skills run in the same Skill-tool runtime they always have. Wall-clock time changes are user-experience matters (NFR4: collaborative mode should not feel meaningfully slower for simple projects), not system performance. No new I/O, no new processes spawned, no additional CPU/memory load.

The dogfooding step (NFR4 acceptance criterion) is the only "performance" verification — it's qualitative ("does this feel slower?") not quantitative.

## Error Handling

**Existing error patterns continue to apply.** The skills already handle:

- Missing prerequisite artifacts (e.g., spec.md → discovery.md missing → block and ask user to run discovery).
- Missing knowledge base (`oat-project-discover` Step 2 blocks if `.oat/repo/knowledge/project-index.md` is absent).
- Stale knowledge base (`oat-project-discover` Step 3 warns and asks user to refresh).
- HiLL gate non-approval (mark as in_progress, exit cleanly, allow re-run).

**New error scenarios introduced:**

| Scenario                                                                                                      | Handling                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mode-choice prompt times out / no user response                                                               | Fall back to draft mode; emit a banner. Same as non-interactive path.                                                                                                                                                                                                                                  |
| `--mode` argument has invalid value                                                                           | Skill emits an error and lists valid values; exits without modifying any artifacts.                                                                                                                                                                                                                    |
| Self-review surfaces issues that can't be fixed inline (e.g., contradictions requiring user input)            | Surface to user as a question; pause for response; re-attempt fix. If still unresolvable, escalate via "Open Questions" section in design.md.                                                                                                                                                          |
| Self-review surfaces genuine multi-subsystem scope                                                            | Escalate to user with a recommendation to split into multiple projects. Design skill does not itself orchestrate the split (that's the follow-up split-escape-hatch project); exit cleanly if user agrees to split, or document the scope concern and proceed if user chooses to continue as one plan. |
| Quick-start requirements gate: user requests addition that contradicts a discovery decision                   | Surface as a clarifying question; capture in discovery.md as a Decision Update; re-present.                                                                                                                                                                                                            |
| Folded HiLL: project state has `"spec"` in `oat_hill_checkpoints` but spec was previously approved standalone | The standalone approval already added `"spec"` to `oat_hill_completed`. Design HiLL only adds `"design"` (not duplicate-add `"spec"`).                                                                                                                                                                 |

## Testing Strategy

### Requirement-to-Test Mapping

| ID   | Verification                                                 | Key Scenarios                                                                                                                                                                                                                                                                 |
| ---- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR1  | manual: prose inspection + dogfood                           | Mode-choice prompt fires for interactive context; `--mode` arg overrides; both options present in prompt                                                                                                                                                                      |
| FR2  | manual: dogfood real OAT change with collaborative mode      | All sections presented one at a time with validation; section length scales to complexity; N/A sections shown as one-liner                                                                                                                                                    |
| FR3  | manual: dogfood + Superpowers-prose inspection               | Approach reaffirmation fires once before section drafting; if discovery Solution Space exists, one-sentence summary + confirm prompt; if not, 2-3-approaches block invoked inline with Superpowers' exact prose; no per-section options step anywhere in collaborative branch |
| FR4  | manual: skill prose + spec.md shape verification             | Requirements confirmation runs in both modes; spec.md produced with valid Requirement Index in both modes                                                                                                                                                                     |
| FR5  | manual: prose inspection + dogfood                           | Self-review fires after sections drafted, before HiLL; four named checks visible in skill prose; fixes happen inline                                                                                                                                                          |
| FR6  | manual: skill prose inspection                               | HiLL prompt language matches new wording; mentions `oat-project-review-provide` for optional independent review                                                                                                                                                               |
| FR7  | —                                                            | _(removed — deferred to follow-up split-escape-hatch project)_                                                                                                                                                                                                                |
| FR8  | manual: dogfood with `--mode draft`                          | Draft mode produces full design.md and spec.md without per-section prompts; self-review still runs; user-review gate fires once                                                                                                                                               |
| FR9  | integration: pipe stdin / non-TTY + unattended agent dogfood | `oat-project-design` with no TTY auto-falls-back to draft mode; banner emitted; no prompt blocks. End-to-end: a Claude agent orchestrator runs `discover → design → plan → implement` with `OAT_NON_INTERACTIVE=1` set and completes without blocking.                        |
| FR10 | manual: skill description + AGENTS.md inspection             | Spec skill description reflects standalone status; closing output mentions design as optional next step; AGENTS.md prose updated                                                                                                                                              |
| FR11 | manual: dogfood quick-start straight-to-plan                 | Requirements gate fires before plan; bypass flag works; addition path updates discovery.md and re-presents                                                                                                                                                                    |
| FR12 | manual: dogfood quick-start lightweight design               | Mode-choice fires at top of Step 2.75; reduced section set preserved in both modes                                                                                                                                                                                            |
| FR13 | manual: skill prose + template inspection                    | Discovery Step 11 + 12 + 15 + Next Steps template all route to design                                                                                                                                                                                                         |
| FR14 | manual: file-exists + format inspection                      | `NOTICES.md` exists at repo root; format matches spec (source project, skill, file path, license, consumer skills); AGENTS.md references it once; no in-skill attribution footers anywhere                                                                                    |
| NFR1 | integration: existing project regression                     | Pick one existing project in `.oat/projects/shared/*` with completed spec.md + design.md; run `oat-project-plan` against it; verify it succeeds                                                                                                                               |
| NFR2 | integration: synthetic state with both HiLL configs          | Construct state.md with both `"spec"` and `"design"` in `oat_hill_checkpoints`; run design; verify both appended to `oat_hill_completed` on approval                                                                                                                          |
| NFR3 | integration: `pnpm release:validate`                         | Command exits 0 in implementation PR                                                                                                                                                                                                                                          |
| NFR4 | manual: dogfood timing comparison                            | Run new design skill on a small OAT change; compare prompt count + wall-clock time vs current design                                                                                                                                                                          |
| NFR5 | manual: line count                                           | `wc -l .agents/skills/oat-project-design/SKILL.md` ≤ 700                                                                                                                                                                                                                      |
| NFR6 | manual: dogfood quick-start straight-to-plan                 | Verify single-prompt requirements gate; verify bypass flag                                                                                                                                                                                                                    |
| NFR7 | —                                                            | _(removed — heuristic no longer needed after FR3 aligned with Superpowers)_                                                                                                                                                                                                   |

### Unit Tests

**N/A.** This is a prompt/docs change. There is no code to unit-test. Skill prose is inherently integration/manual-tested by running the skill.

### Integration Tests

- **FR9 (non-interactive fallback):** Run `oat-project-design` with stdin redirected from `/dev/null` and verify it falls back to draft mode without blocking. Ideally script this as a one-line bash check that can run in CI.
- **NFR1 (artifact contract):** Pick one existing OAT project with completed `spec.md` and `design.md` (e.g., `.oat/projects/shared/docs-bootstrap-skill/` or similar). Run `oat-project-plan` against it and verify the plan generates without errors.
- **NFR2 (HiLL semantics):** Construct a synthetic project state.md with `oat_hill_checkpoints: ["spec", "design"]`, run the new design skill, approve the HiLL gate, verify both `"spec"` and `"design"` appear in `oat_hill_completed`.
- **NFR3 (release validation):** `pnpm release:validate` runs as part of CI; verify it passes with the version-bump and lockstep-bump changes.

### End-to-End Tests

- **Dogfood E2E (Collaborative):** Use the new design skill to design a real OAT change (suggest: a small enhancement to one of the OAT skills not in this PR's scope, like adding a single optional argument to `oat-project-open`). Verify the skill prompts for mode → requirements confirmation → section-by-section validation with at least one divergent options moment → self-review → user-review gate → HiLL approval. Verify both spec.md and design.md are produced.
- **Dogfood E2E (Draft-and-review):** Same as above but invoked with `--mode draft`. Verify no per-section prompts, only the user-review gate at the end.
- **Dogfood E2E (Unattended agent orchestration — FR9 enabler):** With `OAT_NON_INTERACTIVE=1` set, have a Claude agent orchestrator run `discover → design → plan → implement` end-to-end on a real small OAT change. Verify no skill blocks on prompts, all artifacts are produced, and the final result is indistinguishable from an interactive run (minus the section-by-section validation loops).
- **Dogfood E2E (Quick-start with requirements gate):** Run `oat-project-quick-start` with a well-understood request (e.g., "add `--verbose` flag to `oat-project-open`"). Verify the auto-advance path now hits the requirements gate before plan generation.
- **Dogfood E2E (Quick-start lightweight design with mode choice):** Run `oat-project-quick-start` with an exploratory request, choose lightweight design, verify mode-choice prompt fires, run through both branches in separate sessions.
- **Dogfood E2E (Spec standalone):** Run `oat-project-spec` after a discovery to verify the standalone path still works and the closing output points at design as the optional next step.

## Deployment Strategy

### Build Process

`pnpm build` (already covered in `AGENTS.md`).

### Deployment Steps

This is a code repo change, deployed via standard PR workflow:

1. Create branch from `main` (the user noted the current `hungry-khorana` worktree is out of date with upstream — implementation should rebase or re-branch from upstream main).
2. Implement changes per the implementation phases below.
3. Run local validation: `pnpm lint`, `pnpm format`, `pnpm type-check`, `pnpm test`, `pnpm release:validate`.
4. Open PR; CI runs the same suite + build.
5. Code review (`oat-project-review-provide` recommended for self-review before requesting human review).
6. Merge → standard release process picks up the version-bumped public packages.

### Rollback Plan

Standard git revert. Because this is prompt-only / docs-only, there is no migration to roll back beyond reverting the commit. Existing projects' `state.md` files do not require any data migration — folded HiLL semantics handle existing state transparently (NFR2).

### Configuration

No new configuration files. New env vars (`OAT_DESIGN_MODE`, `OAT_NO_REQUIREMENTS_GATE`, `OAT_NON_INTERACTIVE`) are documented in this design and in the relevant skill prose.

### Monitoring

No application monitoring; this is a CLI-tool change. The user's own use of the skills is the only "monitoring" — dogfooding during implementation and post-merge is the feedback loop.

## Migration Plan

**No migrations required.**

- No database migrations (no databases involved).
- No data migrations (existing project artifacts in the new format are produced afresh by the new flow; existing projects already in `complete` state continue to work because the artifact contract is unchanged — NFR1).
- No breaking changes to env vars, CLI commands, or skill argument surfaces (new env vars are additive; new skill args are optional).

**Behavioral migration for users:**

- Users whose muscle memory is `oat-project-discover → oat-project-spec → oat-project-design` will be redirected by the new discovery output (Step 15) and the spec skill's closing output. PR description should call this out.
- No code-side migration; this is a documentation/UX migration only.

## Open Questions

- **TTY detection reliability inside Skill tool runtime:** The proposed design uses `[ -t 0 ]` to detect interactivity. Implementation should verify this works reliably across Claude Code's Skill tool execution context. If it doesn't, fall back to `OAT_NON_INTERACTIVE` env var as the only signal.
- **Spec authoring code reuse vs duplication:** The requirements-confirmation sub-step (Component 3) duplicates ~200 lines of prose from `oat-project-spec` Steps 6-16. Implementation should decide: (a) duplicate (simpler, slight drift risk), (b) extract into a shared skill `include` mechanism if one exists, (c) reference the spec skill's prose by line number. Recommendation: duplicate for v1 (lowest risk), revisit later if drift becomes a problem.
- **HiLL prompt wording final copy:** The proposed Component 7 wording is illustrative. Implementation should confirm the exact phrasing matches OAT's voice elsewhere in the codebase.
- **Quick-start requirements-gate UX scope:** Component 8 lists `confirm | add | redirect` as multi-choice options. Implementation should verify this matches `AskUserQuestion`'s UX patterns and refine if needed.
- **Section iterator implementation: per-section commit or one final commit?** Component 4 design decision is "final commit only". Implementation should verify this aligns with existing `oat-project-design` commit pattern.
- **Version-bump strategy:** All four touched skills get a minor bump? Major bump for any of them? Implementation should propose a coordinated bump strategy in the PR.
- **Should `AGENTS.md` workflow triage retain "Spec" anywhere?** Component 12 proposes dropping the explicit "Discovery → Spec → Design" listing. Implementation should sanity-check there isn't another reference elsewhere in `AGENTS.md` or `apps/oat-docs/docs/` that still implies the old shape.

## Implementation Phases

### Phase 1: Skill rewrites (core changes)

**Goal:** Apply all four skill rewrites + template/AGENTS updates in a single coordinated commit set.

**Tasks:**

- Rework `oat-project-design/SKILL.md` — add Components 1, 3, 3.5, 4, 6, 7 (mode choice with non-interactive fallback, requirements confirmation, approach reaffirmation — one divergent moment — using Superpowers' exact prose, section iterator with collaborative branch + draft-and-review branch, self-review, reworded HiLL prompt). Components 2 and 5 are removed/reserved — do not implement anything in those slots.
- Create repo-root `NOTICES.md` documenting borrowed Superpowers prose (FR14). Reference it from `AGENTS.md` once.
- Extend `oat-project-quick-start/SKILL.md` — add Components 8-9 (requirements gate, mode-choice for lightweight design).
- Update `oat-project-spec/SKILL.md` — Component 10 (description + closing-output edits).
- Update `oat-project-discover/SKILL.md` — Component 11 (Step 11 + 12 + 15 routing edits).
- Update `.oat/templates/discovery.md` — Component 11 (Next Steps section).
- Update `AGENTS.md` — Component 12 (workflow triage prose).
- Bump `version:` in all four touched skill frontmatters.

**Verification:**

- Manual prose inspection of each touched file.
- `pnpm lint` and `pnpm format` pass.

### Phase 2: Lockstep version bumps + release validation

**Goal:** Satisfy AGENTS.md release rules.

**Tasks:**

- Bump version in `packages/cli/package.json`.
- Bump version in `packages/control-plane/package.json`.
- Bump version in `packages/docs-config/package.json`.
- Bump version in `packages/docs-theme/package.json`.
- Bump version in `packages/docs-transforms/package.json`.
- Run `pnpm install` to update lockfile.
- Run `pnpm release:validate`.

**Verification:**

- `pnpm release:validate` exits 0.

### Phase 3: Dogfood validation

**Goal:** Confirm the new flow works end-to-end on a real change.

**Tasks:**

- Pick a small follow-up OAT change (e.g., add a new optional argument to a different OAT skill).
- Run `oat-project-new <follow-up-name> --mode spec-driven`.
- Run the new `oat-project-design` in collaborative mode; verify all FR1-FR7 + NFR4 acceptance criteria.
- Re-run with `--mode draft`; verify FR8 acceptance criteria.
- Run `oat-project-quick-start` with a well-understood request; verify FR11 (requirements gate) acceptance criteria.
- Run `oat-project-quick-start` with an exploratory request; verify FR12 (lightweight design mode choice) acceptance criteria.
- Run `oat-project-spec` standalone; verify FR10 acceptance criteria (closing-output points to design).

**Verification:**

- All FR/NFR acceptance criteria from `spec.md` are met.
- No regressions on existing projects (NFR1 verification passes on at least one existing project).

### Phase 4: PR + review

**Goal:** Land the change.

**Tasks:**

- Open PR with description that calls out the behavioral migration for existing users.
- Run `oat-project-review-provide artifact design` for fresh-context review.
- Address review feedback.
- Merge to main.

**Verification:**

- PR CI passes.
- Reviewer (human or `oat-project-review-receive`) approves.
- `oat-project-pr-final` runs cleanly.

## Dependencies

### External Dependencies

- **None.** No new third-party packages.

### Internal Dependencies

- **`AskUserQuestion`** — already in `oat-project-design` allowed-tools (`oat-project-design/SKILL.md:7`). Verify it's in `oat-project-spec` and `oat-project-discover` allowed-tools too (no rewrites required for those, but their existing prompts use it).
- **Existing `oat-project-review-provide` skill** — referenced from the new HiLL prompt (Component 7) for optional independent review. No changes required to that skill.
- **Existing OAT scaffolder (`oat project new`)** — unchanged. New projects scaffolded the same way; the workflow change is in skill prose, not scaffolding.
- **`oat state refresh` command** — called by quick-start; unchanged.

### Development Dependencies

- **Node.js 22.17.0** (per AGENTS.md). Existing requirement.
- **pnpm 10.13.1** (per the warning in `pnpm run cli` output). Existing requirement.
- **Turborepo, oxlint, oxfmt** — existing build/lint stack. Unchanged.
- **`pnpm release:validate`** — must pass.

## Risks and Mitigation

- **Risk: (removed — was "divergent 2-3 options at decision points becomes perfunctory")**
  - Mitigated structurally by aligning FR3 with Superpowers' actual pattern: one approach-level divergent moment (Component 3.5) rather than per-section. No per-section judgment call means no perfunctory-options failure mode can occur. The single approach-level moment has clear invocation logic (Solution Space exists or doesn't) that doesn't depend on prose heuristics.

- **Risk: Reworked design skill becomes too long to maintain.**
  - **Probability:** Medium | **Impact:** Medium
  - **Mitigation:** NFR5 line budget (≤ 700 lines). Named sub-steps (Components 1-7 each have a clear identity).
  - **Contingency:** If line budget is exceeded, extract requirements confirmation (Component 3) into a shared helper rather than duplicating from `oat-project-spec`. (See Open Questions on code reuse.)

- **Risk: Existing users surprised by spec being decoupled from pipeline.**
  - **Probability:** Medium | **Impact:** Low-Medium
  - **Mitigation:** Component 10 (spec closing-output edits) and Component 11 (discovery routing edits) collectively make the new flow obvious to muscle-memory users. PR description should explicitly call out the migration.
  - **Contingency:** If users complain, add a one-time deprecation banner to `oat-project-spec` for a release or two: "Note: spec is no longer auto-routed from discovery. Run `oat-project-design` to author both spec and design in one flow."

- **Risk: Downstream skill (e.g., `oat-project-plan`) implicitly depends on spec-before-design ordering.**
  - **Probability:** Low | **Impact:** Medium-High
  - **Mitigation:** NFR1 acceptance criterion explicitly requires testing against an existing project. Phase 3 dogfooding catches this.
  - **Contingency:** If a downstream skill turns out to depend on spec-then-design ordering, extend the rework to make it order-independent (small change; would not regress).

- **Risk: Mode-choice prompt clashes with automation.**
  - **Probability:** Low | **Impact:** Medium
  - **Mitigation:** FR9 non-interactive fallback; `OAT_DESIGN_MODE` env var; `--mode` argument override.
  - **Contingency:** If TTY detection is unreliable in the Skill tool runtime, fall back to env-var-only signaling.

- **Risk: Lockstep version bump is missed.**
  - **Probability:** Low | **Impact:** High (release breaks)
  - **Mitigation:** Phase 2 explicitly enumerates all five public packages. NFR3 acceptance criterion gates PR completion on `pnpm release:validate`.
  - **Contingency:** If `pnpm release:validate` fails, fix bumps and re-run before merging.

- **Risk: Collaborative mode feels slow on simple projects.**
  - **Probability:** Medium | **Impact:** Medium
  - **Mitigation:** FR2 acceptance criterion (section depth scales to complexity, N/A sections are one-liners). NFR4 dogfood-comparison validation.
  - **Contingency:** If collaborative is reported as too slow, sharpen the skill's "scale section depth to complexity" language to default to one-liner sections more aggressively.

- **Risk: Self-review introduces a long pause that confuses the user.**
  - **Probability:** Low | **Impact:** Low
  - **Mitigation:** Self-review is a silent agent-side pass — no user prompt fires. The user only sees the final user-review gate (Component 7).
  - **Contingency:** Add a brief "running self-review" status line if dogfooding shows the pause is noticeable.

- **Risk: Quick-start requirements-gate annoys "just do it" users.**
  - **Probability:** Low-Medium | **Impact:** Low
  - **Mitigation:** FR11 acceptance criterion includes bypass flag (`OAT_NO_REQUIREMENTS_GATE` / `--no-requirements-gate`).
  - **Contingency:** If complaints surface, default the gate to off and require an opt-in. (Reverse the polarity.)

- **Risk: Folded spec authoring duplicates ~200 lines of prose between `oat-project-spec` and `oat-project-design`, causing drift.**
  - **Probability:** Medium | **Impact:** Low-Medium
  - **Mitigation:** Open question flagged for implementation. v1 duplicates; future iteration can extract shared content.
  - **Contingency:** Add a note at the top of the duplicated section in both skills referencing the other ("if you change this prose, update both files").

## References

- Specification: `spec.md`
- Discovery: `discovery.md`
- Comparative analysis: `reference/comparative-analysis.md`
- Obra Superpowers source files: `reference/superpowers-*.md`
- Knowledge Base: `.oat/repo/knowledge/project-index.md`
- Architecture Docs: `.oat/repo/knowledge/architecture.md`
- Conventions: `.oat/repo/knowledge/conventions.md`
- Project conventions: `AGENTS.md`
- Touched OAT skill files (paths are relative to repo root):
  - `.agents/skills/oat-project-discover/SKILL.md` (current v1.3.0)
  - `.agents/skills/oat-project-spec/SKILL.md` (current v1.2.0)
  - `.agents/skills/oat-project-design/SKILL.md` (current v1.2.0)
  - `.agents/skills/oat-project-quick-start/SKILL.md` (current v1.3.3)
- Touched template files:
  - `.oat/templates/discovery.md`
- Touched docs:
  - `AGENTS.md`
- New files:
  - `NOTICES.md` (repo root) — consolidated attribution for borrowed Superpowers prose (FR14)
- Touched package files (lockstep version bumps):
  - `packages/cli/package.json`
  - `packages/control-plane/package.json`
  - `packages/docs-config/package.json`
  - `packages/docs-theme/package.json`
  - `packages/docs-transforms/package.json`
