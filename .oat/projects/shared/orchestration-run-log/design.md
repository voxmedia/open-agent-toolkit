---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-13
oat_generated: false
oat_template: false
oat_template_name: design
---

# Design: orchestration-run-log

## Overview

This feature adds a first-class, opt-in, append-only per-project log — `project-log.md` — that captures operational observations (bugs, friction, worked-wells, feedback) and structural lifecycle events (dispatch stamps, gate results, seal entries) during a project's execution, then rolls the durable essence up into tracked surfaces before `oat-project-complete` seals the log into the gitignored archive.

The architectural centerpiece is a new CLI command group, `oat project log`, that owns every write to the artifact. Skills never hand-author entries; they call `oat project log append` with flag-structured input, and the helper owns config resolution (`workflow.projectLog: true | false | auto`, default `auto`), create-on-first-append semantics, taxonomy validation, heading-grammar composition, and append-only discipline. This concentrates the entry contract in one tested implementation and makes the helper's `--help` output the self-teaching contract surface: flags document what belongs in each field, so any agent that can run `--help` can append correctly without external docs.

v1 integrates the core trio — `oat-project-implement` (dispatch/STOP/park/phase-outcome entries via prose instruction), `oat gate review` (one structural line per run, appended internally from code), and the completion path (`oat-project-summary` roll-up + `oat-project-complete` synthesis check and seal). Coverage widens via tracked fast-follows (`BL-260713-root-agent-judgment-logging`, then receive/bootstrap/plan appenders). The hard ordering constraint throughout: roll-up happens strictly before archive seal, because the archive is typically gitignored and anything not rolled up is lost to the repo.

## Architecture

### System Context

The feature touches four existing surfaces and adds one new one:

**Key Components:**

- **`oat project log` command group (new):** `packages/cli/src/commands/project/log/` — `append` and `check` subcommands. Single write-owner for the artifact.
- **Artifact template (new):** `.oat/templates/project-log.md` — header logging contract + entries region + pending synthesis section. Bundled asset (ships with CLI).
- **Config key (new):** `workflow.projectLog: true | false | auto` (default `auto`; local > shared > user precedence via the existing layered-config resolver) and `workflow.projectLogLedgerPath` (default `.oat/repo/reference/project-observations.md`).
- **Scaffold integration:** `oat project new` gains `--with-project-log` / `--no-project-log` overrides; under `true` config, scaffolds the log up front.
- **Lifecycle integrations (v1):** `oat-project-implement` (prose), `oat gate review` (code), `oat-project-summary` (prose), `oat-project-complete` (prose).

### Component Diagram

```
                         workflow.projectLog (config: true|false|auto)
                                        │ resolved by
                                        ▼
  oat-project-implement ──prose──▶ ┌──────────────────────┐
  (dispatch/STOP/phase entries)    │  oat project log     │──creates/appends──▶ project-log.md
  oat gate review ────────code──▶  │  append | check      │        │ (header = contract,
  (per-run structural line)        └──────────────────────┘        │  append-only entries,
  agents (judgment entries) ──────────────▲                        │  synthesis section)
                                self-teaching --help                │
                                                                    ▼ read at completion
  oat-project-summary ──reads log──▶ summary.md "## Workflow Observations"
        │                        └──▶ ledger append (workflow.projectLogLedgerPath)
        │                        └──▶ backlog graduation (oat-pjm-add-backlog-item)
        ▼ then, and only then
  oat-project-complete ──`log check`──▶ synthesis-pending warning ──▶ archive seal
```

### Data Flow

1. A lifecycle skill (or the gate command internally) reaches an append point and invokes `oat project log append` with flags.
2. The helper resolves `workflow.projectLog`: `false` → silent no-op (exit 0, JSON notes `skipped`); `auto` + no log → create `project-log.md` from the bundled template, then append; `true`/existing log → append.
3. The helper composes the heading from validated flag values and appends the entry chronologically under `## Entries`. It never edits or deletes prior content.
4. At completion, `oat-project-summary` reads the log, emits `## Workflow Observations` into `summary.md`, appends `general`-scoped and graduated entries to the repo ledger (dedup by date + area), and routes follow-up entries through the backlog flow.
5. `oat-project-complete` runs `oat project log check --json`; a pending synthesis surfaces as a completion warning. After roll-up confirms, complete appends the seal entry and archives.

## Component Design

### `oat project log append`

**Purpose:** The only writer of `project-log.md`. Validates, composes, creates-on-first-append, appends.

**Interfaces:**

```
# Judgment entry (agent-authored observation)
oat project log append \
  --type <bug|friction|worked-well|feedback> \
  --scope <project|general> \
  --area "<short area, e.g. 'gate review exit code'>" \
  --body "<1-3 sentences: what happened; impact/workaround; follow-up>" \
  [--project <path>] [--json]

# Structural entry (mechanical mirror of skill/command output)
oat project log append --structural \
  --producer <skill-or-command, e.g. oat-project-implement> \
  --ref <phase/scope, e.g. p02> \
  --body "<one-liner; reference artifacts by path, never inline>" \
  [--project <path>] [--json]
```

