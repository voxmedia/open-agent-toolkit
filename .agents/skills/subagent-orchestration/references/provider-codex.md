---
guidance_version: 2026-11-21
last_verified: 2026-11-21
review_after: 2027-02-19
---

# Codex and OpenAI Model Selection

Load this reference when the active harness is Codex or the route is a direct
OpenAI API worker. Current user and repository instructions override the dated
model examples below. Launch mechanics for OAT dispatch live in
`oat-dispatch-subagents/references/provider-codex.md`.

## Current Families

Use `gpt-6.1-terra` low for mechanical recon and medium for scoped
intelligent recon, `gpt-6.2-sol` for implementation, and `gpt-6-luna` for
checked input-heavy work. OAT refreshed the Sol and Astra pins in their existing
slots on November 21, 2026, by maintainer direction. Use these exact IDs for
Codex dispatch. Cursor selectors require separate native evidence.

- `gpt-6.2-astra`: Frontier candidate for especially demanding work. The bundled
  recommendation uses high and xhigh. The supported catalogue also permits
  low, medium, and max.
- `gpt-6.1-terra`: mechanical recon at low and scoped intelligent recon at
  medium. The supported catalogue also permits high and xhigh. It does not
  include max;
- `gpt-6.2-sol`: high-capability implementation and reasoning route;
- `gpt-6-luna`: checked input-heavy, bounded work.

The September frontier-release comparison measured earlier generations. Use
representative OAT workloads to assess relative quality, cost, and latency
for GPT-6.2. GPT-6.1 Sol (`gpt-6.1-sol`), GPT-6 Astra (`gpt-6-astra`),
GPT-6 Sol (`gpt-6-sol`), and the GPT-5.6 Sol, Luna, and Terra targets remain
supported for explicit configurations.

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
providers or a promise about relative GPT-6-family latency and price. All shown
model/effort pairs are in the local Codex catalogue.

| Task class               | Default                                      | Escalation                                                            | Floor notes                                                                   |
| ------------------------ | -------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `mechanical-recon`       | `gpt-6.1-terra`, low                         | `gpt-6-luna`, high                                                    | Lower effort is suitable only when a miss is cheap and mechanically detected. |
| `intelligent-recon`      | `gpt-6.1-terra`, medium                      | `gpt-6.2-sol`, medium                                                 | Preserve verification for silent-miss-prone reconnaissance.                   |
| `default-implementation` | `gpt-6.2-sol`, medium                        | Sol high                                                              | Luna is for independently bounded, strongly verified work.                    |
| `hard-reasoning`         | `gpt-6.2-sol`, high                          | Sol xhigh                                                             | Narrow the problem before raising effort.                                     |
| `consequential`          | `gpt-6.2-sol`, high, plus independent review | Sol xhigh for a reasoning-depth bottleneck; max only after evaluation | The root retains consequential authorization.                                 |

[OpenAI's model catalog](https://developers.openai.com/api/docs/models) lists
`gpt-6.2-sol` and `gpt-6.2-astra` at `low`, `medium`, `high`, `xhigh`, and
`max`. The November 20 Codex model cache lists these same pairs. OAT materializes
these five efforts for each model. For direct API tool calls, use the Responses API.

The bundled Frontier ladder orders Sol 6.2 xhigh, Astra 6.2 high, then Astra 6.2
xhigh. Both models support max in explicit OAT configurations.
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
