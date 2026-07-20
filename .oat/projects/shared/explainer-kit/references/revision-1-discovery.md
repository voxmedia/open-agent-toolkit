---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-20
oat_generated: false
---

# Revision 1 Discovery Record

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Create a new follow-on PR from merged `main` that closes two defects found by
the first live unattended Stoa W6 `project-recap` run:

1. Align the core manifest and archive validator so immutable hashes cover the
   complete retained recap package and lifecycle archive succeeds.
2. Add a real content-authoring seam so unattended runs cannot mechanically
   paste source artifacts into published narrative.

The same PR should also address operator feedback that v1 regressed the
pre-v1 default visual quality. Replace the palette × profile front door with
four curated styles—Clean/Neutral, Business/Corporate, Navy/Ocean, and
Dark/Edgy—after the operator reviews comparable rendered previews.

## Clarifying Questions

### Question 1: Theme comparison specimen

**Q:** Should the four Opus-generated theme examples use identical content?
**A:** Yes. Use the same realistic nine-slide W6 recap for all four.
**Decision:** Theme review isolates visual-system quality instead of content
differences.

### Question 2: Unattended authoring semantics

**Q:** Should unattended runs require an author, require one only for lifecycle
recipes, or emit no narrative when one is absent?
**A:** Require an author for every unattended run.
**Decision:** Fail at the content stage with no generated narrative when an
author callback is absent. Interactive runs retain their editable human-review
path.

### Question 3: Author interface

**Q:** Should the callback return structured per-artifact content, Markdown, or
all artifacts in one run-level result?
**A:** Approve the structured per-artifact callback and CLI module contract.
**Decision:** The core invokes the author once per recipe artifact and validates
the returned section IDs and prose before serializing retained Markdown.

### Question 4: Theme preview feedback

**Q:** What should change after reviewing the first four shared-content
previews?
**A:** The overall direction is right. Remove Dark/Edgy's dotted background;
avoid repeating the same accent color within a visible card/stat row; and use
the same horizontal slide navigation across all four decks rather than mixing
one horizontal deck with three vertical decks.
**Decision:** Revise all four previews with non-repeating per-row accent
sequences and fixed-viewport horizontal navigation. Dark/Edgy uses a solid
canvas with depth supplied by panels, code wells, hairlines, and restrained
cyan cues.

## Solution Space

### Approach 1: Integrated release-quality follow-on _(Recommended)_

**Description:** One new PR aligns the immutable package, introduces the
authoring contract and quality backstop, and replaces the default theme front
door with four operator-approved curated styles. Rendered theme previews are a
design gate before production theme work.

**When this is the right choice:** The recap path must not be called
production-usable until durability, prose quality, and shipped defaults all
survive the same acceptance run.

**Tradeoffs:** The PR is broader than a two-line defect patch and needs an
explicit lightweight design, contract tests, visual acceptance, and a live W6
regression run.

### Approach 2: Split functional and visual PRs

**Description:** Land immutable hashing and authoring first, then ship curated
styles separately.

**When this is the right choice:** The functional release blocker must land
before visual direction can be reviewed.

**Tradeoffs:** It permits an interim recap path whose default output still
violates the operator's quality bar and duplicates release/version overhead.

### Approach 3: Functional fixes plus visual research only

**Description:** Fix the two W6 defects and retain the four previews as
non-shipping research for a later theme project.

**When this is the right choice:** The previews fail to converge on a lineup
worth shipping.

**Tradeoffs:** It does not satisfy the current request to capture and finalize
the curated default themes in this follow-on.

### Chosen Direction

**Approach:** Integrated release-quality follow-on.
**Rationale:** Durability, authored prose, and default visual quality are all
required for the same unattended recap to be production-usable.
**User validated:** Yes—new PR, quick workflow, four shared-content previews,
required unattended authoring, and structured per-artifact author contract were
explicitly selected. Final visual acceptance remains pending preview review.

## Options Considered

### Option A: Immutable package coverage

**Description:** Expand core hashing and both core/CLI validators to include
`run-request.json`, `source/content-approval.json`, and any retained
author-provenance record.

**Pros:** The archive verifies every immutable input/provenance file needed to
explain and reproduce the retained run.

**Cons:** Existing manifests remain historical v1 records and cannot satisfy
the strengthened complete-package rule without regeneration.

**Chosen:** Yes. Weakening archive validation was rejected because it would
exclude real retained run inputs from durability verification.

### Option B: Author result shape

**Description:** A versioned, structured result per artifact containing author
provenance and a content model with exact narrative section IDs.

**Pros:** Avoids brittle Markdown parsing, supports multi-artifact recipes, and
lets the core validate structure before writing Markdown.

**Cons:** Callers must construct a small structured object rather than returning
free-form text.

**Chosen:** Yes. JSON-only wrappers resolve `authorModulePath`; the core CLI
exposes `--author-module`, and the persisted run request stays data-only.

### Option C: Default theme product shape

**Description:** Four curated named styles designed as whole systems; legacy
palette/profile combinations remain an advanced compatibility axis rather than
the default selection experience.

**Pros:** Defaults encode intentional combinations of color, typography,
density, geometry, and motion.

