---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-29
oat_generated: false
---

# Specification: agent-provider-root

## Phase Guardrails (Specification)

This specification defines the behavioral contract for portable skill-to-agent
references. It does not select exact helper functions, matcher syntax, or task
ordering; those decisions belong in `design.md` and `plan.md`.

> Revalidation notice: this specification is a starting point, not exhaustive.
> Revalidate its requirements against the current provider matrix, merged
> scope/provider work, and the final implementation surface before planning and
> before implementation.

## Problem Statement

Some canonical OAT skills read canonical agent role instructions through bare
repository-relative `.agents/agents/<name>.md` paths. That works when a
consuming repository has project-scope agent files, but fails silently when the
workflow pack is installed only at user scope. The failure is especially
harmful in fallback paths reached after a native provider role is rejected:
the fallback child can lose the intended role instructions without a clear
error or provenance record.

The shipped portability contract now protects cross-skill reads, but does not
cover the skill-to-agent direction. The missing contract permits new bare
agent reads to land without detection and leaves the user/project candidate
roots duplicated and inconsistently described.

## Goals

### Primary Goals

- Define a provider-portable, canonical-root contract for skills that need to
  read OAT agent role instructions.
- Make every currently executable canonical skill-to-agent reference resolve
  correctly when the owning pack is installed at user scope or project scope.
- Extend the portability ratchet so new bare agent reads fail with precise
  source-to-target evidence.
- Preserve independent dependency binding so one missing pack cannot satisfy a
  different pack's agent dependency.

### Secondary Goals

- Make the distinction between canonical role instructions and provider-native
  agent views explicit in documentation and fallback guidance.
- Reduce duplicated candidate-list concepts where doing so preserves existing
  resolution order and isolation guarantees.

## Non-Goals

- Implementing user-scope provider materialization, provider catalog visibility,
  restart notices, picker truthfulness, or directory-symlink adoption. Those
  belong to `tool-pack-scope-provider-truthfulness` and
  `BL-260829-make-tool-pack-scope-selection`.
- Making provider-transformed agent views interchangeable with canonical
  Markdown role instructions. Codex TOML and provider-specific materialized
  views remain separate representations.
- Removing all direct skill-to-agent reads if a future dispatch-layer project
  replaces that interface. That alternative may be evaluated, but is not
  assumed by this project.
- Broadening provider materialization contract tests beyond the agreed scope
  of this project.

## Requirements

### Functional Requirements

**FR1: Portable canonical agent resolution**

- **Description:** Canonical skills that read an OAT agent role must resolve the
  intended canonical agent file from supported installation tiers rather than
  relying on the consuming repository's current working directory.
- **Acceptance Criteria:**
  - User-scope-only installation resolves the required canonical Markdown role
    instructions.
  - Project-scope installation retains current behavior.
  - Missing or ambiguous roots fail closed with an actionable diagnostic rather
    than silently selecting an unrelated role file.
- **Priority:** P0

**FR2: Explicit tier and representation contract**

- **Description:** The project documents which canonical roots and tiers are
  eligible for agent reads and distinguishes them from provider-native views.
- **Acceptance Criteria:**
  - The eligible user/project order is explicit.
  - Loaded provider directories are either safely excluded or included with a
    representation guarantee; no symmetry is assumed without evidence.
  - The contract explains why canonical Markdown is required by fallback role
    instructions.
- **Priority:** P0

**FR3: Independent dependency binding**

- **Description:** Portable agent resolution preserves dependency isolation for
  skills that consume multiple packs.
- **Acceptance Criteria:**
  - Each dependency can be absent without another dependency's root satisfying
    the read accidentally.
  - Shared root vocabulary, if introduced, does not become a single global
    mutable binding that erases dependency ownership.
  - Tests cover one-present/one-missing dependency combinations.
- **Priority:** P0

**FR4: Ratchet coverage**

- **Description:** The bundled-skill portability checks detect non-portable
  canonical agent references across the shipped skill and agent surface.
- **Acceptance Criteria:**
  - Bare `.agents/agents/` reads and equivalent executable path forms are
    detected with exact source-to-target evidence.
  - A mutation test proves that introducing a new bare read fails the suite.
  - Descriptive-only references may be exempted only with a recorded rationale.
- **Priority:** P0

**FR5: Consumer migration**

