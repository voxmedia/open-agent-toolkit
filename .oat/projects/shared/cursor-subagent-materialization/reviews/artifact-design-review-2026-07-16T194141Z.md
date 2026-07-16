---
oat_generated: true
oat_generated_at: 2026-07-16T19:41:41Z
oat_review_scope: design
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/cursor-subagent-materialization
---

# Artifact Review: design

**Reviewed:** 2026-07-16T19:41:41Z
**Scope:** Revised lightweight design (`design.md`) for completeness, internal consistency, planning readiness, and exact alignment with `discovery.md` Key Decisions
**Files reviewed:** 2 (`design.md`, `discovery.md`; `plan.md` and `implementation.md` read as scaffold/context only)
**Commits:** n/a (artifact review)

## Dispatch Audit

Dispatch: policy=managed/high source=project-state provider=cursor model_axis=selected:gpt-5.6-sol-high effort_axis=not-applicable selection_reason=matrix-pinned target=gpt-5.6-sol-high runtime_identity=not-reported

The dispatch values above are launcher-owned configuration. No runtime model identity was reported or inferred.

## Summary

The revised lightweight design is complete, internally consistent, and ready for planning. It aligns with all seven discovery Key Decisions and resolves all five prior findings with concrete design statements and test obligations; no regression or new issue was found in the in-scope artifacts.

Findings: 0 critical, 0 important, 0 medium, 0 minor

## Findings

### Critical

None

### Important

None

### Medium

None

### Minor

None

## Resolved-Finding Verification

| Prior finding                                                     | Status   | Verified evidence                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Composer bracket-explicit invariant and tests                     | resolved | The mapping contract now requires a bracket segment for every `frontmatterModel`, explicitly defines `composer-2.5[]` and `composer-2.5[fast=true]`, and explains the default-fast risk (`design.md:132`). Unit tests require the universal bracket invariant and both exact Composer forms (`design.md:198`).                                                                           |
| Bundled multi-family recommendation update                        | resolved | A dedicated subsection requires updates to both `packages/cli/config/dispatch-matrix-recommendation.json` and its bundled asset copy, includes GPT, Claude, Composer, and Grok with Grok in Balanced, and advances the version marker (`design.md:161-164`). Integration tests require tier placement, marker-version advancement, copy parity, and materializability (`design.md:209`). |
| Skills validation still enforced `dispatchArgs.model`             | resolved | The design names `packages/cli/src/validation/skills.test.ts` and requires migration to `providers.cursor.dispatchArgs.variant` in the same resolver/skill change (`design.md:167-170`). Unit and integration coverage reject the stale model-argument contract (`design.md:201`, `design.md:210`).                                                                                      |
| Mapping module location unspecified                               | resolved | The mapping table now has a concrete home at `packages/cli/src/providers/cursor/codec/catalog.ts`, with marker helpers in sibling `shared.ts` (`design.md:181`).                                                                                                                                                                                                                         |
| Canonical-only frontmatter projection and discovery wording drift | resolved | The codec explicitly omits canonical-only `version`, `tools`, and `color` fields while preserving the canonical body byte-for-byte (`design.md:142-147`). Discovery now describes projected documented frontmatter plus managed comments and mapped pin, while retaining body identity (`discovery.md:76`).                                                                              |

## Artifact Quality

### Completeness and Planning Readiness

- The architecture defines the provider-neutral extension boundary, provider-owned codecs, lifecycle flow, ownership behavior, collision handling, dispatch compilation, verification lane, error cases, and release checks (`design.md:21-68`, `design.md:70-223`).
- Concrete data shapes and module placement are supplied for the extension contract and Cursor mapping catalogue (`design.md:82-108`, `design.md:110-134`, `design.md:179-183`).
- Previously open naming decisions are settled: generated names use the flat ladder ID through one deterministic builder shared with the resolver, and generated frontmatter sets an explicit normalized `name` (`design.md:65`, `design.md:142-149`).
- Testing covers unit, integration, live-verification, and release lanes with actionable behavioral obligations (`design.md:194-223`).

### Internal Consistency

- Selection identity, generated variant identity, and frontmatter identity remain deliberately separate; no fallback derives one from another (`design.md:17`, `design.md:65`, `design.md:132-134`).
- The codec's canonical-body identity guarantee is consistent with its documented-schema frontmatter projection (`design.md:142-147`) and with discovery's aligned success criterion (`discovery.md:76`).
- Catalogue availability remains diagnostic, while live native-agent launches supply pin evidence; neither is presented as runtime self-report (`design.md:159`, `design.md:171`, `design.md:173-177`).
- The supported catalogue remains a capability surface broader than reusable or operator-specific ladder policy (`design.md:163`, `discovery.md:61-62`).