**Cons:** Requires a compatibility and migration decision for existing
palette/profile callers.

**Chosen:** Yes, subject to operator approval of the four rendered previews.

## Key Decisions

1. **PR boundary:** This work starts from merged `main` and ships in a new PR,
   separate from merged PR #168.
2. **Immutable package:** Hash every retained immutable run input and provenance
   file; align core generation, core validation, CLI archive validation, and
   tests on one set.
3. **Author requirement:** Every unattended run requires an author and fails
   before narrative output when none is supplied.
4. **Author interface:** In-process `options.author` and CLI
   `--author-module`; invoke once per artifact with recipe, outline,
   reconciled fact base, and discovery; return structured authored content and
   provenance.
5. **Theme lineup:** Curated Clean/Neutral, Business/Corporate, Navy/Ocean, and
   Dark/Edgy styles replace the matrix as the default front door.
6. **Theme comparison:** Four independent Opus previews use identical W6
   content and remain review artifacts until the operator accepts them.
7. **Default visibility:** Unattended fallback to shipped defaults must produce
   a manifest warning when no explicit theme is configured.
8. **Deck interaction:** Curated deck styles share fixed-viewport horizontal
   navigation, including keyboard controls, progress/counter chrome, responsive
   overflow, and reduced-motion behavior.
9. **Accent rhythm:** Colors may repeat across a deck when semantically useful,
   but not within the same visible card/stat row.

## Constraints

- Preserve existing fact-base and run-request compatibility unless a concrete
  contract incompatibility requires a new schema ID.
- Do not emit or approve raw source-artifact text as unattended narrative.
- The author seam must be provider-neutral and executable both in-process and
  through the JSON CLI.
- Keep rendered outputs self-contained, responsive, keyboard-operable, and
  compatible with reduced motion.
- Bump changed canonical skill versions and all five public package versions in
  lockstep.
- `pnpm format`, `pnpm lint`, `pnpm type-check`, `pnpm test`, and
  `pnpm release:validate` must pass.
- Treat the W6 archived run as the regression case and obtain a successful Stoa
  rerun before claiming the recap path is production-usable.

## Success Criteria

- A generated recap manifest hashes the complete retained package and
  `oat project archive --project-recap-run` exports it successfully.
- An unattended run with no author fails closed and writes no generated
  narrative document.
- In-process and CLI module author paths receive the documented request and
  produce validated, retained authored Markdown plus provenance.
- Content QA rejects obvious source dumping as a backstop without replacing
  the author requirement.
- The operator approves all four shared-content theme previews before the
  production style contracts are finalized.
- Named curated styles render distinctly and meet the supplied quality
  references across desktop, mobile, keyboard, and reduced-motion checks.
- Existing advanced palette/profile callers have a documented compatibility
  path.
- The live W6 recap rerun archives durably and is judged publishable.

## Out of Scope

- Replacing the caller's provider/LLM implementation; the kit defines and
  validates the seam but remains provider-neutral.
- Adding remote fonts, images, or runtime CDN dependencies to generated
  artifacts.
- Publishing the Opus preview files as production assets before operator
  approval.
- Redesigning non-deck artifact recipes beyond changes required by the shared
  author and named-style contracts.

## Deferred Ideas

- A broader marketplace of user-defined curated styles—deferred until the four
  shipped defaults prove the named-style model.
- Automated aesthetic scoring—deferred because operator visual review remains
  the acceptance authority for this release.

## Open Questions

- **Theme acceptance:** Do the revised previews resolve accent repetition,
  navigation consistency, and Dark/Edgy canvas feedback?
- **Compatibility:** Should named `style` be additive alongside
  `palette`/`visualProfile`, or should the old fields be formally deprecated in
  v1 while remaining accepted?
- **Content-QA threshold:** Which copy-detection method catches source dumping
  without penalizing necessary factual overlap?
- **Historical archive behavior:** Should pre-fix manifests receive a targeted
  legacy error, or remain rejected by the strengthened complete-package rule?

## Assumptions

- The W6 archived inputs remain available for the offered regression rerun.
- The four supplied references are authorized project inputs and can be
  retained in this branch.
- Existing interactive content review remains a valid fallback because it
  halts before rendering and requires explicit human approval.

## Risks

- **False confidence from structural QA:** Valid HTML can still contain
  unacceptable prose.
  - **Likelihood:** High
  - **Impact:** High
  - **Mitigation Ideas:** Mandatory unattended authoring, provenance, copy
    detection, and live operator acceptance.
- **Contract drift across core and CLI:** Immutable coverage or author semantics
  could diverge between generation, validation, wrappers, and archive.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Centralize path-set helpers where practical and add
    cross-boundary fixtures.
- **Theme compatibility regression:** Replacing the default matrix may break
  callers or flatten the four styles back into token-only variants.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Preserve an advanced compatibility axis, define whole
    style bundles, and gate implementation on shared-content preview approval.

## Disposition

The operator accepted the revised four-style baseline and directed this work
into `p-rev1` of the original `explainer-kit` project. The executable contract
now lives in the original project's `plan.md`; this file is retained as the
decision record.
