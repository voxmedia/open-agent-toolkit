# PR #395 Codex stale-cleanup probe results (2026-11-01)

Run: `bash .oat/projects/shared/wave-1-correctness/references/pr395-codex-cleanup-probe.sh <path to packages/cli/dist/index.js>` (isolated HOME and scratch repositories under TMPDIR, removed on exit).

## Pre-fix build (955f8612f)

```text
== F2: re-pointed [agents.gone] table
initial sync exit=0
second sync exit=0
F2 table [agents.gone]: DELETED
F2 replacement.toml: kept
F2 leftover gone.toml: removed
F2 control [agents.keep]: kept
== F1: symlinked .codex/agents outside the repository
sync exit=0
F1 external sentinel: DELETED
== F1 control: in-scope stale owned role is still removed
sync exit=0
F1 control in-scope stale role: removed
```

## Post-fix build (b8eb99669)

```text
== F2: re-pointed [agents.gone] table
initial sync exit=0
second sync exit=0
F2 table [agents.gone]: KEPT
F2 replacement.toml: kept
F2 leftover gone.toml: removed
F2 control [agents.keep]: kept
== F1: symlinked .codex/agents outside the repository
sync exit=0
F1 external sentinel: SURVIVED
== F1 control: in-scope stale owned role is still removed
sync exit=0
F1 control in-scope stale role: removed
```
