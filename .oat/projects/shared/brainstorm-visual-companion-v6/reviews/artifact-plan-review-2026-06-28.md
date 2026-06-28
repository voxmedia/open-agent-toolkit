---
oat_generated: true
oat_generated_at: 2026-06-28
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/brainstorm-visual-companion-v6
---

# Artifact Review: plan

**Reviewed:** 2026-06-28
**Scope:** `plan.md` (quick-mode plan artifact, pre-implement handoff)
**Files reviewed:** 2 (plan.md, discovery.md) + codebase feasibility spot-checks
**Commits:** n/a (artifact review)

## Summary

The plan is well-structured, canonical-format conformant, and maps cleanly onto the discovery
success criteria, key decisions, and out-of-scope boundaries. Task IDs are stable and monotonic,
file scopes are bounded, the sequential parallelism claim is justified, and the referenced files,
packages, and validation scripts all exist. The main gap is that the headline security guarantees
of this parity project (file-server sandbox + security headers) have no automated regression
coverage in the test task; a few verification-command and ownership inconsistencies are also worth
tightening before implementation.

## Findings

### Critical

None

### Important

- **Security sandbox and headers (Success Criterion #1) have no automated test coverage** (`plan.md:238-263` / `discovery.md:122`)
  - Issue: The whole premise of this project is v6 security parity. Baseline `server.cjs` (v5.0.7)
    confirms the sandbox is genuinely new: no `?key=` session auth, no `X-Frame-Options`/
    `Cache-Control: no-store`, and no traversal/symlink/dotfile guards exist today
    (`.agents/skills/oat-brainstorm/scripts/server.cjs`). Success Criterion #1 requires the file
    server to "reject traversal/symlinks/dotfiles" and emit "security headers present". But the
    only security-related assertions in the test task `p03-t01` are a keyed `?key=` URL in
    `server-started` JSON and an unauthenticated `GET /` returning 401/403. There is no test that
    asserts traversal/dotfile/symlink rejection on `/files/`, and none that asserts the security
    headers. These headline deliverables would ship with zero regression protection.
  - Note on alignment: the plan is faithful to discovery Key Decision #5 (`discovery.md:110`),
    which scoped automated tests to "session key, restart reuse, and stop-server instance-ID
    behavior" only — so the gap is partly a discovery scoping choice, not solely a plan defect.
  - Fix: Expand `p03-t01` with two cheap assertions (both are low-cost on the harness that already
    spawns the server): (1) assert the `Cache-Control: no-store` and `X-Frame-Options: DENY`
    headers on the existing authenticated/unauthenticated `fetch` response, and (2) one negative
    `GET` against `/files/` with a traversal payload (e.g. `/files/../server.cjs` or a dotfile path)
    expecting a 4xx. Alternatively, if these are intentionally left to manual/port inspection,
    state that explicitly in the plan and `discovery.md` Key Decision #5 so the success-criteria-vs-
    test scope is reconciled rather than silently divergent.

### Medium

- **SKILL.md version-bump ownership is split and self-contradictory between p02-t02 and p03-t02** (`plan.md:218`, `plan.md:272`, `plan.md:292`)
  - Issue: `p02-t02` instructs "Bump skill frontmatter `version:` (required for skill change)".
    `p03-t02` then lists `.agents/skills/oat-brainstorm/SKILL.md (version if not done in p02-t02)`
    in its Files block, but its `git add` (`plan.md:292`) omits `SKILL.md` entirely. If the bump
    is done in `p02-t02` (as instructed), the `p03-t02` Files entry is a dead/contradictory item;
    if it is somehow deferred to `p03-t02`, the change would never be staged by the listed commit.
    Either way the release guardrail (one PR-scoped skill version bump) hinges on an ambiguous
    owner. Current `SKILL.md` is `version: 1.1.0`.
  - Fix: Assign the SKILL.md version bump unambiguously to `p02-t02` and remove the
    "(version if not done in p02-t02)" line from `p03-t02`'s Files block, or — if the bump must
    co-land with the lockstep package bump in `p03-t02` — move it wholly into `p03-t02` and add
    `SKILL.md` to that task's `git add`.

- **`p03-t02` verification command `pnpm test --filter visual-companion-smoke` is an invalid package filter** (`plan.md:286`)
  - Issue: `pnpm test` resolves to `turbo run test`, and Turbo `--filter` matches package names,
    not test files. There is no package named `visual-companion-smoke`, so this filter selects no
    package (Turbo errors/runs nothing). Only the in-step fallback `pnpm test` is valid. The other
    smoke invocations in the plan use `pnpm exec vitest run packages/cli/src/integration/visual-companion-smoke.test.ts`,
    so the verification surface is inconsistent. Note the cli vitest config lives only at
    `packages/cli/vitest.config.ts` (no root config), so package-scoped invocation is the reliable
    form.
  - Fix: Replace with a canonical command, e.g. `pnpm --filter @open-agent-toolkit/cli test`
    (full cli suite) or `pnpm --filter @open-agent-toolkit/cli exec vitest run src/integration/visual-companion-smoke.test.ts`
    for the single file. Align the other smoke-test verification steps to the same form.

### Minor

- **`p01-t01` Step 1 is labeled "(RED)" but expects the suite to pass** (`plan.md:52-55`)
  - Issue: The step is titled "Baseline check (RED)" yet its Expected is "Current tests pass on
    v5.0.7 baseline (establishes green before port)." A RED step by convention expects a failing
    assertion; this is a green baseline. The mislabel can confuse an implementer following strict
    RED/GREEN discipline.
  - Suggestion: Rename to "Baseline check (GREEN baseline)" or just "Baseline check". The port
    tasks `p01-t02/t03/t04` correctly use GREEN-only steps; only `p03-t01` is genuinely RED-first.

- **Success Criterion #4 (client status pill / paused overlay) is verified only by manual grep** (`plan.md:104-105`, `discovery.md:125`)
  - Issue: `p01-t02` Step 2 verification is "Manual: grep frame for `.status` and helper for
    `setStatus` — both present." This confirms element/handler presence, not reconnect/overlay
    behavior, and is not automated. Discovery assumptions (`discovery.md:153`) acknowledge the
    smoke harness cannot drive a browser, so leaving UI behavior to manual verification is
    defensible — but the plan should make that explicit rather than implying coverage.
  - Suggestion: Add a one-line note in `p01-t02` (or `implementation.md` expectation) that the
    status-pill/paused-overlay behavior is verified manually in a browser and is intentionally
    outside automated smoke scope.

- **Idle-timeout interface seam (minutes flag vs ms env) is unstated** (`plan.md:64`, `plan.md:130`)
  - Issue: `p01-t01` has `server.cjs` read `BRAINSTORM_IDLE_TIMEOUT_MS` (milliseconds, default 4h),
    while `p01-t03` adds a `--idle-timeout-minutes` flag to `start-server.sh`. Baseline confirms the
    current server hardcodes `IDLE_TIMEOUT_MS = 30 * 60 * 1000`, so this is new wiring. The plan
    does not state that `start-server.sh` must convert minutes→ms and export the env var the server
    reads, leaving a small seam an implementer could get wrong (units mismatch → wrong idle window).
  - Suggestion: Add a sentence to `p01-t03` specifying that `--idle-timeout-minutes` is converted to
    milliseconds and passed via `BRAINSTORM_IDLE_TIMEOUT_MS` so the server/launcher agree on units.

## Requirements/Discovery Alignment

**Evidence sources used:** `plan.md`, `discovery.md` (quick mode — no `spec.md`/`design.md`, expected and not flagged). Codebase feasibility spot-checks against `.agents/skills/oat-brainstorm/`, `packages/cli/src/integration/visual-companion-smoke.test.ts`, `NOTICES.md`, the five lockstep `package.json` files, root `package.json` scripts, and the referenced project-summary/backlog files.

### Discovery Coverage

| Discovery item                                                                                 | Status      | Notes                                                                                                                     |
| ---------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| SC#1 Session-key auth (HTTP+WS), file sandbox (traversal/symlink/dotfile), security headers    | partial     | Behavior ported in `p01-t01`; auth rejection tested in `p03-t01`; sandbox + headers have no automated test (Important I1) |
| SC#2 Restart reuses port/key with same `--project-dir`/repo                                    | implemented | `p01-t03` persistence + `.last-port`/`.last-token`; `p03-t01` restart-reuse test                                          |
| SC#3 Idle default 4h configurable; stop-server instance-ID guard                               | implemented | `p01-t01` idle (ms env), `p01-t03` minutes flag (units seam — m3), `p01-t04` instance guard                               |
| SC#4 Client status pill + paused overlay                                                       | partial     | `p01-t02` port; verification is manual grep only (Minor)                                                                  |
| SC#5 SKILL.md + visual-companion.md document key URL/`--open`/restart/idle                     | implemented | `p02-t01`, `p02-t02`                                                                                                      |
| SC#6 Smoke test passes; `release:validate` passes after bump                                   | implemented | `p03-t01`, `p03-t02` (verification cmd issue — M2)                                                                        |
| SC#7 NOTICES updated to v6.0.3 adapted port                                                    | implemented | `p03-t02`; baseline `NOTICES.md` currently says 5.0.7/verbatim                                                            |
| KD#1 Upstream target v6.0.3 tag (file source)                                                  | implemented | Plan References reconcile "v6.0.0 notes; v6.0.3 tag for file source" — consistent with discovery's SDD-only note          |
| KD#2 Three-tier OAT persistence resolution                                                     | implemented | `p01-t03` enumerates `--project-dir` / repo walk-up / `~/.oat`                                                            |
| KD#3 Preserve Activation Contract / offer / dispatcher                                         | implemented | `p02-t02` explicitly "Do not change Activation Contract or destination logic"                                             |
| KD#4 Lockstep five-package bump + `release:validate`                                           | implemented | `p03-t02`; all five `package.json` files confirmed present                                                                |
| KD#5 Tests: session key, restart reuse, stop-server instance                                   | implemented | `p03-t01` (note tension with SC#1 — see I1)                                                                               |
| KD#6 / Out-of-scope: synthesis self-review, CLI wrapper, SDD, harness bootstraps, live dogfood | respected   | No tasks stray into deferred/out-of-scope areas                                                                           |
| Open Q: user-scope token persistence at `~/.oat/brainstorm/`                                   | implemented | `p01-t03` fallback writes `.last-port`/`.last-token` there                                                                |
| Open Q: rebrand frame title to "OAT Brainstorm"                                                | implemented | `p01-t02` header rebrand                                                                                                  |

### Extra Work (not in declared requirements)

None. Phase 4 (`p04-t01`, optional tool-packs docs touchpoint) falls within the discovery
constraint "NOTICES/version/docs touchpoints only" and includes an explicit skip path with an
`implementation.md` log note, so it is not scope creep.

## Verification Commands

```bash
# Confirm the validation/release scripts the plan relies on exist
node -e "const s=require('./package.json').scripts; console.log('oat:validate-skills=',s['oat:validate-skills']); console.log('release:validate=',s['release:validate'])"

# Confirm the test file and bundle scripts the plan targets exist
ls .agents/skills/oat-brainstorm/scripts/ packages/cli/src/integration/visual-companion-smoke.test.ts

# Reliable single-file smoke invocation (replaces the invalid --filter form in p03-t02)
pnpm --filter @open-agent-toolkit/cli exec vitest run src/integration/visual-companion-smoke.test.ts

# Confirm current baseline lacks the new security behaviors (justifies I1)
grep -nE "X-Frame-Options|no-store|brainstorm-server-id|\?key=" .agents/skills/oat-brainstorm/scripts/server.cjs || echo "none present in baseline"

# Confirm all five lockstep packages exist for the p03-t02 bump
ls packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert these findings into plan tasks (or to
record explicit deferrals/artifact-alignment edits for the Important security-test gap and the
Medium ownership/verification-command items) before handing off to `oat-project-implement`.
