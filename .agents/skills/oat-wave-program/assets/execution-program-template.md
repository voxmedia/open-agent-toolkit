---
oat_generated: true
oat_external_plan_index: false
oat_execution_program: true
oat_program_supersedes: { null | path to predecessor program artifact }
oat_program_indexes:
  - { '.oat/repo/reference/external-plans/<index-file>.md' }
created: '{ ISO timestamp }'
---

# Execution Program: { date } ({ corpus description })

This artifact is the durable program map for the external-plan corpus listed in
`oat_program_indexes`. It records wave composition and status. It is not an
executable plan and is not an `oat-project-import-plan` target — each wave runs
as a wrapper OAT project via `oat-wave-execute`, and each plan's implementation
contract remains its immutable plan file.

## Status Ledger

| Wave | Theme     | Lanes | Status                              | Record                                |
| ---- | --------- | ----- | ----------------------------------- | ------------------------------------- |
| W{N} | { theme } | { n } | { composed / in-progress / merged } | { project / PR + SHA / summary link } |

## Wave Table (coverage: { N } plans = { N } index rows; verified { date })

| Plan                      | Index      | Wave | Ordering notes                | Status                                            |
| ------------------------- | ---------- | ---- | ----------------------------- | ------------------------------------------------- |
| [{ plan }](./{ file }.md) | { source } | W{N} | { merge-first / after X / — } | { pending / in-wave / done / deferred / dropped } |

{ Deferred/dropped rows MUST carry reason + re-entry trigger in the notes column. }

## Wave { N }: { theme }

- **Lanes:** { list }
- **Intra-wave ordering:** { which lane merges first/solo and why }
- **Cross-wave prerequisites:** { what this wave needed from earlier waves; what
  it unblocks later }
- **Composition rationale:** { theme/risk/sizing judgment, including any index
  wave-hint overridden and why }
