# Signal Relay project explainer

## Planned architecture

Signed events enter through a narrow HTTP boundary. The service validates each
envelope before placing it on a durable queue; workers own downstream delivery
and isolate exhausted retries in a review queue.

## Decisions

- Keep ingestion stateless so instances can scale independently.
- Persist accepted events before acknowledging them.
- Use bounded retries and a separate review queue instead of retrying forever.

## Risks

The primary risk is an incompatible producer envelope. Contract tests and a
shadow-ingestion period detect that drift before cutover.

## Phases

1. Validate contracts against fixtures.
2. Run shadow ingestion without downstream delivery.
3. Enable canary delivery and compare outcomes.
4. Move remaining traffic after recovery drills pass.

## Validation approach

The release gate combines contract tests, duplicate-delivery tests, queue
recovery drills, and operator sign-off. Supporting evidence is linked from
[the example validation plan](https://docs.example.com/signal-relay/validation).
