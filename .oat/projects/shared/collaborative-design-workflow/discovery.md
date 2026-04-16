---
oat_status: complete
oat_ready_for: oat-project-spec
oat_blockers: []
oat_last_updated: 2026-04-14
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
**A:** Low-cost, high-value addition. A one-line scope check at the top of design ("confirm this is scoped to one plan; if not, propose sub-projects") is essentially free to add and catches a class of error OAT currently doesn't prevent.
**Decision:** Add a sub-project decomposition sanity check as a small step at the top of the design skill — before the mode-choice prompt. Flag as a design-time enhancement, not a blocker.

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

### Option D: Sub-project decomposition check — required step vs soft advisory

**Description:** Superpowers' brainstorming skill treats multi-subsystem detection as a required up-front check that blocks further work until decomposition happens. Should OAT's design skill adopt the same stance?

**Pros (required):**

- Prevents wasted effort on an un-decomposable spec.
- Matches Superpowers' rigor.

**Pros (soft advisory):**

- Flags the concern without adding friction to well-scoped projects.
- Treats the user as capable of making the call.

**Cons (required):**

- Most OAT projects are pre-scoped via discovery and don't need a blocking check.

**Cons (soft advisory):**

- A truly multi-subsystem project might slip through.

**Chosen:** Soft advisory. Present the check as a short "does this look like one plan's worth of work?" question at the top of design, with an explicit option to split — but don't block.

**Summary:** Sub-project decomposition is a sanity-check step, not a blocking gate.

### Option E: Design self-review — subagent-dispatched vs inline

