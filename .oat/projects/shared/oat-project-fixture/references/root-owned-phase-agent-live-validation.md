---
oat_generated: false
oat_project: oat-project-fixture
oat_evidence_date: 2026-07-13
---

# Root-Owned Phase-Agent Live Validation

## Conclusion

Live Codex execution verified the restored topology and ultimately published a
green canonical report:

- one phase implementer directly executed every task in each phase;
- the root independently launched one reviewer per phase;
- `p01` and `p02` ran in parallel worktrees and merged before `p03`;
- all five task commits and all three phase reviews passed;
- no optional nested child was needed.

The final retained run passed all nine evidence assertions in 26m21s, compared
with 38m22s for the mandatory three-tier baseline.

## Run record

### `smoke-automated-2026-07-12T23-01-25-034Z`

- Duration: 35m11s.
- Phase implementation and all root-owned phase reviews passed.
- The single Cursor final gate passed and was durably received.
- Report collection then rejected an absolute `oat_project` path in generated
  review frontmatter.
- Remediation: commit `3e2874e` normalizes an absolute path only when it
  resolves to the fixture project and rejects all other absolute review paths.

### `smoke-automated-2026-07-12T23-40-51-838Z`

- Duration: 27m54s.
- Phase implementation and all root-owned phase reviews passed again.
- The single Cursor gate wrote a zero-finding review artifact, then returned
  `review_failed` with `WritableIterable is closed`.
- The terminal envelope did not establish receive eligibility, so the accepted
  gate was not replaced or received.

### `smoke-automated-2026-07-13T00-10-33-727Z`

- Duration: 4m06s.
- The retained confirmation run recorded `invalid-run-abort` before any agent
  launch because child initialization used the outer worktree as its working
  directory.
- No sequential fallback, replacement agent, reviewer, or gate was launched.
- Retained resources were inspected and then removed with the ownership-aware
  cleanup path.

### `smoke-automated-2026-07-13T00-20-28-977Z`

- Duration: 5m02s.
- Child containment and safe init passed.
- Both accepted phase implementers failed when repository hooks requested
  dependencies intentionally absent from smoke children.
- Remediation: commit `e1f6f6e` requires invocation-scoped
  `core.hooksPath=/dev/null` for fixture task commits without mutating Git
  config or using `--no-verify`.

### `smoke-automated-2026-07-13T00-28-52-722Z`

- Duration: 26m21s.
- Status: passed, 9/9 assertions.
- Bundle SHA-256:
  `96e5b76d40d82370a4c207d67e9ae6a50b669de76bfdb69d12b9ead4dca0e78b`.
- Canonical packet: `tools/smoke/reports/codex/implement/`.
- Three phase implementers and three root-owned reviewers completed; all five
  task commits, parallel isolation, ordered fan-in, final gate corroboration,
  durable review disposition, and explicit runtime-identity status passed.

## Baseline comparison

The mandatory three-tier baseline recorded 13 child dispatch attempts plus one
final gate: five accepted task workers, one rejected task-worker route, three
phase coordinators, three accepted reviewers, and one rejected reviewer route.

The restored run recorded six accepted child launches plus one final gate:
three phase implementers and three root-owned reviewers, with no task workers
or rejected child routes. On the same five-task fixture, the restored topology
removed seven launch attempts, cut total launch count in half, and finished
12m01s faster (31.3%).

## Interpretation

The deterministic suite remains the canonical portable contract check. Live
evidence now confirms the restored root-to-phase-agent and root-to-reviewer
call tree end to end. The failed attempts remain useful evidence that
containment, accepted-launch terminality, gate no-replacement behavior, and
hook isolation fail closed before a green report is published.
