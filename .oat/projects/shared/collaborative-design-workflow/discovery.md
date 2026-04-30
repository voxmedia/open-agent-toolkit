---
oat_status: complete
oat_ready_for: oat-project-spec
oat_blockers: []
oat_last_updated: 2026-04-30
oat_generated: false
---

# Discovery: collaborative-design-workflow

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Rework the OAT discovery/design/quick-start workflow skills so that design feels collaborative — similar to Obra's Superpowers `brainstorming` skill (installed locally at `~/.claude/plugins/cache/claude-plugins-official/superpowers/5.0.7/skills/`), which:

1. Presents 2–3 genuinely distinct approaches at real decision points (divergent thinking).
2. Walks through the design in sections, validating each before moving on (convergent thinking).
3. Treats every project as worth brainstorming — even "simple" ones — because unexamined assumptions cause the most wasted work.

The user's observation: OAT's discovery does divergent exploration well at the _project_ level (`oat-project-discover` Step 9 — "2–3 approaches"), but the **design** phase mechanically drafts every section offline and reviews at the end (`oat-project-design` Steps 5–17 all run before the single Step 18 review). The quick-start workflow in particular feels like "confirm-or-reject on a single draft," not "choose between options together." The user also wants an explicit **escape hatch** for sessions where they prefer the agent to draft the full design and then let them (or a peer reviewer like Codex/Opus) critique the whole thing.

A secondary concern surfaced during discovery: the standalone **spec** phase (between discovery and design) creates a phase boundary that resets conversational context, forcing the user through three rounds of artifact review (discovery → spec → design) before any plan exists.

See `reference/comparative-analysis.md` for the full side-by-side analysis of Superpowers' `brainstorming`, `writing-plans`, `using-superpowers`, and `verification-before-completion` skills vs OAT's `oat-project-discover`, `oat-project-spec`, `oat-project-design`, and `oat-project-quick-start` skills. The source Superpowers files (and additional referenced skills) are checked in alongside the analysis for reproducibility.

## Clarifying Questions

### Question 1: Where does divergent "2–3 approaches" thinking currently live?

**Q:** Discovery Step 9 already presents 2–3 approaches for the solution space. Does the design skill do this too?
**A:** No. The current design skill reads `spec.md` cold and mechanically drafts each section (architecture, components, data model, APIs, etc.) without surfacing architectural alternatives to the user. (Source: `oat-project-design/SKILL.md:113-329`.)
**Decision:** Divergent thinking needs a second venue — _inside_ design, at each genuine architectural decision point (component pattern, data model, API style, etc.) — in addition to discovery's project-level approach exploration.

### Question 2: What is the value of the standalone spec phase?

**Q:** If we want design to feel like one continuous conversation, is the current spec skill's role (formalizing requirements) worth keeping as its own phase?
**A:** The spec skill's _requirements confirmation_ step (`oat-project-spec/SKILL.md:224-239`, Step 10 — presenting formalized FRs/NFRs/acceptance criteria as a structured list for the user to validate) is genuinely valuable. Superpowers has no equivalent structured-requirements step. But OAT's phase boundary resets conversational context and forces a third round of artifact review.
**Decision:** Keep the requirements-confirmation _value_ but move it inside the design conversation. Still produce a distinct `spec.md` artifact (traceability matters), but author it as part of the design flow rather than a separate phase with its own cold-start.

### Question 3: Should the spec skill be deleted?

**Q:** If spec authoring folds into design, does the standalone `oat-project-spec` skill still have a reason to exist?
**A:** Yes — for the narrow case where the user has completed discovery but isn't ready to design yet (handing off to someone else, parking the project, capturing requirements while fresh). It should be invoked manually, never auto-routed as a pipeline step.
**Decision:** Keep `oat-project-spec` as a standalone utility. Update its description to clarify it's optional and independent of the design workflow. Remove it from the auto-directed discovery → spec → design pipeline.

### Question 4: How should quick-start handle "well-understood" requests?

**Q:** Quick-start currently auto-advances straight to plan for well-understood requests (`oat-project-quick-start/SKILL.md:172`), skipping lightweight design entirely. Does that lose the Superpowers safety net — "simple projects are where unexamined assumptions cause the most wasted work" (`superpowers-brainstorming.md:18`)?
**A:** Yes — but full collaborative design would be overkill for a truly small change. The right compromise is a brief requirements check before plan generation — a lightweight "here are the requirements I'm building the plan around, does this match your thinking?" confirmation step. Not a full artifact, just a conversational gate.
**Decision:** For the quick-start → straight-to-plan path, insert a brief requirements confirmation before plan generation. For the quick-start → lightweight design path, apply the same collaborative/draft-and-review mode choice as the full design skill.

### Question 5: What does the "escape hatch" look like?

**Q:** Sometimes the user wants the agent to just draft the design and let them (or an independent reviewer like Codex/Opus) critique it, rather than sit through section-by-section dialogue. How should that be offered?
**A:** Offer an explicit **mode choice at the start of design**: (1) Collaborative — section-by-section with options at decision points; (2) Draft-and-review — full draft generated up front, user reviews holistically (optionally via a peer reviewer). Both modes produce the same artifacts.
**Decision:** Add a mode-selection step at the top of the design skill. Default behavior (when not asked) is collaborative, matching Superpowers' ethos. Draft-and-review is the escape hatch.

### Question 6: Does discovery itself need changes?

**Q:** Discovery's gray-area multi-select (Step 7) and solution-space exploration (Step 9) already work well. Should we touch it?
**A:** Minimal changes. Discovery's existing patterns are close to what Superpowers does for brainstorming. The gap is entirely downstream of discovery.
**Decision:** Leave `oat-project-discover` largely untouched. Any changes are limited to documentation tweaks that clarify what design now does (since spec is folded in) and updating discovery's `Next Steps` template so it no longer routes automatically to `oat-project-spec`.

### Question 7: Does quick-start's lightweight-design already use the Superpowers section-by-section pattern?

**Q:** Does `oat-project-quick-start` Step 2.75 already implement the pattern we're trying to propagate?
**A:** Partially. Step 2.75 (`oat-project-quick-start/SKILL.md:244-251`) says "Present design incrementally for validation: Draft architecture → present → Draft component design → present → Draft data flow + testing → present. After each chunk, ask: 'Does this look right, or should we adjust before continuing?'" This is exactly the Superpowers section-by-section pattern. But it's only reachable in lightweight-design mode, and only when the user opts into that mode — which itself is bypassed by the auto-advance rule for well-understood requests.
**Decision:** The pattern is already validated in quick-start and should become the default interaction pattern for the full design skill. The work is largely about propagating an existing OAT pattern to a new home and adding the divergent "options at decision points" layer on top.

### Question 8: Should the design skill adopt Superpowers' self-review and user-review gate patterns?

