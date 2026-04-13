---
oat_generated: true
oat_generated_at: 2026-04-13
oat_review_scope: design
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/docs-bootstrap-skill
---

# Artifact Review: design

**Reviewed:** 2026-04-13
**Scope:** Design artifact review for quick-mode project
**Files reviewed:** 2
**Commits:** N/A (artifact review)

## Summary

The design is directionally aligned with discovery and covers the core flow: preflight, richer inputs, CLI scaffold, build verification, config inspection, education, and optional content kickoff. It is not yet plan-ready because several discovered friction points are either omitted from the component design or handled with fallback language that does not define safe execution boundaries.

## Findings

### Critical

None

### Important

1. **FP-13 is not carried into an implementable component path.** Discovery identifies FP-13 as an open scaffold-template problem with four concrete sub-findings: sibling page descriptions, command working-directory context, lint-copy accuracy, and generated `index.md` warnings (`discovery.md:228`). The design acknowledges FP-13 in the overview (`design.md:16`), but the Scaffold Runner post-patch list only covers FP-12, FP-11, and FP-15 (`design.md:92`, `design.md:237`). Build Verifier later lists `FP-13-cwd-commands` as a failure category (`design.md:296`), but FP-13 is mostly content/template correctness, not a build failure. As written, plan tasks can easily skip most of FP-13 while still appearing to satisfy the design. Fix by adding FP-13 to the Scaffold Runner or a dedicated Template Content Patcher, with explicit handling for all four sub-findings from discovery.

2. **Existing-docs conflict decisions are underspecified enough to risk unsafe scaffold behavior.** The Input Gatherer records conflict decisions such as `replace`, `second-app`, `abort`, and `repair` (`design.md:80`, `design.md:200`, `design.md:221`), and Error Handling says preflight conflicts are resolved there (`design.md:406`). The design never defines what each resolution means for files, `.oat/config.json`, root `AGENTS.md`, or an existing docs app directory before Scaffold Runner invokes `oat docs init`. This weakens the discovery success criterion that preflight checks prevent accidental overwrites (`discovery.md:360`). Fix by adding a small conflict-resolution contract that maps each option to concrete allowed mutations, preserved state, and stop conditions before scaffold execution.

### Medium

1. **Fallback patch capability detection is too implicit for a safe implementation plan.** Scaffold Runner says it will pass `--site-name` if the CLI supports it, otherwise patch title locations (`design.md:237`), and will apply a Turbopack root patch either through `createDocsConfig` passthrough or by replacing the wrapper with explicit `createMDX()` config (`design.md:244`). The Design Decisions also say patches are skipped when the CLI can do the work directly (`design.md:268`). The artifact does not define how the skill detects those capabilities, which files are safe to rewrite, or how it verifies an existing user-edited config before replacing the wrapper. Fix by specifying deterministic probes, for example CLI help/version checks for `--site-name`, source/file-shape checks before applying template patches, and refusal behavior when user edits make the fallback ambiguous.

2. **MkDocs support is acknowledged as thin but lacks the minimum acceptance boundary.** Discovery accepts a thinner MkDocs path while still requiring setup, build verification, and shared concepts (`discovery.md:36`). The design repeats that MkDocs is lean and "needs elaboration" (`design.md:18`, `design.md:369`, `design.md:382`), but does not define what the lean MkDocs path must include beyond the shared flow. Fix by adding a short MkDocs minimum contract: expected scaffold command, verification command, config fields to inspect, generated navigation artifacts to warn about, and the specific educational points that are required versus deferred.

### Minor

1. **State metadata still marks the design as in progress.** `design.md` frontmatter has `oat_status: in_progress` and `oat_ready_for: null` (`design.md:2`), while `state.md` says the design is awaiting validation. If this review is intended as the validation gate, update the metadata after review receive/fixes so routing can distinguish draft design from review-ready design.

## Spec/Design Alignment

### Requirements Coverage

| Requirement                                                                          | Status  | Notes                                                                                                 |
| ------------------------------------------------------------------------------------ | ------- | ----------------------------------------------------------------------------------------------------- |
| Guided wrapper around `oat docs init`                                                | covered | Component flow preserves the CLI as scaffold source of truth.                                         |
| Detect monorepo vs single-package and adapt                                          | partial | Repo-shape detection is present, but conflict-resolution semantics need to be made concrete.          |
| Verify build and resolve issues                                                      | partial | Build Verifier is present; fallback capability detection and FP-13 handling need tightening.          |
| Educate on docs config, `index.md`, `## Contents`, agent instructions, analyze/apply | covered | Walkthrough is detailed and grounded in inspector output.                                             |
| Fumadocs full path and MkDocs lean path                                              | partial | Fumadocs path is detailed; MkDocs needs a minimum acceptance boundary.                                |
| CLI/scaffold friction points from discovery                                          | partial | FP-11, FP-12, FP-14, FP-15 are represented; FP-13 is not fully mapped to an implementation component. |

### Extra Work (not in requirements)

None. The design's extra-looking detail mostly clarifies discovered friction points and is within the project scope.

## Verification Commands

No code verification commands were run for this artifact review. After design fixes, re-run:

```bash
pnpm run cli -- project review provide artifact design
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan/design fix tasks.
