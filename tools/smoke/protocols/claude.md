# Claude Smoke Drive Protocol

## Expected topology

The root uses native `Agent` dispatch for the phase coordinator and exact
tier-alias workers. The live run records whether production coordinator nesting
works; if it does not, the report must identify the sanctioned alternative
without silently changing routes after acceptance.

## Automated invocation

The runner executes `claude -p` with stream JSON and noninteractive permissions
inside the disposable worktree. Canonical evidence writes to
`tools/smoke/reports/claude/<scenario>/`.

## Operator-interactive handoff

`--drive-mode operator --stage prepare` prints the disposable worktree,
interactive `claude` command, and canned prompt. Run it in a TTY and collect
after completion. Operator evidence writes to
`tools/smoke/reports/claude/operator/<scenario>/`.

## Canned root prompt

<!-- OAT_SMOKE_PROMPT_START -->

```text
Drive the active OAT smoke-fixture project for scenario {{SCENARIO}}.

{{SCENARIO_INSTRUCTIONS}}

Use the repository's normal OAT workflow skills. Prefer the provider-native
coordinator-to-worker topology, observe the live Agent model catalog at each
dispatcher, and record whether the production coordinator can launch exact
workers. Before every child launch, preserve launcher-owned selection,
acceptance, outcome, and runtime-identity evidence as separate facts. Write
immutable dispatch and state-transition records only through
tools/smoke/evidence/record.mjs, following tools/smoke/CONTRACT.md. Preserve
gate JSON without rewriting it.

Do not modify the parent worktree or persisted user configuration. Work only in
this disposable worktree, commit each fixture task exactly as planned, and do
not replace any accepted child launch.
```

<!-- OAT_SMOKE_PROMPT_END -->
