# OAT PJM repo-reference migration — agent-runnable prompt

> **What this is:** a self-contained prompt you (an agent) run **inside a target git repo** to
> migrate its OAT project-management (PJM) reference layer from the OLD shape
> (`.oat/repo/reference/{current-state.md, roadmap.md, decision-record.md, backlog/}`) to the
> NEW LOCKED shape (`pjm/` active layer + `reference/` durable library + file-per-record
> decisions + date+slug IDs + committed generated indexes + master/scoped AGENTS.md).
>
> **How to invoke:** the user runs you in the target repo and says, e.g.,
> "Run the OAT PJM migration." Default to a **dry run**. Only mutate after the user types
> `apply` (or invokes you with `--apply`).
>
> **Non-negotiable safety rules — read before doing anything:**
> 1. **Dry-run first, always.** Produce the full plan and the two judgment proposals BEFORE
>    any write. Do not write/move/delete until the user explicitly approves.
> 2. **Idempotent.** If the repo is already in the new shape, report that and stop.
> 3. **Non-destructive.** Use `git mv` for every move (preserve history). Never `git rm` a
>    file until its content is confirmed present in the new location.
> 4. **Preserve all content.** Re-id changes only the id/filename and adds `legacy_id`. Never
>    rewrite a record's prose.
> 5. **Two judgment gates require human confirmation** (ad-hoc folder reconciliation; legacy
>    file retirement / second-roadmap disposition). Mechanical steps run without asking.
> 6. **Stay in `.oat/`.** Touch only `.oat/repo/**` (+ project dirs under `.oat/projects/**`
>    when the user confirms a project-scoped move) and `.oat/sync/manifest.json`.

---

## STEP 0 — Preconditions and dry-run inventory (READ-ONLY; no writes)

Run these and stop if a precondition fails.

```bash
# 0a. Confirm we're in a git repo with an OAT install.
git rev-parse --show-toplevel
test -d .oat || { echo "No .oat/ directory — not an OAT repo. ABORT."; exit 1; }

# 0b. PJM must be enabled. If false, this repo has no reference layer by design.
node -e 'const c=require("./.oat/config.json"); process.exit(c.tools && c.tools["project-management"] ? 0 : 1)' \
  || { echo "project-management pack is DISABLED in .oat/config.json — nothing to migrate. ABORT."; exit 1; }

# 0c. Clean working tree (or require explicit override from the user).
git status --porcelain | head
echo "HEAD: $(git rev-parse HEAD)"   # record for rollback note

# 0d. Idempotency probe — already migrated?
test -d .oat/repo/pjm && test -d .oat/repo/reference/decisions \
  && echo "ALREADY MIGRATED (pjm/ and reference/decisions/ exist). Stop unless user forces re-run."
```

If `0b` fails (honeycomb/duet class): **abort with** "PJM is disabled; nothing to migrate."
If `0c` shows a dirty tree: ask the user to commit/stash or to confirm proceeding anyway.
If `0d` reports already-migrated: stop unless the user says re-run.

Now build the **inventory** (read-only) and print it:

```bash
echo "=== reference root ==="; ls -la .oat/repo/reference/ 2>/dev/null
echo "=== canonical four ==="; for f in current-state.md roadmap.md decision-record.md; do
  test -f ".oat/repo/reference/$f" && echo "present: $f" || echo "ABSENT: $f"; done
test -d .oat/repo/reference/backlog && echo "present: backlog/" || echo "ABSENT: backlog/"
echo "=== backlog items ==="; ls .oat/repo/reference/backlog/items/*.md 2>/dev/null | wc -l
echo "=== decision scheme ==="; grep -oE '^#{2,3} (ADR|DR)-[0-9]+' .oat/repo/reference/decision-record.md 2>/dev/null | sort -u | head
echo "=== legacy backlog files ==="; for f in backlog.md backlog-completed.md; do
  test -f ".oat/repo/reference/$f" && echo "LEGACY present: $f"; done
echo "=== second roadmap ==="; ls .oat/repo/reference/*roadmap*.md 2>/dev/null | grep -v '/roadmap.md$'
echo "=== ad-hoc folder candidates ==="; for d in research planning brainstorms design product external-plans decks proposals operator-steps profile-baselines rollouts wrap-ups technical; do
  test -d ".oat/repo/reference/$d" && echo "candidate dir: $d"; done
echo "=== loose reference-root *.md (non-canonical) ==="; ls .oat/repo/reference/*.md 2>/dev/null | grep -vE '/(current-state|roadmap|decision-record|backlog|backlog-completed)\.md$'
echo "=== version stamp ==="; node -e 'try{console.log("oatVersion:",require("./.oat/sync/manifest.json").oatVersion)}catch(e){console.log("no manifest")}'
oat --version 2>/dev/null || echo "oat CLI not on PATH"
```

