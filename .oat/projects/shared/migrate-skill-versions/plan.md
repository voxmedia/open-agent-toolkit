---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-09-08
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p02'] # phases to pause AFTER completing (final phase only)
oat_plan_parallel_groups: [] # groups of phases that run concurrently in worktrees; [] = fully sequential
oat_plan_source: quick # spec-driven | quick | imported | lite
oat_import_reference: null # e.g., references/imported-plan.md
oat_import_source_path: null # original source path provided by user
oat_import_provider: null # codex | cursor | claude | null
oat_generated: false
---

# Implementation Plan: migrate-skill-versions

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Every bundled canonical skill declares its version as `metadata.version` and nothing else, every reader of that version copes with the standard shape, and the alias's retirement schedule is recorded.

**Architecture:** Two sequential phases on one branch: Phase 1 makes every non-resolver reader and test metadata-aware while all skills still carry the alias (each change proven red-then-green); Phase 2 moves all 82 skills, repoints every pin by literal, pins the invariants, records the decision, and takes the standalone lockstep bump.

**Tech Stack:** TypeScript (`packages/cli`), Node `.mjs` tooling (`tools/release`, `.agents/skills/*/scripts`), Vitest, `node --test`, YAML frontmatter, the shared resolver in `packages/cli/src/commands/shared/frontmatter.ts` (`parseSkillFrontmatter`, `resolveSkillVersion`).

**Commit Convention:** `{type}({scope}): {description}` - e.g., `fix(p01-t01): read metadata.version in the explainer RC builder`

## Planning Checklist

- [x] Confirmed HiLL checkpoints: final phase only (`['p02']`, the workflow default); the operator's standing preference is no cross-runtime phase-boundary review gates (`oat_phase_review_gate` stays absent), which is a different setting from HiLL
- [x] Set `oat_plan_hill_phases` in frontmatter
- [x] Evaluated phases for parallelism opportunities (Phase 2 rewrites files Phase 1 edits; sequential)
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

`oat_plan_parallel_groups: []` — Phase 2's pin sweep touches the same test files Phase 1 makes shape-agnostic, and the skill bump for `oat-explainer-kit` covers both phases' edits, so the phases run sequentially on one branch.

---

## Verification mode

Standalone (not a wave lane): this project owns the lockstep bump and runs the full Definition of Done from root `AGENTS.md` in order with captured exit codes: `pnpm check`, `pnpm type-check`, `HOME=$(mktemp -d) pnpm exec turbo run test --force`, `pnpm build`, `pnpm run check:skill-bumps`, `git fetch origin && pnpm release:check-versions`, `pnpm release:validate`, `pnpm build:docs`, plus `pnpm test:smoke`, `pnpm test:skills`, `pnpm test:release`, `pnpm lint`, `pnpm format`, `pnpm oat:validate-skills`. Per-task verification below is the focused subset; the full sequence runs at the end of each phase.

## Recon facts the tasks rely on (2026-09-08, base `5b3b82151`)

