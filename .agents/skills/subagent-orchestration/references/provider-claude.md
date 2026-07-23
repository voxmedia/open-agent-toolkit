---
guidance_version: 2026-07-22
last_verified: 2026-07-22
review_after: 2026-09-04
---

# Claude Model Selection

Load this reference when the active harness is Claude Code or the route is a
direct Anthropic API worker. Current user and repository instructions override
the dated model examples below. Launch mechanics for OAT dispatch live in
`oat-dispatch-subagents/references/provider-claude.md`.

## Current Families

- `claude-haiku-4-5`: fastest economical class for straightforward,
  high-volume, mechanically verified work.
- `claude-sonnet-5`: normal workhorse for coding, tool use, knowledge work, and
  agentic execution.
- `claude-opus-4-8`: strong complex coding and enterprise route and the
  default for hard-reasoning and consequential work.
- `claude-fable-5`: exceptional escalation route for the most difficult
  long-running agents, coding, and frontier knowledge work.

Claude Mythos 5 is invitation-only and intended for approved defensive cyber
work. It is not a general routing candidate unless the organization explicitly
provisions and authorizes it.

## Provider-Native Effort

Never normalize Claude effort against OpenAI or Cursor labels.

- Sonnet 5: high is the default workhorse; medium is the cost-saving step down;
  xhigh is for the hardest coding and agentic work; max is exceptional.
- Opus 4.8: start at xhigh for coding and agentic work; use high for other
  intelligence-sensitive work; lower only after evaluation.
- Fable 5: start at high; use xhigh for capability-sensitive work; max is
  exceptional; medium/low are routine-work controls, not the default economy
  substitute for Sonnet.
- Haiku 4.5 does not expose the same adaptive-effort surface. Use only controls
  present in the live schema.

Effort changes tool-call behavior as well as prose. Record it independently.
For Opus 4.8 direct API calls, verify adaptive thinking is enabled as required
by the current API contract. Fable adaptive thinking is always on in the
current API.

## Dated Task-Class Matrix

| Task class               | Default        | Economy                                              | Escalation                                   | Floor notes                                                                               |
| ------------------------ | -------------- | ---------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `mechanical-recon`       | Haiku 4.5      | Same, with strict output and mechanical verification | Sonnet 5 medium                              | Haiku is below floor for semantic audits and silent-miss-prone exploration.               |
| `intelligent-recon`      | Sonnet 5 high  | Sonnet 5 medium                                      | Sonnet xhigh or Opus 4.8 xhigh               | Do not use Sonnet low for coding or open-ended recon.                                     |
| `default-implementation` | Sonnet 5 high  | Sonnet 5 medium                                      | Sonnet xhigh or Opus 4.8 xhigh               | Fable low/medium is not the routine economy route.                                        |
| `hard-reasoning`         | Opus 4.8 xhigh | Sonnet 5 xhigh                                       | Fable 5 xhigh for exceptional escalation     | Unresolved ambiguity or exceptional novelty must justify Fable's incremental cost.        |
| `consequential`          | Opus 4.8 xhigh | No routine economy route                             | Fable 5 xhigh or max plus independent review | A consequential label alone does not justify Fable; retain root authorization and review. |

## Root and Subagent Cost Posture

Preserve strong, low-volume root orchestration. Root calls are
coherence-critical and comparatively infrequent, while bounded subagents carry
most execution volume. Capture routine savings in higher-volume subagents by
routing mechanical work to Haiku and normal implementation to Sonnet instead
of weakening the root orchestrator.

Opus remains the hard-reasoning and consequential root default. Escalate the
root from Opus to Fable only when unresolved ambiguity, exceptional novelty or
consequence, or a directly relevant Fable strength is expected to justify the
incremental cost. A consequential classification by itself is insufficient.

## Cyber-Sensitive Evidence

Fable 5 has a stronger cyber classifier that may flag benign coding and
debugging work. For security review, vulnerability triage, auth boundaries,
permissions, and other dual-use workflows where false-positive blocking would
break the run, Opus 4.8 xhigh remains the operational default. Pair
consequential findings with an independent provider review.

Do not infer that a stronger safety classifier is a capability weakness. It is
evidence about predictable workflow completion and refusal behavior, not an
exception that inverts the general Opus-first policy.