- **Description:** The verified executable consumers and any additional live
  consumers found during revalidation use the approved contract.
- **Acceptance Criteria:**
  - The four currently identified executable sites are migrated or explicitly
    exempted: review-provide fallback and template pointer, plan-writing
    fallback, and implement dispatch fallback.
  - The remaining descriptive references are individually classified.
  - No new bare agent reads remain in the ratchet's live surface.
- **Priority:** P1

**FR6: Fallback provenance compatibility**

- **Description:** The portable role-file contract remains usable by generic
  fallback dispatch without implying native-provider equivalence.
- **Acceptance Criteria:**
  - Fallback guidance can identify the canonical role-file path/version.
  - Native-role rejection and generic-child fallback remain separate states.
  - The scope/provider project can reference this contract without owning its
    path-resolution implementation.
- **Priority:** P1

**FR7: Documentation and release integrity**

- **Description:** The contract is documented and shipped consistently with
  OAT's skill/version rules.
- **Acceptance Criteria:**
  - Contributor and tool-pack documentation describe the contract accurately.
  - Every changed canonical skill receives one PR-scoped frontmatter version
    increment.
  - The five lockstep public package versions are advanced when shipped
    assets or CLI behavior change.
- **Priority:** P1

### Non-Functional Requirements

**NFR1: Fail-closed and deterministic resolution**

- **Description:** Resolution must not silently drift to a different role or
  dependency when the expected canonical source is unavailable.
- **Acceptance Criteria:**
  - Candidate order and selected root are observable in focused tests or
    structured diagnostics.
  - Ambiguous, missing, or mismatched roots produce deterministic failure.
- **Priority:** P0

**NFR2: Backward-compatible candidate behavior**

- **Description:** Existing user/project skill resolution continues to work
  while the agent direction is added.
- **Acceptance Criteria:**
  - Existing candidate order remains behaviorally equivalent unless a design
    decision records an intentional change.
  - The portability ratchet retains all existing cross-skill protections.
- **Priority:** P0

**NFR3: Safe, reviewable change surface**

- **Description:** The change remains bounded, auditable, and compatible with
  provider-specific asset formats.
- **Acceptance Criteria:**
  - No provider process is restarted by this project.
  - No user-owned provider directory or canonical asset is overwritten by
    reference resolution.
  - Tests and documentation identify the boundary with the scope/provider
    materialization project.
- **Priority:** P1

## Constraints

- Canonical role instructions are Markdown under OAT-managed roots; provider
  views are not necessarily equivalent representations.
- The existing cross-skill contract uses independent roots per dependency.
- Changes under `.agents/skills` and shipped agent assets require skill
  frontmatter and lockstep public-package version discipline.
- Existing generated provider views and their ownership must remain untouched
  by this reference-only project.

## Dependencies

- `BL-260829-unified-agent-provider-root` (Unified AGENT_PROVIDER_ROOT binding
  for portable skill and agent references) is the backlog authority.
- `tool-pack-scope-provider-truthfulness` owns provider materialization and
  reachability. This project supplies a path contract that it may consume for
  canonical fallback instructions.
- `BL-260724-support-provider-directory` (Support provider directory symlinks
  as full collection sync) owns collection alias safety; this project must not
  reimplement it.
- Merged PR #231 supplies the current cross-skill/agent portability ratchet
  baseline but deliberately leaves bare agent reads unresolved.

## High-Level Design (Proposed)

The preferred direction is a portable agent-root abstraction with canonical
user and project tiers and explicit `/agents` and, where useful, `/skills`
leaves. The abstraction must be bound per consuming dependency, not once as an
unowned global. It should resolve canonical Markdown instructions and never
silently substitute a provider-transformed view.

The portability ratchet will share the same source-of-truth asset inventory as
the existing cross-skill check, while adding agent-read path forms and a
mutation test. Consumer skills will migrate to the approved binding. The
scope/provider project will remain responsible for whether those canonical
assets are materialized into a provider's catalog.

**Key Components:**

- **Canonical agent-root contract:** Defines eligible tiers, candidate order,
  representation, and dependency ownership.
- **Portable-reference ratchet:** Detects live bare agent reads and proves the
  detector with mutation coverage.
- **Canonical skill consumers:** Uses the contract at fallback and role-pointer
  sites.
- **Documentation/release surface:** Documents the boundary and applies skill
  and lockstep version rules.

