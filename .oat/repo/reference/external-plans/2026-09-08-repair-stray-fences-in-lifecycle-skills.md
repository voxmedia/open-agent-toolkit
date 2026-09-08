---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/items/BL-260906-repair-the-stray-fence-in-oat.md
oat_external_plan_commit: c9f2e147ac0674e73a60735e0c1727ccc6048756
oat_external_plan_main_commit: c9f2e147ac0674e73a60735e0c1727ccc6048756
oat_external_plan_date: '2026-09-08'
oat_execution_status: READY
oat_backlog_items:
  - BL-260906-repair-the-stray-fence-in-oat
oat_issue_url: null
created: '2026-09-08T21:21:53Z'
---

# Repair the stray fences that hide normative skill prose and widen the fence scanner across `.agents/skills`

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency blocks execution.
> Two `Soft` rows record ordering only: this lane and three other wave-7 lanes
> write version pins in `packages/cli/src/validation/skills.test.ts`, so they
> must never run in one parallel group.

## Outcome

Five canonical markdown surfaces under `.agents/skills` stop hiding normative
prose inside code fences. `oat-project-review-provide/SKILL.md` renders Steps
8.5, 9, and 9.5 as live instructions and its review-artifact template as a
fenced block instead of the inverse. `oat-repo-knowledge-index/SKILL.md`,
`oat-repo-improve/references/plan-template.md`,
`create-agnostic-skill/references/skill-template.md`, and
`oat-agent-instructions-apply/references/instruction-file-templates/glob-scoped-rule.md`
each recover the sections a stray fence swallowed. The
`findFenceDefects` scanner in
`packages/cli/src/validation/named-skill-load-contract.test.ts` gains a second
defect shape that catches the after-prose form the current rule structurally
cannot see, and its fence-scan inventory widens from the `oat-project-*` +
`create-oat-skill` bounded corpus to every markdown file under
`.agents/skills`, so this defect class cannot hide in an unscanned directory
again. The named-skill candidate corpus and its classification matrix stay
exactly as bounded as they are today.

## Source and live evidence

- Source backlog item:
  [BL-260906-repair-the-stray-fence-in-oat — Repair the stray fence in oat-project-review-provide and tighten the fence rule repo-wide](../../pjm/backlog/items/BL-260906-repair-the-stray-fence-in-oat.md)
- Inspected `HEAD`: `c9f2e147ac0674e73a60735e0c1727ccc6048756` — the tree whose
  content this plan read.
- Comparison baseline: `c9f2e147ac0674e73a60735e0c1727ccc6048756` — the fetched
  `origin/main` tip, identical to the inspected `HEAD` because the planning
  branch is at `origin/main`.
- Planning date: `2026-09-08`
- Working tree while planning: `git status --porcelain` was empty when this plan
  was started. Sibling plan authors later added untracked files under
  `.oat/repo/reference/external-plans/` and modified
  `.oat/repo/pjm/backlog/items/BL-260908-correct-the-factual-skill.md`; none of
  those paths is a surface of this plan.

### Corrections to the source item

The item's evidence is directionally right and numerically stale. Plan against
the values below, which were re-derived at the inspected `HEAD`.

| Item claim                                                                                   | Live fact at `c9f2e147a`                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `review-provide/SKILL.md:1057` opens, `:1167` closes, template at `:1013-1055`               | opener `:1084`, closer `:1194`, template body `:1040-1082` (a uniform +27-line drift; the same +27 drift applies to the stale anchors in the test's own comment at `named-skill-load-contract.test.ts:247-256`)                                                                          |
| `oat-repo-knowledge-index/SKILL.md:514`                                                      | `:515` (closes at `:580`)                                                                                                                                                                                                                                                                |
| `oat-repo-improve/references/plan-template.md:149`                                           | `:205` (closes at `:244`)                                                                                                                                                                                                                                                                |
| "a create-oat-skill reference"                                                               | Wrong skill. `create-oat-skill/references/oat-skill-template.md` and `create-oat-skill/SKILL.md` are both fence-balanced. The real third instance is `create-agnostic-skill/references/skill-template.md:178`                                                                            |
| "three more spurious fences of the same class"                                               | Four. A fourth, unrecorded instance sits at `oat-agent-instructions-apply/references/instruction-file-templates/glob-scoped-rule.md:48`                                                                                                                                                  |
| Acceptance criterion 2: catch "a bare fence of length >= 4 that swallows a `#{2,6}` heading" | **This discriminator is wrong.** Verified below: after the correct `oat-repo-knowledge-index` repair, three legitimate bare four-backtick agent-prompt blocks swallow a `## Include frontmatter:` heading and would be reported. Use the first-body-line discriminator in Step 6 instead |

### Verified evidence

Fence topology was re-derived by replaying CommonMark's fence rule (same
character, closer length `>=` opener length, closer carries no info string)
over each file. Every span below is `opener .. closer` with the count of
swallowed lines.

- `.agents/skills/oat-project-review-provide/SKILL.md`
  — `:990(```markdown) .. :1019(```)` fences the review-artifact frontmatter and
  header. `:1021-1038` is normative prose about `oat_review_invocation` and the
  gate parsing contract. `:1040-1082` is the **rest of the same review-artifact
  template** (`## Summary`, `## Findings`, `### Critical`/`Important`/`Medium`/
  `Minor`, `## Spec/Design Alignment`, `## Verification Commands`,
  `## Recommended Next Step`) with **no opening fence**, so it renders as live
  headings of the skill. `:1084` is a bare four-backtick fence that therefore
  reads as an _opener_; it closes at `:1194`, swallowing 109 lines that include
  `### Step 8.5: Validate Review Orchestration and Append Root Log` (`:1086`),
  `### Step 9: Update Plan Reviews Section` (`:1121`), and
  `### Step 9.5: Commit Review Bookkeeping Atomically (Required)` (`:1156`).
  `:1183(```bash) .. :1194(````)` is the commit snippet whose closer is the same
  four-backtick line.
- `.agents/skills/oat-repo-knowledge-index/SKILL.md`
  — Step 5b renders four subagent prompt templates. Agent 1 opens at `:327`
  with `` ```` `; its inner ` ```markdown ` at `:359` is closed by a
  four-backtick line at `:361`, which instead terminates the outer block. The
  cascade leaves `:369`, `:373`, `:420`, `:424`, `:471`, `:475` as
  three-backtick markers where four are required, and `:515` (four backticks)
  therefore reads as an opener rather than agent 4's closer. It closes at
  `:580`, swallowing 64 lines that include `### Step 6: Wait for Agent