**Q:** Superpowers' brainstorming skill has a spec self-review step (`superpowers-brainstorming.md:116-124`) — after writing the design, inline-fix for placeholders, internal consistency, scope, ambiguity — and a user-review gate ("Please review it and let me know if you want to make any changes") before transitioning to writing-plans. Does OAT have equivalents?
**A:** Partially. OAT's spec quality gate (`oat-project-spec/SKILL.md:327-360`, Step 16) covers the same checklist categories but lives in spec, not design. OAT's HiLL gate is framed as phase approval, not as a "please go read the file" review invitation.
**Decision:** When spec-authoring folds into design, the spec quality-gate pattern should travel with it and become a design self-review step. The HiLL approval prompt should also be softened to explicitly invite the user to read the committed artifact before approving, in the Superpowers style.

### Question 9: What about Superpowers' anti-"too simple" hard gate?

**Q:** Superpowers has a `<HARD-GATE>` at the top of brainstorming — "Do NOT invoke any implementation skill, write any code, scaffold any project, or take any implementation action until you have presented a design and the user has approved it. This applies to EVERY project regardless of perceived simplicity." (`superpowers-brainstorming.md:12-14`). Should OAT adopt this?
**A:** No. OAT's quick-start exists precisely because users have validated that for truly well-understood requests, ceremony is counterproductive. Auto-advance to plan is a user-validated feature. But we can partially close the "unexamined assumption" gap via the requirements-confirmation conversational gate (Decision #4) without imposing the full hard-gate discipline.
**Decision:** Do not adopt Superpowers' "every project gets design" hard gate. Instead, add the lighter-weight requirements-confirmation gate as a partial mitigation.

### Question 10: Should the design skill add a sub-project decomposition check?

**Q:** Superpowers' brainstorming skill opens with: "if the request describes multiple independent subsystems (e.g., 'build a platform with chat, file storage, billing, and analytics'), flag this immediately. Don't spend questions refining details of a project that needs to be decomposed first." (`superpowers-brainstorming.md:73-74`). OAT doesn't have an explicit equivalent. Worth adding?
**A:** Considered but ultimately dropped from this project's scope. Detection of "this is really N sub-projects" already happens organically during `oat-project-discover` (the solution-space exploration naturally surfaces multi-subsystem scope). What OAT actually lacks is not a _detection_ step but a _graceful hand-off mechanism_ — a codified escape hatch that, when decomposition is the right call, can create multiple seeded projects (either with brief summaries for each to pick up later, or via an expanded cross-cutting brainstorm now with richer per-project discovery files and one chosen for immediate execution). That hand-off mechanism is its own design problem and deserves a separate project.
**Decision:** Do not add a sub-project decomposition advisory step to the design skill. Detection continues to happen naturally in discovery. A codified split-escape-hatch is tracked in Deferred Ideas as a follow-up project.

## Solution Space

Three genuinely distinct strategies for incorporating Superpowers' collaborative brainstorming pattern into OAT:

### Approach 1: Enhance design in place, keep phase structure _(Recommended)_

**Description:** Rework the `oat-project-design` skill to: (a) offer a mode choice (collaborative vs. draft-and-review) at the top; (b) in collaborative mode, walk through each design section interactively, presenting 2–3 options at real decision points and validating before moving on; (c) fold spec authoring into the design flow (requirements confirmation + `spec.md` generation happen inside design); (d) add a design self-review step modeled on Superpowers' spec self-review; (e) soften the HiLL prompt to explicitly invite the user to read the committed artifact before approving. Update `oat-project-quick-start` with the same mode choice for its lightweight design branch, and add a brief requirements-check step for the straight-to-plan branch. Keep `oat-project-spec` as a standalone, manually-invoked utility — decoupled from the default pipeline. Leave `oat-project-discover` largely alone (minor Next Steps wording changes).

**When this is the right choice:** When the existing phase abstraction (discovery → design → plan) is well-understood by users and tooling, and the goal is to make design _feel_ conversational without re-architecting the workflow. Preserves backward compatibility for anything that depends on the artifact contract (`spec.md`, `design.md`, `plan.md`).

**Tradeoffs:** The design skill gets more complex (handles two interaction modes + spec authoring + self-review). Requirements traceability logic must move into design. Two modes means more surface area to document and test.

### Approach 2: Introduce a new "brainstorm" skill that replaces spec + design

**Description:** Create a new skill (e.g., `oat-project-brainstorm`) that fuses spec and design into one continuous conversation — more directly analogous to Superpowers. Deprecate `oat-project-design` and `oat-project-spec` (keep them as compatibility shims or remove outright). Brainstorm produces both `spec.md` and `design.md` from one conversational flow. Quick-start's lightweight design path also invokes the new skill.

**When this is the right choice:** When the existing split between spec and design is considered a design mistake and the user wants to make a clean break. Best if OAT has few external dependencies on the current skill names.

**Tradeoffs:** Breaking change — every reference to `oat-project-design` / `oat-project-spec` in docs, templates, quick-start, and any automation must be updated. Higher churn, harder to roll back. Mixes a naming/semantic change with a behavior change.

### Approach 3: Layer a new "interactive design" variant alongside the existing skill

**Description:** Leave `oat-project-design` as-is (draft-and-review behavior). Introduce a second skill — e.g., `oat-project-design-collaborative` — that implements the section-by-section, divergent-at-decision-points flow. Quick-start and full workflow both choose between them. Keep spec as-is.

**When this is the right choice:** When there's real uncertainty about whether the collaborative pattern is an improvement for all use cases, and the user wants to ship both and let behavior emerge.

**Tradeoffs:** Two design skills to maintain, document, and keep in sync. Creates decision fatigue for users. Doesn't address the spec-as-phase-boundary problem at all. Risk of skill proliferation ("which design skill do I run?").

### Chosen Direction

**Approach:** Approach 1 — Enhance design in place, keep phase structure.

**Rationale:** The user explicitly chose this direction during discovery. Key reasons: (a) the existing phase shape is understood and the artifact contract has real consumers; (b) the user already validated that "generate spec as a byproduct of design + keep it as a separate artifact" is the right instinct; (c) the escape hatch (draft-and-review mode) means we don't need a second skill to cover the non-collaborative use case; (d) keeping `oat-project-spec` as a standalone utility preserves the "formalize-without-designing-yet" use case without cluttering the auto-directed pipeline; (e) the section-by-section interaction pattern already exists in `oat-project-quick-start` Step 2.75, so we're propagating a validated OAT pattern rather than importing something foreign.

**User validated:** Yes — explicitly confirmed during the discovery conversation.

## Options Considered

### Option A: Merge spec + design into one artifact file

**Description:** Produce a single `design.md` with a "Requirements" section at the top; don't maintain `spec.md` as its own file.

**Pros:**

- One artifact to read end-to-end.
- No cross-file drift between spec and design.

**Cons:**

- Loses requirement-ID traceability that downstream (plan tasks, test coverage, PR descriptions) depends on — specifically, `oat-project-spec/SKILL.md:296-326` defines the Requirement Index format used by `oat-project-design` Step 12a (requirement-to-test mapping) and by `oat-project-plan`.
- Loses the standalone-spec use case entirely (no artifact to produce if someone only wants to formalize requirements).

**Chosen:** Neither — rejected.

**Summary:** Keep `spec.md` and `design.md` as distinct artifacts. Authorship merges; artifacts don't.

