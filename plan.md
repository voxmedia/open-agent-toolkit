---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-08-30
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups:
  - [p01, p02]
oat_plan_hill_phases: [p03]
oat_auto_review_at_hill_checkpoints: true
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: Gate Execution Contract Hardening

> Execute this plan using `oat-project-implement`. Phases p01 and p02 run in
> isolated parallel worktrees; p03 starts only after both are integrated.

**Goal:** Make configured structured gate commands valid before persistence,
make headless child-without-artifact failures distinct from correlation
mismatches, and prove the exact configuration-to-envelope path.

**Architecture:** A pure configured-command validator and an independent
runtime terminal classifier converge in a configuration-driven subprocess
integration phase. Existing gate configuration storage, child execution,
correlation, eligibility, and receipt models remain intact.

**Tech Stack:** Node.js 22, TypeScript ESM, Commander, Vitest, pnpm workspaces,
Turborepo, OAT canonical skills, and the existing fake gate runtime.

**Commit Convention:** `{type}(pNN-tNN): {description}`

## Planning Checklist

- [x] Confirmed quick workflow and lightweight design
- [x] Preserved and revalidated both superseded discoveries
- [x] Deleted both superseded project directories after absorption
- [x] Evaluated phase-level parallelism and declared p01/p02
- [x] Resolve project dispatch policy: High
- [x] Resolve optional cross-runtime Phase gate review: disabled
- [x] Pass structured plan artifact review
- [x] Run configured quick-start exit gate

## Parallelism

`p01` and `p02` form one parallel group. Phase p01 owns the new configured
command validator module/tests and the gate-aware skill corpus. Phase p02 owns
the existing gate runtime module/tests and runner prompt. Their write sets are
disjoint: p01 does not wire the validator into `index.ts`, and p02 does not
touch the new validator or lifecycle skill files.

Phase p03 is sequential after both because it modifies the central gate command
to consume p01's validator after p02's terminal changes are present, then runs
the shared configuration-driven integration matrix, docs/release bookkeeping,
and repository gates.

## Phase 1: Configuration Contract Core

**Goal:** Define the pure structured-command contract and align every
gate-aware lifecycle skill with the canonical global option placement.

**Write ownership:** New configured-command module/tests and the specifically
listed canonical lifecycle skill files. Do not edit
`packages/cli/src/commands/gate/index.ts` or integration fixtures in this
phase.

### Task p01-t01: Add the pure configured-command validator

**Files:**

- Create: `packages/cli/src/commands/gate/configured-command.ts`
- Create: `packages/cli/src/commands/gate/configured-command.test.ts`

**Step 1: Write focused contract tests**

Cover:

- canonical `oat --json gate review ...`;
- missing, late, repeated, and subcommand-scoped `--json`;
- unrelated commands and provider-native output flags;
- quoted prompts containing gate-like text;
- conservative handling of wrappers/unknown command shapes;
- byte-for-byte command preservation for valid results.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/configured-command.test.ts
```

Expected: New cases fail because the validator does not exist.

**Step 2: Implement the pure classifier**

Return `not-applicable`, `valid`, or `invalid` without executing or rewriting
the command. Recognized direct lifecycle gate-review commands accept only the
canonical `oat --json gate review` path. The invalid message must name the
structured-output contract and show the canonical form.

**Step 3: Format**

```bash
pnpm exec oxfmt packages/cli/src/commands/gate/configured-command.ts packages/cli/src/commands/gate/configured-command.test.ts
```

**Step 4: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/configured-command.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
```

