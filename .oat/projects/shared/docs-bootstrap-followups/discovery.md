---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-16
oat_generated: false
---

# Discovery: docs-bootstrap-followups

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Implement two bounded follow-up fixes for the docs bootstrap flow:

1. After `oat docs init` scaffolds a Fumadocs app into a consumer monorepo, patch the consumer root `package.json` so root `pnpm build` excludes the docs app from the default Turbo build graph and add a docs-only build script. This must honor mutate-by-default behavior, support `--dry-run`, print a unified diff before writing, and expose a root-patch opt-out flag.
2. Ensure generated docs app `index.md` files carry a durable "do not hand-edit" header both in the generated output and in the scaffold template, because `oat docs generate-index` clobbers that file on every `predev` and `prebuild`.

The work also includes the downstream user guidance in `oat-docs-bootstrap`, the required tests, the lockstep public package version bump, the skill version bump, and the final verification commands.

## Clarifying Questions

### Question 1: Workflow

**Q:** Which workflow should govern the change?
**A:** Use `oat-project-quick-start`; do not plan ad hoc outside the project artifacts.
**Decision:** Keep this as a native quick-mode project and move directly from discovery to plan because the request is bounded and concrete.

## Options Considered

### Option A: Patch only the scaffolded docs app

**Description:** Leave the consumer root scripts untouched and document a manual Turbo filter step in the skill.

**Pros:**

- Smaller CLI surface change
- No need to parse or mutate consumer root scripts

**Cons:**

- Does not fix the CI failure mode that triggered the work
- Leaves every consumer repo to rediscover and implement the same workaround

**Chosen:** Neither

**Summary:** This avoids touching consumer root config, but it fails the primary goal of making `oat docs init` safe in existing monorepos.

### Option B: Patch the consumer root when the existing build flow is Turbo-driven

**Description:** Detect a Turbo-based root build script, append an exclusion filter for the scaffolded docs app while preserving existing flags, add a docs-only build script, and surface a warning plus manual snippet when auto-patching is not applicable.

**Pros:**

- Fixes the real collision automatically for the common monorepo case
- Keeps behavior reversible and inspectable through diffs, dry runs, and an opt-out flag

**Cons:**

- Requires careful script parsing and explicit skip behavior for non-Turbo repos
- Adds user-facing output that the bootstrap skill must explain clearly

**Chosen:** B

**Summary:** This is the only option that solves the downstream breakage while staying within the CLI’s mutate-by-default and dry-run conventions.

## Key Decisions

1. **Workflow:** Use quick mode without a separate design artifact because the scope, affected surfaces, and acceptance criteria are already clear.
2. **Root build behavior:** Patch the consumer root `package.json` only when a Turbo-based `build` script is present; otherwise skip with a warning and enough structured output for the bootstrap skill to relay manual guidance.
3. **Patch controls:** Preserve existing build-script flags, support `--dry-run`, emit a unified diff before writing, and add an explicit opt-out flag for the root patch.
4. **Generated index warning:** Put the "do not hand-edit" header in both `oat docs generate-index` output and the Fumadocs scaffold template so the warning exists before and after the first regeneration.
5. **User education:** Update `oat-docs-bootstrap` so the walkthrough explains why the build filter exists, what changed, how to adjust or revert it, and what manual snippet to add when the CLI intentionally skips the patch.
6. **Release policy:** Treat the CLI source, bundled docs template, and skill changes as shipped functionality and bump all five public packages together.

## Constraints

- Do not refactor surrounding docs-init or generate-index code beyond what the two fixes require.
- Follow CLI package rules: mutate-by-default with `--dry-run`, exit semantics 0/1/2, and logger-based output instead of raw `console.*`.
- Respect the CLI import policy: `./...` only for same-directory imports; use configured aliases for anything else.
- Do not hand-edit the root `package.json` for testing; use scratch fixtures in tests.
- Run `pnpm --filter @open-agent-toolkit/cli test lint type-check` and `pnpm release:validate` before declaring the work done.

## Success Criteria

- `oat docs init` automatically adds the consumer-root Turbo exclusion and docs-only build script when the root build script is Turbo-based.
- The CLI emits a clear warning and result data when the root patch is skipped because the repo has no `build` script or a non-Turbo one.
- Dry-run mode shows the package.json diff without mutating files, and the opt-out flag disables the root patch cleanly.
- Generated `index.md` output always starts with the "AUTOGENERATED / do not hand-edit" header, including after idempotent reruns.
- The Fumadocs scaffold template ships with the same header before the first generate-index run.
- The bootstrap skill walkthrough teaches both the automatic patch and the manual fallback path.

## Out of Scope

- Generalized mutation of arbitrary consumer root scripts beyond the documented Turbo build case
- Broader docs bootstrap UX changes unrelated to the build filter explanation or the generated-index warning
- Refactoring unrelated CLI command structure or template layout while touching these files

## Deferred Ideas

- Extending root-script patching to non-Turbo build systems - deferred because the downstream issue is specifically about Turbo monorepos and the current fix should stay narrow
- Broader guardrails for other generated docs files - deferred because only `index.md` is known to be regenerated and silently clobbered today

## Open Questions

None. The remaining work is implementation and verification.

## Assumptions

- Consumer repos affected by this issue use root-level Turbo build scripts that can safely accept an appended `--filter='!{appName}'` flag.
- The downstream bootstrap walkthrough has access to the CLI result or warning text needed to explain whether the root patch was applied or skipped.

## Risks

- **Build-script false positives:** Naive detection could rewrite scripts that mention Turbo in a way that is not safe to patch.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Limit patching to clear Turbo build scripts, preserve existing flags, and skip with a warning when parsing is ambiguous.

- **Generated-header drift:** The scaffold template and generate-index command could diverge if one is updated without the other.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Reuse the same header text in tests and assert idempotent output.

- **User confusion around auto-mutation:** Consumers may not realize why their root scripts changed.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Include the diff in CLI output, teach the rationale in the bootstrap walkthrough, and provide a manual snippet when auto-patching is skipped.

## Next Steps

Use this completed discovery artifact to drive a quick-mode implementation plan with two phases:

- Phase 1: root build-script patching in `oat docs init` with tests and CLI result plumbing
- Phase 2: generated-index header propagation, bootstrap walkthrough updates, version bumps, and final verification