### Option B: Mode choice (collaborative vs draft-and-review) as skill-level flag vs runtime prompt

**Description:** Decide whether the user picks a mode via (a) an argument to the skill (e.g., `oat-project-design --draft-and-review`), (b) a runtime question asked by the skill itself, or (c) both.

**Pros (runtime prompt):**

- Discoverable — the user sees the option even if they didn't know it existed.
- Consistent with how other OAT skills ask clarifying questions via `AskUserQuestion`.

**Pros (skill flag):**

- Scriptable / non-interactive usage works.
- Power users can skip the prompt.

**Cons (runtime prompt alone):**

- Adds one more prompt per invocation.

**Cons (skill flag alone):**

- Not discoverable for new users.

**Chosen:** Both. Runtime prompt by default; skill flag as override. Default behavior (no flag, no prior context) is collaborative. When non-interactive (no TTY detected), default to draft-and-review rather than blocking on a prompt.

**Summary:** Offer the mode choice via a runtime prompt at the top of the design skill, with an optional argument/flag for users who want to skip the prompt, and a safe non-interactive fallback.

### Option C: Requirements check for quick-start straight-to-plan — full artifact vs conversational gate

**Description:** When quick-start skips lightweight design and goes straight to plan, how do we surface requirements for confirmation? (a) Generate a minimal `spec.md`; (b) Ask a brief in-conversation "here are the requirements I'm building against, confirm?" without writing an artifact; (c) Skip this step entirely (current behavior).

**Pros (artifact):**

- Consistent with other paths — every project has a `spec.md`.
- Reviewable later.

**Pros (conversational gate):**

- Fast — keeps quick-start _quick_.
- Catches assumptions without adding a review cycle.

**Cons (artifact):**

- Slows down the quick-start path that exists precisely for speed.
- Pushes quick-start closer to full workflow, eroding its reason to exist.

**Cons (conversational gate):**

- Not reviewable after the fact; the confirmation lives only in the conversation.

**Chosen:** B — conversational gate.

**Summary:** Add a brief in-conversation requirements confirmation before plan generation on the quick-start → straight-to-plan path. No artifact. Keep quick-start fast.

### Option D: Design self-review — subagent-dispatched vs inline

**Description:** Superpowers' spec self-review (`superpowers-brainstorming.md:116-124`) is a fresh-eyes inline pass by the same agent. The project has an additional option: dispatch the existing `oat-project-review-provide` skill or a new subagent to review the design before HiLL. (Previously labeled Option E; renumbered to D after sub-project decomposition was dropped from scope.)

**Pros (inline):**

- No extra skill dependency.
- Matches Superpowers directly.
- Fast.

**Pros (subagent-dispatched):**

- Genuinely fresh context.
- Reuses OAT's existing review infrastructure.

**Cons (inline):**

- Same-agent bias risks missing problems.

**Cons (subagent-dispatched):**

- More complex; adds a user-facing wait.

**Chosen:** Inline self-review by default; make the subagent-dispatched review an explicit optional step ("Run `oat-project-review-provide artifact design` for independent review before HiLL?") that parallels the existing HiLL prompt option.

**Summary:** Add an inline self-review as a new step; keep the existing `oat-project-review-provide` as the optional independent-review path.

## Key Decisions

1. **Fold spec authoring into design:** Requirements confirmation + `spec.md` generation happen inside the design skill's conversational flow. `spec.md` and `design.md` remain distinct artifacts; authorship merges into one continuous conversation.
2. **Two interaction modes for design:** Collaborative (section-by-section with 2–3 options at real decision points) is the default. Draft-and-review (full draft generated up front for holistic review) is the escape hatch. Mode is chosen at the top of the design skill via runtime prompt, with an optional override flag; non-interactive contexts default to draft-and-review.
3. **Decouple `oat-project-spec` from the pipeline:** Keep it as a standalone, manually-invoked utility for the "formalize requirements without designing yet" use case. Update its description to reflect standalone status. Remove it from auto-directed next-step guidance in discovery, quick-start, and `AGENTS.md`.
4. **Quick-start straight-to-plan gains a conversational requirements gate:** A brief "here are the requirements I'm building against" confirmation before plan generation. No artifact. Prevents the "unexamined assumptions" failure mode without slowing quick-start meaningfully.
5. **Quick-start lightweight design adopts the same two-mode choice:** Collaborative / draft-and-review, scaled down to match quick-start's lighter touch. Quick-start Step 2.75's existing section-by-section pattern becomes the collaborative-mode behavior; draft-and-review is the new alternative.
6. **Divergent thinking aligned with Superpowers' actual pattern — one approach-level moment before section drafting.** OAT's discovery already does project-level divergent exploration (`oat-project-discover` Step 9 — 2–3 approaches). The design skill adds one lightweight Approach Reaffirmation step: re-read discovery's Solution Space, confirm the Chosen Direction still holds in a one-sentence prompt, or (if no Solution Space section exists because the request was well-understood enough to bypass Step 9) invoke Superpowers' 2-3-approaches pattern inline using their exact prose. **No per-section scripted options step.** Section-level divergent thinking fires organically when the user pushes back on a drafted section — matching Superpowers' "be ready to go back and clarify if something doesn't make sense." This revision (from an earlier draft that proposed per-section heuristics) eliminates the highest-risk prose in the rework.
7. **Discovery skill is largely untouched.** Existing gray-area multi-select, solution-space exploration, and approach recommendation work well. Only doc-level tweaks: (a) `Next Steps` template stops auto-routing to `oat-project-spec`, (b) Step 15 output references the new design-skill entry point.
8. **Design skill inherits Superpowers-style self-review + user-review gate:** After drafting (in either mode), run a fresh-eyes self-review (placeholder/consistency/scope/ambiguity) with inline fixes. Then soften the HiLL approval prompt to explicitly invite the user to read the committed artifact: "Design written and committed to `<path>`. Please review it and let me know if you want changes before moving to planning."
9. **YAGNI principle made explicit:** Add "YAGNI ruthlessly — remove unnecessary features from all designs" as a principle in the design skill's guardrails, matching Superpowers' explicit stance.

_(A tenth decision — a sub-project decomposition advisory at the top of design — was considered and dropped; see Question 10 above. Detection already happens organically in discovery; a codified split-escape-hatch belongs in its own follow-up project — tracked in Deferred Ideas.)_

## Constraints

