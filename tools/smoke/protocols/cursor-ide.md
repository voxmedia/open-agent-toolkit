# Cursor IDE Smoke Drive Protocol

## Expected topology

Cursor IDE is operator-driven. The root applies full-information selection to
its live native catalog, dispatches the phase coordinator natively when the
exact route exists, and records any deliberate pre-start CLI task selection.
Task workers must not silently inherit the root model.

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
observe nested catalogs independently. Select any Cursor CLI route deliberately
before launch and record why the native catalog was unsatisfying. Before every
child launch, preserve launcher-owned selection, acceptance, outcome, and
runtime-identity evidence as separate facts. Write immutable dispatch and
state-transition records only through tools/smoke/evidence/record.mjs,
following tools/smoke/CONTRACT.md. Preserve gate JSON without rewriting it.

Do not modify the parent worktree or persisted user configuration. Work only in
this disposable worktree, commit each fixture task exactly as planned, and do
not replace any accepted child launch.
```

<!-- OAT_SMOKE_PROMPT_END -->
