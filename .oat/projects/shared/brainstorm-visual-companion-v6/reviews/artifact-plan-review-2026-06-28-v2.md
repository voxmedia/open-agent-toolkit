---
oat_generated: true
oat_generated_at: 2026-06-28
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/brainstorm-visual-companion-v6
---

# Artifact Review: plan

**Reviewed:** 2026-06-28
**Scope:** `plan.md` re-review for quick-mode pre-implementation handoff
**Files reviewed:** 2 primary (`plan.md`, `discovery.md`) plus project-state and repo-guardrail spot checks
**Commits:** n/a (artifact review)

## Summary

The current plan is much stronger than the archived first-pass review: the version-bump ownership, smoke command, security-header/traversal coverage, UI manual-verification note, and idle-timeout unit seam have all been addressed. Two gaps remain before implementation handoff: the plan still leaves the symlink branch of the file-sandbox success criterion without regression coverage, and it omits the provider-view sync step required when canonical skills change.

## Findings

### Critical

None

### Important

- **SC#1 still lacks symlink regression coverage for `/files/` sandboxing** (`plan.md:61-63`, `plan.md:248-257`, `discovery.md:122`)
  - Issue: Discovery requires the file server to reject traversal, symlinks, and dotfiles, and the plan correctly calls out "no symlinks, dotfiles, traversal" in the server port task. The revised smoke-test task now covers security headers plus traversal/dotfile payloads, but it still does not require a symlink case. That leaves one explicitly named security guarantee validated only by code inspection or upstream trust.
  - Fix: Extend `p03-t01` with a symlink fixture under the served file area and assert an authenticated `/files/...` request to that symlink returns 4xx. If symlink validation is intentionally manual or platform-limited, say that explicitly in `p03-t01` and reconcile the success criterion.

### Medium

- **Provider-view sync is missing from the implementation plan** (`AGENTS.md:7-12`, `plan.md:209-229`, `plan.md:273-299`)
  - Issue: This PR will change the canonical `oat-brainstorm` skill and bundled assets. Repo instructions say canonical skills live under `.agents/skills`, provider-linked views are managed by sync tooling, and provider views should be refreshed with `oat sync --scope all`. The plan validates skills and bumps package versions, but it never schedules the sync step or the resulting `.claude`/`.cursor`/manifest changes if they occur.
  - Fix: Add a verification/bookkeeping step, likely in `p03-t02`, to run the repo-local equivalent of `oat sync --scope all` (`pnpm run cli -- sync --scope all` in this checkout) after the skill edits. Commit any provider-view or `.oat/sync/manifest.json` updates with the release/version bookkeeping if the command changes them.

### Minor

None

## Requirements/Discovery Alignment

| Discovery item                                                      | Status      | Notes                                                                                                     |
| ------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------- |
| SC#1 Session-key auth, file sandbox, security headers               | partial     | Plan covers auth, headers, traversal, and dotfile checks; symlink rejection remains untested (Important). |
| SC#2 Restart reuses port/key with same context                      | implemented | `p01-t03` plus `p03-t01` restart-reuse test.                                                              |
| SC#3 Idle default 4h configurable; stop-server instance guard       | implemented | Launcher/server unit handoff is now explicit; stop-server stale instance check is planned.                |
| SC#4 Client status pill and paused overlay                          | implemented | Plan now states browser/manual verification is intentional because smoke cannot drive the UI.             |
| SC#5 Skill/reference docs document key URL, `--open`, restart, idle | implemented | `p02-t01` and `p02-t02`.                                                                                  |
| SC#6 Smoke test and `release:validate` pass after bump              | implemented | Commands now use package-scoped Vitest and `pnpm release:validate`.                                       |
| SC#7 NOTICES updated for Superpowers v6.0.3 adapted port            | implemented | `p03-t02`.                                                                                                |

### Extra Work

None. Phase 4 remains an optional docs touchpoint with a skip path and does not expand beyond the discovery constraints.

## Dispatch Profile Advisory

No `## Dispatch Profile` section is present. That is normal for this plan and is not a finding.

## Verification Commands

```bash
# Re-check the plan/discovery assertions after fixing the review findings.
rg -n "symlink|oat sync|sync --scope" .oat/projects/shared/brainstorm-visual-companion-v6/plan.md

# Validate the skill pack after the planned skill edits.
pnpm oat:validate-skills

# Refresh provider views after canonical skill edits, using the repo-local CLI.
pnpm run cli -- sync --scope all

# Run the targeted smoke test.
pnpm --filter @open-agent-toolkit/cli exec vitest run src/integration/visual-companion-smoke.test.ts
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the Important and Medium findings into plan edits or explicit deferrals before starting `oat-project-implement`.
