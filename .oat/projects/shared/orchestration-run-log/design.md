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

- **`oat project log` command group (new):** `packages/cli/src/commands/project/log/` — `append`, `synthesize`, `check`, and `rollup` subcommands. Single write-owner for the artifact (agents never hand-edit it, including the synthesis section), and executable owner of the roll-up mechanics so the loss-prevention boundary is testable code, not prose (gate-review escalation resolution, operator-approved 2026-07-13).
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
  oat gate review ────────code──▶  │ append | synthesize  │        │ (header = contract,
                                   │  check | rollup      │        │
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
4. At completion, `oat-project-summary` reads the log and offers explicit ledger graduation before roll-up: a reusable `project`-scoped observation is promoted by appending a new `general`-scoped judgment that references the original entry. It then emits `## Workflow Observations` into `summary.md`, appends all `general` entries to the repo ledger (dedup by date + area), and routes follow-up entries through the backlog flow.
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

### `oat project log synthesize`

**Purpose:** CLI-owned completion of the end-of-run synthesis section, preserving the single-writer contract (agents never hand-edit the artifact). Replaces the template's pending synthesis marker/section with provided content; never touches `## Entries`.

**Interfaces:**

```
oat project log synthesize --body <text> | --body - (stdin) [--project <path>] [--json]
```

**Behavior:** errors if no log exists; errors if synthesis is already written (corrections go through a follow-up judgment entry, per the append-only ethos); after it runs, `check` reports `synthesisPending: false`. Prior entry content is byte-identical afterward.

### `oat project log rollup`

**Purpose:** Executable owner of the roll-up mechanics, so `oat-project-summary`/`oat-project-complete` call one command instead of hand-implementing the ordering-critical writes, and so the enforcement path is exercisable from tests (gate escalation resolution, option (a)).

**Interfaces:**

```
oat project log rollup [--project <path>] [--summary-path <path>] [--json]
```

**Behavior:** reads the log; writes/updates the `## Workflow Observations` section in the project's `summary.md` (creating the section, never the whole file — errors if summary.md is absent, since summary authoring stays with the skill); appends `general`-scoped entries to the ledger at `workflow.projectLogLedgerPath` with date+area dedup; idempotent (re-run updates the section, re-dedups the ledger, no duplicates). Graduation requires no new metadata or command: before roll-up, the summary flow promotes a reusable `project` observation by calling `oat project log append` with `--scope general` and a body referencing the original heading. Both entries remain append-only; roll-up naturally selects the new `general` entry. Returns a structured outcome the skills route on:

```typescript
interface ProjectLogRollupResult {
  status: 'ok' | 'failed';
  summarySection: 'written' | 'updated';
  ledgerOutcome: 'appended' | 'deduplicated' | 'skipped_permitted' | 'failed';
  // skipped_permitted = reference layer absent AND workflow.projectLogLedgerPath unset (warn-and-skip per operator decision)
  entriesRolledUp: number;
}
```

`status: 'failed'` (or `ledgerOutcome: 'failed'` with the key explicitly set) is the signal on which `oat-project-complete` must refuse to seal/archive. The permitted skip is `status: 'ok'`.

**Extension point (design for, don't build):** keep the roll-up's artifact target parameterizable in the internal implementation (module-level, not a CLI flag in v1). The cursor-cloud-autonomous-projects team intends to evaluate migrating their `oat-execution-learnings.md` mechanism onto this substrate and reusing the roll-up-before-archive pattern for its identical durability exposure — do not hard-code the assumption that `project-log.md` is the only append-only artifact needing pre-archive verification.

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

**Behavior:** exit 0 in all normal cases; `--require-synthesis` makes `synthesis_pending` exit 1 (mechanical enforcement hook — not used by v1 skills, which warn rather than block, but available for stricter gate configs). Synthesis detection keys on the template's synthesis section marker. Grammar validation applies the heading regex to `###` lines under `## Entries` and reports (never rejects) violations. **Scope: strictly `project-log.md`.** Sibling append-only artifacts in the same project directory with different grammars (e.g. `oat-execution-learnings.md` from PR #133's autonomous-execution mechanism) are never scanned, classified as grammar violations, or reported as unmanaged logs.

### Artifact template (`.oat/templates/project-log.md`)

**Purpose:** Header-is-the-contract artifact seed, generalized from the operator's template (`03-run-log-template.md`) with the framing broadened from orchestration-specific to general project observations.

**Structure (summary — full text authored at implementation from the operator's template):**

1. Frontmatter: `oat_generated: false`, `oat_template_name: project-log`, `purpose: project-observations`, `oat_last_updated`.
2. Title + two-audience purpose statement (this project's execution; general workflow/tooling feedback).
3. **Logging contract** paragraph: when to append, corrections via new referencing entries (prior entries are never edited), version-stamp tool observations, evidence-not-narrative, entries via `oat project log append` (pointing at `--help` for the contract), reference artifacts by path, and a **secret-redaction rule**: never record secret values (tokens, keys, signed URLs, credentials) — the log rolls up into tracked surfaces (summary.md, repo ledger); reference secrets by name/source, never by value. Mirrored in the append `--help` text.
4. **Optional structured judgment body:** judgment entries default to the 1–3 sentence shape, but MAY use an `Observation:` / `Impact:` / `Recommendation:` three-field body for high-value entries — the shape that makes mechanical synthesis reliable (adopted from the cursor-cloud-autonomous-projects team's learnings-mechanism experience, 2026-07-14).
5. Entry format block showing both heading grammars.
6. `## Entries` (chronological, append-only).
7. `## End-of-run synthesis (pending — do not skip at project completion)` — verdict, adopted adjustments, graduated-entries ledger; note that roll-up precedes archive.

### Config keys

- `workflow.projectLog: true | false | auto` — default `auto`. Resolved via the existing layered resolver (local > shared > user). Validation added alongside `workflow.autoArtifactReview` handling in the config schema.
- `workflow.projectLogLedgerPath: string` — default `.oat/repo/reference/project-observations.md`. Roll-up warns-and-skips when the parent reference layer does not exist and the key was not explicitly set.

### Scaffold integration (`oat project new`)

- `--with-project-log` forces creation from template at scaffold time; `--no-project-log` writes nothing and records nothing (the helper's config gate still governs later appends — an explicit opt-out that must persist is expressed via config `false`).
- With config `true`, scaffold creates the log by default; with `auto` (default), scaffold does nothing and creation defers to first append.

### Lifecycle integrations (v1)

| Surface                 | Kind  | Integration                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| `oat-project-implement` | prose | Append-point instructions at: each dispatch (stamp: phase, role, resolved target — referencing the implementation.md run record by path+anchor, never mirroring it), STOP/park events (triggering condition), phase outcomes (verdict, fix-loop count), parallel-group merge results. One-line instruction each, deferring format to `append --help`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `oat gate review`       | code  | A **once-only finalization hook covering every terminal outcome** (successful verdicts, blocking verdicts, child failure, timeout, targeting failure, artifact-validation failure) internally invokes the append routine (direct function call, not a subprocess) with structural producer `oat gate review`, ref = review scope, and a one-liner: target, threshold, findings counts (when available), exit code, status, artifact path (when produced). Honors the same config gate; failures to append are logged as warnings and never affect the gate's own exit code or envelope.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `oat-project-summary`   | prose | New step: run `check`; if entries exist, offer ledger graduation **before roll-up** by appending a new `general` judgment that references each selected `project` entry (never mutate or annotate the original). After summary.md is authored, run `oat project log rollup --json`; the command writes the `## Workflow Observations` section and performs the ledger append/dedup mechanically. Then offer backlog graduation for entries marked follow-up. The skill routes on the structured `ProjectLogRollupResult` rather than hand-implementing writes. **Coexistence with PR #133's learnings synthesis (coordination contract):** the two summary sections stay distinct (`## Workflow Observations` ours, `## Autonomous Execution Learnings` theirs). Because roll-up intentionally writes every project-log entry, Workflow Observations remains complete; Autonomous Execution Learnings represents overlap with a one-line cross-reference to Workflow Observations instead of copying the observation. Run roll-up after authoring learnings without rewriting either command-owned section. |     |
| `oat-project-complete`  | prose | Before archive: run `check --json`. If `synthesis_pending`, surface a completion **warning** (not a block) and prompt the orchestrator to write the synthesis via `oat project log synthesize`. **Roll-up is enforced, not merely verified:** when entries exist, completion runs `oat project log rollup --json` itself if summary's step has not already done so, and must NOT seal/archive unless the structured result reports `status: 'ok'` — the archive is gitignored, so sealing an un-rolled-up log permanently loses observations. The permitted ledger skip (`ledgerOutcome: 'skipped_permitted'`) is `ok` and does not block; `status: 'failed'` blocks. Because enforcement routes on a CLI command's structured outcome, the boundary is testable end-to-end from vitest (gate escalation resolution). Synthesis stays warn-only; roll-up is the hard gate. Append the seal entry (completion timestamp, roll-up performed) as the final structural append, then archive.                                                                                                                    |

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
- **synthesize:** fills the pending synthesis section from `--body`/stdin; errors on missing log or already-written synthesis; entries byte-identical afterward; `check` flips `synthesisPending` to false; format-stable output.
- **rollup:** summary section written/updated idempotently; ledger includes `general` entries (including a referencing promotion appended from a prior `project` entry) but not the original project-scoped entry; ledger outcomes appended/deduplicated/skipped_permitted each tested; unexpected ledger failure (key set, path unwritable) → `status: 'failed'`; errors when summary.md absent; re-run produces no duplicates.
- **gate integration:** one structural line per gate run across ALL terminal outcomes (success, blocking verdict, child failure, timeout, targeting-correlation failure, artifact-validation failure — each tested explicitly); append failure does not alter gate exit/status; config `false` produces no line.

### Integration / Manual

- End-to-end quick project: dispatch → log auto-created → gate line appended → summary roll-up → complete warning on pending synthesis → seal → archive; assert the ledger and summary sections survive archival.
- Skill-prose validation via `pnpm oat:validate-skills` for the three touched skills (each gets a frontmatter version bump).

## Open Questions

- None blocking. Ledger graduation semantics were confirmed on 2026-07-18: append a new referencing `general` judgment before roll-up. Deferred to implementation judgment: exact help-text wording, ledger section layout, and whether `check` warns on oversized inlined blocks (nice-to-have; skip if noisy).

## Implementation Phases

### Phase 1: CLI foundation

**Goal:** `oat project log append`/`synthesize`/`check`/`rollup`, template, config keys — fully tested, no consumers yet.
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
