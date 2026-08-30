---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-08-30
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups: [] # sequential: phases share the portability contract surface
oat_plan_hill_phases: ['p03']
oat_auto_review_at_hill_checkpoints: true
oat_plan_source: spec-driven
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: agent-provider-root

> Execute this plan using `oat-project-implement`.

**Goal:** Make every canonical skill-to-agent read portable across loaded,
user, and project provider roots without changing provider-native model,
effort, variant, or dispatch selection.

**Architecture:** Extend the manifest-derived Markdown portability ratchet with
typed `skill` and `agent` targets and an exact-target fixture contract. Migrate
the seven live canonical role reads to independently validated local bindings,
while keeping native variant dispatch authoritative and shipping the resulting
skill/docs changes through the existing lockstep release process.

**Tech Stack:** TypeScript 7, Vitest 4, Node.js filesystem fixtures, Markdown
canonical skills, pnpm 10, Turborepo, OAT provider sync and release tooling.

**Commit Convention:** `{type}({task-id}): {description}`

## Planning Checklist

- [x] Defer HiLL checkpoint confirmation to `oat-project-implement`
- [x] Evaluated phases for parallelism; keep sequential because p01-p03 share
      the portability contract and release surfaces
- [x] Set `oat_plan_parallel_groups: []`
- [x] Record project dispatch policy: managed High ceiling
- [x] Confirm phase/task breakdown with user
- [x] Configure optional Phase gate review: disabled by user
- [x] Complete plan artifact review: passed after one bounded revision

## Parallelism

No parallel groups are declared. Phase 2 depends on the classifier and fixture
contracts established in Phase 1, and Phase 3 validates and versions the
combined Phase 1/2 change set. All three phases also touch or verify the same
canonical skill and portability-test surfaces.

## Phase 1: Portable Agent Contract and Ratchet Foundation

Establish one typed classifier and exact-target fixture contract without yet
changing the seven live consumers. Preserve the historical skill baseline
byte-for-byte and keep every intermediate commit green.

### Task p01-t01: Generalize the portable asset classifier

**Requirements:** FR4, NFR2

**Files:**

- Modify: `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Write table-driven classifier cases (RED)**

Add typed expectations for existing bare skill targets; canonical bare agent
forms including dot-relative and repeated-parent hops; and negative portable,
provider-view, suffixed-variant, Codex TOML, and unanchored-prose cases. Each
finding includes `kind`, owner/name, target path, and exact evidence.

Run:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts
```

Expected: new agent cases fail until the classifier supports typed targets.

**Step 2: Implement the typed classifier (GREEN)**

Replace the skill-only matcher entry point with internal
`classifyPortableAssetTargets(markdown)` returning `skill` and `agent`
findings. Keep existing skill collectors as filtered consumers so the literal
six-entry `PINNED_HISTORICAL_CROSS_SKILL_READS` declaration is not rewritten.

Prove the manifest-derived user-default asset set contains every file in
`.agents/agents/*.md`. Only after that equality assertion passes, remove the
duplicate bare-skill matcher in `skills.test.ts`; otherwise keep its scan and
route it through the same classifier semantics.

**Step 3: Format and verify**

```bash
pnpm exec oxfmt --write packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts packages/cli/src/validation/skills.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts src/validation/skills.test.ts
```

Expected: matcher tables pass, all four canonical agents are proven covered,
and the historical skill baseline remains exactly six entries.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts packages/cli/src/validation/skills.test.ts
git commit -m "test(p01-t01): type portable skill and agent targets"
```

### Task p01-t02: Add exact canonical-target resolution fixtures

**Requirements:** FR1, FR2, FR3, FR6, NFR1

**Files:**

- Modify: `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`

**Step 1: Add provider-layout fixtures (RED)**

Build temporary `.agents`, `.claude`, `.cursor`, and `.codex` layouts
covering safe unsuffixed symlinks, logical and realpathed skill paths, Cursor
variants and copies, Codex canonical Markdown and TOML, unsafe links, ordered
fallback, valid coexistence, total miss, and two-direction dependency isolation.

Run the focused contract test. Expected: fixture cases fail before the
resolution helper exists.

**Step 2: Implement the test-internal contract helper (GREEN)**

Add a test-only helper that checks `loaded -> user -> project`, admits only a
direct canonical target or an exact same-scope canonical symlink, records miss
reasons, and never scans directories or accepts variants, copies, or TOML.
Resolve each requested dependency independently.

Do not add a CLI command, runtime API, environment variable, cache, provider
write, or persistent state.

**Step 3: Format and verify**

```bash
pnpm exec oxfmt --write packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts
```

Expected: provider layouts, candidate ordering, miss continuation, and
dependency-isolation fixtures pass deterministically.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts
git commit -m "test(p01-t02): model exact canonical agent resolution"
```

