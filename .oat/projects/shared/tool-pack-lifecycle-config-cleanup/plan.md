---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-27
oat_phase: plan
oat_phase_status: in_progress
oat_plan_parallel_groups:
  - [p01, p02]
oat_phase_review_gate: false
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: true
---

# Implementation Plan: Tool-Pack Lifecycle and Config Cleanup

> Execute this plan using `oat-project-implement`. Phases p01 and p02 may run
> in isolated worktrees; p03 follows their merge.

**Goal:** Close the five residual lifecycle/config findings from the
user-scope tool-pack final review without reopening the architecture or
changing additive install semantics.

**Architecture:** Reuse the canonical pack manifest, digest helpers, inventory
model, project-config reconciler, and Commander adapters. Correct evidence and
validation at those existing boundaries rather than adding a second lifecycle
model.

**Tech Stack:** TypeScript ESM, Commander, Vitest, pnpm workspaces, Turborepo,
oxfmt, and Fumadocs Markdown.

**Commit Convention:** `{type}({task-id}): {description}`

## Parallelism

Phases p01 and p02 are one parallel group. p01 owns pack inventory and its
focused fixtures; p02 owns project-config reconciliation, config commands, and
per-pack command registration. Their production write sets and focused suites
are disjoint. Phase p03 follows both because it selects lockstep package
versions, updates any combined upgrade documentation, and verifies the merged
tree.

## Phase 1: Content-Accurate Pack Inventory

**Goal:** Classify managed and seed-if-missing content from canonical digest
evidence instead of presence or version metadata alone.

### Task p01-t01: Distinguish seed defaults from retained overrides

**Files:**

- Modify: `packages/cli/src/commands/tools/shared/pack-inventory.ts`
- Modify: `packages/cli/src/commands/tools/shared/pack-inventory.test.ts`
- Modify: `packages/cli/src/commands/doctor/index.test.ts`
- Modify: `packages/cli/src/commands/status/index.test.ts`

**Step 1: Write tests (RED)**

Cover a source-backed seed-if-missing asset that is absent, byte-identical to
the bundle, and intentionally modified. Assert the identical asset is
classified as the bundled default, while the modified asset remains a retained
override and is never overwritten by inventory. Also cover generated seeds for
projects-root default, projects-config default, and empty-file generation;
assert they retain their generation-aware presence/schema contracts and are not
treated as byte-for-byte bundled files.
At the doctor and status boundaries, assert identical source-backed seeds do
not contribute to human or JSON retained-override counts while a modified seed
contributes exactly once.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/pack-inventory.test.ts src/commands/doctor/index.test.ts src/commands/status/index.test.ts`

Expected: fail because every present seed-if-missing asset currently collapses
to the same status.

**Step 2: Implement (GREEN)**

For source-backed seed-if-missing assets, resolve and validate the bundled
source, compare installed and bundled content using the existing bounded digest
helpers, and emit distinct current/default versus retained-override evidence.
Branch generated seeds through their manifest generation contract without
requiring a source or raw-byte equivalence. Preserve missing behavior and
read-only inventory semantics.

**Step 3: Format**

Run:
`pnpm exec oxfmt --write packages/cli/src/commands/tools/shared/pack-inventory.ts packages/cli/src/commands/tools/shared/pack-inventory.test.ts packages/cli/src/commands/doctor/index.test.ts packages/cli/src/commands/status/index.test.ts`

**Step 4: Verify**

Run the focused test command again; expected: pass.

**Step 5: Commit**

`git commit -m "fix(p01-t01): classify seeded pack assets by content"`

### Task p01-t02: Detect same-version skill and agent drift

**Files:**

- Modify: `packages/cli/src/commands/tools/shared/pack-inventory.ts`
- Modify: `packages/cli/src/commands/tools/shared/pack-inventory.test.ts`

**Step 1: Write tests (RED)**

For both a skill directory and agent file, keep installed and bundled version
metadata equal while changing managed content. Assert inventory reports drift.
Pin the complete precedence matrix: with a valid bundled version, absent or
malformed installed metadata parses through the existing zero-version contract
and is `outdated`; an older installed version is `outdated`; a newer installed
version remains `newer`; malformed bundled metadata preserves the current
parse/compare behavior; and equal versions are `current` only when canonical
content also matches and `outdated` when it differs.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/pack-inventory.test.ts`

Expected: fail because equal versions currently short-circuit content
comparison.

**Step 2: Implement (GREEN)**

Preserve missing, malformed, older, and newer version outcomes. Only the
equal-version branch adds a canonical content digest requirement before it can
return current. Reuse the canonical materialized source and installed-path
boundaries so ignored or unrelated files do not become drift evidence.

**Step 3: Format**

Run the same file-scoped `oxfmt --write` command from p01-t01.

**Step 4: Verify**

Run the focused test command again; expected: pass for skill, agent, and static
asset matrices.

**Step 5: Commit**

`git commit -m "fix(p01-t02): detect version-equal pack content drift"`

