---
oat_status: complete
oat_ready_for: oat-project-design
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
error or recovery path.

The shipped portability contract protects cross-skill reads but not the
skill-to-agent direction. The missing contract permits new bare agent reads to
land without detection and leaves skills without a provider-aware local
binding for canonical Markdown role instructions. Provider-native role
resolution is already owned by sync, materialization, and each provider's
runtime; this project concerns only canonical files read directly by skills.

## Goals

### Primary Goals

- Define a provider-aware local root-binding contract for skills that need to
  read canonical OAT agent role instructions.
- Make every currently executable canonical skill-to-agent reference resolve
  correctly when the owning pack is installed at user scope or project scope.
- Admit a loaded provider root only when the exact unsuffixed role target is
  proven to be the same-scope canonical Markdown file.
- Extend the portability ratchet so new bare agent reads fail with precise
  source-to-target evidence.
- Preserve independent dependency binding so one missing pack cannot satisfy a
  different pack's agent dependency.

### Secondary Goals

- Make the distinction between canonical role instructions and provider-native
  agent views explicit in documentation and fallback guidance.
- Centralize portable skill/agent target matching without weakening the
  existing manifest-derived and every-canonical-agent scans.

## Non-Goals

- Implementing user-scope provider materialization, provider catalog visibility,
  restart notices, picker truthfulness, or directory-symlink adoption. Those
  belong to `tool-pack-scope-provider-truthfulness` and
  `BL-260829-make-tool-pack-scope-selection`.
- Making provider-transformed agent views interchangeable with canonical
  Markdown role instructions. Codex TOML and provider-specific materialized
  views remain separate representations.
- Adding a CLI command or runtime resolver for provider-native agent files.
  Providers already consume their synchronized or materialized views; the
  neighboring scope/provider project owns reachability diagnostics.
- Removing direct canonical role reads from bounded fallback and
  source-of-truth paths. A broader dispatch-layer role-delivery API is a
  separate project.
- Broadening provider materialization contract tests beyond the agreed scope
  of this project.

## Requirements

### Functional Requirements

#### FR1: Provider-aware local root binding

- **Description:** A canonical skill that reads an OAT agent role binds a local
  `${AGENT_PROVIDER_ROOT}` for its consuming dependency or owning pack instead
  of relying on the current working directory.
- **Acceptance Criteria:**
  - The binding is authored and local to the consumer; it is not a process
    environment variable, ambient singleton, or global mutable value.
  - A loaded skill derives its first candidate from `${SKILL_DIR}/../..`.
  - Unconditional fallback candidates are `${HOME}/.agents` and then
    `<repo-root>/.agents`.
  - User-scope-only and project-scope-only installations both resolve the
    required canonical Markdown role instructions.
- **Priority:** P0

#### FR2: Exact loaded-target eligibility

- **Description:** A loaded provider root is eligible only when the exact
  unsuffixed role target is proven to be the same-scope canonical Markdown
  source.
- **Acceptance Criteria:**
  - The requested target is exactly `/agents/<canonical-name>.md`; suffixed
    model/effort variants and other role names are never candidates.
  - The target is either the same-scope
    `.agents/agents/<canonical-name>.md` file itself or a symlink whose realpath
    is exactly that file.
  - A byte-identical provider copy, a broken or escaping symlink, transformed
    content, and `.codex/agents/*.toml` are candidate misses.
  - The contract is independent of whether `${SKILL_DIR}` is reported as a
    logical provider path or an already-resolved canonical path.
- **Priority:** P0

#### FR3: Independent dependency binding

- **Description:** Portable agent resolution preserves dependency isolation for
  skills that consume multiple packs.
- **Acceptance Criteria:**
  - Each dependency can be absent without another dependency's root satisfying
    the read accidentally.
  - The literal `${AGENT_PROVIDER_ROOT}` is used only when one owning pack is
    in play; simultaneous independent roots use descriptive dependency- or
    pack-qualified binding names.
  - Each binding probes and validates its own required target before use.
  - Tests cover one-present/one-missing dependency combinations in both
    directions.
- **Priority:** P0

#### FR4: Typed ratchet coverage

- **Description:** One shared lexical classifier identifies typed portable
  asset targets (`skill` and `agent`) across the shipped Markdown surface.
- **Acceptance Criteria:**
  - Agent matching detects `.agents/agents/<name>.md`, dot-relative variants,
    and repeated-parent canonical `agents/<name>.md` hops.
  - Matching excludes `${AGENT_PROVIDER_ROOT}/agents/...`, canonical
    `${HOME}`/repo-root spellings, legitimate `.claude`/`.cursor` provider-view
    examples, suffixed variants, `.codex/agents/*.toml`, and unanchored prose.
  - A mutation test proves that introducing a new bare read fails the suite.
  - Agent findings have a zero-executable baseline; the existing six-entry
    historical cross-skill baseline remains byte-for-byte unchanged.
  - The manifest-derived user-default scan and every-canonical-agent scan call
    the same parser rather than maintaining divergent regular expressions.
