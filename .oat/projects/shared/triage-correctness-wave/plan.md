---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-27
oat_phase: plan
oat_phase_status: in_progress
oat_plan_parallel_groups: [['p01', 'p02']]
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_template: true
oat_phase_review_gate:
  enabled: true
  phases: []
  review_type: code
  exit_nonzero_on: high
oat_generated: false
---

# Implementation Plan: triage-correctness-wave

> Execute this plan using `oat-project-implement` — p01 and p02 run in parallel
> worktrees, then p03 and p04 run sequentially.

**Goal:** Ship nine verified correctness fixes from the 2026-09-26 triage and
backlog review as one PR, archive their backlog items, and reconcile the
already-complete `BL-260908-restore-recon-s-cheap-fan-out`.

**Architecture:** Independent fixes grouped by write set: bundled skill text and
scripts (p01), CLI sync/config/tools correctness (p02), the managed Claude
dispatch-record validation path (p03), and a release/backlog fan-in (p04).

**Tech Stack:** TypeScript ESM CLI (`packages/cli`, vitest), bundled skills
under `.agents/skills` (markdown plus `node --test` scripts), Fumadocs docs.

**Commit Convention:** `{type}({pNN-tNN}): {description}` — for example
`fix(p02-t01): name the rule file in canonical parse errors`.

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user (autonomous run; phase gates on all
      phases replace per-phase pauses)
- [ ] Set `oat_plan_hill_phases` in frontmatter (confirmed at implementation
      start)
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

## Conventions for Every Task

- **Test runner:** CLI tests run from the repository root with
  `pnpm --filter @open-agent-toolkit/cli exec vitest run <paths relative to packages/cli>`.
  Skill script tests run with `node --test <path>`.
- **Imports:** same-directory `./...` or the package's configured aliases
  (`@rules/*`, `@engine/*`, `@config/*`, `@providers/*`, `@commands/*`,
  `@agents/*`); never `../`, `src/...`, or `@/*` (`packages/cli/AGENTS.md`).
- **Format:** run `pnpm exec oxfmt --write <files you created or edited>` on
  every changed `.ts`, `.mjs`, `.json`, and non-`.oat` `.md` file before
  committing. oxfmt skips `.oat/` paths when given explicit arguments; never
  run it on `state.md`.
- **Failing-first proof:** every defect fix records, in the task's commit body
  or `implementation.md`, that the new test fails against the pre-fix code
  (run the test before the fix, or neutralize the fix, observe the failure, and
  restore).
- **Bundled mirrors:** never edit `packages/cli/assets/skills/**`; `pnpm build`
  regenerates it (`packages/cli/scripts/bundle-assets.sh`).
- **Skill versions:** bump a changed canonical skill's `metadata.version` once
  in the PR, in the task that first changes it, and update every test pin of
  that version in the same task.
- **After every commit:** run `git status --short`; if the pre-commit hook left
  a reformatted file, review it and commit it in the same task.

---

## Parallelism

`p01` and `p02` are declared as one parallel group because their write sets are
disjoint. `p01` edits bundled skills (`oat-agent-instructions-analyze`,
`oat-project-retro`, `oat-project-review-provide`,
`oat-project-review-provide-remote`), `packages/cli/src/commands/gate/**`,
`packages/cli/src/validation/skills.test.ts`, skill contract tests under
`packages/cli/src/commands/init/tools/shared/`, the retro docs page, and
`apps/oat-docs/docs/cli-utilities/workflow-gates.md`. `p02` edits
`packages/cli/src/rules/**`, the three `rule-transform.ts` files,
`packages/cli/src/engine/compute-plan.ts`, `packages/cli/src/commands/sync/**`,
`packages/cli/src/config/**`, `packages/cli/src/commands/config/index.ts` and
`index.test.ts`,
`packages/cli/src/commands/docs/index-generate/index.test.ts`,
`packages/cli/src/commands/tools/shared/**`, and the provider-sync and
configuration docs pages. No file appears in both sets, and neither phase's
tests depend on the other's behavior.

`p03` stays sequential after the group because it edits
`packages/cli/src/validation/skills.test.ts` and the `oat-project-implement`
reference that shared skill-contract tests also read. `p04` is the fan-in: the
lockstep version bump and backlog closeout need every earlier phase merged.

---

## Phase 1: Bundled skill and script fixes

### Task p01-t01: Stop resolve-providers.sh aborting when the last auto-detect test is false