**Phase 1 Verification:**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/pack-inventory.test.ts src/commands/doctor/index.test.ts src/commands/status/index.test.ts`

Expected: inventory and both consumers pass with the refined evidence.

## Phase 2: Explicit Adoption and Supported CLI State

**Goal:** Make config adoption observable and prevent public commands from
creating or advertising unsupported lifecycle states.

### Task p02-t01: Report exact legacy pack intents adopted

**Files:**

- Modify: `packages/cli/src/commands/tools/shared/project-tools-config.ts`
- Modify: `packages/cli/src/commands/tools/shared/project-tools-config.test.ts`
- Modify: `packages/cli/src/commands/init/tools/index.ts`
- Modify: `packages/cli/src/commands/init/tools/index.test.ts`
- Modify: `packages/cli/src/commands/tools/update/index.ts`
- Modify: `packages/cli/src/commands/tools/update/index.test.ts`

**Step 1: Write tests (RED)**

Cover one newly adopted pack, several newly adopted packs, already-declared
packs, custom tools, and a second idempotent run. Assert the reconciler returns
the exact newly adopted pack names in canonical order and writes only when the
set is non-empty. At both install and update command boundaries, assert one
human-visible report per adopted pack and an ordered adopted-pack field in JSON
output. Aggregate install, direct-pack install, and update each emit exactly one
JSON document: reconciliation completes before the existing result is emitted,
and that result gains the ordered field. The second run emits one normal result
document with no adoption field or human adoption lines.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/project-tools-config.test.ts src/commands/init/tools/index.test.ts src/commands/tools/update/index.test.ts`

Expected: fail because the reconciler returns only `written` or `unchanged`.

**Step 2: Implement (GREEN)**

Return a structured result containing action and adopted pack names. Preserve
the canonical scanner and one atomic config write. Update both concrete callers
to finish reconciliation before rendering and surface the adoption set inside
their existing human and JSON results without changing which detected packs are
eligible or emitting a second structured document.

**Step 3: Format**

Run:
`pnpm exec oxfmt --write packages/cli/src/commands/tools/shared/project-tools-config.ts packages/cli/src/commands/tools/shared/project-tools-config.test.ts`

Include any changed caller/test paths in the same file-scoped invocation.

**Step 4: Verify**

Run the same explicit three-file command from Step 1; expected: exact human/JSON
adoption reporting and idempotent no-op pass.

**Step 5: Commit**

`git commit -m "fix(p02-t01): report adopted project pack intents"`

### Task p02-t02: Reject newly-written false pack intent

**Files:**

- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`

**Step 1: Write tests (RED)**

Assert `oat config set tools.<known-pack> false` fails before writing and gives
an actionable lifecycle-command remedy. Preserve setting `true`, reject
unknown pack names, and prove a pre-existing `false` remains readable without
being silently rewritten.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config/index.test.ts`

Expected: fail because the generic setter writes the conflict state.

**Step 2: Implement (GREEN)**

Validate known pack keys and accept only the supported truthy declaration in
the shared config setter. Direct removal to `oat tools remove` and keep legacy
false values as read-only migration input for normal config resolution.

**Step 3: Format**

Run:
`pnpm exec oxfmt --write packages/cli/src/commands/config/index.ts packages/cli/src/commands/config/index.test.ts`

**Step 4: Verify**

Run the focused test command again; expected: pass with zero-write assertions.

**Step 5: Commit**

`git commit -m "fix(p02-t02): prevent legacy pack conflict writes"`

### Task p02-t03: Remove the inert per-pack force option

**Files:**

- Modify: `packages/cli/src/commands/init/tools/index.ts`
- Modify: `packages/cli/src/commands/init/tools/index.test.ts`
- Modify snapshots or CLI reference docs only when the public help output is
  explicitly pinned there

**Step 1: Write tests (RED)**

Assert individual pack help does not advertise `--force`, while the supported
top-level update/reconciliation commands retain their own documented options.
Assert passing `--force` to a per-pack install is rejected rather than ignored.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/index.test.ts`

Expected: fail because every per-pack command registers the unused flag.

**Step 2: Implement (GREEN)**

Remove the option from `createReconciledPackCommand` and update help snapshots
or reference text as needed. Do not introduce overwrite semantics or change
the reconcile request.

**Step 3: Format**

Run:
`pnpm exec oxfmt --write packages/cli/src/commands/init/tools/index.ts packages/cli/src/commands/init/tools/index.test.ts`

Include any changed Markdown path if public reference output is updated.

**Step 4: Verify**

Run the focused test command again; expected: pass for all pack subcommands.

**Step 5: Commit**

`git commit -m "fix(p02-t03): remove unused per-pack force flag"`

**Phase 2 Verification:**

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/tools/shared/project-tools-config.test.ts src/commands/config/index.test.ts src/commands/init/tools/index.test.ts src/commands/tools/update/index.test.ts`

Expected: adoption, config, and CLI help contracts pass.

## Phase 3: Release Integration

