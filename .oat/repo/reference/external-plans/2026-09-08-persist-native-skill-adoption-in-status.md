---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/items/BL-260906-persist-status-native-skill.md
oat_external_plan_commit: a594614024725979ebf24bd9a34b3565c30fbffb
oat_external_plan_main_commit: 7d70ac307717b95917b8f92aa3fb9f236d1f75ba
oat_external_plan_date: '2026-09-08'
oat_execution_status: READY
oat_backlog_items:
  - BL-260906-persist-status-native-skill
oat_issue_url: null
created: '2026-09-08T21:20:00Z'
---

# Make `oat status` persist and pin its native-skill adoption outcome

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency, and no wave-7
> sibling plan writes `commands/status/` or `commands/shared/`. Read the
> "Correction to the source item" section before doing anything else: the
> item's stated failure mode is not the one in the code, and this plan is
> written against what the code actually does. It is a consistency fix plus
> pins, not a data-loss fix; size XS–S.

## Outcome

`oat status`'s interactive native-skill adoption path stops discarding the
manifest value it just computed. Both `adopt` call sites set `manifestChanged`,
so the manifest save at `status/index.ts:1539-1542` runs for a scope whose only
migration was a native adoption — matching `oat init`, which saves
unconditionally after its migration loops (`init/index.ts:1271`), and
`oat sync`, which saves even after a successful no-operation apply
(`engine/execute-plan.ts:970-976`) — and the pre-save restamp advisory fires
exactly once, before the save, on that path too. A disk-backed test drives the
real `applyNativeSkillDisposition` and the real `saveManifest` against a
temporary project root, re-reads `.oat/sync/manifest.json` from disk, and pins
what the file actually contains after the adoption, including the fact that a
`nativeRead` skill mapping is deliberately manifest-neutral. The existing
abort-path guarantees (no advisory, no save) stay pinned and unchanged.

## Correction to the source item

Two of the item's three acceptance criteria are unachievable as written,
because their shared premise is false. Verified at
`a594614024725979ebf24bd9a34b3565c30fbffb`:

- The item says the adopt loop "mutates the in-memory manifest" and that the
  "adopted entry" is dropped. It is not. `applyNativeSkillDisposition`
  (`commands/shared/native-skill-disposition.ts:88-90`) forwards an `adopt` to
  `adoptStrayToCanonical`, which at `commands/shared/adopt-stray.ts:140-142`
  returns the **same manifest object, unmodified**, whenever
  `stray.mapping.nativeRead` is true. And every candidate in that loop has
  `nativeRead: true` by construction: `isNativeSkillCandidate` →
  `getNativeSkillProviderDetails` rejects any mapping where
  `contentType !== 'skill' || !mapping.nativeRead`
  (`native-skill-disposition.ts:36-59`). So the native adopt path adds **no**
  manifest entry, and nothing is being dropped.
- **Executable proof.** Against the built CLI
  (`packages/cli/dist/index.js`, `0.2.66`) in a `mktemp -d` scratch tree
  containing `.cursor/skills/adopt-me/SKILL.md`, an ESM probe importing
  `adoptStrayToCanonical` from `packages/cli/dist/commands/shared/adopt-stray.js`
  and `CURSOR_PROJECT_MAPPINGS` from `packages/cli/dist/providers/cursor/paths.js`,
  calling
  `adoptStrayToCanonical(root, {provider:'cursor', report:{providerPath:'.cursor/skills/adopt-me'}, mapping}, manifest, {})`
  with the real Cursor project skill mapping
  (`{contentType:'skill', canonicalDir:'.agents/skills', providerDir:'.agents/skills', nativeRead:true, adoptionSourceDirs:['.cursor/skills']}`)
  printed `entries after adopt: [] same object as input: true`, while the
  tree showed `.agents/skills/adopt-me/SKILL.md` present and
  `.cursor/skills/adopt-me` gone.