- **Backward compatibility with artifact contract:** Downstream skills (`oat-project-plan`, `oat-project-implement`, review skills, PR skills) read `spec.md` and `design.md`. The shape/content of these files must remain compatible — they can grow, but existing sections must stay parseable. Specifically: the `Requirement Index` format in spec.md (`oat-project-spec/SKILL.md:296-326`) and the component/data-model/API sections in design.md (`oat-project-design/SKILL.md:137-199`) are load-bearing.
- **HiLL gate semantics:** `oat-project-design` currently runs a HiLL checkpoint at the end (if configured for the design phase). Folding spec into design means the same HiLL gate covers what used to be two gates. If a project's state has `"spec"` in `oat_hill_checkpoints`, treat as satisfied by the design HiLL (append both to `oat_hill_completed`) without requiring state migration.
- **Skill allowed-tools list:** Any new tools used by design (e.g., `AskUserQuestion` for mode choice) must be added to the skill frontmatter `allowed-tools`. Currently `oat-project-design/SKILL.md:7` already lists `AskUserQuestion`.
- **Template compatibility:** Existing `spec.md` and `design.md` templates must still be usable. Template tweaks are allowed; wholesale replacement is not. The `discovery.md` template's `Next Steps` section will need updating to reflect the new routing.
- **Quick-start flow:** The quick-start skill is already relatively large (`oat-project-quick-start/SKILL.md` is ~370 lines). Any new steps must be additive and not increase cognitive load for simple changes.
- **Version bump rule (AGENTS.md):** Any change to a canonical skill at `.agents/skills/*/SKILL.md` requires a `version:` bump in the same PR. This affects `oat-project-design`, `oat-project-quick-start`, `oat-project-spec`, and potentially `oat-project-discover` (if `Next Steps` language is edited).
- **Publishable-package lockstep rule (AGENTS.md):** Skill changes under `.agents/skills/` require the lockstep public package version bump across `packages/cli`, `packages/control-plane`, `packages/docs-config`, `packages/docs-theme`, and `packages/docs-transforms`.
- **Template file changes count as bundled-asset changes:** `.oat/templates/*.md` edits also trigger the lockstep bump.
- **Solo authorship during the design conversation:** The design skill should not pause indefinitely while waiting for peer review in draft-and-review mode. If the user wants Codex/Opus to review, the skill exits cleanly after producing the draft; it does not orchestrate the review.
- **Release validation:** `pnpm release:validate` must pass before the PR is considered done.

## Success Criteria

- A user running the full workflow (`oat-project-new` → `oat-project-discover` → `oat-project-design` → `oat-project-plan`) experiences design as a collaborative conversation by default, with 2–3 options presented at real architectural decision points.
- A user who prefers draft-and-review can opt out of the collaborative flow (via mode-choice prompt or `--mode` flag) and receive a complete draft, produced in one pass, without any section-by-section prompting.
- `spec.md` is produced as part of design (never as its own phase) in the default pipeline, and its content still serves downstream consumers (Requirement Index, FR/NFR structure, acceptance criteria).
- `oat-project-spec` runs standalone without requiring a subsequent design invocation; its description clearly positions it as optional.
- A user running quick-start with a well-understood request still sees a brief requirements-confirmation gate before plan generation, catching assumption errors without meaningfully slowing the flow.
- A user running quick-start's lightweight design path sees the same two-mode choice (collaborative vs draft-and-review), scaled appropriately.
- After drafting (in either mode), the design skill runs a fresh-eyes self-review and, after committing, explicitly invites the user to read the artifact before approving.
- Downstream skills (`oat-project-plan`, `oat-project-implement`, review skills) operate on the new design artifact without modification.
- Documentation in `AGENTS.md`, any OAT docs pages, and the skills' own descriptions reflect the new flow.
- `pnpm release:validate` passes for the implementation PR.

## Out of Scope

- **Changes to `oat-project-plan`, `oat-project-implement`, or any post-design skills.** This project ends at design. (Superpowers' `writing-plans` has several patterns — bite-sized TDD steps, no-placeholder rule — that would improve OAT's plan skills, but those belong to a separate initiative. See `reference/comparative-analysis.md` §5.8.)
- **Changes to the `oat-project-discover` skill beyond doc-level tweaks.** Discovery's interaction pattern already works well. Only the `Next Steps` template routing is affected.
- **Changes to the `oat-project-import-plan` workflow.** Imported plans bypass discovery/design by definition.
- **Adopting Superpowers' `verification-before-completion` discipline.** Separate initiative; would touch `oat-project-implement` and possibly `oat-project-review-provide`.
- **Adopting Superpowers' visual companion (browser-based mockups).** Would need new MCP/browser infrastructure; separate initiative.
- **Automating peer-review orchestration (Codex/Opus) from inside the design skill.** Users invoke review manually; the design skill only produces the draft in draft-and-review mode.
- **Restructuring discovery → spec → design as a single skill.** The phase boundary between discovery and design remains; only the spec-between-them phase is removed.
- **Changes to HiLL checkpoint semantics beyond folding spec's HiLL into design's HiLL.** No new checkpoints, no new gate mechanics.
- **Generalizing the two-mode choice pattern to other skills.** If the pattern proves useful elsewhere, that's a follow-up project.
- **UI/formatting changes to existing templates beyond what's needed to support the new flow.**
- **Deep rework of `oat-project-quick-start` beyond the two specific additions (requirements gate + mode choice for lightweight design).**
- **Deleting `oat-project-spec`.** It persists as a standalone utility.

## Deferred Ideas

- **Auto-invoking an independent reviewer (Codex/Opus) from draft-and-review mode.** Deferred — better handled by a separate review-orchestration skill. This project keeps review a manual step.
- **Persisting the user's mode preference across projects.** Deferred — would need config plumbing and isn't required for v1.
- **Section-by-section undo/redo in collaborative mode.** Deferred — the user can always edit the artifact directly; interactive rollback is overkill.
- **Generalizing the "2–3 options at decision points" pattern into a reusable helper.** Deferred — do it inline first, extract if we reuse it.
- **A `--mode` flag on quick-start itself (not just on design).** Deferred — quick-start's own flow branches on the lightweight-design choice; adding a global mode flag is redundant.
- **Telemetry on which mode users pick.** Deferred — would inform future iteration but not blocking.
- **Porting Superpowers' bite-sized TDD plan format + no-placeholder rule to `oat-project-plan` / `oat-project-plan-writing`.** Deferred — separate initiative.
- **Adopting Superpowers' visual companion.** Deferred — infrastructure-heavy, not core to this project.
- **Deleting `oat-project-spec`.** Deferred permanently; the standalone use case has real (if narrow) value.
- **Adopting Superpowers' rigid-vs-flexible skill labels.** Deferred — nice-to-have.
- **Codified sub-project split escape hatch (follow-up project).** When discovery surfaces that a request is really N loosely-related sub-projects, offer a structured hand-off with two modes:
  - **Option A — Decompose and park:** Create N new projects, seed each with a brief discovery summary distilled from the parent conversation. User picks one to continue with now; others sit ready for full discovery when picked up later. Clean separation, no cross-project context preserved.
  - **Option B — Brainstorm broadly, execute one:** Stay in the current conversation and do rich cross-cutting discovery covering all sub-projects. Generate full `discovery.md` for each, with cross-references noting inter-project dependencies. Pick one to make active; others sit with richer context for later.
    Natural home is `oat-project-discover` (where multi-subsystem scope is typically detected) or a new dedicated skill like `oat-project-split`. Out of scope for the collaborative-design-workflow project but worth its own project.

## Open Questions

