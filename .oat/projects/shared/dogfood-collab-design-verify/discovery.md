---
oat_status: complete
oat_ready_for: oat-project-design
oat_blockers: []
oat_last_updated: 2026-04-24
oat_generated: false
---

# Discovery: dogfood-collab-design-verify

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

## Initial Request

Add a `--verbose` flag to `oat-project-open` so that when an operator is troubleshooting a project-resolution failure (wrong active project, stale `state.md`, unexpected `pr_open` state, etc.) they can see which resolution steps ran, which config files were consulted, and which frontmatter fields were read. Today the skill emits only a compact status line plus terminal branch output, which is ergonomic for routine runs but makes diagnosis harder when the resolution surprises the user.

## Clarifying Questions

### Question 1: Default verbosity

**Q:** Should `--verbose` be opt-in or should we raise the default floor?
**A:** Opt-in. The default output is intentionally terse because `oat-project-open` is run frequently. We only want richer output when someone asks for it.
**Decision:** `--verbose` is opt-in; absent the flag, existing output is unchanged.

### Question 2: Env var equivalent

**Q:** Should there be an `OAT_VERBOSE=1` env var in addition to `--verbose`?
**A:** Yes, for parity with how `OAT_NON_INTERACTIVE` and similar toggles work.
**Decision:** Support both `--verbose` argument and `OAT_VERBOSE=1`. Argument wins if both are set.

### Question 3: What extra output?

**Q:** What should `--verbose` actually emit?
**A:** A structured trail: config files consulted (with paths), resolution order applied, `state.md` frontmatter fields read, branch checks performed, and the terminal decision with its reason.
**Decision:** Emit a bullet-list "trace" block in stderr so normal stdout remains scriptable.

## Solution Space

_Request is small and well-understood — no divergent strategies need evaluation. Single implementation path below._

### Chosen Direction

**Approach:** Thread a `verbose` boolean through the existing resolution flow. Wrap each resolution step with an optional trace emitter. Keep normal stdout unchanged; add trace output to stderr when verbose.

**Rationale:** Preserves backward compatibility, matches the unix convention that stderr is the place for diagnostic noise, and avoids changing the skill's external contract for non-verbose callers.

**User validated:** Yes — confirmed during discovery.

## Options Considered

### Option A: stderr trace block (selected)

**Description:** Add a small `trace(verbose, msg)` helper. Call it at each resolution decision point.

**Pros:**

- Minimal change surface.
- Non-verbose output unchanged.
- Doesn't pollute stdout for scripted callers.

**Cons:**

- Slightly more noise than doing nothing; needs a second pass if the trace lines drift from the actual resolution logic.

**Chosen:** A.

## Key Decisions

1. **Opt-in verbosity:** `--verbose` CLI flag + `OAT_VERBOSE=1` env var; arg wins.
2. **Output channel:** stderr, not stdout.
3. **Trace granularity:** one line per resolution step (config file consulted, state.md field read, branch check).

## Constraints

- No dependency additions (use existing logger if any, else raw stderr writes).
- Default behavior must be byte-identical to today.

## Success Criteria

- `oat-project-open` with no flag: unchanged output.
- `oat-project-open --verbose`: structured stderr trace plus normal output.
- `OAT_VERBOSE=1 oat-project-open`: same as `--verbose`.
- Wrong active project: trace makes the mis-resolution obvious without the user reading source.

## Out of Scope

- Verbosity for any other `oat-project-*` skill (separate project if needed).
- Log-level taxonomy (debug/info/warn). Just binary verbose on/off for this pass.
- Writing the trace to a file.

## Deferred Ideas

- Verbosity across the whole OAT CLI as a global `--verbose` — deferred. This project intentionally scopes to one skill.
- Structured JSON trace output — deferred. Plaintext is enough for the diagnostic use case.

## Open Questions

- **Trace exact format:** one-line bullets vs multi-line blocks? _(resolve in design)_

## Assumptions

- `oat-project-open` is the right entry point for troubleshooting active-project resolution. Validated by the initial request.

## Risks

- **Drift between trace and actual logic:** if the skill's resolution logic changes without updating trace lines, verbose output lies.
  - **Likelihood:** Medium
  - **Impact:** Low (the skill still works; just the diagnostic is stale)
  - **Mitigation Ideas:** keep trace emits adjacent to the decision points they describe; prefer a single trace helper over scattered writes.

## Next Steps

Use this discovery artifact to drive the next workflow step:

- **Spec-driven mode:** continue to `oat-project-design` (which confirms
  requirements and produces both `spec.md` and `design.md`).
- **Spec-driven mode → formalize-only:** use `oat-project-spec` standalone
  if you want a formalized requirements artifact but aren't ready to
  design yet.