## Phase 2: Migrate Live Canonical Role Reads

Port all seven revalidated live reads and pointers. Every task adds its contract
assertions before changing prose, bumps each changed canonical skill exactly
once, and preserves provider-native dispatch selection.

### Task p02-t01: Migrate project review role reads

**Requirements:** FR1, FR3, FR5, FR6, NFR1

**Files:**

- Modify: `.agents/skills/oat-project-review-provide/SKILL.md`
- Modify: `.agents/skills/oat-project-review-provide-remote/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Add review-consumer contracts (RED)**

Assert that both skills bind the workflows-owned reviewer from
`${SKILL_DIR}/../..`, `${HOME}/.agents`, then `<repo-root>/.agents`;
validate exact unsuffixed `agents/oat-reviewer.md`; continue past invalid
loaded views; and fail before fresh-child fallback with workflows install and
update recovery. Cover the two review-provide reads and two remote source-of-
truth pointers. Keep Claude/Cursor invocation descriptions as provider examples.

**Step 2: Migrate prose and bump versions (GREEN)**

Replace four live bare pointers with local bindings. Preserve resolver-returned
target, model, effort, and variant fields as immutable; native dispatch stays
first and only pre-start role-selection rejection permits a fresh child.

- `oat-project-review-provide`: `1.5.1 -> 1.5.2`
- `oat-project-review-provide-remote`: `1.1.0 -> 1.1.1`

Update all exact version expectations.

**Step 3: Format and verify**

```bash
pnpm exec oxfmt --write .agents/skills/oat-project-review-provide/SKILL.md .agents/skills/oat-project-review-provide-remote/SKILL.md packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts packages/cli/src/validation/skills.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts src/validation/skills.test.ts
```

Expected: four review pointers are portable, provider examples remain excluded,
recovery is pack-aware, and review dispatch selection is unchanged.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-review-provide/SKILL.md .agents/skills/oat-project-review-provide-remote/SKILL.md packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts packages/cli/src/validation/skills.test.ts
git commit -m "fix(p02-t01): resolve project reviewer instructions portably"
```

### Task p02-t02: Migrate plan artifact-review instructions

**Requirements:** FR1, FR3, FR5, FR6, NFR1

**Files:**

- Modify: `.agents/skills/oat-project-plan-writing/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Add planning-review contracts (RED)**

Assert three-tier exact-target and recovery behavior around the plan artifact-
review fallback. Assert the exact registered reviewer variant remains first and
the local root supplies only role instructions after pre-start rejection.

**Step 2: Migrate prose and bump version (GREEN)**

Replace the one bare reviewer read with the local binding. Bump
`oat-project-plan-writing` from `1.2.19` to `1.2.20` and update every exact
version assertion.

**Step 3: Format and verify**

```bash
pnpm exec oxfmt --write .agents/skills/oat-project-plan-writing/SKILL.md packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts packages/cli/src/validation/skills.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts src/validation/skills.test.ts
```

Expected: plan review resolution is portable and Codex/Claude/Cursor target
controls remain unchanged.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-plan-writing/SKILL.md packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts packages/cli/src/validation/skills.test.ts
git commit -m "fix(p02-t02): bind plan reviewer instructions locally"
```

### Task p02-t03: Migrate implementation fallback roles

