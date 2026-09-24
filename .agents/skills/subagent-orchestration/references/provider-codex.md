---
guidance_version: 2026-09-24
last_verified: 2026-09-24
review_after: 2026-12-22
---

# Codex and OpenAI Model Selection

Load this reference when the active harness is Codex or the route is a direct
OpenAI API worker. Current user and repository instructions override the dated
model examples below. Launch mechanics for OAT dispatch live in
`oat-dispatch-subagents/references/provider-codex.md`.

## Current Families

Use the verified GPT-6 Astra/Sol/Luna model IDs for new Codex work:

- `gpt-6-astra`: Frontier candidate for especially demanding work; the bundled
  recommendation uses high and xhigh, while the supported catalogue also
  permits low, medium, and max;
- `gpt-6-sol`: high-capability implementation and reasoning route;
- `gpt-6-luna`: cost-sensitive, bounded work.

Astra's local task advantage remains unmeasured. Its Frontier inclusion is a
user-directed preference, not acceptance by the separately maintained
model-selection policy. Keep the Sol task-class defaults below until relevant
harness evaluation supports a broader change.

The GPT-5.6 Sol/Luna/Terra targets remain supported for explicit configurations
and established workloads. Re-evaluate economics and qualitative routing on
representative work before carrying over GPT-5.6-specific comparisons.

Direct API specialist routes:

- `gpt-5.4-mini`: economical coding, computer use, and subagent work;
- `gpt-5.4-nano`: classification, extraction, ranking, and simple high-volume
  subagents. Do not use it for semantic repository exploration.

Treat GPT-5.5, GPT-5.4 full, GPT-5.3 Codex, GPT-5.2, and older models as
compatibility, regression, or account-availability routes unless current
workflow evidence prefers them. Do not keep an older model merely because its
name includes `codex`.

## Dated Task-Class Matrix

These are current task-class starting points, not an evaluated ordering across
providers or a promise about relative GPT-6 latency and price. All shown
model/effort pairs are in the local Codex catalogue.

| Task class               | Default                                    | Escalation                                                            | Floor notes                                                                   |
| ------------------------ | ------------------------------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `mechanical-recon`       | `gpt-6-luna`, high                         | `gpt-6-sol`, medium                                                   | Lower effort is suitable only when a miss is cheap and mechanically detected. |
| `intelligent-recon`      | `gpt-6-sol`, medium                        | Sol high                                                              | Preserve verification for silent-miss-prone reconnaissance.                   |
| `default-implementation` | `gpt-6-sol`, medium                        | Sol high                                                              | Luna is for independently bounded, strongly verified work.                    |
| `hard-reasoning`         | `gpt-6-sol`, high                          | Sol xhigh                                                             | Narrow the problem before raising effort.                                     |
| `consequential`          | `gpt-6-sol`, high, plus independent review | Sol xhigh for a reasoning-depth bottleneck; max only after evaluation | The root retains consequential authorization.                                 |

The bundled Frontier ladder ends with Astra xhigh after Sol xhigh and Astra
high. The supported Astra and Sol effort sets both end at max, so Sol max
remains available for explicit configuration even though it is no longer in
the bundled Frontier recommendation.
GPT-5.6 `reasoning.mode: "pro"` is a
separate quality/latency/cost control on that older model, not a GPT-6 effort
label or model slug.

## Long-Context Floor

The former 256K-to-1M Luna retention observation and Sol 272K price step
pertain to GPT-5.6. Do not extrapolate either to GPT-6. Verify GPT-6 context
and pricing contracts against current official documentation and the actual
runtime before cost-sensitive or very large-context dispatch.

## Trajectory Economics

Token list price and total trajectory cost are separate. A model with a higher
output-token price can still cost less per completed task when it uses fewer
output tokens, steps, tool calls, retries, or recoveries. Conversely, a cheap
attempt is not economical when completion rate is low or operator intervention
is high.

Evaluate input, cached-input, and output tokens together with the multi-measure
speed contract from `model-selection-principles.md`. Do not use token price
alone as a proxy for wall-clock efficiency, and do not infer latency from
trajectory length without a measured runtime.

## Tool-Heavy Work

Use Programmatic Tool Calling only for bounded processing such as filtering,
joining, ranking, deduplication, aggregation, or validation over tool results.
Keep stages requiring fresh judgment in direct calls or the root. Declare the
allowed tools, output schema, evidence, concurrency, retries, and stopping
conditions.

Use strict structured outputs for mechanical API workers. Strict schema
conformance does not prove that the chosen tool or semantic result is correct.
