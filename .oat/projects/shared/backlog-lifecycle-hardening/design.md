---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-05
oat_generated: false
oat_template: false
---

# Design: backlog-lifecycle-hardening

## Overview

The project hardens the backlog lifecycle across four coupled surfaces.
First, a new `oat backlog archive <id>` command makes close-out atomic: it
validates the item's current status against the enum, sets the terminal
status (`closed`, or `wont_do` via `--wont-do`) and bumps `updated`, appends
a canonical entry to `completed.md` (always for `closed`, TODO-scaffolded
without `--summary`; only with `--summary` for `wont_do`), moves the item
file from `items/` to `archived/` (`git mv` semantics with plain-rename
fallback), and regenerates the backlog index — idempotent, `--json`-capable,
exit codes per CLI convention.

Second, the lifecycle becomes part of the scaffold: the `oat pjm init`
templates gain the exemplar Backlog Lifecycle section (pjm), a
source-of-truth map deferring the close-out workflow to `../pjm/AGENTS.md`
(reference), pointer bullets (repo root), and a new human-facing
`.oat/repo/README.md`; init prints a hint to run `oat instructions sync` for
CLAUDE.md shims. Third, drift becomes visible: new `pjm:*` checks in
`oat pjm doctor` (auto-surfaced by top-level `oat doctor`) flag
terminal-status items still in `items/`, out-of-enum statuses, and
archived-but-open inconsistencies, while `oat backlog regenerate-index`
warns on invalid statuses instead of passing them through silently. Fourth,
the instructions scan gets a surgical carve-in so `.oat/repo/**`
AGENTS.md/CLAUDE.md pairs are created and drift-checked by
`oat instructions sync`/`validate` under the consumer's chosen strategy,
while the rest of `.oat/` stays excluded.

The change propagates to every surface that teaches the old manual
workflow: the bundled skills referencing `archived/` or `completed.md` are
re-pointed at the command (with per-skill frontmatter version bumps), docs
gain coverage of the new command and lifecycle, and the five public
packages bump in lockstep with `pnpm release:validate` as the done-gate.

## Architecture

### System Context

All code changes live in `packages/cli`; the remaining surfaces are bundled
assets (`.oat/templates`, `.agents/skills`) and docs (`apps/oat-docs`). Four
existing command domains are touched, one new command is added, and one
shared module is introduced:

**Key Components:**

- **`commands/backlog/archive.ts` (new):** the atomic close-out command,
  registered beside `init` and `regenerate-index`.
- **`commands/backlog/shared/item-status.ts` (new):** single source of truth
  for the status enum (`open | in_progress | closed | wont_do`), terminal
  set, and frontmatter status parsing — consumed by `archive`,
  `regenerate-index` (warning path), and `pjm doctor` (drift checks) via the
  existing `@commands/...` alias convention.
- **`commands/backlog/regenerate-index.ts` (modified):** exports its
  regeneration core for reuse by `archive`; gains invalid-status warnings.
- **`commands/pjm/doctor.ts` (modified):** four new `pjm:*` checks (below);
  no changes to the check framework itself — top-level `oat doctor` picks
  them up automatically.
- **`commands/pjm/init.ts` (modified):** emits `.oat/repo/README.md` from a
  new bundled template; prints the `oat instructions sync` next-step hint.
- **`commands/instructions/instructions.utils.ts` (modified):** the BFS
  gains a carve-in — when the root-level `.oat` directory is skipped,
  `.oat/repo` is enqueued directly if it exists. `ROOT_EXCLUDED_DIRECTORIES`
  itself is unchanged; sync and validate inherit the carve-in because both
  run on `scanInstructionFiles`.
- **Bundled templates (modified/new):** `pjm-agents.md` (+ Backlog
  Lifecycle section, skills-repo exemplar variant), `reference-agents.md`
  (+ source-of-truth map, deferral rule), `repo-agents.md` (+ pointer
  bullets), `repo-readme.md` (new, human-facing orientation).

### Data Flow (archive command)

```
oat backlog archive <id> [--wont-do] [--summary "..."] [--json]
  1. resolve repo root + backlog root (same resolution as regenerate-index)
  2. locate <id>.md:
       in archived/  -> warn "already archived", exit 0 (idempotent no-op)
       in items/     -> continue
       nowhere       -> actionable error, exit 1
  3. parse frontmatter; validate current status against the enum
       out-of-enum (e.g. `done`) -> error naming the file, valid values,
       and the fix (correct status manually, then re-run), exit 1
  4. write frontmatter: status = closed | wont_do, updated = now (UTC)
  5. completed.md entry (canonical format, newest-first under
     `## Completed Items`):
       closed              -> always (TODO-scaffolded summary if no --summary)
       wont_do             -> only when --summary given
       file missing        -> create from starter scaffold first
       heading missing     -> warn, append scaffolded `## Completed Items`
  6. move items/<id>.md -> archived/<id>.md
       inside git repo    -> `git mv` (child process)
       outside git        -> fs rename
  7. regenerate index via the exported regeneration core
  8. report (text or --json): status set, entry written?, moved path,
     index regenerated