- **The invariant is already pinned**, contrary to the draft of this plan:
  `packages/cli/src/commands/shared/adopt-stray.test.ts:148-186` ("moves a
  native-read Cursor skill without recreating a provider view or manifest
  row") and `:188-225` ("removes an identical native-read Cursor duplicate")
  both call `adoptStrayToCanonical` with the real Cursor mapping and assert
  `manifest.entries` has length 0 afterwards. What they do not assert is that a
  **non-empty** input manifest comes back unchanged and as the same object; Step
  1 strengthens the first case to say exactly that, rather than adding a new
  one.
- Therefore AC1's "the adopted entry persists (re-read from disk in the test)"
  has no entry to persist, and AC2's "a control shows the pre-fix tree dropping
  the entry and reporting the skill as a stray on the next `oat status`" cannot
  be produced: after adoption the skill lives at `.agents/skills/<name>`, which
  is canonical, and stray detection skips a provider entry whose name matches a
  canonical entry (`apps/oat-docs/docs/provider-sync/manifest-and-drift.md:100`).
- What is real is narrower and still worth fixing: the code visibly assigns
  `scopeCollection.manifest = await dependencies.applyNativeSkillDisposition(...)`
  at `:1352-1359` and `:1404-1412` and then throws that value away unless an
  _ordinary_ stray also happened to set the flag. Today that is harmless; it is
  harmless only because of the `nativeRead` early return. It is a latent
  defect and an honesty defect, not a live data-loss bug. It is also the one
  place in the CLI where a completed migration does **not** persist and
  restamp the manifest: `oat init` saves unconditionally (`init/index.ts:1271`)
  and `oat sync` saves even when the plan applied nothing
  (`execute-plan.ts:970-976`). Setting the flag makes status follow the same
  rule.

This plan therefore keeps the item's fix (set the flag) and its third criterion
(pin the restamp behavior) verbatim, replaces AC1 and AC2 with criteria that are
achievable and stronger, and strengthens the existing executable pin on the
`nativeRead` neutrality invariant so that a future change to `adopt-stray.ts`
cannot silently reintroduce the loss the item feared. The source item carries a
planning note recording this correction.

## Source and live evidence

- Source backlog item:
  [BL-260906-persist-status-native-skill — Persist status native-skill adoption by setting manifestChanged](../../pjm/backlog/items/BL-260906-persist-status-native-skill.md)
- Inspected `HEAD`: `a594614024725979ebf24bd9a34b3565c30fbffb` — the tree whose
  content this plan read (branch `wave-7-plans`, rebased onto `origin/main`).
- Comparison baseline: `7d70ac307717b95917b8f92aa3fb9f236d1f75ba` — the fetched
  `origin/main` tip (PR #273 merged), which is also the merge-base with `HEAD`.
  Between `c9f2e147a` (the draft's baseline) and this `HEAD`, no file this plan
  reads or writes changed.
- Planning date: `2026-09-08`
- Working tree while planning: `git status --porcelain` was empty apart from
  the wave-7 plan files under `.oat/repo/reference/external-plans/` and their
  source backlog items.
- Verified evidence:
  - `packages/cli/src/commands/status/index.ts:1315` — `let manifestChanged = false;`
    is declared once per `scopeCollection`.
  - `:1325-1415` — the native-skill loop. Its two success paths increment
    `adoptedCount` at `:1361` (ordinary disposition) and `:1413` (after a
    confirmed `replaceCanonical` retry) and **neither** sets `manifestChanged`.
    (The item cites `:1325-1414`; the loop's closing brace is `:1415`.)
  - `:1452` and `:1489` — the only two `manifestChanged = true` assignments,
    both inside the ordinary-stray loop.
  - `:1527` — `if (manifestChanged) {`; `:1531-1538` — the restamp advisory,
    emitted only when `scopeCollection.versionRestamp` is set and the run is not
    `--json`; `:1539-1542` — the single status-owned `saveManifest` call. (The
    item cites `:1527-1534`; the gate opens at `:1527` and the save is
    `:1539-1542`.)
  - `packages/cli/src/commands/init/index.ts:1266-1271` — `oat init` emits the
    same advisory and then runs
    `await dependencies.saveManifest(manifestPath, manifest);` unconditionally
    after its loops. `packages/cli/src/engine/execute-plan.ts:970-976` —
    `oat sync` saves when entries applied **or** when the plan was a
    successful no-operation. That is the convention the fixed status path
    joins.
  - `packages/cli/src/commands/shared/native-skill-disposition.ts:88-94` — an
    `adopt` delegates to `adoptStrayToCanonical`; a `keep` writes the sync
    config through `appendKnownStray` and returns the manifest untouched. So the
    `keep` disposition must **not** set the flag.
  - `packages/cli/src/commands/shared/adopt-stray.ts:140-142` — the
    `nativeRead` early return, reproduced above.
  - `packages/cli/src/commands/shared/adopt-stray.test.ts:148-186,188-225` —
    the two existing native-read cases, each asserting
    `expect(manifest.entries).toHaveLength(0)` on an empty input manifest.
  - `packages/cli/src/manifest/manager.ts:69-81` —
    `detectManifestVersionRestamp` compares `manifest.oatVersion` to
    `OAT_VERSION` by plain string inequality; `:90-95` —
    `formatManifestVersionRestampWarning` renders the advisory. `saveManifest`
    unconditionally restamps `oatVersion`, which is why the advisory must be
    emitted before the save.
  - `packages/cli/src/commands/status/index.test.ts:794-939` — the existing
    `manifest version restamp advisory` block. Its five cases pin: the advisory
    fires before the ordinary-stray save (`:811`); it is silent when the
    producing version matches (`:833`); it is silent and no save happens when
    the checklist is aborted (`:850`); it is silent and no save happens when the
    **native** disposition prompt is aborted (`:869`); and JSON mode neither
    mutates nor claims restamp evidence (`:920`).
  - `:982` ("prompts for each Cursor skill with only adopt and keep choices"),
    `:1047` (the Copilot `it.each` "offers explicit Copilot adoption or
    keep-local in $scope status"), `:1097` ("stops current and remaining status
    migration processing on abort"), `:1132` (scope-`all` sync config paths),
    `:1159` (keep-local name collisions), and `:1187` (unavailable adoption
    source) all drive the native loop with `keep`, an abort, or an error path.
    Read each before adding cases: if one of them already asserts on
    `saveManifest` after a successful native `adopt`, Step 2's "red before"
    claim must be re-checked. At this `HEAD` none asserts a save on that path,
    which is why the defect survived.
  - `packages/cli/src/commands/status/index.test.ts:64-81` — the
    `createHarness` options interface (`cwd`, `home`, `useDiskCodexExtension`,
    `useDiskBundledCodexAgents`, `singleSelectResponses`, `manifestOatVersion`);
    `:398-414` — how the two existing `useDisk…` options swap a `vi.fn` stub for
    the production implementation; `:494-496` — `loadManifest` is a stub
    returning `createManifest(manifestEntries, options.manifestOatVersion)`;
    `:499` — `saveManifest` is the injected `vi.fn`. `:1566-1667` is the file's
    one real-disk case (temp `home` and `project` roots) — the structural
    pattern for the new disk-backed option.
  - Only Cursor and Copilot reach the native loop:
    `providers/cursor/paths.ts:9-15` and `providers/copilot/paths.ts:9-15,33-40`
    are the only `contentType: 'skill'` mappings with both `nativeRead: true`
    and `adoptionSourceDirs` (confirmed by grepping `adoptionSourceDirs` across
    `providers/*/paths.ts`). Codex and Gemini skill mappings declare no
    `adoptionSourceDirs`, so `getNativeSkillProviderDetails` returns `null` for
    them and they never enter this loop.

## Dependencies

| Type             | Dependency                                                                                                 | Required state                                                                | Current state                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Satisfied        | PR #273 (remote project management)                                                                        | Merged before this lane starts.                                               | Merged 2026-09-08 (`7d70ac307`); touches no file this plan reads or writes.                      |
| Soft integration | Draft PR #190 (ReviewPlan Stage A), PR #125 (brainstorm companion)                                         | Re-run the focused status suite if either merges before this lane integrates. | Open; neither touches `commands/status/` or `commands/shared/`.                                  |
| Soft adjacency   | Any wave-7 lane that also edits `packages/cli/src/commands/status/` or `packages/cli/src/commands/shared/` | Never run in the same group as this lane.                                     | None: no other `2026-09-08-*.md` plan lists either directory in its In scope (swept 2026-09-08). |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                      | Affected | Files in common                                                                                                                                                    | Required update                                  |
| ------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| PR #273 (remote project management) merged | None     | None — **merged; verified** at `7d70ac307`: its diff touches nothing under `commands/status/`, `commands/shared/`, `commands/init/`, `manifest/`, or `providers/`. | Done. Every anchor above was re-read post-merge. |
| Draft PR #190 (ReviewPlan Stage A) merges  | None     | None                                                                                                                                                               | Re-run the drift check; no plan change expected. |
| PR #125 (brainstorm companion) merges      | None     | None                                                                                                                                                               | No action.                                       |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat a594614024725979ebf24bd9a34b3565c30fbffb..HEAD -- packages/cli/src/commands/status/index.ts packages/cli/src/commands/status/index.test.ts packages/cli/src/commands/shared/native-skill-disposition.ts packages/cli/src/commands/shared/adopt-stray.ts packages/cli/src/commands/shared/adopt-stray.test.ts packages/cli/src/commands/init/index.ts packages/cli/src/engine/execute-plan.ts packages/cli/src/manifest/manager.ts packages/cli/src/manifest/index.ts packages/cli/src/providers/cursor/paths.ts packages/cli/src/providers/copilot/paths.ts
```

Expected on an unchanged base: no output. If `status/index.ts` changed, re-locate
`let manifestChanged = false;`, the native loop, the two ordinary-stray
assignments, and the `if (manifestChanged)` gate by symbol rather than by line
number before editing. If `adopt-stray.ts:140-142` changed, **re-run the
executable proof in "Correction to the source item"** — a change there can turn
the item's original premise true, and the plan must be revalidated.

## Repository conventions

- Build: `pnpm build` → `Tasks: … successful`. Required before `pnpm test:smoke`
  or `pnpm test:release`, and before Step 0's `dist/` probe.
- Typecheck: `pnpm type-check` → exit 0.
- Focused test: from `packages/cli`,
  `pnpm exec vitest run src/commands/status/index.test.ts src/commands/shared/adopt-stray.test.ts`
  → all pass.
- Lint/format check (non-mutating): `pnpm check`; also `pnpm lint` and
  `pnpm format` (neither `tools/smoke` nor `.agents/skills` is touched here, but
  CI runs neither, so run both anyway).
- Implementation pattern: the ordinary-stray assignments at
  `status/index.ts:1452` and `:1489` are the shape to mirror; `oat init`'s
  unconditional save at `init/index.ts:1271` is the reference for what a
  post-migration write is expected to do; the `useDisk…` option pattern is
  `status/index.test.ts:398-414` and the real-disk case is `:1566-1667`.
- Import policy (`packages/cli/AGENTS.md:26`): `./…` for same-directory modules
  and a configured TypeScript alias for anything else (`@manifest/…`,
  `@commands/shared/…` — `packages/cli/tsconfig.json:9-15`). No `../…`, no
  `src/…`, no `@/*`. `packages/cli/AGENTS.md:32-35` also requires fake-cwd unit
  harnesses (`cwd: '/tmp/workspace'`) to mock every dependency that writes the
  filesystem — the new disk-backed case deliberately does the opposite and must
  therefore use a real `mkdtemp` root, never `/tmp/workspace`.
- Skill versioning: no `.agents/skills/**` file is edited, so no
  `metadata.version` bump applies (at this `HEAD` all 83 bundled skills carry
  `metadata.version` and none carries a top-level `version:`).
  `pnpm run check:skill-bumps` must still pass.
- `DR-260906-standing-claims-in-skills-name`: the invariant this plan documents
  in a code comment (native-read adoption is manifest-neutral) names its
  executable owner, the strengthened `adopt-stray.test.ts:148` case, in the
  same change.
- Never run `oxfmt` on a `state.md`.
- **Lane mode (the default for this plan under wave 7).** This plan runs as a
  lane in wave 7, in a worktree at `.worktrees/wave-7/<lane>`, with a root
  review after. The lane runs focused tests plus `pnpm check`,
  `pnpm type-check`, a forced `turbo run test`, `pnpm run check:skill-bumps`,
  `pnpm lint`, `pnpm format`, and `pnpm oat:validate-skills`. The lane does
  **not** edit any lockstep release file and does **not** run
  `pnpm release:check-versions` or `pnpm release:validate`: the wave fan-in owns
  the single lockstep bump and the release gates. Only a standalone execution
  bumps the five public packages itself, above freshly fetched `origin/main`.
- Turborepo replays cached results; a green run printing `cache hit, replaying
logs` or `>>> FULL TURBO` executed nothing. Use
  `HOME=$(mktemp -d) pnpm exec turbo run test --force` from the repository root
  for evidence-grade verification, and capture every gate's exit code explicitly
  (`pnpm <gate> > gate.log 2>&1; echo "exit=$?"`).

## Scope

### In scope

- `packages/cli/src/commands/status/index.ts` — the two `adopt` success paths in
  the native-skill loop (`:1360-1362` and `:1413`) set `manifestChanged`, plus a
  short comment recording why `keep` does not and why the write is
  restamp-only today.
- `packages/cli/src/commands/status/index.test.ts` — a new
  `useDiskManifestPersistence` harness option and the new cases named in the
  Test plan.
- `packages/cli/src/commands/shared/adopt-stray.test.ts` — strengthen the
  existing `:148` case to pin the `nativeRead` manifest-neutrality invariant on
  a non-empty manifest.

### Out of scope

- `packages/cli/src/commands/shared/adopt-stray.ts` — the `nativeRead` early
  return at `:140-142` is the intended contract for a natively read projection
  (the provider reads `.agents/skills` directly, so there is nothing to track).
  Changing it would add manifest entries for views OAT does not project and is a
  separate design decision, not this plan.
- `packages/cli/src/commands/init/index.ts` and
  `packages/cli/src/engine/execute-plan.ts` — already save after a completed
  run; read them as the exemplar, do not edit them.
- The ordinary-stray loop, the Codex/Cursor regeneration block at `:1497-1525`,
  and the `keep` disposition — untouched.
- `packages/cli/src/manifest/manager.ts` — the restamp semantics are pinned, not
  changed.
- Lockstep release files
  (`packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`,
  `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`): never
  edited by this plan in lane mode; the wave fan-in owns the bump.

## Current state

`runStatus` collects one `scopeCollection` per resolved scope, each carrying its
own `manifest`, `manifestPath`, and `versionRestamp`
(`status/index.ts:1197-1209`). When strays exist and the run is interactive, it
partitions the scope's stray candidates into native-skill candidates (Cursor and
Copilot skills, identified by a `nativeRead` skill mapping with
`adoptionSourceDirs`) and ordinary strays, prompts per native skill with
adopt/keep, then presents one checklist for the ordinary strays.

`manifestChanged` is the single gate on the scope's one write. It is set only by
the ordinary-stray loop. The native loop reassigns `scopeCollection.manifest`
from the disposition helper's return value but leaves the flag alone, so a scope
whose only migration was a native adoption performs no write at all: no
`lastUpdated` refresh, no `oatVersion` restamp, and no restamp advisory. The
comment at `:1528-1530` explains the placement of the advisory relative to the
save and is correct as far as it goes; it simply never fires on this path.

Today that omission loses nothing, because a `nativeRead` adoption returns the
manifest object unchanged, and `adopt-stray.test.ts:148-225` already says so
for an empty manifest. But the code at `:1352` and `:1404` is written as though
the returned manifest could differ, and every other completed migration in the
CLI (init, sync) persists and restamps. Setting the flag makes the native loop
consistent with the ordinary loop, with `oat init`, and with `oat sync`, and
strengthening the invariant pin makes the harmlessness a checked fact on a
non-empty manifest rather than an accident.

## Implementation steps

### 0. Re-verify the premise before touching anything

Re-run the executable proof from "Correction to the source item": build the CLI
(`pnpm build`), then in a `mktemp -d` scratch directory (never `rm -rf` a
variable path — let the OS reclaim the temp dir) create
`.cursor/skills/adopt-me/SKILL.md`, `.agents/skills/`, and `.git/`, write a
small `.mjs` probe that imports `adoptStrayToCanonical` from
`packages/cli/dist/commands/shared/adopt-stray.js` and `CURSOR_PROJECT_MAPPINGS`
from `packages/cli/dist/providers/cursor/paths.js`, and call it with the
`contentType === 'skill'` mapping and an empty manifest.

**Verify:** the returned manifest has `entries.length === 0` and is the same
object that was passed in; `.agents/skills/adopt-me/SKILL.md` exists and
`.cursor/skills/adopt-me` does not. If entries were added, STOP: `adopt-stray.ts`
has changed, the source item's original premise may now be true, and this plan
must be revalidated before any edit.

### 1. Strengthen the native-read neutrality pin

In `packages/cli/src/commands/shared/adopt-stray.test.ts`, change the existing
case at `:148` ("moves a native-read Cursor skill without recreating a provider
view or manifest row") so the input manifest is **non-empty** (one unrelated
entry) and the assertions are: the returned value `toBe(input)` (same object),
`entries` deep-equal the input's entries, the directory moved to the canonical
location, and no symlink was created back at the provider path. Keep `:188`
unchanged. Do this before the production change so the invariant is recorded
independently of the flag.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/shared/adopt-stray.test.ts`
→ pass. Red control (run once, reported): neutralize the
`if (stray.mapping.nativeRead) return manifest;` early return at
`adopt-stray.ts:140-142`, confirm this case fails, restore.

### 2. Add the failing harness-level case

In `packages/cli/src/commands/status/index.test.ts`, add
`saves the manifest after a native-skill adoption` inside the existing
`manifest version restamp advisory` describe block (`:794-939`): a Cursor
adapter, a single `.cursor/skills/adopt-me` stray, `singleSelectResponses: ['adopt']`,
and **no** ordinary strays. Assert `saveManifest` was called exactly once with
`scopeCollection.manifestPath` and the manifest object returned by the
`applyNativeSkillDisposition` stub. In the same case, or a sibling, assert that
`singleSelectResponses: ['keep']` performs **no** save.

**Verify:** run it now, before the production change:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/status/index.test.ts -t "saves the manifest after a native-skill adoption"`
→ **fails** with `saveManifest` called 0 times. Record that red output; it is
the negative control for Step 4.

### 3. Add the restamp case for the same path

Add `warns before the native-skill adoption save`, mirroring the existing
`:811` case: `manifestOatVersion: '0.0.1'`, a native `adopt`, and a
`saveManifest.mockImplementationOnce` that snapshots `capture.warn` at call
time. Assert the exact restamp string
(`Manifest version restamp [status project]: manifest produced by oat "0.0.1"
will be restamped to oat "<OAT_VERSION>".`) is present when the save happens and
appears exactly once. Then confirm the five existing cases at `:811-937` are
unchanged and still pass — in particular that an aborted native disposition
(`:869`) still emits no advisory and performs no save.

**Verify:** the new case fails today (no save, no advisory) and the five
existing cases pass. Record both.

### 4. Set the flag

In `status/index.ts`, set `manifestChanged = true` immediately after
`adoptedCount += 1;` at `:1361` (inside the `if (disposition === 'adopt')`
branch, never in the `else` that logs a `keep`) and again after `:1413` in the
`replaceCanonical` retry. Add a short comment stating the facts a future reader
needs: a `keep` writes only the sync config so it must not set the flag; a
`nativeRead` adoption is manifest-neutral today (`adopt-stray.ts:140-142`), so
this write is a restamp-only refresh that keeps status consistent with
`oat init` and `oat sync`, which both persist after a completed run; and name
`adopt-stray.test.ts`'s strengthened `:148` case as the executable owner of the
neutrality claim.

**Verify:** the Step 2 and Step 3 cases now pass;
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/status/index.test.ts`
→ the whole file passes, with no change to any existing assertion.

### 5. Add the disk-backed persistence case

Add a `useDiskManifestPersistence?: boolean` option to `createHarness`
(`:64-81`) that, when set, replaces the `saveManifest` and
`applyNativeSkillDisposition` stubs with the production implementations from
`@manifest/index` and `@commands/shared/native-skill-disposition`, following the
`useDiskCodexExtension` pattern at `:398-414`, and requires the caller to pass a
real `cwd` (a `mkdtemp` root) rather than `/tmp/workspace`. `loadManifest` may
stay stubbed: the harness already injects an in-memory manifest with
`manifestOatVersion`, and the assertion below reads the file the real
`saveManifest` wrote, not the loader's return. Then add
`persists the native-skill adoption outcome to the manifest on disk`: seed the
temp root with `.git/`, `.agents/skills/`, `.cursor/skills/adopt-me/SKILL.md`,
and `.oat/sync/`; inject a manifest whose `oatVersion` is `'0.0.1'` and which
already contains one unrelated entry; drive a native `adopt`; then **read
`.oat/sync/manifest.json` back from disk with `readFile` and `JSON.parse`** and
assert:

- the file's `oatVersion` is now `OAT_VERSION` and `lastUpdated` is set (the
  restamp actually happened, not just the advisory);
- the pre-existing unrelated entry survived with identical fields;
- **no** entry was added for the adopted skill, with a comment citing
  `adopt-stray.ts:140-142` and naming this as the invariant the source item
  assumed the opposite of;
- `.agents/skills/adopt-me/SKILL.md` exists with the original content and
  `.cursor/skills/adopt-me` is gone.

Nothing in this case may mock the writer it asserts about: the manifest is read
from the filesystem, not from a spy's arguments.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/status/index.test.ts -t "persists the native-skill adoption outcome"`
→ pass. Then revert Step 4's two assignments only, re-run, and confirm the case
fails because no `.oat/sync/manifest.json` was written (or its `oatVersion` is
still `'0.0.1'` if the seed wrote one); restore and report that.

### 6. Run the lane gates

**Verify (lane mode):** in this order, each with its exit code captured
explicitly — `pnpm check`, `pnpm type-check`,
`HOME=$(mktemp -d) pnpm exec turbo run test --force`,
`pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`,
`pnpm oat:validate-skills`. All exit 0. Do not edit lockstep release files and
do not run `pnpm release:check-versions` or `pnpm release:validate`; the wave
fan-in owns those. **Standalone mode only:** additionally bump the five public
packages above freshly fetched `origin/main` and run the eight AGENTS.md gates
in order.

## Test plan

- **`packages/cli/src/commands/shared/adopt-stray.test.ts` (changed).**
  Strengthen `:148` (`moves a native-read Cursor skill without recreating a
provider view or manifest row`): non-empty input manifest, `toBe(input)`,
  entries unchanged. Pins `adopt-stray.ts:140-142` on the shape that matters.
  Regression proved: a future change that starts adding manifest entries for
  natively read skills would silently change what `oat status` and `oat init`
  write; this case makes that change loud. Red control: neutralize the early
  return, confirm the case fails, restore, and report.
- **`packages/cli/src/commands/status/index.test.ts` (changed).** Structural
  pattern for the first two: the `manifest version restamp advisory` block at
  `:794-939`. Structural pattern for the third: the `useDisk…` options at
  `:398-414` and the real-disk case at `:1566-1667`.
  - `saves the manifest after a native-skill adoption` — native `adopt`, no
    ordinary strays, `saveManifest` called exactly once with the manifest the
    disposition returned; a `keep`-only run performs no save. **Red before
    Step 4** (called 0 times).
  - `warns before the native-skill adoption save` — the exact restamp string is
    already in `capture.warn` when `saveManifest` runs, and appears exactly
    once. **Red before Step 4** (no save, no advisory).
  - `persists the native-skill adoption outcome to the manifest on disk` — the
    disk-backed case from Step 5, re-reading `.oat/sync/manifest.json` with
    `readFile`. **Red before Step 4** (nothing written).
  - Unchanged and must stay green, as the "restamp behavior around the save is
    unchanged and pinned" criterion: `:811`, `:833`, `:850`, `:869`, `:920`,
    plus `:941` ("prompts with one checklist and adopts only selected entries",
    `saveManifest` still called exactly once) and `:982`, `:1047`, `:1097`,
    `:1132`, `:1159`, `:1187`.
- **Negative controls, run once and reported.** Two clauses, two controls: (1)
  revert the two `manifestChanged = true` assignments and confirm all three new
  status cases fail; (2) neutralize the `nativeRead` early return in
  `adopt-stray.ts` and confirm the strengthened `adopt-stray.test.ts:148` case
  fails. Restore after each. A test that cannot fail is not evidence.
- **Focused command:** from `packages/cli`,
  `pnpm exec vitest run src/commands/status src/commands/shared` → all pass.
- **Full relevant suite:** `HOME=$(mktemp -d) pnpm exec turbo run test --force`
  from the repository root → all pass, with no `FULL TURBO` replay in the
  output.

## Done criteria

- [ ] Both `adopt` success paths in the native-skill loop set `manifestChanged`;
      the `keep` path does not (asserted, not assumed).
- [ ] `saves the manifest after a native-skill adoption` and
      `warns before the native-skill adoption save` pass, and both were observed
      red before the production change.
- [ ] `persists the native-skill adoption outcome to the manifest on disk` passes
      by re-reading `.oat/sync/manifest.json` from the filesystem — no mock
      stands between the assertion and the file — and pins the restamped
      `oatVersion`, the surviving unrelated entry, the absence of an entry for
      the natively read skill, and the moved directory.
- [ ] `adopt-stray.test.ts:148` pins the `nativeRead` manifest-neutrality
      invariant on a non-empty manifest, and the code comment added in Step 4
      names it as its owner.
- [ ] All five existing restamp-advisory cases and the ordinary-stray adoption
      case pass unchanged; an aborted migration still performs no save and emits
      no advisory.
- [ ] Both negative controls were run and each made its named test fail.
- [ ] Lane mode: focused tests, `pnpm check`, `pnpm type-check`, forced
      `turbo run test`, `pnpm run check:skill-bumps`, `pnpm lint`,
      `pnpm format`, and `pnpm oat:validate-skills` all pass with captured exit
      codes, and no lockstep release file is edited.
- [ ] `git status --short` contains no unexplained or out-of-scope files.

## STOP conditions

Stop and report instead of improvising when:

- Step 0's proof does not reproduce — `adopt-stray.ts` has changed and the
  plan's correction to the source item may no longer hold;
- making the disk-backed case pass appears to require changing
  `adopt-stray.ts:140-142` so that natively read adoptions add manifest entries
  — that is a design change with projection consequences and belongs in its own
  item, not here;
- setting the flag makes any existing test fail. Two are load-bearing: the
  abort cases at `:850` and `:869` assert **no** save. If either goes red, the
  flag has been set on a path that did not adopt anything, which is a
  correctness regression, not a test to update;
- a `keep`-only run starts writing the manifest;
- the restamp advisory fires more than once, in `--json` mode, or after the save
  rather than before it;
- the new disk-backed harness option leaks into existing cases (any test whose
  `cwd` is `/tmp/workspace` must keep every filesystem-writing dependency
  mocked, per `packages/cli/AGENTS.md:32-35`);
- a named verification gate fails twice after one bounded correction;
- the work would require editing `.agents/skills/**` or a lockstep release file.

## Revalidation Before Execution

Revalidate this plan against live state before executing when:

- substantial time passes after `2026-09-08`;
- `origin/main` advances materially from
  `7d70ac307717b95917b8f92aa3fb9f236d1f75ba`;
- PR #190 or PR #125 lands;
- `packages/cli/src/commands/shared/adopt-stray.ts` changes at all — the
  correction to the source item depends entirely on its `nativeRead` early
  return;
- `status/index.ts`'s stray-migration block is restructured, moving the cited
  anchors (`:1315`, `:1361`, `:1413`, `:1452`, `:1489`, `:1527`, `:1539`);
- a provider gains a `contentType: 'skill'` mapping with both `nativeRead: true`
  and `adoptionSourceDirs`, widening who reaches the native loop;
- a wave-7 sibling plan gains `commands/status/` or `commands/shared/` in its
  In scope (none has at this `HEAD`).

Apply the `## Landing-event impact` table when one of its events has occurred.
Executed inside a wave, this plan refreshes its drift check against the exact
execution `HEAD` after predecessor lanes integrate, not only from the authored
SHA to `origin/main`.

## Review focus

- **The correction is the review's first job.** Confirm independently that
  `adopt-stray.ts:140-142` returns the manifest unmodified for every native-skill
  candidate, that `adopt-stray.test.ts:148-225` already pinned the empty-manifest
  shape before this plan, and that the plan's replacement acceptance criteria
  are honest about what is and is not being fixed. If the reviewer can produce
  a native-skill candidate whose adoption _does_ mutate the manifest, the plan
  is wrong and the item's original criteria apply.
- **The newly reachable write.** `oat status` now writes
  `.oat/sync/manifest.json` on a path where it previously wrote nothing —
  including at user scope under `--scope all`, where the file is
  `~/.oat/sync/manifest.json`. Confirm the write is confined to an adopt that
  actually succeeded, that a `keep` and every abort still write nothing, and
  that the restamp advisory is the user's warning that the file is about to be
  rewritten by a different CLI version. This is the same write `oat init` and
  `oat sync` already perform after a completed run.
- **Test fidelity.** The disk-backed case must not mock the writer it asserts
  about; check that `saveManifest` and `applyNativeSkillDisposition` are the
  real implementations there and that the assertion reads the file, not a spy.
- **Follow-ups intentionally deferred.** Whether a natively read adoption should
  be tracked in the manifest at all is left open; so is the init/status
  divergence in _unconditional_ versus gated saving, which this plan narrows but
  does not remove.
