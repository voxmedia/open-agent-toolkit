---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/archived/BL-260906-repair-the-stray-fence-in-oat.md
oat_external_plan_commit: a594614024725979ebf24bd9a34b3565c30fbffb
oat_external_plan_main_commit: 7d70ac307717b95917b8f92aa3fb9f236d1f75ba
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
> The `Soft` rows record ordering only: seven other wave-7 lanes write
> `packages/cli/src/validation/skills.test.ts`, two of them also write files
> this lane repairs or bumps, so this lane is never composed into a parallel
> group with any of them.

## Outcome

Five canonical markdown surfaces under `.agents/skills` stop hiding normative
prose inside code fences. `oat-project-review-provide/SKILL.md` renders Steps
8.5, 9, and 9.5 as live instructions and its review-artifact template as a
fenced block instead of the inverse. `oat-repo-knowledge-index/SKILL.md`,
`oat-repo-improve/references/plan-template.md`,
`create-agnostic-skill/references/skill-template.md`, and
`oat-agent-instructions-apply/references/instruction-file-templates/glob-scoped-rule.md`
each recover the sections a stray fence swallowed. The `findFenceDefects`
scanner in `packages/cli/src/validation/named-skill-load-contract.test.ts`
gains a third defect shape that catches the after-prose form the current rules
structurally cannot see, and its fence-scan inventory widens from the
`oat-project-*` + `create-oat-skill` bounded corpus (42 files) to every regular
markdown file under `.agents/skills` (205 files), so this defect class cannot
hide in an unscanned directory again. The named-skill candidate corpus and its
classification matrix stay exactly as bounded as they are today.

## Source and live evidence

- Source backlog item:
  [BL-260906-repair-the-stray-fence-in-oat — Repair the stray fence in oat-project-review-provide and tighten the fence rule repo-wide](../../pjm/backlog/archived/BL-260906-repair-the-stray-fence-in-oat.md)
- Inspected `HEAD`: `a594614024725979ebf24bd9a34b3565c30fbffb` — the tree whose
  content this plan read (branch `wave-7-plans`).
- Comparison baseline: `7d70ac307717b95917b8f92aa3fb9f236d1f75ba` — the fetched
  `origin/main` tip (PR #273 merged 2026-09-08), which is also the merge-base;
  `HEAD` differs from it only by commits under `.oat/repo/`. Every source file
  this plan cites is byte-identical on the two.
- Planning date: `2026-09-08`
- Working tree while planning: `git status --porcelain` was empty at the
  inspected `HEAD`. Other reviewers were rewriting sibling plans under
  `.oat/repo/reference/external-plans/` concurrently; none of those paths is a
  surface of this plan.

### Corrections to the source item

The item's evidence is directionally right and numerically stale. Plan against
the values below, re-derived at the inspected `HEAD` with a CommonMark fence
tracer (Step 1 rebuilds it).

| Item claim                                                                                   | Live fact at `a59461402`                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `review-provide/SKILL.md:1057` opens, `:1167` closes, template at `:1013-1055`               | opener `:1084`, closer `:1194`, template body `:1040-1082` (a uniform +27-line drift; the same +27 drift applies to the stale anchors in the test's own comment at `named-skill-load-contract.test.ts:247-256`)                                                                                                                                                                                                       |
| `oat-repo-knowledge-index/SKILL.md:514`                                                      | `:515` (closes at `:580`)                                                                                                                                                                                                                                                                                                                                                                                             |
| `oat-repo-improve/references/plan-template.md:149`                                           | `:205` (closes at `:244`)                                                                                                                                                                                                                                                                                                                                                                                             |
| "a create-oat-skill reference"                                                               | Wrong skill. `create-oat-skill/references/oat-skill-template.md` and `create-oat-skill/SKILL.md` are both fence-balanced. The real instance is `create-agnostic-skill/references/skill-template.md:178`                                                                                                                                                                                                               |
| "three more spurious fences of the same class"                                               | Four. A fourth, unrecorded instance sits at `oat-agent-instructions-apply/references/instruction-file-templates/glob-scoped-rule.md:48`                                                                                                                                                                                                                                                                               |
| Acceptance criterion 2: catch "a bare fence of length >= 4 that swallows a `#{2,6}` heading" | **This discriminator is wrong.** Measured below: it misses the two three-backtick defects, and after the correct `oat-repo-knowledge-index` repair it reports three legitimate bare four-backtick agent-prompt blocks that contain `## Include frontmatter:`. Use the first-non-blank-body-line discriminator in Step 6 instead; the acceptance criterion is satisfied by the rule that actually separates the corpus |

### Verified evidence

Fence topology was re-derived by replaying CommonMark's fence rule (same
character, closer length `>=` opener length, closer carries no info string)
over each file. Every span below is `opener .. closer` with the count of
swallowed lines.

- `.agents/skills/oat-project-review-provide/SKILL.md`
  — fence lines in the region: `:990(```markdown) :1019(```) :1084(````)
:1183(```bash) :1194(````) :1200(```)`. `:990..:1019` fences the
  review-artifact frontmatter and header. `:1021-1038` is normative prose
  about `oat_review_invocation` and the gate parsing contract. `:1040-1082` is
  the **rest of the same review-artifact template** (`## Summary`,
  `## Findings`, `### Critical`/`Important`/`Medium`/`Minor`,
  `## Spec/Design Alignment`, `## Verification Commands`,
  `## Recommended Next Step`) with **no opening fence**, so it renders as live
  headings of the skill. `:1084` is a bare four-backtick fence that therefore
  reads as an _opener_; it closes at `:1194`, swallowing 109 lines that include
  `### Step 8.5: Validate Review Orchestration and Append Root Log` (`:1086`),
  `### Step 9: Update Plan Reviews Section` (`:1121`), and
  `### Step 9.5: Commit Review Bookkeeping Atomically (Required)` (`:1156`).
  `:1183(```bash) .. :1194(````)` is the commit snippet whose closer is the same
  four-backtick line.
- `.agents/skills/oat-repo-knowledge-index/SKILL.md`
  — Step 5b renders four subagent prompt templates. Fence lines: `:327(````)