Completion` (`:519`), `### Step 6b: Extract and Write Files (Read-Only Mode
Only)` (`:532`), and the ` ```python ` extraction script at `:538`.
- `.agents/skills/oat-repo-improve/references/plan-template.md`
  — `:46(````markdown)` opens the plan template. `:104(```bash) .. :106(```)` is
  the drift-check snippet inside it. `:107` is a premature four-backtick closer,
  so `:108-204` — `## Repository conventions`, `## Scope`, `## Current state`,
  `## Implementation steps`, `## Test plan`, `## Done criteria`,
  `## STOP conditions`, `## Revalidation Before Execution`, `## Review focus` —
  render as real headings of `plan-template.md` itself. `:205` (bare, four
  backticks) then reads as an opener and closes at `:244`, swallowing 38 lines
  including `## Multi-Plan Index` (`:207`). This is the enlarged region the
  item's 2026-09-07 scope note describes.
- `.agents/skills/create-agnostic-skill/references/skill-template.md`
  — `:25(````markdown)` opens the skill template; `:116(```bash) .. :118(```)`
  is inside it; `:119` is a premature four-backtick closer, so `:121-177`
  (`### Step 2`, `### Step 3`, `## Examples`, `### Basic Usage`,
  `### Conversational`, `## Reference`, `## Troubleshooting`,
  `## Success Criteria`) render as live headings. `:178` (bare, three
  backticks) then opens and closes at `:216` (the file's last line), swallowing
  37 lines including `## Detail Level Guidelines` and the shared-references
  guidance.
- `.agents/skills/oat-agent-instructions-apply/references/instruction-file-templates/glob-scoped-rule.md`
  — `:9(````markdown)` opens the rule-body template; `:37(```{lang}) .. :39(```)`
  is inside it; `:40` is a premature four-backtick closer, so `:42-47`
  (`### Incorrect` and its counter-example) render as live headings. `:48`
  (bare, three backticks) then opens and closes at `:59` (the file's last line),
  swallowing `## Guidance` and its eight bullets.
- `packages/cli/src/validation/named-skill-load-contract.test.ts:265-328`
  — `findFenceDefects` reports two shapes: an unclosed fence at EOF (`:318-325`)
  and an "orphan" (`:295-308`) that requires `info === ''`, a `gap` of only
  blank lines between the previous _closing_ fence and this opener, and a
  `##`-or-deeper heading in the body. The `gap.every(blank)` term is the blind
  spot: `review-provide:1084`, `plan-template:205`,
  `skill-template.md:178`, and `glob-scoped-rule.md:48` all open after prose, so
  the heading term is never reached. `knowledge-index:515` _does_ satisfy the
  blank-gap term (`:514` is blank) and would be reported today — it is invisible
  only because it is outside the inventory.
- `packages/cli/src/validation/named-skill-load-contract.test.ts:353-388`
  — `collectBoundedFiles` walks `.agents/skills`, keeps directories whose name
  starts with `oat-project-`, adds each `SKILL.md` plus one non-recursive level
  of `references/*.md`, then appends `create-oat-skill/SKILL.md`. That list feeds
  `scanBoundedSurface` (`:397-413`), which computes sections, candidates, **and**
  fence defects from the same 42 files.
- `packages/cli/src/validation/named-skill-load-contract.test.ts:2217-2225`
  — the matrix row `{ file: '.agents/skills/oat-project-review-provide/SKILL.md',
anchor: 'Recommended Next Step', match: 'Run the `oat-project-review-receive`
skill to convert findings into plan tasks', classification: 'non-executing' }`
  binds to `SKILL.md:1082` — text that is live prose **only because** the
  template lost its opener. Fencing `:1040-1082` removes both the anchor and the
  candidate, so `deadRows` (`:499-506`) would report the row unless it is deleted
  in the same change. This is why the repair is indivisible.
- `packages/cli/src/validation/named-skill-load-contract.test.ts:2460`
  — `CORPUS_MINIMUMS = { files: 40, candidates: 150 }`. Measured live: the
  bounded corpus is 42 files and 192 candidates. Deleting one matrix row removes
  one candidate (191), still far above the floor.
- Measured cost of the alternative inventory widening: extending
  `collectBoundedFiles` itself to every skill directory adds **33** new
  `oat-project-*` candidates across 18 files (largest contributors:
  `oat-brainstorm/SKILL.md` 5, `oat-wave-execute/SKILL.md` 4,
  `oat-repo-improve/SKILL.md` 3, `oat-docs-bootstrap/SKILL.md` 3,
  `oat-worktree-bootstrap-auto/SKILL.md` 3). Each would need a classified matrix
  row. That is a separate outcome and is out of scope; Step 5 widens the fence
  scan only.
- Discriminator evidence, measured over all 214 markdown files found by a recursive walk of
  `.agents/skills` at the inspected `HEAD` (bare fences that swallow a
  `#{2,6}` heading):

  | File:line                                                 | Ticks | Blank gap | Verdict                                                                             |
  | --------------------------------------------------------- | ----- | --------- | ----------------------------------------------------------------------------------- |
  | `oat-doctor/SKILL.md:231`                                 | 3     | no        | legitimate console dashboard                                                        |
  | `oat-project-document/SKILL.md:434`                       | 3     | no        | legitimate console template (the test comment cites this as `:423`; live is `:434`) |
  | `oat-project-review-provide/SKILL.md:1084`                | 4     | no        | defect                                                                              |
  | `oat-repo-knowledge-index/SKILL.md:515`                   | 4     | yes       | defect                                                                              |
  | `create-agnostic-skill/references/skill-template.md:178`  | 3     | no        | defect                                                                              |
  | `oat-repo-improve/references/plan-template.md:205`        | 4     | no        | defect                                                                              |
  | `oat-agent-instructions-apply/.../glob-scoped-rule.md:48` | 3     | no        | defect (blank-gap shape, caught by rule 2 once in inventory)                        |

  A `ticks >= 4` discriminator misses the two three-backtick defects **and**
  produces three false positives once `oat-repo-knowledge-index` is repaired
  correctly: the repaired agent-prompt blocks at `:373-420`, `:424-471`, and
  `:475-515` are bare four-backtick fences that legitimately contain
  `## Include frontmatter:`. Verified by replaying the repair in a scratch copy
  and re-running the rule. The discriminator that separates all seven rows with
  no false positive is **the first non-blank line of the fenced body**: a defect
  opens directly onto a `##`-or-deeper heading; a legitimate console or prompt
  template opens onto template content (`━━━`, `subagent_type:`, `/skill-name`).

## Dependencies

| Type                  | Dependency                                                                                                                                                               | Required state                                                                                                                 | Current state                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Soft ordering         | [Tighten the skill version validators](./2026-09-08-tighten-the-skill-version-validators.md)                                                                             | Never in the same wave-7 parallel group as this lane: both write version pins in `packages/cli/src/validation/skills.test.ts`. | Authored in the same wave; serialize at composition.                                  |
| Soft ordering         | Any other wave-7 lane that writes `packages/cli/src/validation/skills.test.ts` version pins — the skill-version validator lane above, the doctor lane, and the seal lane | Never in one parallel group with this lane; the wave composer serializes all four.                                             | Recorded; enforced by wave composition, not by this plan.                             |
| Satisfied predecessor | `DR-260906-one-version-bump-per-changed`                                                                                                                                 | Accepted, so a later lane in the same PR carries an already-bumped value rather than re-bumping.                               | Accepted (`.oat/repo/reference/decisions/DR-260906-one-version-bump-per-changed.md`). |

No unsatisfied hard dependency remains, so `oat_execution_status` is `READY`.

## Landing-event impact

| Event                                                                        | Affected | Files in common                                                                                    | Required update                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR #190 (ReviewPlan Stage A compatibility release, OPEN draft) lands         | Major    | `.agents/skills/oat-project-review-provide/SKILL.md`, `packages/cli/src/validation/skills.test.ts` | Re-derive every `review-provide/SKILL.md` line anchor in this plan (`:990`, `:1019`, `:1040`, `:1082`, `:1084`, `:1183`, `:1194`) by re-running the fence trace in Step 1, and re-read the review-provide version pins before moving them. Do not apply the recorded line numbers. |
| PR #273 (provider-neutral remote project management, OPEN) lands             | None     | none — it touches `oat-doctor/SKILL.md` and `oat-pjm-remote/**` only                               | No update. Confirm with `gh api --paginate repos/voxmedia/open-agent-toolkit/pulls/273/files --jq '.[].filename'` before starting.                                                                                                                                                 |
| PR #125 (oat-brainstorm visual companion, OPEN) lands                        | None     | none — it touches `oat-brainstorm/**` and package version files                                    | No update.                                                                                                                                                                                                                                                                         |
| A wave-7 sibling lane that bumps one of this plan's five skills merges first | Minor    | the bumped `SKILL.md` and its `skills.test.ts` pin                                                 | Per `DR-260906-one-version-bump-per-changed`, carry the already-bumped value and move no pin for that skill.                                                                                                                                                                       |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat c9f2e147ac0674e73a60735e0c1727ccc6048756..origin/main -- \
  .agents/skills/oat-project-review-provide/SKILL.md \
  .agents/skills/oat-repo-knowledge-index/SKILL.md \
  .agents/skills/oat-repo-improve/SKILL.md \
  .agents/skills/oat-repo-improve/references/plan-template.md \
  .agents/skills/create-agnostic-skill/SKILL.md \
  .agents/skills/create-agnostic-skill/references/skill-template.md \
  .agents/skills/oat-agent-instructions-apply/SKILL.md \
  .agents/skills/oat-agent-instructions-apply/references/instruction-file-templates/glob-scoped-rule.md \
  packages/cli/src/validation/named-skill-load-contract.test.ts \
  packages/cli/src/validation/skills.test.ts
```

Expected at the authored commit: empty output. Any non-empty result means at
least one cited line anchor may have moved; re-derive the fence topology with
Step 1 before editing that file. Executing inside a wave, run the same diff from
the actual execution `HEAD` after predecessor lanes integrate, not only from the
authored SHA.

## Repository conventions

- Build: `pnpm build` → all packages build; required before `pnpm test:smoke`
  or `pnpm test:release`.
- Typecheck: `pnpm type-check` → passes across all packages.
- Focused test: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/named-skill-load-contract.test.ts`
  → all cases pass.
- Full lane gates (lane mode, see "Wave execution" below): `pnpm check`,
  `pnpm type-check`, `HOME=$(mktemp -d) pnpm exec turbo run test --force`,
  `pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`,
  `pnpm oat:validate-skills`.
- Lint/format check (non-mutating): `pnpm lint` and `pnpm format`. Both are
  required here because `pnpm format` is the only gate that covers
  `.agents/skills/**/*.md`, and CI runs neither.
- Skill versioning: one `metadata.version` bump per changed canonical skill per
  PR. The top-level `version:` key is gone from bundled skills since CLI 0.2.65;
  every skill in scope here already declares `metadata.version`. Per
  `DR-260906-one-version-bump-per-changed`, a later lane in the same PR carries
  an earlier lane's bump and moves no pin.
- Locating pins: search the **old version literal** across `packages/cli/src`,
  `tools/smoke`, and `.agents/skills/*/tests` — never by skill name alone.
- `DR-260906-standing-claims-in-skills-name`: a standing claim added to a skill
  needs a named executable backstop.
- `packages/cli/assets/skills/` is a build artifact produced by
  `pnpm build`; it is untracked and must not be hand-edited.
- Never run `oxfmt` on an OAT `state.md`. Formatting `.agents/skills/**/*.md` is
  correct and required.
- Git/PR convention: this lane commits on its worktree branch. Do not push or
  open a PR; the wave fan-in owns that.

## Scope

### In scope

- `.agents/skills/oat-project-review-provide/SKILL.md` — fence repair at
  `:1040` (insert opener) and `:1084`/`:1194` (narrow closers); `metadata.version`
  bump.
- `.agents/skills/oat-repo-knowledge-index/SKILL.md` — normalize the Step 5b
  agent-prompt fence family at `:361`, `:369`, `:373`, `:420`, `:424`, `:471`,
  `:475`, `:580`; `metadata.version` bump.
- `.agents/skills/oat-repo-improve/references/plan-template.md` — delete the
  premature closer at `:107`, normalize `:244`.
- `.agents/skills/oat-repo-improve/SKILL.md` — `metadata.version` bump only.
- `.agents/skills/create-agnostic-skill/references/skill-template.md` — delete
  `:119`, widen `:178`, delete `:216`.
- `.agents/skills/create-agnostic-skill/SKILL.md` — `metadata.version` bump only.
- `.agents/skills/oat-agent-instructions-apply/references/instruction-file-templates/glob-scoped-rule.md`
  — delete `:40`, widen `:48`, delete `:59`.
- `.agents/skills/oat-agent-instructions-apply/SKILL.md` — `metadata.version`
  bump only.
- `packages/cli/src/validation/named-skill-load-contract.test.ts` — new fence
  defect shape, a separate fence-scan inventory, its own floor, new fixture
  cases, deletion of the `Recommended Next Step` matrix row, and refreshed
  comments.
- `packages/cli/src/validation/skills.test.ts` — version pins for the bumped
  skills, located by old literal.

### Out of scope

- Widening `collectBoundedFiles` (the named-skill _candidate_ corpus) beyond
  `oat-project-*` + `create-oat-skill` — measured at 33 new unclassified
  candidates needing 33 classified matrix rows; that is an independent outcome.
- Any prose, step, or behavior change inside the recovered regions. This plan
  changes fence markers, one matrix row, one scanner, and version numbers.
  Recovering a section must not be used as an occasion to rewrite it.
- `.agents/agents/*.md`, `.oat/templates/**`, and `apps/oat-docs/docs/**`. A
  sweep with the new rule found bare-fence-swallows-heading shapes at
  `.agents/agents/oat-codebase-mapper.md:246`,
  `.agents/agents/oat-reviewer.md:475` and `:507`,
  `.agents/agents/skeptical-evaluator.md:81`, and
  `.oat/templates/docs-app-mkdocs/docs/contributing.md:107`. They are real and
  should be filed as a follow-up backlog item, but the item, the scanner, and
  this lane are all scoped to `.agents/skills`. Do not repair them here.
- `packages/cli/assets/skills/**` — a `pnpm build` artifact.
- The lockstep public package version bump and the release gates — the wave
  fan-in owns both.

## Current state

`packages/cli/src/validation/named-skill-load-contract.test.ts` is a
2,969-line contract test that sweeps a bounded corpus of lifecycle skills for
sentences that name an `oat-project-*` skill next to an execution verb, and
requires every such sentence to be classified by an enumerated matrix row. It
carries a second, structural guarantee: a stray fence would silently delete an
arbitrary span from that sweep, so `findFenceDefects` fails the suite on two
fence shapes. Four suite-level cases consume it:

- `:2504` classifies every candidate and asserts `corpusShortfalls` is empty;
- `:2526` checks load-required clauses;
- `:2533` asserts every matrix row binds to exactly one live call site;
- `:2545` rejects the duplicated-closer stray-fence shape.

Fixture cases at `:2887` (stray fence), `:2922` (unclosed fence), `:2935`
(corpus floor), and `:2950` (dead row) build temporary roots through
`writeFixtureSkill`, so they exercise the same functions against a synthetic
`.agents/skills` tree.

The comment block at `:229-263` already documents this defect precisely,
including the indivisibility of the review-provide repair. It names stale line
anchors (a uniform +27 drift) and prescribes a `>= 4` discriminator that this
plan's live measurement disproves. Both the anchors and the prescription are
rewritten in Step 6.

The five markdown surfaces are all bundled canonical skills with
`metadata.version` frontmatter:

| Skill                          | Current `metadata.version` | Pins located by old literal                               |
| ------------------------------ | -------------------------- | --------------------------------------------------------- |
| `oat-project-review-provide`   | `1.5.6`                    | `skills.test.ts:2866`, `:3028`, `:4544`, `:5857`, `:5871` |
| `oat-repo-knowledge-index`     | `1.3.1`                    | none                                                      |
| `oat-repo-improve`             | `2.1.4`                    | `skills.test.ts:6107`                                     |
| `create-agnostic-skill`        | `1.4.3`                    | none                                                      |
| `oat-agent-instructions-apply` | `1.7.1`                    | none                                                      |

Two other suites read these files and must keep passing:
`packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
asserts `## Dependencies`, `## Landing-event impact`,
`## Revalidation Before Execution`, and `## Source and live evidence` each occur
exactly once as a whole line in `plan-template.md` (`:2630-2641`, `:2695-2700`)
and extracts the **first** ` ```yaml ` block (`:2645`); all four checks are
line- or text-based and are unaffected by re-fencing.
`packages/cli/src/commands/init/tools/shared/create-agnostic-skill-bundle-contract.test.ts:29-45`
asserts `skill-template.md` contains `references/docs/skills-guide.md` and does
not contain `.agents/docs/skills-guide.md` — both `toContain` checks over raw
text, likewise unaffected.

### Weaker-anywhere rule

`findFenceDefects` is a guard. Any input this change makes the guard **accept**
that it previously **rejected** is a Critical regression, even when the change
tightens the guard elsewhere. Concretely: the existing blank-gap orphan rule and
the unclosed-fence rule must both survive verbatim, and both fixture cases at
`:2887` and `:2922` must still fail on their fixtures. The new shape is added
with `||`, never by rewriting the existing condition.

## Implementation steps

Execute in order. Steps 1–5 leave the repository green at every boundary except
the deliberate red controls in Step 8.

### 1. Record the pre-fix fence topology as the negative-control baseline

Write a throwaway tracer in a `mktemp -d` scratch directory that replays
CommonMark's fence rule over a file and prints every `opener .. closer` span
with its swallowed line count and the first non-blank body line. Run it over all
ten in-scope markdown paths and save the output; it is the red half of the
Step 8 controls and the authority for every line number you edit. Do not reuse
the line numbers in this plan without re-deriving them here.

**Verify:** the tracer reports, at minimum,
`oat-project-review-provide/SKILL.md 1084..1194`,
`oat-repo-knowledge-index/SKILL.md 515..580`,
`oat-repo-improve/references/plan-template.md 205..244`,
`create-agnostic-skill/references/skill-template.md 178..216`, and
`oat-agent-instructions-apply/references/instruction-file-templates/glob-scoped-rule.md 48..59`.
If any span differs, stop and re-anchor before editing (STOP condition 1).

### 2. Repair `oat-project-review-provide/SKILL.md`

Three edits, no prose change:

1. Insert a line ` ```markdown ` immediately before `## Summary` (currently
   `:1040`), so the second half of the review-artifact template is fenced.
2. Narrow the four-backtick line after `Run the `oat-project-review-receive`
skill to convert findings into plan tasks.` (currently `:1084`, `:1085`
   after the insertion) to three backticks; it is now that block's closer.
3. Narrow the four-backtick line that closes the ` ```bash ` commit snippet
   (currently `:1194`, `:1195` after the insertion) to three backticks.

The distinction this preserves: `:1021-1038` is normative skill prose about
`oat_review_invocation` and the gate parsing contract and stays **outside** any
fence; `:1040-1082` is a printed artifact template and moves **inside** one.
Do not merge them into a single block.

**Verify:** re-run the Step 1 tracer on the file → the spans are
`990..1019 (```markdown)`, `1040..1085 (```markdown)`, `1184..1195 (```bash)`,
and no span opens at a bare four-backtick line. `grep -n '^### Step 8.5' `
returns a line, and the tracer reports that line as outside every fence.

### 3. Repair `oat-repo-knowledge-index/SKILL.md`

Normalize the Step 5b agent-prompt family so each of the four prompt templates
is one four-backtick block containing three-backtick inner examples. Change only
fence markers:

| Line   | From     | To        | Role                                            |
| ------ | -------- | --------- | ----------------------------------------------- |
| `:327` | ` ` ```` | unchanged | agent 1 opener                                  |
| `:361` | ` ` ```` | ` ` ```   | closes the `stack.md` ` ```markdown ` at `:359` |
| `:369` | ` ` ```  | ` ` ````  | agent 1 closer                                  |
| `:373` | ` ` ```  | ` ` ````  | agent 2 opener                                  |
| `:420` | ` ` ```  | ` ` ````  | agent 2 closer                                  |
| `:424` | ` ` ```  | ` ` ````  | agent 3 opener                                  |
| `:471` | ` ` ```  | ` ` ````  | agent 3 closer                                  |
| `:475` | ` ` ```  | ` ` ````  | agent 4 opener                                  |
| `:515` | ` ` ```` | unchanged | agent 4 closer                                  |
| `:580` | ` ` ```` | ` ` ```   | closes the ` ```python ` at `:538`              |

**Verify:** the tracer reports exactly `327..369`, `373..420`, `424..471`,
`475..515` as four-backtick blocks and `538..580` as ` ```python `, and
`### Step 6:` / `### Step 6b:` are outside every fence.

### 4. Repair the three template references

Each has the same shape: a premature closer inside the template, a bare fence
that should have been the real closer, and (in two of them) a leftover marker on
the file's last line.

- `.agents/skills/oat-repo-improve/references/plan-template.md` — delete `:107`
  (the premature four-backtick closer). `:205` becomes the template's closer.
  Narrow `:244` from four backticks to three so it matches the
  ` ```markdown ` opener at `:211`.
- `.agents/skills/create-agnostic-skill/references/skill-template.md` — delete
  `:119` (premature four-backtick closer); widen `:178` from three backticks to
  four so it closes the ` ````markdown ` opener at `:25`; delete `:216` (the
  leftover marker on the last line).
- `.agents/skills/oat-agent-instructions-apply/references/instruction-file-templates/glob-scoped-rule.md`
  — delete `:40` (premature four-backtick closer); widen `:48` from three
  backticks to four so it closes the ` ````markdown ` opener at `:9`; delete
  `:59` (the leftover marker on the last line).

In all three, the authoring guidance that follows the template (`## Multi-Plan
Index`, `## Detail Level Guidelines`, `## Guidance`) stays **outside** the
fence, and the template sections stay **inside** it. That is the distinction the
repair restores; do not fence the guidance.

**Verify:** the tracer reports `46..205 (````markdown)` and `211..244
(```markdown)` for `plan-template.md`; `25..178 (````markdown)` for
`skill-template.md`; `9..48 (````markdown)` for `glob-scoped-rule.md`; and no
unclosed fence and no bare opener in any of the three.
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts src/commands/init/tools/shared/create-agnostic-skill-bundle-contract.test.ts`
→ passes.

### 5. Split the fence-scan inventory from the candidate corpus

In `packages/cli/src/validation/named-skill-load-contract.test.ts`:

1. Add `collectFenceScanFiles(repoRoot)` beside `collectBoundedFiles`
   (`:353-388`). It walks `.agents/skills` **recursively** and returns every
   `*.md` file, sorted, repo-relative. Recursion is required:
   `glob-scoped-rule.md` lives at
   `oat-agent-instructions-apply/references/instruction-file-templates/`, two
   levels below `references/`.
2. Change `scanBoundedSurface` (`:397-413`) to compute `sections` and
   `candidates` from `collectBoundedFiles` exactly as today, and `fenceDefects`
   from `collectFenceScanFiles`. Return the fence-scan file list separately so
   the floor in step 3 can see it.
3. Extend `CorpusMinimums` (`:456-459`) and `corpusShortfalls` (`:465-482`) with
   a `fenceScanFiles` floor, and set it in `CORPUS_MINIMUMS` (`:2460`) below the
   live count with the same headroom convention the existing floors use (live
   count is 214; use 190). A glob regression that emptied the fence-scan list
   must fail on the shrinkage itself, exactly as it does for the bounded corpus.
4. Leave `collectBoundedFiles`, the matrix, `unclassified`, `deadRows`,
   `overMatchedRows`, and `missingClauses` reading the bounded corpus. Do not
   widen the candidate sweep.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/named-skill-load-contract.test.ts`
→ the corpus-floor fixture case at `:2935` still fails on its fixture with the
expected message, and no case reports a widened candidate count.

### 6. Add the after-prose defect shape and refresh the comment

In `findFenceDefects` (`:265-328`), keep the existing `orphan` condition
verbatim and add a second, `||`-joined shape:

- `info === ''` (a bare fence, unchanged), **and**
- the first non-blank line of `body` matches `/^#{2,6}\s/`.

Report it with its own `detail` string naming the shape (for example
`bare fence opens directly onto a heading; likely a closing fence read as an
opener`), so a failure says which rule fired. The blank-gap term stays on the
first shape only; the second shape must not require a preceding closing fence,
because that is precisely the blind spot.

Rewrite the comment at `:229-263` to: state both shapes; drop the resolved
"known uncovered live instance" paragraph; record why a fence-length
discriminator was rejected (it misses the two three-backtick defects and, after
the `oat-repo-knowledge-index` repair, falsely reports the three legitimate bare
four-backtick agent-prompt blocks at `:373`, `:424`, and `:475`); and name the
two legitimate three-backtick console templates the first-body-line rule spares
(`oat-doctor/SKILL.md:231`, `oat-project-document/SKILL.md:434`) with live
anchors, not the stale `:423`.

**Verify:** `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/named-skill-load-contract.test.ts`
→ all cases pass, including `:2545` over the now-widened fence-scan surface.

### 7. Delete the coupled matrix row and bump the five skills

1. Delete the matrix row at `:2217-2225`
   (`oat-project-review-provide/SKILL.md` / anchor `Recommended Next Step`).
   Its call site is now inside a fence, so `deadRows` would otherwise report it.
2. Bump `metadata.version` once per changed skill: `oat-project-review-provide`
   `1.5.6` → `1.5.7`; `oat-repo-knowledge-index` `1.3.1` → `1.3.2`;
   `oat-repo-improve` `2.1.4` → `2.1.5`; `create-agnostic-skill` `1.4.3` →
   `1.4.4`; `oat-agent-instructions-apply` `1.7.1` → `1.7.2`. A `references/`
   edit is a change to its owning skill, so `oat-repo-improve`,
   `create-agnostic-skill`, and `oat-agent-instructions-apply` are bumped even
   though their `SKILL.md` bodies are untouched.
3. For each skill, sweep the **old** literal across `packages/cli/src`,
   `tools/smoke`, and `.agents/skills/*/tests` in plain and regex-escaped forms,
   and move every pin that belongs to that skill. Expected: five pins for
   `oat-project-review-provide` (`skills.test.ts:2866`, `:3028`, `:4544`,
   `:5857`, `:5871`), one for `oat-repo-improve` (`skills.test.ts:6107`), none
   for the other three. If a lane earlier in the same PR already bumped one of
   these skills, carry its value and move no pin
   (`DR-260906-one-version-bump-per-changed`).

**Verify:**

```bash
for v in 1.5.6 1.3.1 2.1.4 1.4.3 1.7.1; do
  echo "== $v"
  grep -rn --fixed-strings "$v" packages/cli/src tools/smoke .agents/skills/*/tests || true
done
```

→ no hit refers to any of the five skills.
`pnpm run check:skill-bumps` → exit 0 with five changed skills reported as
bumped.

### 8. Prove each new guarantee can fail, then restore

Run these as reproduction-grade controls in the working tree, capturing exit
codes explicitly, and revert each before continuing:

1. **After-prose shape.** Re-introduce the `oat-project-review-provide:1084`
   four-backtick opener (revert Step 2). The focused suite must fail with the
   new detail string. Restore.
2. **Recursive inventory.** Restore Step 4's `glob-scoped-rule.md` defect while
   the repairs elsewhere stand. The focused suite must fail naming that file.
   Restore. Then, separately, change `collectFenceScanFiles` to a
   non-recursive walk; the suite must pass, proving that a non-recursive
   inventory is what hid the file. Restore recursion.
3. **Weaker-anywhere.** Restore the `oat-repo-knowledge-index:515` blank-gap
   defect. The suite must still fail, proving the original rule 2 survived.
   Restore.
4. **Coupled row.** With Step 2 applied, restore the deleted matrix row. The
   suite must fail with `no longer bind to a live call site`. Re-delete.
5. **Fence-scan floor.** Point `collectFenceScanFiles` at an empty directory.
   The suite must fail with the fence-scan shortfall message. Restore.

**Verify:** each control is recorded with its exact command, its exit code, and
the assertion message that fired; all five are green again afterwards.

### 9. Format and run the lane gates

```bash
pnpm exec oxfmt --write \
  .agents/skills/oat-project-review-provide/SKILL.md \
  .agents/skills/oat-repo-knowledge-index/SKILL.md \
  .agents/skills/oat-repo-improve/SKILL.md \
  .agents/skills/oat-repo-improve/references/plan-template.md \
  .agents/skills/create-agnostic-skill/SKILL.md \
  .agents/skills/create-agnostic-skill/references/skill-template.md \
  .agents/skills/oat-agent-instructions-apply/SKILL.md \
  .agents/skills/oat-agent-instructions-apply/references/instruction-file-templates/glob-scoped-rule.md
```

Then run, capturing each exit code explicitly:

```bash
pnpm check                                   > /tmp/g1.log 2>&1; echo "exit=$?"
pnpm type-check                              > /tmp/g2.log 2>&1; echo "exit=$?"
HOME=$(mktemp -d) pnpm exec turbo run test --force > /tmp/g3.log 2>&1; echo "exit=$?"
pnpm run check:skill-bumps                   > /tmp/g4.log 2>&1; echo "exit=$?"
pnpm lint                                    > /tmp/g5.log 2>&1; echo "exit=$?"
pnpm format                                  > /tmp/g6.log 2>&1; echo "exit=$?"
pnpm oat:validate-skills                     > /tmp/g7.log 2>&1; echo "exit=$?"
```

**Verify:** every gate reports `exit=0`, and `/tmp/g3.log` shows a real run
(no `cache hit, replaying logs`, no `>>> FULL TURBO`). If `oxfmt --write`
produced a diff beyond the fence markers, inspect it before accepting: fencing a
region stops oxfmt reflowing it, so a large prose diff means a marker landed in
the wrong place.

## Test plan

All changes live in
`packages/cli/src/validation/named-skill-load-contract.test.ts` and
`packages/cli/src/validation/skills.test.ts`.

**Changed cases**

- `named-skill-load-contract.test.ts:2545`
  (`rejects the duplicated-closer stray-fence shape across the bounded surface`)
  — retitle to name the widened surface and both shapes. Red control: the Step 8
  control 1 revert; the case must fail with the new detail string and pass once
  restored.
- `named-skill-load-contract.test.ts:2533`
  (`keeps every matrix row bound to exactly one live call site`) — unchanged
  code, but its input changes when the `Recommended Next Step` row is deleted.
  Red control: Step 8 control 4.
- `named-skill-load-contract.test.ts:2935`
  (`fails when the bounded corpus shrinks below its floor`) — extend to assert
  the new fence-scan shortfall message alongside the two existing ones. Red
  control: Step 8 control 5.
- `skills.test.ts:2866`, `:3028`, `:4544`, `:5857`, `:5871`, `:6107` — version
  pins move. Red control: leaving a pin at the old literal makes the case fail
  with the old-versus-new value pair.

**New cases** in the fixture `describe` at the end of
`named-skill-load-contract.test.ts` (pattern: the existing `:2887` case, which
builds a temp root through `writeFixtureSkill` and asserts
`assertContractCurrent` rejects):

1. `fails on a bare fence that opens onto a heading after prose` — fixture: a
   compliant skill, a closed ` ````markdown ` block, a paragraph of prose,
   then a bare ` ```` ` line, a blank line, and `### Step 2: Hidden`, then a
   closing ` ```` `. Proves the shape rule 2 structurally cannot see. Red
   control: revert the `||` clause added in Step 6 — the case must pass-through
   (no rejection) and therefore fail.
2. `spares a printed console template that legitimately contains headings` —
   fixture: a bare ` ``` ` fence whose first body line is `━━━` and which
   contains `## Installed Packs`. Must **not** be reported. This is the false
   positive a `>= 4` or a bare-fence-swallows-heading rule would produce; the
   case pins the discriminator. Red control: replace the first-body-line test
   with `body.some(isHeading)` — the case must fail.
3. `spares a bare four-backtick prompt template whose body opens on content` —
   fixture reproducing the repaired `oat-repo-knowledge-index` agent-prompt
   shape: a bare ` ```` ` fence opening on `subagent_type: "Explore"` and
   containing `## Include frontmatter:`. Must not be reported. Red control:
   substitute the `ticks >= 4` discriminator — the case must fail. This is the
   executable form of the disproof of the item's acceptance criterion 2.
4. `scans skill markdown nested below references/` — fixture writes a defect at
   `.agents/skills/oat-fixture/references/templates/x.md` and asserts it is
   reported. Red control: Step 8 control 2's non-recursive walk.

**Focused command**

`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/named-skill-load-contract.test.ts src/validation/skills.test.ts`
→ all cases pass.

**Full relevant suite**

`HOME=$(mktemp -d) pnpm exec turbo run test --force` → passes with no cache
replay.

## Done criteria

- [ ] The Step 1 tracer, re-run after Step 4, reports zero bare-fence openers
      and zero unclosed fences across all 214 markdown files under
      `.agents/skills`.
- [ ] `.agents/skills/oat-project-review-provide/SKILL.md` renders
      `### Step 8.5`, `### Step 9`, and `### Step 9.5` outside every fence, and
      `## Summary` through `## Recommended Next Step` inside one.
- [ ] `## Multi-Plan Index` (plan-template), `## Detail Level Guidelines`
      (skill-template), `## Guidance` (glob-scoped-rule), and
      `### Step 6`/`### Step 6b` (knowledge-index) are outside every fence.
- [ ] `findFenceDefects` reports the after-prose shape and still reports both
      pre-existing shapes; all five Step 8 controls are recorded red-then-green.
- [ ] The `Recommended Next Step` matrix row is deleted in the same commit as
      the review-provide repair.
- [ ] `collectBoundedFiles` is unchanged and the candidate count is 191
      (192 minus the one deleted row's sentence).
- [ ] Five `metadata.version` bumps, six pins moved, and
      `grep -rn --fixed-strings` over the five old literals returns no hit
      belonging to those skills.
- [ ] `pnpm check`, `pnpm type-check`, forced `turbo run test`,
      `pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`, and
      `pnpm oat:validate-skills` each report `exit=0`, with the test log showing
      a real run.
- [ ] `git status --short` contains no unexplained or out-of-scope file.

## STOP conditions

Stop and report instead of improvising when:

1. the Step 1 tracer reports a span that differs from the recorded topology for
   any in-scope file — the anchors have drifted and the edits would land in the
   wrong place;
2. repairing a fence would require changing any word of prose, or the correct
   nesting is genuinely ambiguous for a file — the boundary between printed
   template and normative prose is the whole point of this lane, and guessing it
   wrong ships a worse defect than the one being fixed;
3. the widened fence scan reports a file outside the five in scope — resolve it
   as a scope question before editing, do not repair it silently;
4. deleting the `Recommended Next Step` row leaves any other matrix row dead, or
   `unclassified` becomes non-empty — the fence boundary moved further than
   intended;
5. any Step 8 control fails to go red, or fails to return green after
   restoration;
6. `pnpm format` reports a diff in a file this plan did not name;
7. a wave sibling has already bumped one of the five skills and its pin state is
   ambiguous;
8. live state materially contradicts the verified evidence or drift assumptions;
9. a named verification gate fails twice after one bounded correction.

## Revalidation Before Execution

Revalidate against live state before executing when:

- substantial time passes after `2026-09-08`;
- `origin/main` advances materially from
  `c9f2e147ac0674e73a60735e0c1727ccc6048756`;
- PR #190 lands (see `## Landing-event impact` — it rewrites
  `oat-project-review-provide/SKILL.md`, `oat-project-implement/**`, and
  `skills.test.ts`, invalidating every review-provide anchor and possibly a pin);
- a dependency named in `## Dependencies` changes state;
- any cited line anchor, step number, or section order in an in-scope file
  changes;
- a load-bearing evidence claim — especially the seven-row discriminator table —
  cannot be reproduced by the Step 1 tracer.

Executing inside a wave, refresh the drift check against the exact execution
`HEAD` after predecessor lanes integrate and record that comparison rather than
re-stamping the authored provenance.

## Wave execution

This plan runs as a **lane in wave 7**, in a worktree at
`.worktrees/wave-7/<lane>`, in **lane mode**: run the focused tests plus
`pnpm check`, `pnpm type-check`, forced `turbo run test`,
`pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`, and
`pnpm oat:validate-skills`. The wave fan-in owns the lockstep public package
version bump and the release gates (`pnpm release:check-versions`,
`pnpm release:validate`, `pnpm build:docs`); this lane must not run or attempt
them. A root review follows the lane.

Because this lane writes `packages/cli/src/validation/skills.test.ts`, it must
be serialized against the three sibling lanes named in `## Dependencies` — never
composed into the same parallel group.

## Review focus

- **The template/prose boundary in each of the five files.** For every recovered
  region, confirm the content that moved inside a fence is a printed artifact
  and the content that stayed outside is an instruction the agent must follow.
  A reviewer should read `review-provide/SKILL.md:1021-1038` and `:1040-1082`
  side by side and confirm they landed on opposite sides.
- **Weaker-anywhere on `findFenceDefects`.** Diff the function and confirm the
  pre-existing blank-gap and unclosed-fence conditions are byte-identical and
  that the new shape is `||`-joined. Any input that was rejected before and is
  accepted now is Critical.
- **The discriminator.** Confirm test case 3 in the Test plan exists and fails
  under a `ticks >= 4` rule. Without it, a future maintainer will re-adopt the
  discriminator the item asked for and break the repaired
  `oat-repo-knowledge-index`.
- **Inventory split.** Confirm `collectBoundedFiles` is unchanged and that no
  new matrix row was added. A widened candidate corpus is a different, larger
  change wearing this one's clothes.
- **Prose immutability.** `git diff -w` over the five markdown files should show
  only fence-marker lines added, deleted, or re-ticked, plus the
  `metadata.version` lines.
- **Deferred follow-up.** Five bare-fence-swallows-heading instances outside
  `.agents/skills` (three in `.agents/agents/`, one in
  `.oat/templates/docs-app-mkdocs/`) are recorded in `## Scope` and left
  unrepaired. Confirm a backlog item is filed rather than the sweep being
  silently declared complete.
