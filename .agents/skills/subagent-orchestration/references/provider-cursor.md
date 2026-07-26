---
guidance_version: 2026-07-25
last_verified: 2026-07-25
review_after: 2026-09-04
catalog_basis:
  live `cursor-agent models` catalog and CursorBench 3.2, with Opus 5
  and Opus 4.8 pin selectors probe-verified against Cursor 3.12.30 via
  subagentStart lifecycle hooks
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
in one opaque alias. Measure time to first token or first useful action, active
runtime, total elapsed time, tokens, steps or tool calls, completion rate, and
variance. A lower active runtime or higher output rate does not by itself prove
lower user-observed elapsed time.

## Dated Task-Class Matrix

Use exact aliases from the live catalog. The examples below were present in the
user's 2026-07-21 snapshot.

| Task class               | Default                                                                  | Economy                                                                              | Escalation                                                                   | Floor notes                                                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mechanical-recon`       | `composer-2.5`                                                           | `composer-2.5`                                                                       | `gpt-5.6-luna-high`                                                          | Use `composer-2.5-fast` or Luna fast only for latency, not capability.                                                                                             |
| `intelligent-recon`      | `cursor-grok-4.5-medium` or `gpt-5.6-sol-medium`                         | `gpt-5.6-terra-high`                                                                 | `gpt-5.6-sol-high`                                                           | Grok medium is a primary route; Sol medium is the conservative silent-miss alternative; Terra high is the cost-saving route.                                       |
| `default-implementation` | `gpt-5.6-sol-medium`                                                     | `composer-2.5` for bounded, testable changes                                         | `claude-opus-5-thinking-medium`                                              | Sol is the code-first incumbent; Opus 5 medium is the substantive route for interpretation-heavy work; `cursor-grok-4.5-medium` remains a primary alternative.     |
| `hard-reasoning`         | `claude-opus-5-thinking-high`                                            | `cursor-grok-4.5-high` for architecture, ambiguous debugging, and incident diagnosis | `claude-opus-5-thinking-xhigh`, then `gpt-5.6-sol-xhigh` for code-first work | Opus 5 high is the starting point. Escalate to xhigh only for a reasoning-depth bottleneck. Do not infer cross-provider effort equivalence.                        |
| `consequential`          | `gpt-5.6-sol-xhigh` authoring plus `claude-opus-5-thinking-xhigh` review | No routine economy route                                                             | Sol max plus Opus 5 max, only after a workload-specific sweep                | Consequence adds independent cross-family review and root authorization, not automatic top effort. For cyber-sensitive review, do not rely on Fable or Grok alone. |

## Verified Opus 5 Cursor Routes

Opus 5 is a qualified Cursor route. Five effort rungs plus an Opus 4.8 rung were
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

Routing follows the accepted conclusions rather than the effort ladder alone.
Opus 5 medium is the normal substantive route, high is the hard-reasoning
starting point, xhigh is selective for a reasoning-depth bottleneck or an
evaluated long-horizon benefit, and max requires a workload-specific sweep or an
explicit exception. Sol remains the code-first, trajectory-efficient engineering
route; Opus is generally stronger for interpretation-heavy work. Exact
cross-provider substitutions remain provisional.

Opus 4.8 xhigh is catalogued so the cyber-sensitive route is dispatchable, but it
is deliberately excluded from the bundled recommendation. Select it explicitly
when the cyber-sensitive refusal profile is required.

### Unresolvable selectors fall back to a default, silently

Probing showed that Cursor does not reject a malformed pin. It substitutes a
default for whichever component it cannot resolve, with no error or warning:

- An unknown family falls back to the default model. `claude-opus-9[effort=high]`
  resolved to `cursor-grok-4.5-high-fast`.
- An unknown effort falls back to the family's default rung.
  `claude-opus-5[effort=ultra]` resolved to `claude-opus-5-thinking-high`.

The default rung is family-specific, not a fixed value. In the live catalog
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

- `cursor-grok-4.5-medium`: primary alternative for intelligent recon and
  general implementation; strong for code exploration, brainstorming, research
  synthesis, debugging, broad knowledge work, and judgment-heavy tool
  workflows.
- `cursor-grok-4.5-high`: economy route for hard reasoning, architecture,
  ambiguous debugging, and incident diagnosis.
- `cursor-grok-4.5-low`: simpler tool workflows; prefer `composer-2.5` for
  highly mechanical work on cost.
- Grok is never the sole final authority for a consequential factual, security,
  incident, or architectural conclusion. Require tool evidence, citations,
  logs, query results, or file references for load-bearing Grok claims, or
  pair it with an eligible independent cross-family reviewer.
- CursorBench caveat: Cursor disclosed that Cursor repository data entered
  Grok 4.5's training mixture. Treat its ranking as evidence of
  competitiveness, not proof of superiority over nearby frontier models.
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