:359(```markdown) :361(````) :365(```markdown) :367(```) :369(```) :373(```)
:410(```markdown) :412(```) :416(```markdown) :418(```) :420(```) :424(```)
:461(```markdown) :463(```) :467(```markdown) :469(```) :471(```) :475(```)
:511(```markdown) :513(```) :515(````) :538(```python) :580(````)`. Agent 1
  opens at `:327` with four backticks; its inner ` ```markdown ` at `:359` is
  closed by a four-backtick line at `:361`, which instead terminates the outer
  block. The cascade pairs the remaining three-backtick markers wrongly, and
  `:515` (four backticks, immediately after the closer at `:513` and a blank
  `:514`) reads as an opener rather than agent 4's closer. It closes at
  `:580`, swallowing 64 lines whose first non-blank line is `---` and which
  include `### Step 6: Wait for Agent Completion` (`:519`),
  `### Step 6b: Extract and Write Files (Read-Only Mode Only)` (`:532`), and
  the ` ```python ` extraction script at `:538`.
- `.agents/skills/oat-repo-improve/references/plan-template.md`
  — fence lines: `:17(```yaml) :32(```) :46(````markdown) :104(```bash)
:106(```) :107(````) :205(````) :211(```markdown) :244(````)`. `:46` opens the
  plan template; `:104..:106` is the drift-check snippet inside it; `:107` is a
  premature four-backtick closer, so `:108-204` — `## Repository conventions`,
  `## Scope`, `## Current state`, `## Implementation steps`, `## Test plan`,
  `## Done criteria`, `## STOP conditions`, `## Revalidation Before Execution`,
  `## Review focus` — render as real headings of `plan-template.md` itself.
  `:205` (bare, four backticks) then reads as an opener and closes at `:244`,
  swallowing 38 lines including `## Multi-Plan Index` (`:207`) and the
  ` ```markdown ` index block at `:211`. This is the enlarged region the item's
  2026-09-07 scope note describes.
- `.agents/skills/create-agnostic-skill/references/skill-template.md`
  — fence lines: `:25(````markdown) :116(```bash) :118(```) :119(````)
:133 :135 :137 :139 :143 :145 :147 :149 (all ```) :178(```) :216(```)`. `:25`
  opens the skill template; `:116..:118` is inside it; `:119` is a premature
  four-backtick closer, so `:121-177` (`### Step 2`, `### Step 3`,
  `## Examples`, `### Basic Usage`, `### Conversational`, `## Reference`,
  `## Troubleshooting`, `## Success Criteria`, and the four example pairs at
  `:133-149`) render as live content. `:178` (bare, three backticks) then
  opens and closes at `:216` (the file's last line), swallowing 37 lines
  including `## Detail Level Guidelines` (`:180`) and its table (`:182-187`).
- `.agents/skills/oat-agent-instructions-apply/references/instruction-file-templates/glob-scoped-rule.md`
  — fence lines: `:9(````markdown) :37(```{lang}) :39(```) :40(````)
:44(```{lang}) :46(```) :48(```) :59(```)`. `:9` opens the rule-body
  template; `:37..:39` is the `### Correct` example inside it; `:40` is a
  premature four-backtick closer, so `:42-47` (`### Incorrect` and its
  ` ```{lang} ` counter-example at `:44..:46`) render as live content. `:48`
  (bare, three backticks, one blank line after the `:46` closer) then opens
  and closes at `:59` (the file's last line), swallowing `## Guidance` and its
  eight bullets.
- `packages/cli/src/validation/named-skill-load-contract.test.ts:265-328`
  — `findFenceDefects` reports two shapes: an unclosed fence at EOF
  (`:318-325`) and an "orphan" (`:295-308`) that requires `info === ''`, a
  `gap` of only blank lines between the previous _closing_ fence and this
  opener, and a `##`-or-deeper heading in the body. The `gap.every(blank)`
  term is the blind spot for `review-provide:1084`, `plan-template:205`, and
  `skill-template.md:178`, which all open after prose. `knowledge-index:515`
  and `glob-scoped-rule.md:48` both open one blank line after a closing fence
  and **are** reported by rule 2 today; they are invisible only because they
  are outside the inventory.
- `packages/cli/src/validation/named-skill-load-contract.test.ts:353-388`
  — `collectBoundedFiles` walks `.agents/skills`, keeps directories whose name
  starts with `oat-project-`, adds each `SKILL.md` plus one non-recursive level
  of `references/*.md`, then appends `create-oat-skill/SKILL.md`. That list
  feeds `scanBoundedSurface` (`:397-413`), which computes sections,
  candidates, **and** fence defects from the same 42 files (count verified
  live by replaying the walk).
- `packages/cli/src/validation/named-skill-load-contract.test.ts:2217-2225`
  — the matrix row `{ file: '.agents/skills/oat-project-review-provide/SKILL.md',
anchor: 'Recommended Next Step', match: 'Run the `oat-project-review-receive`
skill to convert findings into plan tasks', classification: 'non-executing' }`
  binds to `SKILL.md:1082` — text that is live prose **only because** the
  template lost its opener. Fencing `:1040-1082` removes both the anchor and
  the candidate, so `deadRows` (`:499-506`) would report the row unless it is
  deleted in the same change. This is why the repair is indivisible.
- `packages/cli/src/validation/named-skill-load-contract.test.ts:2460`
  — `CORPUS_MINIMUMS = { files: 40, candidates: 150 }`. The bounded corpus is
  42 files (verified); the drafting author measured 192 candidates, and Step 1
  re-measures before the row is deleted. Deleting one matrix row removes one
  candidate, still far above the floor. The suite is green at the inspected
  `HEAD` (22 tests).
- Measured cost of the alternative inventory widening: extending
  `collectBoundedFiles` itself to every skill directory adds **33** new
  `oat-project-*` candidates across 18 files (largest contributors:
  `oat-brainstorm/SKILL.md` 5, `oat-wave-execute/SKILL.md` 4,
  `oat-repo-improve/SKILL.md` 3, `oat-docs-bootstrap/SKILL.md` 3,
  `oat-worktree-bootstrap-auto/SKILL.md` 3). Each would need a classified
  matrix row. That is a separate outcome and is out of scope; Step 5 widens
  the fence scan only.
- Inventory size: `git ls-files .agents/skills | grep -c '\.md$'` is 216
  entries at the inspected `HEAD` (214 at the prior baseline; PR #273 added
  `oat-pjm-remote/SKILL.md` and `oat-pjm-remote/references/external-action-protocol.md`).
  Eleven of those entries are symlinked files — ten `references/docs/*.md`
  links into `.agents/docs/` plus
  `oat-project-autonomous/references/gate-inventory.md` — and
  `oat-agent-instructions-apply/references/docs` is a symlinked directory, so
  `find .agents/skills -name '*.md' -type f` is **205** regular files. The new inventory scans regular files only (see
  Step 5); the symlink targets under `.agents/docs` are fence-clean today
  (8 files, zero defects) and are out of scope.
- Discriminator evidence, measured over every bare fence that swallows a
  `#{2,6}` heading in the 205 regular files, on the live tree and again on a
  scratch copy of `oat-repo-knowledge-index/SKILL.md` with Step 3's repair
  applied:

  | File:line                                                 | Ticks | Blank gap | Rule 2 today | First non-blank body line  | `ticks >= 4` rule | First-body-line rule | Verdict                                                      |
  | --------------------------------------------------------- | ----- | --------- | ------------ | -------------------------- | ----------------- | -------------------- | ------------------------------------------------------------ |
  | `oat-doctor/SKILL.md:231`                                 | 3     | no        | no           | `━━━`                      | no                | no                   | legitimate console dashboard                                 |
  | `oat-project-document/SKILL.md:434`                       | 3     | no        | no           | `━━━`                      | no                | no                   | legitimate console template (test cites `:423`)              |
  | `oat-project-review-provide/SKILL.md:1084`                | 4     | no        | no           | `### Step 8.5: …`          | yes               | yes                  | defect                                                       |
  | `oat-repo-knowledge-index/SKILL.md:515`                   | 4     | yes       | **yes**      | `---`                      | yes               | no                   | defect, caught by rule 2 once in inventory                   |
  | `create-agnostic-skill/references/skill-template.md:178`  | 3     | no        | no           | `## Detail Level …`        | no                | yes                  | defect                                                       |
  | `oat-repo-improve/references/plan-template.md:205`        | 4     | no        | no           | `## Multi-Plan Index`      | yes               | yes                  | defect                                                       |
  | `oat-agent-instructions-apply/.../glob-scoped-rule.md:48` | 3     | yes       | **yes**      | `## Guidance`              | no                | yes                  | defect, caught by rule 2 once in inventory                   |
  | repaired `knowledge-index:373`, `:424`, `:475`            | 4     | no        | no           | `subagent_type: "Explore"` | **yes**           | no                   | legitimate agent prompt (contains `## Include frontmatter:`) |

  Rule 2 plus the first-body-line rule separates every row correctly: rule 2
  catches the two blank-gap defects, the new rule catches the three
  after-prose defects, and neither fires on the two console templates or the
  three repaired agent-prompt blocks. `ticks >= 4` misses the two
  three-backtick defects and fires on the three repaired prompt blocks.

## Dependencies

| Type                  | Dependency                                                                                                     | Required state                                                                                                                                                                                                                                                                                                                                                                                                     | Current state                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Soft ordering         | [Tighten the skill version validators](./2026-09-08-tighten-the-skill-version-validators.md)                   | Never in one parallel group; both write `packages/cli/src/validation/skills.test.ts`. Whichever merges second re-anchors its pins on merge.                                                                                                                                                                                                                                                                        | Authored in the same wave; serialize at composition.                                  |
| Soft ordering         | [Calculate dispatch baselines after journaling](./2026-09-08-calculate-dispatch-baselines-after-journaling.md) | Never in one parallel group; both write `skills.test.ts` version pins. Re-anchor pins on merge.                                                                                                                                                                                                                                                                                                                    | Authored in the same wave.                                                            |
| Soft ordering         | [Read stdin in finalize-synced-archive](./2026-09-08-read-stdin-in-finalize-synced-archive.md)                 | Never in one parallel group; both write `skills.test.ts` version pins. Re-anchor pins on merge.                                                                                                                                                                                                                                                                                                                    | Authored in the same wave.                                                            |
| Soft ordering         | [Make the completion seal idempotent](./2026-09-08-make-the-completion-seal-idempotent.md)                     | Never in one parallel group; both write `skills.test.ts` pins, and that lane may also write `named-skill-load-contract.test.ts`. Re-anchor on merge.                                                                                                                                                                                                                                                               | Authored in the same wave.                                                            |
| Soft ordering         | [Reconcile the oat doctor example](./2026-09-08-reconcile-the-oat-doctor-example.md)                           | Never in one parallel group; both write `skills.test.ts`. Re-anchor on merge.                                                                                                                                                                                                                                                                                                                                      | Authored in the same wave.                                                            |
| Soft ordering         | [Keep plan writes on the caller's model](./2026-09-08-keep-plan-writes-on-the-callers-model.md)                | Never in one parallel group; both bump `oat-repo-improve` (`SKILL.md` `metadata.version`) and move its `skills.test.ts:6107` pin. One bump per skill per PR: whichever merges second carries the first lane's value and moves no pin.                                                                                                                                                                              | Authored in the same wave.                                                            |
| Soft ordering         | [Correct skill authoring facts](./2026-09-08-correct-skill-authoring-facts.md)                                 | Never in one parallel group; both write `skills.test.ts`, both bump `create-agnostic-skill`, and both edit `create-agnostic-skill/references/skill-template.md` — that lane edits the Detail Level table at `:182-187`, inside the region this lane re-fences. This lane merges **first** (line-level fence edits); that lane re-anchors. One bump: its `1.5.0` wins, and this lane carries it if it lands second. | Authored in the same wave.                                                            |
| Satisfied predecessor | `DR-260906-one-version-bump-per-changed`                                                                       | Accepted, so a later lane in the same PR carries an already-bumped value rather than re-bumping.                                                                                                                                                                                                                                                                                                                   | Accepted (`.oat/repo/reference/decisions/DR-260906-one-version-bump-per-changed.md`). |

No unsatisfied hard dependency remains, so `oat_execution_status` is `READY`.

## Landing-event impact

| Event                                                                        | Affected | Files in common                                                                                                                                                            | Required update                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR #190 (ReviewPlan Stage A compatibility release, OPEN draft) lands         | Major    | `.agents/skills/oat-project-review-provide/SKILL.md`, `packages/cli/src/validation/skills.test.ts` (verified in its file list; it also touches `oat-project-implement/**`) | Re-derive every `review-provide/SKILL.md` line anchor in this plan (`:990`, `:1019`, `:1040`, `:1082`, `:1084`, `:1183`, `:1194`) by re-running the fence trace in Step 1, and re-read the review-provide version pins before moving them. Do not apply the recorded line numbers. |
| PR #273 (provider-neutral remote project management)                         | None     | none — it touched `oat-doctor/SKILL.md` and `oat-pjm-remote/**` only                                                                                                       | **Merged 2026-09-08 as `7d70ac307`.** The drift check from the prior baseline shows no in-scope file changed; it added two regular markdown files to the fence-scan inventory (counted in the 205 above).                                                                          |
| PR #125 (oat-brainstorm visual companion, OPEN) lands                        | None     | none — it touches `oat-brainstorm/**` and package version files                                                                                                            | No update.                                                                                                                                                                                                                                                                         |
| A wave-7 sibling lane that bumps one of this plan's five skills merges first | Minor    | the bumped `SKILL.md` and its `skills.test.ts` pin                                                                                                                         | Per `DR-260906-one-version-bump-per-changed`, carry the already-bumped value and move no pin for that skill.                                                                                                                                                                       |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat a594614024725979ebf24bd9a34b3565c30fbffb..HEAD -- \
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
  → all cases pass (22 at the inspected `HEAD`).
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
  `:1040` (insert opener) and `:1084`/`:1194` (narrow closers);
  `metadata.version` bump.
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
- `.agents/agents/*.md`, `.oat/templates/**`, `.agents/docs/**`, and
  `apps/oat-docs/docs/**`. The tracer finds bare fences that swallow a heading
  at `.agents/agents/oat-codebase-mapper.md:246` (opens on
  `## Mapping Complete`), `.agents/agents/oat-reviewer.md:475` (opens on
  prose) and `:507` (opens on `## Structured-Output Mode`),
  `.agents/agents/skeptical-evaluator.md:81` (opens on `## Evidence`), and
  `.oat/templates/docs-app-mkdocs/docs/contributing.md:107` (opens on
  `### \`pymdownx.tabbed\``). They are real and should be filed as a follow-up
backlog item, but the item, the scanner, and this lane are all scoped to
`.agents/skills`. Do not repair them here. The eleven symlinked markdown
files and one symlinked directory under `.agents/skills`resolve into`.agents/docs` and sibling skills, which are fence-clean; the new inventory
  skips symlinks rather than scanning those targets through them.
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
with its tick count, info string, swallowed line count, and the first non-blank
body line. Run it over every regular `*.md` file under `.agents/skills` and
save the output; it is the red half of the Step 8 controls and the authority
for every line number you edit. Do not reuse the line numbers in this plan
without re-deriving them here. Also record the live candidate count by adding
a temporary `console.log(report.candidates.length)` to the `:2504` case and
running the focused suite once; remove it before committing.

**Verify:** the tracer reports, at minimum,
`oat-project-review-provide/SKILL.md 1084..1194`,
`oat-repo-knowledge-index/SKILL.md 515..580`,
`oat-repo-improve/references/plan-template.md 205..244`,
`create-agnostic-skill/references/skill-template.md 178..216`, and
`oat-agent-instructions-apply/references/instruction-file-templates/glob-scoped-rule.md 48..59`,
and exactly two bare fences that swallow a heading and open on `━━━`
(`oat-doctor/SKILL.md:231`, `oat-project-document/SKILL.md:434`). If any span
differs, stop and re-anchor before editing (STOP condition 1).

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
is one four-backtick block containing three-backtick inner examples. The inner
` ```markdown … ``` ` pairs at `:365/:367`, `:410/:412`, `:416/:418`,
`:461/:463`, `:467/:469`, and `:511/:513` are already three backticks and need
no edit. Change only these fence markers:

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

This exact edit was replayed on a scratch copy while planning: the result is
five spans and no bare opener.

**Verify:** the tracer reports exactly `327..369`, `373..420`, `424..471`,
`475..515` as bare four-backtick blocks (each opening on
`subagent_type: "Explore"`) and `538..580` as ` ```python `, and
`### Step 6:` / `### Step 6b:` are outside every fence.

### 4. Repair the three template references

Each has the same shape: a premature closer inside the template, a bare fence
that should have been the real closer, and (in two of them) a leftover marker on
the file's last line. Line numbers below are pre-edit; deleting the premature
closer shifts everything after it up by one.

- `.agents/skills/oat-repo-improve/references/plan-template.md` — delete `:107`
  (the premature four-backtick closer); the bare four-backtick line that was
  `:205` becomes the template's closer at `:204`. Narrow the line that was
  `:244` (now `:243`) from four backticks to three so it matches the
  ` ```markdown ` opener that was `:211` (now `:210`).
- `.agents/skills/create-agnostic-skill/references/skill-template.md` — delete
  `:119` (premature four-backtick closer); widen the line that was `:178` (now
  `:177`) from three backticks to four so it closes the ` ````markdown ` opener
  at `:25`; delete the line that was `:216` (now `:215`, the leftover marker on
  the last line).
- `.agents/skills/oat-agent-instructions-apply/references/instruction-file-templates/glob-scoped-rule.md`
  — delete `:40` (premature four-backtick closer); widen the line that was
  `:48` (now `:47`) from three backticks to four so it closes the
  ` ````markdown ` opener at `:9`; delete the line that was `:59` (now `:58`,
  the leftover marker on the last line). The ` ```{lang} ` pairs at `:37/:39`
  and `:44/:46` stay three backticks; both now sit inside the template.

In all three, the authoring guidance that follows the template (`## Multi-Plan
Index`, `## Detail Level Guidelines`, `## Guidance`) stays **outside** the
fence, and the template sections stay **inside** it. That is the distinction the
repair restores; do not fence the guidance.

**Verify:** the tracer reports `46..204 (````markdown)` and `210..243
(```markdown)` for `plan-template.md`; `25..177 (````markdown)` for
`skill-template.md`; `9..47 (````markdown)` for `glob-scoped-rule.md`; and no
unclosed fence and no bare opener in any of the three.
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts src/commands/init/tools/shared/create-agnostic-skill-bundle-contract.test.ts`
→ passes.

### 5. Split the fence-scan inventory from the candidate corpus

In `packages/cli/src/validation/named-skill-load-contract.test.ts`:

1. Add `collectFenceScanFiles(repoRoot)` beside `collectBoundedFiles`
   (`:353-388`). It walks `.agents/skills` **recursively** with
   `readdir(dir, { withFileTypes: true })`, descends only into entries whose
   `isDirectory()` is true, keeps only entries whose `isFile()` is true and
   whose name ends in `.md`, and returns them sorted and repo-relative. Both
   `Dirent` predicates are false for symlinks, so the eleven symlinked
   markdown files and the one symlinked directory are skipped rather than
   followed into `.agents/docs`. Recursion is required:
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
   count is 205 regular files; use 180). A glob regression that emptied the
   fence-scan list must fail on the shrinkage itself, exactly as it does for the
   bounded corpus.
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

Rewrite the comment at `:229-263` to: state all three shapes; drop the resolved
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
   though their `SKILL.md` bodies are untouched. Two of these are shared with
   sibling lanes in this wave: if `keep-plan-writes-on-the-callers-model` has
   already bumped `oat-repo-improve`, or `correct-skill-authoring-facts` has
   already bumped `create-agnostic-skill` (to `1.5.0`), carry that value and
   move no pin (`DR-260906-one-version-bump-per-changed`).
3. For each skill, sweep the **old** literal across `packages/cli/src`,
   `tools/smoke`, and `.agents/skills/*/tests` in plain and regex-escaped forms,
   and move every pin that belongs to that skill. Expected: five pins for
   `oat-project-review-provide` (`skills.test.ts:2866`, `:3028`, `:4544`,
   `:5857`, `:5871`), one for `oat-repo-improve` (`skills.test.ts:6107`), none
   for the other three.

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
   new detail string — rule 2 cannot fire here because `:1021-1083` is prose.
   Restore.
2. **Recursive inventory.** Restore Step 4's `glob-scoped-rule.md` defect while
   the repairs elsewhere stand. The focused suite must fail naming that file.
   Restore. Then, separately, change `collectFenceScanFiles` to a
   non-recursive walk; the suite must pass, proving that a non-recursive
   inventory is what hid the file. Restore recursion.
3. **Weaker-anywhere.** Restore the `oat-repo-knowledge-index:515` blank-gap
   defect (revert Step 3). The suite must fail with the **rule 2** detail
   string (`bare fence opens immediately after a closing fence`), not the new
   one — its first body line is `---`, so only rule 2 can catch it, which
   proves the original rule survived. Restore.
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

Then run, capturing each exit code explicitly (use a `mktemp -d` log directory
rather than `/tmp` if the environment asks for it):

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
  — retitle to name the widened surface and all three shapes. Red control: the
  Step 8 control 1 revert; the case must fail with the new detail string and
  pass once restored.
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
   shape: a paragraph of prose, then a bare ` ```` ` fence opening on
   `subagent_type: "Explore"` and containing `## Include frontmatter:`. Must
   not be reported. Red control: substitute the `ticks >= 4` discriminator —
   the case must fail. This is the executable form of the disproof of the
   item's acceptance criterion 2.
4. `scans skill markdown nested below references/` — fixture writes a defect at
   `.agents/skills/oat-fixture/references/templates/x.md` and asserts it is
   reported. Red control: Step 8 control 2's non-recursive walk.
5. `does not follow symlinks in the fence-scan inventory` — fixture writes a
   defect at `<root>/outside.md` and a symlink
   `.agents/skills/oat-fixture/references/docs/outside.md` → `../../../../outside.md`;
   asserts nothing is reported. Red control: replace the `isFile()` predicate
   with `stat`-based following — the case must fail.

**Focused command**

`pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/named-skill-load-contract.test.ts src/validation/skills.test.ts`
→ all cases pass.

**Full relevant suite**

`HOME=$(mktemp -d) pnpm exec turbo run test --force` → passes with no cache
replay.

## Done criteria

- [ ] The Step 1 tracer, re-run after Step 4, reports zero bare-fence openers
      that open on a heading and zero unclosed fences across all 205 regular
      markdown files under `.agents/skills`; the only bare fences that still
      swallow a heading are the two `━━━` console templates and the four
      repaired agent-prompt blocks.
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
- [ ] `collectBoundedFiles` is unchanged: 42 files, and the candidate count is
      exactly one below the Step 1 measurement.
- [ ] Five `metadata.version` bumps (or carried values, per the Dependencies
      table), six pins moved, and `grep -rn --fixed-strings` over the five old
      literals returns no hit belonging to those skills.
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
  `7d70ac307717b95917b8f92aa3fb9f236d1f75ba`;
- PR #190 lands (see `## Landing-event impact` — it rewrites
  `oat-project-review-provide/SKILL.md`, `oat-project-implement/**`, and
  `skills.test.ts`, invalidating every review-provide anchor and possibly a pin);
- a dependency named in `## Dependencies` changes state — in particular, if
  `correct-skill-authoring-facts` merges before this lane, re-trace
  `skill-template.md` because its Detail Level table edit sits inside the
  region this lane re-fences;
- any cited line anchor, step number, or section order in an in-scope file
  changes;
- a load-bearing evidence claim — especially the discriminator table — cannot
  be reproduced by the Step 1 tracer.

Executing inside a wave, refresh the drift check against the exact execution
`HEAD` after predecessor lanes integrate and record that comparison rather than
re-stamping the authored provenance.

**Correction applied 2026-09-09 (wave-7 p10 execution; wave-close pass; no requirement change):** (1) Step 2's prescription to narrow the review-provide closers "to three backticks" (`:446`, `:448`) collides with the format gate: `oxfmt` re-widens a fence whose body contains a three-backtick fence back to four backticks, so one repaired fence legitimately reads four backticks on the merged tip — the invariant is _balanced, heading-free fences_, not a literal tick count. (2) The `## Done criteria` bullet that says "the four repaired agent-prompt blocks" over-counts: three bare four-backtick agent-prompt blocks qualify (the `:373`, `:424`, `:475` set named in Step 6's comment text), matching the Step 6 discriminator's own "three legitimate" wording. (3) Step 8 control 2's second half predicts that a non-recursive `collectFenceScanFiles` walk makes the suite _pass_; it does not — Step 5's fence-scan floor (the minimum inventory count) trips first and the suite fails red on the floor, which is the safe direction and still proves the walk is what hid the nested file (the first half of the control, the named-file failure, is unaffected). Executed as the lane commits merged in group 4 as `13705dcdc`; the five bare-fence instances outside `.agents/skills` were filed as `BL-260909-repair-the-bare-fences-that`.

**Correction applied 2026-09-09 (wave-7 final review, Minor; no requirement change):** Done criterion 1's enumeration of intentional heading-swallowing bare fences is "the two console templates and the three agent-prompt blocks **and** the `oat-brainstorm/SKILL.md:650-652` update template" — a correctly paired bare fence holding a `## Brainstorming Update: …` line, byte-identical before the wave; `findFenceDefects` reports 0 defects at head against 5 at base, so only the enumeration was short. Also from that review: `collectFenceScanFiles` filters on `isFile()`, so the symlink `oat-project-autonomous/references/gate-inventory.md` → `.agents/docs/autonomy-contract.md` is skipped where the base's `collectBoundedFiles` read it — repaired in the wave's final-review fix round (Phase 21).

## Wave execution

This plan runs as a **lane in wave 7**, in a worktree at
`.worktrees/wave-7/<lane>`, in **lane mode**: run the focused tests plus
`pnpm check`, `pnpm type-check`, forced `turbo run test`,
`pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`, and
`pnpm oat:validate-skills`. The wave fan-in owns the lockstep public package
version bump and the release gates (`pnpm release:check-versions`,
`pnpm release:validate`, `pnpm build:docs`); this lane must not run or attempt
them. A root review follows the lane.

Because this lane writes `packages/cli/src/validation/skills.test.ts`, bumps
`oat-repo-improve` and `create-agnostic-skill`, and re-fences a region that
`correct-skill-authoring-facts` also edits, it must be serialized against every
sibling named in `## Dependencies` — never composed into the same parallel
group — and should merge before `correct-skill-authoring-facts`.

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
  change wearing this one's clothes. Confirm the fence-scan walk uses `Dirent`
  predicates and does not follow symlinks.
- **Prose immutability.** `git diff -w` over the five markdown files should show
  only fence-marker lines added, deleted, or re-ticked, plus the
  `metadata.version` lines.
- **Deferred follow-up.** Five bare-fence-swallows-heading instances outside
  `.agents/skills` (four across three files in `.agents/agents/`, one in
  `.oat/templates/docs-app-mkdocs/`) are recorded in `## Scope` and left
  unrepaired. Confirm a backlog item is filed rather than the sweep being
  silently declared complete.

## Execution record (2026-09-09, wave 7)

Executed as wave-7 p10 (PR #286 `wave-7-execution`, CLI 0.2.67; lane commit(s) `88fbc8786` → integration `18d9187fb`): the stray fences that hid normative prose in five skill assets (`oat-project-review-provide`, `oat-repo-knowledge-index`, `oat-repo-improve`'s plan template, `create-agnostic-skill`'s skill template, `oat-agent-instructions-apply`'s glob-scoped rule) are repaired with prose byte-identical apart from fence markers, five `metadata.version` bumps once each with six pins by literal, and the fence scanner in `named-skill-load-contract.test.ts` now walks 205 files recursively with an inventory floor, a new after-prose defect shape, and a `readdir` failure that propagates instead of scanning less. Verification: forced check/type-check/test `Cached: 0` (cli 7193); check:skill-bumps; lint; format; validate-skills; build; `test:smoke` 167; `test:skills` 883; nine controls red-then-green; one Codex round (1I fixed); root review PASS with findings (0/1I/0/5m; a 60,225-case differential fuzz on the scanner clean; prose immutability re-proven; the Important was the unfiled follow-up, filed by the root). Deviations: the Step 8 control-2 prediction (green under a non-recursive walk) does not reproduce — the Step 5 floor makes it red; oxfmt re-widened one repaired fence to four backticks (required by the format gate); the five bare-fence instances outside `.agents/skills` filed as `BL-260909-repair-the-bare-fences-that`. The wave's final review (Phase 21) then made the fence scanner follow in-repo `*.md` file symlinks (inventory 205 → 211, floor 208) after finding it had silently dropped the symlinked `gate-inventory.md` → `autonomy-contract.md` the base scanned.