**Print the DRY-RUN PLAN** summarizing what each mechanical step will do, then present the
two judgment proposals (STEP 4 and STEP 5/6 tables) and ask:

> "This is the dry-run plan. Reply `apply` to execute mechanical steps 1-3, 7, 8, or confirm
> the proposal tables below first. Nothing has been changed."

Do not proceed past here without approval.

---

## STEP 1 — Move active layer into `pjm/` (MECHANICAL)

```bash
mkdir -p .oat/repo/pjm
# Move the three active surfaces (only if present).
for f in current-state.md roadmap.md; do
  if [ -f ".oat/repo/reference/$f" ]; then git mv ".oat/repo/reference/$f" ".oat/repo/pjm/$f"; fi
done
if [ -d .oat/repo/reference/backlog ]; then git mv .oat/repo/reference/backlog .oat/repo/pjm/backlog; fi
```

**Missing-file handling (sequence-class half-implemented repos):** for any of
`current-state.md` / `roadmap.md` that were ABSENT, instantiate from the repo template with
the `oat_template` frontmatter stripped, written directly under `pjm/`:

```bash
# For each missing file <name>:
#   - read .oat/templates/<name>.md
#   - if it starts with a frontmatter block containing oat_template/oat_template_name, drop the
#     entire leading "---\n...\n---\n" block (replicates pjm/init.ts stripTemplateFrontmatter)
#   - write the remainder to .oat/repo/pjm/<name>
#   - record "created from template — NEEDS BACKFILL" in the report
```

If `backlog/` was absent but PJM is on, scaffold it at the new location:

```bash
# Run the backlog scaffold against the new pjm/backlog path so the exact managed markers exist.
# (oat backlog init is idempotent; point it at the pjm backlog root per the repo's CLI support.)
oat backlog init
```

---

## STEP 2 — Re-id backlog items to `bl-YYMMDD-slug` (MECHANICAL)

For every file in `.oat/repo/pjm/backlog/items/*.md` and `.oat/repo/pjm/backlog/archived/*.md`:

1. Parse YAML frontmatter. Read `created` (ISO 8601, e.g. `2026-04-13T22:35:45Z`).
   - Derive `YYMMDD` from `created` (→ `260413`).
   - Fallback if `created` is missing: git first-commit date of the file
     (`git log --diff-filter=A --format=%ad --date=short -1 -- <file>`), else file mtime.
     Record any fallback in the report.
2. Determine `slug` = the current filename stem if it is already kebab-case, else kebab-case
   of `title`.
3. Compute new id `bl-<YYMMDD>-<slug>` and new filename `<new-id>.md` (**id == stem**).
   - On collision (same `bl-YYMMDD-slug` already produced), append `-2`, `-3`, … to the slug
     and note it.
4. Edit frontmatter **in place** before moving: set `id: bl-<YYMMDD>-<slug>` and **add**
   `legacy_id: <old-id>` (keep the old value, e.g. `legacy_id: bl-c745`). Leave `created`,
   `title`, every other field, and the body untouched.
5. `git mv <old-file> .oat/repo/pjm/backlog/items/<new-id>.md`.

After all items are re-id'd, regenerate the committed index:

```bash
oat backlog regenerate-index   # rewrites only the <!-- OAT BACKLOG-INDEX --> managed table
```

The index is **committed** (browsable). Its render is deterministic (priority-then-title), so
on a future merge conflict the resolver re-runs this command and `git add`s — see the AGENTS.md
note STEP 7 writes.

---

## STEP 3 — Split + re-id decisions to file-per-record (MECHANICAL)

