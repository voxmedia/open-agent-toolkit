---
guidance_version: 2026-07-25
last_verified: 2026-07-25
review_after: 2026-09-08
---

# Claude Model Selection

Load this reference when the active harness is Claude Code or the route is a
direct Anthropic API worker. Current user and repository instructions override
the dated model examples below. Launch mechanics for OAT dispatch live in
`oat-dispatch-subagents/references/provider-claude.md`.

## Current Families

- `claude-haiku-4-5`: fastest economical class for straightforward,
  high-volume, mechanically verified work.
- `claude-opus-5`: normal substantive route and the default for
  interpretation-heavy implementation, hard reasoning, and consequential work.
- `claude-sonnet-5`: conditional route when measured latency, throughput,
  access, rate limits, or established-workflow economics beat the relevant
  Opus route.
- `claude-fable-5`: eligibility-gated specialist for a directly relevant
  failure mode, not a universal escalation above Opus.
- `claude-opus-4-8`: compatibility or documented safeguard fallback, not the
  current general primary.

Claude Mythos 5 is invitation-only and intended for approved defensive cyber
work. It is not a general routing candidate unless the organization explicitly
provisions and authorizes it.

## Provider-Native Effort

Never normalize Claude effort against OpenAI or Cursor labels.

- Opus 5: use medium for normal substantive work and high for hard reasoning,
  architecture, ambiguity, and deep review. Use xhigh only when reasoning depth
  is the bottleneck or an evaluated long-horizon workload benefits. Max is
  exceptional and requires a workload-specific effort sweep or an explicit
  quality-first exception.
- Sonnet 5: use medium or high only when measured latency, throughput, access,
  or workload economics justify the conditional route. Do not preserve xhigh
  or max as generic workhorse settings.
- Fable 5: use high or xhigh only for a qualified specialist case. Max is
  exceptional; medium or low are not routine economy substitutes for Opus.
- Haiku 4.5 does not expose the same adaptive-effort surface. Use only controls
  present in the live schema.

Effort changes tool-call behavior as well as prose. Record it independently.
Opus 5 adaptive thinking is on by default; current direct-API behavior rejects
disabling thinking at xhigh or max. Verify the live schema before launch.
Changing effort or speed can invalidate prompt caches. Fable adaptive thinking
is always on in the current API.

## Dated Task-Class Matrix

These routes are dated guidance and benchmark-derived routing hypotheses.
Evaluate them on representative local work before treating fine boundaries as
stable.

| Task class               | Default                             | Economy                                                | Escalation                                          | Floor notes                                                                                     |
| ------------------------ | ----------------------------------- | ------------------------------------------------------ | --------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `mechanical-recon`       | Haiku 4.5                           | Same, with strict output and mechanical verification   | Opus 5 medium                                       | Haiku is below floor for semantic audits and silent-miss-prone exploration.                     |
| `intelligent-recon`      | Opus 5 medium                       | Sonnet 5 medium/high only when its measured route wins | Opus 5 high                                         | Do not use Sonnet low for coding or open-ended recon.                                           |
| `default-implementation` | Opus 5 medium                       | Sonnet 5 medium/high for evaluated bounded throughput  | Opus 5 high                                         | Fable is not a routine implementation or economy route.                                         |
| `hard-reasoning`         | Opus 5 high                         | Opus 5 medium only after narrowing and evaluation      | Opus 5 xhigh for a reasoning-depth bottleneck       | Use max only after a workload-specific effort sweep.                                            |
| `consequential`          | Opus 5 high plus independent review | No routine economy route                               | Opus 5 xhigh when deeper reasoning is also required | Consequence adds review and root authorization; it does not automatically require xhigh or max. |

## Root and Subagent Cost Posture

Preserve strong, low-volume root orchestration. Root calls are
coherence-critical and comparatively infrequent, while bounded subagents carry
most execution volume. Capture routine savings in higher-volume subagents by
routing mechanical work to Haiku and using Sonnet only where a measured
high-volume route wins instead of weakening the root orchestrator.

Opus remains the hard-reasoning and consequential root default. Escalate the
root from Opus to Fable only when unresolved ambiguity, exceptional novelty or
consequence, or a directly relevant Fable strength exposes a failure mode that
Fable is expected to catch and eligibility permits it. This named Fable
instantiation is provisional.

A consequential classification by itself is insufficient.

## Conditional and Specialist Routes

Sonnet remains available when time to first token, active runtime, total elapsed
time, throughput, access, rate limits, or end-to-end workload economics win for
the actual harness. Compare against the relevant Opus effort and service tier,
not an unrelated maximum-effort latency row. A lower token price alone does not
prove lower trajectory cost.

Choose specialist reviewers by anticipated failure mode. Fable is a
provisional candidate for latent-knowledge, missing-domain-concept,
sparse-context, long-horizon, or additional-perspective work. It is unavailable
where zero data retention is required because the current route requires
30-day retention. Provider availability, retention, and controls must be
verified before selection.

Fast mode is a gated latency purchase, not a capability rung. Priority Tier
support and commitments are eligibility constraints; do not infer availability
from another Claude family. Record service tier independently and apply the
multi-measure speed contract from `model-selection-principles.md`.

## Cyber-Sensitive Evidence

For security review, vulnerability triage, auth boundaries, permissions, and
other valid dual-use workflows, start with Opus 5 at the effort warranted by
reasoning depth and pair consequential findings with an independent provider
review.

If a safeguard blocks a valid workflow, record the refusal, preserve the
authorization boundary, and use a documented compatible fallback. Opus 4.8 is
the current fallback target where necessary, not the universal cyber primary.
Do not infer that a stronger safety classifier is a capability weakness. It is
evidence about predictable workflow completion and refusal behavior, not an
exception that inverts the general Opus-first policy.
