# Codex Smoke Drive Protocol

## Expected topology

The root uses native `spawn_agent` with the exact materialized phase
coordinator, which launches exact task workers. Effective
`agents.max_depth >= 2` and the manifest's scoped writable roots are
preconditions. A CLI route is valid only when selected and recorded before
launch.

## Automated invocation

The runner executes `codex exec --ephemeral --sandbox workspace-write --json`
in the disposable worktree. This noninteractive run is canonical evidence and
writes to `tools/smoke/reports/codex/<scenario>/`.

## Operator-interactive handoff

`--drive-mode operator --stage prepare` prints `codex -C <worktree>` and the
canned prompt. Run that command in a TTY, paste the prompt, wait for completion,
then run the matching `--stage collect`. Operator evidence writes to
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

Do not modify the parent worktree or persisted user configuration. Work only in
this disposable worktree, honor the manifest writable roots, commit each
fixture task exactly as planned, and do not replace any accepted child launch.
```

<!-- OAT_SMOKE_PROMPT_END -->