Source: `.oat/repo/reference/decision-record.md` (single file). Records use headings
`## ADR-NNN: Title` or `### ADR-NNN: Title` (or `DR-NNN`), each with a `- **Date:**
YYYY-MM-DD` and `- **Status:** …` line and a body. There is also a top **Decision Index**
table (`| ID | Date | Status | Title | …`).

If `decision-record.md` is absent (sequence): skip the split; just create the empty
`reference/decisions/` + generated `index.md` so the canonical surface exists. Note "no
decisions to migrate."

Otherwise:

```bash
mkdir -p .oat/repo/reference/decisions
```

Parse the file into records by splitting on `^#{2,3}\s+(ADR|DR)-(\d+):\s*(.+)$`. For each
record capture: original `ID` (e.g. `ADR-001`), `title`, and the `body` (everything from the
heading up to the next decision heading). Recover `Date`/`Status` from the record's inline
`- **Date:**` / `- **Status:**` lines; if absent, fall back to that ID's row in the Decision
Index table.

For each record write `.oat/repo/reference/decisions/<new-id>.md` where
`new-id = dr-<YYMMDD>-<slug>` (`YYMMDD` from the record's Date; `slug` = kebab-case of title,
≤ ~6 words):

```markdown
---
id: dr-<YYMMDD>-<slug>
legacy_id: ADR-001
title: '<original title>'
date: 'YYYY-MM-DD'
status: accepted
---

<ORIGINAL BODY, PRESERVED VERBATIM — Drivers / Related / Context / Options Considered /
Decision / Consequences exactly as they appeared>
```

Rules:
- **Preserve the body byte-for-byte** (minus the heading line, which becomes `title`/the
  frontmatter). Do not summarize or reformat.
- `legacy_id` keeps the original `ADR-NNN`/`DR-NNN` so inbound references still resolve.
- Because the id carries the ORIGINAL date, records sort chronologically by filename and in
  the index (ADR-001 @ 2026-01-30 → `dr-260130-…` sorts before a June decision). Gaps in the
  old numbering (e.g. stoa DR-033/035 missing) are irrelevant — date+slug needs no contiguity.
- Collision (same `dr-YYMMDD-slug`): append `-2`/`-3` to the slug.

Generate the committed index:

```bash
oat decision regenerate   # builds reference/decisions/index.md managed table from the record files
```

`reference/decisions/index.md` mirrors the backlog index: managed markers + a deterministic
table `| ID | Date | Status | Title | Legacy |` sorted by `date` then `id`. Committed;
regenerate-on-conflict.

**Verify before retiring the source:** count decision headings in the original file == count
of files in `reference/decisions/` (excluding `index.md`). Only when they match:

```bash
git rm .oat/repo/reference/decision-record.md
```

If counts mismatch, STOP and report the discrepancy — do not delete.

---

## STEP 4 — Reconcile ad-hoc folders (JUDGMENT — PROPOSE, then confirm each)

This step needs human judgment; do not move anything until the user confirms.

Detect (from STEP 0 inventory) folders/files under `.oat/repo/reference/` (and `.oat/repo/`)
in the set: `research, planning, brainstorms, design, product, external-plans, decks,
proposals, operator-steps, profile-baselines, rollouts, wrap-ups, technical`, plus any loose
non-canonical `*.md` in the reference root.

For each, infer a classification by skimming its contents:
- **Project-scoped** (content is about one specific project/feature) → propose moving into
  that project's reference dir: `.oat/projects/<scope>/<project>/reference/`.
- **Repo-wide / durable** → propose the canonical destination:
  - brainstorms → `reference/brainstorms/`
  - research / deep-research → `reference/research/`
  - external / imported plans → `reference/external-plans/`
  - decks → `reference/decks/`
  - loose reference-root `*.md` → `reference/research/` (or a `reference/<topic>/` you name)

**Emit a PROPOSAL TABLE** and ask the user to confirm or override each row:

```
| # | Detected path | Inferred scope | Proposed destination | Confirm? |
|---|---|---|---|---|
| 1 | reference/brainstorms/ | repo-wide | reference/brainstorms/ (no move) | ? |
| 2 | reference/planning/mvp-screen-requirements/ | project-scoped (home-feed?) | .oat/projects/shared/<project>/reference/ | ? |
| 3 | reference/woz-oz-...-brief.md (loose) | repo-wide | reference/research/ | ? |
...
```