Produced headings (the machine-parseable grammar; dates in UTC):

```
### YYYY-MM-DD · <project|general> · <bug|friction|worked-well|feedback> · <area>
### YYYY-MM-DD · structural · <producer> · <ref>
```

**Responsibilities & behavior:**

- Project resolution: `--project` explicit, else active project. No project → error.
- Config gate: `false` → no-op success (`{"status":"skipped","reason":"projectLog=false"}`); `auto`/`true` per Data Flow above. An existing artifact always accepts appends regardless of config (artifact presence wins — matches "absent artifact = off; present = on").
- Flag validation is the taxonomy enforcement: invalid `--type`/`--scope` values are rejected with the allowed set. `--area` is free-text but length-capped (single line). `--body` accepts stdin (`--body -`) for longer judgment text; guidance (not enforcement) keeps it to 1–3 sentences.
- Version stamping: `--version-note "<text>"` optional flag appends a trailing `(observed on <text>)` clause — the help text instructs using it for anything tool-related.
- The helper writes canonically formatted markdown by construction (deterministic entry shape, single trailing newline). It does **not** invoke the consuming repo's format command — that stays with the agent's hygiene contract (see `agent-artifact-hygiene-contract` project) at commit time; the helper's deterministic output is designed to be format-stable under oxfmt/prettier defaults.
- `--help` text carries the entry contract: log-worthiness triggers (breaks, surprises, workarounds, notable successes), "evidence not narrative," `worked-well` as the do-not-regress evidence base, reference-artifacts-by-path rule, version-stamping guidance, and the strike-through correction convention (corrections are a new judgment entry noting the correction; the helper never edits prior entries).

**Design Decisions:**

- One subcommand with `--structural` as the class switch (not two subcommands): keeps the help text unified — an agent reading `append --help` sees both entry classes and the whole contract in one place.
- Create-on-first-append under `auto` implements the dispatch-count trigger without any runtime counting: log existence is caused by the first append attempt, which in v1 coincides with the first OAT-performed dispatch.

### `oat project log check`

**Purpose:** Read-only status probe used by `oat-project-complete` (synthesis warning), `oat-project-summary` (anything to roll up?), and humans.

**Interfaces:**

```
oat project log check [--project <path>] [--require-synthesis] [--json]
```

JSON envelope (consistent with other oat `--json` commands):

```typescript
interface ProjectLogCheckResult {
  status: 'ok' | 'absent' | 'synthesis_pending';
  logPath: string | null;
  entryCounts: {
    structural: number;
    judgment: Record<'bug' | 'friction' | 'worked-well' | 'feedback', number>;
  };
  scopeCounts: { project: number; general: number };
  lastEntryDate: string | null; // YYYY-MM-DD
  synthesisPending: boolean;
  grammarViolations: string[]; // headings that fail the entry grammar (hand-written entries)
}
```

**Behavior:** exit 0 in all normal cases; `--require-synthesis` makes `synthesis_pending` exit 1 (mechanical enforcement hook — not used by v1 skills, which warn rather than block, but available for stricter gate configs). Synthesis detection keys on the template's synthesis section marker. Grammar validation applies the heading regex to `###` lines under `## Entries` and reports (never rejects) violations.

### Artifact template (`.oat/templates/project-log.md`)

**Purpose:** Header-is-the-contract artifact seed, generalized from the operator's template (`03-run-log-template.md`) with the framing broadened from orchestration-specific to general project observations.