Backlog: `BL-260927-stop-resolve-providers-sh-from` (GitHub #324).

**Files:**

- Modify: `.agents/skills/oat-agent-instructions-analyze/scripts/resolve-providers.sh`
  (`resolve_from_auto_detect`, lines 80-86)
- Create: `.agents/skills/oat-agent-instructions-analyze/tests/resolve-providers.test.mjs`
- Modify: `.agents/skills/oat-agent-instructions-analyze/SKILL.md`
  (`metadata.version` 1.12.2 → 1.12.3)
- Modify: `packages/cli/src/validation/skills.test.ts` (version pin near line 1526)
- Modify: `packages/cli/src/commands/init/tools/shared/agent-instructions-bundle-contract.test.ts`
  (version pin near line 24)

**Step 1: Write test (RED)**

Add a `node --test` suite that creates each fixture as its own `git init`
repository in `mktemp`-style temporary directories (the script resolves the
root with `git rev-parse --show-toplevel`) and spawns the script with that
directory as `cwd`:

- `AGENTS.md` plus `.claude/` → stdout lists `agents_md` and `claude`, exit 0.
- `.cursor/` only → stdout lists `cursor`, exit 0.
- `.cline/` present → stdout lists `cline`, exit 0.
- Run each case with `--non-interactive` and with no flag. Under `node --test`
  stdin is not a TTY, so the no-flag case exercises only the non-TTY fallback of
  `interactive_confirm`; record in the test and `implementation.md` that the
  real TTY prompt path is not driven by this suite.

Run: `node --test .agents/skills/oat-agent-instructions-analyze/tests/resolve-providers.test.mjs`
Expected: the `.claude`-only and `.cursor`-only cases fail (no output, exit 1).

**Step 2: Implement (GREEN)**

Rewrite each auto-detect test as an `if` block (or end the function with
`return 0`) so a false provider test can never become the function's exit
status under `set -euo pipefail`.

Run: `node --test .agents/skills/oat-agent-instructions-analyze/tests/resolve-providers.test.mjs`
Expected: all cases pass.

**Step 3: Refactor**

Bump the skill version and both test pins.

**Step 4: Verify**

Run: `node --test .agents/skills/oat-agent-instructions-analyze/tests/resolve-providers.test.mjs && pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/init/tools/shared/agent-instructions-bundle-contract.test.ts`
Expected: pass.

**Step 5: Commit**

```bash
git add .agents/skills/oat-agent-instructions-analyze packages/cli/src/validation/skills.test.ts packages/cli/src/commands/init/tools/shared/agent-instructions-bundle-contract.test.ts
git commit -m "fix(p01-t01): keep resolve-providers.sh running when the last auto-detect test is false"
```

---

### Task p01-t02: Require a per-item walkthrough of retro register items

Backlog: `BL-260927-require-a-per-item-walkthrough` (GitHub #313, #297).

**Files:**

- Modify: `.agents/skills/oat-project-retro/SKILL.md` (Step 4 lines 166-188,
  verification 275-299, Success Criteria 301-313; `metadata.version`
  1.0.6 → 1.0.7)
- Modify: `apps/oat-docs/docs/workflows/projects/retro.md` (describe the
  walkthrough)
- Modify: `packages/cli/src/commands/init/tools/shared/retro-skill-contracts.test.ts`

**Step 1: Write test (RED)**

Extend `describe('retro skill content contracts')` with assertions that the
skill requires, after artifact validation, a walkthrough of every `RP-*` and
`UP-*` item stating ID, short title, plain-language summary, why it matters,
current disposition and destination, and next action; groups apply,
repository-filing, and upstream-filing items; applies when apply or filing is
deferred, skipped, automatic, or unanswered, including non-interactive runs;
states an explicit no-items summary for empty registers; includes a worked
example; links the artifact instead of reproducing it; names
`workflow.retro.filing.repo` and `workflow.retro.filing.upstream`; and no longer
names the bare parent key as a key to read. Guard with a backtick-delimited
pattern (``not.toMatch(/`workflow\.retro\.filing`/)``) so the leaf keys
still pass. Add a new Success Criteria assertion for the walkthrough (none
exists today).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/retro-skill-contracts.test.ts`
Expected: new assertions fail.

**Step 2: Implement (GREEN)**

Add a "Final report walkthrough" section after verification, reference it from
Step 4's interactive and non-interactive branches, add the success criterion,
change lines 168 and 182 to the leaf keys, and add a short worked example with
one apply item, one repository item, and one upstream item. Mirror a one-line
description in the docs page.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/retro-skill-contracts.test.ts src/validation/named-skill-load-contract.test.ts`
Expected: pass.

**Step 3: Refactor**

Bump the skill version.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/retro-skill-contracts.test.ts src/validation/named-skill-load-contract.test.ts src/validation/skills.test.ts`
Expected: pass.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-retro/SKILL.md apps/oat-docs/docs/workflows/projects/retro.md packages/cli/src/commands/init/tools/shared/retro-skill-contracts.test.ts
git commit -m "feat(p01-t02): require a per-item walkthrough in the retro final report"
```

---

### Task p01-t03: Make the gate review dispatch audit line agree with the gate invocation

Backlog: `BL-260927-derive-or-label-the-dispatch` (GitHub #325).

Design (plan reviews H1 in both rounds): use the backlog item's labeling
branch. The resolver stamp is the project reviewer policy view, and the gate
frontmatter (`oat_gate_target`, `oat_invocation_*`) is the authority for the
gate's actual invocation. A gate-built stamp is not used: its model and effort
axes are provider-default by documented design
(`apps/oat-docs/docs/cli-utilities/workflow-gates.md:326-330`).

- Skill rule: gate-originated reviews (`oat_review_invocation: gate`) write the
  resolver stamp with the literal prefix `Dispatch (policy view):` instead of
  `Dispatch:`. Non-gate reviews are unchanged.
- Validation, applied only to gate artifacts: recognize audit lines by shape.
  After stripping a list marker, an optional bold or plain label ending in `:`
  (for example `**Dispatch audit:**`, `Dispatch stamp:`, or
  `Managed reviewer resolver (...):`), and at most one backtick pair around the
  whole stamp, a line whose remainder starts with `Dispatch:` and parses as a
  reviewer stamp (`action=review role=reviewer`) is an audit line. Accept audit
  lines in the metadata block before the first `## ` heading and inside a
  `## Dispatch Audit` or `## Dispatch Metadata` section; ignore fenced code
  blocks and any stamp inside finding sections or finding prose. An
  unlabeled reviewer stamp agrees with the frontmatter only when its `target`
  equals `oat_gate_target` and, when `oat_invocation_reasoning_effort` is a
  concrete effort, its `effort_axis` equals `selected:<that effort>`. Any
  other unlabeled reviewer stamp fails the gate with the new cause
  `gate_dispatch_audit_mismatched`; its message names `oat tools update` as the
  recovery for artifacts written by older installed skills. Labeled
  policy-view stamps and artifacts without an audit stamp are not affected.
- Extraction: `parseDispatchStamps` (`packages/cli/src/providers/identity/stamp.ts:166-169`)
  only matches the literal `Dispatch:`, so policy-view lines are extracted by a
  small label-aware helper in `review-verdict.ts` that strips the
  `Dispatch (policy view):` prefix and reuses the same token parsing.
  `parseDispatchStamps` itself is unchanged, so producer-identity reads
  (`gate/index.ts:1510`) are unaffected.

**Files:**

- Modify: `packages/cli/src/commands/gate/review-verdict.ts`
  (`parseReviewGateVerdict` near 794: expose unlabeled reviewer stamps and
  policy-view stamps from the audit metadata block)
- Modify: `packages/cli/src/commands/gate/index.ts` (the agreement check after
  `corroborateGateInvocation` near 3931 and the new `cause`)
- Modify: `.agents/skills/oat-project-review-provide/SKILL.md` (place the
  gate rule beside the gate-invocation frontmatter guidance near 1033-1035, not
  right after the Step 6.0 contract paragraph; phrase it positively;
  `metadata.version` 1.5.10 → 1.5.11)
- Modify: `.agents/skills/oat-project-review-provide-remote/SKILL.md` (same
  rule beside its gate lineage text near 405-409; 1.1.7 → 1.1.8)
- Modify: `apps/oat-docs/docs/cli-utilities/workflow-gates.md` (near 220-236 and
  314-330: document the policy-view prefix, the agreement rule, and the new
  cause with its recovery)
- Modify: `packages/cli/src/commands/gate/index.test.ts` (extend
  `writeReviewArtifact` near 524-540 with an optional body)
- Modify: `packages/cli/src/commands/gate/review-verdict.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- Modify: `packages/cli/src/validation/skills.test.ts` (five review-provide
  pins at 3085, 3247, 4921, 6266, 6336 and the review-provide-remote pin at 6337)

**Step 1: Write test (RED)**

- Parser: using fixtures copied from real archived gate artifacts, with the
  source path recorded in each fixture comment, extract unlabeled reviewer
  stamps and policy-view stamps separately from all three real shapes:
  a plain pre-heading line
  (`.oat/projects/shared/recon-rework/reviews/archived/final-review-2026-09-11T155617Z.md:34`),
  a backtick-wrapped `**Dispatch audit:**` line
  (`.../recon-rework/reviews/archived/final-review-2026-09-11T020623Z.md:34`),
  and a labeled bullet inside a `## Dispatch Audit` section
  (`.oat/projects/shared/claude-effort-levels/reviews/archived/final-review-2026-09-21T232436Z.md:29-33`).
  Ignore an implementer stamp, a reviewer stamp inside a fenced block, and a
  stamp quoted inside a finding.
- Gate, with frontmatter `oat_gate_target: codex-6-sol-xhigh` and
  `oat_invocation_reasoning_effort: xhigh` under a project `high` ceiling:
  - an unlabeled policy stamp (`target=oat-reviewer-...-high`,
    `effort_axis=selected:high`) fails with `gate_dispatch_audit_mismatched`;
  - an unlabeled stamp whose `target` matches but whose `effort_axis` is
    `selected:high` fails (the effort clause can fail on its own);
  - an unlabeled stamp with `target=codex-6-sol-xhigh` and
    `effort_axis=selected:xhigh` passes;
  - the same policy stamp labeled `Dispatch (policy view):` passes;
  - no audit stamp passes;
  - quoted implementer or fenced reviewer stamps in findings do not change the
    result.
    Model on the mismatched-invocation test near `index.test.ts:4682`.
- Skill contract: review-provide and the remote twin require the
  `Dispatch (policy view):` prefix for gate-originated reviews.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/review-verdict.test.ts src/commands/gate/index.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: new cases fail.

**Step 2: Implement (GREEN)**

Implement the extraction, the agreement check, the skill paragraphs, and the
docs. Keep the new skill paragraph away from the 1000-character window after
the Step 6.0 anchor that `expectDispatchStampFieldContract`
(`packages/cli/src/__tests__/skills/dispatch-stamp-contract.ts:33, 131`)
scans, and do not repeat its anchor phrase.

**Step 3: Refactor**

Bump both skill versions and update the six pins.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/gate/ src/commands/init/tools/shared/review-skill-contracts.test.ts src/__tests__/skills/dispatch-stamp-contract.test.ts src/validation/skills.test.ts src/commands/init/tools/shared/bundle-consistency.test.ts`
Expected: pass.

Rollout note for this wave's own gates (plan review M2): from the p01 phase
gate on, the branch CLI enforces the new check, but the Codex reviewer may load
an installed `oat-project-review-provide` older than 1.5.11. Before each later
gate, record which review-provide copy the reviewer resolves. A
`gate_dispatch_audit_mismatched` result caused by a stale installed copy is
resolved by refreshing that installed skill and rerunning the gate, not by a
review-receive fix cycle.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-review-provide .agents/skills/oat-project-review-provide-remote apps/oat-docs/docs/cli-utilities/workflow-gates.md packages/cli/src/commands/gate packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts packages/cli/src/validation/skills.test.ts
git commit -m "fix(p01-t03): label gate policy stamps and reject unlabeled audit lines that disagree"
```

---

## Phase 2: CLI sync, config, and tools correctness

### Task p02-t01: Name the file in canonical rule parse errors and accept alwaysApply

Backlog: `BL-260927-name-the-file-in-canonical` (GitHub #316).

**Files:**

- Modify: `packages/cli/src/rules/canonical/parse.ts` (`parseCanonicalRuleMarkdown`
  line 128, missing-frontmatter error line 134, `parseActivation` near 84)
- Modify: `packages/cli/src/providers/claude/rule-transform.ts` (line 25),
  `packages/cli/src/providers/cursor/rule-transform.ts` (line 48),
  `packages/cli/src/providers/copilot/rule-transform.ts` (line 59)
- Modify: `packages/cli/src/engine/compute-plan.ts` (transform call near 834:
  collect rule parse failures across the loop and throw one error naming every
  invalid rule)
- Modify: tests `src/rules/canonical/parse.test.ts`,
  `src/providers/{claude,cursor,copilot}/rule-transform.test.ts`,
  `src/engine/compute-plan.test.ts`, `src/commands/sync/index.test.ts`
- Modify: `apps/oat-docs/docs/provider-sync/providers.md` (document the alias)
  and `apps/oat-docs/docs/provider-sync/commands.md` (invalid-rule behavior)

**Step 1: Write test (RED)**

- Parse errors (invalid activation and missing frontmatter) include the
  repository-relative path passed by each transform, never `<inline>`.
- A rule with `description` plus `alwaysApply: true` and no `activation` parses
  as `activation: always`. Build the fixture from the frontmatter shape reported
  in GitHub #316 (`argent init` writes `.agents/rules/argent.md` with
  `description` plus `alwaysApply: true` and no `activation`), with a comment
  recording that provenance, plus Cursor-style variants carrying `globs:` as
  null, an empty string, and a non-empty string.
- Alias decision (record it in `providers.md`): under `alwaysApply: true` with
  no `activation`, a null or empty `globs` is ignored; a non-empty `globs` is an
  error naming the file, because canonical rules keep globs only for
  `activation: glob` (`parse.ts:62-77, 148-151`). An explicit `activation`
  always wins over `alwaysApply`. `alwaysApply: false` (or any non-true value)
  without `activation` stays an activation error that names the file; add that
  case to the tests.
- A plan with two invalid rules and valid skills fails once with a message
  naming both rule files, each exactly once even though three provider
  transforms parse every rule (key collected failures by the normalized
  relative canonical path).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/rules/canonical/parse.test.ts src/providers/claude/rule-transform.test.ts src/providers/cursor/rule-transform.test.ts src/providers/copilot/rule-transform.test.ts src/engine/compute-plan.test.ts`
Expected: fail.

**Step 2: Implement (GREEN)**

Pass `canonicalPath` from all three transforms, include `filePath` in the
missing-frontmatter error, apply the alias decision above, and aggregate
de-duplicated rule failures in `computeSyncPlan`.

**Step 3: Refactor**

Update the two docs pages.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/rules/canonical/parse.test.ts src/providers/claude/rule-transform.test.ts src/providers/cursor/rule-transform.test.ts src/providers/copilot/rule-transform.test.ts src/engine/compute-plan.test.ts src/commands/sync/index.test.ts`
Expected: pass.

**Step 5: Commit**

```bash
git add packages/cli/src/rules packages/cli/src/providers/claude/rule-transform.ts packages/cli/src/providers/cursor/rule-transform.ts packages/cli/src/providers/copilot/rule-transform.ts packages/cli/src/providers/claude/rule-transform.test.ts packages/cli/src/providers/cursor/rule-transform.test.ts packages/cli/src/providers/copilot/rule-transform.test.ts packages/cli/src/engine packages/cli/src/commands/sync/index.test.ts apps/oat-docs/docs/provider-sync
git commit -m "fix(p02-t01): name the rule file in canonical parse errors and accept alwaysApply"
```

---

### Task p02-t02: Stop sync --scope all reporting "No changes required." beside a failed scope

Backlog: `BL-260909-make-oat-sync-scope-all-report`.

**Files:**

- Modify: `packages/cli/src/commands/sync/apply.ts` (`formatCoreResults`
  278-301, `formatAppliedOutput` 330, call near 586)
- Modify: `packages/cli/src/commands/sync/index.test.ts`

**Step 1: Write test (RED)**

Using the `useRealSyncPlanFormatter: true` harness, a `--scope all` run where
one scope fails and a sibling scope is empty never prints
`No changes required.`; a test pins the `failed === 0` conjunct across scopes;
the existing single-scope output stays unchanged (control).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/sync/index.test.ts`
Expected: the multi-scope failure case fails.

**Step 2: Implement (GREEN)**

Thread `summary.failed > 0` into `formatCoreResults` and strip the empty-plan
suffix when either it or `restampOnly` holds.

**Step 3: Refactor**

None expected.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/sync/index.test.ts`
Expected: pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/sync/apply.ts packages/cli/src/commands/sync/index.test.ts
git commit -m "fix(p02-t02): never report No changes required beside a failed sync scope"
```

---

### Task p02-t03: Validate the catalog-refresh policy in sync evidence

Backlog: `BL-260908-validate-the-catalog-refresh`.

**Files:**

- Modify: `packages/cli/src/commands/tools/shared/sync-evidence.ts`
  (`normalizeSyncEvidence` near 158-192; cast at 181-184)
- Modify: `packages/cli/src/commands/tools/shared/in-process-sync.test.ts`
  (`describe('normalizeSyncEvidence required fields')` near 209)
- Modify: `packages/cli/src/commands/tools/shared/pack-provider-evidence.test.ts`

**Step 1: Write test (RED)**

- `normalizeSyncEvidence` drops or marks an advice entry whose
  `visibility.policy.state` is outside `live`, `manual-refresh`,
  `restart-required`, `unknown` (`providers/shared/registry.ts:25-38`) instead
  of passing it through.
- Control: a lifecycle projection fed advice with an unknown state does not
  throw (the `never` default in `provider-reachability.ts` stays
  compile-time-only).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/in-process-sync.test.ts src/commands/tools/shared/pack-provider-evidence.test.ts`
Expected: fail (the unknown state reaches `visibilityFor` and throws).

**Step 2: Implement (GREEN)**

Validate the policy state against the known set with its required fields before
accepting it.

**Step 3: Refactor**

None expected.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/`
Expected: pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/tools/shared/sync-evidence.ts packages/cli/src/commands/tools/shared/in-process-sync.test.ts packages/cli/src/commands/tools/shared/pack-provider-evidence.test.ts
git commit -m "fix(p02-t03): validate catalog-refresh policy states in sync evidence"
```

---

### Task p02-t04: Reject wrong-typed nested values in the strict pjm.remote reader

Backlog: `BL-260909-reject-malformed-nested-values`.

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts` (`assertClosedPjmRemoteSharedConfig`
  near 1122, `collectPjmRemoteAuthorityFindings` near 1223, storage and
  description branches)
- Modify: `packages/cli/src/config/oat-config.test.ts` (near 847-1010)
- Modify: `packages/cli/src/commands/config/index.ts` (the pjm.remote strict
  barrier near 2923-2925, `setConfigValue` near 2293-2294, and the
  `ConfigCommandDependencies` reader interface near 259-267)
- Modify: `packages/cli/src/commands/config/index.test.ts` (unset cases near 5667)
- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md` (lines 105-124:
  document that wrong-typed `pjm.remote` leaves fail config reads closed and how
  to repair them)

**Step 1: Write test (RED)**

- `oat config unset pjm.remote.<child>` on a file whose sibling nested value is
  wrong-typed (for example `authority.default: 5`) refuses with the same
  categorical error the top-level guard uses and leaves the file
  byte-identical.
- A valid `pjm.remote` tree (including one with absent `description` or
  `default`) still unsets normally.
- The error reports the structure type only, never the value (keep the
  existing `ghp_structure_value_must_not_leak` assertion passing).
- Scope decision: reject wrong **types** only. Invalid strings keep their
  documented coercion; the existing test near `oat-config.test.ts:891` stays
  unchanged.
- Blast radius (plan review M7): the closed-structure guard runs in the shared
  reader, so a wrong-typed leaf makes ordinary config reads fail closed with
  the same categorical error, exactly as unknown `pjm.remote` keys already do.
  Document that in `configuration.md`. The malformed leaf itself must stay
  repairable: `oat config unset pjm.remote.policy.authority.default` (and
  `oat config set` of a valid value) on the malformed file succeeds, using a
  repair reader in the style of `readOatConfigFor*Repair`
  (`oat-config.ts:1855, 1939, 1971`) if needed.
- The criterion "red-then-green control recorded in the test" is met inside
  the test file: the negative control (malformed sibling refused, bytes
  unchanged) and the positive control (valid tree unsets) sit side by side
  with a comment recording that the negative case passed before the fix.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/commands/config/index.test.ts`
Expected: fail.

**Step 2: Implement (GREEN)**

Add leaf type findings to the closed-structure collectors. Add a path-targeted
repair reader that drops only the targeted `pjm.remote` leaf before the
closed-structure assertion (so a malformed sibling of a different leaf is still
refused), add it to `ConfigCommandDependencies`, and use it at the unset barrier
and in the set path for `pjm.remote` keys.

**Step 3: Refactor**

None expected.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/commands/config/index.test.ts`
Expected: pass.

**Step 5: Commit**

```bash
git add packages/cli/src/config/oat-config.ts packages/cli/src/config/oat-config.test.ts packages/cli/src/commands/config/index.ts packages/cli/src/commands/config/index.test.ts apps/oat-docs/docs/cli-utilities/configuration.md
git commit -m "fix(p02-t04): reject wrong-typed nested pjm.remote values"
```

---

### Task p02-t05: Preserve .oat/config.json key order and skip no-op writes

Backlog: `BL-260927-preserve-oat-config-json-key` (GitHub #329, #311).

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts` (`writeOatConfig` 2023-2030)
- Modify: `packages/cli/src/config/oat-config.test.ts`
- Modify: `packages/cli/src/commands/docs/index-generate/index.test.ts` (real
  filesystem block near 902)
- Modify: `packages/cli/src/commands/config/index.test.ts` (same-value
  `oat config set`)

**Step 1: Write test (RED)**

- Writing a config with no semantic change leaves the file byte-identical
  (including a file whose `git` block precedes `projects`).
- A real change preserves the existing order of untouched keys, recursively,
  and places new keys deterministically.
- A same-value `oat config set` leaves the file byte-identical, including a
  hand-formatted file (different indentation, no trailing newline).
- Repairs and removals still write: `oat config unset` of a warn-dropped key
  (for example `documentation.root: 5`) removes it from disk; the existing
  repair test near `commands/config/index.test.ts:6068` (unset of a malformed
  `documentation.excludes`) stays green; a malformed or unparsable existing
  file is always rewritten.
- The one-time `documentation.index` write by `oat docs generate-index` changes
  only that key.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/commands/docs/index-generate/index.test.ts src/commands/config/index.test.ts`
Expected: fail.

**Step 2: Implement (GREEN)**

In `writeOatConfig`, build the output as the normalized config ordered by the
existing raw file's key order (recursively; new keys after existing ones). Read
the existing file with `JSON.parse` only, never through the normalizer (the
normalizer throws on malformed values that repair flows are fixing). Skip the
write only when the existing file parses and its raw JSON value deep-equals the
output object; otherwise write. This keeps formatting-only differences
byte-identical while repairs and raw-disk removals always land.

**Step 3: Refactor**

None expected.

**Step 4: Verify**

Run: `HOME=$(mktemp -d) pnpm exec turbo run test --force --filter=@open-agent-toolkit/cli`
Expected: pass. Every `writeOatConfig` caller (config, init, init/tools, tools,
docs, gate, pjm, local) is affected, so run the whole CLI suite with an isolated
`HOME`.

**Step 5: Commit**

```bash
git add packages/cli/src/config/oat-config.ts packages/cli/src/config/oat-config.test.ts packages/cli/src/commands/docs/index-generate/index.test.ts packages/cli/src/commands/config/index.test.ts
git commit -m "fix(p02-t05): preserve config key order and skip no-op config writes"
```

---

## Phase 3: Managed Claude dispatch-record input

Backlog: `BL-260927-make-the-managed-claude` (GitHub #326). The journal
keep-or-remove decision stays with `BL-260909-give-the-dispatch-record`.

### Task p03-t01: State the expected pattern in dispatch-record validation messages

**Files:**

- Modify: `packages/cli/src/providers/identity/oat-dispatch-record.ts`
  (`redactedPathSchema` 239-241, `contentDigest` near 264, any other bare
  regex; export a `safeParseOatDispatchEvidenceEvent` helper over the
  module-private `oatDispatchEvidenceEventSchema` at 620 for p03-t02)
- Modify: `packages/cli/src/providers/identity/generic-dispatch-record.ts`
  (bare regexes; export the pre-refine base object and a collecting variant of
  the sensitive-content walker for p03-t02)
- Modify: `packages/cli/src/providers/identity/absolute-paths.ts` (collecting
  variant of the absolute-path check)
- Modify: tests `src/providers/identity/oat-dispatch-record.test.ts`,
  `src/providers/identity/generic-dispatch-record.test.ts`,
  `src/providers/identity/absolute-paths.test.ts`

**Step 1: Write test (RED)**

A malformed `canonicalPath` reports
`expected <loaded|user|project>/agents/<name>.md`; a malformed `contentDigest`
reports `expected sha256:<64 lowercase hex>`; the collecting walkers return
every sensitive or absolute-path hit rather than the first.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/identity/oat-dispatch-record.test.ts src/providers/identity/generic-dispatch-record.test.ts src/providers/identity/absolute-paths.test.ts`
Expected: fail.

**Step 2: Implement (GREEN)**

Add messages and the collecting helpers; keep the existing throwing helpers'
behavior for current callers.

**Step 3: Refactor**

None expected.

**Step 4: Verify**

Run the Step 1 command. Expected: pass.

**Step 5: Commit**

```bash
git add packages/cli/src/providers/identity
git commit -m "fix(p03-t01): state the expected pattern in dispatch-record validation errors"
```

---

### Task p03-t02: Report every managed Claude dispatch-record violation in one run

**Files:**

- Modify: `packages/cli/src/providers/claude/dispatch-envelope.ts`
  (`acceptClaudeLaunchEnvelope` 163-260, derived-field loop 269-275,
  action/role check 285-295)
- Create: `packages/cli/src/providers/claude/dispatch-envelope.test.ts`
- Modify: `packages/cli/src/commands/project/dispatch/record.ts`
  (`parseDispatchRecordInput` 259-365; event validation currently runs later in
  `augmentDispatchRecord`)
- Modify: `packages/cli/src/commands/project/dispatch/index.ts` (JSON error
  output 153-165: add an additive `violations` array; exit code stays 1)
- Modify: `packages/cli/src/commands/project/dispatch/record.test.ts`
- Modify: `tools/smoke/verification/claude-effort-dispatch.test.mjs` (its event
  fixture at lines 173-174 uses `<repo>/agents/<role>.md`, which fails
  `redactedPathSchema` once events are validated up front; switch to a
  schema-valid redacted path such as `<project>/agents/${role}.md`)

**Step 1: Write test (RED)**

One validation run over an input with several derived fields present, several
missing required fields, a wrong action for the role, an unredacted path, and
an invalid event reports every one of those violations with its stage, path,
and message. Checks that depend on a failed parse are skipped and documented as
dependent; every independent violation is reported. A valid managed input still
returns `status: validated-only`. Every violation message passes through the
command's `redactDispatchMessage` boundary; a test with an absolute-path
violation asserts the JSON output contains no absolute path.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/claude/dispatch-envelope.test.ts src/commands/project/dispatch/record.test.ts`
Expected: fail.

**Step 2: Implement (GREEN)**

Add a collect-all pass (`safeParse` per stage, collected consistency checks,
every protected field, the action/role check, `recordBase` against the exported
base object with protected fields omitted, the collecting walkers, and the
event schema plus `requestId` match) and raise one error carrying the list.
Existing single-error paths keep their current text.

**Step 3: Refactor**

None expected.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/providers/claude/ src/commands/project/dispatch/ src/providers/identity/ && pnpm build && node --test tools/smoke/verification/claude-effort-dispatch.test.mjs`
Expected: pass.

**Step 5: Commit**

```bash
git add packages/cli/src/providers/claude/dispatch-envelope.ts packages/cli/src/providers/claude/dispatch-envelope.test.ts packages/cli/src/commands/project/dispatch tools/smoke/verification/claude-effort-dispatch.test.mjs
git commit -m "fix(p03-t02): report every managed Claude dispatch-record violation in one run"
```

---

### Task p03-t03: Add a producer for canonical-role-resolution evidence

**Files:**

- Create: `packages/cli/src/commands/project/dispatch/canonical-role.ts` and
  `canonical-role.test.ts`
- Modify: `packages/cli/src/commands/project/dispatch/index.ts` (register the
  subcommand)
- Modify: `packages/cli/src/agents/canonical/resolve.ts` (update the doc comment
  that says there is no production call site)

**Step 1: Write test (RED)**

`oat project dispatch canonical-role --role <name> --request-id <id> --skill-dir <loaded skill dir> --json`
emits a `canonical-role-resolution` event (redacted `canonicalPath` and
`selectedPath`, `contentDigest`, `candidateMisses`) that the record validator
accepts unchanged. `--skill-dir` is required because `resolveCanonicalRole`
derives the loaded tier from it (`resolve.ts:58-64, 249-253`); the user root
defaults to `$HOME/.agents` and the project root to `<repo>/.agents`. Cases: a
role present only in the loaded tier resolves from it; a missing or invalid
`--skill-dir` fails with a clear error; an unknown role returns the `missing`
evidence with recovery commands; the command writes no files.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch/canonical-role.test.ts src/agents/canonical/resolve.test.ts`
Expected: fail.

**Step 2: Implement (GREEN)**

Back the subcommand with `resolveCanonicalRole` (dependency `workflows`, the
loaded, user, and project `.agents` roots) and emit the event JSON.

**Step 3: Refactor**

None expected.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch/ src/agents/canonical/`
Expected: pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/dispatch packages/cli/src/agents/canonical/resolve.ts
git commit -m "feat(p03-t03): add a canonical-role evidence producer for dispatch records"
```

---

### Task p03-t04: Publish a validated managed Claude example and pin it

**Files:**

- Create: `.agents/skills/oat-dispatch-subagents/references/managed-claude-example.json`
  (implementer and reviewer inputs, each with a canonical-role-resolution event)
- Modify: `.agents/skills/oat-dispatch-subagents/references/record-schema.md`
  (a managed Claude section: which fields are derived and must be omitted, the
  event fields, the redacted path form, and a link to the example;
  `metadata.version` of `oat-dispatch-subagents` 1.2.9 → 1.2.10 in its
  `SKILL.md`)
- Modify: `packages/cli/src/validation/skills.test.ts` (the two
  `oat-dispatch-subagents` pins at 6412 and 6571 only; leave the `oat-reviewer`
  `1.2.9` pins at 1628, 3246, and 6483 unchanged)
- Create: `packages/cli/src/commands/project/dispatch/managed-claude-example.test.ts`

**Step 1: Write test (RED)**

The test loads the published example and asserts both role inputs return
`status: validated-only` as-is; the embedded definitions match what
`materializeClaudeAgent` generates, so the example cannot drift.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch/managed-claude-example.test.ts`
Expected: fail (file absent).

**Step 2: Implement (GREEN)**

Generate the example from fixture agents (not the canonical
`.agents/agents/*.md` roles, so future role edits do not force an example
rewrite and skill bump), and add a documented regeneration path in the test
file (for example an environment flag that rewrites the JSON). Write the
reference section. Bump the skill version and both pins.

**Step 3: Refactor**

None expected.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/dispatch/ src/validation/skills.test.ts`
Expected: pass.

**Step 5: Commit**

```bash
git add .agents/skills/oat-dispatch-subagents packages/cli/src/commands/project/dispatch/managed-claude-example.test.ts packages/cli/src/validation/skills.test.ts
git commit -m "docs(p03-t04): publish a validated managed Claude dispatch-record example"
```

---

### Task p03-t05: Point the implement skill and CLI reference at the example and producer

**Files:**

- Modify: `.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md`
  (replace the placeholder JSON at 513-542 with the producer command and a link
  to the example; `oat-project-implement` `metadata.version` 2.3.12 → 2.3.13 in
  its `SKILL.md`)
- Modify: `apps/oat-docs/docs/reference/cli-reference.md` (near 156: document
  `canonical-role` and the `violations` array)
- Modify: `packages/cli/src/validation/skills.test.ts` (implement-text pins near
  4685-4722 and the eight `oat-project-implement` version pins at 2166, 2647,
  2977, 3066, 3568, 4924, 6335, and 8451)

**Step 1: Write test (RED)**

Extend the implement-skill contract assertions to require the producer command
and the example link, and to reject the placeholder tokens
`<generic-nonderived-field>` and `<canonical-role-resolution-field>`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts`
Expected: fail.

**Step 2: Implement (GREEN)**

Rewrite the reference section; keep the `validated-only` and
`record.payload.variant` wording the existing pins require.

**Step 3: Refactor**

Bump the implement skill version.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/validation/named-skill-load-contract.test.ts src/commands/init/tools/shared/`
Expected: pass.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-implement apps/oat-docs/docs/reference/cli-reference.md packages/cli/src/validation/skills.test.ts
git commit -m "docs(p03-t05): replace dispatch-record placeholders with the producer and example"
```

---

## Phase 4: Release and backlog fan-in

### Task p04-t01: Bump the lockstep public package versions

**Files:**

- Modify: `packages/cli/package.json`, `packages/control-plane/package.json`,
  `packages/docs-config/package.json`, `packages/docs-theme/package.json`,
  `packages/docs-transforms/package.json` (0.3.7 → 0.3.8)
- Modify: `packages/cli/assets/public-package-versions.json`
- Modify: any test pin of the lockstep version surfaced by the checks

**Step 1: Verify the gap (RED)**

Run: `git fetch origin main && pnpm release:check-versions > /tmp/rcv.log 2>&1; echo "exit=$?"`
Expected: non-zero (versions not greater than `origin/main`), unless another
merge already moved `origin/main`; then bump above it.

**Step 2: Implement (GREEN)**

Bump all five packages together to one version strictly greater than
`origin/main`, and update the public versions asset.

**Step 3: Refactor**

None expected.

**Step 4: Verify**

Run: `pnpm release:check-versions; echo "exit=$?"; pnpm run check:skill-bumps; echo "exit=$?"; pnpm release:validate; echo "exit=$?"`
Expected: each exit 0.

**Step 5: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets/public-package-versions.json
git commit -m "chore(p04-t01): bump lockstep public packages for the triage correctness wave"
```

---

### Task p04-t02: Archive the shipped backlog items and reconcile the completed recon item

**Files:**

- Modify: `.oat/repo/pjm/backlog/items/*` → `.oat/repo/pjm/backlog/archived/*`,
  `.oat/repo/pjm/backlog/completed.md`, `.oat/repo/pjm/backlog/index.md` (via
  the CLI only)

**Step 1: Verify acceptance (RED)**

For each of the nine items, confirm every acceptance criterion against the
merged branch and record the evidence in `implementation.md`. Do not archive an
item whose criteria are not all met.

**Step 2: Implement (GREEN)**

Run `oat backlog archive <id> --summary "<outcome>"` for
`BL-260927-stop-resolve-providers-sh-from`,
`BL-260927-make-the-managed-claude`, `BL-260927-name-the-file-in-canonical`,
`BL-260927-derive-or-label-the-dispatch`,
`BL-260927-require-a-per-item-walkthrough`,
`BL-260927-preserve-oat-config-json-key`,
`BL-260909-reject-malformed-nested-values`,
`BL-260909-make-oat-sync-scope-all-report`,
`BL-260908-validate-the-catalog-refresh`, and
`BL-260908-restore-recon-s-cheap-fan-out` (summary: all criteria checked;
shipped by PR #285, merged 2026-09-12).

**Step 3: Refactor**

Add a dated note to the curated overview in `backlog/index.md` (outside the
managed block).

**Step 4: Verify**

Run: `oat backlog regenerate-index; oat pjm doctor --json | jq '.adoption.state'`
Expected: `declared`; no new doctor findings beyond the pre-existing
`backlog_completed_unarchived` warning.

**Step 5: Commit**

```bash
git add .oat/repo/pjm/backlog .oat/projects/shared/triage-correctness-wave/implementation.md
git commit -m "chore(p04-t02): archive the triage correctness wave backlog items"
```

---

### Task p04-t03: Run the full Definition of Done

**Files:**

- None (verification only; fix any failure in a new task)

**Step 1: Verify**

From the repository root, capture each exit code explicitly:

```bash
pnpm check > /tmp/g1.log 2>&1; echo "check exit=$?"
pnpm type-check > /tmp/g2.log 2>&1; echo "type-check exit=$?"
HOME=$(mktemp -d) pnpm exec turbo run test --force > /tmp/g3.log 2>&1; echo "test exit=$?"
pnpm build > /tmp/g4.log 2>&1; echo "build exit=$?"
pnpm test:smoke > /tmp/g4a.log 2>&1; echo "test:smoke exit=$?"
pnpm test:scripts > /tmp/g4b.log 2>&1; echo "test:scripts exit=$?"
pnpm test:skills > /tmp/g5.log 2>&1; echo "test:skills exit=$?"
pnpm run check:skill-bumps > /tmp/g6.log 2>&1; echo "skill-bumps exit=$?"
git fetch origin main && pnpm release:check-versions > /tmp/g7.log 2>&1; echo "check-versions exit=$?"
pnpm release:validate > /tmp/g8.log 2>&1; echo "validate exit=$?"
pnpm build:docs > /tmp/g9.log 2>&1; echo "build:docs exit=$?"
pnpm lint > /tmp/g10.log 2>&1; echo "lint exit=$?"
pnpm format > /tmp/g11.log 2>&1; echo "format exit=$?"
```

Expected: every exit 0, with no `FULL TURBO` replay standing in for the forced
test run. `pnpm lint` and `pnpm format` run because this wave touches
`.agents/skills`.

The forced turbo run plus `test:smoke`, `test:scripts`, and `test:skills`
together cover CI's `pnpm test`
(`turbo run test && pnpm test:smoke && pnpm test:skills && pnpm test:scripts`).

**Step 2: Record**

Record each exit code in `implementation.md`.

**Step 3: Commit**

```bash
git add .oat/projects/shared/triage-correctness-wave/implementation.md
git commit -m "chore(p04-t03): record definition-of-done gate results"
```

---

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                           | Reviewed Head | Invocation | Gate Target |
| ------ | -------- | --------------- | ---------- | -------------------------------------------------- | ------------- | ---------- | ----------- |
| p01    | code     | pending         | -          | -                                                  | -             | -          | -           |
| p02    | code     | pending         | -          | -                                                  | -             | -          | -           |
| p03    | code     | pending         | -          | -                                                  | -             | -          | -           |
| p04    | code     | pending         | -          | -                                                  | -             | -          | -           |
| final  | code     | pending         | -          | -                                                  | -             | -          | -           |
| spec   | artifact | pending         | -          | -                                                  | -             | -          | -           |
| design | artifact | pending         | -          | -                                                  | -             | -          | -           |
| plan   | artifact | fixes_completed | 2026-09-27 | structured (no artifact)                           | -             | auto       | -           |
| plan   | artifact | received        | 2026-09-27 | reviews/artifact-plan-review-2026-09-27T043735Z.md | -             | -          | -           |

For code-review events, `Reviewed Head` is the full 40-character SHA at the
head of the reviewed range. `Invocation` records `manual`, `auto`, or `gate`;
`Gate Target` is populated only for gate events. Writers must preserve every
existing row and every unknown trailing cell.

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

Plan artifact review (auto loop, `oat-reviewer-claude-claude-opus-5-5-high`,
structured mode, `selection_reason: exception-parent-effort-unknown`): attempt
1 at `b75fa230c` returned 3 High, 8 Medium, 10 Low; attempt 2 at `eac84a28a`
returned 3 High, 2 Medium, 4 Low; attempt 3 at `2e6ebd6b3` returned 1 High
(audit-line recognition skipped real artifact shapes). All findings were
applied, including Medium and Low under the autonomous run. Residual: the
attempt-3 High fix (shape-based audit-line recognition in p01-t03) was applied
after the retry bound (`oat_orchestration_retry_limit` default 2) and was not
re-reviewed by the auto loop; the configured independent quick-start gate
reviews the full bundle next.

---

## Implementation Complete

**Summary:**

- Phase 1: 3 tasks - Bundled skill and script fixes
- Phase 2: 5 tasks - CLI sync, config, and tools correctness
- Phase 3: 5 tasks - Managed Claude dispatch-record input
- Phase 4: 3 tasks - Release and backlog fan-in

**Total: 16 tasks**

Ready for code review and merge.

---

## References

- Discovery: `discovery.md`
- Triage evidence: `.oat/repo/pjm/triage/2026-09-26-untriaged-issues.md`
- Backlog review: `.oat/repo/pjm/backlog/reviews/backlog-and-roadmap-review.md`
- Backlog items: `.oat/repo/pjm/backlog/items/` (IDs listed per task)
