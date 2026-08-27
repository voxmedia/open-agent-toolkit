---
oat_generated: true
oat_generated_at: 2026-08-27T02:03:56Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/user-scope-tool-packs
oat_gate_run_id: a0aff271-23cc-4e00-aedd-f84c65662d4c
oat_gate_target: claude-fable-skip-permissions
oat_gate_runtime: claude
oat_invocation_model: fable
oat_invocation_reasoning_effort: provider-default
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-08-27T02:03:56Z
**Scope:** `plan.md` readiness and alignment with `spec.md` + `design.md`
(spec-driven mode); verification pass after the first gate's fix commit
`d85cad646`
**Files reviewed:** 3 (`plan.md`, `spec.md`, `design.md`), plus repository
verification of every `Create:`/`Modify:` path, root and CLI package scripts,
the vitest include pattern, `pjm doctor` JSON output, bundled-skill consumers of
`tools has project-management` and `resolve-tracking.sh`, and
`install-sync-context.ts`
**Commits:** n/a (artifact review)

Dispatch: route=inline; policy=inherit (project-state); selection=inherit-default;
model_axis=inherited; effort_axis=not-applicable; runtimeIdentity=not-reported.
Gate route: inline (runtime=claude, cliRoot validated against
`OAT_GATE_CLI_ROOT`).

## Summary

All seven findings from the prior gate review
(`reviews/archived/artifact-plan-review-2026-08-27T015201Z.md`) are resolved in
the artifacts and verified against the repository: p04-t07 now covers the three
`tools has project-management` consumers and is mapped in FR6/FR9/NFR3, p04-t05
covers all five `resolve-tracking.sh` consumers with a bundled-skill sweep,
p05-t05 names `public-package-versions.json`, the Requirement Index maps
p04-t05/p05-t03, the p02-t09/p04-t04 file/RED mismatches are fixed, p05-t02
lists `configuration.md` and index regeneration, and the artifact-less
self-review row is downgraded to `pending`. The plan is executable: 34 stable
tasks across five sequential phases, every `Modify:` target exists (the six
"missing" ones are created earlier in the plan), every `Create:` target is
absent, every RED/format/verify command resolves to a real script or vitest
target, and the Reviews table is the widened eight-column ledger. One Medium
remains: p04-t07 makes three skills branch on "the read-only doctor JSON
adoption state" but p04-t02 never names the field `oat pjm doctor --json` will
emit, and today's doctor keys its `pjm:disabled` check on project
`tools.project-management` rather than adoption.

Findings: 0 critical, 0 important, 1 medium, 3 minor

## Findings

### Critical

None

### Important

None

### Medium

- **p04-t02 and p04-t07 share an unnamed `pjm doctor --json` adoption
  contract** (`.oat/projects/shared/user-scope-tool-packs/plan.md:823-833`,
  `plan.md:1001-1014`; `packages/cli/src/commands/pjm/index.ts:192-222`,
  `packages/cli/src/commands/pjm/doctor.ts:200-219`)
  - Issue: p04-t07 requires `oat-project-document`, `oat-project-summary`, and
    `oat-brainstorm` to run a read-only `oat pjm doctor --json` preflight and
    "branch on the read-only doctor JSON adoption state", and its RED contract
    test must assert that. Today `pjm doctor --json` emits only
    `{ status, repoRoot, checks }`, and its `pjm:disabled` check is keyed on the
    merged project config `config.tools['project-management'] === true`
    (`pjm/index.ts:212-215`, `doctor.ts:204-219`) — which under FR1/FR3 becomes
    project-scope pack intent, not repository adoption, so a user-scope PJM
    install in an adopted repo would report "disabled". p04-t02's RED step only
    says "doctor read-only output" and its GREEN step does not say doctor must
    re-key on `resolvePjmAdoption()` or what field/enum it exposes. Two tasks in
    the same phase therefore depend on a JSON shape that neither defines, and
    the p04-t07 skill text plus contract test cannot be written unambiguously
    (the prior review's I1 fix guidance asked for exactly this field to be
    named).
  - Fix: In p04-t02, state that `pjm doctor` (a) derives enabled/adopted state
    from `resolvePjmAdoption()` instead of project `tools.project-management`,
    and (b) adds an additive top-level JSON field with a fixed shape, e.g.
    `adoption: { state: 'declared' | 'inferred-legacy' | 'partial' | 'none',
repoRoot, recovery: 'oat pjm init' | null }`, covered by
    `doctor.test.ts`. Then have p04-t07 reference that exact field (`.adoption.state`)
    in the skill preflight snippet and in the contract test's expected pattern.
    Record the same shape in `design.md` → PJM Adoption Guard as an artifact
    alignment note.
  - Requirement: FR6, NFR4

