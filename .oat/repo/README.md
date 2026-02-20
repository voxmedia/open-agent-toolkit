# OAT Repo Records

Tracked, repo-wide OAT records live under `.oat/repo/`.

## Structure

- `reference/`
  - Active reference docs used by ongoing workflow maintenance:
    - `current-state.md`
    - `roadmap.md`
    - `deferred-phases.md`
    - `decision-record.md`
    - `backlog.md`
    - `backlog-completed.md`
- `reviews/`
  - Repo-scoped review artifacts that are intentionally tracked.
- `knowledge/`
  - Generated repo knowledge artifacts produced by `oat-repo-knowledge-index`.
- `analysis/`
  - Generated analysis artifacts produced by OAT analyze skills.
  - Current artifact types:
    - `agent-instructions-YYYY-MM-DD-HHmm.md` — instruction file coverage, quality, and drift reports (from `oat-agent-instructions-analyze`)
  - These artifacts are consumed by apply skills (e.g., `oat-agent-instructions-apply`) to generate or update files.
  - Naming uses timestamp suffixes to prevent same-day collisions.
- `archive/`
  - Historical dogfood-era docs and superseded artifacts kept for context.
  - Typical subdirectories:
    - `past-artifacts/`
    - `research/`
    - `external-plans/`
    - `temp/`

## Conventions

- Keep active operations and maintenance docs in `reference/`.
- Store only non-project, repo-level review outputs in `reviews/`.
- Move stale/superseded material to `archive/` instead of mixing it into active references.
