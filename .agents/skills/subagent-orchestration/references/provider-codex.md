---
guidance_version: 2026-07-25
last_verified: 2026-07-25
review_after: 2026-09-08
---

# Codex and OpenAI Model Selection

Load this reference when the active harness is Codex or the route is a direct
OpenAI API worker. Current user and repository instructions override the dated
model examples below. Launch mechanics for OAT dispatch live in
`oat-dispatch-subagents/references/provider-codex.md`.

## Current Families

Use the GPT-5.6 family for new general coding and knowledge work unless an
existing evaluated workflow requires an older snapshot:

- `gpt-5.6-sol`: frontier capability;
- `gpt-5.6-terra`: intelligence and cost balance;
- `gpt-5.6-luna`: cost-sensitive, high-volume work.

Direct API specialist routes:

- `gpt-5.4-mini`: economical coding, computer use, and subagent work;
- `gpt-5.4-nano`: classification, extraction, ranking, and simple high-volume
  subagents. Do not use it for semantic repository exploration.

Treat GPT-5.5, GPT-5.4 full, GPT-5.3 Codex, GPT-5.2, and older models as
compatibility, regression, or account-availability routes unless current
workflow evidence prefers them. Do not keep an older model merely because its
name includes `codex`.

## Dated Task-Class Matrix

| Task class               | Default                                        | Economy                                                                                            | Escalation                                                                                                       | Floor notes                                                                                     |
| ------------------------ | ---------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `mechanical-recon`       | `gpt-5.6-luna`, `high`                         | Direct API only: `gpt-5.4-mini` medium; `gpt-5.4-nano` medium for strict extraction/classification | `gpt-5.6-terra`, medium or high                                                                                  | Do not use Luna none/low for broad repository work.                                             |
| `intelligent-recon`      | `gpt-5.6-terra`, `high`                        | Terra `medium` with tight scope and verification                                                   | Sol `medium`, then `high`                                                                                        | A silent miss disqualifies Terra none/low.                                                      |
| `default-implementation` | `gpt-5.6-sol`, `medium`                        | Terra `high` for independently bounded, strongly tested work                                       | Sol `high`                                                                                                       | Luna is not the normal implementation lead.                                                     |
| `hard-reasoning`         | `gpt-5.6-sol`, `high`                          | Sol `medium` only after narrowing the problem                                                      | Sol `xhigh`                                                                                                      | Do not automatically escalate Terra to xhigh/max; move to Sol.                                  |
| `consequential`          | `gpt-5.6-sol`, `high`, plus independent review | No routine economy route                                                                           | Sol `xhigh` when deeper reasoning is required; `max` or a separately evaluated `pro` route only after evaluation | Consequence adds review and root authorization; it does not automatically require xhigh or max. |

`reasoning.mode: "pro"` is a separate quality/latency/cost control on GPT-5.6,
not a model slug and not an effort label. Record it independently. Evaluate it
against max or xhigh on representative consequential work before adopting it.

The task-class ladder is work-shape based. Sol is the code-first,
trajectory-efficient route for implementation and hard reasoning; this does
not establish a provider-independent ranking against interpretation-heavy
models in other harnesses. Consequential work requires independent review and
root-owned authorization. It does not automatically force Sol xhigh or max:
choose effort from reasoning depth, then add the consequence controls.

## Long-Context Floor

For very large context, prefer Sol or Terra. Published GPT-5.6 results show a
large Luna retention drop in the 256K-to-1M range. Large context does not change
the task class, but it may disqualify Luna, mini, or nano.

For Sol requests above 272K input tokens, the current direct-API price step is
2× input and 1.5× output. Apply the threshold to the whole request and verify
the live pricing contract before cost-sensitive dispatch. Crossing this
threshold can change the economical route even when Sol remains the capability
choice.

## Trajectory Economics

Token list price and total trajectory cost are separate. A model with a higher
output-token price can still cost less per completed task when it uses fewer
output tokens, steps, tool calls, retries, or recoveries. Conversely, a cheap
attempt is not economical when completion rate is low or operator intervention
is high.

Evaluate input, cached-input, and output tokens together with time to first
token or first useful action, active runtime, total elapsed time, steps and tool
calls, retries, completion rate, variance, and cost per attempted and completed
task. Do not use token price alone as a proxy for wall-clock efficiency, and do
not infer latency from trajectory length without a measured runtime.

## Tool-Heavy Work

Use Programmatic Tool Calling only for bounded processing such as filtering,
joining, ranking, deduplication, aggregation, or validation over tool results.
Keep stages requiring fresh judgment in direct calls or the root. Declare the
allowed tools, output schema, evidence, concurrency, retries, and stopping
conditions.

Use strict structured outputs for mechanical API workers. Strict schema
conformance does not prove that the chosen tool or semantic result is correct.
