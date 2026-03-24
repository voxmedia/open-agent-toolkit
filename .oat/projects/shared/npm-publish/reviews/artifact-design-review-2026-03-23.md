---
oat_generated: true
oat_generated_at: 2026-03-23
oat_review_scope: design
oat_review_type: artifact
oat_project: .oat/projects/shared/npm-publish/
---

# Artifact Review: design.md

**Reviewed:** 2026-03-23
**Scope:** design.md artifact quality, internal consistency, and alignment with spec.md and discovery.md
**Files reviewed:** 2 (design.md, spec.md; discovery.md used as upstream reference)
**Commits:** N/A (artifact review, not commit-scoped)

## Summary

The design document contains strong, well-structured content in lines 1-729 that aligns closely with the spec and discovery artifacts. However, the document has a critical structural defect: lines 730-960 contain an entire second set of unfilled template boilerplate (placeholder sections for API Design, Security, Performance, Error Handling, Testing, Deployment, Migration, Open Questions, Implementation Phases, Dependencies, and Risks) that duplicates sections already filled earlier in the document. This makes the design appear incomplete and creates ambiguity about which sections are authoritative. Additionally, the filled portion omits an Open Questions section, dropping the three open questions carried forward from spec.md without resolution or acknowledgment.

## Findings

### Critical

- **Unfilled template boilerplate appended to document** (`design.md:736-960`)
  - Issue: Lines 736-960 contain a complete second copy of template section headers (API Design, Security Considerations, Performance Considerations, Error Handling, Testing Strategy, Deployment Strategy, Migration Plan, Open Questions, Implementation Phases, Dependencies, Risks and Mitigation) with `{placeholder}` values. These duplicate sections that are already filled with real content earlier in the document (API Design at line 401, Security at line 512, Performance at line 549, Error Handling at line 578, Testing at line 607, Deployment at line 661, Migration at line 707). This creates ambiguity about which section is authoritative and makes the document appear unfinished.
  - Fix: Remove lines 736-960 entirely. The filled sections earlier in the document are the authoritative content. Also remove the orphaned Storage block at lines 731-734.

- **Orphaned unfilled Storage block after Rollback Strategy** (`design.md:731-734`)
  - Issue: A `**Storage:**` field with placeholders `{Database, file system, memory}` and `{How/when data is persisted}` is appended to the end of the Migration Plan's Rollback Strategy section. This appears to be a template artifact that was not cleaned up. It sits between the filled Migration Plan content (which ends at line 729) and the unfilled template boilerplate (starting at line 736).
  - Fix: Remove lines 731-734. The Migration Plan section does not require a Storage subsection; storage is already addressed in the Data Models section (lines 336-340, 365-369, 396-400).

### Important

- **Missing Open Questions section in filled content** (`design.md` -- absent between Migration Plan and References)
  - Issue: The spec.md carries three explicit Open Questions (ownership model, per-package docs depth, release trigger style). The discovery.md also carries these same three questions. The design document should either resolve these questions, carry them forward with design-informed context, or explicitly defer them. The filled portion of design.md (lines 1-729) has no Open Questions section at all. The only Open Questions section is in the unfilled template boilerplate at line 912-915 with placeholder text.
  - Fix: Add an Open Questions section between the Migration Plan and References sections. For each of the three spec open questions, either provide the design's position/resolution or explicitly carry the question forward with any additional design context. Specifically:
    1. Ownership model (npm tokens vs. trusted publishing) -- the design mentions both at line 518, but does not resolve or narrow the question.
    2. Per-package docs depth -- the design addresses consumer positioning but does not answer how much README content each docs library should carry.
    3. Release trigger style (tags vs. release PR vs. other) -- the design describes a "release-triggered workflow" at line 113 but does not specify the trigger mechanism.

- **Design status frontmatter shows `oat_ready_for: null`** (`design.md:4`)
  - Issue: The frontmatter has `oat_status: in_progress` and `oat_ready_for: null`. If this design is being submitted for review, the status should reflect readiness. If it is genuinely still in progress, the review may be premature. This creates ambiguity about whether the unfilled template sections are known-incomplete or accidental.
  - Fix: Once the template cleanup is done, update the frontmatter to `oat_status: complete` and `oat_ready_for: oat-project-plan` (or the appropriate next step).

### Minor

- **Requirement-to-Test Mapping verification methods could be more concrete** (`design.md:609-623`)
  - Issue: Several requirements use "manual" as the sole verification method (FR4, NFR1, NFR3). While some of these are inherently subjective (consumer clarity, release simplicity), the design could strengthen verifiability by suggesting specific manual checklist items or review gates.
  - Suggestion: For FR4, specify a concrete checklist (e.g., "CLI listed first in root README, CLI has more prominent install guidance than docs packages"). For NFR1, specify what "simple" means concretely (e.g., "single workflow file, no per-package version inputs"). For NFR3, specify what a reviewer should check (e.g., "package description on npm is understandable without reading source").