- **Priority:** P0

#### FR5: Consumer migration

- **Description:** The verified executable consumers and any additional live
  consumers found during revalidation use the approved contract.
- **Acceptance Criteria:**
  - The five role-file spellings across the four mandatory executable sites
    are migrated: review-provide fallback and template pointer, plan-writing
    fallback, and both implement dispatch fallback roles.
  - The two remote-review source-of-truth pointers are treated as live reads
    and migrated.
  - The two `skeptic` Claude/Cursor synchronization descriptions remain
    explicitly classified examples after revalidation.
  - Other provider-view examples remain descriptive and are not treated as
    canonical-file reads.
  - No new bare agent reads remain in the ratchet's live surface.
- **Priority:** P1

#### FR6: Candidate miss and recovery behavior

- **Description:** Candidate evaluation is ordered, continues past an invalid
  loaded view, and fails closed before fallback dispatch when no canonical role
  file resolves.
- **Acceptance Criteria:**
  - A missing, broken, escaping, transformed, or otherwise noncanonical loaded
    target continues to the user and project canonical roots.
  - When multiple tiers are valid, documented precedence selects the first;
    their coexistence is not an ambiguity error.
  - If all candidates miss, the consumer stops before fresh-child fallback and
    reports `oat tools install workflows --scope <user|project>` and
    `oat tools update --pack workflows --scope <user|project>` recovery for the
    intended scope.
  - Direct canonical reads remain available without implying that generic
    fallback is native-provider role selection.
- **Priority:** P1

#### FR7: Documentation and release integrity

- **Description:** The contract is documented and shipped consistently with
  OAT's skill/version rules.
- **Acceptance Criteria:**
  - Contributor and tool-pack documentation describe the local binding,
    canonical/provider boundary, and recovery contract accurately.
  - Every changed canonical skill receives one PR-scoped frontmatter version
    increment.
  - The five lockstep public package versions are advanced when shipped
    assets or CLI behavior change.
- **Priority:** P1

### Non-Functional Requirements

#### NFR1: Fail-closed and deterministic resolution

- **Description:** Resolution must not silently drift to a transformed view,
  different role, or unrelated dependency when the expected canonical source
  is unavailable.
- **Acceptance Criteria:**
  - Candidate order, miss behavior, and selected root are observable in
    focused contract tests.
  - Missing or mismatched roots produce deterministic failure only after every
    eligible candidate is checked.
- **Priority:** P0

#### NFR2: Backward-compatible portable behavior

- **Description:** Existing user/project skill resolution continues to work
  while the agent direction is added.
- **Acceptance Criteria:**
  - Existing portable skill-root candidate order remains behaviorally
    equivalent.
  - The portability ratchet retains all existing cross-skill protections.
- **Priority:** P0

#### NFR3: Safe, reviewable change surface

- **Description:** The change remains bounded, auditable, and compatible with
  provider-specific asset formats.
- **Acceptance Criteria:**
  - No provider process is restarted by this project.
  - No user-owned provider directory or canonical asset is overwritten by
    reference resolution.
  - No new runtime resolver, persistence model, or provider-selection API is
    introduced.
  - Tests and documentation identify the boundary with the scope/provider
    materialization project.
- **Priority:** P1

## Constraints

- Canonical role instructions are Markdown under OAT-managed roots. Loaded
  provider views are eligible only through exact-target validation; provider
  representation alone is never sufficient.
- The existing cross-skill contract uses independent roots per dependency.
- `${AGENT_PROVIDER_ROOT}` is binding notation inside authored instructions,
  not a request for a globally exported environment variable.
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

The confirmed direction is an authored, provider-aware local root binding with
explicit `/agents` and, where useful, `/skills` leaves. Each loaded skill starts
with `${SKILL_DIR}/../..`, then tries `${HOME}/.agents`, then
`<repo-root>/.agents`. The loaded target is admitted only when the exact
unsuffixed Markdown path is the same-scope canonical file or resolves to it as
a symlink. Any other loaded representation is a miss, not a terminal error.

Bindings are created independently for each dependency or owning pack. The
literal `${AGENT_PROVIDER_ROOT}` is used when only one owner is involved;
descriptive qualified names preserve isolation when a consumer needs more than
one root. If all candidates miss, the skill reports workflows-pack recovery and
stops before fresh-child fallback.

The portability ratchet will use one typed lexical parser for skill and agent
targets while retaining both the manifest-derived user-default scan and the
every-canonical-agent scan. Consumer skills will migrate the verified live
reads; provider-view examples remain classified prose. Provider runtimes keep
using their existing sync/materialization contracts.