**Alternatives Considered:**

- **Independent agent-only candidate list:** Smaller change, but preserves
  duplicated root semantics and a third convention.
- **Dispatch-layer role delivery:** Removes direct reads, but is a larger
  behavioral change and should be a separate project if selected.

## Success Metrics

- Zero live executable bare `.agents/agents/` reads in the canonical shipped
  surface after implementation.
- A mutation test fails with exact source-to-target evidence when a bare agent
  read is introduced.
- User-scope-only fallback resolution succeeds for every supported role-file
  consumer without changing provider materialization behavior.
- No regression in existing cross-skill candidate order or independent
  dependency isolation.

## Requirement Index

| ID   | Description                                                     | Priority | Verification                                     | Planned Tasks                    |
| ---- | --------------------------------------------------------------- | -------- | ------------------------------------------------ | -------------------------------- |
| FR1  | Resolve canonical agent files from supported installation tiers | P0       | unit + integration: tier resolution              | To be filled by oat-project-plan |
| FR2  | Document eligible tiers and representations                     | P0       | design + contract: root policy                   | To be filled by oat-project-plan |
| FR3  | Preserve independent dependency binding                         | P0       | unit + integration: missing dependency isolation | To be filled by oat-project-plan |
| FR4  | Detect bare agent reads and prove the ratchet                   | P0       | unit: matcher and mutation test                  | To be filled by oat-project-plan |
| FR5  | Migrate and classify every live consumer                        | P1       | contract + integration: consumer inventory       | To be filled by oat-project-plan |
| FR6  | Preserve fallback role-file provenance compatibility            | P1       | integration: fallback instruction source         | To be filled by oat-project-plan |
| FR7  | Ship documentation and version discipline                       | P1       | release + contract: docs and package gates       | To be filled by oat-project-plan |
| NFR1 | Fail closed deterministically                                   | P0       | unit + integration: missing/ambiguous roots      | To be filled by oat-project-plan |
| NFR2 | Preserve existing portable behavior                             | P0       | regression: existing cross-skill suite           | To be filled by oat-project-plan |
| NFR3 | Keep provider and ownership boundaries safe                     | P1       | integration + manual: boundary checks            | To be filled by oat-project-plan |

## Open Questions

- **Loaded tier:** Can a provider-loaded `agents/` sibling ever be guaranteed to
  contain canonical Markdown, or must agent reads begin at user scope?
- **Binding shape:** Does `${AGENT_PROVIDER_ROOT}` remain the best name, and
  how is it bound independently for multiple consuming packs?
- **Interface direction:** Should skills continue reading role files directly,
  or should a later dispatch-layer interface replace those reads?
- **Cross-project contract:** Which fallback provenance fields belong here versus
  in the scope/provider project, and how will the two projects avoid changing
  the same skill lines in separate PRs?

## Assumptions

- The current nine-site inventory is accurate only for the 2026-08-29 baseline;
  it will be revalidated before plan approval and implementation.
- User-scope and project-scope canonical roots remain the supported resolution
  tiers unless design evidence changes that assumption.
- The scope/provider project will not redefine this project's canonical role-file
  resolution semantics without an explicit cross-project decision.

## Risks

- **Wrong representation selected:** A provider-transformed agent view could be
  mistaken for canonical Markdown. Likelihood: medium. Impact: high.
  Mitigation: make representation eligibility explicit and test it.
- **Dependency isolation regression:** A shared root could allow one installed
  pack to satisfy another pack's read. Likelihood: medium. Impact: high.
  Mitigation: bind roots per dependency and cover missing-pack combinations.
- **Contract churn after PR #231:** The portability contract was just expanded.
  Likelihood: medium. Impact: medium. Mitigation: preserve existing candidate
  behavior and use focused migration/version gates.
- **Scope collision with provider work:** Both projects touch agent-related
  fallback behavior. Likelihood: medium. Impact: medium. Mitigation: keep
  materialization/catalog ownership in the scope/provider project and record
  the integration boundary in both plans.

## References

- Discovery: `discovery.md`
- Design: `design.md`
- Backlog: `../../../repo/pjm/backlog/items/BL-260829-unified-agent-provider-root.md`
- Related project: `../tool-pack-scope-provider-truthfulness/`
- Knowledge Base: `.oat/repo/knowledge/project-index.md`