Expected: Focused tests and CLI type checking pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/gate/configured-command.ts packages/cli/src/commands/gate/configured-command.test.ts
git commit -m "feat(p01-t01): validate configured gate review command shape"
```

### Task p01-t02: Align gate-aware skill command contracts

**Files:**

- Modify: `.agents/skills/oat-project-discover/SKILL.md`
- Modify: `.agents/skills/oat-project-design/SKILL.md`
- Modify: `.agents/skills/oat-project-plan/SKILL.md`
- Modify: `.agents/skills/oat-project-quick-start/SKILL.md`
- Modify: `.agents/skills/oat-project-import-plan/SKILL.md`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify only if required by the existing copied-contract fixtures:
  `packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts`

**Step 1: Add corpus regression assertions**

Assert that gate-aware lifecycle examples requiring a structured result name
`oat --json gate review --project "$PROJECT_PATH" ...`, require global
`--json` before `gate review`, prohibit execution-time argv injection, and do
not add reusable `--target` pins.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts
```

Expected: Assertions expose the current inconsistent command examples.

**Step 2: Align canonical skills and bump versions**

Update only the structured-command validation/example prose. Increase each
changed canonical skill's frontmatter `version:` once for the final PR diff.
Do not change receipt, ReviewPlan, HiLL, dispatch-target, or re-review policy.

**Step 3: Format**

```bash
pnpm exec oxfmt .agents/skills/oat-project-discover/SKILL.md .agents/skills/oat-project-design/SKILL.md .agents/skills/oat-project-plan/SKILL.md .agents/skills/oat-project-quick-start/SKILL.md .agents/skills/oat-project-import-plan/SKILL.md packages/cli/src/validation/skills.test.ts packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts
```

**Step 4: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts
pnpm run check:skill-bumps
pnpm lint
pnpm format
```

Expected: Contract tests, skill bumps, skill lint, and formatting pass.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-discover/SKILL.md .agents/skills/oat-project-design/SKILL.md .agents/skills/oat-project-plan/SKILL.md .agents/skills/oat-project-quick-start/SKILL.md .agents/skills/oat-project-import-plan/SKILL.md packages/cli/src/validation/skills.test.ts packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts
git commit -m "docs(p01-t02): enforce canonical structured gate commands"
```

## Phase 2: Headless Runtime Diagnosis

**Goal:** Give a clean accepted child that exits without an artifact its own
stable terminal status while preserving all existing fail-closed behavior.

**Write ownership:** Existing gate runtime module/tests only. Do not edit the
new configured-command files or canonical lifecycle skills.

### Task p02-t01: Add the artifact-missing terminal

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`

**Step 1: Add failing outcome tests**

Cover a clean exit with no direct or diagnostic artifact. Require:

- `status: artifact_missing`;
- `outcome: review_completed_artifact_missing`;
- exit code 1;
- `artifactPath: null`;
- `receiveEligible: false`, `remediable: false`, and `handoff: null`;
- actionable recovery text;
- matching project-log finalization;
- unchanged wrong-run and observed-mismatch status.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts
```

Expected: The no-artifact cases still return
`targeting_correlation_failed`.

**Step 2: Implement cause-specific classification**

Extend the terminal status union and add a focused writer for
`artifact_missing`. Route only the no-candidate/no-diagnostic clean-exit branch
to it. Keep duplicate, wrong-run, wrong-project, invocation, and artifact
validation branches unchanged.

**Step 3: Format**

```bash
pnpm exec oxfmt packages/cli/src/commands/gate/index.ts packages/cli/src/commands/gate/index.test.ts
```

**Step 4: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
```

Expected: Focused tests and CLI type checking pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/gate/index.ts packages/cli/src/commands/gate/index.test.ts
git commit -m "fix(p02-t01): distinguish missing gate artifacts"
```

### Task p02-t02: Reinforce the runner-owned no-yield prompt

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`

**Step 1: Add prompt contract coverage**

Assert that the generated gate context explicitly requires the review,
artifact write, and bookkeeping to complete inline or through a synchronously
awaited child before the headless process exits. It must forbid background
tasks, monitors, or waiters that outlive the turn.

**Step 2: Update the context note**

Add the concise no-yield language to the runner-owned prompt without changing
route selection, timeout, retry, or provider behavior.

**Step 3: Format**

```bash
pnpm exec oxfmt packages/cli/src/commands/gate/index.ts packages/cli/src/commands/gate/index.test.ts
```

**Step 4: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/index.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts
```

