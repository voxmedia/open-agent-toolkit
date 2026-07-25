---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-07-25
oat_generated: false
---

# Discovery: explainer-authoring-redesign

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

The packaged explainer-kit 1.0.0 "neutered" the original personal explainer
skill with over-engineered abstractions: the live `in5-game-cms` recap rendered
as ~328 words across six flat paragraphs — no tables, diagrams, lists, or
visual richness — despite the run having drafted rich Markdown. Redesign the
authoring/rendering model so output quality returns to (and can exceed) the
original 0.4.1 skill's bar, while keeping the v1 packaging that works
(provenance, hashing, publish safety, acceptance gates).

Root-cause evidence from the current core:

- The author contract (`author-result/v1`) constrains each section to one flat
  `prose` string; the renderer HTML-escapes it into exactly one `<p>` per
  section (decks get the identical treatment per slide).
- Every recipe requests a single `house-style` hub; diagram/deck/explainer
  artifact types exist but are never requested.
- Each run already drafts and hash-pins a rich Markdown content record — but it
  is write-only provenance; the renderer never reads it.
- QA and the RC acceptance gates verify plumbing (escaping, hashing,
  publishing, rollback), never content depth — so the regression shipped with
  every gate green.
- Lifecycle gap: closeout requires a critic callback but never explains how to
  construct a high-quality author brief, so autonomous runs inherit no
  editorial bar.

## Clarifying Questions

### Question 1: Rendering pipeline shape

**Q:** Deterministic markdown renderer (A), agent-rendered artifacts with core
as validator (B), or hybrid (C)?
**A:** Per-artifact freedom levels. Recaps/narrative pages can be structured —
markdown-first, deterministically rendered. Decks and explainers need artistic
freedom (agent-composed HTML).
**Decision:** Both paths exist as first-class artifact modes; the artifact
type/recipe decides which applies.

### Question 2: Role of schemas vs prose

**Q:** Where does content quality come from?
**A:** Skill prose carries expectations; JSON structures should be guidelines,
not enforcement cages.
**Decision:** Prose carries quality; schemas carry identity (provenance,
hashes, safety). Content schemas become minimal. Editorial guidelines are
checked but degrade to manifest warnings — never hard failures. Hard failure
is reserved for safety, citation/provenance integrity, and publish-boundary
invariants.

### Question 3: Starting point for artistic artifacts

**Q:** Curated shells or fully freeform HTML?
**A:** Start from shells, with prose explicitly licensing deviation/expansion
when content dictates (e.g., always one high-level diagram, but complexity may
warrant multiple/sub-diagrams).
**Decision:** Shells as the starting canvas; briefs specify floors, not
ceilings.

### Question 4: Cross-run consistency expectations

**Q:** How similar should runs look?
**A:** Clear cohesiveness between runs via baselines, templates, and guidance —
but runs should not look identical, and two runs of the same project need not
be replicas.
**Decision:** Per-run integrity (immutable hashes, provenance) is retained;
cross-run determinism of content is explicitly a non-goal. Cohesion is family
resemblance from shared shells/themes/briefs.

### Question 5: Verification depth

**Q:** Structural validation only, full render QA everywhere, or render QA
only in interactive runs?
**A:** B — render QA returns as a first-class stage.
**Decision:** Headless load + layout-probe battery (overflow, clipping,
readability) runs for built artifacts in every mode; findings land as manifest
warnings. Structural safety checks remain the only hard failures.

### Question 6: Recap artifact floor

**Q:** Narrative page only, page + standalone diagram artifact, or full set?
**A:** The floor is one rich narrative page with at least one high-level
architecture diagram (inline is fine); when project size/complexity warrants,
the set grows into multiple pages, standalone/sub-diagrams, a deck — at the
author's judgment.
**Decision:** Floor-is-A, license-is-C, content-driven scaling. Recipe
semantics shift from "exactly these artifacts" to "this floor, these allowed
types, expansion licensed." With multi-artifact sets, the narrative page takes
on landing-page (hub) duty via existing artifact links.

## Solution Space

### Approach 1: Per-artifact freedom levels on v1 rails _(Recommended)_

