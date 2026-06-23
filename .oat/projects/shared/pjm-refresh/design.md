---
oat_status: complete
oat_ready_for: oat-project-plan
oat_blockers: []
oat_last_updated: 2026-06-23
oat_generated: false
oat_template: false
---

# Design: pjm-refresh

## Overview

The design implements the locked PJM restructure as a set of small CLI,
template, skill, and packaging changes. The architectural theme is simple:
records become independent files with deterministic IDs, while human-facing
indexes become committed generated views that can be regenerated on conflict.

The live source validated the audit's major current-state claims: backlog IDs
still use a hash plus a local scan, `oat pjm init` still writes the active docs
under `reference/`, the PM pack still ships `decision-record.md`, and no
`oat decision` command exists. A few audit documents are stale proposals and are
not followed: this project uses date+slug IDs, committed indexes, and no merge
driver.

## Resolved Design Decisions

| Topic                     | Decision                                                                                                                                          | Rationale                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------ | ----- | ------- | ------------------------------------------------------------------------ |
| Decision index marker     | `<!-- OAT DECISION-INDEX -->` / `<!-- END OAT DECISION-INDEX -->`                                                                                 | Matches the locked prompt and avoids plural/singular drift.                              |
| Decision index columns    | `ID                                                                                                                                               | Date                                                                                     | Status | Title | Legacy` | Shows migrated `legacy_id` values and matches the user's locked columns. |
| Decision index sort       | Date descending, then ID ascending with locale-independent compare                                                                                | Reads newest-first and stays deterministic.                                              |
| Rollout sequence          | Add decision support and deterministic ID/index core before path-flipping active PJM docs                                                         | Existing repos need migration support before defaults move.                              |
| AGENTS ownership          | `oat pjm init` writes `.oat/repo/AGENTS.md`, `pjm/AGENTS.md`, and `reference/AGENTS.md`; `oat sync` does not own them in this project             | Sync currently manages provider views and instruction sections, not arbitrary repo docs. |
| Deep research coupling    | `deep-research` suggests `.oat/repo/reference/research/` when project-level OAT exists, creates on demand, and still honors explicit output paths | Gives a canonical destination without making the research pack depend on PJM enablement. |
| Scoped reference guide    | Use `reference/AGENTS.md`, not `reference/decisions/AGENTS.md`                                                                                    | Decisions are important, but the guide owns all durable reference destinations.          |
| `oat backlog generate-id` | Keep it as a compatibility command, but make it emit date+slug IDs and stop using scan-based allocation                                           | Existing users may call it directly; skills no longer need it for item creation.         |

## Architecture

### System Context

The change sits in the CLI command layer, bundled asset layer, and canonical
skills. The CLI remains the source of executable behavior; skills describe
agent workflows and delegate mechanical writes/regeneration to CLI commands.
Templates seed new repositories and migrations. Public package validation
ensures the shipped npm tarball contains every new asset.

**Key Components:**

- **Shared ID Helpers:** Pure `slugify` and UTC `yymmdd` functions used by
  backlog and decisions.
- **Backlog Command Updates:** Date+slug generation, collision checks, default
  root move, and deterministic index rendering.
- **Decision Command Group:** New command group for decision init, new,
  regenerate, and migrate.
- **PJM Command Updates:** Two-layer initialization, focused doctor checks, and
  current-repo migration orchestration.
- **Asset and Pack Manifests:** Bundle script, PM pack constants, public package
  contract, templates, skills, and migration prompt registration.
- **Skill Rewrites:** PJM and content skills point at the new taxonomy and
  canonical decision flow.

### Component Diagram

```text
CLI commands
  backlog/* ------------+
  decision/* -----------+--> shared slug/date/frontmatter helpers
  pjm/init/doctor/migrate
        |
        v
  .oat/repo/{pjm,reference} records and indexes

Assets and packs
  .agents/skills + .oat/templates + migration prompt
        |
        v
  bundle-assets.sh + PM pack manifest + public package contract
```

### Data Flow

1. A user or skill creates a backlog item or decision.
2. CLI computes `YYMMDD` from the record date and slugifies the title.
3. CLI writes one record file whose filename stem equals `id`.
4. CLI regenerates the relevant committed index from record frontmatter.
5. On merge conflict in an index, the resolver reruns regenerate and stages the
   deterministic output.
6. Migration reads old records, writes new file-per-record records with
   `legacy_id`, regenerates indexes, and retires old files only after checks.

## Component Design

### Shared Helpers

**Purpose:** Centralize deterministic ID primitives.

**Responsibilities:**

