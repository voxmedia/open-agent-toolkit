---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-29
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups: []
oat_plan_hill_phases: ['p03']
oat_auto_review_at_hill_checkpoints: true
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
oat_template_name: plan
---

# Implementation Plan: surface-implementer-dispatches

> Execute this plan using `oat-project-implement`.

**Goal:** Warn when managed-capped implementation/fix dispatch skips exact
candidate selection, persist classification in Dispatch Report V1, and disclose
terminal reviewer access/retention constraints.

**Architecture:** Extend the existing resolver after selection with additive
classification and structured notices. Preserve selection behavior, resolution
status, exit codes, and compatibility stamps.

**Tech Stack:** TypeScript ESM, Commander CLI, Vitest, OAT skill/docs Markdown.

**Commit Convention:** `{type}({scope}): {description}`

## Planning Checklist

- [x] Lightweight design approved
- [x] Evaluated phase-level parallelism
- [x] Stable task IDs assigned
- [x] Plan artifact review passed
- [x] Dispatch policy and optional phase gate resolved

## Parallelism

The plan is sequential. Phase 1 establishes Dispatch Report and resolver
contracts. Phase 2 reuses those types and touches the same resolver while adding
disclosures. Phase 3 packages and archives the completed work. Parallel
worktrees would overlap core files or run release/closeout before behavior is
final.

---

## Phase 1: Enforce Selection Provenance

### Task p01-t01: Extend Dispatch Report V1 with classification and notices

**Files:**

- Modify: `packages/cli/src/providers/identity/dispatch-report.ts`
- Modify: `packages/cli/src/providers/identity/dispatch-report.test.ts`
- Modify as required: `packages/cli/src/commands/gate/index.ts`
- Modify as required: `packages/cli/src/commands/gate/index.test.ts`

**Step 1: Write failing contract tests**

Add tests for:

- additive top-level classification with null/`not-reported` defaults;
- additive nullable `selection.preferredValue` for legacy selection auditability;
- ordered `notices` serialization;
- human formatting of classification and notices;
- compatibility for existing gate report producers;
- byte-for-byte unchanged compatibility stamp output.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/providers/identity/dispatch-report.test.ts \
  src/commands/gate/index.test.ts
```

Expected: new assertions fail before implementation.

**Step 2: Implement the report contract**

- Add the provider-neutral task-class union, classification shape, and structured
  notice shape.
- Extend `DispatchReportV1`, input types, builders, ordered serializer, and human
  formatter.
- Default legacy producers to null/`not-reported` classification, null
  `selection.preferredValue`, and `[]` notices.
- Keep `formatDispatchStamp()` unchanged.

**Step 3: Format**

```bash
pnpm exec oxfmt --write \
  "packages/cli/src/providers/identity/dispatch-report.ts" \
  "packages/cli/src/providers/identity/dispatch-report.test.ts" \
  "packages/cli/src/commands/gate/index.ts" \
  "packages/cli/src/commands/gate/index.test.ts"
```

**Step 4: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/providers/identity/dispatch-report.test.ts \
  src/commands/gate/index.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
```

Expected: focused tests and CLI type checking pass.

**Step 5: Commit**

```bash
git add packages/cli/src/providers/identity/dispatch-report.ts \
  packages/cli/src/providers/identity/dispatch-report.test.ts \
  packages/cli/src/commands/gate/index.ts \
  packages/cli/src/commands/gate/index.test.ts
git commit -m "feat(cli): add dispatch classification report fields"
```

---

### Task p01-t02: Add classification inputs and managed-cap warnings

**Files:**

- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts`
- Modify: `packages/cli/src/commands/commands.integration.test.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`

**Step 1: Write failing command tests**

Cover:

- `--task-class` and Codex `--task-effort` parsing and validation;
- rejection for invalid classes, provider-inapplicable task effort, either
  classification flag on reviewer routes, and existing selection conflicts;
- exit-1 rejection when either classification flag lacks `--report-scope` or an
  implementation/fix `--report-action`;
- classification flags remaining independent from exact candidate flags and
  legacy `--preferred`, including distinct task and candidate effort values;
- legacy `--preferred` surviving into
  `DispatchReportV1.selection.preferredValue`;
- no candidate on actual managed named-cap implementation/fix producing
  `managed-capped-selection-skipped`;
- candidate without task class producing
  `managed-capped-classification-missing`;
- deliberate at-cap and below-cap candidates preserving classification without
  warning;
- unchanged above-cap error;
- no false warning for policy preflight, reviewer, inherit, uncapped, or
  unresolved paths;
- no skipped-selection warning for legacy `--preferred` below or at the cap;
- matching human and JSON notices.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/project/dispatch-ceiling/index.test.ts \
  src/commands/commands.integration.test.ts \
  src/commands/help-snapshots.test.ts
```

