# Stoa W6 Handoff Runbook

Use this runbook after `@open-agent-toolkit/cli` 0.2.0 is published. Stoa's
repo-local wave skills remain the rollback source until W6 passes.

## 1. Pin Release Provenance

Release-version placeholder for this handoff:

```text
OAT_RELEASE_VERSION=0.2.0
```

Before migration, verify that exact package exists:

```bash
npm view @open-agent-toolkit/cli@0.2.0 version
```

Expected output: `0.2.0`. If release automation publishes a different version,
replace every `0.2.0` in this runbook with the actual published version before
continuing; do not leave a symbolic or floating version.

In stoa's W6 execution-program artifact, add this provenance line to the W6
section before kickoff:

```text
Packaged wave-skill source: @open-agent-toolkit/cli@0.2.0
```

Commit that pin with the W6 composition update. The artifact must identify one
exact package version, not `latest`, a range, or a branch SHA.

## 2. Migrate Stoa to Packaged Skills

Start from a clean, up-to-date stoa branch. Record the pre-migration commit SHA
as the rollback point, then perform this sequence without reordering:

1. Delete stoa's repo-local canonical copies of `oat-wave-execute` and
   `oat-wave-program`. Do not manually copy toolkit files over them.
2. Run `oat tools update`.
3. Run `oat sync --scope all`.

Verify:

- both canonical skill trees are reinstalled from the workflow pack;
- execute is version 1.5.0 and program is version 1.1.0;
- `bootstrap-group.sh` is executable;
- provider views exist for every provider enabled in stoa;
- `oat status --scope project` reports no unexpected managed-file deletion;
  and
- the migration diff contains only the expected packaged-skill and
  sync-managed changes.

On a failed check, stop before W6 and restore the repo-local copies from the
recorded rollback commit.

## 3. Run W6 and Observe the Reviews Row

Run W6 through the packaged `oat-wave-program` and `oat-wave-execute` skills.
The W6 operator owns this observation task:

1. Immediately before the cross-runtime final gate, capture the final Reviews
   row from the wrapper `plan.md`.
2. Immediately after the gate returns and its result is recorded, capture the
   same row again.
3. Log whether the row stayed correct or was stomped and restored. Include the
   gate run ID, wrapper project path, commit SHA, and before/after row text.
4. Report the observation back to the OAT repository, even when the row stays
   correct.

A clean observation is the trigger to close
`BL-260718-remove-post-w6-reviews-row`. Link the W6 evidence in that backlog
item before archiving it. A stomp keeps the item open with the new evidence.

## 4. Handle a Behavioral Regression

If W6 diverges from the repo-local behavior:

1. Stop and keep stoa on, or restore it to, the recorded repo-local rollback
   commit.
2. Identify the affected standing rule or process step.
3. Diff that row in
   `.oat/projects/shared/wave-skills-promotion/references/equivalence-checklist.md`
   against the frozen source and promoted skill text.
4. Restore the source phrasing for that behavior unless evidence proves a
   narrower correction preserves the same intent. Update the checklist with
   the observed divergence and disposition.
5. Re-run the mini-wave fixture, release validation, lint, type-check, and
   tests.
6. Publish a lockstep OAT patch release and pin that exact patch version in the
   W6 execution-program artifact before retrying.

Do not waive a source requirement to make W6 pass. The fixture remains a smoke
test; W6 is the acceptance gate.
