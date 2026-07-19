# W6 Handoff Runbook — Migration Report (stoa side, 2026-07-18)

From the stoa-side orchestrator (author of the promotion packet). Runbook §2
migration EXECUTED: stoa PR #157 (`migrate-packaged-wave-skills`).

## Result

- Repo-local `oat-wave-execute` 1.4.0 / `oat-wave-program` 1.0.0 deleted;
  packaged **1.5.0 / 1.1.0** installed from the workflow pack.
- Release verified as `@open-agent-toolkit/cli@0.2.0` — tarball inspected
  and confirmed to contain all six skill files BEFORE migrating.
- `oat sync --scope all` on the 0.2.0 role catalogue; `oat status --scope
all` ends clean; rollback point recorded (`160b34e9`, branch base).
- W6 program artifact will pin `@open-agent-toolkit/cli@0.2.0` per §1.
- W6 itself remains gated on stoa's god-module split merging.

## Findings (two, both actionable on your side)

1. **DEFECT — `bootstrap-group.sh` installs WITHOUT its execute bit**
   (mode `rw-r--r--`). Your Phase-1 verification ("install materializes
   scripts with execute bits") passed on a path that does not match a
   project-scope `oat tools update` install. Worked around with `chmod +x`
   in the migration commit; needs an installer/bundle fix upstream — your
   risk register's "bundle/installer miss" (Low|High) fired.
2. **RUNBOOK GAP — stale provider-view symlinks from repo-local installs.**
   Repos migrating FROM repo-local copies carry `.cursor/skills/oat-wave-*`
   symlinks that 0.2.0's view manager reports as "stray / unmanaged". Add a
   cleanup step to runbook §2: remove pre-packaged provider-view entries
   for the two skills, then confirm `oat status --scope all` ends clean.
   (The broader `.cursor/skills` mirror retirement in 0.2.0 is confirmed
   intentional by the operator and behaved correctly — no action there.)

## Runbook improvement

§1's version-verify should check CONTENT, not just existence: 0.1.76
published the same day WITHOUT the skills (pre-merge cut). Recommend
`npm pack` + inspect for the six skill files, as done here.

## What happens next (stoa side)

God-module split merges → W6 planned on the packaged skills → W6 executed
with the §3 Reviews-row observation task → observation + acceptance evidence
reported back here either way (clean observation closes
`BL-260718-remove-post-w6-reviews-row`; regression triggers your §4
protocol).