**Description:** Keep v1's machine-boundary contracts (run identity, manifest,
immutable hashes, publish safety, approval modes) and replace the content
layer: markdown-first authoring rendered deterministically for narrative
artifacts; shell-based agent-composed HTML for artistic artifacts (decks,
explainers, standalone diagrams); prose briefs as the quality mechanism;
guidelines-as-warnings; render QA restored.
**When this is the right choice:** When the packaging/verifiability investment
(RC acceptance, publish connector, provenance) is worth preserving — which it
is; it just shipped with the wrong content model.
**Tradeoffs:** Two rendering paths to maintain; editorial quality for
unattended runs depends on brief quality rather than schema enforcement.

### Approach 2: Deterministic markdown renderer everywhere

**Description:** Single path — all artifacts authored in markdown, rendered to
themed blocks.
**When this is the right choice:** If verifiability and uniformity mattered
more than output ceiling.
**Tradeoffs:** Rejected: structurally caps decks/explainers below the original
0.4.1 bar — same class of mistake as `author-result/v1` with a higher ceiling.

### Approach 3: Agent-rendered everything, core as validator only

**Description:** The agent composes all HTML; the core only validates,
packages, and publishes (closest to the original 0.4.1 skill).
**When this is the right choice:** Maximum artistry with a human always in the
loop.
**Tradeoffs:** Rejected as the universal mode: unattended runs (the explicit
"just draft it" case) would have no deterministic quality floor, and QA of
fully bespoke HTML is the hardest kind.

### Chosen Direction

**Approach:** Approach 1 — per-artifact freedom levels on v1 rails.
**Rationale:** Preserves everything v1 actually bought (per-run integrity,
publish safety, acceptance gates) while restoring the authoring model that
produced the original skill's quality. Narrative artifacts get a rich
deterministic floor that autonomous runs can rely on; artistic artifacts get
the 0.4.1-style latitude where it matters, behind invariant validation.
**User validated:** Yes — converged across the brainstorm session 2026-07-25.

## Key Decisions

1. **Prose carries quality; schemas carry identity.** Content contracts become
   minimal (artifact id + authored content + provenance). Editorial
   expectations live in versioned prose briefs, not JSON shape.
2. **Guidelines degrade to warnings.** Floor checks (required narrative
   coverage, "≥1 architecture diagram", depth expectations) emit manifest
   warnings in all modes; interactive runs surface them at the approval gate.
   Hard failures only for HTML safety, provenance/citation integrity, and
   publish-boundary contracts.
3. **Markdown is promoted from provenance to input.** The per-artifact markdown
   record the pipeline already produces becomes the renderer's actual input
   for narrative artifacts (AST-validated), not a write-only sidecar.
4. **Artistic path starts from shells.** Decks/explainers/standalone diagrams
   are agent-composed starting from curated shells with theme tokens; prose
   explicitly licenses expansion when content dictates.
5. **Floors, not ceilings.** Briefs specify minimums; expansion is licensed and
   expected when the project's substance earns it.
6. **Cohesion without replication.** Cross-run content determinism is a
   non-goal; per-run immutable hashing and provenance are retained unchanged.
7. **Render QA returns.** Headless load + layout probes for built artifacts in
   every mode; findings as warnings.
8. **Approval by mode, drafts marked.** Interactive runs keep the existing
   approval gate (now reviewing a markdown draft); unattended runs flow
   through but are distinguishably marked (e.g., auto-drafted vs
   human-approved) in the approval record/manifest so downstream consumers can
   tell.
9. **Content-driven set scaling.** Recipes declare a floor and allowed
   expansion rather than an exact artifact list; the narrative page assumes
   hub duty when the set grows.
10. **Author briefs become first-class.** The lifecycle (closeout/autonomous
    recap) must construct and pass a quality author brief; this closes the
    documented gap where closeout explains the critic callback but not the
    author callback.
11. **Automated completion runs unattended.** When the recap runs as part of
    automated project completion (the same configurable chain as document /
    summary / pr-final), it must execute in autonomous (unattended) mode
    end-to-end: no approval pause, auto-drafted marking, floors and render-QA
    findings recorded as manifest warnings. Interactive approval applies only
    when a human explicitly invokes the run that way.

## Constraints

- Machine-boundary contracts (run-request, manifest, publish-request/receipt,
  immutable hashes, approval records) remain schema-strict and
  backward-analyzable; the redesign must not weaken publish safety or
  provenance.
