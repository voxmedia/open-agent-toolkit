---
id: BL-260727-make-explainer-run-durability
title: Make explainer run durability survive ephemeral environments
status: open
priority: high
scope: task
scope_estimate: M
labels:
  - explainer-kit
  - durability
  - cloud
assignee: null
created: 2026-07-27T14:43:21.655Z
updated: 2026-07-27T14:43:21.655Z
associated_issues: []
external_plans: []
---

## Description

A completed explainer build reports built-not-durable until caller-supplied publish evidence is verified. That status is correct and safe on a developer machine, where the generated run root simply persists on disk until someone chooses what to do with it. In an ephemeral environment it means something materially different and the contract does not distinguish the two cases: the run root is deleted when the workspace is torn down, so built-not-durable silently resolves to work destroyed with no recoverable copy.

This is not hypothetical. The in5-game-cms recap was generated during a Cursor Cloud autonomous run on 2026-07-25. Public sentinel verification returned 401 because that environment requires HTTP basic auth to reach the public root, so the run correctly terminated as built-not-durable. The agent recorded the failure as non-blocking per the lifecycle contract, never reached oat-project-complete, and added the untracked run root to .git/info/exclude. Only lifecycle bookkeeping was committed. The workspace was later torn down.

The rendered HTML happened to survive, but only because an operator separately pushed it to S3 by hand afterwards. The authored markdown source at source/content/project-recap.md did not survive: implementation.md records its SHA-256, and that digest now describes a file that no longer exists anywhere. A hash of an unrecoverable artifact is worse than no record, because it reads like evidence.

Committing generated output by default is not obviously the right remedy and should not be assumed by whoever picks this up. A single recap run currently emits roughly 107 KB of rendered HTML across seven pages, which is build output rather than source. The narrower and more defensible framing is that a run should be able to tell whether its output outlives the process, and when it cannot, it should either persist the source of record or fail loudly rather than recording durability metadata for something about to disappear.

Worth considering, without prejudging the design: detecting ephemeral execution contexts rather than requiring callers to declare them; treating the authored source content differently from rendered build output, since the source is small, is the actual input to a rebuild, and is what was lost here; making built-not-durable in a detected-ephemeral context a loud terminal state instead of a quiet one; and reconsidering whether recording a content digest is appropriate when the run cannot establish that the content persists.

## Acceptance Criteria

- A run can determine whether its output survives the process, without the
  caller having to declare it correctly.
- When output is determined not to survive, the run does not terminate quietly
  as `built-not-durable`. It either persists the source of record or reports a
  loud terminal state naming what will be lost.
- Durability metadata, including content digests, is not recorded for artifacts
  the run cannot establish will persist.
- The decision about whether rendered build output is committed, and on what
  terms, is made explicitly and written down rather than left implicit.
- A regression test reproduces the in5-game-cms shape: a build that succeeds,
  publish evidence that fails verification, and an execution context whose
  filesystem does not outlive the run.

## Notes

Forensic evidence for the originating incident is in the duet worktree at
`.oat/projects/shared/in5-game-cms/`. Commit `dd0995ac0` is the bookkeeping-only
commit that recorded the S3 publication without the artifacts. The surviving
rendered HTML was verified byte-identical to the recorded digest before being
replaced on 2026-07-27.