### Minor

- **`install-sync-context.ts` per-pack canonical-path switch is unowned by any
  task** (`packages/cli/src/commands/tools/shared/install-sync-context.ts:34-57`;
  `.oat/projects/shared/user-scope-tool-packs/plan.md:292-321`)
  - Issue: `canonicalPathsForPack()` is a hand-maintained `switch (pack)` over
    the legacy `*_SKILLS`/`*_AGENTS` arrays and is consumed by all eight direct
    installers, `init/tools/index.ts`, and `tools/install/index.ts`. p01-t02
    turns those arrays into manifest-derived views and p02-t01 has
    `planPackReconcile()` return `changedCanonicalPaths`, so after Phase 2 there
    are two sources for "canonical provider paths of a pack". The exhaustive
    switch fails type-check on a new `PackName`, so the miss is not silent, but
    the design's manifest component explicitly owns "derived helpers for
    canonical provider paths" and the plan never says whether this file is
    deleted, re-pointed at the manifest, or kept as a compatibility adapter.
  - Suggestion: Add `install-sync-context.ts` (and its test) to p02-t01's or
    p02-t03's Files list with one sentence: replace `canonicalPathsForPack` with
    the manifest helper (or make it a thin wrapper), keeping
    `setInstalledCanonicalPaths`/`getInstalledCanonicalPaths` as the command
    hand-off.

- **Task file lists and RED commands still disagree in two tasks**
  (`.oat/projects/shared/user-scope-tool-packs/plan.md:253-264`, `:849-864`)
  - Issue: p01-t07's RED command runs
    `src/commands/tools/shared/pack-inventory.test.ts` but the task's Files
    list has only `pack-inventory.ts`; p04-t03's RED command runs
    `src/commands/pjm/init.test.ts` but Files lists only `pjm/init.ts`. Same
    pattern the prior review fixed for p02-t09/p04-t04.
  - Suggestion: Add `pack-inventory.test.ts` to p01-t07 and `pjm/init.test.ts`
    to p04-t03 Files (and their format commands) so the implementer commits and
    runs the same set.

- **Unbound `pending` plan row carries a date and invocation**
  (`.oat/projects/shared/user-scope-tool-packs/plan.md:1267`)
  - Issue: The self-review placeholder was correctly downgraded from `passed`
    to `pending`, but it still records `Date 2026-08-27` and
    `Invocation manual` while its Artifact is `-`. Every other unbound
    placeholder uses `-` in those cells, and the ledger contract records
    Invocation only for code reviews.
  - Suggestion: During receive, set Date and Invocation to `-` on that row (do
    not delete it), or leave it and accept the cosmetic inconsistency.

## Requirements/Design Alignment

**Evidence sources used:** `plan.md`, `spec.md` (Requirement Index), `design.md`
(component design, Review Disposition I1–m4), `state.md`, prior plan review
artifact, and repository files named by the plan (paths, root/CLI `package.json`
scripts, `vitest.config.ts`, `skill-manifest.ts`, `init/tools/index.ts`,
`pjm/index.ts`, `pjm/doctor.ts`, `install-sync-context.ts`, consumer skills).

### Requirements Coverage

