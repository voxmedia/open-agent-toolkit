---
oat_generated: true
oat_generated_at: 2026-07-10T05:26:17Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/gate-review-provenance-target-safety
---

# Artifact Review: plan

**Reviewed:** 2026-07-10T05:26:17Z
**Scope:** plan (third gate review — static-catalogue and scoped-materialization revision)
**Files reviewed:** 3 (plan.md primary; discovery.md, design.md as upstream requirement sources)

## Summary

The revised plan correctly encodes the three new architecture decisions: a committed 26-variant supported Codex catalogue, configuration-provenance-scoped custom role materialization with ownership-constrained cleanup, and deterministic pinned dispatch (exact registered role or explicitly pinned fresh child) with no reload/restart dependency and no silent base-role downgrade. All six gate verification asks pass, all referenced files and symbols exist in the source tree, and Phases 1-4 remain unchanged in substance and still cover the four backlog items without dispatch-machine scope creep. Three minor wording/verifiability nits remain; none blocks implementation readiness.

Findings: 0 critical, 0 important, 0 medium, 3 minor

## Findings

### Critical

None

### Important

None

### Medium

None

### Minor

- **"Retain Claude `economy/balanced -> sonnet`" is a change, not a retention, at the bundled-recommendation level** (`plan.md:112`)
  - Issue: The bundled recommendation currently maps Claude `economy -> haiku` (`packages/cli/config/dispatch-matrix-recommendation.json:11`). The confirmed ladder in discovery (`discovery.md:77`) and the live user config both use `economy/balanced -> sonnet`, so p00-t02 step 4 actually rewrites the bundled Claude economy cell. An implementer reading "retain" against the current file could plausibly leave `haiku` in place.
  - Suggestion: Reword step 4 to state the full target end-state of the bundled recommendation (e.g., "set the recommended Claude ladder to `economy/balanced -> sonnet`, `high -> opus`, `frontier -> fable`") and have the step-6 tests pin the Claude cells alongside the Codex cells.

- **p00-t01 step 6 live-configuration verification has no corresponding Verify command** (`plan.md:66`, `plan.md:68-73`)
  - Issue: Step 6 requires restoring `~/.oat/config.json` Frontier to `gpt-5.6-sol/max` and verifying "implementer/reviewer resolution plus all four Cursor tiers from the live layered configuration", but the task's Verify block runs only vitest and type-check, which exercise fixtures rather than the live layered config. The claimed verification is not executable as written.
  - Suggestion: Add an explicit live preflight command to the Verify block, e.g. `pnpm run cli -- project dispatch-ceiling resolve --provider codex --preflight --json` (and the cursor equivalent), matching design.md's Dispatch Preflight API (`design.md:332`).

- **p00-t03 step 5's "exact Cursor model strings" test placement is ambiguous** (`plan.md:150`, `plan.md:153-159`)
  - Issue: Step 5 lists "exact Cursor model strings" among the workflow contract tests, but p00-t03's Verify files (`sync-extension.test.ts`, `sync/index.test.ts`, `skills.test.ts`) are Codex-sync and skill-text surfaces where Cursor strings do not naturally live; Cursor compile-opacity coverage is already owned by p00-t01 step 5 (`plan.md:65`).
  - Suggestion: Either scope step 5's Cursor mention to skill-guidance text assertions (in `skills.test.ts`) or drop it and rely on p00-t01's resolver-level coverage to avoid duplicated or homeless test intent.

## Requirements/Design Alignment

**Evidence sources used:** `plan.md` (artifact under review), `discovery.md` (quick-mode requirement source, Key Decisions 8-12, Success Criteria, Constraints, Out of Scope), `design.md` (Dispatch Readiness/Catalogue/Scoped Materialization component, Supported Codex Role Catalogue, Scoped Custom Role Ownership, Codex Provider Sync, Testing Strategy), prior archived plan reviews (context only). spec.md intentionally absent (quick mode) — not flagged.