Expected: Runner and existing canonical no-yield contract tests pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/gate/index.ts packages/cli/src/commands/gate/index.test.ts
git commit -m "fix(p02-t02): make headless gate completion synchronous"
```

## Phase 3: Integrated Gate Execution Contract

**Goal:** Enforce the validator in configuration, prove the exact configured
command launches headlessly, align public docs/releases, and close both backlog
items.

**Dependencies:** p01 and p02 must both be integrated first.

### Task p03-t01: Enforce validation before gate config writes

**Files:**

- Modify: `packages/cli/src/commands/gate/index.ts`
- Modify: `packages/cli/src/commands/gate/index.test.ts`
- Consume: `packages/cli/src/commands/gate/configured-command.ts`

**Step 1: Add configuration mutation tests**

For shared, local, and user layers, prove an invalid recognized command exits 1
and leaves the target config unchanged. Cover human and JSON errors, canonical
success, unrelated commands, existing dev-build warnings, and exact command
persistence.

**Step 2: Wire the validator before mutation**

Call the shared validator after basic option parsing and before
`updateConfigLayer`. Throw the validator's actionable error through the
existing command error writer. Do not add an override or rewrite argv.

**Step 3: Format**

```bash
pnpm exec oxfmt packages/cli/src/commands/gate/index.ts packages/cli/src/commands/gate/index.test.ts
```

**Step 4: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/configured-command.test.ts src/commands/gate/index.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
```

Expected: Validator and configuration behavior pass together.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/gate/configured-command.ts packages/cli/src/commands/gate/index.ts packages/cli/src/commands/gate/index.test.ts
git commit -m "feat(p03-t01): reject invalid structured gate configuration"
```

### Task p03-t02: Prove the configured headless execution seam

**Files:**

- Create:
  `packages/cli/src/commands/gate/configured-gate.integration.test.ts`
- Modify:
  `packages/cli/src/commands/gate/__fixtures__/fake-runtime.mjs`

**Step 1: Build a configuration-driven fixture**

Create a temporary executable `oat` shim that invokes the repository source
CLI. Prepend only that shim directory to the child `PATH`, assert
`command -v oat` resolves to the fixture shim, configure a skill gate through
public `gate set`, resolve the stored command, assert it is unchanged, and
execute that exact shell command with `PROJECT_PATH` and the deterministic fake
runtime environment set. Keep stderr diagnostics separate from the one final
stdout envelope.

**Step 2: Add the three-outcome matrix**

Prove:

1. correlated artifact -> `ok`, corroborated handoff, receive eligible;
2. clean exit/no artifact -> `artifact_missing`, not receive eligible;
3. wrong-run artifact -> `targeting_correlation_failed`, not receive eligible.

Also assert the child receives headless environment and no route starts a
second child.

**Step 3: Format**

```bash
pnpm exec oxfmt packages/cli/src/commands/gate/configured-gate.integration.test.ts packages/cli/src/commands/gate/__fixtures__/fake-runtime.mjs
```

**Step 4: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/configured-gate.integration.test.ts src/commands/gate/gate-hardening.integration.test.ts src/commands/gate/child-process.test.ts src/commands/gate/route.test.ts
```

Expected: The exact configured-command matrix and existing runtime hardening
matrix pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/gate/configured-gate.integration.test.ts packages/cli/src/commands/gate/__fixtures__/fake-runtime.mjs
git commit -m "test(p03-t02): prove configured headless gate outcomes"
```

### Task p03-t03: Complete docs, release, backlog, and verification

**Files:**

- Modify: `apps/oat-docs/docs/cli-utilities/workflow-gates.md`
- Modify if needed: `apps/oat-docs/docs/reference/cli-reference.md`
- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json`
- Modify if needed: `pnpm-lock.yaml`
- Archive through CLI:
  `.oat/repo/pjm/backlog/items/BL-260826-gate-targets-must-not-yield.md`
