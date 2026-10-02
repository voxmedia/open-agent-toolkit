---
oat_generated: false
---

# Execution Learnings: backlog-wave-4

Append-only log of reusable observations from the autonomous run.

## 2026-10-02T12:33Z - decision - Reviewer target name is stale but resolves Sol 6.1

**Observation:** The operator asked for GPT-6.1 Sol as the reviewer. The configured user gate target `codex-6-sol-xhigh` already invokes `gpt-6.1-sol` with `model_reasoning_effort="xhigh"`, and Wave 3's gate receipts record `gpt-6.1-sol`.
**Impact:** No gate configuration change was needed; the target id no longer describes its model.
**Recommendation:** Rename the target id when the operator next edits user gate config, so receipts and reports name the model they ran.

## 2026-10-02T12:33Z - environment-limited - Installed CLI and user skills lag main

**Observation:** The global `oat` is 0.3.10 and user-scope lifecycle skills are one version behind the repository (0.3.12 is published). The operator did not authorize an update for this wave.
**Impact:** Lifecycle skills and gate reviews run the 0.3.10 behavior, not Wave 3's changes.
**Recommendation:** Update the global CLI and user-scope skills between waves.

## 2026-10-02T13:40Z - gotcha - Main moved during planning; the branch CLI build went stale

**Observation:** PR #335 merged to `main` (lockstep 0.3.13) after the wave branch was cut from 0.3.12. The plan artifact review caught it (H1). After merging `origin/main`, `node packages/cli/dist/index.js` refused PJM writes with "Bundled assets version mismatch: CLI 0.3.13, assets 0.3.12" until `pnpm --filter @open-agent-toolkit/cli build` re-ran.
**Impact:** The lockstep target moved to 0.3.14, and every branch-CLI step after a merge needs a rebuild first.
**Recommendation:** Re-fetch and compare `origin/main` versions at plan-gate time, and rebuild the branch CLI immediately after any merge from `main`.

## 2026-10-02T13:40Z - decision - Operator request mid-run kept out of the wave

**Observation:** The operator asked to stop committing project review files (gitignore `reviews/`). Sizing found staging sites in review-provide, review-receive, pr-final, and implement, `oat init` defaults, and a migration need.
**Impact:** Filed as `BL-261002-gitignore-project-review` (high); the operator chose a separate follow-up PR over folding it into Wave 4.
**Recommendation:** Lead the next PR with it.
