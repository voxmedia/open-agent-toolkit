---
oat_generated: true
oat_generated_at: 2026-03-08
oat_review_scope: design
oat_review_type: artifact
oat_project: /Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/docs-framework-migration
---

# Artifact Review: design

**Reviewed:** 2026-03-08
**Scope:** Updated `design.md` readiness, clarity, and alignment with `spec.md`
**Files reviewed:** 5
**Commits:** n/a

## Summary

The updated design is materially stronger than the prior revision. The earlier gaps around GFM callout handling, theme contract coverage, nav ordering, and package-manager-agnostic script wiring are resolved, but the artifact is still not fully ready to hand off because one FR8 contradiction remains and project bookkeeping is still out of sync with the actual phase.

## Findings

### Critical

None

### Important

- **MkDocs preservation contract is internally contradictory** (`design.md:52`)
  - Issue: The component diagram says the existing MkDocs template set is `docs-app-mkdocs/ (existing, renamed)` (`design.md:52`), while the CLI design later says the MkDocs path/behavior is unchanged (`design.md:345`, `design.md:367`). That conflicts with FR8's requirement that the existing MkDocs templates remain unchanged and leaves implementers unclear on whether they are allowed to rename or restructure the current template assets.
  - Fix: Reconcile these sections into a single preservation contract. Either state that the current MkDocs template directory remains intact as-is, or explicitly describe any internal aliasing/compatibility layer and why it still satisfies "templates unchanged."
  - Requirement: FR8

### Medium

- **Dependency version policy is still unresolved and self-contradictory** (`design.md:560`)
  - Issue: The design leaves Fumadocs version pinning as an open question (`design.md:560`), lists the core packages as `latest` in Dependencies (`design.md:618`-`design.md:620`), and separately says the mitigation is to pin versions (`design.md:643`-`design.md:645`). That leaves package manifest policy undefined going into planning, which weakens the NFR5 upgrade-path story.
  - Fix: Choose the package version policy now, update Dependencies and Risks to match it, and tie the decision to the NFR5 verification strategy.
  - Requirement: NFR5

- **Workflow/bookkeeping still blocks a clean planning handoff** (`state.md:31`)
  - Issue: `state.md` still reports design as in progress and says no plan exists (`state.md:31`-`state.md:33`), while `plan.md` already exists but is still the unfilled template (`plan.md:20`-`plan.md:24`, `plan.md:35`-`plan.md:37`). That drift makes readiness ambiguous even if the design content is otherwise acceptable.
  - Fix: Once this design revision is accepted, update `state.md` to the correct post-review phase state and replace the placeholder `plan.md` content with an executable task plan before implementation begins.

### Minor

None

## Artifact Quality and Alignment

**Artifacts used:** `spec.md`, `design.md`, `plan.md`, `state.md`

**Background checked only:** `reviews/artifact-design-review-2026-03-08.md`

### Completeness and Readiness

The design now covers architecture, interfaces, data flow, testing, migration, and implementation phases with enough detail to support planning. It is close to planning-ready, but the FR8 contradiction and unresolved dependency policy should be closed first so the plan does not inherit ambiguity.

### Internal Consistency

The artifact is mostly internally consistent. The remaining inconsistency is concentrated in MkDocs scaffold preservation and the dependency versioning policy.

### Spec Alignment

| Requirement | Status | Notes |
|-------------|--------|-------|
| FR1 | aligned | Scaffold flow, static export, starter-content shape, and init behavior are designed. |
| FR2 | aligned | Config package now specifies GFM blockquote callout handling, Mermaid, and FlexSearch wiring. |
| FR3 | aligned | Tabs transform contract and test surface are described. |
| FR4 | aligned | Theme contract now includes branding colors, Mermaid, dark/light support, and copy-button behavior. |
| FR5 | aligned | Codemod responsibilities and dry-run/apply behavior are defined. |
| FR6 | aligned | Nav generation behavior, ordering, output format, and script integration are specified. |
| FR7 | aligned | `documentation.index` extension and update points are described. |
| FR8 | partial | MkDocs preservation intent is present, but the diagram and CLI sections disagree on whether templates are renamed. |
| NFR1 | aligned | Plain `.md` authoring contract is preserved. |
| NFR2 | aligned | Package-manager-agnostic script contract is now explicit. |
| NFR3 | aligned | Static export requirements are addressed in config, runtime behavior, and tests. |
| NFR4 | aligned | Branding is configurable and open-source constraints are respected in the design. |
| NFR5 | partial | Thin-scaffold upgrade path is central, but dependency version policy remains undecided. |

### Extra Work / Scope Creep

None identified in the current design revision.

## Verification Commands

Run these to verify the remaining issues are closed:

```bash
sed -n '48,53p' .oat/projects/shared/docs-framework-migration/design.md
sed -n '341,369p' .oat/projects/shared/docs-framework-migration/design.md
sed -n '557,645p' .oat/projects/shared/docs-framework-migration/design.md
sed -n '27,33p' .oat/projects/shared/docs-framework-migration/state.md
rg -n "\\{Brief goal statement from spec\\}|\\{Phase Name\\}|\\{Task Name\\}" .oat/projects/shared/docs-framework-migration/plan.md
```

## Recommended Next Step

Resolve the Important and Medium findings, then rerun the design artifact review. After acceptance, run the `oat-project-review-receive` skill if you want the remaining findings converted into concrete plan tasks.
