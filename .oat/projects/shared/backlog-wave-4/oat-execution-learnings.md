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