**Description:** Superpowers' spec self-review (`superpowers-brainstorming.md:116-124`) is a fresh-eyes inline pass by the same agent. The project has an additional option: dispatch the existing `oat-project-review-provide` skill or a new subagent to review the design before HiLL.

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
6. **Divergent thinking applies at two levels:** Project-level (existing — discovery's 2–3 approaches, `oat-project-discover` Step 9) and decision-level (new — inside design, at real architectural decision points). Both present recommendation + alternatives with explicit user buy-in. A "real decision point" heuristic must be spelled out in the design skill to prevent perfunctory option-invention.
7. **Discovery skill is largely untouched.** Existing gray-area multi-select, solution-space exploration, and approach recommendation work well. Only doc-level tweaks: (a) `Next Steps` template stops auto-routing to `oat-project-spec`, (b) Step 15 output references the new design-skill entry point.
8. **Design skill inherits Superpowers-style self-review + user-review gate:** After drafting (in either mode), run a fresh-eyes self-review (placeholder/consistency/scope/ambiguity) with inline fixes. Then soften the HiLL approval prompt to explicitly invite the user to read the committed artifact: "Design written and committed to `<path>`. Please review it and let me know if you want changes before moving to planning."
9. **Sub-project decomposition sanity check at top of design:** A soft advisory step — "Does this look like one plan's worth of work, or should it be split?" — not a blocking gate.
10. **YAGNI principle made explicit:** Add "YAGNI ruthlessly — remove unnecessary features from all designs" as a principle in the design skill's guardrails, matching Superpowers' explicit stance.

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

## Open Questions

- **Mode choice default when skill is invoked non-interactively (e.g., from automation):** Collaborative mode requires user prompts. Decision: fall back to draft-and-review automatically when no TTY is detected, with a banner at the top of the generated design.md noting the mode. Design phase should confirm the TTY-detection mechanism.
- **HiLL checkpoint semantics for folded spec-in-design:** If a project's state has `"spec"` in `oat_hill_checkpoints`, how is that interpreted when spec is no longer a distinct phase? Decision: treat as satisfied by the design HiLL (append both to `oat_hill_completed`). Design phase should confirm no state-migration logic is required.
- **Template changes required for `spec.md` when authored from inside design:** Does the existing `spec.md` template need any structural change to support being generated as a byproduct rather than authored directly? Likely no structural change — the existing template sections map directly to what the folded flow produces. Design phase should confirm by walking through the template against the new authoring sequence.
- **Interaction between quick-start's "well-understood" auto-advance and the new requirements gate:** Does every straight-to-plan path hit the gate, or only the ones that previously would have hit lightweight design? Decision (tentative): every straight-to-plan path hits the gate. Design phase should confirm and spell out the exact trigger condition.
- **What constitutes a "real architectural decision point" worth presenting 2–3 options for?** We need a concrete heuristic so the collaborative mode doesn't devolve into presenting trivial choices. Tentative heuristic (from `reference/comparative-analysis.md` §8.2):
  - **Present options when:** multiple viable architecture patterns, component boundary choices with tradeoffs, data-model decisions not dictated by convention, API-style decisions not dictated by existing patterns.
  - **Present one path + confirm when:** convention-driven choices, already decided in discovery, trivial.
    Design phase to refine this into skill-prompt-ready language.
- **Skill version bump strategy:** If we touch `oat-project-design`, `oat-project-quick-start`, `oat-project-spec`, and `oat-project-discover` in the same PR, each needs a version bump. Are these coordinated (minor bump across all) or independent? Design phase should recommend.
- **Backward-compatibility messaging:** Existing users who invoke `oat-project-spec` as part of their flow will find it no longer auto-advances to design. Do we need a one-time deprecation notice / migration note in the skill output? Design phase should specify the exact wording.
- **Sub-project decomposition check placement:** Before mode choice, or inside collaborative mode only? (Design phase.)
- **Self-review timing vs HiLL gate:** Run self-review before or after the HiLL prompt? Before makes sense (self-review is a quality-improvement pass; HiLL is the approval gate). Design phase to confirm.

## Assumptions

- Users on the default path want the collaborative experience by default. If we're wrong, the mode-choice prompt surfaces the alternative and users can pick draft-and-review.
- The existing `spec.md` template's sections (FRs, NFRs, acceptance criteria, Requirement Index) are close to what the design skill needs to produce inline. Minor template tweaks are OK; a full template rewrite is not expected.
- `AskUserQuestion` is already listed in `oat-project-design/SKILL.md:7` `allowed-tools` — verified.
- Downstream skills (`oat-project-plan`, `oat-project-implement`, review skills) do not hardcode any requirement that spec was authored before design. They only require the artifacts to exist and be parseable. Verification needed during design phase.
- HiLL checkpoint configuration rarely includes both `spec` and `design` simultaneously in practice. Folding spec's HiLL into design's HiLL doesn't lose practical capability for most users.
- Users who prefer the draft-and-review pattern today won't resist it remaining available — they just want it off by default so the collaborative experience is the norm.
- Adding ~1 runtime prompt to the design skill does not meaningfully degrade the experience for users who'd rather skip it; the mode-flag escape hatch handles those cases.
- TTY detection is reliable enough to gate the non-interactive fallback. (Alternative: check for an `OAT_NON_INTERACTIVE` env var.)
- The "real architectural decision point" heuristic can be captured in skill-prompt language that LLMs will follow reliably without hallucinating options.

## Risks

- **Risk: Collaborative mode feels slow or over-engineered for small projects.**
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Scale section depth by complexity (mirror `superpowers-brainstorming.md:89` — "a few sentences if straightforward, up to 200–300 words if nuanced"). Default to shorter sections; expand only when there's genuine ambiguity. Make draft-and-review genuinely one keystroke to opt into. In quick-start, keep lightweight design's reduced section set (`oat-project-quick-start/SKILL.md:232-243`) intact.

- **Risk: Divergent "2–3 options" at decision points becomes perfunctory (agent invents trivial alternatives just to satisfy the pattern).**
  - **Likelihood:** Medium–High
  - **Impact:** Medium
  - **Mitigation Ideas:** Give the design skill explicit guidance on when to _skip_ the divergent step (when there's a clear default from conventions/knowledge base). Define "real decision point" concretely in the skill prompt. Include examples of non-decision-points that should be presented as single-path confirm-or-redirect. Include a negative example in the skill text: "Do not invent alternatives for convention-driven choices like which test runner to use when the codebase already uses one."

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
