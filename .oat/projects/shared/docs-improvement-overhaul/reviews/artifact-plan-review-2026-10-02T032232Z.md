---
oat_generated: true
oat_generated_at: 2026-10-02T03:22:32Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/docs-improvement-overhaul
oat_gate_run_id: 7b51c81d-c62c-42d2-aab5-1316713014c1
oat_gate_target: claude-opus-5-5-high
oat_gate_runtime: claude
oat_invocation_model: claude-opus-5-5
oat_invocation_reasoning_effort: high
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-10-02
**Scope:** `plan.md` artifact review (quick mode) against `discovery.md` and `design.md`; re-gate after the gate-attempt-01 clarifications
**Files reviewed:** 3 (`plan.md`, `discovery.md`, `design.md`), plus `reviews/artifact-plan-review-2026-10-02T031625Z.md`, `reviews/gate-attempt-01-recovery.md`, and repository spot checks of path, script, Turbo and CI claims
**Commits:** n/a (artifact review; reviewed at `fdf2953acacced6d6703763ef0c50624ad4755ef`)

**Dispatch audit (policy view):** `Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high`

**Reconnaissance:** not-attempted

## Review Scope

- Workflow mode: quick
- Discovery: `.oat/projects/shared/docs-improvement-overhaul/discovery.md`
- Design: `.oat/projects/shared/docs-improvement-overhaul/design.md` (lightweight design; present)
- Spec: not required in quick mode
- Plan: `.oat/projects/shared/docs-improvement-overhaul/plan.md`
- Dispatch Profile advisory: the plan has no `## Dispatch Profile` section. That is normal and is not a finding.
- Gate route: inline (runtime=claude, cliRoot validated against `OAT_GATE_CLI_ROOT`)

## Summary

The plan resolves all five findings from the previous gate attempt:

- M1, the full docs build cost: the plan now records an explicit decision at `plan.md:71`.
- M2, the inputs for permanent checks: the plan now defines durable inputs and a test with the project directory absent at `plan.md:129`.
- L1, the branch CLI for nav and index commands: `plan.md:141`.
- L2, formatting the generated agent index: the plan now regenerates it instead of formatting it, at `plan.md:157`.
- L3, later owner paths: these are now re-resolved from the p02 map at `plan.md:189`.

Spot checks against the repository confirm every named file, skill, script and CLI entry point: `cli:source`, `docs:check-links`, the app's `docs:format`, the CLI devDependency, and the pack-manifest `@shared/types` import. One Medium issue remains. CI runs `pnpm check` on a pristine checkout before any build, so the newly enrolled `docs:validate` does not have generated or exported output to read. The plan does not divide its checks between source-only work and checks that depend on the build. There are no blocking findings.

Findings by severity: 0 critical, 0 high, 1 medium, 1 low

## Findings

### Critical

None

### High

None

### Medium

- **M1 — `docs:validate` is enrolled in app `check`, which runs before any build on a pristine CI checkout, but the plan assigns it checks that need generated or exported output** (`plan.md:67`, `plan.md:95`, `plan.md:129`, `plan.md:153`)

  CI gate 1 is `pnpm check` (`.github/workflows/ci.yml:31`), which runs immediately after `pnpm install`. The Turbo `check` task depends only on `^build` (`turbo.json`), so the CLI is built but the docs app's own `prebuild` never runs. In a fresh checkout, the ignored Fumadocs `meta.json`, the sidecar, `.source/` and `out/` therefore do not exist. The p01-t02 app `check` value ends with `&& pnpm docs:validate` (`plan.md:67`).

  Three parts of the plan conflict with that order:
  - The design says `--check` compares output, including **missing** metadata (`design.md:51`). A `docs:validate` that calls the nav compiler's `--check` therefore fails CI gate 1 on every pristine run. To avoid that, it would have to write ignored output during a "check".
  - p02-t03 adds README-hosted-link validation against "exported routes" to `scripts/validate.ts` (`plan.md:151-153`).
  - `plan.md:129` lists "the current exported route inventory" as a permanent CI input.

  No exported route inventory exists when `check` runs. `plan.md:46` gestures at "source validation" for fresh checkouts but never says which assertions belong to which task. An implementer could reasonably wire the nav `--check` or an `out/` crawl into `validate.ts`, and that would turn CI gate 1 red.

  _Fix guidance:_ In p01-t02, state that `docs:validate` (and so app `check`) performs only source-only validation that works without generated output. It runs nav source validation without output comparison and checks committed catalog parity. Derive route existence from source files and Contents, not from `out/`. Put any assertion that needs generated metadata or the static export in the app `test` task, which Turbo runs after the app's own build, or in the explicit local-export crawl. Add a pristine-checkout control to p01-t02's acceptance: in a disposable worktree with no ignored output, `pnpm --filter oat-docs check` passes. The "project directory absent" probe at `plan.md:129` can share that disposable checkout.