Rules:
- Ambiguous/unknown → default to **"leave in place, flag"**, never guess.
- After the user confirms, `git mv` each approved row. Skip rows the user rejects.
- Optional canonical folders (`research/`, `brainstorms/`, `external-plans/`, `decks/`) are
  **created on demand** — only when a confirmed move needs them. Do not pre-create empties.

---

## STEP 5 — Retire legacy backlog files (JUDGMENT — fold, then delete)

Targets if present: `.oat/repo/reference/backlog.md` (legacy flat) and
`.oat/repo/reference/backlog-completed.md` (parallel completion log).

1. Read both. Diff their entries against the live `pjm/backlog/items/*.md` and
   `pjm/backlog/completed.md`.
2. **PROPOSE:** list entries present ONLY in the legacy files (would be lost on delete). For
   each, propose either:
   - fold into a new `pjm/backlog/items/<bl-YYMMDD-slug>.md` (re-id per STEP 2), or
   - append to `pjm/backlog/completed.md` (for completion entries).
3. After the user confirms the fold, write the folded items and then:
   ```bash
   git rm .oat/repo/reference/backlog.md .oat/repo/reference/backlog-completed.md
   ```
4. Stale-reference sweep (report dangling links; do not auto-edit other files):
   ```bash
   grep -rnE 'backlog\.md|backlog-completed\.md|deferred-phases\.md' \
     .oat/repo AGENTS.md .agents/skills docs 2>/dev/null
   grep -rnE '\.oat/repo/reference/(current-state|roadmap|decision-record|backlog)' \
     .oat/repo AGENTS.md .agents/skills docs 2>/dev/null   # old paths now under pjm/
   ```

---

## STEP 6 — Archive or fold a second roadmap (JUDGMENT)

If STEP 0 found a `*roadmap*.md` other than the moved `pjm/roadmap.md` (e.g.
`milestone-roadmap.md`), **propose two options** and confirm:

- **Archive (default for "historical, do not use as active planning"):**
  ```bash
  mkdir -p .oat/repo/reference/archive
  git mv .oat/repo/reference/milestone-roadmap.md .oat/repo/reference/archive/milestone-roadmap.md
  ```
- **Fold:** merge still-relevant items into `pjm/roadmap.md` Later bucket, then
  `git rm` the second file.

Confirm the choice before acting.

---

## STEP 7 — Write master + scoped AGENTS.md (MECHANICAL; OAT-managed docs)

Write (overwrite) these three OAT-managed docs.

**`.oat/repo/AGENTS.md`** (master):

```markdown
# .oat/repo — OAT repo records (PJM restructure)

This describes the full proposed structure of `.oat/repo/`. **You may not have all of these** —
optional folders are created on demand, not pre-created.

## Layout

- `pjm/` — ACTIVE operational layer (read at project start, written at completion):
  - `current-state.md` (NON-NEGOTIABLE) — birdseye snapshot.
  - `roadmap.md` (NON-NEGOTIABLE) — Now / Next / Later.
  - `backlog/` (NON-NEGOTIABLE): `items/<bl-YYMMDD-slug>.md`, `index.md` (generated, COMMITTED),
    `completed.md`, `archived/`.
- `reference/` — DURABLE refer-back library:
  - `decisions/` (NON-NEGOTIABLE): `<dr-YYMMDD-slug>.md` file-per-record + `index.md`
    (generated, COMMITTED).
  - `project-summaries/<YYMMDD-slug>.md` (NON-NEGOTIABLE).
  - `research/`, `brainstorms/`, `external-plans/`, `decks/` (RECOMMENDED — created on demand).
- `knowledge/`, `analysis/`, `reviews/` — generated/review surfaces (unchanged).

## IDs
- Decisions: `dr-YYMMDD-slug`. Backlog: `bl-YYMMDD-slug`. **ID == filename stem.** The `YYMMDD`
  prefix gives chronological + file-explorer ordering. Allocator-free (no scan, no counter):
  collision only on same-day + same-slug. Migrated records keep their original id in `legacy_id:`.

## Skill / content DESTINATIONS
- `oat-brainstorm` → `reference/brainstorms/`
- `oat project import-plan` → `reference/external-plans/` (already its target)
- research / deep-research → `reference/research/`

## Generated indexes — regenerate on conflict
`pjm/backlog/index.md` and `reference/decisions/index.md` are generated and COMMITTED (not
gitignored, no merge driver). They render deterministically from the record files. On a merge
conflict: run the regenerate command, then `git add`:
- backlog: `oat backlog regenerate-index`
- decisions: `oat decision regenerate`

current-state.md and roadmap.md stay single narrative docs; minimize conflicts via stable
section order, one-item-per-line bullets, and the single managed `Last Updated:` line.
```