## Requirements/Design Alignment

**Evidence sources used:** `design.md` (artifact under review), `discovery.md` (authoritative quick-mode requirements), `plan.md` and `implementation.md` (scaffold/context only), and the archived prior design review solely to identify the resolution claims for independent verification. Missing `spec.md` is expected in quick mode and was not treated as a finding.

### Key Decision Coverage

| Discovery decision                                                  | Status  | Design evidence                                                                                                                                                                                                         |
| ------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| KD1: frontmatter-only codec using documented syntax                 | covered | Explicit flat-ID/frontmatter split, no derivation fallback, documented field projection, and actionable missing-mapping failure (`design.md:17`, `design.md:132-147`, `design.md:187`).                                 |
| KD2: explicit mapping table, including Composer and awkward entries | covered | Typed mapping schema, universal bracket requirement, exact Composer forms, and verification-gated Fable/Grok handling (`design.md:114-134`, `design.md:175-177`, `design.md:198`, `design.md:216`).                     |
| KD3: verification lane gates shipped mappings                       | covered | The lane requires native launches, positive pin evidence, and correction or exclusion of ambiguous mappings (`design.md:19`, `design.md:173-177`, `design.md:213-217`).                                                 |
| KD4: multi-family catalogue seeded from the proven ladder           | covered | GPT, Claude, Composer, and Grok syntax families are modeled, while shipped entries remain evidence-gated (`design.md:114-130`, `design.md:163`, `design.md:175`).                                                       |
| KD5: bundled recommendation enriched in the same project            | covered | Both source and bundled copy are updated, versioned, and tested for the multi-family placement including Grok Balanced (`design.md:161-164`, `design.md:209`).                                                          |
| KD6: resolver and skill adoption                                    | covered | Cursor changes from `model-arg` to `pinned-variant`, emits `dispatchArgs.variant`, launches native variants first, and migrates the skills-validation contract (`design.md:165-170`, `design.md:201`, `design.md:210`). |
| KD7: launcher-owned configured provenance                           | covered | Reports distinguish configured selection from unreported runtime identity and use `CURSOR_CONVERSATION_ID` only for transcript correlation (`design.md:68`, `design.md:151`, `design.md:171`, `design.md:217`).         |

### Constraint and Success-Criteria Coverage

| Discovery requirement                                              | Status  | Design evidence                                                                                                                                            |
| ------------------------------------------------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preserve supported/user/project ownership and scoped cleanup       | covered | Owner precedence and cleanup boundaries are explicit (`design.md:157`, `design.md:187-192`).                                                               |
| Detect collisions across Cursor-compatible directories             | covered | All three discovery locations are checked, with Codex TOML excluded from Markdown collisions (`design.md:149`, `design.md:188`).                           |
| Keep catalogue probing diagnostic                                  | covered | Doctor compares flat IDs through the existing probe without transforming IDs or claiming runtime verification (`design.md:159`, `design.md:190`).          |
| Preserve canonical instructions while projecting valid frontmatter | covered | Canonical body is byte-identical; unsupported canonical fields are omitted; managed metadata remains in comments (`design.md:142-147`, `discovery.md:76`). |
| Respect release/versioning requirements                            | covered | Canonical versions, five-package lockstep bumps, sync regeneration, and `pnpm release:validate` are release checks (`design.md:221-223`).                  |

### Extra Work (not in declared requirements)

None. The provider-neutral extension contract is the implementation of discovery's chosen generalized-materializer approach, and the design keeps provider-native semantics outside the shared lifecycle boundary (`discovery.md:37-40`, `design.md:25-27`, `design.md:108`).

## Verification Commands

Run these to re-check the resolved design statements and artifact formatting:

```bash
rg -n "composer-2\\.5\\[\\]|dispatchArgs\\.variant|dispatch-matrix-recommendation|catalog\\.ts|canonical-only" .oat/projects/shared/cursor-subagent-materialization/design.md
rg -n "frontmatter is projected|Grok \\(Balanced tier|configured provenance" .oat/projects/shared/cursor-subagent-materialization/discovery.md
pnpm exec oxfmt --check .oat/projects/shared/cursor-subagent-materialization/reviews/artifact-design-review-2026-07-16T194141Z.md
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to record this passing re-review, update the design review row to `passed`, and continue into planning.