### Low

- **L1 — Root `docs:test` bypasses Turbo's test→build dependency, so its preconditions are undefined** (`plan.md:63`, `plan.md:97`)

  Root `docs:test` is `pnpm --filter oat-docs test` (`plan.md:63`), not `turbo run test`. Unlike the CI path, it does not run the app's `prebuild`/`build` first. p01-t02 Verify runs `pnpm docs:test` before `pnpm build:docs`. Its tests "exercise generated metadata through real installed Fumadocs/MDX consumers" (`plan.md:95`). If those tests read the app's real generated metadata or `.source/` instead of generating into their own temporary fixtures, they will pass or fail depending on the last local build. That stale-input class is exactly the one this project is trying to remove.

  _Fix guidance:_ State that app tests are self-contained: they generate their inputs into temporary directories through the branch CLI subprocess and do not read app-level generated output. Otherwise, define root `docs:test` as `turbo run test --filter=oat-docs` so the build dependency applies.

## Spec/Design Alignment

### Requirements Coverage

| Requirement (discovery success criteria / design)                        | Status  | Notes                                                                                                           |
| ------------------------------------------------------------------------ | ------- | --------------------------------------------------------------------------------------------------------------- |
| Newcomer finds install + first success without internals                 | covered | p02 Getting Started migration; p05-t02 concepts visual; p05-t03 journeys                                        |
| Discover any supported skill without assuming a project                  | covered | p04 mapping, independent applicability audit, generated catalog                                                 |
| Each supported skill has useful canonical guidance                       | covered | p04-t03 minimum coverage; p05-t01 named gap list matches `design.md:92`                                         |
| Authored order/labels appear in rendered site                            | covered | p01 compiler, real-loader tests, browser smoke                                                                  |
| Workflow entrypoints distinguish mode/project/ideas/backlog/waves        | covered | p02 destination rules preserve the Workflows sequence                                                           |
| Repo links resolve; obsolete migration language removed; URLs may break  | covered | p02-t03 consumer repair, README target mapping, explicit breakage report; no aliases                            |
| Drift detectable via validation                                          | partial | Durable inputs are now defined (`plan.md:129`); see M1 for the split between `check`-time and post-build checks |
| README value, independent choices, first success, contributor setup last | covered | p03-t01/t02, including GitHub-render acceptance pending authorization                                           |
| Five purposeful visuals, accessible, theme/narrow verified               | covered | p03 SVG + p05-t02 four Mermaid treatments; p05-t03 independent computer-use QA                                  |
| Lockstep versions, bundles, eight DoD gates per PR                       | covered | Common Verification and Release Closeout; README-only p03 exemption is justified                                |
| Deliberate-testing: real oracles, negative controls                      | covered | Guard neutralization, stale/phantom mutations, cache-invalidation probes, project-absent probe                  |
| Prior gate findings (M1, M2, L1, L2, L3)                                 | covered | `plan.md:71`, `:129`, `:141`, `:157`, `:189`                                                                    |

### Extra Work (not in requirements)

None.

## Verification Commands

```bash
# M1: after p01-t02, app check must pass in a pristine checkout with no generated output
git worktree add --detach "$(mktemp -d)/pristine" HEAD   # then, inside it:
pnpm install --frozen-lockfile && pnpm --filter oat-docs check; echo "exit=$?"
# M1: confirm check does not depend on the app's own build
pnpm exec turbo run check --filter=oat-docs --dry=json | node -e 'const j=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log(j.tasks.map(t=>t.taskId))'
# L1: app tests should not read app-level generated output
rg -n "\.source|meta\.json|/out/" apps/oat-docs/tests
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to turn these findings into plan updates.
