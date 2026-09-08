---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/items/BL-260906-reconcile-the-oat-doctor.md
oat_external_plan_commit: c9f2e147ac0674e73a60735e0c1727ccc6048756
oat_external_plan_main_commit: c9f2e147ac0674e73a60735e0c1727ccc6048756
oat_external_plan_date: '2026-09-08'
oat_execution_status: READY
oat_backlog_items:
  - BL-260906-reconcile-the-oat-doctor
oat_issue_url: null
created: '2026-09-08T21:19:11Z'
---

# Make the oat-doctor dashboard example describe a state the doctor can report

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency. The one open PR
> that edits this file (#273) is a soft integration row, not a blocker: it
> changes the same two example sections, so this lane re-anchors on the merged
> state if it lands first.

## Outcome

The `oat-doctor` dashboard example stops describing an impossible doctor run.
Today `docs`, `project-management`, and `research` appear as installed packs
with a skill count and a `current`/`outdated` status **and** as
"Available But Not Installed" with an install command. A pack is one or the
other, never both. After this change every pack name appears in exactly one of
the two sections, the example counts still derive from `PACK_MANIFEST`, and a
new assertion in `packages/cli/src/validation/skills.test.ts` fails whenever
any pack name reappears in both — so the contradiction cannot come back.
`oat-doctor`'s `metadata.version` is bumped once for the change.

## Source and live evidence

- Source backlog item:
  [BL-260906-reconcile-the-oat-doctor — Reconcile the oat-doctor example table with its inventory sentence](../../pjm/backlog/items/BL-260906-reconcile-the-oat-doctor.md)
- Inspected `HEAD`: `c9f2e147ac0674e73a60735e0c1727ccc6048756` — the tree whose
  content this plan read (branch `wave-7-plans`).
- Comparison baseline: `c9f2e147ac0674e73a60735e0c1727ccc6048756` — the fetched
  `origin/main` tip, identical to the inspected `HEAD` at authoring time.
- Planning date: `2026-09-08`.
- Working tree while planning: the tracked tree was clean. The only untracked
  entries were sibling wave-7 external plan files being authored concurrently
  under `.oat/repo/reference/external-plans/`; none is read or written here.
- Verified evidence (each read at the inspected `HEAD`):
  - `.agents/skills/oat-doctor/SKILL.md:236-246` — the `## Installed Packs`
    example table rows are `core 2/2 current`, `docs 7/7 current`,
    `workflows 40/40 current`, `ideas 4/4 current`,
    `project-management 4/4 current`, `research 6/6 current`,
    `utility 10/10 outdated`.
  - `.agents/skills/oat-doctor/SKILL.md:254-261` — the
    `## Available But Not Installed` section lists `docs` (7 skills),
    `project-management` (4 skills), and `research` (6 skills), each with a
    `→ Run: oat tools install <pack> --scope {scope}` line.
  - The overlap is exactly `docs`, `project-management`, `research` — all three
    are simultaneously installed-with-a-status and available-to-install.
    `SKILL.md:213-216` defines the states as mutually exclusive
    ("**Installed:** all pack skills found in installed tools list …
    **Not installed:** no pack skills found"), so the example describes a
    state the doctor never reports.
  - `.agents/skills/oat-doctor/SKILL.md:9` — `metadata.version: 1.2.2`. There is
    no top-level `version:` key (the alias was retired in CLI 0.2.65).
  - `packages/cli/src/validation/skills.test.ts:8237-8346` — the
    `bundled skill contract truthfulness — doctor inventory` describe block has
    two cases. `:8238-8288` pins the bundled inventory list against
    `PACK_MANIFEST`. `:8291-8346` derives the example counts: it slices
    `## Installed Packs` → `## Outdated Skills` and matches rows against
    `/^\|\s*([a-z-]+)\s*\|\s*[a-z]+\s*\|\s*\d+\/(\d+)\s*\|/gm`, asserting each
    named pack exists in `PACK_MANIFEST` and its denominator equals the pack
    size; it then slices `## Available But Not Installed` → `## Configuration`
    and matches
    `/^- \*\*([a-z-]+)\*\* pack: (.+?) \((\d+) skills available\)$/gm`,
    asserting the listed skill names equal the manifest's sorted names and the
    count equals the list length. **Neither case compares the two sections to
    each other**, which is why the wave-2 repair left the contradiction
    standing.
  - **Correction to the assignment brief and to the source item's framing:
    there is no `oat-doctor` version pin to move.** A sweep for the literal
    `1.2.2` across `packages/cli/src`, `tools/smoke`, and `.agents/skills`
    returns only synthetic fixtures unrelated to this skill
    (`validation/skills.test.ts:7101`, `:7141`, `:9267`, `:9283`;
    `fs/assets.test.ts:279`, `:288`, `:471`, `:479`). A sweep for the string
    `oat-doctor` across `packages/cli/src`, `tools/smoke`,
    `.agents/skills/*/tests`, and `apps/oat-docs/docs` finds no
    `readDeclaredVersion` assertion for it. The bump is still required by the
    repository's one-bump-per-changed-skill rule and is enforced by
    `pnpm run check:skill-bumps` against `origin/main`; nothing needs
    re-pinning.
  - `packages/cli/src/validation/synced-bookkeeping-sites.json:243` references
    `.agents/skills/oat-doctor/SKILL.md` with anchor
    `**Synced project health:** Report \`project:synced_tracked_artifacts\``and`kind: resolve`. That anchor is nowhere near the two example sections,
    so this change does not disturb it.
  - `packages/cli/src/commands/tools/shared/pack-manifest.ts:175` — `oat-doctor`
    is a `core`-pack skill with `['user']` scope, so the example's `core` row is
    the one pack the running doctor is guaranteed to find installed.
  - PR #273 (`feat: add provider-neutral remote project management`, open, not a
    draft, head `ae3002c08b1ae0eee42be8bbe7cf96c461f7d7bd`) edits this exact
    file: it bumps `metadata.version` `1.2.2` → `1.2.3`, adds `oat-pjm-remote`
    to the `project-management` pack inventory, changes the installed-packs row
    to `project-management | project | 5/5 | current`, and rewrites the
    `project-management` available-but-not-installed bullet to five skills.
- Constraining decisions: `DR-260906-standing-claims-in-skills-name` — every
  standing claim in a skill names the code that owns it and ships an executable
  backstop in the same change, never keyed to a physical line number. Step 3's
  assertion is that backstop; the skill prose must not cite a line number.

## Dependencies

| Type             | Dependency                                                                                                                                                      | Required state                                                                                                                                                                             | Current state                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Soft ordering    | Shared write: `packages/cli/src/validation/skills.test.ts`, also written by the wave-7 fence-repair lane, the bump-validator lane, and the completion-seal lane | Never in one parallel group with any other lane that writes this file; the wave orchestrator serializes them by group, and each lane re-anchors its insertion point after the earlier one. | Pending; reciprocal rows belong in each of those lanes' plans.            |
| Soft ordering    | Any wave-7 lane that writes `.agents/skills/oat-doctor/SKILL.md`                                                                                                | Never in one parallel group with this lane; only one lane may own the single `metadata.version` bump for a skill in a PR.                                                                  | Pending; no other wave-7 lane in the drawn composition writes this skill. |
| Soft integration | PR #273 (bumps `oat-doctor` to `1.2.3` and rewrites both example sections)                                                                                      | Land this after #273, or re-anchor onto the merged file: bump from whatever `metadata.version` is then current, and rebuild the sections from the merged `project-management` membership.  | Open, not a draft (head `ae3002c08b1ae0eee42be8bbe7cf96c461f7d7bd`).      |
| Satisfied        | `PACK_MANIFEST` and `getPackMemberNames` are the single source the doctor example is derived from                                                               | Present and already used by both existing cases (`validation/skills.test.ts:8276-8281`, `:8293-8298`).                                                                                     | Satisfied — verified at `c9f2e147ac0674e73a60735e0c1727ccc6048756`.       |

There are no unsatisfied hard dependencies.

## Landing-event impact

| Event                                             | Affected | Files in common                                                                          | Required update                                                                                                                                                                                                                                  |
| ------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `remote project management` (PR #273) merges      | Major    | `.agents/skills/oat-doctor/SKILL.md` (frontmatter version, both example sections)        | Rebase. Bump from the merged `metadata.version` (`1.2.3` in the current head), re-anchor `## Installed Packs` and `## Available But Not Installed` on the merged rows, and keep the merged `project-management` membership (five skills) intact. |
| `ReviewPlan Stage A` (draft PR #190) merges       | Minor    | `packages/cli/src/validation/skills.test.ts`                                             | Rebase; re-anchor the insertion point for the new case inside the `doctor inventory` describe block. No plan change.                                                                                                                             |
| `oat-brainstorm visual companion` (PR #125) lands | None     | None — its 26 files touch neither `oat-doctor/SKILL.md` nor `validation/skills.test.ts`. | No action.                                                                                                                                                                                                                                       |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat c9f2e147ac0674e73a60735e0c1727ccc6048756..origin/main -- .agents/skills/oat-doctor/SKILL.md packages/cli/src/validation/skills.test.ts packages/cli/src/commands/tools/shared/pack-manifest.ts packages/cli/src/validation/synced-bookkeeping-sites.json
```

In a wave lane, re-run the same command against the exact execution `HEAD`
after predecessor lanes integrate, not only from the authored SHA to
`origin/main`. If `PACK_MANIFEST` membership changed, rebuild the example from
the live manifest rather than editing the numbers by hand. If
`metadata.version` is no longer `1.2.2`, bump from whatever is current. A
material mismatch between the cited section shapes and the live file is a STOP
condition.

## Repository conventions

- Focused test: from `packages/cli`,
  `pnpm exec vitest run src/validation/skills.test.ts -t 'doctor'`.
- Skill validation and bumps: `pnpm oat:validate-skills`,
  `pnpm run check:skill-bumps` (fetch `origin/main` first — the gate compares
  against it).
- One `metadata.version` bump per changed skill per PR. Top-level `version:` is
  gone since CLI 0.2.65. When a skill _does_ have pins, locate them by the OLD
  VERSION LITERAL across `packages/cli/src`, `tools/smoke`, and
  `.agents/skills/*/tests`. For `oat-doctor` at `1.2.2` that sweep returns
  nothing, so this plan moves no pin — re-run the sweep before assuming that
  still holds.
- `DR-260906-standing-claims-in-skills-name`: a standing claim in a skill names
  its executable owner and ships the backstop in the same change, never a line
  number.
- Lint/format check (non-mutating): `pnpm lint` and `pnpm format` both cover
  `.agents/skills/**/*.md`; CI runs neither, so both are required here because
  this change touches `.agents/skills`. `pnpm check` additionally runs
  `oat:validate-skills`.
- Never run oxfmt over any `state.md`.
- Markdown formatting of `SKILL.md` is owned by `pnpm format` / `pnpm format:fix`
  (oxfmt); the example tables are inside a fenced block, so table column
  alignment there is authored by hand and must stay visually consistent with
  the surrounding rows.
- **Lane mode (the default here): this plan runs as a lane in wave 7, in a
  worktree `.worktrees/wave-7/<lane>`, with a root review after.** Run the
  focused test plus `pnpm check`, `pnpm type-check`, a forced
  `HOME=$(mktemp -d) pnpm exec turbo run test --force`,
  `pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`, and
  `pnpm oat:validate-skills`, each with its exit code captured explicitly. Do
  **not** edit any lockstep release file and do not run
  `pnpm release:check-versions` or `pnpm release:validate`; the wave fan-in
  owns the single lockstep bump of
  `packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}` and the
  release gates. **Standalone mode only:** bump the five public packages above
  freshly fetched `origin/main` and run the eight AGENTS.md gates in order.
- Git/PR convention: commit on the lane branch; do not push or open a PR unless
  the wave orchestrator instructs it.

## Scope

### In scope

- `.agents/skills/oat-doctor/SKILL.md`
  - `## Installed Packs` example table (`:236-246`) and
    `## Available But Not Installed` example section (`:254-261`) inside the
    Step 7 dashboard fence: make the two sets disjoint.
  - `metadata.version` (`:9`): one bump.
- `packages/cli/src/validation/skills.test.ts` — one new case inside the
  existing `bundled skill contract truthfulness — doctor inventory` describe
  block (`:8237-8347`) asserting the two example sections name disjoint packs.

### Out of scope

- `PACK_MANIFEST` membership and every real pack definition
  (`packages/cli/src/commands/tools/shared/pack-manifest.ts`) — the example is
  derived from the manifest, never the other way round.
- The bundled skill-inventory list at `SKILL.md:150-210` and the case that pins
  it (`skills.test.ts:8238-8288`) — the wave-2 repair already made it truthful.
- The `## Outdated Skills` and `## Configuration` example sections, the check
  mode, and every other part of `oat-doctor`.
- `apps/oat-docs/docs/cli-utilities/tool-packs.md` and every other docs surface
  that describes packs — no docs page reproduces this dashboard example.
- Any change to the doctor **command** (`packages/cli/src/commands/doctor/`);
  this is a skill-prose truthfulness fix, not a behaviour change.

## Current state

`oat-doctor` Step 7 prints a full dashboard, and its `SKILL.md` carries a
worked example of that dashboard inside one fenced block. The example's
`## Installed Packs` table has seven rows — every pack in `PACK_MANIFEST` —
each with a scope, an `installed/total` count, and a `current`/`outdated`
status. Immediately below, `## Available But Not Installed` lists `docs`,
`project-management`, and `research` with their full skill lists and install
commands. Step 5 of the same skill (`:213-216`) defines the pack states as
mutually exclusive: a pack is installed, partially installed, or not installed.
So the example asserts three packs are simultaneously fully installed at
`current` and entirely absent.

Two executable backstops already guard this example. One pins the bundled
inventory list against `PACK_MANIFEST`; the other derives both sections' counts
and skill lists from `PACK_MANIFEST`. Both are internally consistent and both
pass today, because each section is validated in isolation. The missing
invariant is the relationship _between_ the sections, which is precisely the
property the source item asks for.

Because the second case reads the installed table with a row regex that
requires a pack name, a scope, and an `n/m` count, and reads the available
section with a bullet regex that requires the full skill list and a count, the
new assertion can reuse those same two extractions rather than inventing a
third parser.

## Implementation steps

### 1. Rewrite the example so each pack appears in exactly one section

In `.agents/skills/oat-doctor/SKILL.md`, edit the Step 7 dashboard example:

- Keep `## Installed Packs` rows for the packs the example calls installed, and
  **remove** the rows for the packs the example also calls available. Choose
  the split so the example still exercises both a `current` and an `outdated`
  status and still shows more than one scope: keep `core` (user, `current`),
  `workflows` (project, `current`), `ideas` (user, `current`), and `utility`
  (project, `outdated`) as installed; leave `docs`, `project-management`, and
  `research` in the available-but-not-installed section only.
- Leave the `## Available But Not Installed` bullets for `docs`,
  `project-management`, and `research` exactly as they are, including their
  skill lists and counts, which the existing case already derives from
  `PACK_MANIFEST`.
- Keep every installed row's denominator equal to that pack's
  `PACK_MANIFEST` size; if the manifest changed since the drift check,
  regenerate the numbers from it. Do not add a pack name that is not in the
  manifest — the existing case asserts membership rather than filtering.
- Keep the surrounding prose, the `## Outdated Skills` example (whose
  `oat-project-implement` row belongs to the `workflows` pack, which stays
  installed), and the `## Configuration` example unchanged.
- Preserve the table's hand-authored column alignment inside the fence.

**Verify:** `pnpm exec vitest run src/validation/skills.test.ts -t 'doctor'`
from `packages/cli` → both existing cases still pass (the inventory pin and the
manifest-derived counts).

### 2. Bump the skill once

Set `metadata.version` at `.agents/skills/oat-doctor/SKILL.md:9` to the next
patch above whatever is current on the execution base (`1.2.2` → `1.2.3` at the
inspected `HEAD`; `1.2.3` → `1.2.4` if PR #273 landed first). Exactly one bump
for this skill in this PR, even if the file is edited more than once on the
branch.

Then sweep for pins by the OLD version literal before assuming there are none:

```bash
git grep -n -- "<old-version-literal>" -- packages/cli/src tools/smoke .agents/skills
git grep -n -- "oat-doctor" -- packages/cli/src tools/smoke .agents/skills apps/oat-docs/docs
```

At the inspected `HEAD` the first sweep returns only unrelated synthetic
fixtures and the second returns no version assertion, so no pin moves. If either
sweep now returns a real pin for this skill, update it in the same change.

**Verify:** `git fetch origin main && pnpm run check:skill-bumps` → exit `0`
with `oat-doctor` reported as bumped; `pnpm oat:validate-skills` → exit `0`.
Capture both exit codes explicitly.

### 3. Pin the disjointness with an executable backstop

Add one case to the `bundled skill contract truthfulness — doctor inventory`
describe block in `packages/cli/src/validation/skills.test.ts`, after the
existing counts case (`:8291-8346`). It must:

- read `.agents/skills/oat-doctor/SKILL.md` through `readRepoFile`, exactly as
  the neighbouring cases do;
- slice `## Installed Packs` → `## Outdated Skills` and collect pack names with
  the same row regex the counts case uses
  (`/^\|\s*([a-z-]+)\s*\|\s*[a-z]+\s*\|\s*\d+\/(\d+)\s*\|/gm`);
- slice `## Available But Not Installed` → `## Configuration` and collect pack
  names with the same bullet regex
  (`/^- \*\*([a-z-]+)\*\* pack: (.+?) \((\d+) skills available\)$/gm`);
- assert both collections are non-empty (an empty slice must not pass
  vacuously — that is how a heading rename would silently disable the guard);
- assert the intersection of the two name sets is empty, with a failure message
  naming the offending pack(s);
- assert the union is a subset of the `PACK_MANIFEST` pack names, so a pack can
  never be moved out of the contradiction by inventing a name.

Do not weaken or restructure the two existing cases.

**Verify:** `pnpm exec vitest run src/validation/skills.test.ts -t 'doctor'` →
three cases pass.

### 4. Record the negative control

Prove the new case can fail, per the repository's "a test that cannot fail is
not evidence" rule, and record both runs in the review note:

1. Re-add one removed installed-packs row (for example
   `| research | project | 6/6 | current |`) to the example so `research`
   appears in both sections. Run
   `pnpm exec vitest run src/validation/skills.test.ts -t 'doctor'` and confirm
   the new case fails naming `research`, while the two pre-existing cases still
   pass — that contrast is the point: the old guards cannot see this defect.
2. Restore the file (`git checkout -- .agents/skills/oat-doctor/SKILL.md` is
   unsafe here because it would also drop the version bump; instead re-delete
   the row) and re-run to green.
3. Separately, empty one of the two slices (rename the
   `## Available But Not Installed` heading in a scratch copy of the string
   under test) and confirm the non-empty assertions fail rather than passing
   vacuously.

**Verify:** the recorded transcript shows red then green for step 1 and a red
for step 3, with the exact assertion messages.

### 5. Gate

**Verify (lane mode, the default under the execution program):** run the
focused test, then `pnpm check`, `pnpm type-check`,
`HOME=$(mktemp -d) pnpm exec turbo run test --force`,
`pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`, and
`pnpm oat:validate-skills`, each with its exit code captured explicitly
(`pnpm <gate> > gate.log 2>&1; echo "exit=$?"`), never through a pipeline whose
final stage is a pager or filter. Confirm the run was not a Turborepo cache
replay (`cache hit, replaying logs` / `>>> FULL TURBO` means it proved nothing).
Do not edit any lockstep release file. **Standalone mode only:** bump the five
public packages above freshly fetched `origin/main` and run the eight AGENTS.md
gates in order.

## Test plan

- `packages/cli/src/validation/skills.test.ts`, inside
  `describe('bundled skill contract truthfulness — doctor inventory')`:
  - **New case** `keeps a pack out of both the installed and available example
sections`: the disjointness assertion described in step 3, including the
    two non-empty guards and the manifest-subset guard.
  - Structural pattern to follow: the adjacent case
    `derives doctor's summary example counts from the pack manifest`
    (`:8291-8346`) — same `readRepoFile`, same slicing, same regexes, same
    `PACK_MANIFEST` / `getPackMemberNames` source of truth.
  - Regression proved: a pack listed as installed _and_ as available to install
    — the exact wave-2 residue this item names.
  - **Red-then-green negative control (recorded):** with `research` re-added to
    the installed table the new case fails naming `research` and the two
    existing cases still pass; removing the row again turns it green. A second
    control renames one section heading and confirms the non-empty guards fail
    instead of passing vacuously.
- Existing cases that must keep passing unchanged:
  `keeps doctor's declared bundled inventory identical to the pack manifest`
  (`:8238-8288`) and `derives doctor's summary example counts from the pack
manifest` (`:8291-8346`).
- Focused command: `pnpm exec vitest run src/validation/skills.test.ts -t 'doctor'`
  → 3 passed.
- Full relevant suite: `pnpm exec vitest run src/validation/skills.test.ts`
  → green.
- Gate suites: `pnpm run check:skill-bumps` → exit `0`;
  `pnpm oat:validate-skills` → exit `0`.

## Done criteria

- [ ] No pack name appears in both the installed and the available example
      sections of `.agents/skills/oat-doctor/SKILL.md`.
- [ ] The example still exercises at least one `current` and one `outdated`
      status and more than one scope, and every installed denominator equals
      that pack's `PACK_MANIFEST` size.
- [ ] A case in `packages/cli/src/validation/skills.test.ts` fails when a pack
      is listed in both sections, and its neutralization is recorded (the
      failure message names the offending pack; the two pre-existing cases stay
      green under that same neutralization).
- [ ] The new case cannot pass vacuously: both section slices are asserted
      non-empty and the union is asserted to be a subset of `PACK_MANIFEST`.
- [ ] `oat-doctor`'s `metadata.version` is bumped exactly once in the PR, and
      the old-version-literal sweep is re-run and its result recorded (no pin at
      the inspected `HEAD`).
- [ ] `pnpm run check:skill-bumps` and `pnpm oat:validate-skills` both exit `0`
      with captured exit codes.
- [ ] Lane mode: focused test, `pnpm check`, `pnpm type-check`, forced
      `turbo run test`, `pnpm lint`, and `pnpm format` all pass with captured
      exit codes, and no lockstep release file is edited. Standalone mode: one
      lockstep bump and all eight gates pass.
- [ ] `git status --short` contains no unexplained or out-of-scope files.

## STOP conditions

Stop and report instead of improvising when:

- the new assertion cannot be made to fail under the step-4 neutralization —
  a test that cannot fail is not evidence for this item's acceptance criterion;
- removing the overlapping installed rows would break the existing counts case,
  which would mean the two sections are coupled in a way this plan has not
  read;
- `PACK_MANIFEST` membership changed such that the example cannot show both a
  `current` and an `outdated` pack while staying disjoint — report the tension
  rather than inventing a pack or a status;
- PR #273 has landed and the merged example no longer matches the cited section
  shapes — re-anchor per the `## Landing-event impact` row before editing, and
  stop if the merged file has already been made disjoint (then this plan is
  satisfied and only the backstop in step 3 remains);
- the old-version-literal sweep finds a real `oat-doctor` version pin this plan
  claims does not exist — update it and record the correction;
- a named verification gate fails twice after one bounded correction;
- the change would require editing `pack-manifest.ts` or any docs page to make
  the example true (that would be fixing the map to match the drawing).

## Revalidation Before Execution

Revalidate against live state before executing when: substantial time passes
after `2026-09-08`; `origin/main` advances materially from
`c9f2e147ac0674e73a60735e0c1727ccc6048756`; PR #273 or PR #190 lands (apply the
`## Landing-event impact` rows); a dependency row changes state; `PACK_MANIFEST`
gains, loses, or renames a pack; `oat-doctor`'s `metadata.version` moves; the
cited heading or section anchors in `SKILL.md` or the `doctor inventory`
describe block move; or a load-bearing evidence claim above cannot be
reproduced. A plan executed inside a wave refreshes its drift check against the
exact execution `HEAD` after predecessor lanes integrate, not only from the
authored SHA to `origin/main`.

## Review focus

- The new assertion is a real backstop, not a restatement: confirm it fails
  under the recorded neutralization and that the two pre-existing cases do
  **not** fail under the same neutralization. That contrast is the evidence
  that the wave-2 repair genuinely could not see this defect.
- Vacuous-pass resistance: both section slices must be asserted non-empty, so a
  heading rename fails the guard instead of disabling it.
- Weaker-anywhere: this change adds an assertion and removes no coverage. Any
  edit that relaxes either pre-existing case to accommodate the new one is
  Critical.
- Exactly one `metadata.version` bump for `oat-doctor` in the final PR diff,
  and the old-version-literal sweep result recorded rather than assumed.
- Scope discipline: `PACK_MANIFEST` is untouched; only the example changed.