- Archive through CLI:
  `.oat/repo/pjm/backlog/items/BL-260726-validate-structured-output.md`
- Generated by backlog archive:
  `.oat/repo/pjm/backlog/archived/`, `completed.md`, and `index.md`

**Step 1: Document the public contract**

Explain configuration-time rejection, canonical
`oat --json gate review --project "$PROJECT_PATH" ...` placement, unchanged
execution, and the distinct `artifact_missing` versus
`targeting_correlation_failed` recovery paths.

**Step 2: Apply lockstep release bookkeeping**

Increment all five publishable public package versions together to the next
patch. Run `pnpm install` only if the package edits require it, and retain a
`pnpm-lock.yaml` change only when pnpm actually produces one; version-only
lockstep bumps historically leave the lockfile unchanged. Do not change release
policy or unrelated dependencies.

**Step 3: Reconcile the authoritative backlog acceptance criteria**

Before archival, confirm both active item records contain concrete criteria
matching the approved combined discovery/design. Preserve the supersession note
that replaces BL-260726's earlier warning-only/either-position proposal with
blocking canonical placement. Confirm the implementation and focused tests
satisfy every criterion; do not archive either item while any criterion is
unmet.

**Step 4: Close both delivered backlog items atomically**

```bash
oat backlog archive BL-260826-gate-targets-must-not-yield --summary "Headless gate children must complete synchronously and clean no-artifact exits now have a distinct terminal diagnosis."
oat backlog archive BL-260726-validate-structured-output --summary "Gate configuration now rejects recognized lifecycle review commands that lack canonical global structured output."
```

Delete a matching one-shot handoff only if one exists. Do not close unrelated
review/gate integrity items.

**Step 5: Format**

```bash
pnpm exec oxfmt apps/oat-docs/docs/cli-utilities/workflow-gates.md apps/oat-docs/docs/reference/cli-reference.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets/public-package-versions.json .oat/repo/pjm/backlog/completed.md .oat/repo/pjm/backlog/index.md
```

**Step 6: Run the repository Definition of Done in CI order**

For each command, capture the command's own exit code before inspecting or
filtering its log:

```bash
pnpm check
pnpm type-check
pnpm test
pnpm build
pnpm run check:skill-bumps
git fetch origin main
pnpm release:check-versions
pnpm release:validate
pnpm build:docs
```

Then run the evidence-grade uncached verification and directly relevant
standalone suites:

```bash
task_home=$(mktemp -d)
env HOME="$task_home" pnpm exec turbo run test --force
task_exit=$?
rm -r "$task_home"
echo "exit=$task_exit"
test "$task_exit" -eq 0
pnpm test:smoke
pnpm test:skills
pnpm test:release
pnpm oat:validate-skills
pnpm lint
pnpm format
oat pjm doctor --json
```

Expected: All CI gates pass, the uncached run reports real execution rather
than cache replay, skill and release validation pass, and PJM reports no new
backlog lifecycle drift.

**Step 7: Commit**

```bash
git add apps/oat-docs/docs/cli-utilities/workflow-gates.md apps/oat-docs/docs/reference/cli-reference.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets/public-package-versions.json .oat/repo/pjm/backlog
# If pnpm actually changed the lockfile, also stage pnpm-lock.yaml.
git commit -m "chore(p03-t03): finalize gate execution contract"
```

### Task p03-t04: Repair final lifecycle handoff references

**Review finding:** M1, m1

**Files:**

- Modify: `.oat/projects/synced/gate-execution-contract-hardening/implementation.md`
- Modify: `.oat/projects/synced/gate-execution-contract-hardening/discovery.md`

**Step 1: Align the final handoff with shipped files**

Replace nonexistent module paths in the implementation summary with the actual
gate command/runtime owner and configured-gate integration test. Mark the spec
reference not applicable for quick mode.