**Goal:** Integrate both correction lanes, document any public compatibility
change, advance lockstep packages, and reproduce every CI gate.

### Task p03-t01: Update release notes, versions, and verify the merged tree

**Files:**

- Modify when needed: `apps/oat-docs/docs/cli-utilities/tool-packs.md`
- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json`
- Modify: `pnpm-lock.yaml`
- Move on completion:
  `.oat/repo/pjm/backlog/items/BL-260827-clean-up-tool-pack-lifecycle.md` to
  `.oat/repo/pjm/backlog/archived/`
- Modify: `.oat/repo/pjm/backlog/completed.md`
- Modify: `.oat/repo/pjm/backlog/index.md`

**Step 1: Confirm the documentation delta**

Analyze the existing tool-pack and CLI-reference coverage against the actual
merged behavior. Present any substantive wording delta for user approval before
editing. When only the existing tool-pack page changes, record navigation and
generated-index work as not applicable. If navigation changes, run the docs nav
sync and `oat docs generate-index` before verification.

**Step 2: Rebase release evidence**

Fetch `origin/main`, confirm it is an ancestor or integrate it before selecting
versions, and choose the next lockstep public package version strictly above
current main. Summarize removal of the inert per-pack flag and any config-set
compatibility guidance in the existing tool-pack upgrade section when the
public behavior is not already clear.

Regenerate `packages/cli/assets/public-package-versions.json` through the
repository bundle workflow after the lockstep version is selected. Do not
hand-author the generated asset.

**Step 3: Format**

Run:
`pnpm exec oxfmt --write apps/oat-docs/docs/cli-utilities/tool-packs.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json`

Regenerate the lockfile with the repository's pnpm workflow when manifest
versions change.

**Step 4: Verify focused integration**

Run the Phase 1 and Phase 2 verification commands together, plus:

`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/bundle-consistency.test.ts`

Expected: all focused lifecycle/config suites pass and the generated public
package-version asset matches the five manifests.

**Step 5: Close the graduated backlog item**

After all acceptance criteria are verified, run:

`pnpm run cli -- backlog archive BL-260827-clean-up-tool-pack-lifecycle --summary "Closed lifecycle/config consistency gaps with content-aware inventory, explicit adoption reporting, supported config state, and corrected CLI help."`

Inspect and stage the moved item, completed ledger, and regenerated index. Run
`pnpm run cli -- pjm doctor --json`; its adoption check must pass, and any
pre-existing layout warnings must be called out separately from this change.

**Step 6: Run definition-of-done gates**

Run in CI order and capture every exit code independently:

1. `pnpm check`
2. `pnpm type-check`
3. `pnpm test`
4. `pnpm build`
5. `pnpm run check:skill-bumps`
6. `pnpm release:check-versions`
7. `pnpm release:validate`
8. `pnpm build:docs`

Also run `pnpm lint`, `pnpm format`, and `git diff --check` because the touched
CLI/docs surfaces are broader than the CI overlap guarantees.

Confirm `git diff --check` and `git status --short` show no unplanned generated
asset after the gates.

**Step 7: Commit**

`git commit -m "chore(p03-t01): verify lifecycle config cleanup release"`

**Phase 3 Verification:** All focused tests and eleven repository gates exit 0
with captured logs.

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                                    | Reviewed Head | Invocation | Gate Target              |
| ------ | -------- | --------------- | ---------- | ----------------------------------------------------------- | ------------- | ---------- | ------------------------ |
| p01    | code     | pending         | -          | -                                                           | -             | -          | -                        |
| p02    | code     | pending         | -          | -                                                           | -             | -          | -                        |
| p03    | code     | pending         | -          | -                                                           | -             | -          | -                        |
| final  | code     | pending         | -          | -                                                           | -             | -          | -                        |
| spec   | artifact | pending         | -          | -                                                           | -             | -          | -                        |
| design | artifact | pending         | -          | -                                                           | -             | -          | -                        |
| plan   | artifact | passed          | 2026-08-27 | -                                                           | -             | auto       | -                        |
| plan   | artifact | fixes_completed | 2026-08-27 | reviews/archived/artifact-plan-review-2026-08-27T225534Z.md | -             | gate       | cursor-gpt-5-6-sol-xhigh |

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks — content-accurate seed and versioned-asset inventory.
- Phase 2: 3 tasks — explicit adoption reporting and supported config/CLI
  state.
- Phase 3: 1 task — release integration, versions, docs, and complete gates.

**Total: 6 tasks**

Ready for implementation after plan review and gate disposition.

## References

- Discovery: `discovery.md`
- Backlog:
  `../../../repo/pjm/backlog/items/BL-260827-clean-up-tool-pack-lifecycle.md`
- Parent project: `../user-scope-tool-packs/implementation.md`
- Closeout review that established this follow-up:
  `../user-scope-tool-packs/reviews/final-review-2026-08-27T222249Z.md`
- Detailed prior final review:
  `../user-scope-tool-packs/reviews/final-review-2026-08-27T174707Z.md`
