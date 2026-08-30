# Kickoff: BL-260830-migrate-the-legacy-pjm — Migrate the legacy PJM reference layout

> Consume this handoff when starting the dedicated cleanup project. Delete this
> file with `git rm` in the same PR that ships and archives the backlog item.

## Backlog Item

- **ID and title:** `BL-260830-migrate-the-legacy-pjm` — Migrate the legacy PJM
  reference layout
- **Canonical record:**
  [`../backlog/items/BL-260830-migrate-the-legacy-pjm.md`](../backlog/items/BL-260830-migrate-the-legacy-pjm.md)
- **Scope estimate:** M

## Branch and Project Setup

Wait for PR #240 to merge, update a clean checkout from the latest
`origin/main`, and create a dedicated branch such as
`pjm-legacy-reference-layout-cleanup`. Do not continue this work on the
`tool-pack-cleanup` branch.

Use `oat-project-quick-start` with lightweight design enabled. The desired end
state is bounded, but the design artifact should map content ownership and
deletion proofs before implementation. Suggested project name:
`legacy-pjm-reference-layout-cleanup`.

## Verified Starting Point

On 2026-08-30, `pnpm exec oat pjm doctor --json` reported adoption state
`declared` and four layout warning classes:

1. Unknown top-level PJM entries: `.oat/repo/CLAUDE.md` and
   `.oat/repo/explainers/`.
2. Legacy monolith: `.oat/repo/reference/decision-record.md`.
3. Loose reference files: `.oat/repo/reference/CLAUDE.md`, `backlog.md`,
   `backlog-completed.md`, and `project-observations.md`.
4. Duplicate active files: `.oat/repo/reference/current-state.md` and
   `.oat/repo/reference/roadmap.md`.

The six large legacy Markdown files total about 2,852 lines. Their size and
age make blind deletion inappropriate. The `explainers/` directory also holds
generated recap evidence, so an unknown-layout warning is not evidence that
its contents are disposable.

## Authoritative Inputs

- `.oat/repo/AGENTS.md`
- `.oat/repo/pjm/AGENTS.md`
- `.oat/repo/reference/AGENTS.md`
- `.oat/repo/reference/decisions/AGENTS.md`
- `.oat/repo/reference/decisions/index.md`
- `.oat/repo/pjm/current-state.md`
- `.oat/repo/pjm/roadmap.md`
- `.oat/repo/pjm/backlog/`
- `.oat/repo/reference/decision-record.md`
- `.oat/repo/reference/{current-state,roadmap,backlog,backlog-completed,project-observations}.md`

## Required Migration Approach

1. Capture a fresh doctor baseline from the dedicated branch.
2. Run `pnpm exec oat decision migrate --dry-run` and compare every proposed
   record with the existing file-per-decision collection. Resolve collisions or
   duplicates before considering `--delete-legacy`.
3. Diff each loose or duplicate reference file against its canonical owner.
   Move unique durable information first; document why the remainder is safely
   redundant.
4. Classify the top-level `CLAUDE.md` and `explainers/` entries against current
   repository conventions. Relocate or explicitly support valuable content;
   never delete it merely to silence doctor.
5. Apply deletions only after the preservation checks are reviewable in the
   branch diff. Regenerate the decision and backlog indexes using their owning
   CLI commands.
6. Verify that the targeted layout warnings are gone and run the relevant
   repository documentation, formatting, link, and validation gates.

## Closeout

In the shipping PR, run the backlog lifecycle from
`.oat/repo/pjm/AGENTS.md`: archive `BL-260830-migrate-the-legacy-pjm` with a
nonblank outcome summary, regenerate the managed backlog index, refresh the
canonical current state and roadmap, and delete this handoff with `git rm`.
