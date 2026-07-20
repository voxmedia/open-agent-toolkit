# Example fact base: Signal Relay

This fictional example demonstrates a pre-implementation project explainer. All
organizations, systems, and links are illustrative.

## Reconciled claims

- **F-001 — Planned architecture:** The relay accepts signed events, validates
  their envelopes, and writes accepted events to a durable queue.
  Source: [architecture proposal](https://docs.example.com/signal-relay/architecture).
- **F-002 — Delivery:** Workers retry transient delivery failures with bounded
  backoff and move exhausted events to a review queue.
  Source: [delivery design](https://docs.example.com/signal-relay/delivery).
- **F-003 — Validation:** Contract, retry, and recovery tests must pass before
  traffic can move from the existing path.
  Source: [validation plan](https://docs.example.com/signal-relay/validation).

## Reconciliation notes

The proposal gives the queue ownership to the platform team while an older
meeting note assigns it to the application team. The proposal is newer, so
F-001 follows it and records the older assignment as superseded.
