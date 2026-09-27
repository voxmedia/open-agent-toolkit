---
id: BL-260927-stop-resolve-providers-sh-from
title: Stop resolve-providers.sh from aborting when the last auto-detect test is false
status: open
priority: high
scope: task
scope_estimate: XS
labels:
  - agent-instructions
  - skills
  - bug
assignee: null
created: 2026-09-27T03:35:27.620Z
updated: 2026-09-27T03:35:27.620Z
associated_issues:
  - type: github
    ref: https://github.com/voxmedia/open-agent-toolkit/issues/324
external_plans: []
---

## Description

`.agents/skills/oat-agent-instructions-analyze/scripts/resolve-providers.sh` runs under `set -euo pipefail`. `resolve_from_auto_detect` ends with `[[ -d .cline ]] && providers+=("cline")`, so when `.cline/` is absent the function returns 1 and its bare call aborts the script before it prints anything. Every repository without `.oat/sync/config.json` and without `.cline/` gets no provider list and exit 1, and `oat-agent-instructions-apply` runs the same script and inherits the failure. Reproduced on 2026-09-26 in a scratch repository: `AGENTS.md` plus `.claude/` printed nothing and exited 1; adding `.cline/` printed the providers and exited 0. The script has no tests. Source: GitHub issue #324 (triage record `.oat/repo/pjm/triage/2026-09-26-untriaged-issues.md`).

## Acceptance Criteria

- Auto-detection never turns a false provider test into the function's exit status (each test is an `if` block, or the function ends with `return 0`).
- A script test covers a repository with only `AGENTS.md` and `.claude/`, one with `.cursor/` only, and one with `.cline/`, asserting the printed providers and exit 0; the first case fails against the pre-fix script.
- Interactive and non-interactive modes both print the detected providers.
- The analyze skill's `metadata.version` is bumped and the bundled mirror under `packages/cli/assets/` matches.
