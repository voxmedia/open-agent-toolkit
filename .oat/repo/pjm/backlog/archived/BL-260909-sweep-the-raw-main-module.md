---
id: BL-260909-sweep-the-raw-main-module
title: Sweep the raw main-module guard across the sibling skill scripts
status: closed
priority: medium
scope: task
scope_estimate: M
labels:
  - skills
  - scripts
  - wave-7-followup
assignee: null
created: 2026-09-09T00:02:03.255Z
updated: '2026-09-15T14:00:00Z'
associated_issues: []
external_plans: []
---

## Description

Wave-7 p01 (`2026-09-08-read-stdin-in-finalize-synced-archive.md`) canonicalized the main-module guard in `finalize-synced-archive.mjs` only. Seventeen sibling scripts still carry the raw `import.meta.url === pathToFileURL(process.argv[1]).href` comparison that fails open through a symlinked install (6 under `.agents/skills/oat-project-complete/scripts/`, 5 under `explainer-kit/`, 2 under `oat-explainer-kit/`, 4 under `recon/`), and `.agents/skills/oat-project-complete/scripts/validate-nonarchive-lifecycle-receipt.mjs` has no guard at all. Sweep them onto the canonical `isDirectInvocation` shape (`capture-dirty-tree.mjs:1046-1067`), each with a CLI entry-point test modeled on `finalize-synced-archive-cli.test.mjs` — noting that the raw guard is the neutralization control only for the plain invocation form; a one-sided canonicalization is the control for the `--preserve-symlinks-main` and `NODE_OPTIONS` forms. Sweep-wide design input from the p01 Codex round and root review: decide once whether a thrown `realpathSync` in the guard should serialize the script's failure code and exit 1 instead of returning `false` (silent exit 0), and if so update the exemplar too; also decide whether a caller that leaves stdin open should time out rather than block.

### Evidence from oat-doctor-router completion (2026-09-15)

Reproduced live: `~/.claude/skills/oat-project-complete` is a symlink into `~/.agents/skills`, and `oat-project-complete` tells agents to set `SKILL_DIR` to the loaded directory. `node $SYMLINKED/scripts/recover-completion-receipts.mjs --archive-preference true` exited 0 and printed nothing; the resolved path printed the decision. Every completion shell step then fails later with a confusing JSON parse error rather than at the script. The raw guard now remains in 12 scripts: 7 under `oat-project-complete/scripts/`, 1 under `oat-explainer-kit/scripts/`, and 4 under `recon/scripts/` (the old `explainer-kit` copies are gone). Source: oat-doctor-router retro UP-01.

## Acceptance Criteria

- Every `.agents/skills/*/scripts/*.mjs` entry point uses the canonical `isDirectInvocation` guard, and `grep -rn 'pathToFileURL(process.argv\[1\])' .agents/skills` finds no raw comparison.
- `validate-nonarchive-lifecycle-receipt.mjs` gains a guard.
- Each swept script has a CLI entry-point test that invokes it through a symlinked skill directory and fails when the guard is reverted to the raw form.
- The realpath-throw and open-stdin decisions are recorded in the exemplar and applied to every script.
- Each touched skill takes a `metadata.version` bump.