- **Mode choice default when skill is invoked non-interactively (e.g., agent-orchestrated end-to-end OAT runs, CI pipelines, scheduled triggers):** Collaborative mode requires user prompts. The automation use case — a Claude agent running `discover → design → plan → implement` unattended — needs the skill to complete without blocking. Decision: fall back to draft-and-review automatically when no TTY is detected (or `OAT_NON_INTERACTIVE=1` is set), with a banner at the top of the generated design.md noting the mode. Design phase should confirm the TTY-detection mechanism and how agent orchestrators should signal non-interactive intent.
- **HiLL checkpoint semantics for folded spec-in-design:** If a project's state has `"spec"` in `oat_hill_checkpoints`, how is that interpreted when spec is no longer a distinct phase? Decision: treat as satisfied by the design HiLL (append both to `oat_hill_completed`). Design phase should confirm no state-migration logic is required.
- **Template changes required for `spec.md` when authored from inside design:** Does the existing `spec.md` template need any structural change to support being generated as a byproduct rather than authored directly? Likely no structural change — the existing template sections map directly to what the folded flow produces. Design phase should confirm by walking through the template against the new authoring sequence.
- **Interaction between quick-start's "well-understood" auto-advance and the new requirements gate:** Does every straight-to-plan path hit the gate, or only the ones that previously would have hit lightweight design? Decision (tentative): every straight-to-plan path hits the gate. Design phase should confirm and spell out the exact trigger condition.
- **What constitutes a "real architectural decision point" worth presenting 2–3 options for?** _(Resolved — no longer applicable.)_ An earlier draft proposed a per-section heuristic for when to invoke 2–3 options. Superpowers' brainstorming skill does not do per-section divergence — it has one approach-level moment (checklist item 4) before section presentation. FR3 was rewritten to match Superpowers' actual pattern: one Approach Reaffirmation step before section drafting, no per-section heuristic. Heuristic risk eliminated.
- **Skill version bump strategy:** If we touch `oat-project-design`, `oat-project-quick-start`, `oat-project-spec`, and `oat-project-discover` in the same PR, each needs a version bump. Are these coordinated (minor bump across all) or independent? Design phase should recommend.
- **Backward-compatibility messaging:** Existing users who invoke `oat-project-spec` as part of their flow will find it no longer auto-advances to design. Do we need a one-time deprecation notice / migration note in the skill output? Design phase should specify the exact wording.
- **Self-review timing vs HiLL gate:** Run self-review before or after the HiLL prompt? Before makes sense (self-review is a quality-improvement pass; HiLL is the approval gate). Design phase to confirm.

## Assumptions

- Users on the default path want the collaborative experience by default. If we're wrong, the mode-choice prompt surfaces the alternative and users can pick draft-and-review.
- The existing `spec.md` template's sections (FRs, NFRs, acceptance criteria, Requirement Index) are close to what the design skill needs to produce inline. Minor template tweaks are OK; a full template rewrite is not expected.
- `AskUserQuestion` is already listed in `oat-project-design/SKILL.md:7` `allowed-tools` — verified.
- Downstream skills (`oat-project-plan`, `oat-project-implement`, review skills) do not hardcode any requirement that spec was authored before design. They only require the artifacts to exist and be parseable. Verification needed during design phase.
- HiLL checkpoint configuration rarely includes both `spec` and `design` simultaneously in practice. Folding spec's HiLL into design's HiLL doesn't lose practical capability for most users.
- Users who prefer the draft-and-review pattern today won't resist it remaining available — they just want it off by default so the collaborative experience is the norm.
- Adding ~1 runtime prompt to the design skill does not meaningfully degrade the experience for users who'd rather skip it; the mode-flag escape hatch handles those cases.
- TTY detection is reliable enough to gate the non-interactive fallback for the automation use case (agent-orchestrated unattended OAT runs, CI, scheduled triggers). `OAT_NON_INTERACTIVE=1` is the explicit signal for contexts where TTY detection is unreliable.
- The "real architectural decision point" heuristic can be captured in skill-prompt language that LLMs will follow reliably without hallucinating options.

## Risks

- **Risk: Collaborative mode feels slow or over-engineered for small projects.**
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Scale section depth by complexity (mirror `superpowers-brainstorming.md:89` — "a few sentences if straightforward, up to 200–300 words if nuanced"). Default to shorter sections; expand only when there's genuine ambiguity. Make draft-and-review genuinely one keystroke to opt into. In quick-start, keep lightweight design's reduced section set (`oat-project-quick-start/SKILL.md:232-243`) intact.

- **Risk: Divergent "2–3 options" becomes perfunctory** _(mitigated structurally — no longer active)_
  - **Status:** Resolved by FR3 alignment with Superpowers' actual pattern. There is no per-section scripted options step, so the "agent invents fake alternatives at every section" failure mode cannot occur. The single approach-level moment (Component 3.5 Approach Reaffirmation) has clear invocation logic: if `discovery.md` Solution Space / Chosen Direction exists, summarize and confirm in one sentence; if not, invoke Superpowers' 2-3-approaches prose inline. No prose heuristic needed.

- **Risk: Folding spec authoring into design creates a long monolithic skill that's hard to maintain.**
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Keep the spec-within-design flow as a focused, named sub-step (e.g., "Step N: Confirm Requirements") rather than scattering requirements-confirmation across the skill. Keep the existing `spec.md` template unchanged if possible so template drift doesn't compound the complexity.

- **Risk: Existing users whose muscle memory is `discover → spec → design → plan` are surprised when spec runs standalone no longer advances them to design.**
  - **Likelihood:** Medium
  - **Impact:** Low–Medium
  - **Mitigation Ideas:** `oat-project-spec` output should explicitly say "Spec saved. Next step for design: run `oat-project-design` (which will confirm these requirements before drafting)." Update `AGENTS.md` workflow triage to reflect the new shape. Mention the change in the PR description.

- **Risk: Downstream skills implicitly depend on spec being authored before design (e.g., they read `spec.md` frontmatter timestamps and assume certain order).**
  - **Likelihood:** Low
  - **Impact:** Medium–High
  - **Mitigation Ideas:** Audit all downstream skill references to `spec.md` during design. If any assume ordering, update them to be order-independent. Specifically check: `oat-project-plan`, `oat-project-implement`, `oat-project-review-provide`, `oat-project-review-receive`, `oat-project-pr-progress`, `oat-project-pr-final`.

