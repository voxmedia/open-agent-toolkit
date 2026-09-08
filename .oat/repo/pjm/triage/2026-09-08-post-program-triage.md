---
oat_triage_record: true
schema_version: 1
status: verifying
scope: GitHub issues #274 (recon per-wave routing) and #277 (skill authoring guidance refresh), plus a priority/validity re-triage of the 42 open backlog items the 2026-08-31 execution program filed as follow-ups (waves 1–6 and the skill-version migration) and the recap cluster (#230)
baseline_sha: bb93ad233
triage_pr: null
created: 2026-09-08
updated: 2026-09-08
---

# Post-program triage: two untriaged issues and the program's follow-up backlog

## Scope and exclusions

- In scope: open issues #274 and #277 (no disposition label as of 2026-09-08); the 42 backlog items created 2026-09-06 to 2026-09-08 by the execution program's wave closeouts and the migration project; the recap cluster (`BL-260907-replace-the-default-project`, brought onto this branch from `t3code/orient-oat-remote-worktree` commit `a58e03c5d`; `BL-260904-add-recap-seam-config-keys`; issue #230).
- Excluded: issues already carrying a disposition label; backlog items created before 2026-09-05; open PRs #273, #190, #125.

## Evidence baseline

- `origin/main` `bb93ad233` (2026-09-08): the execution program complete (W1–W6 merged; PRs #262, #267, #269, #271, #275, #278; closes #276, #279), the skill-version migration merged (#280, close #281), CLI 0.2.65.
- Verification workers (read-only, opus): one per issue; three over the backlog batches (W1–W4, W5, W6 + recap cluster). Findings are recorded below once returned.

## Disposition ledger

(pending verification)

## Open concerns

- The recap item `BL-260907-replace-the-default-project` reached this branch by cherry-pick (`-x`) because it was never on `main`; PR #273 (its origin branch) does not carry that commit as of its head `01354f278`. If #273 is updated to include it, the identical file merges cleanly, but the backlog index will need one regeneration.

## Resume instructions

(set at PR open)