- **Data Models section does not specify the four concrete package names** (`design.md:310-400`)
  - Issue: The ConsumerPackageReferenceSet interface at line 379-385 correctly lists all four `@voxmedia/oat-*` names, but the PublicReleaseManifest at line 318-327 uses a generic `packages: Array<{...}>` shape without specifying the concrete names. While the validation rules at line 332-334 reference the names, the schema itself could be more self-documenting.
  - Suggestion: Add a comment or const enum in the PublicReleaseManifest schema showing the four expected package names for the first release, similar to how ConsumerPackageReferenceSet does it.

- **Component diagram is text-only and could be clearer** (`design.md:68-93`)
  - Issue: The ASCII component diagram is readable but the relationship between the Reference Alignment Layer and the other layers is not visually clear. The Reference Alignment Layer feeds into "consumer-facing docs + generated consumers" but the diagram does not show how that feeds into the Artifact Validation or Release Orchestration layers.
  - Suggestion: Consider adding a note or arrow showing that Reference Alignment outputs are included in the validation scope (since FR5 requires reference alignment to be validated).

## Artifact Quality Assessment

### Completeness

The filled portion (lines 1-729) covers all expected design sections: architecture, component design, data models, API design, security, performance, error handling, testing strategy, deployment strategy, and migration plan. Each of the four key components identified in the overview is expanded with purpose, responsibilities, interfaces, dependencies, and design decisions. The document is substantively complete for its purpose.

However, the presence of 230 lines of unfilled template boilerplate at the end creates the strong impression of an incomplete document. This must be cleaned up before the artifact can be considered ready to proceed.

### Internal Consistency

The filled content is internally consistent. Design decisions in the component sections align with the architecture overview. The four-package lockstep model is consistently applied across all sections. The testing strategy maps correctly to the requirement IDs. No contradictions were found within the filled content.

### Alignment with Upstream Artifacts

**Evidence sources used:** spec.md, discovery.md

| Spec Requirement                                    | Design Coverage | Notes                                                                      |
| --------------------------------------------------- | --------------- | -------------------------------------------------------------------------- |
| FR1 (Public package identity)                       | Covered         | Public Package Contract component, ConsumerPackageReferenceSet data model  |
| FR2 (Coordinated multi-package publishing)          | Covered         | Release Orchestration Layer, Coordinated Publish Workflow API              |
| FR3 (Public package metadata readiness)             | Covered         | Public Package Contract interfaces, Artifact Validation Layer              |
| FR4 (Consumer-facing package positioning)           | Covered         | Reference Alignment Layer, but trigger mechanism for release not specified |
| FR5 (Internal reference and template alignment)     | Covered         | Reference Alignment Layer with ConsumerReferenceUpdate interface           |
| FR6 (Release-path validation)                       | Covered         | Artifact Validation Layer, Release Validation Workflow API                 |
| NFR1 (Release simplicity)                           | Covered         | Explicit design decision to avoid complex orchestration                    |
| NFR2 (Public artifact quality)                      | Covered         | PackageArtifactPolicy data model, forbidden/required paths                 |
| NFR3 (Consumer clarity)                             | Covered         | Reference Alignment Layer responsibilities                                 |
| NFR4 (Compatibility with current repo architecture) | Covered         | Explicit design decision to preserve four-package shape                    |

All spec requirements are addressed in the design. Discovery decisions are faithfully carried forward. The design correctly rejects the alternatives identified in discovery (CLI-only release, managed release system).

Spec constraints are preserved:

- Simple first-release model: Yes
- Four-package structure preserved: Yes
- Vox Media npm scope: Yes
- Docs packages included in same release: Yes
- Monorepo architecture compatibility: Yes

### Actionability

The filled portion is actionable. Component interfaces are concrete TypeScript types. The testing strategy has a complete requirement-to-test mapping. The deployment strategy has sequenced steps. The migration plan has ordered steps.

The three unresolved open questions from spec reduce actionability slightly for the planning phase, since the plan will need to make assumptions about release trigger mechanism and npm auth model without design guidance.

## Verification Commands

Run these to verify the fixes have been applied:

````bash
# Verify no unfilled template placeholders remain
grep -n '{.*}' .oat/projects/shared/npm-publish/design.md | grep -v '```' | grep -v 'interface\|Array<\|Record<\|string |'

# Verify the orphaned Storage block is removed
grep -n 'Database, file system, memory' .oat/projects/shared/npm-publish/design.md

# Verify Open Questions section exists with real content
grep -n 'Open Questions' .oat/projects/shared/npm-publish/design.md

# Verify frontmatter status is updated
head -7 .oat/projects/shared/npm-publish/design.md

# Count total lines - should be significantly less than 960 after cleanup
wc -l .oat/projects/shared/npm-publish/design.md
````