```

Steps 4–7 order the writes so a crash mid-command leaves detectable drift
(terminal status still in `items/`) that the new doctor checks surface —
the same drift the command exists to prevent, never silent corruption.

### Drift Checks (pjm doctor)

| Check                              | Condition                                                           | Severity                                   |
| ---------------------------------- | ------------------------------------------------------------------- | ------------------------------------------ |
| `pjm:backlog_terminal_in_items`    | item in `items/` with status `closed`/`wont_do`                     | fail (fix: run `oat backlog archive <id>`) |
| `pjm:backlog_invalid_status`       | item (items/ or archived/) with missing/empty or out-of-enum status | fail (fix: set a valid status)             |
| `pjm:backlog_archived_open`        | item in `archived/` with status `open`/`in_progress`                | warn                                       |
| `pjm:backlog_completed_unarchived` | `completed.md` entry ID whose file still sits in `items/`           | warn (best-effort ID regex scan)           |

## Component Design

### `commands/backlog/shared/item-status.ts` (new)

**Purpose:** single source of truth for backlog item statuses.
**Interface:** exports the status list (`open`, `in_progress`, `closed`,
`wont_do`), the terminal subset (`closed`, `wont_do`), and
`isValidStatus`/`isTerminalStatus` guards, plus a helper that extracts the
`status` value from item frontmatter content. Consumed by `archive`,
`regenerate-index`, and `pjm doctor` (cross-directory consumers use the
package's `@commands/...` alias per import policy).

### `commands/backlog/archive.ts` (new)

**Purpose:** atomic close-out (the data flow in Architecture).
**Command surface:** `oat backlog archive <id> [--wont-do]
[--summary <text>] [--json]`. `<id>` is the item ID (`BL-YYMMDD-slug`);
the file is `items/<id>.md`.
**Responsibilities and contracts:**

- Frontmatter mutation is minimal-diff: rewrite only the `status:` and
  `updated:` lines in place (string-level), preserving surrounding
  formatting and the enum comment — no YAML re-serialization churn.
- `completed.md` entry text: `- YYYY-MM-DD — <id> — <title> — <summary>`
  (title from item frontmatter; summary from `--summary` or
  `TODO: summarize outcome` scaffold). Inserted as the first bullet after
  `## Completed Items`.
- Move uses `git mv` via child process when the backlog root is inside a
  git work tree; plain `fs.rename` otherwise. `git mv` failure falls back
  to rename + warning rather than aborting after the frontmatter write.
- Idempotency: `archived/<id>.md` already existing → warning + exit 0,
  no writes. `--json` no-op payload says so explicitly.
- Output through CLI logger utilities; `--json` emits one structured
  payload: `{ id, result: "archived" | "noop", status, completedEntry:
"written" | "scaffolded" | "skipped", movedTo, indexRegenerated,
warnings[] }`. Exit codes: 0 success/no-op, 1 actionable (unknown id,
  invalid status), 2 system.

### `commands/backlog/regenerate-index.ts` (modified)

**Purpose:** reusable regeneration + status visibility.
**Changes:** extract/export the regeneration core so `archive` calls it
directly (no child process); while building the table, emit a warning per
item whose status is out-of-enum (naming file and valid values). Table
still renders verbatim; exit code unchanged (doctor owns enforcement).

### `commands/pjm/doctor.ts` (modified)