**Requirements:** FR1, FR3, FR5, FR6, NFR1, NFR3

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `.agents/skills/oat-project-implement/references/dispatch-and-dry-run.md`
- Modify: `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Add implementation-dispatch regressions (RED)**

Assert exact independent validation for both role files, ordered fallback,
workflows recovery, and stop-before-fallback behavior. Assert native variants
remain first, acceptance never permits replacement, only pre-start rejection
unlocks a fresh child, and instructions cannot change the immutable provider,
model, effort, or variant target.

**Step 2: Migrate prose and bump version (GREEN)**

Replace both bare role reads in `dispatch-and-dry-run.md` with the local
workflows binding. Bump the parent `oat-project-implement` skill once from
`2.3.0` to `2.3.1` and update every exact version assertion. Do not edit
provider matrices, variants, resolvers, or provider configuration.

**Step 3: Format and verify**

```bash
pnpm exec oxfmt --write .agents/skills/oat-project-implement/SKILL.md .agents/skills/oat-project-implement/references/dispatch-and-dry-run.md packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts packages/cli/src/validation/skills.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts src/validation/skills.test.ts
```

Expected: both fallback roles are portable and all variant-first/model-effort
regressions remain green.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md .agents/skills/oat-project-implement/references/dispatch-and-dry-run.md packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts packages/cli/src/validation/skills.test.ts
git commit -m "fix(p02-t03): resolve implementation role instructions portably"
```

### Task p02-t04: Activate the zero-executable agent ratchet

**Requirements:** FR4, FR5, NFR1, NFR2

**Files:**

- Modify: `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`

**Step 1: Add final ratchet expectations (RED)**

Make both scan scopes consume the typed classifier. Require zero executable
`agent` findings with exact `source -> target` detail. Assert the two
`skeptic` Claude/Cursor descriptions and other provider-view examples remain
classified examples, not canonical reads.

**Step 2: Re-sweep and close findings (GREEN)**

Run all `.agents/skills/**/*.md` through the classifier. Classify every
finding; migrate any newly discovered live read instead of allowlisting it.
Keep the six-entry skill baseline byte-for-byte unchanged and add no agent
baseline.

**Step 3: Format and verify**

```bash
pnpm exec oxfmt --write packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts src/validation/skills.test.ts
```

Expected: zero executable agent findings, six unchanged historical skill
findings, and no divergent matcher remains.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts
git commit -m "test(p02-t04): enforce zero bare canonical agent reads"
```

## Phase 3: Documentation, Packaging, and Release Proof

Document the boundary, refresh provider outputs, apply release metadata, prove
the mutation ratchet, and run the complete repository Definition of Done.

### Task p03-t01: Document and package the provider-root contract

**Requirements:** FR7, NFR3

**Files:**

- Modify: `apps/oat-docs/docs/contributing/skills.md`
- Modify: `apps/oat-docs/docs/cli-utilities/tool-packs.md`
- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json`
- Modify: `pnpm-lock.yaml`
- Update if generated: only the exact changed paths reported under `.claude/`,
  `.cursor/`, `.codex/`, or `.oat/sync/manifest.json` after inspection

**Step 1: Update documentation**

Document local `${AGENT_PROVIDER_ROOT}`, exact unsuffixed canonical/symlink
eligibility, candidate ordering, dependency isolation, provider exclusions,
workflows recovery, and the separation from native model/effort/variant
dispatch.

**Step 2: Refresh generated views and release metadata**

Fetch `origin/main`, verify the public-package baseline, and advance all five
packages to the next unused common patch strictly above that fetched baseline.
Regenerate public-package version metadata and the lockfile through repository
tooling. Run repository-source project sync and keep only expected generated
changes. Revalidate Claude/Cursor base symlinks, Cursor variants, and Codex TOML
exclusion.

**Step 3: Format and verify**

```bash
pnpm exec oxfmt --write apps/oat-docs/docs/contributing/skills.md apps/oat-docs/docs/cli-utilities/tool-packs.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets/public-package-versions.json
pnpm lint
pnpm format
pnpm run check:skill-bumps
pnpm release:check-versions
pnpm release:validate
```

Expected: docs/views are coherent, four skills have one PR-scoped bump, and all
five public packages plus generated metadata are lockstep above `origin/main`.

**Step 4: Commit and re-check committed versions**

```bash
git add apps/oat-docs/docs/contributing/skills.md apps/oat-docs/docs/cli-utilities/tool-packs.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets/public-package-versions.json pnpm-lock.yaml
git diff --name-only -- .claude .cursor .codex .oat/sync/manifest.json
# Inspect the output and git add each expected generated file explicitly.
git commit -m "docs(p03-t01): ship canonical agent root contract"
git fetch origin
pnpm release:check-versions
```

Expected: post-commit version gate exits `0`; generated directories with no
diff are not staged.

