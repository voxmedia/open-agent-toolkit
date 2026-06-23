---
oat_status: complete
oat_ready_for: oat-project-design
oat_blockers: []
oat_last_updated: 2026-06-23
oat_generated: false
oat_template: false
---

# Specification: pjm-refresh

## Problem Statement

OAT's current project-management repo-reference layer is not safe enough for
concurrent worktrees or the user's two-machine workflow. It relies on shared
files for decisions, roadmap, current state, and generated indexes, and it mints
some identifiers from only the files visible in the current checkout. A sibling
branch can create conflicting IDs or rewrite the same aggregate region without
either branch seeing the other.

The project must restructure PJM into a two-layer `.oat/repo/` taxonomy, move
active operational docs out of `reference/`, introduce file-per-record
decisions, use allocator-free date+slug IDs, and provide deterministic
regenerate-on-conflict behavior for committed indexes.

The audit copied from the laptop is directional evidence, not current source of
truth. Implementation must validate each claim against the live repo and current
OAT conventions.

## Goals

### Primary Goals

- Establish `pjm/` as the active operational layer and keep durable references
  under `reference/`.
- Replace new backlog and decision IDs with `bl-YYMMDD-slug` and
  `dr-YYMMDD-slug`.
- Add a canonical `oat decision` command group and `oat-pjm-decision` skill.
- Make backlog and decision index regeneration deterministic and safe for merge
  conflict resolution.
- Ship migration tooling and a bundled migration prompt for one repo at a time.
- Repoint PJM and lifecycle skills to the new paths and decision flow.
- Register all new shipped assets and satisfy public package release policy.

### Secondary Goals

- Improve `current-state.md` and `roadmap.md` templates with anti-conflict
  conventions.
- Refresh docs that would otherwise teach the old PJM layout.
- Retire legacy decision-record/backlog guidance where it is no longer live
  behavior.

## Non-Goals

- No Linear bridge.
- No fleet-wide migration command.
- No `verge-mobile-app` re-home.
- No restructuring of `knowledge/`, `analysis/`, or `reviews/`.
- No merge driver or gitignored index strategy for the new indexes.

## Requirements

### Functional Requirements

**FR1: Date+Slug Identifier Core**

- **Description:** Provide shared deterministic slug/date helpers and use them
  for new backlog and decision IDs.
- **Acceptance Criteria:**
  - Backlog IDs render as `bl-YYMMDD-slug`.
  - Decision IDs render as `dr-YYMMDD-slug`.
  - ID generation performs no scan, counter, hash, random, or nonce operation.
  - Existing collision handling reports same-day same-slug filename collisions.
- **Priority:** P0

**FR2: Decision Command Group**

- **Description:** Add `oat decision` with init, new, regenerate, and migrate
  flows for file-per-record decisions.
- **Acceptance Criteria:**
  - New records land in `reference/decisions/<dr-YYMMDD-slug>.md`.
  - `reference/decisions/index.md` uses the locked marker and columns.
  - Migration preserves old ADR/DR IDs as `legacy_id`.
  - `oat decision migrate --dry-run` writes nothing.
- **Priority:** P0

**FR3: Two-Layer PJM Scaffold**

- **Description:** Update `oat pjm init` and related resolvers so active PJM
  state lives under `pjm/` while durable references stay under `reference/`.
- **Acceptance Criteria:**
  - Fresh PJM init creates the canonical non-negotiable set.
  - Instantiated files have template frontmatter stripped.
  - On-demand folders are not pre-created.
  - The three AGENTS guide templates are emitted and bundled.
- **Priority:** P0

**FR4: PJM Doctor Checks**

- **Description:** Extend project doctor checks and expose `oat pjm doctor`.
- **Acceptance Criteria:**
  - Missing canonical PJM files fail when PJM is enabled.
  - Unstripped `oat_template` frontmatter fails.
  - Unknown top-level folders, loose reference files, second roadmaps, and
    legacy monoliths warn.
  - `oat doctor` and `oat pjm doctor` share check functions.
