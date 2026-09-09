---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/items/BL-260908-correct-the-factual-skill.md
oat_external_plan_commit: a594614024725979ebf24bd9a34b3565c30fbffb
oat_external_plan_main_commit: 7d70ac307717b95917b8f92aa3fb9f236d1f75ba
oat_external_plan_date: '2026-09-08'
oat_execution_status: READY
oat_backlog_items:
  - BL-260908-correct-the-factual-skill
oat_issue_url: https://github.com/voxmedia/open-agent-toolkit/issues/277
created: '2026-09-08T21:16:03Z'
---

# Correct the factual skill-authoring claims and give each one a named backstop

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency blocks
> execution. Every surface this plan edits exists at the inspected `HEAD`
> and every claim it corrects was reproduced there. The redesign half of
> GitHub issue #277 is a separate backlog item and is out of scope.

## Outcome

The two skill-authoring skills and the shared skills guide stop teaching claims
the repository cannot substantiate. Specifically: the SKILL.md body budget is
stated in one unit instead of two contradictory ones; the "Codex enforces
single-line ≤ 500 chars" attribution is replaced by OAT's own explicit
500-character house rule that names `validateOatSkills` as its owner and
`packages/cli/src/validation/skills.test.ts` as its backstop, plus a dated,
re-fetchable note of what the current Codex documentation actually says; the
blanket "other agents ignore unknown frontmatter fields" sentence is scoped to
what is documented; `oat sync` becomes a scoped, conditional step rather than
an unconditional command and a success criterion; the `allowed-tools`
separator becomes consistent and is backed by a corpus test; the
approval-before-creating-files sentence becomes scoped authorization; and the
"skill appears in `AGENTS.md`" verification step, which contradicts the
repository's own no-duplicated-inventory rule, is replaced by a check that can
actually be run. The three divergent frontmatter matrices collapse to one
canonical dated matrix in `.agents/docs/skills-guide.md`, and the
byte-identical Detail Level table gets one home.

This matters because these are the two skills every new skill in this
repository is authored from. A false provider claim taught at the authoring
root propagates into every skill written afterwards, which is exactly the
failure mode `DR-260906-standing-claims-in-skills-name` exists to prevent —
and the decision record's own Context names the authoring skill as where one
such false claim already lived.

## Source and live evidence

