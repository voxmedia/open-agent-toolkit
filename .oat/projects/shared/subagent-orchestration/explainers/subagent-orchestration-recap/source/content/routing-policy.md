The portable half of this project is a routing policy: a way to decide how much
model to spend on a bounded task, stated so it survives the models it names.
This page covers the classes, the axes they are chosen along, and the rule that
keeps the policy honest as the provider landscape moves.

> [!NOTE]
> This is the layer that installs on its own. Nothing here depends on OAT
> dispatch machinery, which is the point of the split.

## The five task classes

| Class                    | What it covers                                                                          | Failure characteristic                                    |
| ------------------------ | --------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `mechanical-recon`       | Inventories, parity checks, enumeration, lint and test runs                             | Misses are visible, so optimize for cost and throughput   |
| `intelligent-recon`      | Interpreting unfamiliar code, semantics, or policy; auditing API usage                  | A miss can be silent, so judgment matters more than speed |
| `default-implementation` | Normal multi-file coding, debugging, reconciling dispersed context                      | Bounded scope, ordinary difficulty                        |
| `hard-reasoning`         | Ambiguous debugging, architecture analysis, competing interpretations                   | Novelty and ambiguity dominate                            |
| `consequential`          | Security, release safety, incidents, irreversible operations, final load-bearing review | Expensive or unrecoverable failure                        |

The classes are ordered by the cost of being wrong, not by how much work is
involved. That distinction does real work: a sweep across hundreds of files is
still mechanical if a miss would be obvious, and a single ambiguous decision can
be consequential.

## Escalation is defined by what dominates

Each boundary names the specific condition that justifies moving up a class,
which keeps escalation from becoming a reflex:

- Mechanical to intelligent recon when a miss would be silent, or when judgment
  is needed to recognize a finding at all.
- Recon to implementation when success depends on retaining and reconciling
  dispersed context, rather than merely searching many files.
- Implementation to hard reasoning when ambiguity or novelty dominates.
  Large context by itself is explicitly not a reason.
- Any class to consequential when security, production impact, irreversibility,
  adversarial behavior, or expensive failure dominates.

> [!IMPORTANT]
> Never route below a class floor. When a task sits between two classes, the
> stronger one wins. The asymmetry is deliberate: under-routing produces a
> plausible wrong answer, which is more expensive than over-routing.

## A model name is not a route

The policy keeps seven properties independent, because collapsing them is how
routing decisions quietly lose information:

| Axis                   | Why it stays separate                                            |
| ---------------------- | ---------------------------------------------------------------- |
| Task class             | The requirement, independent of what satisfies it                |
| Agent role             | Reviewer and implementer differ at equal capability              |
| Exact model selector   | The concrete identity that was launched                          |
| Provider-native effort | `Sol high` and Claude extended thinking are not the same setting |
| Service or fast tier   | A latency purchase, never a capability upgrade                   |
| Authority              | What the child is permitted to do                                |
| Route or harness       | Where it actually ran                                            |

Effort labels are deliberately not normalized across providers. Treating them as
a shared scale would imply an equivalence the providers do not offer.

## Keeping dated guidance honest

Named models are dated examples carrying verification frontmatter, not
commitments. Two rules keep that from decaying into stale policy:

- Exactly one provider reference is read per run, resolved from the active
  harness. Merging them into a single policy is prohibited, because it invites
  inferring Claude behavior from Cursor behavior.
- The live catalog and current instructions always win over a written matrix.

The refresh rule is the sharpest part: **a newer model is a candidate requiring
qualification, never an automatic replacement.** Guidance is re-examined when it
passes its review date, when a new model appears, or when a consequential
decision would rest on evidence that is not current.

Full contract in [PR #172](https://github.com/voxmedia/open-agent-toolkit/pull/172).
