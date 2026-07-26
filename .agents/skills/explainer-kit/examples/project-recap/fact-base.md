# Example fact base: Atlas Index recap

This fictional fact base demonstrates a completed-project recap. The prose below
is the human-readable view; `fact-base.json` beside it is the same evidence in
the `explainer-kit.fact-base/v1` shape a run actually consumes, with each claim
tagged to the narrative section it belongs to.

## Reconciled claims

- **F-101 — Request:** Replace a nightly full rebuild with incremental indexing
  while preserving the existing query contract.
  Source: [approved request](https://docs.example.com/atlas-index/request).
- **F-102 — Decisions:** Checkpoints are partition-local, writes are idempotent,
  and the full rebuild is retained as a recovery path.
  Source: [decision log](https://docs.example.com/atlas-index/decisions).
- **F-103 — As built:** A checkpointed change reader feeds idempotent index
  workers; a scheduled audit detects drift.
  Source: [as-built record](https://docs.example.com/atlas-index/as-built).
- **F-104 — Implementation:** Checkpoint persistence, replay-safe workers, and
  the drift audit shipped across three milestones.
  Source: [milestone record](https://docs.example.com/atlas-index/milestones).
- **F-105 — Validation:** Contract, restart, duplicate-delivery, and sampled
  parity checks passed.
  Source: [validation evidence](https://docs.example.com/atlas-index/evidence).
- **F-106 — Outcome:** Incremental indexing is active and the nightly rebuild
  remains available only as a recovery procedure.
  Source: [outcome record](https://docs.example.com/atlas-index/outcome).

## Unresolved

- **F-107 — Retention:** How long audit samples are kept is still a governance
  question, so the recap reports it as unresolved rather than deciding it.

## Reconciliation notes

An early plan proposed one shared checkpoint. Implementation evidence records a
checkpoint per partition, so F-102 treats the implementation as authoritative.

## Companion draft

`content.md` is the authored floor draft this evidence supports. It is written
for the v2 authoring model: tables, a fenced `diagram` block, a `timeline`,
callouts, and lists, all of which the deterministic narrative renderer turns
into real structured HTML rather than flat paragraphs.