- Slugify arbitrary titles to ASCII kebab-case with stable truncation.
- Produce UTC `YYMMDD` strings from ISO strings or Date values.
- Share template-frontmatter stripping between PJM init and decision creation.

**Interfaces:**

```typescript
export function slugify(input: string): string;
export function yymmdd(isoOrDate: string | Date): string;
export function stripTemplateFrontmatter(content: string): string;
```

**Design Decisions:**

- Use UTC, not local time, so two machines produce the same prefix for the same
  instant.
- Return `untitled` for empty slug output rather than throwing; command-layer
  collision handling still protects filenames.

### Backlog Command Updates

**Purpose:** Move backlog IDs and root paths to the new PJM model.

**Responsibilities:**

- Generate `bl-YYMMDD-slug` IDs.
- Check only the candidate `items/<id>.md` and `archived/<id>.md` paths for
  same-filename collisions.
- Regenerate `pjm/backlog/index.md` deterministically.
- Keep `backlog generate-id` available with updated semantics.

**Design Decisions:**

- The happy path performs no full ID scan. Same-day same-slug collision is a
  user-visible disambiguation event.
- Backlog index sort remains priority-first, then title, then ID.

### Decision Command Group

**Purpose:** Make decisions a first-class CLI surface rather than a manual
shared-file edit.

**Responsibilities:**

- Initialize `reference/decisions/index.md`.
- Create new decision records from a per-record template.
- Regenerate the committed decision index.
- Migrate legacy `decision-record.md` into file-per-record decisions.

**Interfaces:**

```text
oat decision init [--decisions-root <path>]
oat decision new <title> [--status <status>] [--context <text>] [--created-at <iso>]
oat decision regenerate [--decisions-root <path>]
oat decision migrate [--reference-root <path>] [--dry-run] [--delete-legacy]
```

**Design Decisions:**

- The canonical regenerate verb is `regenerate`, not `regenerate-index`.
- Migration preserves the decision body and stores old IDs in `legacy_id`.

### PJM Init, Doctor, and Migration

**Purpose:** Own the repo-reference scaffold and health checks.

**Responsibilities:**

- Write the canonical non-negotiable two-layer files.
- Leave research, brainstorms, external-plans, and decks on demand.
- Surface missing or stale PJM structure through doctor checks.
- Provide migration mechanics for the current repo only.

**Design Decisions:**

- `oat pjm init` emits AGENTS docs from templates; it does not hand ownership to
  `oat sync` in this project.
- `oat pjm doctor` shares checks with project-scope `oat doctor` so focused and
  broad health checks do not drift.
- Migration defaults to dry-run for user-facing prompt usage; CLI apply flows
  separate mechanical moves from judgment proposals.

### Skill and Content Destination Updates

**Purpose:** Align agent-authored artifacts with the new taxonomy.

**Responsibilities:**

- `oat-pjm-add-backlog-item` writes to `pjm/backlog/items/`.
- `oat-pjm-update-repo-reference` routes decisions through `oat decision`.
- Lifecycle document/complete skills read the new PJM and decisions paths.
- `oat-brainstorm`, import-plan, and `deep-research` use documented durable
  reference destinations.

**Design Decisions:**

- `oat-project-summary` and `oat-project-pr-final` need audit coverage but no
  decision-routing change unless implementation discovers they create records.
  Live source currently shows they do not.

## Data Models

### Backlog Record

**Purpose:** File-per-item active work record.

**Schema Notes:**

- `id: bl-YYMMDD-slug`
- `legacy_id: null | old-id`
- Existing fields such as `title`, `status`, `priority`, `scope`,
  `scope_estimate`, `labels`, `assignee`, `created`, `updated`, and
  `associated_issues` remain.

**Validation Rules:**

- Filename stem equals `id`.
- New IDs derive from `created` date and title/slug.

### Decision Record

**Purpose:** File-per-record durable decision history.

**Schema Notes:**

- `id: dr-YYMMDD-slug`
- `legacy_id: null | ADR-NNN | DR-NNN`
- `title`
- `date`
- `status: proposed | accepted | superseded`
- Body sections: Context, Decision, Consequences.

**Validation Rules:**

- Filename stem equals `id`.
- `legacy_id` is displayed in the decision index when present.

### Generated Indexes

**Purpose:** Browsable committed views over record files.

**Storage:**

- `pjm/backlog/index.md`
- `reference/decisions/index.md`

**Validation Rules:**

- Managed markers must exist exactly.
- Regeneration preserves surrounding curated prose.
- Output is deterministic from record files.

## API Design

The public API is the CLI command surface. Commander command style and JSON
logging follow existing backlog and PJM commands.

### Decision Command