Expected: new assertions fail before implementation.

**Step 2: Implement classification and notice derivation**

- Add `--task-class` and `--task-effort` without overloading legacy
  `--preferred`; classification inputs must not participate in
  `normalizeRequestedCandidate`.
- Require both report scope and an implementation/fix report action whenever
  either classification flag is supplied so provenance cannot be silently
  discarded.
- Thread classification into Dispatch Report V1.
- Derive skipped-selection and classification-missing notices only after the
  existing resolver returns, using policy, role/action, preflight, and selection
  context.
- Emit `managed-capped-selection-skipped` only for a managed named-cap
  implementation/fix route where `requestedCandidate` and `preferredValue` are
  null and `selectedValue` is non-null.
- Preserve `status: resolved`, exit code `0`, and selection behavior.
- Render human notices from the same structured data returned in JSON.

**Step 3: Format**

```bash
pnpm exec oxfmt --write \
  "packages/cli/src/commands/project/dispatch-ceiling/index.ts" \
  "packages/cli/src/commands/project/dispatch-ceiling/index.test.ts" \
  "packages/cli/src/commands/commands.integration.test.ts" \
  "packages/cli/src/commands/help-snapshots.test.ts"
```

**Step 4: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/project/dispatch-ceiling/index.test.ts \
  src/commands/commands.integration.test.ts \
  src/commands/help-snapshots.test.ts \
  src/providers/identity/dispatch-report.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
```

Expected: command, integration, report, help, and type checks pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/dispatch-ceiling/index.ts \
  packages/cli/src/commands/project/dispatch-ceiling/index.test.ts \
  packages/cli/src/commands/commands.integration.test.ts \
  packages/cli/src/commands/help-snapshots.test.ts
git commit -m "feat(cli): warn on unclassified capped dispatches"
```

---

## Phase 2: Expose Terminal Reviewer Constraints

### Task p02-t01: Add shared terminal-reviewer disclosures

**Files:**

- Create: `packages/cli/src/config/dispatch-notices.ts`
- Create: `packages/cli/src/config/dispatch-notices.test.ts`
- Modify: `packages/cli/src/config/dispatch-policy-options.ts`
- Modify: `packages/cli/src/config/dispatch-policy-options.test.ts`
- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- Modify: `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts`

**Step 1: Write failing disclosure tests**

Cover:

- policy choices naming the bundled recommendation's terminal reviewer in a
  structured notice without claiming effective configuration;
- human and JSON adoption output naming the effective post-adoption terminal
  reviewer after preserved cells are applied;
- preserved explicit Frontier cells not being misrepresented by recommendation
  version alone;
- runtime preflight/reviewer resolution disclosing the actual effective Fable
  target;
- no disclosure for High or custom non-Fable Frontier targets.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/config/dispatch-notices.test.ts \
  src/config/dispatch-policy-options.test.ts \
  src/commands/config/index.test.ts \
  src/commands/project/dispatch-ceiling/index.test.ts
```

Expected: new assertions fail before implementation.

**Step 2: Implement shared disclosure metadata**

- Centralize terminal-reviewer notice metadata and matching.
- Add a static bundled-recommendation disclosure to policy choices and an
  effective post-adoption disclosure to adoption output.
- Derive runtime disclosure from the effective resolved target, not the
  recommendation version.
- Reuse the structured notice shape from Phase 1.
- Keep the advisory informational; do not infer access or organizational
  retention policy.

**Step 3: Format**

```bash
pnpm exec oxfmt --write \
  "packages/cli/src/config/dispatch-notices.ts" \
  "packages/cli/src/config/dispatch-notices.test.ts" \
  "packages/cli/src/config/dispatch-policy-options.ts" \
  "packages/cli/src/config/dispatch-policy-options.test.ts" \
  "packages/cli/src/commands/config/index.ts" \
  "packages/cli/src/commands/config/index.test.ts" \
  "packages/cli/src/commands/project/dispatch-ceiling/index.ts" \
  "packages/cli/src/commands/project/dispatch-ceiling/index.test.ts"
