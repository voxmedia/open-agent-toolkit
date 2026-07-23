# Model Selection Principles

Read this reference for every dispatch before the active provider reference.
It contains the durable contract. Provider files contain dated examples.

## Selection Unit

Never select from a model family name alone. Preserve these axes separately:

- provider and harness;
- exact model selector and selector granularity;
- provider-native effort or reasoning selector;
- service tier, including fast or priority variants;
- reasoning mode when the provider exposes one independently of effort;
- role, context inheritance, authority, deadline, and route.

Do not normalize effort labels across providers. `medium`, `high`, `xhigh`,
`max`, extended thinking, adaptive thinking, and provider-specific modes have
different semantics. The exact pair or tuple is the route.

## Five Task Classes

Classify in this order: deterministic verifiability, silent-miss risk,
dispersed-context reconciliation, ambiguity or novelty, then consequence.
File count and duration alone never justify escalation.

| Task class               | Qualification contract                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `mechanical-recon`       | Deterministic inventories, parity checks, exact extraction, or command execution whose misses are visible and cheaply verified. |
| `intelligent-recon`      | Interpretation of unfamiliar code, policy, semantics, or evidence where a plausible miss could survive mechanical validation.   |
| `default-implementation` | Independently bounded implementation or dossier work that must retain and reconcile dispersed context.                          |
| `hard-reasoning`         | Ambiguity, novelty, architecture, difficult diagnosis, or competing interpretations dominates.                                  |
| `consequential`          | Security, release safety, irreversible effects, adversarial analysis, foundational decisions, or expensive failure dominates.   |

When uncertain, use the stronger class. Never select below a supplied floor.

## Default, Economy, and Escalation

Provider references may give three routes:

- **Default:** conservative route expected to hold quality without exceptional spend.
- **Economy:** permitted only when scope, verification, and consequences make the downgrade safe.
- **Escalation:** stronger route for ambiguity, unresolved evidence, or consequence.

Economy is not automatically “the smallest model.” Mechanical coding agents
still require enough capability to use tools, follow scope, and return complete
evidence. Prefer scripts over models when a deterministic program fully solves
the task.

## Escalation Boundaries

- Mechanical to intelligent recon when judgment is required to identify a
  finding, or when a miss would be silent.
- Recon to default implementation when success depends on retaining and
  reconciling dispersed context, not merely searching many files.
- Default implementation to hard reasoning when ambiguity, novelty, or
  reasoning difficulty dominates.
- Any class to consequential when security, production impact, irreversibility,
  adversarial behavior, or expensive failure dominates.

Narrow a poorly decomposed task before escalating its model. Model capability
never repairs an over-broad objective.

## Long Context

Large context alone does not change the task class, but it can disqualify a
model. Provider references may set a separate long-context floor based on
published retention evidence. Do not assume a cheap model with a large nominal
context window can use that window reliably.

## Tool Reliability

Schema validity and semantic correctness are separate. For tool-using workers:

- expose the minimum tool set;
- prefer strict schemas when supported;
- document inputs, outputs, errors, and side effects;
- separate read from write authority;
- require exact evidence in the output;
- validate results and mutations outside the model;
- make writes idempotent or confirmation-bound;
- retain authorization in the caller or operator.

Higher effort may change tool-call behavior. Do not lower effort merely because
the final answer is short.

## Service Tiers

A fast or priority tier is a latency control unless the provider explicitly
documents a capability difference. It does not satisfy a higher task-class
floor. Choose it only when wall-clock latency is worth the price and record it
separately from the model and effort.

## Independent Review

For high-risk diffs and foundational decisions, prefer an author and reviewer
from different model families or providers. Agreement is not proof; disagreement
is evidence that the root must resolve. The root verifies every load-bearing
claim and retains final judgment.

## Staleness

Read `evidence-and-refresh.md` when provider guidance is review-required or
stale, a newer model appears, or a current control cannot be expressed. Do not
automatically replace an incumbent with the newest version.