| Upstream requirement                                                                                                             | Plan coverage                                                                        | Status    |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------- |
| Decision 8: readiness = adapter compilation, prompt/block on incomplete Codex intent (`discovery.md:90`)                         | p00-t01 steps 1-2 (`plan.md:61-62`)                                                  | covered   |
| Decision 9: fill-missing adoption preserves explicit values (`discovery.md:91`)                                                  | p00-t02 step 5 (`plan.md:113`)                                                       | covered   |
| Decision 10: pre-registered supported roles, Luna/Terra 4 efforts + Sol 5 (`discovery.md:92`)                                    | p00-t02 step 1 (`plan.md:109`)                                                       | covered   |
| Decision 11: configuration provenance owns custom roles, user vs project scope (`discovery.md:93`)                               | p00-t02 steps 2-3 (`plan.md:110-111`)                                                | covered   |
| Decision 12: no reload dependency; registered role or pinned fresh child (`discovery.md:94`)                                     | p00-t02 step 3, p00-t03 step 3 (`plan.md:111`, `plan.md:148`)                        | covered   |
| Success: `max` first-class, below-cap retains target, exactly 26 variants (`discovery.md:119`)                                   | p00-t01 steps 3-5, p00-t02 steps 1+6 (`plan.md:63-65`, `plan.md:109`, `plan.md:114`) | covered   |
| Success: scoped sync + ownership-aware cleanup (`discovery.md:120`)                                                              | p00-t02 steps 2-3, 6 (`plan.md:110-111`, `plan.md:114`)                              | covered   |
| Success: same resolver for all plan/review paths, no silent base substitute (`discovery.md:121`)                                 | p00-t03 steps 1-5 (`plan.md:146-150`)                                                | covered   |
| Backlog: record-gate-review-model                                                                                                | Phase 1 (p01-t01..t04)                                                               | covered   |
| Backlog: declare-gate-review-target                                                                                              | Phase 2 (p02-t01..t03)                                                               | covered   |
| Backlog: support-producer-identity                                                                                               | Phase 3 (p03-t01)                                                                    | covered   |
| Backlog: ask-to-enable-phase-review                                                                                              | Phase 4 (p04-t01..t03)                                                               | covered   |
| Constraint: no dispatch-machine schema/renderer/runtime-confirmation (`discovery.md:99`, `discovery.md:105`, `discovery.md:125`) | No p00-p04 step introduces these                                                     | respected |

**Format and readiness checks:** Frontmatter complete and valid; stable monotonic task IDs (p00-t01..p04-t03); Reviews table present with both prior passed rows preserved plus the pending row for this review (`plan.md:503-505`, archived artifacts verified on disk); Implementation Complete totals 14 = 3+4+3+1+3 (`plan.md:513-519`); References list design, discovery, and all four backlog IDs. Version-bump deferral chain is internally consistent: `oat-project-implement` final edit p02-t03 (bumped there, `plan.md:353`), `oat-reviewer`/`oat-project-review-provide` final edit p01-t04 (bumped there, `plan.md:268`), `oat-project-plan-writing` final edit p04-t01, plan/quick-start/import-plan final edits p04-t02 (`plan.md:438`) — matching the deliberate Phase 2 deferral note (`plan.md:283`). No `## Dispatch Profile` section present (normal; not flagged). All 33 referenced source/test/docs/skill files verified to exist; verify-block scripts (`oat:validate-skills`, `docs:check-links`, `release:validate`, cli `type-check`) exist, and root `--json` placement in `pnpm run cli -- --json gate target list` is valid (`packages/cli/src/app/create-program.ts:13`).

### Extra Work (not in declared requirements)

None. The p00 revision stays within the authorized prerequisite boundary (`discovery.md:26`, `discovery.md:105`).

## Gate Verification Asks

1. **Committed supported Codex role catalogue — PASS.** p00-t02 step 1 (`plan.md:109`) commits Luna/Terra at `low|medium|high|xhigh` and Sol at those plus `max` = 13 targets, expanded for implementer and reviewer roles = exactly 26 committed variants with stable `.codex/config.toml` registrations, matching `design.md:214-220` and Decision 10 (`discovery.md:92`). Availability precedes provider startup because the variants are committed repo state (Goal/Architecture, `plan.md:22-24`), replacing the current 4-variants-per-role view (`.codex/config.toml:20-50`, 8 pinned agents on disk). Generation lives in new `catalog.ts`/`catalog.test.ts` plus regenerated `.codex` assets (`plan.md:88-103`); step 6 (`plan.md:114`) covers exact catalogue membership and stable/idempotent generation, matching design's byte-identical second-sync test (`design.md:473`).

2. **Configuration-provenance scope ownership — PASS.** p00-t02 step 2 (`plan.md:110`) names the three ownership markers (`supported-catalogue` | `user-config` | `project-config`, matching `CodexRoleOwner` at `design.md:227`), reconciles user-config custom targets only under `~/.codex` and project-config custom targets only under the tracked project `.codex` view. Step 3 (`plan.md:111`) routes `oat sync --scope user|project|all` to the corresponding passes and constrains cleanup to matching ownership markers so no scope can remove supported roles, another scope's roles, or unrelated provider entries — matching `design.md:229-233` and `design.md:343-348`. Step 6 covers scope routing and ownership-safe cleanup tests (`design.md:474`).