```

**Step 4: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/config/dispatch-notices.test.ts \
  src/config/dispatch-policy-options.test.ts \
  src/commands/config/index.test.ts \
  src/commands/project/dispatch-ceiling/index.test.ts
pnpm --filter @open-agent-toolkit/cli type-check
```

Expected: disclosure tests and CLI type checking pass.

**Step 5: Commit**

```bash
git add packages/cli/src/config/dispatch-notices.ts \
  packages/cli/src/config/dispatch-notices.test.ts \
  packages/cli/src/config/dispatch-policy-options.ts \
  packages/cli/src/config/dispatch-policy-options.test.ts \
  packages/cli/src/commands/config/index.ts \
  packages/cli/src/commands/config/index.test.ts \
  packages/cli/src/commands/project/dispatch-ceiling/index.ts \
  packages/cli/src/commands/project/dispatch-ceiling/index.test.ts
git commit -m "feat(cli): disclose terminal reviewer constraints"
```

---

### Task p02-t02: Update implementation guidance and documentation

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify:
  `.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md`
- Modify:
  `.agents/skills/oat-project-implement/references/phase-execution.md`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify:
  `apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md`
- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md`
- Regenerate (do not hand-edit): `apps/oat-docs/index.md`

**Step 1: Write failing contract tests**

Require implementation/fix command examples and the phase-execution resolver
route to pass task classification and require the workflow to surface resolver
notices before launch. Pin the access-versus-retention wording and corrected
recommendation/catalog counts.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/validation/skills.test.ts
```

Expected: new contract assertions fail before guidance changes.

**Step 2: Update skills and docs**

- Perform an evidence-backed documentation delta analysis against the existing
  pages and obtain user approval for the proposed substantive content before
  editing.
- Bump `oat-project-implement` once for this PR.
- Update managed-capped implementation/fix examples with classification flags.
- Update `phase-execution.md` so each phase resolver call carries
  `--task-class` and Codex `--task-effort` when applicable, records
  classification in Phase Scope, and surfaces structured notices before launch.
- Require human-facing notice display before implementation or reviewer launch.
- Explain terminal reviewer access and retention-policy responsibility.
- Correct stale Cursor recommendation/catalog counts in configuration docs.
- Do not edit generated `apps/oat-docs/index.md`; Step 4 regenerates it from the
  approved authored source delta.

**Step 3: Format**

```bash
pnpm exec oxfmt --write \
  ".agents/skills/oat-project-implement/SKILL.md" \
  ".agents/skills/oat-project-implement/references/dispatch-and-dry-run.md" \
  ".agents/skills/oat-project-implement/references/phase-execution.md" \
  "packages/cli/src/validation/skills.test.ts" \
  "apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md" \
  "apps/oat-docs/docs/cli-utilities/configuration.md"
```

**Step 4: Verify**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/validation/skills.test.ts
pnpm -w run cli:source -- docs generate-index \
  --docs-dir apps/oat-docs/docs \
  --output apps/oat-docs/index.md
pnpm lint
pnpm format
pnpm --filter oat-docs check
pnpm build:docs
```

Expected: skill contracts, Fumadocs index regeneration, formatting, lint, and
docs build pass.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md \
  .agents/skills/oat-project-implement/references/dispatch-and-dry-run.md \
  .agents/skills/oat-project-implement/references/phase-execution.md \
  packages/cli/src/validation/skills.test.ts \
  apps/oat-docs/docs/workflows/projects/dispatch-ceiling.md \
  apps/oat-docs/docs/cli-utilities/configuration.md \
  apps/oat-docs/index.md
git commit -m "docs(oat): document dispatch notices and reviewer constraints"
```

---

## Phase 3: Release and Backlog Closeout

### Task p03-t01: Bump lockstep public package versions

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json`

**Step 1: Update release metadata**

Bump all five public packages from `0.2.24` to `0.2.25` and update the bundled
public-package inventory.

**Step 2: Format**

```bash
pnpm exec oxfmt --write \
  "packages/cli/package.json" \
  "packages/control-plane/package.json" \
  "packages/docs-config/package.json" \
  "packages/docs-theme/package.json" \
  "packages/docs-transforms/package.json" \
  "packages/cli/assets/public-package-versions.json"
