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
- `claude-opus-4-8`: strong complex coding and enterprise route, especially at
  xhigh for coding and agentic work.
- `claude-fable-5`: most capable widely released Claude model for long-running
  agents, difficult coding, and frontier knowledge work.

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

| Task class               | Default                          | Economy                                              | Escalation                                    | Floor notes                                                                 |
| ------------------------ | -------------------------------- | ---------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------- |
| `mechanical-recon`       | Haiku 4.5                        | Same, with strict output and mechanical verification | Sonnet 5 medium                               | Haiku is below floor for semantic audits and silent-miss-prone exploration. |
| `intelligent-recon`      | Sonnet 5 high                    | Sonnet 5 medium                                      | Sonnet xhigh, Opus 4.8 xhigh, or Fable 5 high | Do not use Sonnet low for coding or open-ended recon.                       |
| `default-implementation` | Sonnet 5 high                    | Sonnet 5 medium                                      | Sonnet xhigh or Fable 5 high                  | Fable low/medium is not the routine economy route.                          |
| `hard-reasoning`         | Fable 5 high                     | Opus 4.8 xhigh                                       | Fable 5 xhigh                                 | Max is not a default.                                                       |
| `consequential`          | Fable 5 xhigh for non-cyber work | No routine economy route                             | Fable 5 max plus independent review           | Use the cyber-sensitive exception below.                                    |

## Cyber-Sensitive Exception

Fable 5 has a stronger cyber classifier that may flag benign coding and
debugging work. For security review, vulnerability triage, auth boundaries,
permissions, and other dual-use workflows where false-positive blocking would
break the run, prefer Opus 4.8 xhigh as the operational default. Use max only
for exceptional unresolved cases. Pair it with an independent provider review
for consequential findings.

Do not infer that a stronger safety classifier is a capability weakness. This
exception is about predictable workflow completion and refusal behavior.
