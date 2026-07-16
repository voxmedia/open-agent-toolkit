---
oat_generated: true
oat_generated_at: 2026-07-16T11:18:18Z
oat_review_scope: design
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/cursor-subagent-materialization
---

# Artifact Review: design

**Reviewed:** 2026-07-16T11:18:18Z
**Scope:** Lightweight design (`design.md`) for cursor-subagent-materialization — completeness, internal consistency, readiness for planning, and alignment with `discovery.md` Key Decisions (quick mode; `spec.md` absent by contract and not a finding)
**Files reviewed:** 2 (design.md, discovery.md; plan.md and implementation.md read as scaffolds for context)
**Commits:** n/a (artifact review)

## Dispatch Audit

Dispatch: scope=design action=review role=reviewer producer=unknown provenance=launcher-selected model_axis=inherit effort_axis=inherit dispatch_policy=none selection_reason=inherit (pre-plan; no project policy) target=inherit

## Summary

The design is strong and ready for planning with minor amendments. It honors the discovery's hardest invariants precisely: the two-identity split (flat ladder ID for selection/naming vs. explicit bracket-syntax mapping for frontmatter, with no derivation fallback in either direction), the verification lane as a release gate with the awkward Fable/Grok entries deferred to live evidence, launcher-owned `configured` provenance with `CURSOR_CONVERSATION_ID` correlation, and preservation of the Codex owner-marker system. All codebase claims verified: `packages/cli/src/commands/providers/codex/materialize.ts` and `packages/cli/src/providers/codex/codec/` exist as described, `packages/cli/src/commands/sync/index.ts:272-308` contains the Codex-only branching the extension registry removes, the Cursor ceiling adapter is currently `model-arg` (`packages/cli/src/providers/ceiling/registry.ts:154`, confirmed by `registry.test.ts:195-198`), and coordination commit `c57bdc9d` (gate-execution-hardening p02-t06) exists in history. The gaps are narrow: the Composer bracket-explicit rule from Key Decision 2 is only implicit, the bundled recommendation enrichment (Key Decision 5) appears only as a test bullet rather than a design statement, and the design misses that the skills-validation suite hardcodes the old `providers.cursor.dispatchArgs.model` contract.

Findings: 0 critical, 0 important, 3 medium, 2 minor

## Findings

### Critical

None

### Important

None

### Medium

- **Composer bracket-explicit invariant from Key Decision 2 is only implicit, and the stated test guard would not catch a violation** (`design.md:132`)
  - Issue: Discovery Key Decision 2 (`discovery.md:59`) requires Composer entries to always be bracket-explicit — `composer-2.5[]` (standard) / `composer-2.5[fast=true]` (fast) — because bare `composer-2.5` may default to fast. The design defines the `composer-fast` syntax family (`design.md:118`) and says `frontmatterModel` is "an explicit documented base-ID-plus-brackets value" (`design.md:132`), which implies brackets are always present, but it never states the Composer wrinkle or the always-bracket rule. Its mapping-table unit-test invariant is "no flat suffixed value in `frontmatterModel`" (`design.md:191`) — a bare `composer-2.5` is not a flat suffixed value, so that test as designed would pass a mapping entry that violates Key Decision 2.
  - Fix: In "Cursor Model Mapping and Catalogue", state explicitly that every `frontmatterModel` must include a bracket segment (empty `[]` allowed) and name the Composer default-fast rationale from discovery. Extend the unit-test bullet in Testing Strategy to assert a bracket segment is present in every `frontmatterModel`, not just the absence of flat suffixed IDs.
  - Requirement: Discovery Key Decision 2