```

**Step 3: Verify**

```bash
pnpm release:validate
```

Expected: all five publishable packages validate at `0.2.25`.

**Step 4: Commit**

```bash
git add packages/cli/package.json \
  packages/control-plane/package.json \
  packages/docs-config/package.json \
  packages/docs-theme/package.json \
  packages/docs-transforms/package.json \
  packages/cli/assets/public-package-versions.json
git commit -m "chore(release): bump public packages for dispatch notices"
```

---

### Task p03-t02: Archive the completed backlog item and run final verification

**Files:**

- Modify: `.agents/docs/autonomy-contract.md`
- Create: `.oat/repo/reference/decisions/AGENTS.md`
- Modify:
  `.oat/repo/pjm/backlog/items/BL-260706-front-load-recurring-gate.md`
- Modify:
  `.oat/repo/pjm/backlog/items/BL-260711-skip-re-review-for-bookkeeping.md`
- Modify: `.oat/repo/pjm/backlog/items/BL-260712-per-project-override.md`
- Modify:
  `.oat/repo/pjm/backlog/items/BL-260713-root-agent-judgment-logging.md`
- Modify: `.oat/repo/pjm/backlog/items/BL-260714-executable-backstops.md`
- Modify:
  `.oat/repo/pjm/backlog/archived/BL-260707-ask-to-enable-phase-review.md`
- Modify:
  `.oat/repo/pjm/backlog/archived/BL-260707-declare-gate-review-target.md`
- Modify:
  `.oat/repo/pjm/backlog/archived/BL-260707-support-producer-identity.md`
- Modify:
  `.oat/repo/pjm/backlog/archived/BL-260712-trim-dispatch-and-dry-run.md`
- Move:
  `.oat/repo/pjm/backlog/items/BL-260727-surface-implementer-dispatches.md`
  to `.oat/repo/pjm/backlog/archived/`
- Modify: `.oat/repo/pjm/backlog/completed.md`
- Modify: `.oat/repo/pjm/backlog/index.md`

**Step 1: Repair the pre-existing failing PJM checks**

Run `pnpm run cli:source -- pjm init` to create the missing canonical
`.oat/repo/reference/decisions/AGENTS.md` without replacing existing PJM files.
Remove only `oat_template` and `oat_template_name` from the nine instantiated
backlog records listed above. Preserve all record content and other metadata.

Run:

```bash
pnpm run cli:source -- pjm doctor
```

Expected: no failing PJM checks. Existing layout/legacy warnings may remain.

**Step 2: Refresh the derived autonomy prompt-site inventory**

Remove stale mapping `ffb3af0ba8ef` for
`oat-project-implement/SKILL.md` from `.agents/docs/autonomy-contract.md`. The
Phase 2 wording change removed that prompt-like site; no replacement mapping is
required.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/validation/autonomy-gate-inventory.test.ts
```

Expected: the autonomy gate-inventory drift check passes.

**Step 3: Archive the backlog item**

```bash
oat backlog archive BL-260727-surface-implementer-dispatches \
  --summary "Added structured warnings and classification provenance for managed-capped implementation/fix dispatches, plus terminal reviewer constraint disclosures."
```

Expected: the item is closed, moved to `archived/`, added to the completed
ledger, and removed from the active index.

**Step 4: Format**

```bash
pnpm exec oxfmt --write \
  ".agents/docs/autonomy-contract.md" \
  ".oat/repo/reference/decisions/AGENTS.md" \
  ".oat/repo/pjm/backlog/items/BL-260706-front-load-recurring-gate.md" \
  ".oat/repo/pjm/backlog/items/BL-260711-skip-re-review-for-bookkeeping.md" \
  ".oat/repo/pjm/backlog/items/BL-260712-per-project-override.md" \
  ".oat/repo/pjm/backlog/items/BL-260713-root-agent-judgment-logging.md" \
  ".oat/repo/pjm/backlog/items/BL-260714-executable-backstops.md" \
  ".oat/repo/pjm/backlog/archived/BL-260707-ask-to-enable-phase-review.md" \
  ".oat/repo/pjm/backlog/archived/BL-260707-declare-gate-review-target.md" \
  ".oat/repo/pjm/backlog/archived/BL-260707-support-producer-identity.md" \
  ".oat/repo/pjm/backlog/archived/BL-260712-trim-dispatch-and-dry-run.md" \
  ".oat/repo/pjm/backlog/archived/BL-260727-surface-implementer-dispatches.md" \
  ".oat/repo/pjm/backlog/completed.md" \
  ".oat/repo/pjm/backlog/index.md"
```

