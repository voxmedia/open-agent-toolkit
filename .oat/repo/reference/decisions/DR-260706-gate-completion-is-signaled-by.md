---
id: DR-260706-gate-completion-is-signaled-by
title: Gate completion is signaled by the JSON envelope not filesystem state
date: 2026-07-06
status: accepted
legacy_id: null
---

# Gate completion is signaled by the JSON envelope not filesystem state

## Context

An autonomous run drove gates by invoking the provider directly
(`codex exec … oat-project-review-provide <scope>`) and then watching the
`reviews/` directory for a file to appear, and elsewhere watched a provider
side-process log for liveness. Both are unreliable: a re-gate can momentarily
surface a prior round's artifact, and a lingering side-process says nothing
about whether the review committed. This produced both false "acted on a stale
verdict" and false "gate hung" errors — even though `oat gate review` already
attributes the produced artifact by a content-hash diff and is immune to the
stale file.

## Decision

The canonical gate-completion signal is the structured result that
`oat --json gate review` writes to stdout on exit, together with the process
exit code — never filesystem polling or provider-log liveness. Every terminal
envelope carries `status` (`ok` | `blocked` | `review_failed` |
`artifact_validation_failed`), a per-invocation `runId`, and — once an artifact
exists — its `generatedAt` (the artifact's `oat_generated_at`), plus
`artifactPath` on the completed paths. Orchestrators run the gate synchronously
and read that envelope. `oat gate review` runs standalone (e.g.
`--review-scope final`), not only inside the `oat-project-implement` loop.

Rejected alternatives: a separate persisted sentinel file or commit trailer
(redundant — the synchronous envelope is already the signal, and `artifactPath`
plus `generatedAt` already close the envelope↔file correlation); stamping a
run-id into the artifact frontmatter (the artifact's own `oat_generated_at` is
already the shared key present in both the envelope and the file).

## Consequences

Autonomous multi-round gating becomes robust instead of heuristic: the caller
knows exactly when the gate finished, which artifact it produced, and which
round it was. The steering is documented in the workflow-gates reference so
orchestrators stop hand-rolling provider invocation. See
[DR-260706-phase-review-gate-is-non](DR-260706-phase-review-gate-is-non.md) and
[DR-260706-review-artifacts-use-seconds](DR-260706-review-artifacts-use-seconds.md).