3. **Deterministic managed reviewer dispatch before implementation — PASS.** p00-t03 step 2 (`plan.md:147`) routes spec-driven, quick-start, import-plan, provider-plan import, implementation phases, artifact reviews, and phase/final reviews through the same resolver-selected role contract; step 3 (`plan.md:148`) uses the exact registered variant when the host supports role selection and otherwise a fresh Codex child pinned to explicit model + reasoning effort + canonical role instructions, without provider restart or workflow-time materialization (Decision 12, `discovery.md:94`; `design.md:65`, `design.md:339`); step 4 (`plan.md:149`) restricts base-role use to explicit inherit/default and documented managed-uncapped reviewer behavior, requires missing managed targets to prompt or block, and forbids silent downgrade; steps 1 and 5 (`plan.md:146`, `plan.md:150`) add the unresolved-cell preflight requirement and workflow contract tests, matching `design.md:498-500`.

4. **Max effort support — PASS.** p00-t01 step 3 (`plan.md:63`) extends `WorkflowCodexDispatchCeiling` (verified currently `'low'|'medium'|'high'|'xhigh'` at `packages/cli/src/config/oat-config.ts:42`), `VALID_CODEX_DISPATCH_CEILINGS` (`oat-config.ts:149`, consumed by `packages/cli/src/providers/ceiling/registry.ts:77-80` and `packages/cli/src/commands/project/dispatch-ceiling/index.ts:23,135`), and the resolver/provider ordered value path to include `max`, with materializer compilation uncoerced (the materializer already accepts effort as a free string, `packages/cli/src/commands/providers/codex/materialize.ts:22,96`; Sol `max` catalogue variants are test-covered in p00-t02 via `materialize.test.ts` and `catalog.test.ts`). Step 5 (`plan.md:65`) adds explicit-`max` target test coverage, and step 6 (`plan.md:66`) restores the user Frontier target to `gpt-5.6-sol/max` only after `max` resolves — the live config is confirmed currently downgraded to `gpt-5.6-sol/xhigh`, so the restore step is real and correctly sequenced. (Minor finding 2 asks for an executable live-verification command.)

5. **Exact Cursor model-string preservation — PASS.** p00-t01 step 5 (`plan.md:65`) proves all four configured strings (`gpt-5.6-luna-high`, `gpt-5.6-terra-xhigh`, `gpt-5.6-sol-high`, `gpt-5.6-sol-max`) remain opaque and compile unchanged; p00-t02 step 5 (`plan.md:113`) preserves the exact Cursor strings through adoption; p01-t03 step 4 (`plan.md:233`) covers gate invocation provenance for the live Cursor exec-target shapes `gpt-5.6-sol-max` and `claude-fable-5-xhigh` without command parsing — both verified present in the live user config gate execTargets. Matches `design.md:471` Cursor-opacity testing.

6. **Original gate provenance scope intact — PASS.** Phases 1-4 still deliver the four backlog items: p01 invocation metadata/inspection/prompt-JSON provenance/artifact validation (`plan.md:165-277`), p02 declared and corroborated review project with fail-closed mismatch (`plan.md:281-363`), p03 aggregated producer provenance (`plan.md:367-391`), p04 opt-in shared phase-review setup plus release validation (`plan.md:395-487`) — mapping to discovery success criteria (`discovery.md:110-117`) and the four backlog references (`plan.md:527-530`). No p00 task introduces route/policy/requested-controls schema, a generalized renderer, or a runtime-confirmation contract; p00 confines itself to the existing resolver, matrix, codec, and sync surfaces, matching the design boundary (`design.md:96`) and Out of Scope (`discovery.md:125`, `discovery.md:131-132`).

**Advisories honored:** No Dispatch Profile section (normal, not flagged). spec.md absent per quick mode (not flagged). The Phase 2 deferred-version-bump note (`plan.md:283`) is internally consistent with p00-t03 step 6, p02-t03 step 5, and p04-t02 step 3 (verified deferral chain above) and is not flagged as a defect.

## Verification Commands

```bash
# Confirm plan-referenced symbols and current (pre-change) codex ceiling values
grep -n "WorkflowCodexDispatchCeiling\|VALID_CODEX_DISPATCH_CEILINGS" packages/cli/src/config/oat-config.ts

# Confirm bundled recommendation still has effort-only Codex cells and Claude economy=haiku (Minor 1 context)
cat packages/cli/config/dispatch-matrix-recommendation.json

# Confirm the current committed .codex view has only the 4 selected variants per role (pre-catalogue baseline)
ls .codex/agents/ && grep -c "oat-phase-implementer-gpt\|oat-reviewer-gpt" .codex/config.toml

# Confirm all plan-referenced files exist
for f in packages/cli/src/providers/codex/codec/{shared,config-merge,sync-extension}.ts \
  packages/cli/src/commands/providers/codex/materialize.ts \
  packages/cli/src/commands/{sync,status,config}/index.ts \
  packages/cli/src/commands/gate/{index,review-verdict}.ts; do test -f "$f" && echo "OK $f"; done

# Confirm root --json placement used by p01-t02 verify is valid
grep -n "'--json'" packages/cli/src/app/create-program.ts
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to disposition the three minor findings and mark this plan review row passed; the plan is ready for implementation.