- Source artifact or scope: `.oat/repo/pjm/backlog/items/BL-260908-correct-the-factual-skill.md`
- Inspected `HEAD`: `a594614024725979ebf24bd9a34b3565c30fbffb` — branch `wave-7-plans`, the tree whose content this plan actually read (re-verified in full on 2026-09-08 after the branch was rebased onto the merged PR #273)
- Comparison baseline: `7d70ac307717b95917b8f92aa3fb9f236d1f75ba` — the fetched `origin/main` tip, which is also the merge-base with `wave-7-plans`; the branch differs from it only by the wave-7 plan files and program ledger
- Planning date: `2026-09-08`
- Working tree while planning: `git status --porcelain` was empty; `git diff --stat c9f2e147ac0674e73a60735e0c1727ccc6048756..7d70ac307717b95917b8f92aa3fb9f236d1f75ba` over every in-scope path below is empty except `packages/cli/src/commands/help-snapshots.test.ts`, which PR #273 touched — the `sync --help` snapshot cited below was re-read at `a594614024725979ebf24bd9a34b3565c30fbffb` and still carries `default: "all"`
- Related backlog items:
  [BL-260908-correct-the-factual-skill — Correct the factual skill-authoring claims and consolidate the duplicated guidance](../../pjm/backlog/items/BL-260908-correct-the-factual-skill.md)
- Related history: GitHub issue #277 (both halves); the redesign half is tracked separately as `BL-260908-restructure-the-authoring` and is **out of scope** for this plan.
- Verified evidence:
  - `.agents/skills/create-agnostic-skill/SKILL.md:9` — `version: 1.4.3` under `metadata:`; the frontmatter carries no column-0 `version:` key.
  - `.agents/skills/create-oat-skill/SKILL.md:9` — `version: 1.5.3` under `metadata:`; likewise metadata-only.
  - `.agents/skills/create-agnostic-skill/SKILL.md:72` — `2. **SKILL.md body** (<5k words): Loads when skill triggers`, contradicted at `:271` by `- Keep SKILL.md **under 500 lines / ~5,000 tokens** (spec constraint)`.
  - `.agents/docs/skills-guide.md:67` — `- SKILL.md should be **under 500 lines / ~5,000 tokens**`; `:438` states the line half only and needs no change.
  - `.agents/skills/create-agnostic-skill/SKILL.md:179` — ``- `description`: **single line, ≤ 500 chars** (Codex enforces single-line ≤ 500 chars; spec allows 1024)``.
  - `.agents/skills/create-agnostic-skill/references/skill-template.md:203-204` — `- Single line (Codex enforces this)` / `- ≤ 500 chars (Codex limit; spec allows 1024)`.
  - `.agents/docs/skills-guide.md:82` — ``   - `description`: **single line**, ≤ 500 chars (Codex enforces this), describes _when to use_ + _what_``; `:244` — ``- `description`: ≤ 500 chars, **single line** (spec says 1024; use 500 for max portability)`` inside the "Codex-specific behaviors" list; `:423` — `3. **Keep it single-line**: Codex enforces single-line ≤ 500 chars`.
  - `packages/cli/src/validation/skills.ts:1273` — `if (frontmatterDescription.length > 500)` pushes `Frontmatter description exceeds 500 characters`. This is the **only** in-repo substantiation of any 500-character rule, and it is OAT's own.
  - **Scope of that validator, verified and narrower than the backlog item implies:** `packages/cli/src/validation/skills.ts:1214` reads `const oatSkillDirs = allSkillDirs.filter((name) => name.startsWith('oat-'))` and the description check at `:1258-1279` sits inside `for (const dir of oatSkillDirs)` opened at `:1216`. So the 500-character rule is enforced for `oat-*` skills only. Neither `create-agnostic-skill` nor `create-oat-skill` is itself covered by it (neither directory name starts with `oat-`), and neither is a skill a reader of `create-agnostic-skill` would typically create. Existing backstops: `packages/cli/src/validation/skills.test.ts` `it('reports description longer than 500 characters')` and `it('passes for valid oat-* skills and ignores non-oat directories')`.
  - **The cited Codex URL is dead and its successor contradicts the claim.** `curl -o /dev/null -w '%{http_code} %{redirect_url}' https://developers.openai.com/codex/skills` returned `308 -> https://learn.chatgpt.com/docs/build-skills` (verified 2026-09-08). Fetching the successor and stripping tags, the only description-length text is a context-budget note — name and description are budgeted to about 2% of the context window, or 8,000 characters when the context window is unknown, and "If many skills are installed, Codex shortens skill descriptions first." There is **no** single-line requirement and **no** 500-character limit on the page. The page also carries **no** statement that Codex ignores unknown frontmatter keys (`grep -i 'unknown\|ignore\|extra key'` over the stripped text returns only unrelated script text).
  - The dead URL appears at `.agents/skills/create-agnostic-skill/SKILL.md:431` (**not** `:430`, which is the Cursor link — the backlog item's line number is off by one), and at `.agents/docs/skills-guide.md:225`, `:484`, and `:566`.
  - `.agents/skills/create-agnostic-skill/SKILL.md:175` — `- Other agents ignore unknown frontmatter fields, so it's safe to include Claude-specific fields everywhere`. The scoped Codex variants live at `SKILL.md:393`, `references/skill-template.md:200`, and `.agents/docs/skills-guide.md:86`, `:241`, `:600`.
  - `.agents/skills/create-agnostic-skill/SKILL.md:197` — `Present the plan and wait for user approval before creating files.` The scoped shape to model it on already exists at `.agents/skills/create-oat-skill/SKILL.md:193-196` ("ask once at skill start and state the approval scope", with roles / run boundary / declined fallback).
  - `.agents/skills/create-agnostic-skill/SKILL.md:232-238` — Step 5 opens `After creating the skill, run OAT sync to update provider views:` followed by a fenced `oat sync`; `:442` repeats bare `oat sync` as a troubleshooting remedy; `:464` makes ``✅ `oat sync` run successfully`` a success criterion.
  - `.agents/skills/create-oat-skill/SKILL.md:217` — bare `oat sync` in Step 5. Its Success Criteria at `:329-336` correctly do **not** include it, so only the step needs changing there.
  - **Live proof the bare command is repository-unsafe:** `node packages/cli/dist/index.js sync --help` prints `--scope <scope>  Limit execution scope (choices: "project", "user", "all", default: "all")`. A bare `oat sync` therefore also writes the invoking user's home-scope provider views. Owner: `withScopeOption` in `packages/cli/src/commands/shared/scope-option.ts`, whose signature defaults `defaultScope` to `'all'`. Backstop: `packages/cli/src/commands/help-snapshots.test.ts` `it('sync --help matches snapshot')`, whose inline snapshot contains that `default: "all"` text.
  - `.agents/docs/skills-guide.md:371` already models `oat sync --scope all`, correctly, because that section is about distributing to user-level provider directories. The guide and the skill disagree only because the skill omits the flag.
  - `.agents/docs/skills-guide.md:58` — `allowed-tools: Read Grep Glob # Space-delimited tool list (experimental)`, while every authored example is comma-separated: `.agents/skills/create-agnostic-skill/SKILL.md:6` and `:105`, `.agents/skills/create-agnostic-skill/references/skill-template.md:53`, `.agents/skills/create-oat-skill/SKILL.md:6`, `.agents/skills/create-oat-skill/references/oat-skill-template.md:6`, and `.agents/docs/skills-guide.md:122`.
  - **Corpus audit run at the inspected `HEAD`:** 79 of the 83 canonical `.agents/skills/*/SKILL.md` files declare `allowed-tools` (the 79th, `oat-pjm-remote` with `Read, Bash, AskUserQuestion`, arrived with PR #273). Every multi-tool declaration is comma-separated; the single exception is `oat-dispatch-subagents`, whose value is the single token `Read` and so carries no separator at all. So "comma-separated is what OAT writes" is empirically true today and is checkable as a corpus rule.
  - **OAT never parses the separator.** `grep -rn 'allowed-tools' packages/cli/src` excluding tests returns exactly two hits: `packages/cli/src/commands/tools/info/index.ts:60` reads the raw scalar, and `packages/cli/src/validation/skills.ts:1240` only requires the key to be present. There is no splitting, so the separator choice is a documentation convention, not a runtime contract — and the plan must say so rather than implying enforcement.
  - `.agents/skills/create-agnostic-skill/SKILL.md:245` — `- Skill appears in `AGENTS.md``, and `.agents/skills/create-oat-skill/SKILL.md:334` — `` - ✅ Skill registered in `AGENTS.md` ``. Both contradict `AGENTS.md`"Skills Discovery", which states that provider-linked views are managed by sync tooling and that full skill inventories must not be duplicated in that file. The repository-root`AGENTS.md`at the inspected`HEAD` contains no skill inventory, so neither check can pass as written.
  - `node packages/cli/dist/index.js tools info --help` prints `Usage: oat tools info [options] <name>` / `Show details for an installed tool`, so a runnable replacement for the `AGENTS.md` check exists.
  - Three matrices, verified divergent: `.agents/skills/create-agnostic-skill/SKILL.md:379-391` (5 columns), `.agents/docs/skills-guide.md:134-148` (7 columns, with extra `model` and `short-description` rows), and `.agents/docs/skills-guide.md:390-395` (the `npx skills` matrix, which marks `allowed-tools` ✅ for every provider and so directly contradicts the other two, which mark it `❓` for Cursor and `💤` for Codex).
  - The Detail Level table is content-identical between `.agents/skills/create-agnostic-skill/SKILL.md:397-402` and `.agents/skills/create-agnostic-skill/references/skill-template.md:182-187`; only Markdown column padding differs.
  - **`skill-template.md` is not fence-balanced today, and a sibling lane repairs it.** Its fence lines are `:25` (`````markdown`, four backticks), `:116`/`:118` (a `bash` block inside the template), `:119` (four backticks — a premature closer), `:178` (three backticks) and `:216` (three backticks, the last line). Read strictly, the template closes at `:119`, and `:178..:216` is a second fenced block that swallows the Detail Level table, the versioning guidance, the portability notes, and the shared-references paragraph. The intent — `:178` closes the template and `:180-215` is guidance outside it — is what this plan edits against. [Repair stray fences in lifecycle skills](./2026-09-08-repair-stray-fences-in-lifecycle-skills.md) deletes `:119`, widens `:178` to four backticks, and deletes `:216`, and widens its fence-scan inventory to every Markdown file under `.agents/skills`. See `## Dependencies`: that lane merges first, and this lane's edits in `:180-215` must leave the file fence-balanced.
  - `.agents/docs/skills-guide.md:5` — `_Last updated: July 2026_`, i.e. the guide's only date stamp is two months stale relative to the planning date.
  - `.agents/skills/create-agnostic-skill/references/docs/skills-guide.md` is a symlink to `../../../../docs/skills-guide.md` (`ls -la` confirms `lrwxr-xr-x`), materialized at bundle time by `cp -RL` at `packages/cli/scripts/bundle-assets.sh:48`. Editing `.agents/docs/skills-guide.md` therefore updates the bundled view for free.
  - **`packages/cli/assets/skills/` is not a write surface.** `git check-ignore -v packages/cli/assets/skills/create-agnostic-skill/SKILL.md` returns `.gitignore:25:packages/cli/assets/*`. The byte copy is build output; the verification behind this item described it as "regenerated, must be committed", which is false on this tree. Do not stage anything under `packages/cli/assets/`.
  - **`named-skill-load-contract.test.ts` corpus, verified narrower than the backlog item implies:** `collectBoundedFiles` at `packages/cli/src/validation/named-skill-load-contract.test.ts:353-376` walks `references/*.md` only for directories matching `oat-project-*`, then appends `.agents/skills/create-oat-skill/SKILL.md` alone. Neither `create-agnostic-skill/references/` nor `create-oat-skill/references/` is in that corpus. Adding or renaming a reference file under either authoring skill therefore does **not** enter it. The real constraint is the prose pin at `:2596-2614`, which asserts six literal fragments from `create-oat-skill` Step 2 (`**Named-skill execution`, ``require loading that skill's current `SKILL.md` and following its current steps, or dispatching a child that carries it``, `Achieving a remembered outcome, paraphrasing what the named skill used to do, or relying on ambient discovery to locate it is not compliant`, `**user advice**`, `**non-executing reference**`, `**explicit capability fallback**`). This plan touches Step 5 and Success Criteria of that file and must not reflow Step 2.
  - `packages/cli/src/commands/init/tools/shared/create-agnostic-skill-bundle-contract.test.ts` asserts that both `create-agnostic-skill/SKILL.md` and `references/skill-template.md` **contain** the string `references/docs/skills-guide.md` and **do not contain** `.agents/docs/skills-guide.md`. Any consolidation must keep the bundled pointer in both files and must never introduce a repo-root pointer to that guide.
  - `pnpm test:skills` resolves to `node --test .agents/skills/*/tests/*.test.mjs`. `grep -rln 'create-agnostic-skill\|create-oat-skill\|skills-guide' .agents/skills/*/tests/` returns nothing, so that suite covers none of this plan's surfaces. It is still run because the item's acceptance criteria name it, but it is not the evidence that this change is correct — the named vitest suites and gates are.
  - `grep -rn '1\.4\.3\|1\.5\.3' packages/cli/src tools/smoke .agents/skills apps/oat-docs/docs packages/cli/scripts` returns exactly the two frontmatter lines. No test, script, or doc pins either skill's version by literal, so the bumps are self-contained.

Everything above was reproduced at `a594614024725979ebf24bd9a34b3565c30fbffb`. Where the backlog item's claims proved narrower or off by a line, this plan records reality and plans against it.

## Dependencies

| Type             | Dependency                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Required state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Current state                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Satisfied policy | `DR-260906-standing-claims-in-skills-name`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Accepted; binds every standing claim this plan writes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Accepted. Record present at `.oat/repo/reference/decisions/`.            |
| Satisfied policy | `DR-260908-bundled-skills-declare` (metadata-only skill versions)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Accepted; both skills already metadata-only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Accepted. Verified at `SKILL.md:8-9` in both skills.                     |
| Soft adjacency   | `BL-260908-restructure-the-authoring` (issue #277's redesign half)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Never in one group with this lane; it rewrites the same files.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Open, unplanned. No overlap taken here.                                  |
| Soft adjacency   | GitHub issue #203 (`oat sync` scoping)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Context only; never blocks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Open. This plan changes documentation, not sync behavior.                |
| Soft adjacency   | `.oat/repo/reference/external-plans/2026-08-30-guard-docs-app-mirrors-of-skill-prose.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Context only; the docs-app mirror pair stays untouched.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Landed. No terminology change propagates, so no mirror edit is required. |
| Soft ordering    | [Repair stray fences in lifecycle skills](./2026-09-08-repair-stray-fences-in-lifecycle-skills.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Never in one parallel group with this lane, and that lane merges **first**: it rewrites `skill-template.md` at `:119`/`:178`/`:216` (the region this plan's steps 3–4 edit), bumps `create-agnostic-skill` `1.4.3` → `1.4.4`, writes `packages/cli/src/validation/skills.test.ts` pins, and widens the fence-scan inventory in `named-skill-load-contract.test.ts` to every Markdown file under `.agents/skills`. After it lands this lane re-anchors the template's fence lines by content, keeps every edited file fence-balanced, and sets `create-agnostic-skill` to `1.5.0` without a second bump (one bump `1.4.3` → `1.5.0` in the final PR diff). If this lane must merge first instead, the stray-fences lane re-anchors `:178`/`:216` by content and carries `1.5.0`. | Planned, unexecuted; serialized by wave composition.                     |
| Soft ordering    | Every other wave-7 lane that writes `packages/cli/src/validation/skills.test.ts`: [Keep plan writes on the caller's model](./2026-09-08-keep-plan-writes-on-the-callers-model.md), [Read stdin in finalize-synced-archive](./2026-09-08-read-stdin-in-finalize-synced-archive.md), [Make the completion seal idempotent](./2026-09-08-make-the-completion-seal-idempotent.md), [Reconcile the oat doctor example](./2026-09-08-reconcile-the-oat-doctor-example.md), [Tighten the skill version validators](./2026-09-08-tighten-the-skill-version-validators.md), [Calculate dispatch baselines after journaling](./2026-09-08-calculate-dispatch-baselines-after-journaling.md) | Never in one parallel group with this lane; whichever merges later re-anchors its insertions by neighbouring `describe`/`it` title. This plan adds two cases and moves no pin, so no bump or pin value is shared with any of them.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Planned, unexecuted; serialized by wave composition.                     |
| Soft adjacency   | [Harden the external-plan readiness contract](./2026-09-08-harden-the-external-plan-readiness-contract.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | May share a group; no common write surface. Its corpus control sweeps this plan file.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Planned, unexecuted.                                                     |

No unsatisfied hard dependency remains, so `oat_execution_status` is `READY`.

## Landing-event impact

| Event                                                                                                     | Affected | Files in common                                                                                                                                | Required update                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR #190 (ReviewPlan Stage A) lands                                                                        | Minor    | `packages/cli/src/validation/skills.test.ts`                                                                                                   | Re-anchor the two new test insertions against the post-merge file; place them by neighbouring `describe` name, never by line offset.                                                                     |
| PR #190 (ReviewPlan Stage A) lands                                                                        | Minor    | `packages/cli/src/commands/help-snapshots.test.ts`                                                                                             | Re-read `it('sync --help matches snapshot')` and confirm its inline snapshot still contains `default: "all"` before citing it as the scoped-sync backstop.                                               |
| PR #273 (remote project management) — **merged 2026-09-08** as `7d70ac307717b95917b8f92aa3fb9f236d1f75ba` | None     | `packages/cli/src/commands/help-snapshots.test.ts` (not a write surface here)                                                                  | Already absorbed: the inspected `HEAD` sits on top of it, the `sync --help` snapshot still reads `default: "all"`, and it added the 79th `allowed-tools` declarer (`oat-pjm-remote`). No further update. |
| Wave-7 lane `repair-stray-fences-in-lifecycle-skills` merges                                              | Major    | `create-agnostic-skill/references/skill-template.md`, `create-agnostic-skill/SKILL.md` (version), `packages/cli/src/validation/skills.test.ts` | Expected and preferred order. Re-anchor `skill-template.md` by content: `:178` is now a four-backtick closer and `:216` is gone; set `create-agnostic-skill` to `1.5.0` (no second bump).                |
| Any other wave-7 `skills.test.ts` writer merges                                                           | Minor    | `packages/cli/src/validation/skills.test.ts`                                                                                                   | Re-anchor the two insertions by neighbouring test title; no pin value is shared.                                                                                                                         |
| PR #125 (brainstorm companion) lands                                                                      | None     | none of this plan's write surfaces                                                                                                             | No update. Confined to `.agents/skills/oat-brainstorm/`.                                                                                                                                                 |
| `BL-260908-restructure-the-authoring` executes                                                            | Major    | both authoring skills, `.agents/docs/skills-guide.md`                                                                                          | STOP. That item rewrites the same files structurally. If it has landed, revalidate every `file:line` in `## Current state` before editing and re-derive the diff.                                        |

## Drift check

Run before editing:

```bash
git diff --stat a594614024725979ebf24bd9a34b3565c30fbffb..HEAD -- \
  .agents/skills/create-agnostic-skill/SKILL.md \
  .agents/skills/create-agnostic-skill/references/skill-template.md \
  .agents/skills/create-oat-skill/SKILL.md \
  .agents/docs/skills-guide.md \
  packages/cli/src/validation/skills.ts \
  packages/cli/src/validation/skills.test.ts \
  packages/cli/src/validation/named-skill-load-contract.test.ts \
  packages/cli/src/commands/help-snapshots.test.ts \
  packages/cli/src/commands/shared/scope-option.ts \
  packages/cli/src/commands/init/tools/shared/create-agnostic-skill-bundle-contract.test.ts \
  packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts \
  AGENTS.md
```

`HEAD` here is the execution base (inside a wave lane, the integration
branch after predecessor lanes merged); from the planning branch itself the
command is trivially empty, so also run it with `..origin/main`. Expect no
output when nothing has moved. If an in-scope file changed, re-locate
every anchor in `## Current state` by string search rather than by line number,
and compare the quoted text against the live file. A material mismatch — a
claim this plan corrects that no longer reads as quoted, or a pinned test
fragment that has moved — is a STOP condition unless the reconciliation is
mechanical (a pure line shift with identical text).

## Repository conventions

- Build: `pnpm build` → all packages compile to `dist/`. Required before `pnpm test:smoke` and `pnpm test:release`; not required for the focused vitest runs below, but the `oat sync --help` evidence in this plan was taken from a built `packages/cli/dist/index.js`.
- Typecheck: `pnpm type-check` → clean across all packages.
- Test (focused): `pnpm --filter @open-agent-toolkit/cli exec vitest run <path>` → the named file's suites pass.
- Test (forced full, no Turborepo replay): `HOME=$(mktemp -d) pnpm exec turbo run test --force` from the repository root. A green `pnpm test` that prints `cache hit, replaying logs` or `>>> FULL TURBO` executed nothing and is not evidence. `pnpm test --force` does **not** force a re-run.
- Skill validation: `pnpm oat:validate-skills` → no findings. Note this pass filters to `oat-*` directories, so it does **not** inspect either skill this plan edits; it is run to prove no collateral regression, not to prove this change.
- Skill scripts suite: `pnpm test:skills` → passes. Covers none of this plan's surfaces (verified above); run because the item's acceptance criteria name it.
- Version-bump gate: `pnpm run check:skill-bumps` → requires a `metadata.version` increase for every changed `.agents/skills/*/SKILL.md` in the diff against `origin/main`. Fetch `origin/main` first.
- Lint/format check (non-mutating): `pnpm lint` and `pnpm format`. CI runs neither, and only they cover `.agents/skills/**/*.md`, so both are mandatory for this change. Apply fixes with `pnpm exec oxfmt --write <paths>`.
- Versioning convention: exactly one `metadata.version` bump per changed skill per PR, PR-scoped and not edit-scoped. The top-level `version:` key is gone since CLI 0.2.65; keep both bumps nested under `metadata:`. Locate any pin by the **old literal** (`1.4.3`, `1.5.3`) across `packages/cli/src`, `tools/smoke`, and `.agents/skills/*/tests` — this plan verified there are none, but re-run the grep after the drift check.
- Standing-claim convention (`DR-260906-standing-claims-in-skills-name`): every standing claim about runtime behavior names the code that owns it and ships its executable backstop in the same change, **never keyed to a physical line number**. Name files, function names, and test titles — never `file:line`. A point-in-time observation about an external provider is exempt from the backstop requirement but must carry a citation and a verification date.
- Implementation pattern for a corpus test: follow the existing corpus sweeps in `packages/cli/src/validation/skills.test.ts` that read every `.agents/skills/*/SKILL.md` and assert a repository-wide property.
- Never run `oxfmt` on an OAT `state.md`; it mangles the frontmatter. Not applicable to this plan's surfaces, which are skill and doc Markdown plus TypeScript tests.
- `oat sync --scope all` rewrites the invoking user's home-scope provider directories and restamps `~/.oat/sync/manifest.json`. Never run it while executing this lane; if a sync is needed at all, use `--scope project`.
- Git/PR convention: do not push or open a PR from this lane. The wave fan-in owns the lockstep public-package bump and the release gates.

**Lane-mode verification.** This plan runs as a **lane** in wave 7, in a
worktree at `.worktrees/wave-7/<lane>`, with a root review after. Lane mode
means: the focused tests named in `## Test plan`, plus `pnpm check`,
`pnpm type-check`, a forced `turbo run test`, `pnpm run check:skill-bumps`,
`pnpm lint`, `pnpm format`, and `pnpm oat:validate-skills`. The lane does
**not** bump the five lockstep public package versions and does **not** run
`pnpm release:check-versions`, `pnpm release:validate`, or `pnpm build:docs` —
the wave fan-in owns the lockstep bump and the release gates. Capture each
gate's exit code explicitly, for example
`pnpm check > gate.log 2>&1; echo "exit=$?"`. Never derive success from a
pipeline whose last stage is a pager or filter.

## Scope

### In scope

- `.agents/skills/create-agnostic-skill/SKILL.md` — the body-budget unit, the Codex description attribution, the blanket unknown-field sentence, the approval sentence, the `oat sync` step and its troubleshooting and success-criteria echoes, the `AGENTS.md` verification bullet, the 5-column frontmatter matrix, the Detail Level table, the dead Codex URL, and the `metadata.version` bump `1.4.3` → `1.5.0`.
- `.agents/skills/create-agnostic-skill/references/skill-template.md` — the Codex description constraints, the "Codex explicitly ignores unknown keys" sentence, and the Detail Level table's single home. The bundled pointer `references/docs/skills-guide.md` and the shared-references paragraph stay.
- `.agents/skills/create-oat-skill/SKILL.md` — Step 5's bare `oat sync`, the `AGENTS.md` success criterion, and the `metadata.version` bump `1.5.3` → `1.5.4`. **Step 2 and its named-skill-execution prose are untouched.**
- `.agents/docs/skills-guide.md` — the body-budget unit, the three Codex description claims, the dead URL in three places, the date stamp, the canonical frontmatter matrix and its dated provenance, the `npx skills` matrix's conflict note, the `allowed-tools` separator line, and the sync-scope caveat.
- `packages/cli/src/validation/skills.test.ts` — two new tests: the `allowed-tools` corpus rule and the non-`oat-*` description-length scoping rule.

### Out of scope

- `.agents/skills/create-oat-skill/references/oat-skill-template.md` — its `allowed-tools` line is already comma-separated and it carries none of the corrected claims. Leave it untouched to keep the diff reviewable.
- `packages/cli/assets/**` — gitignored build output. The `create-agnostic-skill` byte copy and the materialized `references/docs/skills-guide.md` regenerate at bundle time; never stage them.
- `.agents/docs/provider-reference.md` — carries the same dead `developers.openai.com/codex/*` URLs in twelve places. Correcting a provider reference sheet is a different unit of work with its own review surface; note it as a follow-up, do not fold it in.
- `apps/oat-docs/docs/contributing/skills.md` and its `packages/cli/assets/docs/` mirror — they name the two skills but repeat none of the corrected claims, and this plan changes no skill name or workflow terminology, so the mirror guard has nothing to enforce.
- `packages/cli/src/validation/skills.ts` — the 500-character rule is **kept as written**. This plan documents it honestly; it does not change validator behavior. Changing the threshold or its `oat-*` scoping is a separate decision.
- `disable-model-invocation` policy for the authoring skills themselves — issue #277's proposal to flip it is a policy change deserving its own decision record, not a documentation edit.
- Every editorial redesign in issue #277 (progressive-disclosure restructure, conditional-reference reorganization, delegation-assurance and behavior-oriented verification sections) — owned by `BL-260908-restructure-the-authoring`.

## Current state

`.agents/skills/create-agnostic-skill/SKILL.md` (470 lines, `metadata.version:
1.4.3`) is the provider-neutral authoring skill. Its Step 2 states the body
budget in words while its later "Content" guidance states it in lines and
tokens. Its "Frontmatter notes" block carries the blanket unknown-field
sentence and the Codex description attribution. Step 3 ends with an unscoped
approval sentence. Step 5 runs a bare `oat sync` and verifies that the skill
"appears in `AGENTS.md`". Its Reference section links a redirected Codex URL,
its Troubleshooting repeats bare `oat sync`, and its Success Criteria make
that command a pass condition. It also carries a 5-column frontmatter matrix
and a Detail Level table that is byte-equivalent to the one in its own
template reference.

`.agents/skills/create-agnostic-skill/references/skill-template.md` (216
lines) emits a starter skill inside a fenced block and then appends guidance
intended to sit outside the fence: the Detail Level table, versioning
guidance, and "Cross-Provider Portability Notes" that restate the description
constraints and the Codex unknown-key claim in prose. Today the fences do not
actually close where intended (see the fence evidence above); the
stray-fences lane repairs that first, and this lane edits the guidance region
without adding or removing a fence line. Its last two paragraphs — the
shared-references recipe and the pointer to `references/docs/skills-guide.md`
— are load-bearing for `create-agnostic-skill-bundle-contract.test.ts`.

`.agents/docs/skills-guide.md` (619 lines, titled `# Skills Research
Reference`, stamped `_Last updated: July 2026_`) is the deep-dive research
document. It is vendored into `create-agnostic-skill` as a symlink and
materialized into the bundle by `cp -RL`, so it ships with the skill and is
the correct home for a single canonical, dated compatibility matrix. It
already holds the richest matrix (7 columns, with footnotes and a Copilot
issue citation) and already models the scoped `oat sync --scope all` form. It
also holds a second, third-party matrix sourced from `npx skills` that
contradicts the first on `allowed-tools`, and three separate restatements of
the Codex description claim.

`.agents/skills/create-oat-skill/SKILL.md` (336 lines, `metadata.version:
1.5.3`) is the OAT-flavoured sibling. It contains none of the Codex
description claims. Two defects apply: Step 5's bare `oat sync`, and an
`AGENTS.md` registration success criterion. Its Step 2 prose is pinned
verbatim by `named-skill-load-contract.test.ts`, and its Step 3 contains the
`Executable backstops for contract claims` block pinned clause-by-clause by
`skills.test.ts`; both blocks are outside this plan's edits and must stay
byte-stable.

`packages/cli/src/validation/skills.ts` owns OAT's description rules inside
`validateOatSkills`, filtered to `oat-*` directories. `packages/cli/src/
commands/shared/scope-option.ts` owns the `--scope` default of `'all'` that
makes a bare `oat sync` reach user scope.

## Implementation steps

Work in the order below. Steps 1–4 are single-file edits with no interaction;
steps 5–6 add the backstops; step 7 takes the version bumps last so the
`check:skill-bumps` gate sees the final diff.

### 1. Make the body budget one unit in all three places

In `.agents/skills/create-agnostic-skill/SKILL.md`, change the Step 2
progressive-disclosure bullet that reads `**SKILL.md body** (<5k words)` to
state `~5,000 tokens` instead, so it agrees with the "Content" guidance later
in the same file.

In the same file, the "Content" bullet currently reads `Keep SKILL.md **under
500 lines / ~5,000 tokens** (spec constraint)`. Drop the `(spec constraint)`
attribution: no in-repo artifact substantiates that the Agent Skills
specification imposes either number, and an unsourced attribution to an
external spec is exactly the pattern `DR-260906` prohibits. Replace it with a
statement that this is OAT's authoring budget, pointing at the dated
provider-compatibility section of `references/docs/skills-guide.md` for what
each provider actually documents.

In `.agents/docs/skills-guide.md`, the "Spec Constraints" bullet `SKILL.md
should be **under 500 lines / ~5,000 tokens**` keeps its numbers but moves
under a heading or sentence that attributes them to OAT's authoring guidance
rather than to the specification, unless the executor can produce a live
citation from the spec that says otherwise — in which case cite it with a
verification date. Leave the "Best Practices (Distilled)" bullet that states
the 500-line half alone; it is already unit-consistent.

**Verify:**

```bash
grep -rn "5k words\|(spec constraint)" \
  .agents/skills/create-agnostic-skill/SKILL.md .agents/docs/skills-guide.md; \
  echo "exit=$?"
```

→ prints no matching lines and `exit=1` (grep's no-match status).

### 2. Replace every Codex description attribution with OAT's house rule plus a dated provider note

Five prose sites state or restate that Codex enforces a single-line ≤ 500-char
description: `create-agnostic-skill/SKILL.md` in the "Frontmatter notes"
block, `references/skill-template.md` in the "Description constraints for max
portability" list (two adjacent bullets), and `.agents/docs/skills-guide.md`
in "Cross-Provider Safe Defaults", in the "Codex-specific behaviors" list, and
in "Best Practices (Distilled) → Description Field".

Rewrite each so that:

- the **rule** is stated as OAT's own: a description is a single-line scalar of at most 500 characters;
- the **owner** is named in prose: `validateOatSkills` in `packages/cli/src/validation/skills.ts`;
- the **backstop** is named in prose: `packages/cli/src/validation/skills.test.ts`;
- the **scope** is stated truthfully: OAT's validator enforces it for `oat-*` skills; for every other skill it is an authoring convention this repository follows for portability;
- the **spec allowance** (1024 characters) is retained where it already appears;
- **no sentence attributes any character limit or single-line requirement to Codex.**

Never cite a line number in any of this prose (`DR-260906`).

In `.agents/docs/skills-guide.md`, the "Codex-specific behaviors" bullet must
be replaced with what the current Codex documentation actually says, carrying
a verification date and the live URL: name and description are budgeted to
roughly 2% of the context window, or 8,000 characters when the window is
unknown, and descriptions are shortened first when many skills are installed.
Mark it as verified on 2026-09-08 against
`https://learn.chatgpt.com/docs/build-skills`.

Replace the redirected URL `https://developers.openai.com/codex/skills` in all
four places it appears in scope — the Reference list in
`create-agnostic-skill/SKILL.md`, and the `**Docs:**` line and two `**Source:**`
lines in `.agents/docs/skills-guide.md` — with
`https://learn.chatgpt.com/docs/build-skills`.

**Verify:**

```bash
grep -rn "Codex enforces\|Codex limit\|developers.openai.com/codex/skills" \
  .agents/skills/create-agnostic-skill/ \
  .agents/skills/create-oat-skill/ \
  .agents/docs/skills-guide.md; echo "exit=$?"
```

→ prints no matching lines and `exit=1`.

```bash
grep -rn "validateOatSkills\|skills.test.ts" \
  .agents/skills/create-agnostic-skill/SKILL.md \
  .agents/skills/create-agnostic-skill/references/skill-template.md \
  .agents/docs/skills-guide.md
```

→ prints at least one owner-and-backstop citation in each of the three files.

```bash
curl -sL -o /dev/null -w "%{url_effective} %{http_code}\n" \
  https://learn.chatgpt.com/docs/build-skills
```

→ `https://learn.chatgpt.com/docs/build-skills 200`. If this returns anything
else, the replacement URL has itself moved: follow the redirect, record the new
destination and the new verification date, and say so in the PR body.

### 3. Scope the unknown-field claim and collapse the three matrices to one dated table

In `create-agnostic-skill/SKILL.md`, replace the blanket sentence "Other agents
ignore unknown frontmatter fields, so it's safe to include Claude-specific
fields everywhere" with a scoped statement: the spec defines a fixed field
set, providers differ in which extension fields they read, and an unread field
is inert rather than guaranteed harmless — with the reader sent to the dated
compatibility section of `references/docs/skills-guide.md` for the per-provider
picture.

The remaining "Codex ignores unknown keys" statements are now unsourced too:
the current Codex page carries no such statement (verified above). Do not
delete them silently. Move the claim into the single dated compatibility
section in `.agents/docs/skills-guide.md` and mark it explicitly as
**unverified as of 2026-09-08** — previously documented, not restated on the
current page — so a future reader knows the difference between a claim that is
checked and one that is inherited.

Make `.agents/docs/skills-guide.md`'s 7-column "Frontmatter Compatibility
Matrix" the single canonical table. Give it a verification date in its heading
or lead sentence, keep its legend and its three footnotes, and update the
document's `_Last updated:_` stamp accordingly.

In `create-agnostic-skill/SKILL.md`, delete the 5-column "Frontmatter
Reference" table and replace the whole subsection with its existing "Key
takeaway" sentence (corrected per the unknown-key rewrite above) plus a
pointer to `references/docs/skills-guide.md`. The pointer must use the
bundled path; a repo-root `.agents/docs/skills-guide.md` pointer fails
`create-agnostic-skill-bundle-contract.test.ts`.

In `references/skill-template.md`, delete the "Cross-Provider Portability
Notes" restatements that now live in the canonical table — the safe-layering
paragraph's unknown-key claim and the description-constraint bullets covered
by step 2 — and leave a pointer to the same bundled guide. **Keep the
"Shared references" paragraph and the closing "For the full compatibility
matrix… see `references/docs/skills-guide.md`" line verbatim**; both are what
the bundle contract test reads.

Finally, in `.agents/docs/skills-guide.md`, leave the third-party `npx skills`
matrix in place but label it as a vendor-published claim with its own date and
add one sentence stating that where it disagrees with the canonical matrix —
notably on `allowed-tools`, which it marks supported everywhere — the
canonical matrix governs.

**Verify:**

```bash
grep -c "^| \`allowed-tools\`" .agents/skills/create-agnostic-skill/SKILL.md
```

→ `0`.

```bash
grep -n "Other agents ignore unknown frontmatter fields" \
  .agents/skills/create-agnostic-skill/SKILL.md; echo "exit=$?"
```

→ no output, `exit=1`.

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/commands/init/tools/shared/create-agnostic-skill-bundle-contract.test.ts
```

→ both tests pass; in particular the assertion that skill and template contain
`references/docs/skills-guide.md` and contain no `.agents/docs/skills-guide.md`.

```bash
grep -n '^ \{0,3\}\(`\{3,\}\|~\{3,\}\)' \
  .agents/skills/create-agnostic-skill/references/skill-template.md
```

→ with the stray-fences lane landed first: a four-backtick opener and a
four-backtick closer around the template, an even number of three-backtick
lines between them, and no fence line after the closer. This lane's edits in
the guidance region must not add or remove a fence line; if the file was not
yet repaired (this lane merged first), leave the fence lines exactly as found
and let the stray-fences lane re-anchor.

### 4. Give the Detail Level table one home, scope `oat sync`, and scope the approval and `AGENTS.md` checks

**Detail Level.** Delete the table from `create-agnostic-skill/SKILL.md` and
keep the copy in `references/skill-template.md` as its single home, replacing
the SKILL.md occurrence with a one-line pointer to
`references/skill-template.md`. This follows the skill's own "Avoid
duplication — info lives in SKILL.md or references, not both" guidance and
shortens the always-loaded body.

**`oat sync`.** In `create-agnostic-skill/SKILL.md` Step 5, make the sync
conditional and scoped: it applies only when the repository uses OAT sync, and
the command is `oat sync --scope project`. State in prose that a bare
`oat sync` defaults to `--scope all`, which also rewrites the invoking user's
home-scope provider directories, naming `withScopeOption` in
`packages/cli/src/commands/shared/scope-option.ts` as the owner of that
default and the `sync --help` snapshot test in
`packages/cli/src/commands/help-snapshots.test.ts` as its backstop. Apply the
same `--scope project` form to the Troubleshooting remedy. Delete the
``✅ `oat sync` run successfully`` line from Success Criteria entirely — a
provider-view refresh is not a property of a correctly authored skill.

In `create-oat-skill/SKILL.md` Step 5, apply the identical scoped, conditional
treatment to its bare `oat sync`. Its Success Criteria already omit sync;
leave them as they are apart from the `AGENTS.md` change below.

In `.agents/docs/skills-guide.md`, leave the existing `oat sync --scope all`
example as it is — that section is about user-level distribution and the flag
is correct there — and add one sentence stating what each scope writes, so the
guide and the skills no longer read as contradicting each other.

**Approval.** Replace `create-agnostic-skill/SKILL.md`'s "Present the plan and
wait for user approval before creating files." with scoped authorization
modelled on the sibling skill's existing shape: present the plan, ask once,
and state the approval scope — which files the approval covers (the skill
directory, `SKILL.md`, and any supporting files the plan names), whether it
covers the whole run or one file set, and what happens if the user declines.
Re-ask only when the file set changes.

**`AGENTS.md`.** Replace `create-agnostic-skill/SKILL.md`'s `Skill appears in
`AGENTS.md`` verification bullet and `create-oat-skill/SKILL.md`'s
`✅ Skill registered in `AGENTS.md`` success criterion with a check that can
actually be run and does not contradict the repository's no-duplicated-inventory
rule: confirm the skill resolves through the provider views after a scoped
sync, for example with `oat tools info <skill-name>` or the provider's own
skill list. Do not instruct the author to add an inventory entry to
`AGENTS.md`.

**Verify:**

```bash
grep -rn '^\s*oat sync\s*$\|`oat sync`' \
  .agents/skills/create-agnostic-skill/SKILL.md \
  .agents/skills/create-oat-skill/SKILL.md; echo "exit=$?"
```

→ no bare-`oat sync` occurrences remain; `exit=1`.

```bash
grep -rn "AGENTS.md" \
  .agents/skills/create-agnostic-skill/SKILL.md \
  .agents/skills/create-oat-skill/SKILL.md; echo "exit=$?"
```

→ no output, `exit=1` (neither skill instructs the author to touch `AGENTS.md`).

```bash
grep -c "| Skill Type" .agents/skills/create-agnostic-skill/SKILL.md \
  .agents/skills/create-agnostic-skill/references/skill-template.md
```

→ `0` for `SKILL.md` and `1` for `skill-template.md`.

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/validation/named-skill-load-contract.test.ts
```

→ passes, proving the `create-oat-skill` Step 2 prose pins survive the Step 5
and Success Criteria edits untouched.

### 5. Add the `allowed-tools` separator corpus backstop

The item requires the separator to be consistent and either to match the
spec's space-delimited example or to document the comma form as OAT's choice.
OAT never parses the separator (verified: only a presence check in
`packages/cli/src/validation/skills.ts` and a raw read in `packages/cli/src/
commands/tools/info/index.ts`), and all 79 canonical skills that declare the
field already use commas. Rewriting 78 files to satisfy an example in a
research document would be a large, behaviourally inert diff. **Document the
comma form as OAT's choice** and back it with a corpus rule so it cannot drift.

Add a test to `packages/cli/src/validation/skills.test.ts` — placed beside the
existing corpus sweeps, located by neighbouring `describe` name rather than by
line offset — named along the lines of `it('declares allowed-tools as a
comma-separated list in every canonical skill')`. It reads every
`.agents/skills/*/SKILL.md`, and for each that declares `allowed-tools` with
more than one tool, asserts the value contains a comma and contains no
space-separated bare tool token. A single-token value such as `Read` passes
with no separator.

Then update the three documentation surfaces so they agree with the rule:
change `.agents/docs/skills-guide.md`'s `# Space-delimited tool list
(experimental)` annotation to state that the spec's example is space-delimited,
that OAT writes comma-separated values, and that the field is not parsed by
OAT — naming this new test as the backstop for the convention. Add the same
one-line convention note wherever `create-agnostic-skill` and its template
first show the field, again naming the test, never a line number.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/validation/skills.test.ts -t "allowed-tools"
```

→ the new test runs and passes.

Negative control, in a throwaway checkout only:

```bash
SCRATCH=$(mktemp -d) && git worktree add "$SCRATCH/probe" HEAD
```

Inside `"$SCRATCH/probe"`, rewrite one skill's `allowed-tools` value to a
space-separated list, re-run the focused command, and confirm it fails naming
that skill. Discard the probe worktree with `git worktree remove` when done;
never delete a variable path with `rm -rf`.

### 6. Add the description-length scoping backstop

Step 2's rewritten prose makes a new standing claim: OAT's 500-character rule
applies to `oat-*` skills. `DR-260906` requires that claim to ship its own
executable backstop.

Add a test to `packages/cli/src/validation/skills.test.ts` beside the existing
`it('reports description longer than 500 characters')`, named along the lines
of `it('does not report a long description for a non-oat-* skill')`. Build the
same over-length description fixture that the existing positive case uses,
write it into a skill directory whose name does **not** begin with `oat-`, run
`validateOatSkills`, and assert no `exceeds 500 characters` finding is
produced. Keep the existing positive test unchanged so both directions are
covered by adjacent cases.

This is a scoping assertion about an existing rule, so it must not weaken the
positive case. **Weaker-anywhere rule:** any input that
`validateOatSkills` rejects today and would accept after this change is a
Critical finding. This plan changes no validator code and no fixture read by
the positive case; if the positive test's assertions change in any way, stop.

**Verify:**

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run \
  src/validation/skills.test.ts -t "500 characters"
```

→ both the existing positive case and the new negative-scope case pass.

### 7. Take the two version bumps last

Set `metadata.version` to `1.5.0` in
`.agents/skills/create-agnostic-skill/SKILL.md` (minor: guidance
reorganization and new authoring conventions, backward compatible) and to
`1.5.4` in `.agents/skills/create-oat-skill/SKILL.md` (patch: two
corrections). Both stay nested under `metadata:`; do not add a column-0
`version:` key.

If the stray-fences lane already landed in this PR, `create-agnostic-skill`
reads `1.4.4` on the base: set it to `1.5.0` anyway. That is still one bump
in the final PR diff against `origin/main` (`1.4.3` → `1.5.0`), which is
what `DR-260906-one-version-bump-per-changed` and `check:skill-bumps`
measure; record in the wave's Drift Refresh Record that this lane owns the
`create-agnostic-skill` bump value.

Re-run the old-literal sweep after the bump to confirm nothing else pinned
them:

```bash
grep -rn "1\.4\.3\|1\.5\.3" packages/cli/src tools/smoke .agents/skills \
  apps/oat-docs/docs packages/cli/scripts; echo "exit=$?"
```

→ no output, `exit=1`.

**Verify:**

```bash
git fetch origin main --quiet && pnpm run check:skill-bumps > gate.log 2>&1; \
  echo "exit=$?"
```

→ `exit=0`. If it reports a missing bump for a skill this plan did not intend
to change, a stray edit leaked into another skill — stop and inspect the diff.

### 8. Run the lane gates

```bash
pnpm exec oxfmt --write \
  .agents/skills/create-agnostic-skill/SKILL.md \
  .agents/skills/create-agnostic-skill/references/skill-template.md \
  .agents/skills/create-oat-skill/SKILL.md \
  .agents/docs/skills-guide.md \
  packages/cli/src/validation/skills.test.ts
pnpm check            > check.log     2>&1; echo "check=$?"
pnpm type-check       > tc.log        2>&1; echo "type-check=$?"
pnpm lint             > lint.log      2>&1; echo "lint=$?"
pnpm format           > format.log    2>&1; echo "format=$?"
pnpm oat:validate-skills > vs.log     2>&1; echo "validate-skills=$?"
pnpm test:skills      > skills.log    2>&1; echo "test-skills=$?"
HOME=$(mktemp -d) pnpm exec turbo run test --force > test.log 2>&1; echo "test=$?"
```

**Verify:** every echoed status is `0`, and `test.log` contains neither
`cache hit, replaying logs` nor `>>> FULL TURBO`. A green run that replayed
cache is not evidence.

## Test plan

- **New:** `packages/cli/src/validation/skills.test.ts` — `it('declares allowed-tools as a comma-separated list in every canonical skill')`. Structural pattern: the existing repository-corpus sweeps in the same file that read every `.agents/skills/*/SKILL.md` and assert a repo-wide property. Regression proved: the documented `allowed-tools` convention silently diverging from what the corpus actually contains. **Red-then-green negative control:** in a throwaway `git worktree` at `HEAD`, change one skill's `allowed-tools` to a space-separated list and confirm the focused run fails naming that skill (red); restore and confirm it passes (green). Focused command: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts -t "allowed-tools"`.
- **New:** `packages/cli/src/validation/skills.test.ts` — `it('does not report a long description for a non-oat-* skill')`. Structural pattern: the adjacent `it('reports description longer than 500 characters')`, reusing its fixture construction with a non-`oat-` directory name. Regression proved: the newly written scoping claim ("OAT enforces this for `oat-*` skills") drifting from `validateOatSkills`'s actual filter. **Red-then-green negative control:** neutralize the guard by changing `packages/cli/src/validation/skills.ts:1214`'s filter to accept every directory, confirm the new test fails (red), restore the filter, confirm it passes (green). Report that the guard was proven able to fail. Focused command: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/skills.test.ts -t "500 characters"`.
- **Existing, must stay green — treat a failure as a plan defect, never edit the test:** `packages/cli/src/commands/init/tools/shared/create-agnostic-skill-bundle-contract.test.ts`. It is the guard for the matrix consolidation: it asserts both `create-agnostic-skill/SKILL.md` and `references/skill-template.md` contain `references/docs/skills-guide.md` and contain no `.agents/docs/skills-guide.md`, and that the vendored symlink resolves and still opens with `# Skills Research Reference`. **Red-then-green negative control:** before making the step-3 edits, temporarily replace the bundled pointer in `skill-template.md` with the repo-root path and confirm the test fails on the `not.toContain` assertion; restore.
- **Existing, must stay green:** `packages/cli/src/validation/named-skill-load-contract.test.ts`, specifically `it('keeps the authoring convention that makes the corpus rule reusable')`. It pins six literal fragments from `create-oat-skill` Step 2. This plan edits only Step 5 and Success Criteria of that file; the test passing is the evidence the pins were not disturbed.
- **Existing, must stay green:** the `describe('authoring contract — executable backstops for standing claims')` block in `packages/cli/src/validation/skills.test.ts`, which extracts the `Executable backstops for contract claims` requirement block from `create-oat-skill` Step 3 and checks each clause plus a no-line-number rule. Adding tests to the same file must not disturb it.
- **Existing, must stay green:** `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`. It sweeps authored skill Markdown for `.agents/docs/*.md` references that neither resolve via a vendored `references/docs/` copy nor carry a `monorepo only` marker, and it sweeps every dated external plan for the readiness contract — including this plan. Focused command: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`.
- **Full relevant suite:** `HOME=$(mktemp -d) pnpm exec turbo run test --force` from the repository root → all packages pass with no cache replay. The isolated `HOME` matters: tests that exercise the bundle template tier resolve against `~/.oat/templates/` when a real home is present.

## Done criteria

- [ ] `create-agnostic-skill/SKILL.md` and `.agents/docs/skills-guide.md` state the body budget in one unit; `grep -rn "5k words\|(spec constraint)"` over both files returns nothing.
- [ ] No surface attributes a single-line or ≤ 500-character description limit to Codex; `grep -rn "Codex enforces\|Codex limit"` over both skills and the guide returns nothing.
- [ ] OAT's 500-character rule is stated as OAT policy, names `validateOatSkills` in `packages/cli/src/validation/skills.ts` as its owner and `packages/cli/src/validation/skills.test.ts` as its backstop, states its `oat-*` scope, and cites no line number.
- [ ] The redirected `developers.openai.com/codex/skills` URL is replaced by `https://learn.chatgpt.com/docs/build-skills` in all four in-scope places, and the Codex-behaviour bullet records the actual documented context budget with the verification date `2026-09-08`.
- [ ] The blanket "other agents ignore unknown frontmatter fields" sentence is gone; the surviving Codex unknown-key claim lives once, in the dated compatibility section, marked unverified as of 2026-09-08.
- [ ] One canonical frontmatter matrix remains, in `.agents/docs/skills-guide.md`, carrying a verification date; `create-agnostic-skill/SKILL.md` holds no matrix table and points at the bundled guide; the `npx skills` matrix is labelled a vendor claim and yields to the canonical one.
- [ ] The Detail Level table appears exactly once, in `references/skill-template.md`; `grep -c "| Skill Type"` returns `0` for `SKILL.md` and `1` for the template.
- [ ] `oat sync` is scoped and conditional in both authoring skills, is not a success criterion in either, and the scope claim names `withScopeOption` in `packages/cli/src/commands/shared/scope-option.ts` and the `sync --help` snapshot test in `packages/cli/src/commands/help-snapshots.test.ts`.
- [ ] The `allowed-tools` separator convention is stated consistently across both skills, the template, and the guide, is documented as OAT's comma form with the spec's space-delimited example acknowledged, and is enforced by the new corpus test.
- [ ] The approval-before-creating-files sentence is replaced by scoped authorization naming the file set the approval covers, its run boundary, and the declined-fallback.
- [ ] Neither skill instructs the author to touch `AGENTS.md`; both verify through provider views instead; `grep -rn "AGENTS.md"` over both skills returns nothing.
- [ ] `create-agnostic-skill` is at `metadata.version: 1.5.0` and `create-oat-skill` at `metadata.version: 1.5.4`, both nested under `metadata:` with no column-0 `version:` key.
- [ ] `named-skill-load-contract.test.ts` passes unchanged, proving the `create-oat-skill` Step 2 pins were not disturbed.
- [ ] Both new tests were shown red before the change and green after, and the neutralize-restore control for the scoping test is reported.
- [ ] `pnpm test:skills`, `pnpm run check:skill-bumps`, `pnpm oat:validate-skills`, `pnpm check`, `pnpm type-check`, `pnpm lint`, `pnpm format`, and a forced `turbo run test` all exit `0`, each status captured explicitly.
- [ ] `git status --short` shows only the five in-scope files; nothing under `packages/cli/assets/` is staged.
- [ ] `skill-template.md` is fence-balanced after this lane's edits (the `grep` in step 3), so the widened fence-scan inventory the stray-fences lane adds stays green.

## STOP conditions

Stop and report instead of improvising when:

- live state materially contradicts the verified evidence — in particular, if `packages/cli/src/validation/skills.ts` no longer filters to `oat-*` directories, or `oat sync --help` no longer reports `default: "all"`, the prose this plan writes would be wrong and must be re-derived before editing;
- `https://learn.chatgpt.com/docs/build-skills` no longer returns 200, or now states a description character limit — the dated note must record what the page actually says on the execution date, not what this plan observed;
- any assertion in `named-skill-load-contract.test.ts` or the `authoring contract — executable backstops` block in `skills.test.ts` fails; that means an edit reached pinned prose. Restore the pinned text; never relax the test;
- `create-agnostic-skill-bundle-contract.test.ts` fails after the consolidation; the bundled `references/docs/skills-guide.md` pointer must survive in both files and no repo-root pointer may be introduced;
- any input `validateOatSkills` rejects today would be accepted after the change (weaker-anywhere): that is Critical and this plan authorizes no validator behaviour change at all;
- satisfying a claim appears to require changing `packages/cli/src/validation/skills.ts` — the 500-character rule is kept as-is by design; revising it is a separate decision;
- `BL-260908-restructure-the-authoring` has already executed on the base, so the files have been structurally rewritten;
- the diff grows beyond the five in-scope files — `.agents/docs/provider-reference.md`, the docs-app mirror pair, `oat-skill-template.md`, and anything under `packages/cli/assets/` are all out of scope;
- the fence-scan case the stray-fences lane adds to `named-skill-load-contract.test.ts` reports `skill-template.md` after this lane's edits — an edit added or removed a fence line; restore the fence lines rather than touching that test;
- a named verification gate fails twice after one bounded correction;
- the work would require running `oat sync` at any scope inside the lane worktree.

## Revalidation Before Execution

Revalidate this plan against live state before executing when:

- substantial time passes after the planning date of `2026-09-08`;
- `origin/main` advances materially from `7d70ac307717b95917b8f92aa3fb9f236d1f75ba`;
- PR #190 lands, since it touches `packages/cli/src/commands/help-snapshots.test.ts` and `packages/cli/src/validation/skills.test.ts` (verified with `gh api --paginate .../pulls/190/files`);
- the stray-fences lane or any other `skills.test.ts` writer named in `## Dependencies` merges ahead of this lane;
- `BL-260908-restructure-the-authoring` is planned or executed;
- any in-scope file's step numbering, section order, or quoted text changes — re-locate every anchor by string search, never by the line numbers recorded here;
- the external Codex documentation URL or its content changes;
- the corpus fact behind the `allowed-tools` rule changes, i.e. a new canonical skill lands with a space-separated value.

A plan executed inside a wave refreshes its drift check against the exact
execution `HEAD` after predecessor lanes integrate, not only from the authored
SHA to `origin/main`.

**Correction applied 2026-09-09 (wave-7 p19 execution; wave-close pass; no requirement change):** (1) Step 4's verify grep `'^\s*oat sync\s*$\|`oat sync`'` expects `exit=1`, but the same step prescribes prose stating that a bare `oat sync` defaults to `--scope all`, which necessarily contains the backticked literal — the executable form of the check is `grep '^\s*oat sync\s*$'` (no hits) plus "every executable `oat sync` line carries `--scope project`"; the two surviving backticked matches are the warning prose this step asks for. (2) Step 6's verify command filters with `-t "500 characters"`, but the suggested test title (`does not report a long description for a non-oat-* skill`) contains no such phrase, so the filter would select only the positive case; the landed title is `does not report a description longer than 500 characters for a non-oat-* skill` so the step's own command selects both cases as its expected result requires. (3) Step 5 named only the spec-level block's annotation and specified its content, but its opening sentence ("update the three documentation surfaces so they agree with the rule") let the lane rewrite the block's value to OAT's comma form; the root restored the spec's space-delimited example and put the three prescribed facts in the annotation at the fan-in (review M1). (4) The plan's own "this plan verified there are none" for version pins held on the merged tip too (no `1.4.3` / `1.4.4` / `1.5.3` literal anywhere), and `create-agnostic-skill` landed at `1.5.0` per step 7's soft-ordering rule (one PR-scoped bump from `1.4.3`, superseding p10's `1.4.4`). Executed at `d6391cf72`, merged as `12f50d7c2` with a root address-now `2360559c8`; the deferred `provider-reference.md` URLs and the surviving Codex `name` claims are `BL-260909-re-source-the-surviving-codex`.

## Review focus

- **Every rewritten claim, one at a time.** For each, check that it names an executable owner and a backstop by file and test title, never by line number, and that the named test actually exists and actually covers the claim. A claim that names a plausible-sounding but nonexistent owner is the exact defect `DR-260906` exists to catch, and this change is being made inside the skill that teaches the rule.
- **The `oat-*` scoping sentence.** OAT's 500-character validator does not run over the kind of skill `create-agnostic-skill` produces. Confirm the prose says so plainly rather than implying universal enforcement — an over-broad correction is still a false claim.
- **The dated provider note.** Confirm it records what the page says (a context budget, descriptions shortened first), not a re-phrased version of the claim it replaces, and that it carries both the URL and the verification date.
- **The two prose-pin blast radii.** `create-oat-skill` Step 2 (named-skill execution) and Step 3 (executable backstops) must be byte-identical to the base. Read the diff of that file line by line; a stray reflow is easy to miss and the tests are the only thing standing between it and a broken contract.
- **The consolidation, for information loss.** The 5-column matrix and the template's portability prose are deleted, not merged mechanically. Confirm every row and caveat they carried survives somewhere in the canonical table, or was deliberately dropped as unsourced with that decision stated.
- **The two new tests' negative controls.** A test that cannot fail is not evidence. Both must have been shown red first, and the scoping test's guard-neutralization result must be reported.
- **Scope discipline.** `create-oat-skill/SKILL.md`'s `AGENTS.md` success criterion is included beyond the backlog item's literal list because it is the identical contradiction in the sibling skill already being bumped; confirm that inclusion still reads as correct and that nothing else crept in with it.
- **Deferred on purpose:** the `developers.openai.com` URLs in `.agents/docs/provider-reference.md` (twelve occurrences), the `disable-model-invocation` policy flip, and the whole progressive-disclosure redesign. All belong to other units of work; none should appear in this diff.