**Step 2: Repair archived backlog links**

Update the two discovery links from the removed active-item paths to their
archived records without changing the recorded requirements or scope.

**Step 3: Verify and commit**

```bash
pnpm exec oxfmt .oat/projects/synced/gate-execution-contract-hardening/implementation.md .oat/projects/synced/gate-execution-contract-hardening/discovery.md
test -f .oat/repo/pjm/backlog/archived/BL-260826-gate-targets-must-not-yield.md
test -f .oat/repo/pjm/backlog/archived/BL-260726-validate-structured-output.md
pnpm run cli -- --json project push .oat/projects/synced/gate-execution-contract-hardening --message "docs(p03-t04): repair final lifecycle handoff"
```

### Task p03-t05: Complete the artifact-missing contract assertion

**Review finding:** M2

**Files:**

- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Extend the complete terminal-status contract**

Add `artifact_missing` to the complete gate-result union assertion and require
its public recovery contract: receive is ineligible, same-run receive or
remediation is forbidden, and the operator starts a new run only after fixing
synchronous artifact production.

**Step 2: Verify and commit**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts
pnpm run check:skill-bumps
pnpm check
git commit -m "test(p03-t05): assert artifact-missing recovery contract"
```

## Reviews

| Scope  | Type     | Status   | Date       | Artifact                                                    | Reviewed Head                            | Invocation | Gate Target                   |
| ------ | -------- | -------- | ---------- | ----------------------------------------------------------- | ---------------------------------------- | ---------- | ----------------------------- |
| p01    | code     | passed   | 2026-08-30 | reviews/archived/code-p01-review-2026-08-30T225810Z.md      | 4b247ec29df914dc66f96ee134b538a6a81985d7 | auto       | -                             |
| p02    | code     | passed   | 2026-08-30 | reviews/archived/code-p02-review-2026-08-30T224353Z.md      | 76966f7fb2db9726b263d661be8f6805db5fab57 | auto       | -                             |
| p03    | code     | passed   | 2026-08-30 | reviews/archived/code-p03-review-2026-08-30T233249Z.md      | 7bba63b3db9401015405398995cc9bcc0fac6df1 | auto       | -                             |
| final  | code     | passed   | 2026-08-31 | reviews/archived/code-final-review-2026-08-31T000201Z.md    | 659547363032fd9f41eefadc947bb0496fe7457f | auto       | -                             |
| spec   | artifact | pending  | -          | -                                                           | -                                        | -          | -                             |
| design | artifact | pending  | -          | -                                                           | -                                        | -          | -                             |
| plan   | artifact | passed   | 2026-08-30 | reviews/archived/artifact-plan-review-2026-08-30T222802Z.md | -                                        | gate       | claude-fable-skip-permissions |
| final  | code     | passed   | 2026-08-31 | reviews/archived/final-review-2026-08-31T000938Z.md         | 659547363032fd9f41eefadc947bb0496fe7457f | gate       | claude-fable-skip-permissions |
| final  | code     | received | 2026-08-31 | reviews/final-review-2026-08-31T010800Z.md                  | 3e40f1ab804176fb1e04ce46dc5d4728fe7ec69e | auto       | -                             |

**Status values:** `pending` → `received` → `fixes_added` →
`fixes_completed` → `passed`

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks — pure configured-command contract and canonical skill
  alignment
- Phase 2: 2 tasks — cause-specific runtime diagnosis and no-yield prompt
- Phase 3: 5 tasks — configuration enforcement, end-to-end proof, release
  closeout, and bounded final-review repairs

**Total: 9 tasks**

Ready for code review and merge after every task, review, and gate is complete.

## References

- Discovery: `discovery.md`
- Lightweight design: `design.md`
- Backlog: `BL-260826-gate-targets-must-not-yield`
- Backlog: `BL-260726-validate-structured-output`
- Related project boundary: `../review-gate-integrity/`
- Compatibility boundary: PR #190
