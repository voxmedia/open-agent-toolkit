# Legacy PJM Snapshot

This directory preserves the repository's pre-file-backed PJM operating
records. These files are historical evidence, not active backlog, roadmap, or
current-state sources.

## Canonical replacements

- Active backlog: `../../pjm/backlog/items/`
- Completed ledger: `../../pjm/backlog/completed.md`
- Active roadmap: `../../pjm/roadmap.md`
- Active current state: `../../pjm/current-state.md`
- Durable decisions: `../decisions/`

## Preservation disposition

- `backlog-completed.md` preserves 50 January–March 2026 outcomes whose detail
  predates the canonical completed ledger.
- `backlog.md` preserves untriaged historical ideas. Entries here are not
  approved active work; revalidate and promote them through the canonical
  backlog workflow before implementation or plan generation.
- `backlog/` preserves the later file-backed legacy backlog generation.
  `backlog-disposition.md` classifies every record that was still marked active
  when the tree was retired.
- `roadmap.md` and `current-state.md` preserve the old operating snapshot and
  its future-intent notes. Their status language is superseded by the canonical
  PJM files above.

The legacy decision monolith was migrated separately into file-per-record
decisions and intentionally is not retained here.
