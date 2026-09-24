---
guidance_version: 2026-09-23
last_verified: 2026-09-23
review_after: 2026-12-22
---

# Claude Model Selection

Load this reference when the active harness is Claude Code or the route is a
direct Anthropic API worker. Current user and repository instructions override
the dated model examples below. Launch mechanics for OAT dispatch live in
`oat-dispatch-subagents/references/provider-claude.md`.

## Current Families

- `claude-haiku-4-5`: fastest economical class for straightforward,
  high-volume, mechanically verified work.
- `claude-opus-5-5`: normal substantive route and the default for
  interpretation-heavy implementation, hard reasoning, and consequential work.
- `claude-sonnet-5`: conditional route when measured latency, throughput,
  access, rate limits, or established-workflow economics beat the relevant
  Opus route.
- `claude-fable-5-1`: eligibility-gated specialist for a directly relevant
  failure mode, not a universal escalation above Opus.

Claude Mythos 5 is invitation-only and intended for approved defensive cyber
work. It is not a general routing candidate unless the organization explicitly
provisions and authorizes it.

## Provider-Native Effort

Never normalize Claude effort against OpenAI or Cursor labels.

For OAT-managed Claude reviewers and phase implementers, explicit effort is
definition-bound. Classify the task here, choose an eligible configured
model/effort pair, resolve it, and launch the exact generated agent variant.
The Agent call has no effort field. If it also supplies a model, that model must
match the generated definition. Model-only candidates retain their existing
native model argument behavior, and inherited targets leave both axes to the
host.

- Opus 5.5: use low for bounded intelligent recon with source checks, medium
  for normal substantive work, and high for hard reasoning, architecture,
  ambiguity, and deep review. Use xhigh only when reasoning depth
  is the bottleneck or an evaluated long-horizon workload benefits. Max is
  exceptional and requires a workload-specific effort sweep or an explicit
  quality-first exception.
- Sonnet 5: use medium or high only when measured latency, throughput, access,
  or workload economics justify the conditional route. Do not preserve xhigh
  or max as generic workhorse settings.
- Fable 5.1: use high or xhigh only for a qualified specialist case. Max is
  exceptional; medium or low are not routine economy substitutes for Opus.
- Haiku 4.5 does not expose the same adaptive-effort surface. Use only controls
  present in the live schema.

Effort changes tool-call behavior as well as prose. Record it independently.
Opus 5.5 adaptive thinking is always on in the current direct API. Verify the
live schema before launch.
Changing effort or speed can invalidate prompt caches. Fable adaptive thinking
is always on in the current API.

## Dated Task-Class Matrix

These routes are dated guidance and benchmark-derived routing hypotheses.
Evaluate them on representative local work before treating fine boundaries as
stable.

| Task class               | Default                               | Economy                                                | Escalation                                            | Floor notes                                                                                     |
| ------------------------ | ------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `mechanical-recon`       | Haiku 4.5                             | Same, with strict output and mechanical verification   | Opus 5.5 medium                                       | Haiku is below floor for semantic audits and silent-miss-prone exploration.                     |
| `intelligent-recon`      | Opus 5.5 low                          | Sonnet 5 medium/high only when its measured route wins | Opus 5.5 medium; high when deeper reasoning is needed | Verify silent-miss-prone conclusions; do not use Sonnet low for open-ended recon.               |
| `default-implementation` | Opus 5.5 medium                       | Sonnet 5 medium/high for evaluated bounded throughput  | Opus 5.5 high                                         | Fable is not a routine implementation or economy route.                                         |
| `hard-reasoning`         | Opus 5.5 high                         | Opus 5.5 medium only after narrowing and evaluation    | Opus 5.5 xhigh for a reasoning-depth bottleneck       | Use max only after a workload-specific effort sweep.                                            |
| `consequential`          | Opus 5.5 high plus independent review | No routine economy route                               | Opus 5.5 xhigh when deeper reasoning is also required | Consequence adds review and root authorization; it does not automatically require xhigh or max. |

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

A stronger safety classifier is a specialist consideration, not an exception that inverts the general Opus-first policy. A consequential classification by itself is insufficient.

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

## Eligibility, Retention, and Service Constraints

Eligibility filters the candidate set before capability or economy is compared.
A route that fails one of these gates is unavailable regardless of benchmark
standing. The non-Opus constraints are dated observations; reverify against the live
schema and the organization's actual plan before launch. Do not transfer Opus 5
service-tier or retention claims to Opus 5.5 without fresh evidence.

| Constraint          | Opus 5.5      | Sonnet 5      | Fable 5.1                  | Haiku 4.5     |
| ------------------- | ------------- | ------------- | -------------------------- | ------------- |
| Zero data retention | verify live   | eligible      | **unavailable**, needs 30d | eligible      |
| Priority Tier       | verify live   | not supported | supported                  | verify live   |
| Fast mode           | verify live   | no            | no                         | no            |
| Long context        | verify live   | 1M standard   | 1M standard                | verify live   |
| Claude Code minimum | version-gated | version-gated | version-gated              | version-gated |

- Zero data retention removes Fable from the route set outright. Check the
  retention requirement before selecting a specialist reviewer.
- Priority Tier commitments are closed to new buyers, so this matters only for
  an existing commitment. Do not infer availability from another Claude family.
- Fast mode is a gated latency purchase, not a capability rung.
- Claude 4.6 and later families use their full 1M context windows at standard
  rates. Do not carry a competitor's long-context surcharge model across to
  Claude; the Codex Sol threshold step is a Sol fact, not a general one.
- Claude Code enforces family-specific minimum versions. Verify the installed
  runtime rather than assuming the catalog entry is launchable.

Record service tier independently and apply the multi-measure speed contract
from `model-selection-principles.md`.

## Cyber-Sensitive Evidence

For security review, vulnerability triage, auth boundaries, permissions, and
other valid dual-use workflows, start with Opus 5.5 at the effort warranted by
reasoning depth and pair consequential findings with an independent provider
review.

If a safeguard blocks a valid workflow, record the refusal, preserve the
authorization boundary, and choose only a currently supported, authorized
compatible route. Retired Opus 4.8/5.0 generations are not active fallbacks.