### Task p03-t02: Prove mutation detection and complete repository gates

**Requirements:** FR4, FR7, NFR1, NFR2, NFR3

**Files:**

- No intended source edits; evidence-grade verification task

**Step 1: Run the real-tree mutation proof**

Save the exact bytes of one user-default canonical skill, inject one temporary
executable `.agents/agents/oat-reviewer.md` read, and require the focused
ratchet to fail with exact `source -> agent/oat-reviewer.md` evidence. Restore
in guaranteed cleanup, verify the original hash and `git diff --exit-code`,
then require the focused suite to pass.

**Step 2: Run uncached and isolated focused suites**

```bash
isolated_test_home="$(mktemp -d)"
test -d "$isolated_test_home"
trap 'rm -rf "$isolated_test_home"' EXIT
env HOME="$isolated_test_home" pnpm exec turbo run test --force
pnpm test:smoke
pnpm test:skills
pnpm test:release
pnpm oat:validate-skills
pnpm lint
pnpm format
```

Capture direct exit codes. Expected: all exit `0`, with `>>> FULL TURBO`
evidence for the uncached run.

**Step 3: Run the complete Definition of Done in order**

```bash
pnpm check
pnpm type-check
pnpm test
pnpm build
pnpm run check:skill-bumps
pnpm release:check-versions
pnpm release:validate
pnpm build:docs
```

Fetch `origin/main` immediately before version checks. Capture every exit code
without piping away status and distinguish cache replay from executed evidence.
For each command, redirect output to a task-local temporary log, assign its
status to a task-specific variable, print `command exit=<code>`, and assert the
code is zero before starting the next gate; do not use a pager or filter as the
pipeline's final command.
Expected: all eight gates exit `0`; project views remain in sync; no user-owned
provider directory is mutated or restarted.

**Step 4: Commit discipline**

Do not create an empty source commit. If formatting, sync, or release tooling
produces an expected tracked correction, inspect it, rerun affected checks, and
commit `chore(p03-t02): finalize provider-root release proof`. Otherwise let
`oat-project-implement` record evidence in normal implementation bookkeeping.

## Reviews

| Scope  | Type     | Status  | Date       | Artifact                                                      | Reviewed Head                            | Invocation | Gate Target                   |
| ------ | -------- | ------- | ---------- | ------------------------------------------------------------- | ---------------------------------------- | ---------- | ----------------------------- |
| p01    | code     | passed  | 2026-08-30 | reviews/p01-review-2026-08-30T164420Z.md                      | b2ba7751eb4754626d765d43de7ae8701db6dfa9 | auto       | oat-reviewer-gpt-5-6-sol-high |
| p02    | code     | pending | -          | -                                                             | -                                        | -          | -                             |
| p03    | code     | pending | -          | -                                                             | -                                        | -          | -                             |
| final  | code     | pending | -          | -                                                             | -                                        | -          | -                             |
| spec   | artifact | pending | -          | -                                                             | -                                        | -          | -                             |
| design | artifact | passed  | 2026-08-30 | reviews/archived/artifact-design-review-2026-08-30T145223Z.md | -                                        | -          | -                             |
| plan   | artifact | passed  | 2026-08-30 | -                                                             | -                                        | auto       | -                             |
| plan   | artifact | passed  | 2026-08-30 | reviews/archived/artifact-plan-review-2026-08-30T160834Z.md   | -                                        | -          | -                             |

For code reviews, `Reviewed Head` is the full SHA. `Invocation` records
`manual`, `auto`, or `gate`; `Gate Target` is populated only for gates.
Preserve every existing row and unknown trailing cell.

**Status values:** `pending` -> `received` -> `fixes_added` ->
`fixes_completed` -> `passed`

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks - Typed classifier and exact-target fixture contract
- Phase 2: 4 tasks - Seven live-read migrations and zero agent ratchet
- Phase 3: 2 tasks - Documentation, release metadata, mutation, and full gates

**Total: 8 tasks**

Ready for code review and merge after all tasks, configured phase reviews, and
the final review pass.

## References

- Design: `design.md`
- Spec: `spec.md`
- Discovery: `discovery.md`
- Backlog: `../../../repo/pjm/backlog/items/BL-260829-unified-agent-provider-root.md`
- Related project: `../tool-pack-scope-provider-truthfulness/`
