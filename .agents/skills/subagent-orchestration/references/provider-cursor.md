---
guidance_version: 2026-09-25
last_verified: 2026-09-25
review_after: 2026-12-24
catalog_basis:
  Cursor desktop 3.21.18 resolved Grok 4.6 and Fable 5.1 effort selectors in
  native subagent hooks, and Grok 4.7 only as bare flat IDs; Cursor desktop
  3.20.14 resolved all five Opus 5.5 effort selectors; GPT-6 Sol/Luna were
  absent from the observed Cursor catalog
---

# Cursor Model Selection

Load this reference when the active harness is Cursor (IDE, CLI, or SDK).
Current user and repository instructions override the dated model examples
below. Treat every observed catalog as a volatile snapshot, never a durable
inventory. Launch mechanics for OAT dispatch live in
`oat-dispatch-subagents/references/provider-cursor.md`.

## Harness Rule

Cursor wraps model providers with its own prompts, tools, context management,
agent loop, aliases, and service tiers. Direct-provider evidence informs a
candidate, but Cursor-native evidence should decide a Cursor route when the two
conflict.

The Cursor SDK exposes the Cursor runtime, harness, and models. It is not a
transparent raw OpenAI or Anthropic API call.

Every exact route below is dated and provisional. Verify the live root or
nested catalog, resolved identity, reasoning controls, and fallback behavior
before launch.

## Service-Tier Rule

Treat every alias ending in `-fast` as a service-tier selection, not a higher
capability class, unless current Cursor documentation explicitly says
otherwise. Composer 2.5 fast is documented as the same intelligence at a higher
price. Use standard aliases for background work and fast aliases only when
multi-measure latency evidence justifies the premium.

Record the model and the service tier separately even when Cursor encodes both
in one opaque alias, and apply the multi-measure speed contract from
`model-selection-principles.md`. A lower active runtime or higher output rate
does not by itself prove lower user-observed elapsed time.

## Dated Task-Class Matrix

Use currently approved exact aliases from the Cursor catalogue. On 2026-09-23,
Cursor desktop 3.20.14 resolved all five `claude-opus-5-5[effort=...]`
selectors to corresponding flat IDs in native hooks; on 2026-09-25, Cursor
desktop 3.21.18 did the same for Grok 4.6 and Fable 5.1. See the
probe records at `packages/cli/src/providers/cursor/codec/__fixtures__/README.md`.
GPT-6 Sol/Luna were absent from the observed Cursor catalogue, so their Codex
availability does not authorize Cursor routes.

| Task class               | Default                                                             | Economy                                            | Escalation                                                  | Floor notes                                                                                                      |
| ------------------------ | ------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `mechanical-recon`       | `composer-2.5`                                                      | Same with mechanical verification                  | `gpt-5.6-luna-high`                                         | Fast aliases select service tier, not capability.                                                                |
| `intelligent-recon`      | `cursor-grok-4.6-medium` or `gpt-5.6-sol-medium`                    | `gpt-5.6-terra-high`                               | `gpt-5.6-sol-high`                                          | Verify silent-miss-prone conclusions.                                                                            |
| `default-implementation` | `gpt-5.6-sol-medium`                                                | `composer-2.5` for bounded, testable changes       | `gpt-5.6-sol-high`                                          | `cursor-grok-4.6-medium` or `-high` is the Cursor-native alternative by difficulty.                              |
| `hard-reasoning`         | `gpt-5.6-sol-high`                                                  | `cursor-grok-4.6-high` with corroborating evidence | `gpt-5.6-sol-xhigh`                                         | Opus 5.5 high/xhigh and Fable 5.1 thinking high are verified alternatives; qualify task performance separately.  |
| `consequential`          | An eligible high-effort author with independent cross-family review | No routine economy route                           | Sol xhigh for a depth bottleneck; max only after evaluation | If independent review cannot be met among approved Cursor mappings, use a separately qualified provider or stop. |

## Current Opus 5.5 Pin Evidence

Cursor desktop 3.20.14 resolved `claude-opus-5-5[effort=low|medium|high|xhigh|max]`
to `claude-opus-5-5-low|medium|high|xhigh|max`, respectively, on 2026-09-23.
Both the `subagentStart.subagent_model` and the subagent Shell `preToolUse.model`
agreed for every rung. The Sonnet 5 high positive control resolved to
`claude-sonnet-5-thinking-high`. An unknown family fell back to
`cursor-grok-4.6-high-fast`; an unknown effort on Opus 5.5 fell back to
`claude-opus-5-5-medium`. The provenance summary at `packages/cli/src/providers/cursor/codec/__fixtures__/README.md`
links the adjacent redacted summary and native-event JSONL records containing
the exact observations. Recheck live availability before launch.

## Current Grok 4.6, Fable 5.1, and Grok 4.7 Pin Evidence

Cursor desktop 3.21.18 resolved `grok-4.6[effort=low|medium|high|xhigh,fast=false]`
to `cursor-grok-4.6-low|medium|high|xhigh` and
`claude-fable-5-1[effort=low|medium|high|xhigh|max]` to
`claude-fable-5-1-thinking-low|medium|high|xhigh|max` on 2026-09-25, with the
subagent Shell `preToolUse.model` agreeing for every rung. Fable 5.1 selectors
always resolve to thinking variants; its unknown-effort control fell back to
`claude-fable-5-1-thinking-high`. Sonnet 5 high and Grok 4.5 high positive
controls reproduced their approved mappings, and the unknown-family control
fell back to the account default, `grok-4.7-high-fast`.

