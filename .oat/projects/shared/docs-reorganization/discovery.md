---
oat_status: complete
oat_ready_for: plan
oat_blockers: []
oat_last_updated: 2026-03-10
oat_generated: false
---

# Discovery: docs-reorganization

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

User identified that OAT documentation coverage is strong but organization needs improvement. The docs site is being evaluated for a migration from MkDocs to Fumadocs. The request is to analyze all documentation for organizational and readability improvements, then execute those improvements.

## Clarifying Questions

### Question 1: Audience Separation

**Q:** Should docs distinguish between consumer-facing (users of OAT) and internal/developer-facing content?
**A:** Yes — there is clear opportunity to separate consumer docs from internal reference. Cross-linking across sections should be used to reduce duplication.
**Decision:** The nav structure should have explicit "User Guide" and "Developer Guide" groupings so the audience is signaled by the navigation itself.

### Question 2: Contributing Section Granularity

**Q:** Should the Contributing section be a single page or broken into focused sub-pages?
**A:** Break it out into separate pages — a markdown features reference card, contributing to docs, contributing to code, writing skills. Each serves a different contributor entry point.
**Decision:** Contributing becomes a multi-page section with ~5 sub-pages organized by contributor task type.

## Solution Space

### Approach 1: Audience-Driven Restructure _(Recommended)_

**Description:** Reorganize the entire nav around two primary audiences (User Guide, Developer Guide) plus a shared Reference section. Elevate provider interop to a top-level user-facing section. Merge Projects into Workflow. Consolidate scattered docs-related pages. Break Contributing into sub-pages.

**When this is the right choice:** When the docs are feature-complete but the information architecture doesn't match how users navigate. This is that situation — content exists but is hard to find.

**Tradeoffs:** Requires updating all cross-references and potentially restructuring directories. More upfront work than incremental fixes.

### Approach 2: Incremental Navigation Fixes

**Description:** Keep the current section structure but reorder pages within sections, add cross-links, and improve index pages. Fix the most confusing navigation issues (CLI ordering, provider interop depth) without a full restructure.

**When this is the right choice:** When the structure is mostly right and only needs minor tuning. Less disruption.

**Tradeoffs:** Doesn't solve the fundamental audience-mixing problem. Users still navigate past contributor docs to find user content.

### Chosen Direction

**Approach:** Audience-Driven Restructure
**Rationale:** The core issue isn't page ordering — it's that consumer and contributor content are interleaved. Incremental fixes don't address that. A restructure also aligns with the MkDocs → Fumadocs migration as a natural point to reorganize.
**User validated:** Yes

## Key Decisions

1. **Audience separation:** Nav structure uses explicit "User Guide" and "Developer Guide" groupings.
2. **Provider Interop elevation:** Promoted from `cli/provider-interop/` to a top-level section under User Guide, reflecting its importance as a core OAT capability.
3. **Workflow + Projects merge:** Combined into a single "Workflow & Projects" section since they describe the same system from different angles.
4. **Docs consolidation:** Four scattered docs-related pages converge into a single "Documentation" section under User Guide.
5. **Core Concepts section:** New section between Quickstart and feature sections to establish the mental model (canonical assets, provider views, drift, scopes, skills, usage modes).
6. **Contributing decomposition:** Broken into sub-pages: index, code, documentation, markdown-features, skills, design-principles.
7. **Visual elements:** Add Mermaid diagrams for key flows. Use tabbed content for multi-variant content (provider-specific setup, workflow lanes, skill families).
8. **Cross-linking over duplication:** Where content serves both audiences, keep it in the primary location and cross-link from the other.

## Constraints

- No content deletion — this is a reorganization, not a reduction.
- All existing URLs/anchors should have redirects or be discoverable from the new structure.
- Must work in both MkDocs (current) and Fumadocs (target). Tabs are supported in both (MkDocs natively, Fumadocs via existing transform in `@oat/docs-transforms`).
- The `index.md` + `## Contents` navigation contract must be maintained in all new/moved index files.
- Mermaid diagrams must use syntax supported by both MkDocs `superfences` and Fumadocs rendering.

## Success Criteria

- Every doc page has a clear primary audience (consumer or contributor).
- A new user can find "how do I sync skills to Cursor?" within 2 nav clicks from the homepage.
- A contributor can find "how do I add a CLI command?" within 2 nav clicks from the homepage.
- Provider Interop is accessible as a top-level section, not buried under CLI.
- No duplicated content — cross-links connect related content across audience sections.
- Key flows (workflow lifecycle, state machine, provider sync) have Mermaid diagrams.
- Multi-variant content (providers, workflow lanes) uses tabbed presentation.

## Out of Scope

- Fumadocs migration itself (that's a separate effort; this reorganization should work in both systems).
- Writing new conceptual content from scratch (Core Concepts section will synthesize existing content, not create net-new explanations).
- Changing the docs tooling contract (`index.md` + `## Contents` pattern stays as-is).
- CLI or skill code changes — this is docs-only.

## Deferred Ideas

- Interactive provider comparison table — could be useful but requires custom components. Revisit after Fumadocs migration.
- Search improvements / algolia integration — separate concern from organization.
- API reference auto-generation from CLI help text — good idea but separate project.

## Open Questions

- **Redirect strategy:** When pages move to new paths, what's the redirect mechanism in MkDocs vs. Fumadocs?
- **Tab syntax portability:** Confirm that the `pymdownx.tabbed` syntax and the Fumadocs tab transform produce compatible authoring patterns, or identify what adapter work is needed.
- **Mermaid rendering parity:** Verify Mermaid works identically in both MkDocs superfences and Fumadocs.

## Assumptions

- The MkDocs → Fumadocs migration will happen but is not a prerequisite for this reorganization.
- Existing cross-references within docs pages are the ones visible in markdown link syntax (no dynamic resolution).
- The `oat docs nav sync` command can regenerate navigation from updated `index.md` files after restructuring.

## Risks

- **Broken cross-references:** Moving pages changes paths, breaking existing links within docs.
  - **Likelihood:** High
  - **Impact:** Medium
  - **Mitigation:** Systematic link audit after each move. Use `oat docs analyze` to detect drift.

- **Navigation regression:** Restructuring could make some content harder to find if the new groupings don't match user expectations.
  - **Likelihood:** Low
  - **Impact:** Medium
  - **Mitigation:** The audience-based split is well-understood. Validate with the homepage "Choose a usage path" routing.

## Next Steps

Proceed directly to `plan.md` — scope is clear and no architecture decisions remain. This is a content reorganization with well-defined moves.
