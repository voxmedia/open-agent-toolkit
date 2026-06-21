---
oat_generated: true
oat_generated_at: 2026-06-20
oat_review_scope: final
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/workflow-end-triggers
---

# Code Review: final

**Reviewed:** 2026-06-20
**Scope:** final (cross-runtime independent review by Claude of Codex-authored implementation)
**Files reviewed:** 13 source/test files + 2 skills + 6 package manifests/asset
**Commits:** e292ca7d..HEAD (22 feature/bookkeeping commits)

## Summary

The workflow-end-triggers V1 implementation is complete, correct, and well-tested. All 7 hard-won critical invariants from the design (raw-layer gate resolution with no within-gate merge, keyed partial exec-target merge with null tombstones, the corrected `$CODEX_THREAD_ID` host detector, default avoidance with lexicographic tie-break, JSON-argv write surfaces, non-blocking gateability warnings wired end-to-end through the caller, and the `shared|local|user` write-layer restriction) are honored by the code AND directly exercised by tests. Focused suites (145 tests) pass; lint, type-check, and the `gate resolve` smoke command all pass; the lockstep version bump covers all five public packages. No Critical or Important findings. A small number of Minor observations are noted below, none blocking.

## Findings

### Critical

None

### Important

None

### Minor

- **Launch-failure vs ran-and-failed is distinguished only by message, not exit code** (`packages/cli/src/commands/gate/index.ts:579-586`, `718-771`)
  - Issue: When a dispatched child runs and exits nonzero, `process.exitCode` is set to the child status (correct passthrough). When the child fails to _launch_ (ENOENT etc.), `executeTarget` throws, is caught by `runCrossProviderExec`, and routed through `writeError` which sets `process.exitCode = 1`. If the child's real failure code also happens to be 1, the two cases share an exit code. The design (Error Handling: "a child that can't start ... is distinguished from 'ran and reported issues'") is still satisfiable because the wrapped `Failed to launch exec target "<id>" (<cmd>): ...` message is emitted on the error channel and the Gate Execution step instructs the agent to read stdout/stderr and treat launch failures as escalation-biased. So the distinction is observable to the orchestrating agent, just not via a distinct numeric exit code.
  - Suggestion: Acceptable for V1 (the agent-facing message carries the signal). If a future caller wants a programmatic distinction, consider a reserved exit code (e.g. 126/127-style) for launch failures. No change required now.

- **Disabled (`null`) gate entries still contribute keys to gateability validation** (`packages/cli/src/commands/internal/validate-oat-skills.ts:41-56`)
  - Issue: `collectConfiguredGateSkillNames` collects `Object.keys(skills)` from each layer, including keys whose value is `null` (a disabled gate). A skill whose gate is disabled at the most-specific layer would still trigger a "non-gateable" warning if it lacks `oat_gateable`. This matches the design's literal wording ("Validate the union of keys across layers") and is arguably correct (a configured-but-disabled gate pointing at a non-gateable skill is still a config smell), but it is a subtle behavior worth being intentional about.
  - Suggestion: Leave as-is unless product intent is "ignore disabled gates for validation." If the latter, filter out `null`-valued keys. Non-blocking; behavior is defensible and consistent with the design's union semantics.

- **`--current-runtime` override accepts arbitrary unknown runtime strings** (`packages/cli/src/commands/gate/index.ts:500-525`)
  - Issue: The `--current-runtime` test seam / escape hatch is used verbatim with no validation against known runtimes. Passing `--current-runtime garbage` means `same-runtime` avoidance excludes nothing (no target matches "garbage"), so all targets stay eligible. This is the same safe fall-through as the `unknown` detection result and is consistent with the design's "escape hatch" framing.
  - Suggestion: None required. Optionally document that an unrecognized `--current-runtime` value behaves like `unknown`.

## Requirements/Design Alignment

**Evidence sources used:** `discovery.md`, `design.md`, `plan.md`, `implementation.md` (quick mode — no `spec.md`), plus backlog item `bl-e6fc` to confirm deferred-scope claims.

### Critical-Invariant Coverage