Grok 4.7 has no approved mapping. Every bracket spelling tried
(`grok-4.7[effort=...]` with and without `fast`, `reasoning=`, and
`grok-4-7[...]`) fell back to that same account default, which is easy to
mistake for success because it is itself a Grok 4.7 model. Only bare flat IDs
such as `grok-4.7-medium` resolved as requested, and the approved catalogue
does not emit bare IDs. Do not pin Grok 4.7 until a mapping is approved.

## Historical Opus Cursor Probe Evidence (Retired)

The following observations document Cursor 3.12.30 behavior on 2026-07-25.
They no longer qualify those generations for current recommendations or the
active approved mapping catalogue. A new family needs its own live probe.

Five Opus 5 effort rungs plus an Opus 4.8 rung were
probe-verified on 2026-07-25 against Cursor 3.12.30, using `subagentStart`
lifecycle hooks to read the resolved model that Cursor itself reports:

| Selector                        | Resolves to                      |
| ------------------------------- | -------------------------------- |
| `claude-opus-5[effort=low]`     | `claude-opus-5-thinking-low`     |
| `claude-opus-5[effort=medium]`  | `claude-opus-5-thinking-medium`  |
| `claude-opus-5[effort=high]`    | `claude-opus-5-thinking-high`    |
| `claude-opus-5[effort=xhigh]`   | `claude-opus-5-thinking-xhigh`   |
| `claude-opus-5[effort=max]`     | `claude-opus-5-thinking-max`     |
| `claude-opus-4-8[effort=xhigh]` | `claude-opus-4-8-thinking-xhigh` |

Every rung resolves to the thinking variant. This is a verified fact, not an
inference: the catalog carries distinct non-thinking IDs at low, medium, and
high, and none were selected.

That historical result did not validate an Opus 5.5 selector; the 2026-09-23
probe above independently qualifies its five selectors. Even where the
requested effort has the same spelling across generations, preserve the old
probe only as evidence of past behavior and use the current approved catalogue
for dispatch.

### Unresolvable selectors fall back to a default, silently

The historical probe showed that Cursor did not reject a malformed pin. It substitutes a
default for whichever component it cannot resolve, with no error or warning:

- An unknown family falls back to the default model. `claude-opus-9[effort=high]`
  resolved to `cursor-grok-4.5-high-fast`.
- An unknown effort falls back to the family's default rung.
  `claude-opus-5[effort=ultra]` resolved to `claude-opus-5-thinking-high`.

The default rung is family-specific, not a fixed value. In that catalog snapshot
exactly one rung per family carries an unqualified display label, and that marks
the default: `claude-opus-5-high` shows as `Opus 5 1M` while
`claude-opus-5-medium` shows as `Opus 5 1M Medium`. The default is not always
high — `claude-opus-4-7-xhigh` shows as `Opus 4.7 1M` while
`claude-opus-4-7-high` is explicitly labeled `Opus 4.7 1M High`.

This makes a typo in a pinned selector more dangerous than a plain downgrade.
The pin silently tracks whatever Cursor currently designates as that family's
default, so a vendor-side change to the default rung alters capability with no
corresponding change in the repository.

Two consequences for pinning. A selector must be probe-verified per mapping
before it ships. And a probe whose requested rung happens to equal the family
default cannot, on its own, distinguish an honored effort parameter from an
ignored one; verify at least one non-default rung in the same family.

Neither an agent self-report nor a subagent card label is admissible evidence.
The card label drops the thinking qualifier and cannot distinguish the thinking
and non-thinking variants.

## Broader Cursor Routes

- `cursor-grok-4.6-medium`: primary alternative for intelligent recon and
  general implementation; strong for code exploration, brainstorming, research
  synthesis, debugging, broad knowledge work, and judgment-heavy tool
  workflows. Prefer medium to xhigh by default: medium scores higher on
  DeepSWE at lower cost and runtime.
- `cursor-grok-4.6-high`: economy route for hard reasoning, architecture,
  ambiguous debugging, and incident diagnosis. Use xhigh only after an effort
  comparison shows it helps.
- `cursor-grok-4.6-low`: simpler tool workflows; prefer `composer-2.5` for
  highly mechanical work on cost.
- `cursor-grok-4.5-*`: still approved for explicit configurations, superseded
  by Grok 4.6 in the bundled preference.
- Grok is never the sole final authority for a consequential factual, security,
  incident, or architectural conclusion. Require tool evidence, citations,
  logs, query results, or file references for load-bearing Grok claims, or
  pair it with an eligible independent cross-family reviewer.
- CursorBench caveat: Cursor disclosed that Cursor repository data entered
  Grok 4.5's training mixture. Do not carry that caveat onto Grok 4.6, whose
  CursorBench results are current but still harness-specific evidence.
- `claude-fable-5-1-thinking-high`: eligible specialist for hard reasoning and
  the bundled Frontier terminal target; xhigh only for evaluated long-horizon
  work. Cursor lists Fable as "NO ZDR"; confirm retention eligibility.
- `claude-sonnet-5-thinking-high`: strong provider-diversity alternative for
  normal implementation and agentic work when available.
- `gpt-5.4-mini-medium`: economical general tool and coding worker.
- `gpt-5.4-nano-medium`: strict extraction, classification, ranking, and simple
  read-only tool calls. Not a semantic repository worker.
- Gemini, Kimi, GLM, GPT-5.5/5.4/5.3 Codex/5.2, and older Claude aliases:
  compatibility, availability, or task-specific alternatives. Do not make them
  defaults without current relevant evidence.

`auto` is allowed for interactive convenience only. It is prohibited for
class-constrained dispatch, repeatable evaluations, auditable automation, and
consequential work because the exact model is not a stable input.