**Purpose:** drift detection (check table in Architecture).
**Changes:** four new checks implemented with the shared status module,
scanning `pjm/backlog/items/` and `pjm/backlog/archived/` frontmatter and
best-effort matching `completed.md` entry IDs (`BL-`/legacy `bl-` pattern)
against `items/` filenames. Each check lists offending file paths in its
message and carries an actionable `fix` (terminal-in-items: "run
`oat backlog archive <id>`"). `.oat/repo/README.md` joins the canonical
scaffold path list so pre-README repos get the existing missing-canonical
nudge ("run `oat pjm init`") — this delivers the handoff's "doctor hint"
ask with no new mechanism.

### `commands/pjm/init.ts` (modified)

**Purpose:** complete scaffold + handoff to shim tooling.
**Changes:** add `repo-readme.md` → `README.md` and
`pjm-handoffs-readme.md` → `pjm/handoffs/README.md` targets to the
scaffold file list (same write-if-missing backfill semantics as the
AGENTS.md files; the new targets flow into the canonical path list that
`pjm doctor` imports, so pre-existing scaffolds get the missing-canonical
nudge automatically); after init/backfill, print a next-step hint to run
`oat instructions sync` (mentioning `--dry-run` preview) so CLAUDE.md
shims are created under the consumer's chosen strategy. Init itself never
writes CLAUDE.md. The new bundled templates must also be appended to the
explicit template list in `packages/cli/scripts/bundle-assets.sh` so
installed CLIs ship them.

### `commands/instructions/instructions.utils.ts` (modified)

**Purpose:** scan carve-in.
**Changes:** in the directory BFS, when the root-level `.oat` entry is
skipped by `ROOT_EXCLUDED_DIRECTORIES`, enqueue `.oat/repo` directly if it
exists. The exclusion set is unchanged; `.oat/templates`, `.oat/projects`,
and `.oat/sync` remain unscanned. `sync` and `validate` both inherit the
carve-in because they share `scanInstructionFiles`.

### Bundled templates (modified/new)

- `pjm-agents.md`: append the exemplar **Backlog Lifecycle** section — the
  skills-repo variant including "these are the only terminal values —
  never invent variants like `done`" — with close-out step 1–4 rewritten
  around `oat backlog archive` as the primary path (manual steps remain
  documented as the fallback the command automates).
- `reference-agents.md`: add the source-of-truth map and an update rule
  deferring close-out workflow to `../pjm/AGENTS.md` (no duplication).
- `repo-agents.md`: pointer bullets to the lifecycle section and README.
- `repo-readme.md` (new): human-facing orientation generalized from the
  downstream exemplar — layout table limited to canonical scaffold paths
  (now including `pjm/handoffs/`), generated-vs-curated conventions, ID
  conventions, close-out pointer.
- `pjm-handoffs-readme.md` (new): the `pjm/handoffs/README.md` convention
  doc, generalized from the orc exemplar — one-shot kickoff prompts, one
  file per backlog item named `<BL-id>.md`, consumable-not-durable
  (deleted via `git rm` in the PR that ships the item), durable knowledge
  stays in the item file/`reference/`, each handoff carries its own
  deletion instruction.
- `pjm-agents.md` additionally gains a **Project Kickoff Handoffs**
  section (discovery Q4): generate/refresh handoffs when a
  priority-alignment pass concludes; kickoff-stack items only (lane count
  and ordering are the human's call); required handoff content — item
  reference (ID + title + path), recommended mode
  (`oat-project-quick-start` vs `oat-project-new`) with artifact
  pre-population guidance, authoritative input pointers (research dirs,
  decision records, code paths), repo conventions and verification gates
  the item file omits, and a close-out section requiring (a) the Backlog
  Lifecycle executed in the same shipping PR and (b) deletion of the
  handoff file in that PR; delete stale handoffs when items are
  reprioritized out; every backlog item reference pairs the ID with a
  human-readable title — no bare IDs.

### Propagation surfaces

- **Skills:** grep-driven sweep of the bundled skills referencing
  `archived/` or `completed.md` (14 known); every skill that
  narrates manual close-out steps is re-pointed at `oat backlog archive`;
  each changed skill's frontmatter `version:` bumps in the same PR.
  `oat pjm migrate` guidance is included in the sweep.
- **`oat-pjm-review-backlog` skill (kickoff-handoff encoding):** the skill
  gains the Project Kickoff Handoffs workflow — when a priority-alignment
  pass concludes, generate/refresh one handoff per agreed kickoff-stack
  item under `pjm/handoffs/` (required content per the template section)
  and delete stale handoffs for reprioritized items; all review and
  alignment output pairs item IDs with human-readable titles. Lane count
  and kickoff-stack selection remain explicit human decisions the skill
  must not make on its own.
- **Dogfood:** run the updated `oat pjm init` in this repository to create
  its own `.oat/repo/pjm/` (backlog scaffold + `handoffs/`) — this repo
  currently has no pjm directory; existing `.oat/repo/README.md` and
  reference content are preserved by write-if-missing semantics.
- **Docs:** `apps/oat-docs` gains archive-command coverage in the CLI/
  backlog docs; regenerate the docs index via `oat docs generate-index`.
- **Release:** lockstep version bump across the five public packages;
  `pnpm release:validate` must pass before done.

## Testing Strategy

Unit tests colocated per command (existing vitest patterns:
`archive.test.ts` beside `archive.ts`, temp-dir fixtures like
`init.test.ts`/`regenerate-index.test.ts`).

**Archive command:** fresh archive happy path (status flip, `updated`
bump, entry written, file moved, index regenerated); `--wont-do` with and
without `--summary` (entry skipped without); TODO scaffold when `--summary`
missing on closed; invalid current status rejected with fix hint (exit 1);
unknown id (exit 1); already-archived no-op (exit 0 + warning); missing
`completed.md` created from scaffold; missing `## Completed Items` heading
→ warn + scaffolded section; git path (`git mv` in a temp git repo,
history-preserving) and non-git fallback (plain temp dir); `--json`
payload shape for archived and no-op results; enum comment preserved in
rewritten frontmatter.

**Regenerate-index:** invalid status emits warning while table still
renders; no warning for valid statuses.

**Doctor:** fixture backlogs exercising each of the four checks (positive
and clean cases); README.md missing → canonical-files check fires.

**Instructions scan:** `.oat/repo/**` AGENTS/CLAUDE pairs appear in scan
results (sync dry-run + validate); `.oat/templates` and `.oat/projects`
content never appears; carve-in no-ops when `.oat/repo` doesn't exist.

**pjm init:** fresh directory yields README.md and instruction files
containing the Backlog Lifecycle heading; re-run backfills a deleted
README.md without touching existing files; sync hint present in output.

**Repo-level gates:** `pnpm lint`, `pnpm type-check`, workspace `pnpm
test`, and `pnpm release:validate` (publishable-package definition of
done).
