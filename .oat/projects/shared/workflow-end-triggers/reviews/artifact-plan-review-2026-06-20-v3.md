---
oat_generated: true
oat_generated_at: 2026-06-20
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/workflow-end-triggers
---

# Artifact Review: plan

**Reviewed:** 2026-06-20
**Scope:** `plan` (artifact review — quick mode)
**Files reviewed:** 5
**Commits:** working tree (post `34bbb3a3` Codex detector fix)

## Summary

The plan is implementation-ready for V1 runtime-level cross-runtime gates. It aligns
with `design.md` on the core architecture (`execTargets` + `gates.skills`,
`cross-provider-exec --avoid same-runtime`, JSON argv writes, no V1 `execPolicy`).
Cursor built-in detection is correctly pinned to `$CURSOR_AGENT` (not the fictional
`CURSOR_SESSION` / `CURSOR_MODEL` env vars). The prior Codex detector fix
(`$CODEX_THREAD_ID` ‖ `$CODEX_SESSION_ID`) is present and matches this environment.

Remaining gaps are tie-breaking when multiple targets share priority 100, and the
design's declaration-first `OAT_CURRENT_RUNTIME` contract is not tasked in p06 — V1
will rely on built-in host detectors for Cursor/Codex/Claude instead.

## Findings

### Critical

None.

### Important

1. **Equal-priority target selection has no tie-break rule.**
   - Evidence: `codex-default` and `claude-default` both use `priority: 100`
     (`plan.md` p01-t01 built-in spec; `design.md` Component 1). When the current
     host is Cursor (`CURSOR_AGENT=1`), `--avoid same-runtime` excludes
     `cursor-default` (70) and leaves both codex and claude at priority 100.
   - Impact: `cross-provider-exec` may pick Codex or Claude nondeterministically
     depending on registry iteration order — users cannot predict which independent
     reviewer runs from a Cursor implement session.
   - Fix guidance: document and implement a stable tie-break (e.g. lexicographic
     target id, or explicit built-in ordering array). Add a p05-t01 test: from
     `cursor` host with both CLIs available, selection is stable across runs.