- **Bundled recommendation enrichment (Key Decision 5) has no design-body coverage — it surfaces only as a test bullet** (`design.md:202`)
  - Issue: Discovery Key Decision 5 (`discovery.md:62`) requires enriching the bundled `dispatch-matrix-recommendation.json` Cursor cells to multi-family in this same project, with Grok placed in Balanced per the operator. The design's only trace is the Integration Tests bullet "Bundled recommendation tests assert the intended multi-family tier placement" (`design.md:202`) — but the "intended" placement is defined nowhere in the design, no component or data-flow section mentions updating the bundled JSON, and the file is not named. Verified against the repo: `packages/cli/config/dispatch-matrix-recommendation.json` (version `2026-07-10.2`) Cursor cells are indeed gpt-only today, so this is a real deliverable a planner could miss when working from design.md alone.
  - Fix: Add a short subsection (e.g. under "Cursor Target Collection and Sync Lifecycle" or Data Models) stating that `packages/cli/config/dispatch-matrix-recommendation.json` (and its `assets/config/` copy) Cursor cells are updated to the multi-family placement promoted from the cloud ladder, including Grok in Balanced, with a version bump of the recommendation marker.
  - Requirement: Discovery Key Decisions 4/5

- **Skills-validation suite pins the old Cursor dispatch contract; the resolver change will break it and the design does not account for that surface** (`design.md:194`)
  - Issue: The design's resolver test requirement — "each managed Cursor candidate compiles to the expected `dispatchArgs.variant`, never `dispatchArgs.model`" (`design.md:194`) — directly contradicts existing validation expectations in `packages/cli/src/validation/skills.test.ts:1765`, `:1895`, and `:1910`, which assert that skill prose references `providers.cursor.dispatchArgs.model`. The design covers dispatch-skill prose updates (Key Decision 6, `design.md:162-164`) but not the validation-suite contract that enforces the old prose, so planning from this design would likely discover the breakage mid-implementation.
  - Fix: In "Resolver, Dispatch Guidance, and Provenance", note that the skill-validation contract in `packages/cli/src/validation/skills.test.ts` encodes the Cursor `dispatchArgs.model` rule and must be updated in the same change that flips the resolver and skill prose to `dispatchArgs.variant`.
  - Requirement: Discovery Key Decision 6

### Minor

- **Mapping table module location is unspecified** (`design.md:174`)
  - Issue: Data Models says the mapping table is "checked-in TypeScript data" but names no module path. The Codex analog (`SUPPORTED_CODEX_ROLE_TARGETS` in `packages/cli/src/providers/codex/codec/shared.ts:32`) suggests an obvious home, and the review objective asks for shape and location; shape is fully specified, location is not.
  - Suggestion: Name the intended module (e.g. `packages/cli/src/providers/cursor/codec/shared.ts` or equivalent) so plan tasks have a concrete file target.

