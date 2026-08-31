# OAT Repo Records

Tracked, repository-wide OAT records live under .oat/repo/.

## Structure

- pjm/
  - Active operational state:
    - current-state.md
    - roadmap.md
    - backlog/ for active, completed, archived, review, and generated index
      records
    - handoffs/ for temporary project kickoff handoffs
    - triage/ for durable issue-triage ledgers
- reference/
  - Append-mostly durable records:
    - decisions/ for file-per-record decisions and the generated index
    - project-summaries/ for archived project closeouts
    - external-plans/ for imported or generated implementation plans
    - explainers/ for durable repository-level explainer runs
- reviews/
  - Repository-scoped review artifacts that are intentionally tracked.
- knowledge/
  - Generated repository knowledge artifacts.
- analysis/
  - Generated multi-angle, comparison, synthesis, and instruction-analysis
    artifacts.
- research/
  - Generated repository research artifacts.
- archive/
  - Historical dogfood-era documents and superseded artifacts retained for
    context.

## Conventions

- Keep active operations in pjm/ and durable history in reference/.
- Follow pjm/AGENTS.md for backlog lifecycle and handoff ownership.
- Follow reference/AGENTS.md for durable destinations.
- Create decisions through the supported decision workflow; do not recreate a
  decision-record.md monolith.
- Store non-project repository-level explainer output under
  reference/explainers/.
- Move stale or superseded material to a documented durable destination instead
  of mixing it into active operational state.