- **Risk: The mode-choice prompt clashes with non-interactive automation (CI, scripted use).**
  - **Likelihood:** Low
  - **Impact:** Medium
  - **Mitigation Ideas:** Provide a skill argument/flag that lets callers skip the prompt (e.g., `--mode collaborative` / `--mode draft`). Define a default for non-interactive contexts (probably draft-and-review, since it doesn't require intermediate prompts).

- **Risk: Quick-start's new requirements-confirmation gate adds friction that annoys users on the "just do it" path.**
  - **Likelihood:** Low–Medium
  - **Impact:** Low
  - **Mitigation Ideas:** Make the gate ultra-lightweight — a one-screen bullet list of requirements with a single confirm prompt. Allow users to bypass via a flag if they truly want no confirmation at all.

- **Risk: Version bump coordination across touched skills + lockstep public-package bumps is missed.**
  - **Likelihood:** Low
  - **Impact:** High (release breaks, CI red)
  - **Mitigation Ideas:** Add this to the plan's acceptance criteria explicitly. Run `pnpm release:validate` before finalizing the PR (AGENTS.md requirement). Include the lockstep-bump checklist in the implementation plan.

- **Risk: Self-review step + HiLL gate creates redundant friction.**
  - **Likelihood:** Low
  - **Impact:** Low
  - **Mitigation Ideas:** Clarify in the skill that self-review is a silent quality-improvement pass (the agent fixes its own issues inline), whereas HiLL is the user-facing approval gate. They serve different purposes and shouldn't feel redundant. The user-review-gate phrasing in the HiLL prompt is the additional improvement.

- **Risk: "Real architectural decision point" heuristic is too vague, and agents default to either all or none.**
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Include 3-5 concrete examples in the skill prompt (both "present options" and "confirm single path" cases). Allow the heuristic to evolve through iteration — treat v1 as calibration.

## Next Steps

- **Spec-driven mode (selected):** Proceed to `oat-project-design`. Design will:
  1. Confirm requirements (the folded spec step) — since we have a detailed discovery with explicit Key Decisions, the requirements section should ratify what's already here rather than re-elicit.
  2. Present architectural approach options at the Open Questions surfaced above (HiLL semantics, mode-choice plumbing, template changes, heuristic for "real decision points", self-review timing).
  3. Produce both `spec.md` and `design.md`, plus an implementation-ready component breakdown that the plan phase can consume.
- After design is handed off, the user can merge-forward from upstream (this branch is currently out of date with the upstream fork) and pick up the implementation in a fresh branch.
- The `reference/` directory is preserved with original Superpowers source files and the comparative analysis — any downstream session can re-ground itself without re-fetching.

## Revision: Selective Collaborative Mode (2026-04-29)

**Origin:** Dogfood-driven feedback after the v2.0 mode-aware design flow shipped to this branch. Section-by-section fatigue on long designs surfaced the need for a third mode that sits between full collaborative and draft-and-review. Folded into this project as p04 revision tasks rather than a follow-up project (Option A — single PR, single lockstep version bump for the mode-choice family).

**Second-opinion check:** Sub-questions on classification-reveal UX, signal set, recommendation logic, and naming were cross-checked against an independent agent (Codex). Their input shifted: "up-front reveal only" → "up-front reveal + final recap"; recommendation by section-count proxy → recommendation by actual preflight classification; "Calibrated" user-facing label → "Selective collaborative" with `'selective'` as the config value.

**Naming convention used throughout this revision:**

- **User-facing mode label:** "Selective collaborative"
- **Config value / `WorkflowDesignMode`:** `'selective'`
- **Internal mechanism noun:** "selective review pass" (the act of classifying sections — also the reference filename and Step 4a header)
- **Artifact name:** "Section review plan" (the table shown to the user)

### Revision Q1: When is the section classification revealed?

**Resolved:** Up-front reveal **plus** final recap (hybrid).

- **Up-front reveal:** After Approach Reaffirmation (Step 2.5) and before any drafting, the agent prints a section review plan listing every section as `routine` or `needs-eyes` with a one-line reason per item, then asks: "Proceed with this plan, or elevate any routine section?"
- **Final recap:** At the user-review gate (Step 6), the gate prompt appends a "Drafted without live confirmation: [sections]. Please review those especially carefully." line so the user knows what to scrutinize in the committed file.

**Why hybrid over up-front-only:** Recap costs one sentence and addresses a different concern — auditing what landed in the file vs. auditing the heuristic before work happens. Up-front-only leaves the user to re-derive which sections were silent at gate time.

### Revision Q2: What signals drive "needs eyes"?

**Resolved:** Always-flagged section types form a floor; per-section signals tip remaining sections (any single signal trips the flag — conservative bias).

**Always-flagged (floor — never silent):**

- Security Considerations
- Performance Considerations
- Migration Plan
- Error Handling
- Overview + Architecture (framing-error blast radius is too high)

**Per-section signals (any one trips needs-eyes):**

- User flagged this area as a concern during discovery (e.g., "I'm worried about X")
- Discovery `Open Questions` mention this area
- ≥3 spec FRs concentrate in this section
- Component boundaries cross modules not present in `.oat/repo/knowledge/architecture.md`
- Section introduces a pattern not present in `.oat/repo/knowledge/conventions.md` or `.oat/repo/knowledge/stack.md`
- Public API / CLI / config contract changes
- New dependency, new external service, or new provider integration
- Section changes user-facing defaults or workflow semantics
- **Grounding context absent:** OAT knowledge index _and_ repo `docs/` _and_ docs app (e.g., `apps/oat-docs/`) _and_ source-level docs are all thin in this area. Knowledge-index sparseness alone is insufficient — repo docs and code-level docs supplement.

**Rejected signal:** "Testing strategy is weak / hard to automate" — recursive (the signal would only be evaluable after drafting the section it's classifying). The FR-concentration signal already catches "testing covers a lot of ground" cases.

### Revision Q3: Failure modes

**Resolved:**

- **All sections flag needs-eyes** → selective mode collapses gracefully into collaborative. Emit one-line note: "All sections flagged for live review — running as full collaborative for this design."
- **Zero sections flag needs-eyes** → selective mode never goes fully silent. The Overview + Architecture floor enforces at least one live-review section.
- **Discovery skipped solution-space + grounding context broadly absent** → selective mode is **not offered** in the picker (or shown as "not recommended — selective-review-pass signals are unavailable for this repo/design"). Agent recommends collaborative instead.

### Revision Q4: Mid-flight override

**Resolved:** Single escape path. During any needs-eyes confirmation prompt, an additional choice "walk me through every remaining section" is available — selecting it falls through to full collaborative for the remainder. Going the other direction (collaborative → selective mid-flight) is **rejected** as premature complexity.

### Revision — Chosen Direction

Add **Selective collaborative** as a third option in the design-mode picker, sitting between collaborative (default) and draft-and-review. Implement via:

- New mode value `'selective'` in `WorkflowDesignMode` (CLI config + allow-list); type becomes `'collaborative' | 'selective' | 'draft'`.
- New branch in `oat-project-design` Step 4 (Section Iterator) implementing the selective review pass, hybrid reveal, section review plan, and mid-flight override.
- **Not added** to `oat-project-quick-start` (see Q7).
- Spec.md additions: new FR (Selective collaborative mode + signals) and new NFR (classification bias is conservative + inspectable).
- Mode-picker recommendation logic driven by the actual preflight classification (see Q5), not proxies like section count.

### Revision Q5: Mode-picker UX and recommendation logic

**Resolved:** Recommendation is driven by the actual preflight classification, not proxies. Picker exposes a four-state taxonomy.

**Selective review pass as shared infrastructure:**

The selective review pass runs _before_ the picker — not only when selective is chosen. It evaluates the always-flagged floor + per-section signals (Q2) against spec.md and the knowledge base, producing a per-section `routine | needs-eyes` table and a count of each. This count drives the picker recommendation. Cost is one pass over spec.md + knowledge base before the mode prompt fires.

**Recommendation rule:**

- Default recommendation = **collaborative**.
- Recommend **selective collaborative** only when _both_ hold:
  - Grounding is adequate enough to classify routine vs needs-eyes (i.e., selective is `Eligible`, see four-state taxonomy below).
  - Preflight classification predicts meaningful savings: **≥3 routine sections** OR **≥30–40% of sections classified as routine**.
- **Never** recommend draft from the picker. If `workflow.designMode = draft` or `--mode draft` is set, skip the picker entirely and announce: "Config selected draft mode."

**Four-state taxonomy for the selective option in the picker:**

| State                          | Meaning                                                                 | Picker presentation                            |
| ------------------------------ | ----------------------------------------------------------------------- | ---------------------------------------------- |
| **Recommended**                | Eligible AND classification predicts real prompt savings                | Tagged `(recommended for this design)`         |
| **Available**                  | Eligible, but no recommendation tag                                     | Listed normally                                |
| **Available, not recommended** | Eligible, but would collapse to collaborative or only saves 1–2 prompts | Listed with explanatory note                   |
| **Unavailable**                | Grounding too sparse to safely classify, or other disqualifier          | Listed disabled with reason ("unavailable: …") |

Showing unavailable rather than hiding teaches the user without making options disappear mysteriously.

**Picker copy (canonical):**

```
How would you like to work through the design?
  1. Collaborative — section-by-section, every section confirmed
  2. Selective collaborative (recommended for this design) — drafts routine sections silently
     and walks you through high-risk sections live; before drafting, you'll see which sections
     will be presented and why
  3. Draft-and-review — full draft up front, you review the committed file

Why selective collaborative: this design has 12 sections, adequate repo/discovery grounding,
and the selective review pass expects 7 routine sections and 5 live-review sections.
```

When selective is `Unavailable`:

```
  2. Selective collaborative — unavailable: repo/discovery grounding is too sparse to
     safely classify routine sections
```

When selective is `Available, not recommended`:

```
  2. Selective collaborative — available, but not recommended for this design: classification
     predicts 9 live-review and 3 routine sections, saving only ~3 prompts
```

**Sub-decisions:**

- **Recommendation is advisory, not default-selected.** The `(recommended)` tag is a label; the picker has no pre-highlighted choice. Mode is a workflow/friction decision, not a quality setting — users stay in control.
- **"Why" explainer is concrete and grounded.** Always cite the actual preflight numbers (sections counted, routine vs live-review counts), never generic copy.
- **The "Why" line surfaces in both directions.** When selective is recommended, explain why it's recommended; when it's available-but-not-recommended, explain why it isn't. Same line, opposite framing.

### Revision Q6: Section review plan format (canonical)

**Resolved:** When the user selects selective collaborative, the up-front reveal (locked in Q1) is rendered as a section/mode/reason table titled **Section review plan**:

```
Section review plan:

| Section                    | Mode       | Reason                                            |
| -------------------------- | ---------- | ------------------------------------------------- |
| Overview + Architecture    | needs-eyes | Forced framing review                             |
| Component Design           | needs-eyes | New component boundary crosses packages           |
| Data Models                | routine    | Follows existing models; no migration             |
| API Design                 | routine    | No public API change                              |
| Security Considerations    | needs-eyes | High-risk section type                            |
| Performance Considerations | needs-eyes | Discovery flagged latency concern                 |
| Testing Strategy           | routine    | Follows existing test pattern                     |
| Migration Plan             | needs-eyes | Migration section is always reviewed              |

Proceed with this plan, or elevate any routine section?
```

The picker uses the friendlier phrase "you'll see which sections will be presented and why"; the table is what backs that promise. The plan is **ephemeral** (rendered in chat, not persisted in design.md) — the final recap line at the user-review gate is what survives in the committed transcript.

### Revision Q7: Quick-start parity

**Resolved:** Selective collaborative mode is **not added** to `oat-project-quick-start` lightweight design. Quick-start retains the existing 2-choice picker.

**Reasoning:**

- Quick-start's lightweight design already approximates selective collaborative mode's value prop: relevance-curated section list (4-7 sections), with optional sections gated by applicability and high-ceremony sections (Security, Performance, Deployment, Migration) always skipped.
- Selective-review-pass savings at quick-start scale are marginal — even an aggressive classification (4 routine, 3 live-review) saves ~3 prompts, barely above the recommendation threshold from Q5.
- Adding selective to quick-start would bloat the dogfood/test matrix from 4 paths (quick-start collab/draft + full collab/draft) to 6, for marginal payoff.
- Reduces maintenance surface: one selective branch in `oat-project-design`, not two.

**Quick-start picker (unchanged from current):**

```
How would you like to work through the lightweight design?
  1. Collaborative (recommended) — section-by-section, every lightweight section confirmed
  2. Draft-and-review — full lightweight design up front, you review holistically
```

**Workflow-boundary symmetry:** When quick-start promotes to spec-driven (the existing "Promote to spec-driven" path at Step 2.5), selective collaborative becomes available when the user enters full `oat-project-design`. This gives users access to all three modes at the workflow boundary without bloating lightweight design itself.

**Docs note (to land in AGENTS.md / design skill prose):**

> Selective collaborative mode is only available for full spec-driven design, where the section set is large enough for selective live review to pay off. Quick-start lightweight design keeps the smaller collaborative/draft choice. If quick-start is promoted to spec-driven, selective collaborative becomes available when entering full design.

**Future revisit:** If dogfood reveals a real ask for selective in quick-start, revisit. Default position: don't wire it without evidence.

### Revision Q8: Naming

**Resolved:**

- **User-facing mode label:** "Selective collaborative"
- **Config value:** `'selective'` (extends `WorkflowDesignMode` to `'collaborative' | 'selective' | 'draft'`)
- **Internal mechanism noun:** "selective review pass" (the act of classifying sections — also the reference filename and Step 4a header)
- **Artifact name:** "Section review plan" (the section/mode/reason table)

**Why this split:** Codex's framing — the user-facing name should explain the interaction cost, not require learning a new term. "Selective collaborative" makes the mode visibly part of the collaboration spectrum:

1. Collaborative — every section confirmed
2. Selective collaborative — only high-risk sections confirmed
3. Draft-and-review — no live section confirmations

That gradient is stronger than "Collaborative / Calibrated / Draft," because the second option reads as a flavor of collaborative rather than a separate concept. Internal terms ("selective review pass" for the mechanism, "section review plan" for the artifact) stay as useful nouns in skill prose and don't leak into the picker. The earlier internal noun "calibration pass" was rejected once the user-facing label landed on "selective collaborative" — the internal name should echo the user-facing name, not introduce a parallel vocabulary.

**Implication:** Rename now — before this ships as `'calibrated'`. Renaming a `WorkflowDesignMode` value post-ship requires config-compatibility shims; doing it pre-ship is one type-and-allow-list change.

### Revision Q9: Classifier implementation surface

**Resolved:** Separate reference file with a contract guardrail in the skill body. The skill body must include the contract (when the pass runs, what it returns, the bias rule, the minimum-live-review rule, and how the picker consumes it) — not just a vague pointer.

**File location:**

```
.agents/skills/oat-project-design/references/selective-review-pass.md
```

Naming the file `selective-review-pass.md` (not `calibration-pass.md`) keeps the reference filename aligned with the user-facing mode label and Step 4a header. Avoids a parallel internal vocabulary maintainers would have to learn.

**Skill body — Step 4a contract (canonical):**

```markdown
### Step 4a: Selective Review Pass

For `DESIGN_MODE == "selective"`, run the selective review pass before drafting sections.

The pass classifies every design section as:

- `routine` — draft silently into `design.md`
- `needs-eyes` — present live for user confirmation

The pass returns a table: `Section | Classification | Reason | Signals hit`.

Classification is conservative: any one needs-eyes signal marks the section
`needs-eyes`. If no section is marked `needs-eyes`, force `Overview + Architecture`
to `needs-eyes` (minimum-live-review rule).

Before drafting, render the table as the Section Review Plan and ask whether
the user wants to elevate any routine section.

Picker recommendation logic also consumes this output:

- Eligible: enough grounding exists to classify safely.
- Recommended: classification predicts ≥3 routine OR ≥30–40% routine.
- Available, not recommended: would collapse to collaborative or save 1–2 prompts.
- Unavailable: grounding too sparse to classify safely.

Full signal set, examples, edge cases, and tuning thresholds live in
`references/selective-review-pass.md`.
```

**Reference file — owned content:**

- **Signal definitions** — concrete description of each per-section signal (Q2 list expanded with examples of what triggers and what doesn't)
- **Examples** — worked examples of classification for representative sections (e.g., "API Design with no public-API change → routine; API Design adding a new public endpoint → needs-eyes")
- **Edge cases** — how the pass behaves when sections overlap (e.g., a Component Design section that also touches a public API), when signals conflict, when discovery is sparse
- **Dogfood notes** — observed misclassifications and how the heuristic was refined in response (this section grows over time)
- **Tuning thresholds** — the recommendation thresholds (≥3 routine, ≥30–40%) and what evidence would justify changing them
- **What "adequate grounding" means** — the operational definition of when classification signals are usable (knowledge index OR docs app OR `docs/` OR source-level docs are non-thin in the area)

**Why this split:** Skill body says **what must happen** (the contract); reference says **how to classify well** (the heuristic content). The skill body stays readable end-to-end; the heuristic can evolve through dogfood without churning the skill prose. Maintainers can find the contract without chasing a link, and refine the signals without rewriting the section iterator.

### Revision Q10: Test strategy

**Resolved:** A + C — dogfood-driven for heuristic quality, prose-contract test for skill-body drift. No fixture-based heuristic tests in v1.

**Framing correction:** The C test target is **contract preservation**, not classifier correctness. The classifier is intentionally prose-driven and context-sensitive; correctness can only be judged through dogfood. The test guards against future edits silently deleting the core semantics of Step 4a.

**Strategy A — Dogfood-driven for heuristic quality:**

- The v2.1 revision plan includes a dogfood task that exercises selective collaborative mode end-to-end against a real spec.
- Each dogfood run captures a per-section table appended to `references/selective-review-pass.md` "Dogfood Notes":

  ```markdown
  ### Dogfood run YYYY-MM-DD: <project name>

  | Section                 | Classified As | Expected? | Notes                                             |
  | ----------------------- | ------------- | --------- | ------------------------------------------------- |
  | Overview + Architecture | needs-eyes    | yes       | Forced floor                                      |
  | Component Design        | routine       | **no**    | Should have flagged — new package boundary missed |
  | Data Models             | routine       | yes       |                                                   |
  ```

- "Notes" column captures why a misclassification happened, which feeds signal-set refinement in the reference file. Per-run tables stay in the reference file as historical record — they're how the heuristic earns its refinement over time.

**Strategy C — Prose-contract test for skill-body drift:**

A regex-based test in the skills validation harness (`packages/cli/src/validation/skills.test.ts` or equivalent) asserts that `oat-project-design` Step 4a still contains the contract. Minimum check items:

1. Step header `### Step 4a: Selective Review Pass` is present.
2. Both classifications named: `routine` and `needs-eyes`.
3. Conservative bias rule stated: "any one … signal marks the section `needs-eyes`."
4. Minimum-live-review rule stated: "if no section is marked `needs-eyes`, force `Overview + Architecture`" (or equivalent phrasing).
5. Pre-drafting reveal stated: section/classification/reason/signals are shown and routine sections can be elevated before drafting.
6. Reference-file pointer present: `references/selective-review-pass.md` is cited.

The test catches the most likely failure mode — a future skill edit accidentally drops one of the contract clauses — without coupling to specific prose.

**Reference file required structure:**

`.agents/skills/oat-project-design/references/selective-review-pass.md` must contain at least these sections:

- `## Signal Set` — concrete description of each per-section signal (Q2 list expanded with examples)
- `## Adequate Grounding` — operational definition of when classification signals are usable
- `## Recommendation Rules` — the picker recommendation thresholds (≥3 routine OR ≥30–40%) and tuning rationale
- `## Edge Cases` — overlapping sections, conflicting signals, sparse discovery
- `## Dogfood Notes` — accumulated per-run classification tables and signal-refinement history

A second contract-preservation check (lighter — just a regex for these section headers) can guard the reference file's structural skeleton.

**Why no fixture-based tests (Strategy B) in v1:** Fixture tests over agent prose create false confidence (the agent may pass the diff-check while reasoning incorrectly) or brittle failures (small prose variations break the diff). Defer until the classifier becomes a structured CLI helper or schema-backed pass — at that point fixtures become meaningful. Until then, dogfood for quality + regex contract for drift is the pragmatic split.

### Revision — Discovery Complete

All ten revision questions resolved. Carry-forward into spec.md / design.md / plan.md:

- **spec.md:** New FR (Selective collaborative mode + signal set + contract); new NFR (classification bias is conservative + inspectable); requirement-index entries for both.
- **design.md:** New Step 4a component (Selective Review Pass) covering the contract from Q9; updates to Step 1.5 (mode picker — three choices, four-state taxonomy from Q5); updates to Step 6 (user-review gate recap from Q1); updates to Step 4 collaborative branch to support mid-flight elevation from Q4.
- **plan.md:** Revision tasks inserted before p04-t10 (PR). Estimated set:
  - `t-A`: Extend `WorkflowDesignMode` type → `'collaborative' | 'selective' | 'draft'` + CLI allow-list + tests
  - `t-B`: Update `oat-project-design` — Step 1.5 picker (three choices + four-state), Step 4a contract, Step 4 collaborative-branch mid-flight elevation, Step 6 user-review-gate recap
  - `t-C`: Create `references/selective-review-pass.md` with the five required sections
  - `t-D`: Add prose-contract test to skills validation harness (Step 4a + reference-file structural checks)
  - `t-E`: Update AGENTS.md mode descriptions + lockstep public-package version bump (0.0.51 → 0.0.52)
  - `t-F`: Dogfood selective collaborative mode (parallel to existing p04-t02/t03)
- **state.md:** Update `oat_phase` cycle to revisit design+plan+implement; bump `oat_project_state_updated`.