| Invariant                                                                                                                                                                                                                              | Status      | Notes                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. `resolveGate` reads RAW layers, no within-gate merge, local>shared>user, wholesale win + null disable                                                                                                                               | implemented | `resolve.ts:202-219` iterates `effective.local/.shared/.user .workflow.gates.skills`, never `resolved`. Test `resolve.test.ts:1006` plants a contaminated `resolved` map and confirms it is ignored; wholesale/null/fall-through all tested (`:949-1043`).                                                      |
| 2. `resolveExecTargets` = built-ins + keyed PARTIAL merge per id, null deletes; p02 fix holds end-to-end                                                                                                                               | implemented | `resolve.ts:221-272` partial-merges user→shared→local with `??` (correctly preserves `priority: 0`). End-to-end fix verified: `oat-config.ts:210-248` keeps partial entries through normalization; `resolve.test.ts:106` (`{priority:80}` survives config load) and `oat-config.test.ts:872` confirm.           |
| 3. Codex detector `[ -n "$CODEX_THREAD_ID" ] \|\| [ -n "$CODEX_SESSION_ID" ]`; COMPANION must NOT resolve to codex; Claude=$CLAUDECODE, Cursor=$CURSOR_AGENT                                                                           | implemented | `oat-config.ts:126-152` pins exact detectors; asserted in `oat-config.test.ts:957`. `index.test.ts:805-822` proves a `CODEX_COMPANION_SESSION_ID`-only host does NOT detect codex (falls to `unknown`).                                                                                                         |
| 4. `cross-provider-exec`: avoidance default, detect→avoid same-runtime→priority→LEXICOGRAPHIC tie-break→first available; `--target` skips detection; no ambient env; exit=child status; no post-dispatch fallback; no-eligible→nonzero | implemented | `index.ts:718-771` + `selectExecTarget`/`listExecTargetCandidates` (`:452-474`). Tie-break tested (`index.test.ts:689`, `:966`), env-ignored tested (`:785-843`), `--target` skip (`:868`), exit passthrough (`:994-1013`), no-eligible nonzero (`:930`).                                                       |
| 5. `gate target set` uses JSON argv so provider flags survive                                                                                                                                                                          | implemented | `index.ts:261-339` parses `--base-command-json`/`--host-detection-json`/`--availability-json` via `JSON.parse`. Test `index.test.ts:418` round-trips `-p`/`-m`/`--model`/`--effort` intact.                                                                                                                     |
| 6. Gateability = non-blocking WARNING via existing frontmatter helpers; CALLER threads resolved gates.skills keys end-to-end                                                                                                           | implemented | `skills.ts:207-238` uses `getFrontmatterBlock`/`frontmatterHasKey` (not `agents/canonical/parse.ts`), severity `warning`. Caller `validate-oat-skills.ts:106-148` resolves config, collects keys, threads them in; warning-only stays `status: ok`, exit 0. Genuine e2e test `validate-oat-skills.test.ts:213`. |
| 7. `--layer` accepts shared\|local\|user (excludes auto)                                                                                                                                                                               | implemented | `index.ts:130-134`, `parseLayer` (`:202-210`) rejects `auto`/invalid with actionable error; tested `index.test.ts:648`.                                                                                                                                                                                         |

### Other Alignment Checks

| Area                                                                                                                      | Status      | Notes                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GateConfig normalization (drop invalid command/onFailure, coerce maxAttempts≥1 default 2, preserve null, drop execPolicy) | implemented | `oat-config.ts:180-208`; tested `oat-config.test.ts:810` (incl. `maxAttempts:0`→2 and `execPolicy` dropped).                                                                                      |
| Built-in `cursor-default` pins no `--model`                                                                               | implemented | Asserted `oat-config.test.ts:985`.                                                                                                                                                                |
| `oat gate resolve` total/read-only (null on absent/disabled/unknown, exit 0)                                              | implemented | `index.ts:626-638`; tested `index.test.ts:233-326`; live smoke returned `null` exit 0.                                                                                                            |
| Per-key write isolation (siblings untouched) across 3 layers                                                              | implemented | `index.ts:341-408`; tested `index.test.ts:546`.                                                                                                                                                   |
| Skill opt-in marker + verbatim-identical Gate Execution step on 2 lifecycle skills                                        | implemented | `oat_gateable: true` + version bump 2.0.21 on both; Gate Execution blocks byte-identical (diff confirmed); matches design Component 6.                                                            |
| Child spawn security (no shell injection; child inherits env)                                                             | implemented | `index.ts:140-157` uses `spawn` with default `shell:false`; prompt appended as discrete argv; only fixed-literal `sh -c` in built-in detectors.                                                   |
| Lockstep version bump (all 5 public packages 0.1.27→0.1.28) + asset                                                       | implemented | cli/control-plane/docs-config/docs-theme/docs-transforms all `0.1.28`; `public-package-versions.json` updated (4-entry shape unchanged — control-plane is intentionally not a docs-scaffold dep). |

### Extra Work (not in declared requirements)

None. The two accepted in-scope deviations (p02 config-normalizer fix for partial overrides; p07 help-snapshot + generated versions asset) are documented in `implementation.md` Deviations and are justified release/correctness bookkeeping, not scope creep. No undocumented divergence between shipped code and the design/plan was found — no artifact-alignment action required.

## Verification Commands

Run these to verify the implementation:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/config/resolve.test.ts src/validation/skills.test.ts src/commands/gate/index.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/internal/validate-oat-skills.test.ts src/commands/help-snapshots.test.ts
pnpm --filter @open-agent-toolkit/cli lint
pnpm --filter @open-agent-toolkit/cli type-check
pnpm run cli -- gate resolve oat-project-plan --json
```

Observed during this review: 198 focused tests pass; lint 0 warnings/0 errors; type-check clean; `gate resolve` returned `null` exit 0.

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks. All findings are Minor and non-blocking; the implementation is mergeable as-is.