**`.oat/repo/pjm/AGENTS.md`** (scoped):

```markdown
# pjm/ — active operational layer

- `backlog/index.md` is GENERATED and COMMITTED. Do not hand-edit the
  `<!-- OAT BACKLOG-INDEX -->` … `<!-- END OAT BACKLOG-INDEX -->` block. Only the
  `## Curated Overview` section is hand-edited.
- On a merge conflict in `index.md`: run `oat backlog regenerate-index`, then `git add`.
- New backlog items: `bl-YYMMDD-slug`, one file per item under `backlog/items/`.
```

**`.oat/repo/reference/AGENTS.md`** (scoped):

```markdown
# reference/ — durable library

- `decisions/` is FILE-PER-RECORD (`dr-YYMMDD-slug.md`). New decisions: `oat decision new`.
- `decisions/index.md` is GENERATED and COMMITTED — do not hand-edit the managed block.
- On a merge conflict in `decisions/index.md`: run `oat decision regenerate`, then `git add`.
- Migrated decisions keep their old `ADR-NNN`/`DR-NNN` in `legacy_id:` frontmatter.
```

---

## STEP 8 — Refresh the version stamp (MECHANICAL)

```bash
# Set sync manifest oatVersion to the installed CLI version (fixes the stale 0.0.1 stamp),
# or just run sync which rewrites the manifest:
oat sync --scope project   # idempotent; refreshes manifest incl. oatVersion
# If oat sync is not desired, set manifest .oatVersion to `oat --version` output directly.
```

---

## STEP 9 — Verify and report (READ-ONLY)

```bash
echo "=== target shape ==="
for p in pjm/current-state.md pjm/roadmap.md pjm/backlog/index.md \
         reference/decisions/index.md AGENTS.md pjm/AGENTS.md reference/AGENTS.md; do
  test -e ".oat/repo/$p" && echo "OK   $p" || echo "MISS $p"; done
echo "=== no template frontmatter left ==="
grep -rl 'oat_template' .oat/repo/pjm .oat/repo/reference/decisions 2>/dev/null \
  && echo "WARN: oat_template frontmatter remains (doctor FAIL)" || echo "OK: stripped"
echo "=== legacy files gone ==="
for f in reference/decision-record.md reference/backlog.md reference/backlog-completed.md; do
  test -e ".oat/repo/$f" && echo "STILL PRESENT (folded?): $f" || echo "removed: $f"; done
echo "=== decision count parity ==="
ls .oat/repo/reference/decisions/*.md 2>/dev/null | grep -v '/index.md$' | wc -l
```

**Print the final migration report** covering:
- files moved (old → new), backlog items re-id'd (old id → new id, any date fallback used),
- decisions split (old ADR/DR → new `dr-YYMMDD-slug`, count parity),
- ad-hoc folders reconciled (confirmed destinations),
- legacy files retired (with folded-in entries), second-roadmap disposition,
- version stamp before → after,
- any flagged follow-ups (e.g. sequence "current-state created from template — backfill",
  dangling references found by the STEP 5 grep).

**Do NOT commit or push** unless the user asks. Leave the changes staged for their review.

---

## Notes for the running agent

- Run independent read-only inventory commands together; gate every mutation behind approval.
- If `oat decision new`/`regenerate` is not yet available in the installed CLI, perform the
  decision split + index generation manually following STEP 3 (write the files; build the
  `| ID | Date | Status | Title | Legacy |` table between
  `<!-- OAT DECISION-INDEX -->` / `<!-- END OAT DECISION-INDEX -->` markers, sorted by date
  then id) and say so in the report.
- Treat `.oat/projects/**` writes (project-scoped folder moves) as confirmed-only.
- This prompt is safe to re-run: STEP 0's idempotency probe short-circuits an
  already-migrated repo.
```