**Methods:** CLI subcommands.

**Error Handling:**

- Missing managed markers throw actionable errors that name the expected marker
  pair and init command.
- Filename collisions exit with status `1` and include the candidate ID in JSON
  output.
- Migration parser mismatches stop before deleting legacy files.

### PJM Command

**Methods:** CLI subcommands under `oat pjm`.

**Error Handling:**

- Doctor returns exit `2` for fail, `1` for warn, `0` for pass.
- Migration dry-run returns success without writes.
- PJM-disabled repos abort migration with a clear no-op message.

## Security Considerations

No auth or network behavior is introduced. File writes stay inside the current
repository except the project cleanup task, which removes the copied audit
bundle from local temporary/source paths after the project is complete.

Input validation concerns are slug generation, YAML frontmatter parsing, and
migration path safety. Migration must stay inside `.oat/` unless an explicit
judgment move targets a project reference directory.

## Performance Considerations

The new ID generation path is cheaper than the old scan-based path. Index
regeneration remains linear in record count and is acceptable for repo-scale
PJM artifacts. Deterministic sorting should avoid locale-sensitive comparators.

## Error Handling

- User errors use the existing `CliError` or command-local JSON/error-output
  patterns.
- Migration errors stop before destructive operations.
- Doctor checks return structured `DoctorCheck` values.
- Tests should include marker-missing, collision, dry-run, and parser mismatch
  cases.

## Testing Strategy

### Requirement-to-Test Mapping

| ID   | Verification       | Key Scenarios                                           |
| ---- | ------------------ | ------------------------------------------------------- |
| FR1  | unit + integration | slug/date helpers, backlog generate-id, collision guard |
| FR2  | unit + integration | decision init/new/regenerate/migrate, marker errors     |
| FR3  | integration        | fresh PJM init, idempotent rerun, frontmatter stripped  |
| FR4  | unit + integration | doctor pass/fail/warn and shared checks                 |
| FR5  | integration        | migrate dry-run, idempotency, legacy ID preservation    |
| FR6  | grep + review      | no live old paths in skills after rewrites              |
| FR7  | release            | bundle consistency, PM pack install, package contract   |
| NFR1 | unit               | two-run, shuffled readdir, ID tie-break determinism     |
| NFR2 | integration        | no writes on dry-run, no legacy delete on mismatch      |
| NFR3 | unit + integration | `legacy_id` rendered and mapping output                 |
| NFR4 | CI-equivalent      | test, lint, type-check, build, release validate         |

### Unit Tests

- Shared helper tests.
- Backlog generate-id and regenerate-index tests.
- Decision generator, init, regenerate, new, and migrate tests.
- PJM doctor check tests.

### Integration Tests

- Commander help snapshots and command integration.
- PJM init and migrate fixtures.
- PM pack install/update fixtures.
- Bundle consistency and public package contract tests.

### Manual Verification

- `rg` sweeps for stale paths.
- Inspect generated AGENTS docs and migration prompt in bundled assets.

## Deployment Strategy

This is a monorepo CLI release. Deployment consists of committing source and
asset changes, bumping the five lockstep public packages, running release
validation, and opening the project PR.

## Migration Plan

Migration is current-repo only:

1. Dry-run inventory.
2. Move active surfaces into `pjm/`.
3. Re-ID backlog items and preserve `legacy_id`.
4. Split decisions and preserve `legacy_id`.
5. Regenerate indexes.
6. Write AGENTS docs.
7. Propose ad-hoc folder and legacy-file disposition for human confirmation.

There is no fleet command. Users repeat the flow one repo/worktree at a time.

## Implementation Phases

- **Phase 1:** Additive ID, decision, templates, init, and doctor core.
- **Phase 2:** Path move defaults and migration tooling.
- **Phase 3:** Skill and lifecycle destination rewrites.
- **Phase 4:** Polish, docs, release validation, and local audit cleanup.

## Risks and Mitigation

| Risk                                                          | Probability | Impact | Mitigation                                                                      |
| ------------------------------------------------------------- | ----------- | ------ | ------------------------------------------------------------------------------- |
| Hidden old-path references remain                             | High        | Medium | Use scoped `rg` sweeps and update docs/assets where they teach live behavior.   |
| Migration parser drops legacy decision prose                  | Medium      | High   | Preserve body text, count records, and do not delete legacy source on mismatch. |
| Bundle misses a new asset                                     | Medium      | High   | Update bundle script, PM manifest, and package contract tests together.         |
| Scope becomes too large for one unchecked implementation pass | High        | Medium | Use phase-level HiLL checkpoints and stop after each phase for review.          |
