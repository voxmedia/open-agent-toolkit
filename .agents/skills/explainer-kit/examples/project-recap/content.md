# Atlas Index project recap

## Original request

Every correction to the fictional Atlas Index corpus had to wait for the next
overnight window, and the cost of that window grew with the corpus. The team was
asked to make indexing continuous without asking a single caller to change how
they query.

> [!IMPORTANT]
> The query contract was frozen for the whole engagement. Any option that would
> have reshaped a response was out of scope before it was evaluated.

## Key agent decisions

| Decision                     | Alternative weighed          | Why it won                                         |
| ---------------------------- | ---------------------------- | -------------------------------------------------- |
| Checkpoint each partition    | A single global checkpoint   | Replay after a crash stays inside one partition    |
| Make writes idempotent first | Deduplicate in each consumer | Retry safety belongs to the writer, not the reader |
| Keep the rebuild as recovery | Delete it after cutover      | A proven fallback costs almost nothing to retain   |

Each row records what was chosen and what it was chosen over, so a later reader
can reconstruct the reasoning rather than just the result.

## As-built architecture

```diagram
graph TD
  reader[Change reader] --> queue(Batch queue)
  queue --> worker[Index worker]
  worker --> index[Search index]
  audit{Drift beyond threshold} -->|yes| recovery[Recovery task]
  index --> audit
```

The reader resumes from whichever checkpoint its partition last committed, so a
restart repeats at most one batch. Workers apply batches by key, which makes a
repeated batch indistinguishable from a first delivery. The audit closes the
loop by sampling both sides on a schedule and opening a recovery task only when
the difference clears the accepted threshold.

## Implementation record

```timeline
2026-02-03 — Checkpoint persistence landed behind a flag
2026-02-17 — Replay-safe workers replaced the batch writer
2026-03-02 — Drift audit and the recovery runbook shipped
```

- The first milestone changed only bookkeeping, so it could ship dark.
- The second made retries safe, which is what unlocked automatic recovery.
- The third added the observability the operators asked for before cutover.

## Validation evidence

| Suite              | Scope                                       | Result    |
| ------------------ | ------------------------------------------- | --------- |
| Contract           | Query responses across the fixture corpus   | Unchanged |
| Restart            | Interruption at every checkpoint boundary   | No gaps   |
| Duplicate delivery | The same batch applied twice                | No drift  |
| Parity sampling    | Scheduled samples against the source record | In budget |

The full logs sit in the fictional
[evidence index](https://docs.example.com/atlas-index/evidence).

> [!NOTE]
> How long audit samples should be retained is still an open governance
> question, and it is tracked outside this recap.

## Outcome

Corrections now reach readers in minutes instead of waiting for a nightly
window, and the operational surface got smaller rather than larger.

1. Continuous indexing is the normal path.
2. The rebuild remains documented, exercised, and unused.
3. Drift is a monitored quantity rather than an assumption.