- 82 skills under `.agents/skills`, all with a top-level `version:` at frontmatter line 3 (none with `metadata.version`); `oat-repo-improve` and `triage-oat-issues` already carry a `metadata:` map with other keys, so their version is merged into the existing map.
- Non-resolver readers: `tools/release/build-explainer-rc.mjs` (`parseSkillVersion`, `/^version:\s*(\S+)\s*$/m`, throws `E_SKILL_VERSION`) and `.agents/skills/oat-explainer-kit/scripts/check-core.mjs` (`readFrontmatterVersion`, returns `null` → `incompatible`). `packages/cli/assets/**` is a gitignored byte copy produced by `packages/cli/scripts/bundle-assets.sh`; fixes land in the canonical files.
- Test readers that anchor on the top-level key: `packages/cli/src/validation/skills.test.ts` (two corpus sweeps around `:1234` and `:1243` that go red 82× on key removal; 19 pinned `[name, version]` tuples in four blocks around `:1268`, `:4462`, `:5774`, `:5793`; about 28 `.toBe('x.y.z')` sites on a `^version:` capture; four `.toMatch(/^version:\s*x\.y\.z$/m)` sites; path/version arrays around `:2940`, `:5943`, `:5990`, `:6030`), `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts:356,1061,1398`, `packages/cli/src/commands/init/tools/shared/agent-instructions-bundle-contract.test.ts:23-25`, `packages/cli/src/commands/tools/tool-pack-lifecycle.integration.test.ts:334` (a `replace(/^version:.*$/m, 'version: 0.0.1')` mutation whose `outdated` assertion depends on it), `tools/smoke/explainer-kit/wrapper-compatibility.test.mjs:434-435` (regex-escaped literals), `tools/smoke/explainer-kit/packaged-layout.test.mjs:65,114` (derived read; mutation), `.agents/skills/explainer-kit/tests/rebuildability.test.mjs:103`, `.agents/skills/recon/tests/skill-contract.test.mjs:26`. `named-skill-load-contract.test.ts` has no version pins.
- The bump gate (`packages/cli/src/validation/skills.ts` `collectChangedSkillVersionBumpFindings`) resolves both sides through the shared reader, so base `version: X` → head `metadata.version: Y` with `Y > X` passes; the structural validator's required-key list does not include `version`.
- No provider, sync, drift, or manifest surface reads the top-level field of a projected copy; the provider-view diagnostic reads through the resolver. Docs: `apps/oat-docs/docs/contributing/skills.md` lines ~204-208 say every bundled skill still uses the alias and that the migration is tracked separately — that paragraph must be rewritten. Both authoring templates already emit `metadata.version` only.

Re-anchor every cited line on the checked-out base before editing.

---

## Phase 1: Metadata-aware readers and shape-agnostic tests

### Task p01-t01: Read metadata.version in the explainer RC builder

**Files:**

- Modify: `tools/release/build-explainer-rc.mjs` (`parseSkillVersion`), `tools/release/build-explainer-rc.test.mjs`

**Step 1: Write test (RED)**

