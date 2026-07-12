# Codex Smoke Drive Protocol

## Expected topology

The root uses native `spawn_agent` with the exact materialized phase
coordinator, which launches exact task workers. Effective
`agents.max_depth >= 2` and the manifest's scoped writable roots are
preconditions. A CLI route is valid only when selected and recorded before
launch.

## Automated invocation

The runner executes
`codex exec --ephemeral --sandbox workspace-write --add-dir <common-git-dir> --add-dir <smoke-run-dir> --json`
in the disposable worktree. This noninteractive run is canonical evidence and
writes to `tools/smoke/reports/codex/<scenario>/`.

## Operator-interactive handoff

`--drive-mode operator --stage prepare` prints a broker-wrapped
`codex -C <worktree> --sandbox workspace-write --add-dir <common-git-dir>
--add-dir <smoke-run-dir>` command and the canned prompt. Run that command in a
TTY, paste the prompt, wait for completion, then run the matching
`--stage collect`. Operator evidence writes to
`tools/smoke/reports/codex/operator/<scenario>/`.

## Canned root prompt

<!-- OAT_SMOKE_PROMPT_START -->

```text
Drive the active OAT smoke-fixture project for scenario {{SCENARIO}}.

{{SCENARIO_INSTRUCTIONS}}

Use the repository's normal OAT workflow skills and provider-native
coordinator-to-worker topology. Before every child launch, apply the configured
dispatch contract and preserve launcher-owned selection, acceptance, outcome,
and runtime-identity evidence as separate facts. Write immutable dispatch and
state-transition records only through tools/smoke/evidence/record.mjs, following
tools/smoke/CONTRACT.md. Preserve gate JSON without rewriting it.

The `oat` command is already bound to the preflight-verified source build
through the smoke environment. Use it directly; do not install dependencies,
bootstrap this outer worktree, or invoke `pnpm run cli`.

For each required external review gate, invoke `oat gate review` exactly once
with `--target {{GATE_TARGET}}`. You may inspect `oat gate target list`, but
never invoke a gate as a probe. An accepted failed gate is terminal for that
gate and must not be replaced.

Any child containment, ownership-registration, base, or fixture-readiness
failure is run-fatal: record `invalid-run-abort`, terminate accepted handles,
and stop before any later worker, review, or gate. Never degrade an invalid
smoke run to sequential execution or replace an aborted handle. Gate liveness
reports elapsed, idle, and hard-budget milliseconds; activity proves liveness,
not completion, and never extends the hard budget.

For each child worktree, follow `oat-worktree-bootstrap-auto` exactly. After
`git worktree add`, register the child in the manifest ownership journal before
running its first process. Then invoke the direct smoke-safe entrypoint with
`bash scripts/worktree/init.sh` from the child. Do not invoke
`pnpm run worktree:init`: Corepack or package-manager startup may fetch before
the smoke-safe script can register ownership and short-circuit dependency work.

Gate count is fixed: `plan-review` runs one plan gate, `implement` runs one
final code gate after p03, and `full` runs those two gates. Phase self-reviews
still run once per phase, but each reviewer receives only that phase's commit
range and acceptance criteria. Do not turn a fixture review into repository-wide
diagnosis, workflow redesign, or unrelated cleanup.

Before a Cursor gate, run
`[ -d "${OAT_SMOKE_CURSOR_BROKER_DIRECTORY:-}" ]`. If it fails, stop before
launch.
Never read, persist, or echo the key. Codex tool shells redact provider secrets,
so the smoke runner's local mailbox broker executes only the configured
`cursor-agent` child with the API key retained in the parent process.

Do not modify the parent worktree or persisted user configuration. Work only in
this disposable worktree, honor the manifest writable roots, commit each
fixture task exactly as planned, and do not replace any accepted child launch.
```

<!-- OAT_SMOKE_PROMPT_END -->
