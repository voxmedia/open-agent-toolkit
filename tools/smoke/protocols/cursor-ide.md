# Cursor IDE Smoke Drive Protocol

## Expected topology

Cursor IDE is operator-driven. The root applies full-information selection to
its live native catalog, dispatches one phase implementer natively when the
exact route exists, and independently dispatches the phase reviewer. Optional
nested work is selected only when useful; it must not silently inherit or become
a default requirement.

## Manual invocation

Run `--stage prepare`; open the printed disposable worktree in Cursor, start a
new Agent session, paste the canned prompt, and let it finish. Then run the
matching `--stage collect`. Reports write to
`tools/smoke/reports/cursor-ide/<scenario>/`. The runner never substitutes a
headless Cursor CLI drive for this IDE session.

## Canned root prompt

<!-- OAT_SMOKE_PROMPT_START -->

```text
Drive the active OAT smoke-fixture project for scenario {{SCENARIO}}.

{{SCENARIO_INSTRUCTIONS}}

Use the repository's normal OAT workflow skills. Apply the configured
full-information dispatch contract to this root's live native catalog and
dispatch one phase implementer that directly executes the phase. Dispatch its
reviewer independently from the root. Observe nested catalogs only when
optional nested work has a concrete benefit. Select any Cursor CLI route
deliberately before launch and record why the native catalog was unsatisfying.
Before every child launch, preserve launcher-owned selection, acceptance,
outcome, and runtime-identity evidence as separate facts. Write immutable
dispatch and state-transition records only through
tools/smoke/evidence/record.mjs, following tools/smoke/CONTRACT.md. Preserve
gate JSON without rewriting it.

The `oat` command is already bound to the preflight-verified source build
through the smoke environment. Use it directly; do not install dependencies,
bootstrap this outer worktree, or invoke `pnpm run cli`.

For each required external review gate, invoke `oat gate review` exactly once
with `--target {{GATE_TARGET}}`. You may inspect `oat gate target list`, but
never invoke a gate as a probe. An accepted failed gate is terminal for that
gate and must not be replaced.

Any child containment, ownership-registration, base, or fixture-readiness
failure is run-fatal: record `invalid-run-abort`, terminate accepted handles,
and stop before any later phase implementer, optional worker, review, or gate.
Never degrade an invalid smoke run to sequential execution or replace an
aborted handle. Gate liveness reports elapsed, idle, and hard-budget
milliseconds; activity proves liveness, not completion, and never extends the
hard budget.

Gate count is fixed: `plan-review` runs one plan gate, `implement` runs one
final code gate after p03, and `full` runs those two gates. Phase self-reviews
still run once per phase from the root, and each reviewer receives only that
phase's commit range and acceptance criteria. Do not turn a fixture review into
repository-wide diagnosis, workflow redesign, or unrelated cleanup.

Do not modify the parent worktree or persisted user configuration. Work only in
this disposable worktree, commit each fixture task exactly as planned, and do
not replace any accepted child launch.
```

<!-- OAT_SMOKE_PROMPT_END -->