In `tools/release/build-explainer-rc.test.mjs`, add cases for `parseSkillVersion` (export it or test through the builder's fixture path the file already uses): (a) a `SKILL.md` whose frontmatter carries only `metadata:\n  version: 1.2.3` resolves `1.2.3`; (b) both fields with the same value resolves that value; (c) a quoted value (`version: "1.2.3"` or `metadata.version: '1.2.3'`) resolves without quotes; (d) both fields with different values throws `E_SKILL_VERSION` naming both values (the builder must not guess); (e) neither field throws `E_SKILL_VERSION` as today.

Run: `node --test tools/release/build-explainer-rc.test.mjs`
Expected: (a), (c), (d) fail (RED); (b) and (e) pass on the current regex.

**Step 2: Implement (GREEN)**

Replace the single regex with a small frontmatter-block parse: take the block between the leading `---` lines, find a top-level `version:` line (column 0) and a `version:` line indented under a top-level `metadata:` key (stop at the next column-0 key), strip matching surrounding quotes and a trailing `#` comment, apply metadata-first precedence, and throw `E_SKILL_VERSION` on both-present-and-different or neither. Keep the function synchronous and dependency-free (`tools/release` has no YAML library).

Run: `node --test tools/release/build-explainer-rc.test.mjs`
Expected: all cases pass (GREEN).

**Step 3: Refactor**

None beyond a doc comment naming the precedence and pointing at `packages/cli/src/commands/shared/frontmatter.ts` as the canonical implementation.

**Step 4: Verify**

Run: `pnpm test:release > /tmp/p01-t01-release.log 2>&1; echo exit=$?` then `pnpm release:validate > /tmp/p01-t01-validate.log 2>&1; echo exit=$?`
Expected: both exit 0 on the unmigrated tree (every skill still carries the alias, so the fallback path is exercised).

**Step 5: Commit**

```bash
git add tools/release/build-explainer-rc.mjs tools/release/build-explainer-rc.test.mjs
git commit -m "fix(p01-t01): read metadata.version in the explainer RC builder"
```

---

### Task p01-t02: Read metadata.version in the explainer-kit core check and its packaged-layout probe

**Files:**

- Modify: `.agents/skills/oat-explainer-kit/scripts/check-core.mjs` (`readFrontmatterVersion`), `.agents/skills/oat-explainer-kit/tests/check-core.test.mjs`, `tools/smoke/explainer-kit/packaged-layout.test.mjs` (the derived read near `:65` and the incompatibility mutation near `:114`)

**Step 1: Write test (RED)**

In `check-core.test.mjs`, add cases mirroring p01-t01 for `readFrontmatterVersion`: metadata-only resolves; quoted resolves unquoted; both-same resolves; both-different returns `null` (the check must fail closed, not guess); neither returns `null`. In `packaged-layout.test.mjs`, make the derived-version read and the `1.9.9` mutation shape-aware: read the packaged core's version through the same precedence (a tiny local helper that prefers an indented `version:` under `metadata:`), and mutate whichever field is present so the incompatibility case keeps being exercised after the migration.

Run: `node --test .agents/skills/oat-explainer-kit/tests/check-core.test.mjs`
Expected: the metadata-only, quoted, and both-different cases fail (RED).

**Step 2: Implement (GREEN)**

Apply the same frontmatter-block parse as p01-t01 inside `check-core.mjs` (no shared import — the bundled skill must stay self-contained), returning `null` for conflict or absence.

Run: `node --test .agents/skills/oat-explainer-kit/tests/check-core.test.mjs` and `node --test tools/smoke/explainer-kit/packaged-layout.test.mjs`
Expected: pass (GREEN). Do NOT bump `oat-explainer-kit` in this task — Phase 2 takes the single PR-scoped bump for every skill.

**Step 3: Refactor**

Keep the two parsers textually identical (comment in each pointing at the other) so a later change can be applied to both.

**Step 4: Verify**

Run: `pnpm test:skills > /tmp/p01-t02-skills.log 2>&1; echo exit=$?`; `pnpm test:smoke > /tmp/p01-t02-smoke.log 2>&1; echo exit=$?`; `pnpm lint`; `pnpm format`
Expected: all exit 0.

**Step 5: Commit**

```bash
git add .agents/skills/oat-explainer-kit/scripts/check-core.mjs .agents/skills/oat-explainer-kit/tests/check-core.test.mjs tools/smoke/explainer-kit/packaged-layout.test.mjs
git commit -m "fix(p01-t02): read metadata.version in the explainer-kit core check"
```

---

### Task p01-t03: Make the skill test sweeps and mutation tests read through the resolver

**Files:**

- Modify: `packages/cli/src/validation/skills.test.ts` (the two corpus sweeps near `:1234` and `:1243`; the tuple-consuming loops that capture `/^version:\s*(.+)$/m` near the four tuple blocks and the path/version arrays), `packages/cli/src/commands/tools/tool-pack-lifecycle.integration.test.ts` (the `0.0.1` mutation near `:334`)

**Step 1: Write test (RED)**

Rewrite the two corpus sweeps to resolve each skill's version with `resolveSkillVersion(parseSkillFrontmatter(getFrontmatterBlock(content)))` (import from `commands/shared/frontmatter.ts`) and assert a semver `version` with a non-`conflict`, non-null result for every skill; keep them source-agnostic in this phase. Rewrite every tuple loop and `.toBe` site that captures `^version:` with a raw regex to compare the RESOLVED version instead (one small local helper in the test file). Rewrite the lifecycle mutation to rewrite whichever version field is present (`metadata.version` or top-level) to `0.0.1`, and add an assertion that the rewrite actually changed the content (so a silent no-op can never pass again).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/tools/tool-pack-lifecycle.integration.test.ts`
Expected: green on the current corpus (this task is a refactor toward shape-agnosticism), so prove the change with a runnable control against the real tree: back up one canonical skill (for example `.agents/skills/recon/SKILL.md`) to a `mktemp -d` directory, rewrite its frontmatter in place to the metadata-only shape (same version value under `metadata:`), run `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts -t "valid semver versions"` BEFORE the sweep rewrite (expected red: `recon: <missing>` in the `invalidVersions` assertion — record the line) and AFTER it (expected green), then restore the skill with `cp` from the backup and confirm `git status` is clean for that file. The same probe against the lifecycle mutation: with the metadata-only skill installed into a scratch pack, the old `replace(/^version:.*$/m, …)` leaves the content unchanged and the new field-agnostic rewrite changes it (assert on the changed content).

**Step 2: Implement (GREEN)**

Land the rewrites; keep every pinned literal unchanged in this task (the values still match).

Run: same command
Expected: pass (GREEN), test count unchanged or higher.

**Step 3: Refactor**

Delete the now-unused raw-regex helpers.

**Step 4: Verify**

Run: `HOME=$(mktemp -d) pnpm exec turbo run test --force --filter=@open-agent-toolkit/cli > /tmp/p01-t03-test.log 2>&1; echo exit=$?`; `pnpm type-check`
Expected: exit 0, `Cached: 0`.

**Step 5: Commit**

```bash
git add packages/cli/src/validation/skills.test.ts packages/cli/src/commands/tools/tool-pack-lifecycle.integration.test.ts
git commit -m "test(p01-t03): read skill versions through the resolver in the corpus sweeps"
```

---

## Phase 2: Migrate the 82 skills, repoint the pins, record the decision

### Task p02-t01: Move every bundled skill's version to metadata.version and bump it

**Files:**

- Modify: `.agents/skills/*/SKILL.md` (82 files), `packages/cli/src/validation/skills.test.ts` (19 tuples, ~28 `.toBe`, 4 `.toMatch`, the path/version arrays), `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts:1061,1398`, `packages/cli/src/commands/init/tools/shared/agent-instructions-bundle-contract.test.ts:23-25`, `tools/smoke/explainer-kit/wrapper-compatibility.test.mjs:434-435`, `.agents/skills/explainer-kit/tests/rebuildability.test.mjs:103`, `.agents/skills/recon/tests/skill-contract.test.mjs:26`, provider views under `.claude/`, `.codex/`, `.cursor/` etc. as `oat sync --scope project` rewrites them, `.oat/sync/manifest.json`

**Step 1: Write test (RED)**

Tighten the two corpus sweeps from p01-t03 to assert `source === 'metadata'` for every skill and to assert no top-level `version:` line exists at column 0 in any bundled `SKILL.md`. Also add a case that, for every pinned tuple in the file, the pinned version equals the skill's resolved version (so a stale pin is a test failure, not a silent drift).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts -t "metadata"`
Expected: red 82× (every skill still carries the alias).

**Step 2: Implement (GREEN)**

Transformation, applied by a scratch script and reviewed as a diff: for each `.agents/skills/*/SKILL.md`, parse the frontmatter block; take the top-level `version:` value (all 82 have exactly one, unquoted, at column 0); bump the patch component; delete the top-level line; if a column-0 `metadata:` key exists (`oat-repo-improve`, `triage-oat-issues`) append `  version: <new>` as the last entry of that map, otherwise append `metadata:\n  version: <new>` as the last frontmatter key before the closing `---`. Preserve every other line byte-for-byte. Then repoint every pin by grepping each OLD version literal (plain and regex-escaped, e.g. `2\.1\.0`) across `packages/cli/src`, `tools/smoke`, and `.agents/skills/*/tests` and replacing it with the new value only where it is paired with that skill (tuples, `.toBe`, `.toMatch`, `assert.match`, path/version arrays). Run `pnpm run --silent cli -- sync --scope project` and inspect the provider-view diff (rewrites only; a deletion is a STOP). Run `pnpm oat:validate-skills` and require zero `skill-version-alias` warnings and exit 0.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/init/tools/shared src/commands/tools`
Expected: green; `pnpm oat:validate-skills` prints no warnings; `pnpm run check:skill-bumps` reports 82 changed skills validated with zero findings.

**Step 3: Refactor**

Negative control (record the failure line): re-add `version: <old>` at column 0 to one skill in a `mktemp -d` backup-restored probe → the tightened sweep is red and `oat:validate-skills` prints exactly one alias warning; restore with `cp`.

**Step 4: Verify**

Run: `pnpm test:smoke > /tmp/p02-t01-smoke.log 2>&1; echo exit=$?`; `pnpm test:skills > /tmp/p02-t01-skills.log 2>&1; echo exit=$?`; `pnpm test:release > /tmp/p02-t01-release.log 2>&1; echo exit=$?`; `HOME=$(mktemp -d) pnpm exec turbo run test --force > /tmp/p02-t01-test.log 2>&1; echo exit=$?`; `pnpm lint`; `pnpm format`
Expected: all exit 0 with `Cached: 0`; the explainer RC builder reads the migrated explainer-family versions.

**Step 5: Commit**

```bash
git add .agents/skills packages/cli/src tools/smoke .oat/sync/manifest.json .claude .codex .cursor .github 2>/dev/null
git commit -m "chore(p02-t01): migrate every bundled skill to metadata.version"
```

(Stage exactly the provider-view paths `oat sync --scope project` rewrote; do not stage unrelated files.)

---

### Task p02-t02: Record the alias retirement decision, update the docs, and take the lockstep bump

**Files:**

- Create: `.oat/repo/reference/decisions/DR-2609xx-*.md` through the repository's decision workflow — root `AGENTS.md` names `oat-pjm-decision` when that skill is installed and `oat decision new` otherwise; `oat-pjm-decision` is not installed in this repository (`.agents/skills` has no such directory), so use `oat decision new` with the preflight below (title: "Bundled skills declare metadata.version only; the top-level alias retires on a fixed schedule"), a follow-up backlog item via `oat backlog new` for the warning-to-error promotion and the later removal of the top-level read
- Modify: `apps/oat-docs/docs/contributing/skills.md` (the "Every bundled skill still uses it today … tracked separately" paragraph and the gate paragraph's "until the migration lands" clause), `.oat/repo/reference/decisions/index.md` (regenerated), `.oat/repo/pjm/backlog/items/BL-260904-migrate-bundled-skills-from.md` → `.oat/repo/pjm/backlog/archived/` (archived with an outcome summary), `.oat/repo/pjm/backlog/completed.md` and `.oat/repo/pjm/backlog/index.md` (regenerated), `packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`, `packages/docs-theme/package.json`, `packages/docs-transforms/package.json`, `packages/cli/assets/public-package-versions.json`, `.oat/sync/manifest.json` (restamp)

**Step 1: Write test (RED)**

Not a code change; the executable checks are the gates in Step 4. Before writing the decision run `oat pjm doctor --json` and require `adoption.state` of `declared`; read `.oat/repo/reference/decisions/AGENTS.md` and `DR-260906-one-version-bump-per-changed`.

**Step 2: Implement (GREEN)**

Decision record (status `accepted`, pass `--created-at` in local time because `oat decision new` dates ids in UTC): context (spec places the version under `metadata`; wave-6 p04 made it canonical; this project migrated all 82 bundled skills; recon found no provider, sync, drift, manifest, or docs reader of a projected copy's top-level field; agent roles under `.agents/agents` are outside both gates and stay on the top-level field); decision (bundled skills declare `metadata.version` only from CLI 0.2.65; the `skill-version-alias` warning becomes an error in the first release after 0.2.65 that changes the validator, and the resolver's top-level read is removed one release after that error has produced no findings on the bundled tree; agent roles migrate when their own enforcement surface exists); consequences (the follow-up item owns both steps; third-party skills installed from packs keep resolving through the alias until the read is removed, with the error as advance notice). Then rewrite the docs paragraph to say every bundled skill declares `metadata.version` and the alias is retained for third-party skills on the recorded schedule, and drop the "until the migration lands" clause from the gate paragraph. Then the lockstep bump: fetch `origin/main`, bump the five public packages and `public-package-versions.json` to 0.2.65, rebuild, and run `pnpm run --silent cli -- sync --scope project` so the manifest restamp lands in the same commit. Then, once every acceptance criterion of the backlog item is satisfied on the tree (verify each against the item's `## Acceptance Criteria` and say so in the summary), close it out: `pnpm run --silent cli -- backlog archive BL-260904-migrate-bundled-skills-from --summary "<outcome: 82 skills migrated and bumped, readers fixed, decision id, follow-up item id, CLI 0.2.65>"` and `pnpm run --silent cli -- backlog regenerate-index`; the moved item, `completed.md`, and `index.md` ship in this task's commit.

Run: `pnpm run --silent cli -- decision regenerate-index`; `pnpm check`
Expected: index regenerated; markdownlint green.

**Step 3: Refactor**

None.

**Step 4: Verify**

Run the full standalone sequence with captured exit codes: `pnpm check`, `pnpm type-check`, `HOME=$(mktemp -d) pnpm exec turbo run test --force`, `pnpm build`, `pnpm run check:skill-bumps`, `git fetch origin && pnpm release:check-versions`, `pnpm release:validate`, `pnpm build:docs`, `pnpm test:smoke`, `pnpm test:skills`, `pnpm test:release`, `pnpm lint`, `pnpm format`, `pnpm oat:validate-skills`.
Expected: every gate exit 0; `release:check-versions` sees 0.2.65 strictly above `origin/main`; `oat:validate-skills` prints no warnings.

**Step 5: Commit**

```bash
git add .oat/repo/reference/decisions .oat/repo/pjm/backlog apps/oat-docs/docs/contributing/skills.md packages/*/package.json packages/cli/assets/public-package-versions.json .oat/sync/manifest.json
git commit -m "chore(p02-t02): record the alias retirement schedule, archive the item, bump lockstep to 0.2.65"
```

---

## Reviews

| Scope | Type     | Status      | Date       | Artifact                                                    | Reviewed Head | Invocation | Gate Target         |
| ----- | -------- | ----------- | ---------- | ----------------------------------------------------------- | ------------- | ---------- | ------------------- |
| p01   | code     | pending     | -          | -                                                           | -             | -          | -                   |
| p02   | code     | pending     | -          | -                                                           | -             | -          | -                   |
| final | code     | pending     | -          | -                                                           | -             | -          | -                   |
| plan  | artifact | fixes_added | 2026-09-08 | reviews/archived/artifact-plan-review-2026-09-08T080653Z.md | -             | gate       | codex-5-6-sol-xhigh |
| plan  | artifact | received    | 2026-09-08 | reviews/artifact-plan-review-2026-09-08T082541Z.md          | -             | -          | -                   |

> Reviews are recorded newest-last. For code-review events, `Reviewed Head` is the full 40-character SHA at the head of the reviewed range. `Invocation` records `manual`, `auto`, or `gate`; `Gate Target` is populated only for gate events. Writers must preserve every existing row and every unknown trailing cell.

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

- [ ] Phase 1: 3 tasks — metadata-aware readers (RC builder, explainer-kit core check, packaged-layout probe) and resolver-based test sweeps
- [ ] Phase 2: 2 tasks — 82 skills migrated and bumped with every pin repointed; decision record, docs, follow-up item, lockstep 0.2.65
- [ ] Backlog bookkeeping: `BL-260904-migrate-bundled-skills-from` archived with an outcome summary (owned by p02-t02, its last step)
- [ ] Full standalone Definition of Done green with captured exit codes

**Total: 5 tasks**

---

## References

- Discovery: `discovery.md`
- Backlog item: `.oat/repo/pjm/backlog/items/BL-260904-migrate-bundled-skills-from.md`
- Predecessor: wave-6 p04, `.oat/repo/reference/external-plans/2026-09-04-honor-metadata-version-for-skills.md` (execution record 2026-09-08)
- Decisions: `DR-260906-one-version-bump-per-changed`, `DR-260906-standing-claims-in-skills-name`
- Docs: `apps/oat-docs/docs/contributing/skills.md` ("How a skill's version is resolved")