**Step 5: Run definition-of-done verification**

```bash
pnpm check
pnpm type-check
pnpm test
pnpm build
pnpm lint
pnpm format
pnpm build:docs
pnpm release:validate
oat pjm doctor
git diff --check
```

Expected: all required checks pass and PJM state is consistent.

**Step 6: Commit**

```bash
git add .agents/docs/autonomy-contract.md \
  .oat/repo/reference/decisions/AGENTS.md \
  .oat/repo/pjm/backlog
git commit -m "chore(backlog): close implementer dispatch visibility"
```

---

## Phase p-rev1: Revision 1

Source: inline feedback (2026-07-29)

### Task prev1-t01: (revision) Merge current origin/main

**Files:**

- Modify as required: files changed by both this branch and `origin/main`

**Step 1: Merge current main**

Fetch and merge `origin/main` into the project branch without rebasing or
force-pushing.

**Step 2: Resolve and verify**

Preserve this project's dispatch visibility behavior and lifecycle artifacts
while accepting compatible upstream review-scope changes.

Run:

```bash
git diff --check
git diff --name-only --diff-filter=U
```

Expected: no whitespace errors or unmerged paths remain.

**Step 3: Commit**

Use the merge commit created by `git merge origin/main`; do not rewrite branch
history.

---

### Task prev1-t02: (revision) Bump lockstep public packages after merge

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json`

**Step 1: Bump release metadata**

After the merge, inspect the merged public-package baseline and bump all five
lockstep public packages plus the bundled inventory to the next patch version.
The fetched `origin/main` baseline is `0.2.25`, so the target is `0.2.26`.

**Step 2: Verify**

Run:

```bash
pnpm check
pnpm type-check
pnpm test
pnpm build
pnpm lint
pnpm format
pnpm build:docs
pnpm release:validate
git diff --check
```

Expected: all CI, skill/docs, docs-build, and publishable-package checks pass.

**Step 3: Commit**

```bash
git add packages/cli/package.json \
  packages/control-plane/package.json \
  packages/docs-config/package.json \
  packages/docs-theme/package.json \
  packages/docs-transforms/package.json \
  packages/cli/assets/public-package-versions.json
git commit -m "chore(release): bump public packages after main merge"
```

---

### Task prev1-t03: (review) Refresh revision summary lineage

**Files:**

- Modify: `.oat/projects/shared/surface-implementer-dispatches/summary.md`

**Step 1: Understand the issue**

Review finding: the summary's freshness metadata and narrative do not include
Revision 1 even though `prev1-t02` is complete.
Location:
`.oat/projects/shared/surface-implementer-dispatches/summary.md:7`

**Step 2: Implement fix**

Refresh the summary through the `oat-project-summary` contract. Record
`prev1-t02` as the latest task, one included revision (`p-rev1`), and a concise
Revision History entry covering the main merge, conflict resolution, and
`0.2.26` release bump.

**Step 3: Verify**

Run:

```bash
pnpm exec oxfmt --check \
  ".oat/projects/shared/surface-implementer-dispatches/summary.md"
git diff --check
```

Expected: summary metadata matches the completed revision and formatting passes.

**Step 4: Commit**

```bash
git add .oat/projects/shared/surface-implementer-dispatches/summary.md
git commit -m "docs(summary): record post-merge revision"
```

---

### Task prev1-t04: (review) Clean archived review whitespace

**Files:**

- Modify:
  `.oat/projects/shared/surface-implementer-dispatches/reviews/archived/code-final-review-2026-07-29T150100Z.md`
- Modify: `.oat/projects/shared/surface-implementer-dispatches/summary.md`

**Step 1: Understand the issue**

Review finding: Markdown hard-break trailing spaces in the archived prior review
make both the guarded re-review range and effective branch delta fail
`git diff --check`.
Location:
`.oat/projects/shared/surface-implementer-dispatches/reviews/archived/code-final-review-2026-07-29T150100Z.md:17`

**Step 2: Implement fix**

Remove the trailing spaces without changing the review artifact's meaning.
After the task is complete, advance `oat_summary_last_task` to `prev1-t04` so
the summary remains fresh after its own review-fix tasks finish.

**Step 3: Verify**

Run:

```bash
git diff --check 79feab7f0b2fd23165f9dcea06bf04a70d645b62..HEAD
git diff --check origin/main...HEAD
```

Expected: both authoritative ranges pass whitespace validation.

**Step 4: Commit**

```bash
git add \
  .oat/projects/shared/surface-implementer-dispatches/reviews/archived/code-final-review-2026-07-29T150100Z.md