- Published pages must remain self-contained and safe (no live script
  injection from agent-authored HTML into published buckets).
- Unattended mode must complete without human input and without network
  dependencies beyond what publishing already requires.
- The existing acceptance/RC discipline (packaged-skill subtree pinning,
  validator gates) continues to apply to whatever ships.

## Success Criteria

- A completed project's autonomous recap renders with genuinely rich
  structure — tables, lists, at least one architecture diagram, real visual
  hierarchy — without any human touch, from the same evidence that today
  produces six flat paragraphs.
- Interactive deck/explainer runs can produce artifacts at (or above) the
  original 0.4.1 skill's visual bar, recognizably house-styled across runs.
- Editorial shortfalls appear as visible manifest warnings rather than
  silently shipping or hard-failing runs.
- Render defects (clipping, overflow, unreadable output) are detected and
  recorded in every mode.
- Two runs of the same project may differ in composition and prose while both
  passing the same floors and sharing the same visual family.

## Out of Scope

- Changes to the publish connector, destination contracts, or bucket layout.
- Changes to fact-base reconciliation/critic semantics (supplied/federated
  modes stay as-is).
- The personal wrapper (`personal-explainer-kit`) beyond whatever minimal seam
  updates the new content model requires.
- Re-running RC acceptance mechanics themselves (they apply to the eventual
  release, but redesigning them is not part of this project).

## Deferred Ideas

- Catalog/initiative-level landing pages aggregating multiple project sets
  (0.4.1's `initiatives/` layout) — revisit after the per-project set model
  lands.
- Google Docs lane improvements — untouched by this redesign.
- Interactive/animated diagram tours (engineer-tour enhancements) — the
  artistic path enables them later; not a floor requirement now.

## Open Questions

- **Markdown dialect and diagram vocabulary:** Which markdown extensions and
  diagram notation (e.g., mermaid-class) the deterministic renderer supports,
  and how AST validation defines "safe" — design phase.
- **Recipe contract shape:** How "floor + allowed expansion" is expressed in
  recipe/v2 semantics and how validation distinguishes floor misses (warning)
  from contract violations (error) — design phase.
- **Brief packaging:** Where versioned author briefs live (per-recipe, per
  artifact type), and how the lifecycle passes them to unattended runs —
  design phase.
- **Sanitization/safety mechanics for agent HTML:** DOM-level validation
  approach for the artistic path (allowlist? sandboxed parse?) — design phase.
- **Render QA runtime:** What executes the headless probe in unattended
  environments and how its absence degrades (skip with warning?) — design
  phase.
- **Versioning/migration:** Whether the new content model ships as v2 schemas
  alongside v1 or replaces it in-place, and what that means for the packaged
  skill's semver — design phase.

## Assumptions

- The rich markdown drafted by current runs is representative: authoring
  models produce good content when the contract lets them (validated by the
  in5-game-cms run package).
- Existing approval-mode machinery (interactive/unattended) is sound and can
  carry the draft-vs-approved distinction with minor additions.
- Manifest `warnings[]` is an adequate channel for guideline findings without
  schema changes to the manifest itself.

## Risks

- **Unattended quality still disappoints:** Prose briefs may not be enough
  without enforcement.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Floors-as-warnings make shortfalls visible;
    iterate on briefs; approval-gated runs remain available for high-stakes
    sets.
- **Agent HTML safety:** The artistic path reopens injection surface that the
  escaping renderer closed.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Hard-fail DOM safety validation; shells constrain
    the canvas; publish gate already human-confirmed.
- **Two rendering paths drift apart visually:** Deterministic blocks and
  agent-composed shells stop looking like one family.
  - **Likelihood:** Medium
  - **Impact:** Low/Medium
  - **Mitigation Ideas:** Single theme-token source feeding both paths;
    render QA checks shared style anchors.
- **Scope creep into a full v2 rewrite:** The redesign touches schemas,
  renderer, QA, recipes, briefs, and lifecycle docs.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Quick-mode phasing; keep publish/fact-base/manifest
    surfaces frozen; land the recap path first as the proving ground.

## Next Steps

Quick mode with **optional lightweight design — chosen**: discovery surfaced
real architecture decisions (two rendering paths, recipe contract semantics,
brief packaging, safety validation). Produce a focused `design.md` before
planning via `oat-project-quick-start`.