- **Priority:** P0

**FR5: Current-Repo Migration**

- **Description:** Ship `oat pjm migrate` plus a bundled agent-runnable prompt
  for one current repo at a time.
- **Acceptance Criteria:**
  - PJM-disabled repos abort as no-op.
  - Dry-run produces inventory and proposals without writes.
  - Mechanical steps move active docs, re-ID backlog items, split decisions,
    regenerate indexes, and write AGENTS docs.
  - Judgment moves require confirmation or explicit apply flags.
- **Priority:** P0

**FR6: Skill and Lifecycle Repointing**

- **Description:** Update PJM, lifecycle, brainstorm, import-plan, and research
  skills to use the new taxonomy and canonical decision path.
- **Acceptance Criteria:**
  - Live PJM skills no longer write live state to `reference/backlog`,
    `reference/roadmap`, or `reference/current-state`.
  - Decision creation routes through `oat decision new`.
  - `deep-research` defaults to `reference/research/` for project-level OAT.
  - `oat-brainstorm` saved docs route to `reference/brainstorms/`.
- **Priority:** P0

**FR7: Shipping and Release Contract**

- **Description:** Ensure npm consumers receive all new assets and the release
  guardrails pass.
- **Acceptance Criteria:**
  - Bundle arrays include new skills, templates, AGENTS docs, and migration
    prompt assets.
  - PM pack manifest includes the new decision skill/template set.
  - Public package contract tests cover new assets.
  - All five public packages receive the lockstep version bump.
- **Priority:** P0

### Non-Functional Requirements

**NFR1: Deterministic Regeneration**

- **Description:** Index regenerators must be byte-identical from the same
  record set across machines and filesystem ordering.
- **Acceptance Criteria:**
  - Sorts use locale-independent comparisons.
  - Equal sort keys tie-break by ID.
  - Tests cover two runs, shuffled readdir order, and tie-break behavior.
- **Priority:** P0

**NFR2: Migration Safety**

- **Description:** Migration must preserve user content and be repeatable.
- **Acceptance Criteria:**
  - Dry-run is a clean no-op.
  - Body prose is preserved when splitting decisions.
  - Legacy source files are retired only after count/content verification.
  - Already-migrated repos short-circuit unless forced.
- **Priority:** P0

**NFR3: Backward Reference Preservation**

- **Description:** Migrated records must retain inbound references to old IDs.
- **Acceptance Criteria:**
  - Migrated backlog and decision records include `legacy_id`.
  - Decision index displays legacy IDs.
  - Migration reports old-to-new mappings.
- **Priority:** P1

**NFR4: Release Quality**

- **Description:** The project must keep the existing test/build/release quality
  bar.
- **Acceptance Criteria:**
  - Focused unit/integration tests pass during development.
  - Final `pnpm test`, `pnpm lint`, `pnpm type-check`, `pnpm build`, and
    `pnpm release:validate` pass or failures are reported with evidence.
- **Priority:** P0

## Constraints

- Use existing TypeScript ESM, Commander, Vitest, and alias conventions.
- Use same-directory relative imports only within a directory; use configured
  aliases for cross-directory imports.
- Keep `.oat/templates/*` and bundled template assets synchronized.
- Version bump every changed skill frontmatter once in the final PR diff.
- Remove `/Users/tstang/code/oat-audit` and `/tmp/oat-audit` after project
  completion.

## Dependencies

- Existing backlog command and tests.
- Existing PJM init command and tests.
- Existing doctor command result model.
- Existing pack install and bundle consistency tests.
- Existing release validation contract.
- Existing OAT lifecycle skills and templates.

## High-Level Design (Proposed)

Build the restructure as an additive-first migration. First add shared
identifier helpers, deterministic index behavior, and a new decision command
surface. Then update PJM initialization, doctor checks, and migration tooling.
Only after migration support exists should live path defaults move from
`reference/` to `pjm/`.

