---
name: subagent-orchestration
version: 1.0.1
description: Use when delegating work to subagents or choosing a model for a task — routing by task class, selecting provider-specific models and effort, and verifying subagent claims. Covers OpenAI/Codex, Anthropic/Claude, and Cursor.
compatibility: Self-contained; no OAT installation required.
user-invocable: true
---

# Subagent Orchestration

Route work to subagents and models by task class and capability requirements,
not by model name. This skill carries the durable selection contract; its
provider references carry dated model examples that are subordinate to live
catalogs and current user or repository instructions.

## When to Use

- Deciding whether and what to delegate to a subagent.
- Choosing a model, effort, and service tier for a bounded task in any
  harness: Codex, Claude Code, Cursor, or a direct provider API.
- Reviewing whether a dispatch was routed at the right capability class.

This skill is guidance, not dispatch machinery. `oat-dispatch-subagents`
(same pack) owns launch mechanics, catalog intersection, dispatch records,
and recovery; it loads this skill's references as its source of
model-selection policy.

## Ownership: Root Keeps Judgment

- Keep cross-scope synthesis, consequential judgment, authorization,
  destructive or irreversible execution, credentials, and user dialogue in
  the root agent.
- Delegate bounded volume: reconnaissance, enumeration, self-contained
  generation, and independently verifiable work.
- A bounded dossier lead may synthesize within one declared scope; judging
  its output stays in the root.
- Verify load-bearing subagent claims before building on them. Require tool
  evidence, citations, logs, query results, or file references — or an
  independent reviewer — for any claim you will act on.
- Every nontrivial dispatch states: exact objective, bounded scope and
  authority, expected output, verification evidence, and escalation
  conditions. Model routing never repairs poor decomposition — narrow an
  over-broad task before escalating its model.

## Five Task Classes

Classify in order: deterministic verifiability, silent-miss risk,
dispersed-context reconciliation, ambiguity or novelty, then consequence.
File count and duration alone never justify escalation.

| Task class               | Contract                                                                                                                               |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `mechanical-recon`       | Deterministic inventories, parity checks, enumeration, lint/test/build runs. Misses are visible. Optimize for cost and throughput.     |
| `intelligent-recon`      | Interpreting unfamiliar code, semantics, or policy; auditing API usage. A miss could be silent. Needs reliable judgment and tool use.  |
| `default-implementation` | Normal multi-file coding, debugging, and reconciliation of dispersed context in one bounded scope.                                     |
| `hard-reasoning`         | Ambiguous debugging, architecture analysis, novel problems, competing interpretations.                                                 |
| `consequential`          | Security, release safety, incidents, irreversible operations, adversarial analysis, foundational decisions, final load-bearing review. |

Escalation boundaries:

- Mechanical → intelligent recon when a miss would be silent or judgment is
  needed to recognize a finding.
- Recon → default implementation when success depends on retaining and
  reconciling dispersed context, not merely searching many files.
- Default → hard reasoning when ambiguity, novelty, or reasoning difficulty
  dominates. Large context alone is not a reason.
- Any class → consequential when security, production impact,
  irreversibility, adversarial behavior, or expensive failure dominates.

**Never route below a class floor.** When uncertain between two classes, use
the stronger one.

## Selection Axes

Keep these independent; a model family name alone is not a route:

- task class; agent role; exact model selector; provider-native effort or
  reasoning mode; service or fast tier; authority; route or harness.

Do not normalize effort labels across providers — `Sol high`, Claude extended
thinking, and Grok high are provider-native configurations with different
behavior. Treat `-fast` variants as latency purchases, never capability
upgrades, unless provider documentation explicitly says otherwise.

## Provider References

Resolve the active harness and read exactly one:

- Codex or direct OpenAI API: `references/provider-codex.md`
- Claude Code or direct Anthropic API: `references/provider-claude.md`
- Cursor (IDE, CLI, or SDK): `references/provider-cursor.md`

Do not merge provider references into one policy, and do not infer
direct-provider behavior from Cursor behavior or vice versa. Named models in
these references are dated examples with verification frontmatter; the live
catalog and current instructions always win.

Read `references/model-selection-principles.md` for the full durable
contract, and `references/evidence-and-refresh.md` when guidance is past its
review date, a newer model appears, or a consequential decision depends on
evidence that is not current. A newer model is a candidate requiring
qualification, never an automatic replacement.

## Maintenance

This skill is the canonical source of model-selection policy. Downstream
distributions (for example a private team plugin) sync it verbatim. Refresh
the provider references per `references/evidence-and-refresh.md` and update
each file's `guidance_version` frontmatter when incumbents change.
