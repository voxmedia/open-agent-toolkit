# Cursor CLI Smoke Drive Protocol

## Expected topology

Cursor CLI is a separate flavor from Cursor IDE. The run records its live root
Subagent catalog and may claim native selection or nesting only when structured
events prove it. An accepted interrupted child is terminal; it does not permit
a replacement route.

## Automated invocation

The runner executes `cursor-agent --print --force --trust` with stream JSON and
an explicit workspace. Canonical evidence writes to
`tools/smoke/reports/cursor-cli/<scenario>/`.

## Operator-interactive handoff

`--drive-mode operator --stage prepare` prints an interactive `cursor-agent`
command and canned prompt for the disposable worktree. Run it in a TTY and
collect after completion. Operator evidence writes to
`tools/smoke/reports/cursor-cli/operator/<scenario>/`.

## Canned root prompt

<!-- OAT_SMOKE_PROMPT_START -->

```text
Drive the active OAT smoke-fixture project for scenario {{SCENARIO}}.

{{SCENARIO_INSTRUCTIONS}}

Use the repository's normal OAT workflow skills. Treat Cursor CLI as its own
harness: observe this invocation's native catalog, select exact native targets
only from that snapshot, and select any CLI route before launch. Before every
child launch, preserve launcher-owned selection, acceptance, outcome, and
runtime-identity evidence as separate facts. Write immutable dispatch and
state-transition records only through tools/smoke/evidence/record.mjs,
following tools/smoke/CONTRACT.md. Preserve gate JSON without rewriting it.

The `oat` command is already bound to the preflight-verified source build
through the smoke environment. Use it directly; do not install dependencies,
bootstrap this outer worktree, or invoke `pnpm run cli`.

For each required external review gate, invoke `oat gate review` exactly once
with `--target {{GATE_TARGET}}`. You may inspect `oat gate target list`, but
never invoke a gate as a probe. An accepted failed gate is terminal for that
gate and must not be replaced.

Gate count is fixed: `plan-review` runs one plan gate, `implement` runs one
final code gate after p03, and `full` runs those two gates. Phase self-reviews
still run once per phase, but each reviewer receives only that phase's commit
range and acceptance criteria. Do not turn a fixture review into repository-wide
diagnosis, workflow redesign, or unrelated cleanup.

Do not infer Cursor IDE behavior, modify the parent worktree or persisted user
configuration, or replace an accepted child launch. Work only in this
disposable worktree and commit each fixture task exactly as planned.
```

<!-- OAT_SMOKE_PROMPT_END -->
