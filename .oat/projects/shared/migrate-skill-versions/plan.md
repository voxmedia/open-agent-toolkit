---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-09-08
oat_phase: plan
oat_phase_status: complete
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

- [ ] HiLL checkpoints: no explicit operator confirmation exists for this project; the choice is resolved by `oat-project-implement` at start from `workflow.hillCheckpointDefault` (`final`). The operator's standing preference about cross-runtime phase-boundary review gates is a different setting and is not cited as confirmation.
- [ ] `oat_plan_hill_phases` is absent from the frontmatter (unset pending implementation-start resolution, per the plan-writing contract); it is not stored as `[]`
- [x] Evaluated phases for parallelism opportunities (Phase 2 rewrites files Phase 1 edits; sequential)
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

`oat_plan_parallel_groups: []` — Phase 2's pin sweep touches the same test files Phase 1 makes shape-agnostic, and the skill bump for `oat-explainer-kit` covers both phases' edits, so the phases run sequentially on one branch.

---

## Verification mode

Standalone (not a wave lane): this project owns the lockstep bump. **Phase 1 phase-wide verification** (a passing, phase-relevant subset — the release-version gates cannot pass before p02-t02 because the release gate treats any `.agents/skills` change as a public-package change): `pnpm check`, `pnpm type-check`, `HOME=$(mktemp -d) pnpm exec turbo run test --force`, `pnpm build`, `pnpm run check:skill-bumps`, `pnpm test:smoke`, `pnpm test:skills`, `pnpm test:release`, `pnpm lint`, `pnpm format`, `pnpm oat:validate-skills` — all expected exit 0. Build prerequisite: `pnpm test:smoke` and `pnpm test:release` now load the built resolver, so run `pnpm build` before invoking them separately (CI's `pnpm test` chain builds first through `turbo run test`'s `^build` dependency). **Phase 2 phase-wide verification** (after p02-t02's bump): the complete root `AGENTS.md` Definition of Done, the eight CI gates in their exact order with captured exit codes — 1 `pnpm check`, 2 `pnpm type-check`, 3 `pnpm test`, 4 `pnpm build`, 5 `pnpm run check:skill-bumps`, 6 `git fetch origin && pnpm release:check-versions`, 7 `pnpm release:validate`, 8 `pnpm build:docs` — followed by the supplemental cache-replay evidence `AGENTS.md` asks for: `HOME=$(mktemp -d) pnpm exec turbo run test --force` (record `Cached: 0`) and the separately run `pnpm test:smoke`, `pnpm test:skills`, `pnpm test:release`, plus `pnpm lint`, `pnpm format`, `pnpm oat:validate-skills`. Per-task verification below is the focused subset.

## Recon facts the tasks rely on (2026-09-08, base `5b3b82151`)

- 82 skills under `.agents/skills`, each with exactly one unquoted column-0 `version:` declaration in its frontmatter (usually line 3; `oat-project-clear-active` and `oat-project-open` place it at line 4) and none with `metadata.version`; `oat-repo-improve` and `triage-oat-issues` already carry a `metadata:` map with other keys, so their version is merged into the existing map.
- Non-resolver readers: `tools/release/build-explainer-rc.mjs` (`parseSkillVersion`, `/^version:\s*(\S+)\s*$/m`, throws `E_SKILL_VERSION`) and `.agents/skills/oat-explainer-kit/scripts/check-core.mjs` (`readFrontmatterVersion`, returns `null` → `incompatible`). `packages/cli/assets/**` is a gitignored byte copy produced by `packages/cli/scripts/bundle-assets.sh`; fixes land in the canonical files.
- Reader architecture (resolves the backlog item's "no second implementation of the precedence rule" rule): the built CLI exports the canonical reader at `packages/cli/dist/commands/shared/frontmatter.js` (`getFrontmatterBlock`, `parseSkillFrontmatter`, `resolveSkillVersion`; `pnpm build` precedes every consumer in the Definition of Done and `turbo run test` depends on `^build`), and `tools/release/build-explainer-rc.mjs` already imports repository modules (`../../packages/cli/scripts/bundle-inputs.mjs`), so the RC builder consumes the canonical resolver rather than re-implementing it. The bundled skill script `check-core.mjs` is installed into user projects by pack install and cannot import from this repository or from `yaml`; it keeps a self-contained reader as an ACCEPTED EXCEPTION (recorded in the p02-t02 decision) bound by a parity contract test that runs the same fixture corpus through both readers.
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

In `tools/release/build-explainer-rc.test.mjs`, add cases for `parseSkillVersion` (export it or test through the builder's fixture path the file already uses): (a) a `SKILL.md` whose frontmatter carries only `metadata:\n  version: 1.2.3` resolves `1.2.3`; (b) both fields with the same value resolves that value; (c) a quoted value (`version: "1.2.3"` or `metadata.version: '1.2.3'`) resolves without quotes; (d) both fields with different values throws `E_SKILL_VERSION` naming both values (the builder must not guess); (e) neither field throws `E_SKILL_VERSION` as today; (f) a malformed frontmatter block (duplicate key, unterminated quote) throws `E_SKILL_VERSION` with the generic malformed-frontmatter message (category test: the error code and the word "malformed", not a parser diagnostic); (g) a clean-checkout control: with `packages/cli/dist` moved aside to a `mktemp -d` directory (restored afterwards), the builder reaches its own internal `pnpm build` before the first version read and completes — proving no module-top import of `dist` exists.

Run: `node --test tools/release/build-explainer-rc.test.mjs`
Expected: (a), (c), (d) fail (RED); (b) and (e) pass on the current regex.

**Step 2: Implement (GREEN)**

Replace the single regex with the canonical resolver, loaded LAZILY: the builder already runs `pnpm build` itself before it reads bundled skill versions (`build-explainer-rc.mjs` near `:83-84`), and the operator RC instructions (`.agents/skills/oat-explainer-kit/references/migration.md` near `:62-71`) invoke the builder on a clean checkout with no prior build, so a top-level `import` of `packages/cli/dist/...` is forbidden. Make `parseSkillVersion` async: `const { getFrontmatterBlock, parseSkillFrontmatter, resolveSkillVersion } = await import(pathToFileURL(join(repoRoot, 'packages/cli/dist/commands/shared/frontmatter.js')).href)` executed only after the builder's internal build has succeeded (cache the module after the first load), and await it in the skill loop. If the module still cannot be loaded after that build, throw `RcBuildError('E_SKILL_VERSION', ...)` naming the missing dist path — never fall back to a regex. Map the resolver's outcome: a resolved version returns it; `conflict` throws `E_SKILL_VERSION` naming both values; an unusable declaration throws `E_SKILL_VERSION` naming the skill and the condition (the canonical resolver exposes `unusableVersionDeclaration` as a flag only, so the offending scalar is not available without a second parse — amended at the Phase 1 review); a malformed block throws the generic `E_SKILL_VERSION` message "Bundled <name> has malformed frontmatter" (the canonical resolver exposes only a `malformed` flag, not a parser diagnostic — do not add a second YAML parse to manufacture one); no version throws `E_SKILL_VERSION` as today. No second implementation of the precedence rule exists in this file.

Run: `node --test tools/release/build-explainer-rc.test.mjs`
Expected: all cases pass (GREEN).

**Step 3: Refactor**

A doc comment stating that the release tool consumes the CLI's built resolver, loaded lazily after the builder's own `pnpm build`, so the documented clean-checkout RC command keeps working.

**Format (write/fix, before verification):** `pnpm exec oxfmt --write tools/release/build-explainer-rc.mjs tools/release/build-explainer-rc.test.mjs`; then `pnpm format` as the check.

**Step 4: Verify**

Run: `pnpm build > /tmp/p01-t01-build.log 2>&1; echo exit=$?` then `pnpm test:release > /tmp/p01-t01-release.log 2>&1; echo exit=$?`
Expected: both exit 0 on the unmigrated tree (every skill still carries the alias, so the resolver's alias branch is exercised). `pnpm release:validate` is NOT run in Phase 1 (see Verification mode).

**Step 5: Commit**

```bash
git add tools/release/build-explainer-rc.mjs tools/release/build-explainer-rc.test.mjs
git commit -m "fix(p01-t01): read metadata.version in the explainer RC builder"
```

---

### Task p01-t02: Read metadata.version in the explainer-kit core check and its packaged-layout probe

**Files:**

- Modify: `.agents/skills/oat-explainer-kit/scripts/check-core.mjs` (`readFrontmatterVersion`), `.agents/skills/oat-explainer-kit/tests/check-core.test.mjs`, `tools/smoke/explainer-kit/packaged-layout.test.mjs` (the derived read near `:65` and the incompatibility mutation near `:114`)
- Create: `tools/smoke/explainer-kit/check-core-version-parity.test.mjs` — the parity contract: imports `readFrontmatterVersion` from the canonical `check-core.mjs` AND the built resolver from `packages/cli/dist/commands/shared/frontmatter.js`, runs a shared fixture corpus through both (metadata-only; alias-only; both-same; both-different; quoted single/double; trailing `#` comment; a tagged scalar `!!str 1.2.3`; a duplicate key; a non-string scalar `1.10`; an unterminated quote; no frontmatter block; CRLF line endings), and asserts `readFrontmatterVersion(content) === (resolved.version when the resolver reports a clean resolved version, else null)` for every fixture

**Step 1: Write test (RED)**

In `check-core.test.mjs`, add cases for `readFrontmatterVersion`: metadata-only resolves; quoted resolves unquoted; both-same resolves; both-different returns `null` (the check must fail closed, not guess); neither returns `null`. Write the parity test above; it is RED for the metadata-only, quoted, tagged, duplicate-key, and non-string fixtures on the current regex. In `packaged-layout.test.mjs`, make the derived-version read and the `1.9.9` mutation shape-aware: read the packaged core's version through the same precedence (a tiny local helper that prefers an indented `version:` under `metadata:`), and mutate whichever field is present so the incompatibility case keeps being exercised after the migration.

Run: `node --test .agents/skills/oat-explainer-kit/tests/check-core.test.mjs`
Expected: the metadata-only, quoted, and both-different cases fail (RED).

**Step 2: Implement (GREEN)**

Implement a self-contained reader in `check-core.mjs` (ACCEPTED EXCEPTION: the installed skill script cannot import from this repository or from `yaml`; the exception and its parity contract are recorded in the p02-t02 decision): take the frontmatter block between the leading `---` lines; read the column-0 `version:` scalar and the `version:` scalar indented under a column-0 `metadata:` key (stop at the next column-0 key); strip matching quotes and a trailing `#` comment; return `null` for a duplicate key, a tagged/anchored/aliased scalar, a non-string-looking scalar, a conflict, or absence — the parity test defines exactly which inputs must be `null` by asking the canonical resolver.

Run: `node --test .agents/skills/oat-explainer-kit/tests/check-core.test.mjs tools/smoke/explainer-kit/check-core-version-parity.test.mjs tools/smoke/explainer-kit/packaged-layout.test.mjs`
Expected: pass (GREEN), every parity fixture agreeing. Do NOT bump `oat-explainer-kit` in this task — Phase 2 takes the single PR-scoped bump for every skill.

**Step 3: Refactor**

A doc comment in `check-core.mjs` naming the parity test as the contract that keeps it aligned with `packages/cli/src/commands/shared/frontmatter.ts`.

**Format (write/fix, before verification):** `pnpm exec oxfmt --write .agents/skills/oat-explainer-kit/scripts/check-core.mjs .agents/skills/oat-explainer-kit/tests/check-core.test.mjs tools/smoke/explainer-kit/packaged-layout.test.mjs tools/smoke/explainer-kit/check-core-version-parity.test.mjs`; then `pnpm format` as the check.

**Step 4: Verify**

Run: `pnpm test:skills > /tmp/p01-t02-skills.log 2>&1; echo exit=$?`; `pnpm test:smoke > /tmp/p01-t02-smoke.log 2>&1; echo exit=$?`; `pnpm lint`; `pnpm format`
Expected: all exit 0.

**Step 5: Commit**

```bash
git add .agents/skills/oat-explainer-kit/scripts/check-core.mjs .agents/skills/oat-explainer-kit/tests/check-core.test.mjs tools/smoke/explainer-kit/packaged-layout.test.mjs tools/smoke/explainer-kit/check-core-version-parity.test.mjs
git commit -m "fix(p01-t02): read metadata.version in the explainer-kit core check"
```

---

### Task p01-t03: Make every bundled-skill version reader in the test suites shape-agnostic

**Files:**

- Modify: `packages/cli/src/validation/skills.test.ts` (the two corpus sweeps near `:1234` and `:1243`; the tuple-consuming loops that capture `/^version:\s*(.+)$/m` near the four tuple blocks and the path/version arrays; the four `.toMatch(/^version:\s*x\.y\.z$/m)` sites near `:5873`, `:5876`, `:6833`, `:8160`; every individual `.toBe('x.y.z')` on a `^version:` capture), `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts:1061,1398` (skill readers; `:356` stays a top-level read because it asserts the `oat-reviewer` AGENT role, which is out of scope), `packages/cli/src/commands/init/tools/shared/agent-instructions-bundle-contract.test.ts:23-25`, `packages/cli/src/commands/tools/tool-pack-lifecycle.integration.test.ts` (the `0.0.1` mutation near `:334`), `tools/smoke/explainer-kit/wrapper-compatibility.test.mjs:434-435`, `.agents/skills/explainer-kit/tests/rebuildability.test.mjs:103`, `.agents/skills/recon/tests/skill-contract.test.mjs:26`

**Step 1: Write test (RED)**

Rewrite the two corpus sweeps to resolve each skill's version with `resolveSkillVersion(parseSkillFrontmatter(getFrontmatterBlock(content)))` (import from `commands/shared/frontmatter.ts`) and assert a semver `version` with a non-`conflict`, non-null result for every skill; keep them source-agnostic in this phase. Rewrite every reader in the Files list that captures or matches a line-start `version:` for a bundled SKILL — the `skills.test.ts` tuple loops, `.toBe` sites, and four `.toMatch` regexes, the two `review-skill-contracts.test.ts` skill sites, the `agent-instructions-bundle-contract.test.ts` site, and the three `node --test` files (`wrapper-compatibility`, `rebuildability`, `recon/skill-contract`, which cannot import the TypeScript resolver: give each a tiny local `readSkillVersion(content)` that returns the `version:` scalar indented under a column-0 `metadata:` key with the column-0 `version:` as fallback) — so each compares the RESOLVED version against its unchanged pinned literal. Rewrite the lifecycle mutation to rewrite whichever version field is present (`metadata.version` or top-level) to `0.0.1`, and add an assertion that the rewrite actually changed the content (so a silent no-op can never pass again). After this task p02-t01 changes only pinned VALUES; no reader changes remain.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/tools/tool-pack-lifecycle.integration.test.ts src/commands/init/tools/shared/review-skill-contracts.test.ts src/commands/init/tools/shared/agent-instructions-bundle-contract.test.ts` and `node --test tools/smoke/explainer-kit/wrapper-compatibility.test.mjs .agents/skills/explainer-kit/tests/rebuildability.test.mjs .agents/skills/recon/tests/skill-contract.test.mjs`
Expected: green on the current corpus (this task is a refactor toward shape-agnosticism), so prove the change with a runnable control against the real tree: back up one canonical skill (for example `.agents/skills/recon/SKILL.md`) to a `mktemp -d` directory, rewrite its frontmatter in place to the metadata-only shape (same version value under `metadata:`), run `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts -t "valid semver versions"` BEFORE the sweep rewrite (expected red: `recon: <missing>` in the `invalidVersions` assertion — record the line) and AFTER it (expected green); run `node --test .agents/skills/recon/tests/skill-contract.test.mjs` the same way (red on the old `assert.match(/^version:\s*1\.1\.0$/m)`, green on the shape-agnostic reader with the same literal); repeat the mutation on `.agents/skills/explainer-kit/SKILL.md` for `wrapper-compatibility.test.mjs` and `rebuildability.test.mjs`, and on `oat-project-complete` for `review-skill-contracts.test.ts:1398`; then restore every skill with `cp` from the backup and confirm `git status` is clean. The same probe against the lifecycle mutation: with the metadata-only skill installed into a scratch pack, the old `replace(/^version:.*$/m, …)` leaves the content unchanged and the new field-agnostic rewrite changes it (assert on the changed content).

**Step 2: Implement (GREEN)**

Land the rewrites; keep every pinned literal unchanged in this task (the values still match).

Run: the same two commands
Expected: pass (GREEN), test count unchanged or higher.

**Step 3: Refactor**

Delete the now-unused raw-regex helpers.

**Format (write/fix, before verification):** `pnpm exec oxfmt --write packages/cli/src/validation/skills.test.ts packages/cli/src/commands/tools/tool-pack-lifecycle.integration.test.ts packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts packages/cli/src/commands/init/tools/shared/agent-instructions-bundle-contract.test.ts tools/smoke/explainer-kit/wrapper-compatibility.test.mjs .agents/skills/explainer-kit/tests/rebuildability.test.mjs .agents/skills/recon/tests/skill-contract.test.mjs`; then `pnpm format` as the check.

**Step 4: Verify**

Run: `HOME=$(mktemp -d) pnpm exec turbo run test --force --filter=@open-agent-toolkit/cli > /tmp/p01-t03-test.log 2>&1; echo exit=$?`; `pnpm type-check`
Expected: exit 0, `Cached: 0`.

**Step 5: Commit**

```bash
git add packages/cli/src/validation/skills.test.ts packages/cli/src/commands/tools/tool-pack-lifecycle.integration.test.ts packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts packages/cli/src/commands/init/tools/shared/agent-instructions-bundle-contract.test.ts tools/smoke/explainer-kit/wrapper-compatibility.test.mjs .agents/skills/explainer-kit/tests/rebuildability.test.mjs .agents/skills/recon/tests/skill-contract.test.mjs
git commit -m "test(p01-t03): make every bundled-skill version reader shape-agnostic"
```

---

## Phase 2: Migrate the 82 skills, repoint the pins, record the decision

### Task p02-t01: Move every bundled skill's version to metadata.version and bump it

**Files:**

- Modify: `.agents/skills/*/SKILL.md` (82 files), `packages/cli/src/validation/skills.test.ts` (19 tuples, ~28 `.toBe`, 4 `.toMatch`, the path/version arrays, the 245 → 246 budget), `tools/smoke/skill-version/reader-sameness.test.mjs` (new; the Phase 1 round-2 m3 sameness assertion over the three `node --test` readers), `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts:1061,1398`, `packages/cli/src/commands/init/tools/shared/agent-instructions-bundle-contract.test.ts:23-25`, `tools/smoke/explainer-kit/wrapper-compatibility.test.mjs:434-435`, `.agents/skills/explainer-kit/tests/rebuildability.test.mjs:103`, `.agents/skills/recon/tests/skill-contract.test.mjs:26`, (provider views and `.oat/sync/manifest.json` are NOT this task's artifacts in this repository — `.claude/skills/*` are symlinks and the Codex/Cursor projections carry only agent roles; the manifest restamp belongs to p02-t02 — corrected at the final review)

**Step 1: Write test (RED)**

Tighten the two corpus sweeps from p01-t03 to assert `source === 'metadata'` for every skill and to assert no top-level `version:` line exists at column 0 in any bundled `SKILL.md`. Also add a case that, for every pinned tuple in the file, the pinned version equals the skill's resolved version (so a stale pin is a test failure, not a silent drift).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts -t "metadata"`
Expected: red 82× (every skill still carries the alias).

**Step 2: Implement (GREEN)**

Transformation, applied by a scratch script and reviewed as a diff: for each `.agents/skills/*/SKILL.md`, parse the frontmatter block; take the top-level `version:` value (all 82 have exactly one, unquoted, at column 0); bump the patch component; delete the top-level line; if a column-0 `metadata:` key exists (`oat-repo-improve`, `triage-oat-issues`) append `  version: <new>` as the last entry of that map, otherwise append `metadata:\n  version: <new>` as the last frontmatter key before the closing `---`. Preserve every other line byte-for-byte. Then repoint every pin by grepping each OLD version literal (plain and regex-escaped, e.g. `2\.1\.0`) across `packages/cli/src`, `tools/smoke`, and `.agents/skills/*/tests` and replacing it with the new value only where it is paired with that skill (tuples, `.toBe`, `.toMatch`, `assert.match`, path/version arrays) — values only; every reader is already shape-agnostic after p01-t03, so a reader change in this task is a deviation to report. One named non-value edit is part of this task: `packages/cli/src/validation/skills.test.ts` asserts a 245-line budget for `oat-project-implement/SKILL.md` (`entry.split('\n').length` is exactly 245 today, `toBeLessThanOrEqual(245)` near `:2515`) and the migration adds one frontmatter line, so raise that budget to 246 with a comment naming this migration (the Phase 1 review confirmed it is the only line-count budget in the suites). Use the Phase 1 test-support module `packages/cli/src/__tests__/skills/skill-version.ts` for any resolver-backed read or shape-aware rewrite; do not add another reader. Run `pnpm run --silent cli -- sync --scope project` and inspect the provider-view diff (a deletion is a STOP; in this repository `.claude/skills/*` are symlinks to the canonical tree and `.codex`/`.cursor` project only agent roles, so "No changes to apply" is the expected outcome and the manifest restamp lands with p02-t02's CLI bump — corrected at the Phase 2 review). Run `pnpm oat:validate-skills` and require zero alias warnings (the validator prints the message `deprecated top-level alias`, not the rule id) and exit 0.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts src/commands/init/tools/shared src/commands/tools`
Expected: green; `pnpm oat:validate-skills` prints no warnings; `pnpm run check:skill-bumps` reports 82 changed skills validated with zero findings AFTER the commit (it diffs `origin/main...HEAD`, committed state only — corrected at the Phase 2 review).

**Step 3: Refactor**

Negative controls, each on one skill with a `mktemp -d` backup restored by `cp` afterwards (record every failure line and category): (1) same-value dual declaration — re-add `version: <new>` at column 0 beside `metadata.version: <new>` → the tightened sweep's "no column-0 `version:`" assertion is red; the resolver reports `source: 'metadata'` with no conflict, so `oat:validate-skills` prints NO alias warning and NO error (the sweep, not the validator, is the guard for this shape); (2) alias-only — remove the `metadata.version` line and re-add `version: <old>` at column 0 → the sweep's `source === 'metadata'` assertion is red for that skill and `oat:validate-skills` prints exactly one `skill-version-alias` warning; (3) different-value dual declaration — re-add `version: <old>` beside `metadata.version: <new>` → `oat:validate-skills` reports one `skill-version-conflict` error (exit 1) and the sweep is red on the conflict.

**Format (write/fix, before verification):** `pnpm exec oxfmt --write .agents/skills/*/SKILL.md packages/cli/src/validation/skills.test.ts packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts packages/cli/src/commands/init/tools/shared/agent-instructions-bundle-contract.test.ts tools/smoke/explainer-kit/wrapper-compatibility.test.mjs .agents/skills/explainer-kit/tests/rebuildability.test.mjs .agents/skills/recon/tests/skill-contract.test.mjs && pnpm format:fix (the provider projections `oat sync`rewrote are generated from the formatted canonical files;`pnpm format:fix` is the documented broad path for that generated scope)`; then `pnpm format` as the check.

**Step 4: Verify**

Run: `pnpm test:smoke > /tmp/p02-t01-smoke.log 2>&1; echo exit=$?`; `pnpm test:skills > /tmp/p02-t01-skills.log 2>&1; echo exit=$?`; `pnpm test:release > /tmp/p02-t01-release.log 2>&1; echo exit=$?`; `HOME=$(mktemp -d) pnpm exec turbo run test --force > /tmp/p02-t01-test.log 2>&1; echo exit=$?`; `pnpm lint`; `pnpm format`
Expected: all exit 0 with `Cached: 0`; the explainer RC builder reads the migrated explainer-family versions.

**Step 5: Commit**

```bash
# Build the exact manifest first: the 82 SKILL.md paths from the transformation, the pin files named in this task's Files list, and the paths `oat sync --scope project` reported as rewritten (from its output); verify the manifest contains no deletion and no path outside those sets, then stage it literally, e.g.
git add $(cat /tmp/p02-t01-manifest.txt)
git commit -m "chore(p02-t01): migrate every bundled skill to metadata.version"
```

(No whole-tree `git add`; no error suppression — a missing expected projection must stay visible. `git status --short` after the commit must be empty.)

---

### Task p02-t02: Record the alias retirement decision, update the docs, and take the lockstep bump

**Files:**

- Create: `.oat/repo/reference/decisions/DR-2609xx-*.md` through the installed `oat-pjm-decision` skill (`.agents/skills/oat-pjm-decision/SKILL.md`, Steps 0–5: adoption check, inputs, scaffold check, `oat decision new`, body, index regeneration — the inputs are all supplied in this task, so no interactive prompt is needed; the attempt-1 receive wrongly said the skill was absent) (title: "Bundled skills declare metadata.version only; the top-level alias retires on a fixed schedule"), a follow-up backlog item via `oat backlog new` for the warning-to-error promotion and the later removal of the top-level read
- Modify: `AGENTS.md` (one sentence in the supplemental-evidence paragraph), `apps/oat-docs/docs/contributing/skills.md` (the "Every bundled skill still uses it today … tracked separately" paragraph and the gate paragraph's "until the migration lands" clause), `.oat/repo/reference/decisions/index.md` (regenerated), `.oat/repo/pjm/backlog/items/BL-260904-migrate-bundled-skills-from.md` → `.oat/repo/pjm/backlog/archived/` (archived with an outcome summary), `.oat/repo/pjm/backlog/completed.md` and `.oat/repo/pjm/backlog/index.md` (regenerated), `packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`, `packages/docs-theme/package.json`, `packages/docs-transforms/package.json`, `packages/cli/assets/public-package-versions.json`, `.oat/sync/manifest.json` (restamp)

**Step 1: Write test (RED)**

Not a code change; the executable checks are the gates in Step 4. Before writing the decision run `oat pjm doctor --json` and require `adoption.state` of `declared`; read `.oat/repo/reference/decisions/AGENTS.md` and `DR-260906-one-version-bump-per-changed`.

**Step 2: Implement (GREEN)**

Decision record through `oat-pjm-decision` (status `accepted`, pass `--created-at` in local time because `oat decision new` dates ids in UTC): context (spec places the version under `metadata`; wave-6 p04 made it canonical; this project migrated all 82 bundled skills; recon found no provider, sync, drift, manifest, or docs reader of a projected copy's top-level field; agent roles under `.agents/agents` are outside both gates and stay on the top-level field; the release RC builder now consumes the CLI's built resolver); decision (bundled skills declare `metadata.version` only from CLI 0.2.65; the `skill-version-alias` warning becomes an error in the first release after 0.2.65 that changes the validator, and the resolver's top-level read is removed one release after that error has produced no findings on the bundled tree; agent roles migrate when their own enforcement surface exists; ACCEPTED EXCEPTION: the bundled `oat-explainer-kit/scripts/check-core.mjs` keeps a self-contained version reader because an installed skill script cannot import the repository's resolver, bound by the parity contract `tools/smoke/explainer-kit/check-core-version-parity.test.mjs`); consequences (the follow-up item owns both retirement steps; third-party skills installed from packs keep resolving through the alias until the read is removed, with the error as advance notice; any change to the resolver's precedence must update the parity fixtures). Then rewrite the docs paragraph to say every bundled skill declares `metadata.version` and the alias is retained for third-party skills on the recorded schedule, and drop the "until the migration lands" clause from the gate paragraph; add one sentence to root `AGENTS.md`'s supplemental-evidence paragraph (the one that says to run `pnpm test:smoke`, `pnpm test:skills`, `pnpm test:release` separately) noting that the smoke and release suites load the built CLI resolver and need `pnpm build` first (add `AGENTS.md` to this task's file boundary and commit). Then the lockstep bump: fetch `origin/main`, bump the five public packages and `public-package-versions.json` to 0.2.65, rebuild, and run `pnpm run --silent cli -- sync --scope project` so the manifest restamp lands in the same commit. Then, once every acceptance criterion of the backlog item is satisfied on the tree (verify each against the item's `## Acceptance Criteria` and say so in the summary), close it out: `pnpm run --silent cli -- backlog archive BL-260904-migrate-bundled-skills-from --summary "<outcome: 82 skills migrated and bumped, readers fixed, decision id, follow-up item id, CLI 0.2.65>"` and `pnpm run --silent cli -- backlog regenerate-index`; the moved item, `completed.md`, and `index.md` ship in this task's commit.

Run: `pnpm run --silent cli -- decision regenerate-index`; `pnpm check`
Expected: index regenerated; markdownlint green.

**Step 3: Refactor**

None.

**Format (write/fix, before verification):** `pnpm exec oxfmt --write apps/oat-docs/docs/contributing/skills.md .oat/repo/reference/decisions/DR-*.md .oat/repo/reference/decisions/index.md .oat/repo/pjm/backlog/items/*.md .oat/repo/pjm/backlog/archived/BL-260904-migrate-bundled-skills-from.md .oat/repo/pjm/backlog/completed.md .oat/repo/pjm/backlog/index.md`; then `pnpm format` as the check.

**Step 4: Verify**

Run the eight root `AGENTS.md` gates in their exact order with captured exit codes — `pnpm check`, `pnpm type-check`, `pnpm test`, `pnpm build`, `pnpm run check:skill-bumps`, `git fetch origin && pnpm release:check-versions`, `pnpm release:validate`, `pnpm build:docs` — then the supplemental evidence: `HOME=$(mktemp -d) pnpm exec turbo run test --force` (`Cached: 0`), `pnpm test:smoke`, `pnpm test:skills`, `pnpm test:release`, `pnpm lint`, `pnpm format`, `pnpm oat:validate-skills`.
Expected: every gate exit 0; `release:check-versions` sees 0.2.65 strictly above `origin/main`; `oat:validate-skills` prints no warnings.

**Step 5: Commit**

```bash
git add AGENTS.md .oat/repo/reference/decisions/DR-<generated-id>.md .oat/repo/reference/decisions/index.md .oat/repo/pjm/backlog/items/BL-<follow-up-id>.md .oat/repo/pjm/backlog/archived/BL-260904-migrate-bundled-skills-from.md .oat/repo/pjm/backlog/completed.md .oat/repo/pjm/backlog/index.md apps/oat-docs/docs/contributing/skills.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets/public-package-versions.json .oat/sync/manifest.json
git commit -m "chore(p02-t02): record the alias retirement schedule, archive the item, bump lockstep to 0.2.65"
```

---

## Reviews

| Scope | Type     | Status      | Date       | Artifact                                                    | Reviewed Head                            | Invocation | Gate Target         |
| ----- | -------- | ----------- | ---------- | ----------------------------------------------------------- | ---------------------------------------- | ---------- | ------------------- |
| p01   | code     | fixes_added | 2026-09-08 | reviews/archived/p01-review-2026-09-08T101506Z.md           | 6c461e3fe4577b6bf78b4ace79e5bab1b5dfa510 | manual     | -                   |
| p02   | code     | passed      | 2026-09-08 | reviews/archived/p02-review-2026-09-08T115234Z.md           | 872ce02c6eddb961e3241fbceb22b445b558baa4 | manual     | -                   |
| final | code     | passed      | 2026-09-08 | reviews/archived/final-review-2026-09-08T121229Z.md         | 48d9bfdc52d562776a05867ba899bdc8bcbe5285 | manual     | -                   |
| plan  | artifact | fixes_added | 2026-09-08 | reviews/archived/artifact-plan-review-2026-09-08T080653Z.md | -                                        | gate       | codex-5-6-sol-xhigh |
| plan  | artifact | fixes_added | 2026-09-08 | reviews/archived/artifact-plan-review-2026-09-08T082541Z.md | -                                        | gate       | codex-5-6-sol-xhigh |
| plan  | artifact | fixes_added | 2026-09-08 | reviews/archived/artifact-plan-review-2026-09-08T084454Z.md | -                                        | gate       | codex-5-6-sol-xhigh |
| plan  | artifact | fixes_added | 2026-09-08 | reviews/archived/artifact-plan-review-2026-09-08T090611Z.md | -                                        | gate       | codex-5-6-sol-xhigh |
| p01   | code     | passed      | 2026-09-08 | reviews/archived/p01-review-2026-09-08T104940Z.md           | ad1c330821d69e87c7e6dce2bfab1debe7b3611d | manual     | -                   |
| final | code     | received    | 2026-09-08 | reviews/final-review-2026-09-08T123009Z.md                  | 843ec7f17ae380c8a92f4919c0d33a0ba13cb10a | gate       | codex-5-6-sol-xhigh |

> Reviews are recorded newest-last. For code-review events, `Reviewed Head` is the full 40-character SHA at the head of the reviewed range. `Invocation` records `manual`, `auto`, or `gate`; `Gate Target` is populated only for gate events. Writers must preserve every existing row and every unknown trailing cell.

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

- [x] Phase 1: 3 tasks — metadata-aware readers (RC builder, explainer-kit core check, packaged-layout probe) and resolver-based test sweeps (review rounds 1–2)
- [x] Phase 2: 2 tasks — 82 skills migrated and bumped with every pin repointed; decision record, docs, follow-up item, lockstep 0.2.65 (review round 1 PASS)
- [x] Backlog bookkeeping: `BL-260904-migrate-bundled-skills-from` archived with an outcome summary (p02-t02)
- [x] Full standalone Definition of Done green with captured exit codes (p02-t02 and the Phase 2 review, forced run `Cached: 0`)

**Total: 5 tasks**

---

## References

- Discovery: `discovery.md`
- Backlog item: `.oat/repo/pjm/backlog/items/BL-260904-migrate-bundled-skills-from.md`
- Predecessor: wave-6 p04, `.oat/repo/reference/external-plans/2026-09-04-honor-metadata-version-for-skills.md` (execution record 2026-09-08)
- Decisions: `DR-260906-one-version-bump-per-changed`, `DR-260906-standing-claims-in-skills-name`
- Docs: `apps/oat-docs/docs/contributing/skills.md` ("How a skill's version is resolved")