| Requirement | Status  | Notes                                                                                     |
| ----------- | ------- | ----------------------------------------------------------------------------------------- |
| FR1         | planned | p01-t01/t02, p02-t03/t04; `USER_ELIGIBLE_PACKS` has one non-test consumer, covered        |
| FR2         | planned | Manifest, digests, inventory, p04-t05 scope-paired scripts (all five consumers verified)  |
| FR3         | planned | p01-t04/t05, p02-t07                                                                      |
| FR4         | planned | p01-t06, p02-t05/t06, p05-t01                                                             |
| FR5         | planned | p02-t01…t09, p05-t03; see m1 for the duplicate canonical-path helper                      |
| FR6         | planned | p04-t01/t02/t04/t06/t07; see M1 for the doctor JSON adoption field                        |
| FR7         | planned | p04-t03 resolver; p04-t04 override seeding                                                |
| FR8         | planned | p03-t01…t05 with injected failures and non-interactive stop                               |
| FR9         | planned | p01-t05, p02-t03/t07/t08, p03-t05, p04-t07                                                |
| FR10        | planned | p05-t02 (11 pages + index regen), p03-t04 help, p02-t06, p05-t01                          |
| NFR1        | planned | p01-t07 real-path validation (`validatePathWithinScope` exists), p02-t02/t08, p03-t01…t05 |
| NFR2        | planned | p01-t03, p02-t01/t02, p02-t07/t08, p05-t04                                                |
| NFR3        | planned | Compatibility adapters, legacy command parity, p04-t07                                    |
| NFR4        | planned | p02-t05/t06, p03-t04, p05-t01; M1 affects doctor JSON structure                           |
| NFR5        | planned | p01-t03/t06/t07                                                                           |

### Design Component Coverage

| Design component                | Tasks                                                                     |
| ------------------------------- | ------------------------------------------------------------------------- |
| Canonical Pack Manifest         | p01-t01, p01-t02                                                          |
| Scoped Pack Intent Store        | p01-t04, p01-t05                                                          |
| Pack Inventory                  | p01-t06, p01-t07                                                          |
| Reconcile Planner and Executor  | p02-t01, p02-t02                                                          |
| Lifecycle Command Adapters      | p02-t03 … p02-t09 (guided setup via `runInitToolsWithDefaults` → p02-t03) |
| Scope Migration Command         | p03-t01 … p03-t05                                                         |
| PJM Adoption Guard (CLI)        | p04-t01, p04-t02 — see M1                                                 |
| PJM Adoption Guard (skills)     | p04-t06, p04-t07                                                          |
| PJM Template Resolver           | p04-t03                                                                   |
| Skill-Local Resource Resolution | p04-t05, p04-t06                                                          |
| Status/doctor diagnostics       | p05-t01                                                                   |
| Docs, provider materialization  | p05-t02, p05-t03                                                          |
| Acceptance, release lockstep    | p05-t04, p05-t05, p05-t06                                                 |

### Plan-Specific Checklist

- Canonical format: frontmatter, Planning Checklist, phases, Reviews (8-column
  ledger), Implementation Complete, References — present.
- Stable task IDs: `pNN-tNN`, monotonic within each phase; p04-t07 appended
  without reuse.
- Task atomicity/verifiability: bounded files, runnable RED commands
  (`include: src/**/*.test.ts` covers `*.integration.test.ts`), file-scoped
  `oxfmt --write`, conventional commit messages; p05-t06 mirrors the AGENTS.md
  gate order with explicit exit-code capture.
- Parallelism: `oat_plan_parallel_groups: []` consistent with shared
  `tools/shared/*` ownership.
- Dispatch Profile: section absent — normal, no finding.
- Review-table preservation: existing rows preserved; this gate appends its own
  `received` row.
- Prior-gate disposition: I1, M1, M2, m1–m4 all verified resolved.

### Extra Work (not in declared requirements)

None

## Verification Commands

```bash
# M1: current doctor JSON shape and disabled-check keying
sed -n 205,222p packages/cli/src/commands/pjm/index.ts
sed -n 200,222p packages/cli/src/commands/pjm/doctor.ts
# m1: unowned per-pack canonical-path switch and its consumers
grep -n "case '" packages/cli/src/commands/tools/shared/install-sync-context.ts
grep -rln "install-sync-context" packages/cli/src | grep -v '\.test\.ts$'
# m2: files vs RED commands
sed -n 253,264p .oat/projects/shared/user-scope-tool-packs/plan.md
sed -n 849,864p .oat/projects/shared/user-scope-tool-packs/plan.md
# prior-gate resolution checks
grep -rn "tools has project-management" .agents/skills/*/SKILL.md .agents/skills/*/references/*.md
grep -rln "resolve-tracking.sh" .agents/skills/
grep -o "p0[0-9]-t0[0-9]" .oat/projects/shared/user-scope-tool-packs/spec.md | sort -u
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks.