2. **`OAT_CURRENT_RUNTIME` declaration is designed but not planned in p06.**
   - Evidence: `design.md` Component 6 says the launcher (e.g.
     `oat-project-implement`) exports `OAT_CURRENT_RUNTIME`; `plan.md` p06-t01
     only notes that `cross-provider-exec` reads it when present and otherwise
     falls back to `hostDetectionCommand` — no task to stamp the env var from
     lifecycle skills.
   - Impact: declaration-first runtime identity is incomplete. Built-in
     `$CURSOR_AGENT` / `$CLAUDECODE` / Codex OR-detector cover standard hosts,
     but custom orchestrators and future multi-signal environments depend on
     detection order and priority ties instead of an authoritative stamp.
   - Fix guidance: either add a p06 sub-step ("export `OAT_CURRENT_RUNTIME` from
     Gate Execution preamble based on host") or downgrade design Component 6 to
     say declaration is optional V1 and built-ins are the primary path.

### Medium

1. **Cursor built-in `cursor-default` omits an explicit `--model` slug.**
   - Evidence: built-in `baseCommand: ["cursor-agent","-p","--force"]` with no
     `--model` (`plan.md` p01-t01; `design.md` Component 1).
   - Impact: when Cursor is the _dispatch_ target (e.g. from Codex/Claude with
     `--avoid same-runtime`), the subprocess uses the user's default Cursor model
     (from `~/.cursor/cli-config.json`), not a pinned review model. Independence
     is runtime-level only — acceptable for V1, but the plan should state that
     explicitly so implementers do not assume model-level independence.
   - Fix guidance: add one sentence to p01 built-in notes or Phase 5 intro:
     "V1 cursor-default does not pin `--model`; model choice is the user's Cursor
     default. Same-target / pinned model dispatch is `bl-e6fc`."

### Minor

1. **Cursor CLI binary alias `agent` is not mentioned.**
   - Evidence: both `cursor-agent` and `agent` resolve to the same build on a
     typical install; plan pins only `cursor-agent` for `baseCommand` and
     `availabilityCommand`.
   - Impact: users whose PATH exposes only `agent` get availability failures until
     they override via `gate target set`.
   - Fix guidance: document in built-in notes or doctor hint; optional future
     built-in fallback `["sh","-c","command -v cursor-agent || command -v agent"]`.

2. **`state.md` body is stale (Discovery in progress) while plan frontmatter is complete.**
   - Not a plan defect; housekeeping drift in a sibling artifact.

## Cursor Mechanics Assessment (focused review)

| Topic                        | Plan posture                        | Verdict                                                                                                       |
| ---------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Runtime detection            | `test -n "$CURSOR_AGENT"`           | Correct — verified in this Cursor session (`CURSOR_AGENT=1`).                                                 |
| Session identity             | Not used in V1                      | Correct — `CURSOR_CONVERSATION_ID` exists but is irrelevant for runtime-level avoidance.                      |
| Model identity               | Deferred to `bl-e6fc`               | Correct — no `CURSOR_MODEL` env var; `cursor-agent --list-models (current)` probe captured in backlog only.   |
| Headless dispatch            | `-p --force`                        | Correct for gate subprocesses that need shell/write tools.                                                    |
| Availability probe           | `cursor-agent --version`            | Works (exit 0); preferable to undocumented flags.                                                             |
| From Cursor + `same-runtime` | Excludes cursor; picks codex/claude | Correct intent; tie at priority 100 is the gap (Finding 1).                                                   |
| Same-target within Cursor    | Deferred `bl-e6fc`                  | Correct V1 boundary; backlog slug-vs-variant caveat (`composer-2.5` vs `composer-2.5-fast`) is well captured. |

## Spec/Design Alignment

| Area                                      | Status  | Notes                                                           |
| ----------------------------------------- | ------- | --------------------------------------------------------------- |
| V1 scope (runtime-level only)             | aligned | `same-target` deferred; plan footer matches design.             |
| Config shape `gates.{execTargets,skills}` | aligned | Matches design Components 1–2.                                  |
| Avoidance on CLI flag, not config         | aligned | No `execPolicy` in V1 schema tasks.                             |
| JSON argv target writes                   | aligned | p04-t02 explicit; Cursor model slug round-trip test included.   |
| Codex host detector                       | aligned | `$CODEX_THREAD_ID` ‖ `$CODEX_SESSION_ID` post-fix.              |
| Cursor host detector                      | aligned | `$CURSOR_AGENT`; not `CURSOR_SESSION`.                          |
| `OAT_CURRENT_RUNTIME`                     | partial | Design says launcher stamps; plan does not task it (Finding 2). |
| Parallelism `[[p02,p03]]`                 | aligned | Disjoint files; p01 foundational.                               |
| Release lockstep bump                     | aligned | p07 covers five public packages + `release:validate`.           |

### Extra Work (not in requirements)

None blocking — `cross-provider-exec` dispatcher is scope expansion from original thin-gate design but is now explicit in discovery/design goal line.

## Dispatch Profile Advisory

The plan has no `## Dispatch Profile` section. Normal for this project; not a finding.

## Prior Finding Disposition (v2 re-review)

| Prior finding                                      | Status   | Notes                                                            |
| -------------------------------------------------- | -------- | ---------------------------------------------------------------- |
| Codex detector pinned to absent `CODEX_SESSION_ID` | resolved | `34bbb3a3` + current plan/design use OR over thread/session ids. |
| `execPolicy` on `GateConfig`                       | resolved | V1 uses CLI `--avoid` only.                                      |
| JSON argv for provider flags                       | resolved | p04-t02 tests include `cursor-agent` + `--model`.                |
| Footer readiness                                   | resolved | "Ready for implementation."                                      |

## Verification Commands

- `test -n "$CURSOR_AGENT"` in Cursor agent shell → exit 0 (runtime detector valid).
- `cursor-agent --version` → exit 0.
- `cursor-agent --list-models | grep '(current)'` → `composer-2.5 (current)` (V2 probe reference only).
- `git log -1 --oneline -- plan.md` → `34bbb3a3 fix(oat): correct Codex host detector…`
- `pnpm run cli -- project validate-plan …` → CLI failed (control-plane module load error in dev tree; not a plan artifact issue).

## Recommended Next Step

Run `oat-project-review-receive` to disposition Important findings (tie-break rule +
`OAT_CURRENT_RUNTIME` task vs design downgrade). Address before or during p05/p06
implementation.
