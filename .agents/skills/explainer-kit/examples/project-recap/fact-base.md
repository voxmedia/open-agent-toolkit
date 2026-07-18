# Example fact base: Atlas Index recap

This fictional fact base demonstrates a completed-project recap.

## Reconciled claims

- **F-101 — Request:** Replace a nightly full rebuild with incremental indexing
  while preserving the existing query contract.
  Source: [approved request](https://docs.example.com/atlas-index/request).
- **F-102 — As built:** A checkpointed change reader feeds idempotent index
  workers; a scheduled audit detects drift.
  Source: [as-built record](https://docs.example.com/atlas-index/as-built).
- **F-103 — Validation:** Contract, restart, and sampled parity checks passed.
  Source: [validation evidence](https://docs.example.com/atlas-index/evidence).
- **F-104 — Outcome:** Incremental indexing is active and the nightly rebuild
  remains available only as a recovery procedure.
  Source: [outcome record](https://docs.example.com/atlas-index/outcome).

## Reconciliation notes

An early plan proposed one shared checkpoint. Implementation evidence records a
checkpoint per partition, so F-102 treats the implementation as authoritative.