**Key Components:**

- **Local root-binding contract:** Defines candidate order, exact loaded-target
  eligibility, miss/recovery behavior, and dependency ownership.
- **Portable-reference ratchet:** Detects live bare agent reads and proves the
  detector with typed matching and mutation coverage.
- **Canonical skill consumers:** Uses the contract at fallback and role-pointer
  sites.
- **Documentation/release surface:** Documents the boundary and applies skill
  and lockstep version rules.

**Alternatives Considered:**

- **Runtime CLI resolver:** Centralizes path selection but adds provider
  detection, API, and persistence surfaces that direct canonical reads do not
  require.
- **Independent agent-only candidate list:** Smaller change, but preserves
  duplicated root semantics and a third convention.
- **Dispatch-layer role delivery:** Removes direct reads but changes the
  behavioral API and remains outside this repair.

## Success Metrics

- Zero live executable bare `.agents/agents/` reads in the canonical shipped
  surface after implementation.
- A mutation test fails with exact source-to-target evidence when a bare agent
  read is introduced.
- Loaded Claude/Cursor canonical symlinks and Codex native `.agents` roots pass
  exact-target validation; Cursor variants, Codex TOML, and broken/escaping
  links miss and continue to canonical fallbacks.
- User-scope-only fallback resolution succeeds for every migrated role-file
  consumer without changing provider materialization behavior.
- No regression in existing cross-skill candidate order or independent
  dependency isolation.

## Requirement Index

| ID   | Description                                         | Priority | Verification                                | Planned Tasks             |
| ---- | --------------------------------------------------- | -------- | ------------------------------------------- | ------------------------- |
| FR1  | Bind a provider-aware local canonical root          | P0       | integration: three-candidate ordering       | p01-t02, p02-t01..p02-t03 |
| FR2  | Admit only exact canonical loaded targets           | P0       | integration: provider-layout target checks  | p01-t02                   |
| FR3  | Preserve independent dependency binding             | P0       | unit: missing dependency isolation          | p01-t02, p02-t01..p02-t03 |
| FR4  | Detect typed bare agent reads and prove the ratchet | P0       | unit: matcher and mutation evidence         | p01-t01, p02-t04, p03-t02 |
| FR5  | Migrate and classify every live consumer            | P1       | manual: complete consumer inventory         | p02-t01..p02-t04          |
| FR6  | Continue on misses and fail closed with recovery    | P1       | integration: fallback and recovery contract | p01-t02, p02-t01..p02-t03 |
| FR7  | Ship documentation and version discipline           | P1       | manual: docs, skill, and package gates      | p03-t01, p03-t02          |
| NFR1 | Resolve deterministically and fail closed           | P0       | integration: invalid and missing candidates | p01-t02, p02-t01..p02-t04 |
| NFR2 | Preserve existing portable behavior                 | P0       | unit: existing cross-skill contract suite   | p01-t01, p02-t04, p03-t02 |
| NFR3 | Keep provider and ownership boundaries safe         | P1       | manual: no provider mutation or runtime API | p02-t03, p03-t01, p03-t02 |

## Resolved Design Decisions

- Include a loaded provider-root candidate, guarded by exact same-scope
  canonical-target validation.
- Treat `${AGENT_PROVIDER_ROOT}` as a local authored binding and qualify names
  when multiple independent roots coexist.
- Keep direct canonical role reads for the bounded fallback and source-of-truth
  paths in this project.
- Keep provider sync, native-role selection, reachability diagnostics, and
  fallback provenance envelopes in their existing owning surfaces.
- Centralize one typed parser while retaining both the user-default and
  every-canonical-agent scans.

## Assumptions

- The current nine-site inventory is accurate only for the 2026-08-29 baseline;
  it will be revalidated before plan approval and implementation.
- `${SKILL_DIR}` identifies the loaded skill directory either logically or
  after symlink resolution; exact-target validation makes both representations
  safe.
- The scope/provider project will not redefine this project's canonical role-file
  resolution semantics without an explicit cross-project decision.

## Risks

- **Wrong representation selected:** A provider-transformed agent view could be
  mistaken for canonical Markdown. Likelihood: medium. Impact: high.
  Mitigation: require exact same-scope canonical-file identity rather than
  extension, naming, or byte-equivalence alone.
- **Dependency isolation regression:** A shared root could allow one installed
  pack to satisfy another pack's read. Likelihood: medium. Impact: high.
  Mitigation: bind roots per dependency and cover missing-pack combinations.
- **Contract churn after PR #231:** The portability contract was just expanded.
  Likelihood: medium. Impact: medium. Mitigation: preserve the existing
  skill-root candidate order and historical baseline while adding the agent
  target type independently.
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