**Key Components:**

- Identifier helpers - shared slug and UTC date prefix logic.
- Backlog command updates - new ID scheme, collision guard, deterministic
  index rendering, and later default root move.
- Decision command group - init, new, regenerate, migrate.
- PJM command updates - two-layer init, focused doctor, current-repo migrate.
- Skill/template updates - new destinations and canonical decision flow.
- Shipping updates - bundle arrays, pack manifest, public package contract,
  docs, and lockstep versions.

**Alternatives Considered:**

- External tracker bridge - rejected as out of scope and incomplete for
  decisions/current-state.
- Merge drivers or gitignored indexes - rejected by locked design.
- Sequential or hash-based new decision IDs - rejected because they preserve
  allocator/partial-view risks.

## Success Metrics

- `rg` sweeps find no live path references to old operational locations outside
  documented legacy/migration contexts.
- New command help snapshots include `oat decision`, `oat pjm doctor`, and
  `oat pjm migrate`.
- Determinism tests prove byte-identical index regeneration.
- Migration tests prove dry-run no-op and legacy ID preservation.
- Release validation passes after assets and versions are updated.

## Requirement Index

| ID   | Description                                           | Priority | Verification                                                   | Planned Tasks             |
| ---- | ----------------------------------------------------- | -------- | -------------------------------------------------------------- | ------------------------- |
| FR1  | Date+slug ID helpers and backlog ID rewrite           | P0       | unit + integration: ID helpers and backlog generate-id command | p01-t01, p01-t02          |
| FR2  | Decision command group with file-per-record decisions | P0       | unit + integration: decision init/new/regenerate/migrate       | p01-t03, p01-t04, p01-t05 |
| FR3  | Two-layer PJM scaffold                                | P0       | integration: `oat pjm init` output paths                       | p01-t05, p02-t01          |
| FR4  | PJM doctor checks                                     | P0       | unit + integration: pass/fail/warn doctor cases                | p01-t05                   |
| FR5  | Current-repo migration                                | P0       | unit + integration: dry-run/apply migration fixtures           | p01-t04, p02-t02          |
| FR6  | Skill and lifecycle repointing                        | P0       | grep + review: live skills target new paths                    | p03-t01, p03-t02, p03-t03 |
| FR7  | Shipping and release contract                         | P0       | release: bundle consistency and `pnpm release:validate`        | p02-t03, p04-t02          |
| NFR1 | Deterministic regeneration                            | P0       | unit: two-run, shuffled-readdir, tie-break tests               | p01-t02, p01-t03          |
| NFR2 | Migration safety and idempotency                      | P0       | integration: dry-run/no-loss/re-run tests                      | p01-t04, p02-t02          |
| NFR3 | Legacy reference preservation                         | P1       | unit + integration: `legacy_id` and mapping output             | p01-t04, p02-t02          |
| NFR4 | Release quality                                       | P0       | CI-equivalent: test/lint/type-check/build/release validate     | p02-t03, p04-t02, p04-t03 |

## Open Questions

- None blocking. Design records the resolved choices for the audit critique.

## Assumptions

- Existing docs references to old paths should be updated when they teach active
  PJM behavior, but migration/legacy references may remain explicit.
- `archive.summaryExportPath` remains under `reference/project-summaries/`.
- `oat-wrap-up` remains under `reference/wrap-ups/` unless a later project moves
  it.

## Risks

- **Release Churn:** Many shipped assets change together.
  - **Likelihood:** High
  - **Impact:** High
  - **Mitigation:** Keep bundle tests, package contract tests, and release
    validation in the plan.
- **Migration Parser Gaps:** Legacy decision formats vary across repos.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Dry-run, mapping output, count verification, and body
    preservation tests.

## References

- Discovery: `discovery.md`
- Audit bundle: `/Users/tstang/code/oat-audit/`
- Knowledge Base: `.oat/repo/knowledge/project-index.md`