**Structure (summary — full text authored at implementation from the operator's template):**

1. Frontmatter: `oat_generated: false`, `oat_template_name: project-log`, `purpose: project-observations`, `oat_last_updated`.
2. Title + two-audience purpose statement (this project's execution; general workflow/tooling feedback).
3. **Logging contract** paragraph: when to append, never delete (strike-through + correction note), version-stamp tool observations, evidence-not-narrative, entries via `oat project log append` (pointing at `--help` for the contract), reference artifacts by path.
4. Entry format block showing both heading grammars.
5. `## Entries` (chronological, append-only).
6. `## End-of-run synthesis (pending — do not skip at project completion)` — verdict, adopted adjustments, graduated-entries ledger; note that roll-up precedes archive.

### Config keys

- `workflow.projectLog: true | false | auto` — default `auto`. Resolved via the existing layered resolver (local > shared > user). Validation added alongside `workflow.autoArtifactReview` handling in the config schema.
- `workflow.projectLogLedgerPath: string` — default `.oat/repo/reference/project-observations.md`. Roll-up warns-and-skips when the parent reference layer does not exist and the key was not explicitly set.

### Scaffold integration (`oat project new`)

- `--with-project-log` forces creation from template at scaffold time; `--no-project-log` writes nothing and records nothing (the helper's config gate still governs later appends — an explicit opt-out that must persist is expressed via config `false`).
- With config `true`, scaffold creates the log by default; with `auto` (default), scaffold does nothing and creation defers to first append.

### Lifecycle integrations (v1)

| Surface                 | Kind  | Integration                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `oat-project-implement` | prose | Append-point instructions at: each dispatch (stamp: phase, role, resolved target — referencing the implementation.md run record by path+anchor, never mirroring it), STOP/park events (triggering condition), phase outcomes (verdict, fix-loop count), parallel-group merge results. One-line instruction each, deferring format to `append --help`.                                                         |
| `oat gate review`       | code  | After writing the terminal envelope, internally invoke the append routine (direct function call, not a subprocess) with `--structural --producer 'oat gate review' --ref <review-scope>` and a one-liner: target, threshold, findings counts, exit code, status, artifact path. Honors the same config gate; failures to append are logged as warnings and never affect the gate's own exit code or envelope. |
| `oat-project-summary`   | prose | New step: run `check`; if entries exist, read the log, write `## Workflow Observations` into summary.md (grouped by type, `general` entries flagged), append `general`/graduated entries to the ledger path (dedup by date+area), and offer backlog graduation for entries marked follow-up.                                                                                                                  |
| `oat-project-complete`  | prose | Before archive: run `check --json`; if `synthesis_pending`, surface a completion **warning** (not a block) and prompt the orchestrator to write the synthesis. Verify summary's roll-up step ran when entries exist. Append the seal entry (completion timestamp, roll-up performed) as the final structural append, then archive.                                                                            |

## Data Models

Covered by the interfaces above (heading grammar + `ProjectLogCheckResult`). No persistent state beyond the markdown artifact and ledger; both are plain markdown with the heading line as the only machine-read structure.

## Error Handling

- **No active project / bad `--project`:** error with the standard project-resolution message; exit 1.
- **Config `false`:** silent no-op success — skills must never need to pre-check config before calling append.
- **Append to archived/missing project dir:** error; the seal entry is the last legitimate write.
- **Gate-internal append failure:** warn-and-continue; never contaminates gate semantics.
- **Ledger parent missing:** warn-and-skip at roll-up (per operator decision); explicit config value escalates skip to a visible warning in summary output.
- **Concurrent appends:** not serialized in v1. Mitigated structurally: v1 appenders (implement orchestration, gate runs, completion) all execute in the root checkout serially, and the wave-0 rule (shared tracked surfaces are never written from parallel worktrees) is restated in the template contract. Revisit if fast-follow appenders run inside worktrees.

## Testing Strategy

### Unit Tests (`packages/cli`)

- **append:** create-on-first-append under `auto`; append-to-existing under all config values; silent no-op under `false`; artifact-presence-wins rule; taxonomy rejection (bad `--type`/`--scope`); heading composition for both entry classes; stdin body; version-note clause; append-only (never mutates prior content); deterministic formatting (double-run idempotence under oxfmt).
- **check:** counts by class/type/scope; synthesis-pending detection on the template marker; `--require-synthesis` exit behavior; grammar-violation reporting on hand-written headings; `absent` status.
- **config:** `workflow.projectLog` validation + layered precedence; ledger path default/override.
- **scaffold:** `--with-project-log`/`--no-project-log` interaction with each config value — tests scaffold **from the real repo template**, not a fixture copy (lesson from the placeholder bug in the sibling project).
- **gate integration:** stubbed gate run appends the structural line; append failure does not alter gate exit/status; config `false` produces no line.

### Integration / Manual

- End-to-end quick project: dispatch → log auto-created → gate line appended → summary roll-up → complete warning on pending synthesis → seal → archive; assert the ledger and summary sections survive archival.
- Skill-prose validation via `pnpm oat:validate-skills` for the three touched skills (each gets a frontmatter version bump).

## Open Questions

- None blocking. Deferred to implementation judgment: exact help-text wording, ledger section layout, and whether `check` warns on oversized inlined blocks (nice-to-have; skip if noisy).

## Implementation Phases

### Phase 1: CLI foundation

**Goal:** `oat project log append`/`check`, template, config keys — fully tested, no consumers yet.
**Verification:** unit suites above; `pnpm release:validate`.

### Phase 2: Scaffold + gate integration

**Goal:** `oat project new` flags/config behavior; gate-internal structural append.
**Verification:** scaffold tests against real template; gate integration tests.

### Phase 3: Skill integrations + docs

**Goal:** Append-point prose in `oat-project-implement`; roll-up step in `oat-project-summary`; check/warn/seal in `oat-project-complete`; docs page for the command group; skill version bumps; lockstep package version bump.
**Verification:** `pnpm oat:validate-skills`; docs build; end-to-end manual pass.

## References

- Discovery: `discovery.md` (13 confirmed decisions, operator-validated)
- Operator proposal/template/exemplar: `~/Downloads/Orchestration Feedback/02-run-log-feature-request.md`, `03-run-log-template.md`, `reference/wave-0-orchestration-log.md`
- Fast-follow: `.oat/repo/pjm/backlog/items/BL-260713-root-agent-judgment-logging.md`
- Sibling dependency: `agent-artifact-hygiene-contract` project (formatting contract inherited by appending agents)
