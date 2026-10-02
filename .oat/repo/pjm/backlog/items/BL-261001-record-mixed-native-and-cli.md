---
id: BL-261001-record-mixed-native-and-cli
title: Record mixed native and CLI recon continuations in the manifest
status: open
priority: low
scope: feature
scope_estimate: M
labels:
  - recon
  - skills
  - codex
  - deferred
assignee: null
created: 2026-10-01T04:53:42.661Z
updated: 2026-10-01T04:53:42.661Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/333
external_plans: []
---

## Description

In the run behind GitHub issue #333, two gather lanes ran as native Codex
agents before an agent-limit rejection, and the operator approved finishing the
other two as ephemeral `codex exec` sessions. Schema-v2 assigns one target to
a homogeneous gather wave and the standard topology allows one gather wave, so
the manifest could not say that the wave ran on two routes. Rewriting the
target would misrepresent the accepted native work, and a second gather wave
would break the topology. The controller kept the original intent, logged a
supplemental continuation by hand, and overrode targets for the later waves;
`prepare-routing` flagged the change as `CONSTRUCTED_TARGET_MISMATCH`, which
was correct.

Proposed shape from the issue: immutable approved intent, plus append-only
amendments and per-lane launch observations, keeping requested selectors
separate from observed runtime identity. The CLI route needs the full leaf
contract in the prompt (no registered role selector), host-owned artifact
persistence, and a record that read limits are prompt-enforced rather than
sandbox-enforced.

- Status 2026-10-01: deferred by the operator. Revisit only if mixed-route
  continuations keep happening after
  `BL-261001-recover-recon-lanes-after` ships its note and bounded retry. This
  adds manifest machinery, so it needs evidence of repeated friction first.

## Acceptance Criteria

- A wave whose lanes ran on different routes is representable without
  rewriting the target of any completed lane.
- Approved intent stays immutable; continuation approvals and per-lane launch
  observations (route, selectors, process or thread ID, terminal status) are
  appended.
- `prepare-routing` and packet validation accept a recorded, approved
  continuation and still reject an unapproved route change.
- The CLI continuation route records that read limits are prompt-enforced and
  that the host persisted the artifact; it never claims to be a native child.