git commit -m "chore(review): clean archived final review formatting"
```

---

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                                      | Reviewed Head                            | Invocation | Gate Target          |
| ------ | -------- | --------------- | ---------- | ------------------------------------------------------------- | ---------------------------------------- | ---------- | -------------------- |
| p01    | code     | passed          | 2026-07-29 | reviews/archived/code-p01-review-2026-07-29T043611Z.md        | -                                        | -          | -                    |
| p02    | code     | fixes_completed | 2026-07-29 | reviews/archived/code-p02-review-2026-07-29T120024Z.md        | -                                        | -          | -                    |
| p02    | code     | fixes_completed | 2026-07-29 | reviews/archived/code-p02-review-2026-07-29T121857Z.md        | -                                        | -          | -                    |
| p02    | code     | passed          | 2026-07-29 | reviews/archived/code-p02-review-2026-07-29T123104Z.md        | -                                        | -          | -                    |
| p03    | code     | passed          | 2026-07-29 | reviews/archived/code-p03-review-2026-07-29T145300Z.md        | -                                        | -          | -                    |
| final  | code     | passed          | 2026-07-29 | reviews/archived/code-final-review-2026-07-29T150100Z.md      | -                                        | -          | -                    |
| final  | code     | passed          | 2026-07-29 | reviews/archived/final-review-2026-07-29T152853Z.md           | -                                        | -          | -                    |
| spec   | artifact | pending         | -          | -                                                             | -                                        | -          | -                    |
| design | artifact | fixes_completed | 2026-07-29 | reviews/archived/artifact-design-review-2026-07-28T235619Z.md | -                                        | -          | -                    |
| plan   | artifact | passed          | 2026-07-29 | -                                                             | -                                        | -          | -                    |
| plan   | artifact | fixes_completed | 2026-07-29 | reviews/archived/artifact-plan-review-2026-07-29T034646Z.md   | -                                        | -          | -                    |
| final  | code     | fixes_completed | 2026-07-29 | reviews/archived/final-review-2026-07-29T165043Z.md           | 06f0777ba7145406fe406490c2630a945c2858c2 | manual     | -                    |
| final  | code     | passed          | 2026-07-29 | reviews/archived/final-review-2026-07-29T171719Z.md           | ff92b31655fbbd5e1a99c40adf33340f60076173 | manual     | -                    |
| final  | code     | passed          | 2026-07-29 | reviews/archived/final-review-2026-07-29T173359Z.md           | 18017af6c732f9a5a26c34e5e5f03f16ddce4ba6 | gate       | cursor-fable-5-xhigh |
| final  | code     | passed          | 2026-07-29 | reviews/archived/final-review-2026-07-29T175311Z.md           | b977847a59124948e07a3a759f5fe304835127cc | manual     | -                    |
| final  | code     | received        | 2026-07-29 | reviews/final-review-2026-07-29T180703Z.md                    | a49a785b877c9f1e8d4022b011d6dba632744760 | gate       | cursor-fable-5-xhigh |

**Status values:** `pending` → `received` → `fixes_added` →
`fixes_completed` → `passed`

The artifact-less `plan` pass records the structured in-session quick-start
review; no review artifact was produced for that event.

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks - Dispatch report schema, classification inputs, and warnings
- Phase 2: 2 tasks - Terminal reviewer disclosures, skills, and docs
- Phase 3: 2 tasks - Public release metadata and backlog closeout
- Revision 1: 4 tasks - Merge current main, refresh release metadata, and close
  final review findings

**Total: 10 tasks**

Ready for implementation after plan review and dispatch setup.

## References

- Design: `design.md`
- Discovery: `discovery.md`
- Backlog:
  `.oat/repo/pjm/backlog/archived/BL-260727-surface-implementer-dispatches.md`
- Resolver:
  `packages/cli/src/commands/project/dispatch-ceiling/index.ts`
- Dispatch Report:
  `packages/cli/src/providers/identity/dispatch-report.ts`