- **Frontmatter field-drop policy for canonical-only fields is unstated; discovery success-criterion wording is slightly stale relative to the design** (`design.md:144`)
  - Issue: Canonical agents carry `version`, `tools`, and `color` frontmatter, none of which are in Cursor's five-field schema. The design says variants "add only the mapped `model` field" and tests require "five-field-compatible frontmatter" (`design.md:192`), implying canonical-only fields are dropped — but never says so. Meanwhile discovery's success criterion (`discovery.md:76`) says variants are "byte-identical to canonical instructions apart from frontmatter additions and managed markers", which reads as additive-only and could mislead a test author into asserting canonical frontmatter preservation. The design's rebuild-frontmatter approach is defensible; this is artifact-alignment drift, not a design defect.
  - Suggestion: Add one sentence to "Cursor Markdown Codec and Ownership" stating canonical-only frontmatter fields (`version`, `tools`, `color`) are dropped from variants; optionally align the discovery success-criterion wording during closeout.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md` (authoritative requirements, quick mode), `design.md` (artifact under review), `plan.md` and `implementation.md` (scaffolds, context only), plus codebase verification of `packages/cli/src/commands/providers/codex/materialize.ts`, `packages/cli/src/providers/codex/codec/` (incl. `shared.ts`, `sync-extension.ts`), `packages/cli/src/commands/sync/index.ts`, `packages/cli/src/providers/ceiling/registry.ts`, `packages/cli/src/validation/skills.test.ts`, `packages/cli/config/dispatch-matrix-recommendation.json`, `.cursor/agents/` contents, and git history for `c57bdc9d`.

### Requirements Coverage

| Requirement (discovery)                                           | Status  | Notes                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| KD1: frontmatter-only codec, documented syntax only               | covered | Two-identity split with no derivation fallback (`design.md:17`, `:132`); unmapped targets fail with diagnostics (`design.md:180`); flat IDs never emitted.                                                                                                                        |
| KD2: explicit mapping table incl. Composer wrinkle                | partial | Table shape and syntax families defined (`design.md:114-130`); awkward Fable/Grok entries correctly deferred to the lane (`design.md:168`). Composer bracket-explicit rule only implicit and untested as designed — see Medium finding 1. Location unnamed — see Minor finding 1. |
| KD3: verification lane gates every shipped mapping entry          | covered | Lane framed as a release gate, one pinned test agent per syntax family, positive evidence required, ambiguous entries excluded (`design.md:166-170`, `:184`, `:207-209`); distinct from `--list-models` availability.                                                             |
| KD4: multi-family catalogue seeded from proven cloud ladder       | covered | Four syntax families span GPT/Claude/Composer/Grok (`design.md:115-119`); catalogue-broader-than-ladder separation via owner model (`design.md:134`, `:156`); discovery referenced as authoritative for seed contents (`design.md:219`).                                          |
| KD5: bundled recommendation Cursor cells enriched (Grok Balanced) | partial | Only a test bullet (`design.md:202`); no design statement of the JSON update or tier placement. Verified the bundled file is still gpt-only — see Medium finding 2.                                                                                                               |
| KD6: resolver/skill adoption in scope                             | covered | Ceiling adapter `model-arg` → `pinned-variant`, `dispatchArgs.variant`, native-agent-type-first launch, no post-launch model-arg fallback, `c57bdc9d` coordination (`design.md:162-164`). Gap: validation-suite contract not accounted for — see Medium finding 3.                |
| KD7: `configured` provenance, conversation-ID correlation         | covered | `configured` never `verified` (`design.md:164`); runtime identity `not-reported`; `CURSOR_CONVERSATION_ID` as correlation-only evidence; canonical roles gain the conditional report requirement with version bumps (`design.md:150`).                                            |
| Constraint: owner-marker system preserved                         | covered | `supported-catalogue \| user-config \| project-config` throughout (`design.md:15`, `:156`); owner-scoped cleanup boundaries (`design.md:67`, `:182`).                                                                                                                             |
| Constraint: compat-dir name-collision check                       | covered | Checks `.cursor/agents`, `.claude/agents`, Cursor-compatible `.codex/agents` Markdown; Codex TOML stems excluded (`design.md:148`).                                                                                                                                               |
| Constraint: availability probing via `--list-models` pattern      | covered | Doctor compares materialized ladder IDs with the catalogue probe, diagnostic-only (`design.md:158`, `:183`).                                                                                                                                                                      |
| Constraint: five-field schema, no `tools:` field                  | covered | "Five-field-compatible frontmatter" test invariant (`design.md:192`); markers as YAML comments, not schema fields (`design.md:146`). Field-drop policy clarity — see Minor finding 2.                                                                                             |
| Open questions (naming, explicit `name:`)                         | covered | Design settles both: deterministic flat-ID-derived name shared with the resolver (`design.md:65`, `:148`) and explicit normalized `name:` (`design.md:144`).                                                                                                                      |

### Extra Work (not in declared requirements)

None. The provider-neutral extension registry generalization is the chosen Approach A from discovery ("sync/doctor/strays machinery generalized", `discovery.md:39`), not scope creep; the design keeps its contract intentionally narrow (`design.md:108`).

## Verification Commands

Run these to verify the design's codebase claims and, after amendments, the affected surfaces:

```bash
ls packages/cli/src/commands/providers/codex/materialize.ts packages/cli/src/providers/codex/codec/
rg -n "codexExtension" packages/cli/src/commands/sync/index.ts
rg -n "mechanism" packages/cli/src/providers/ceiling/registry.ts
rg -n "providers.cursor.dispatchArgs" packages/cli/src/validation/skills.test.ts
rg -n '"cursor"' -A 30 packages/cli/config/dispatch-matrix-recommendation.json
git log --oneline -1 c57bdc9d
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
