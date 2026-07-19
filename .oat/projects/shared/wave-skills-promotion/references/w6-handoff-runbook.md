# Stoa W6 Handoff Runbook

Use this runbook after `@open-agent-toolkit/cli` 0.2.1 is published. Stoa's
repo-local wave skills remain the rollback source until W6 passes.

## 1. Pin Release Provenance

Release-version placeholder for this handoff:

```text
OAT_RELEASE_VERSION=0.2.1
```

Before migration, verify the contents of that exact package. Package existence
alone is insufficient: 0.1.76 was published on the same day without the wave
skills.

```bash
OAT_RELEASE_VERSION=0.2.1
PACK_DIR="$(mktemp -d)"
PACK_TARBALL="$(
  npm pack "@open-agent-toolkit/cli@${OAT_RELEASE_VERSION}" \
    --pack-destination "$PACK_DIR" --silent
)"
tar -tf "$PACK_DIR/$PACK_TARBALL" >"$PACK_DIR/contents.txt"
for expected in \
  package/assets/skills/oat-wave-execute/SKILL.md \
  package/assets/skills/oat-wave-execute/scripts/bootstrap-group.sh \
  package/assets/skills/oat-wave-execute/assets/wrapper-plan-template.md \
  package/assets/skills/oat-wave-execute/assets/orchestration-log-template.md \
  package/assets/skills/oat-wave-program/SKILL.md \
  package/assets/skills/oat-wave-program/assets/execution-program-template.md
do
  grep -Fx "$expected" "$PACK_DIR/contents.txt"
done
rm -rf "$PACK_DIR"
```

Expected: all six paths print and every command exits zero. If release
automation publishes a different version, replace every `0.2.1` in this
runbook with the actual published version before continuing; do not leave a
symbolic or floating version.

In stoa's W6 execution-program artifact, add this provenance line to the W6
section before kickoff:

```text
Packaged wave-skill source: @open-agent-toolkit/cli@0.2.1
```

Commit that pin with the W6 composition update. The artifact must identify one
exact package version, not `latest`, a range, or a branch SHA.

## 2. Migrate Stoa to Packaged Skills

Start from a clean, up-to-date stoa branch. Record the pre-migration commit SHA
as the rollback point, then perform this sequence without reordering:

1. Delete stoa's repo-local canonical copies of `oat-wave-execute` and
   `oat-wave-program`. Do not manually copy toolkit files over them.
2. Remove provider-view entries left by those repo-local copies before the
   packaged install. In stoa this includes stale
   `.cursor/skills/oat-wave-execute` and
   `.cursor/skills/oat-wave-program` symlinks; remove equivalent pre-packaged
   entries for any other enabled provider.
3. Run `oat tools update`.
4. Run `oat sync --scope all`.
5. Run `oat status --scope all` and require a clean result.

The temporary migration workaround below is retired for 0.2.1 and later:

```bash
chmod +x .agents/skills/oat-wave-execute/scripts/bootstrap-group.sh
```

The installer now makes files under installed skill `scripts/` directories
executable even when npm normalizes tarball modes.

Verify:

- both canonical skill trees are reinstalled from the workflow pack;
- execute is version 1.5.0 and program is version 1.1.0;
- `bootstrap-group.sh` is executable;
- provider views exist for every provider enabled in stoa;
- `oat status --scope all` reports clean, with no stray pre-packaged views or
  unexpected managed-file deletion;
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
