---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/items/BL-260907-harden-the-external-plan.md
  - .oat/repo/pjm/backlog/items/BL-260907-settle-the-oat-wave-program.md
oat_external_plan_commit: a594614024725979ebf24bd9a34b3565c30fbffb
oat_external_plan_main_commit: 7d70ac307717b95917b8f92aa3fb9f236d1f75ba
oat_external_plan_date: '2026-09-08'
oat_execution_status: READY
oat_backlog_items:
  - BL-260907-harden-the-external-plan
  - BL-260907-settle-the-oat-wave-program
oat_issue_url: null
created: '2026-09-08T21:19:11Z'
---

# Harden the external-plan readiness contract and settle the wave-program ledger vocabulary

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency. The producer
> vocabulary is settled inside this plan (step 1) before the consumer is
> tightened (step 2), so the ordering the source item requires is internal to
> the lane rather than a cross-lane dependency.

## Outcome

The external-plan readiness contract in
`packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
stops accepting four classes of input it was written to reject, stops
_rejecting_ one class of valid document it was written to accept, and
`oat-wave-program` stops contradicting itself about its own ledger vocabulary.

`oat-wave-program/SKILL.md` names exactly one terminal ledger status —
`merged` — matching its own template and the two live execution programs, and
says plainly that `done` belongs to a wave-table **plan row**, not to a ledger
row; the skill is bumped once and names its executable backstop without citing
a line number. With that settled, `WAVE_STATUSES` drops `done`. The backlog-ID
matcher consumes the complete `(?:-[A-Za-z0-9]+)*` extension before enforcing a
Unicode-aware token boundary, so `BL-123` is no longer satisfied by
`BL-123-other_more`, `BL-123-otheré`, or `BL-123-other--tail`. Definition and
declaration extraction share one line-oriented scanner that resolves HTML
comments, fenced blocks, and raw HTML blocks in document order, so a fence
opener hidden inside a comment can no longer erase every declaration and
definition after it. Entity- and percent-encoded link text is decoded before
matching, and text that cannot be decoded identifies nothing. A `kind: program`
document whose `created` is present but unparsable fails closed into
prospective mode with its own violation instead of sorting into the permissive
legacy branch. The live corpus sweep — 63 dated documents at the inspected
`HEAD`, wave 7's own plans included — classifies exactly as it does today and
rejects nothing.

## Source and live evidence

- Source backlog item:
  [BL-260907-harden-the-external-plan — Harden the external-plan backlink matcher](../../pjm/backlog/items/BL-260907-harden-the-external-plan.md)
- Source backlog item:
  [BL-260907-settle-the-oat-wave-program — Settle the oat-wave-program ledger status vocabulary](../../pjm/backlog/items/BL-260907-settle-the-oat-wave-program.md)
- Absorbed items: at the 2026-09-08 triage the first item above absorbed the
  two follow-ups on decoding and on the unparsable readiness date, and its
  "Merged at the 2026-09-08 triage" section is the authority for that
  consolidation and for the ordering constraint honoured by step 1. Their ids
  are recorded in that section rather than repeated here, so this section's
  declarations name only the two live source items.
- Inspected `HEAD`: `a594614024725979ebf24bd9a34b3565c30fbffb` — branch
  `wave-7-plans`, which is `origin/main` plus three commits that only add or
  edit files under `.oat/repo/reference/external-plans/`; every code and skill
  surface cited below is byte-identical to `origin/main`. The plan directory
  itself differs from `origin/main` by the wave-7 plans, which this plan reads
  as corpus.
- Comparison baseline: `7d70ac307717b95917b8f92aa3fb9f236d1f75ba` — the
  fetched `origin/main` tip (the squash merge of PR #273, merged
  2026-09-08T21:27:49Z), which is also the merge-base with `HEAD`. #273 touched
  neither write surface of this plan (its only `contract.test` file is
  `.agents/skills/oat-pjm-remote/tests/contract.test.mjs`).
- Planning date: `2026-09-08`.
- Working tree while planning: `git status --porcelain` was empty.
- Baseline: `pnpm exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
  from `packages/cli` → 101 passed at the inspected `HEAD`, with every wave-7
  plan swept and accepted in prospective mode.
- Verified evidence (each read at the inspected `HEAD`; the matcher, order,
  decoding, and `created` defects reproduced with a standalone Node script
  replicating the constants and helpers verbatim):
  - `skills-bundled-docs-contract.test.ts:284` —
    `const BACKLOG_ID_MATCH_END = '(?:(?=-[A-Za-z0-9])|(?![\p{L}\p{N}_-]))';`
    used at `:431-434` inside `identifiesSource` as
    ``new RegExp(`${BACKLOG_ID_START}${escapeRegExp(value)}${BACKLOG_ID_MATCH_END}`, 'u')``.
    Reproduced for declared `BL-123` against the lowercased haystack: `BL-123`
    ✓, `BL-123-other` ✓, `BL-123-other-more` ✓, **`BL-123-other_more` ✓**,
    **`BL-123-otheré` ✓**, **`BL-123-other--tail` ✓**, `BL-123-` ✗, `BL-1234`
    ✗, `BL-123foo` ✗. The first branch `(?=-[A-Za-z0-9])` accepts as soon as
    one valid character follows the hyphen and never consumes the extension or
    checks its far boundary — which contradicts the token grammar the same
    file declares at `:273-281` (`BACKLOG_ID_SOURCE = 'BL(?:-[A-Za-z0-9]+)+'`,
    `BACKLOG_ID_TOKEN_END = '(?![\p{L}\p{N}_-])'`) and the comment at
    `:278-280` ("`BL-123--evil` is a malformed identifier, not the ID
    `BL-123`").
  - **Correction to the source item's later framing:** `linkDefinitions()`
    (`:335-348`) does **not** "never strip HTML comments". It calls
    `withoutInlineCode(withoutFences(section))` at `:342`, and
    `withoutInlineCode` (`:331-333`) is
    `withoutHtmlComments(text).replace(CODE_SPAN, ' ')`. Comments **are**
    removed — but _after_ fences. The defect is purely the order, exactly as
    the item's original claim (2) states. `sourceDeclarations()` (`:501-519`)
    has the same order at `:505`:
    `withoutHtmlComments(withoutFences(section))`.
  - Order defect reproduced, and its direction established: for the section
    `<!--` / ` ```markdown ` / `-->` / (blank) /
    `- Source backlog item: [BL-123-add](../items/BL-123-add.md)`, the current
    chain (fences, then comments) yields `" "` — the declaration is gone;
    comments-then-fences yields the declaration intact. **The mirror case does
    not reproduce.** Because `FENCE_OPENER` (`:132`) only matches at the start
    of a line, a fence marker inside a comment always sits on a line after
    `<!--`, so `withoutFences` strips the `-->` line along with everything up
    to the next closer; `withoutHtmlComments` (`HTML_COMMENT` at `:318`,
    `/<!--[\s\S]*?(?:-->|$)/g`) then treats the comment as unterminated and
    removes the rest of the input. Every construction tried — an opener alone,
    an opener plus closer, a real fenced example after the comment, a later
    `-->` — ended with the example hidden. The order defect is therefore
    **one-directional**: it loses real declarations and definitions after such
    a comment (false reject); it can never surface a fenced example as a real
    declaration (no false accept). Step 4's fix is a pure widening for exactly
    that shape, plus one narrowing that is independent of the order (raw HTML
    blocks, below).
  - `skills-bundled-docs-contract.test.ts:848-849` —
    `kind === 'program' ? (date ?? isoDatePart(frontmatter.created)) : date`.
    `:853` — `const malformedDate = date !== undefined && !ISO_DATE.test(date);`
    is computed from `oat_external_plan_date` **only** and never from the
    program `created` fallback. `:854-858` selects the mode, and `:870`
    (`if (mode === 'legacy') return { mode, kind, status, violations };`)
    returns accepted before any rule runs. So a `kind: program` document with no
    `oat_external_plan_date` and `created: 'yesterday'` has
    `malformedDate === false` and `effectiveDate === undefined`
    (`isoDatePart`, `:549-`, returns `undefined` for a non-ISO string), sorts to
    `legacy`, and is accepted with zero checks. Reproduced: `'yesterday'` →
    `legacy`; `'2026-09-20T05:24:43Z'` → `prospective`; absent → `legacy`.
    Fail-open.
  - No decoding anywhere: `git grep -n 'decodeURI'` over the file returns
    nothing, and there is no entity handling. Reproduced consequences for
    declared `BL-123`: `BL-123%2D%2Devil` ✓, `BL-123&#45;&#45;evil` ✓,
    `BL-123&#x2D;&#x2D;evil` ✓, and `BL-123%zz` ✓ all match today, because `%`
    and `&` fall outside `[\p{L}\p{N}_-]` and satisfy the negative-lookahead
    branch, while the decoded form `BL-123--evil` is a malformed identifier the
    grammar rejects; conversely `BL%2D123` ✗ today although it renders as
    `BL-123`. Consuming the full extension (step 3) alone does not close this:
    with the tightened matcher the four encoded forms still match, so decoding
    (step 5) is required.
  - `LINK_DEFINITION` (`:262`) is `/^[ \t]{0,3}\[([^\]]+)\]:[ \t]*(\S+)/gm`
    applied to text from which no raw HTML block has been removed, so a
    `[label]: dest` line inside a `<div>…</div>` block is read as a definition
    Markdown would never resolve (CommonMark type-6 HTML blocks run to the
    next blank line and are not parsed for definitions).
  - `skills-bundled-docs-contract.test.ts:164-169` — the comment above
    `WAVE_STATUSES` states the tolerance and its reason verbatim:
    "`oat-wave-program` documents `composed → in-progress → merged` for a
    wave's ledger row (SKILL.md:66) and also instructs the final row to flip
    to `done` at program close (SKILL.md:116). Both spellings come from the
    producer, so both are accepted here". `:169` —
    `const WAVE_STATUSES = ['composed', 'in-progress', 'merged', 'done'];`.
    The check runs at `:899-901`, building its message from
    `WAVE_STATUSES.join(', ')`. Note the comment keys its claim to physical
    line numbers (already stale by one line each); step 2 rewrites it.
  - `.agents/skills/oat-wave-program/SKILL.md:67-69` — "**Status ledger:** per
    wave — composed → in-progress (project link) → merged (PR + merge SHA +
    completion record link). Updated by this skill's `wave-close` mode …".
  - `.agents/skills/oat-wave-program/SKILL.md:117-118` — "6. When the final
    wave's ledger row flips to `done` and all wave merges are recorded, stop
    at exactly one HUMAN-GATED program completion checkpoint". This is the one
    real ledger contradiction.
  - **Narrowing the settle item:** the other two `done` mentions are _not_
    ledger-status contradictions. `:103` — "Flip the wave's plan rows to
    `done`" — is the wave-table plan-row vocabulary declared at `:57-59`
    (`pending | in-wave | done | deferred | dropped`), which is correct.
    `:125` — "flip every `completion tail: deferred to program close` ledger
    disposition to `done`" — is a disposition value carried inside the Record
    cell, not a Status cell. Only `:117` changes.
    `git grep -n '\`done\`' -- .agents/skills/oat-wave-program/SKILL.md`returns exactly`:103`, `:117`, `:125`.
  - `.agents/skills/oat-wave-program/assets/execution-program-template.md:21-23`
    — the Status column placeholder is
    `{ composed / in-progress / merged }`; the wave-table Status placeholder at
    `:27-29` is `{ pending / in-wave / done / deferred / dropped }`. The
    producing template already agrees with `SKILL.md:67`.
  - Live artifacts agree too: every Status cell in
    `.oat/repo/reference/external-plans/2026-08-19-execution-program.md:28-31`
    (W1–W4) and `2026-08-31-execution-program.md:36-41` (W1–W6) is `merged`.
    Neither ledger contains `done`. `oat-wave-execute/SKILL.md:427-431`
    (closeout step 8) flips _plan rows_ to `done`, which is the wave-table
    vocabulary and stays correct.
  - `apps/oat-docs/docs/workflows/wave-workflows.md:67` already documents
    "each wave advances from composed to in-progress to merged", so no docs
    change is required by this plan.
  - `.agents/skills/oat-wave-program/SKILL.md:9` — `metadata.version: 1.5.1`;
    no top-level `version:` key.
  - **No version pin exists for `oat-wave-program`.** A sweep for the literal
    `1.5.1` across `packages/cli/src`, `tools/smoke`, and `.agents/skills`
    returns `.agents/skills/oat-docs-analyze/SKILL.md:8` (a different skill's
    own declaration) and `validation/skills.test.ts:9141` (a synthetic
    `create-oat-skill` fixture). A sweep for `oat-wave-program` across
    `packages/cli/src`, `tools/smoke`, `.agents/skills/*/tests`, and
    `apps/oat-docs/docs` finds prose references, comments inside the contract
    test (`:164`, `:791`, `:845`, `:876`, `:3296`, `:3370`), a `targetSkill`
    entry for the mini-wave fixture README at `:1503`, and
    `pack-manifest.ts:164`, but no `readDeclaredVersion` assertion. The bump
    is still required by the one-bump-per-changed-skill rule and enforced by
    `pnpm run check:skill-bumps`; no pin moves.
  - Corpus size at the inspected `HEAD`: **63** dated files (44 that predate
    wave 7 plus the 19 `2026-09-08-*.md` wave-7 plans) plus the one declared
    non-contract file (`NON_CONTRACT_PLAN_FILES = ['docs-readability-reorg-plan.md']`,
    `:683`; `DATED_PLAN_FILE` at `:682`). The sweep's floor is
    `expect(plans.length).toBeGreaterThanOrEqual(44)` at `:3075`. Every
    wave-7 plan is dated on or after the contract landing date `2026-09-07`
    (`CONTRACT_LANDING_DATE`, `:106`), so they are evaluated in **prospective**
    mode by the same sweep, and all pass today.
  - The existing program cases at `:3295-3436` already pin the shapes this plan
    must not break: `'wave status outside the vocabulary'` (`:3325-3334`)
    builds its expected message from `WAVE_STATUSES.join(', ')` (so the
    message follows the tightening automatically); the producer-shaped case
    (`:3370-3381`) injects `created: '2026-09-20T05:24:43Z'` with no plan date
    and expects `prospective` with no violations; the `legacyProgram` case
    (`:3404-3414`, `date: null` with **no** `created` at all) expects `legacy`
    with no violations — that case is why a _missing_ `created` must stay
    legacy; and `:3416-3435` reads both real programs, expects `legacy` as
    written, and expects `prospective` with no violations once redated to
    `PROSPECTIVE_DATE` (`'2026-09-10'`, `:687`) — which is what proves both
    live ledgers already satisfy the narrowed vocabulary.
  - Sibling wave-7 plans (swept over every `2026-09-08-*.md` in this
    directory): exactly one other plan writes
    `skills-bundled-docs-contract.test.ts` —
    `2026-09-08-keep-plan-writes-on-the-callers-model.md`, which adds one case
    beside `:2584` and already records this plan as a `Soft` row with
    "this plan merges second and re-anchors". No other wave-7 plan writes
    `.agents/skills/oat-wave-program/SKILL.md`.
- Constraining decisions: `DR-260906-standing-claims-in-skills-name` — every
  standing claim in a skill names the code that owns it and ships its
  executable backstop in the same change, never keyed to a physical line
  number. Step 1's skill edit is a standing claim about the contract test, so
  it must name `skills-bundled-docs-contract.test.ts` and its `WAVE_STATUSES`
  symbol without a line number; step 2 applies the same rule to the comment in
  the test.

## Dependencies

| Type           | Dependency                                                                                                                                                               | Required state                                                                                                                                                                                                                                                                                                                    | Current state                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Hard ordering  | The producer vocabulary in `.agents/skills/oat-wave-program/SKILL.md` is settled before `WAVE_STATUSES` is narrowed                                                      | Step 1 lands before step 2 within this lane. Unblocked when `SKILL.md:117` names `merged` and the skill is bumped. Narrowing the consumer first would make the contract contradict the producer.                                                                                                                                  | Satisfied within the lane by step order; no external prerequisite. This plan therefore reads `READY`.    |
| Soft ordering  | [Keep plan writes on the caller's model](./2026-09-08-keep-plan-writes-on-the-callers-model.md) — adds one case to `skills-bundled-docs-contract.test.ts` beside `:2584` | **Never in one parallel group** with this lane. Merge order: this plan first; that plan merges second and re-anchors its insertion point (its own row already says so). This plan's edits are all below `:130` (constants), `:260-520` (helpers), `:829-` (`evaluateExternalPlan`), and `:3040-3440` (cases) — none near `:2584`. | Pending; the reciprocal row exists in that plan.                                                         |
| Soft ordering  | Any wave-7 lane that writes `.agents/skills/oat-wave-program/SKILL.md`                                                                                                   | Never in one parallel group with this lane; only one lane may own the single `metadata.version` bump for a skill in a PR.                                                                                                                                                                                                         | Satisfied by absence — no other wave-7 plan writes this skill (swept 2026-09-08).                        |
| Soft adjacency | Every other wave-7 lane that authors a plan under `.oat/repo/reference/external-plans/`                                                                                  | Those plans exist in the corpus by the time this lane runs and are swept by step 7's control; no coordination beyond running the control on the integrated tree.                                                                                                                                                                  | Landed by wave-7 plan authoring on `wave-7-plans` (19 plans at the inspected `HEAD`, all accepted).      |
| Satisfied      | PR #273 (`feat: add provider-neutral remote project management`)                                                                                                         | Not a write-surface overlap; merged before this lane branches.                                                                                                                                                                                                                                                                    | Merged — squash `7d70ac307717b95917b8f92aa3fb9f236d1f75ba` on 2026-09-08; touched neither write surface. |
| Satisfied      | The absorbed items `BL-260907-decode-entity-and-percent` and `BL-260907-fail-closed-on-unparsable`                                                                       | Folded into `BL-260907-harden-the-external-plan` at the 2026-09-08 triage, so this one plan carries all four control groups.                                                                                                                                                                                                      | Satisfied — recorded in that item's "Merged at the 2026-09-08 triage" section.                           |

There are no unsatisfied hard dependencies: the only `Hard` row is an
intra-lane step ordering that step 1 satisfies before step 2 runs.

## Landing-event impact

| Event                                                               | Affected | Files in common                                                                                                        | Required update                                                                                                                                                                                |
| ------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `keep-plan-writes-on-the-callers-model` merges first (out of order) | Minor    | `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`                                     | Rebase; its one case sits beside `:2584`, outside every range this plan edits. Re-run the full contract file. No plan change.                                                                  |
| `ReviewPlan Stage A` (draft PR #190) merges                         | Minor    | None of this plan's write surfaces (it edits `validation/skills.test.ts`, not `skills-bundled-docs-contract.test.ts`). | Re-run the full `packages/cli` suite on the merged state; no plan change.                                                                                                                      |
| `remote project management` (PR #273)                               | None     | Already merged into the inspected `HEAD`; touched neither write surface.                                               | No action.                                                                                                                                                                                     |
| `oat-brainstorm visual companion` (PR #125) lands                   | None     | None — its 26 files touch neither write surface.                                                                       | No action.                                                                                                                                                                                     |
| Any wave-7 lane merges a new external plan                          | Minor    | `.oat/repo/reference/external-plans/` (read as a corpus, never written here)                                           | Re-run step 7's corpus control against the exact execution `HEAD`; the control is derived from the directory, so a new plan is swept automatically and must not be rejected by the tightening. |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat a594614024725979ebf24bd9a34b3565c30fbffb..origin/main -- packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts .agents/skills/oat-wave-program/SKILL.md .agents/skills/oat-wave-program/assets/execution-program-template.md .oat/repo/reference/external-plans apps/oat-docs/docs/workflows/wave-workflows.md .agents/skills/oat-wave-execute/SKILL.md
```

In a wave lane, re-run the same command against the exact execution `HEAD`
after predecessor lanes integrate, not only from the authored SHA to
`origin/main`. If `BACKLOG_ID_MATCH_END`, `linkDefinitions`,
`sourceDeclarations`, `withoutFences`, `withoutHtmlComments`,
`identifiesSource`, `evaluateExternalPlan`, or `WAVE_STATUSES` changed shape,
re-anchor before editing. If any live execution program's ledger gained a
`done` Status cell, that is a STOP condition for step 2 — settle it in the
artifact first. New files under `.oat/repo/reference/external-plans/` are
expected (other wave-7 lanes author plans) and are handled by step 7's control,
not by re-anchoring.

## Repository conventions

- Focused test: from `packages/cli`,
  `pnpm exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
  (101 passed at the inspected `HEAD`).
- Skill validation and bumps: `pnpm oat:validate-skills`,
  `pnpm run check:skill-bumps` (fetch `origin/main` first — the gate compares
  against it).
- One `metadata.version` bump per changed skill per PR; the bump is PR-scoped,
  not edit-scoped. Top-level `version:` is gone since CLI 0.2.65. Locate pins by
  the OLD VERSION LITERAL across `packages/cli/src`, `tools/smoke`, and
  `.agents/skills/*/tests`. For `oat-wave-program` at `1.5.1` that sweep finds
  no pin; re-run it before assuming that still holds.
- `DR-260906-standing-claims-in-skills-name`: a standing claim in a skill names
  its executable owner and ships the backstop in the same change, never a line
  number.
- Lint/format check (non-mutating): `pnpm lint` and `pnpm format` both cover
  `.agents/skills/**/*.md`; CI runs neither, so both are required here because
  this change touches `.agents/skills`. `pnpm check` additionally runs
  markdownlint over `apps/oat-docs/docs` and `oat:validate-skills`.
- Never run oxfmt over any `state.md`, and never over anything under
  `.oat/repo/reference/external-plans/` from this lane — the corpus is read,
  not written.
- Implementation pattern for the scanner: this file already prefers one shared
  grammar over parallel ad-hoc regexes (`BACKLOG_ID_SOURCE` /
  `BACKLOG_ID_TOKEN_END` / `BACKLOG_ID_MATCH_END` are composed from one source,
  `:273-288`). Follow it: one line-oriented scanner used by both extractors,
  not two chains that can be reordered independently again.
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

- `.agents/skills/oat-wave-program/SKILL.md`
  - `:117` — the final wave's **ledger row** flips to `merged`, not `done`.
  - `:67-69` — add one clause distinguishing the ledger vocabulary
    (`composed | in-progress | merged`) from the wave-table plan-row vocabulary
    declared at `:57-59` (`pending | in-wave | done | deferred | dropped`), and
    name the executable owner of the ledger vocabulary
    (`skills-bundled-docs-contract.test.ts`, symbol `WAVE_STATUSES`) with no
    line number.
  - `metadata.version` (`:9`): one bump.
- `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
  - `WAVE_STATUSES` (`:169`) and its explanatory comment (`:164-168`).
  - `BACKLOG_ID_MATCH_END` (`:284`) and its comment (`:282-283`).
  - `linkDefinitions` (`:335-348`), `sourceDeclarations` (`:501-519`), and the
    new shared line-oriented scanner replacing the
    `withoutHtmlComments(withoutFences(…))` chains.
  - `identifiesSource` (`:422-446`) — decode link text before matching.
  - `evaluateExternalPlan` (`:829-`) — the `created` fail-closed branch and a
    new `MALFORMED_CREATED_VIOLATION` constant beside the existing violation
    constants (`:135-162`).
  - New and updated cases in the two existing describe blocks, plus the corpus
    control in `every current external plan is accepted under its date-selected
mode` (`:3061-3100`).

### Out of scope

- `.oat/repo/reference/external-plans/**` — read as the corpus, never written.
  If the tightening rejects a live plan, that is a STOP condition, not a licence
  to edit the plan.
- Retrofitting legacy plans, and the `mode === 'legacy'` early return at `:870`
  for `kind: 'plan'` and `kind: 'index'` documents. A _missing_ `created` on a
  program also stays legacy — the `legacyProgram` case at `:3404-3414` pins that
  deliberately; only a **present but unparsable** `created` changes.
- Other producer vocabularies: the wave-table plan-row statuses at
  `SKILL.md:57-59` and the `contentTableRows` check (`:567`) are unchanged.
- `.agents/skills/oat-wave-program/assets/execution-program-template.md` — it
  already emits the correct ledger vocabulary; verify, do not edit.
- `apps/oat-docs/docs/workflows/wave-workflows.md` — `:67` already documents
  composed → in-progress → merged. Its stale `oat-wave-program 1.1.0` mention
  at `:16` is a separate standing-claim defect and is **not** fixed here.
- `oat-wave-execute/SKILL.md` — its closeout step 8 (`:427-431`) flips _plan
  rows_ to `done`, which is correct under the settled vocabulary.
- The `## Wave Table` and `## Status Ledger` structural rules themselves, and
  every non-external-plan assertion in this large contract file.

## Current state

The readiness contract lives entirely inside one test file. `evaluateExternalPlan`
classifies a document as `plan`, `index`, or `program`, selects `legacy` or
`prospective` mode from its date, and returns early with zero violations for
legacy documents so the durable corpus stays importable. Prospective documents
are held to provenance, status, section, dependency-table, and source-backlink
rules.

The source-backlink rule is the deepest of them. `sourceDeclarations` extracts
each `- Source …:` bullet plus its indented continuation lines;
`declarationLinks` (`:352`) collects the inline, reference, and autolink links
a declaration renders, resolving reference labels through `linkDefinitions`;
`namedSources` (`:389-415`) extracts the backlog IDs, issue numbers, paths, or
scope words the declaration names in its own prose; and `identifiesSource`
decides, per kind, whether a link identifies a named source. Four independent
weaknesses sit in that path.

First, the backlog-ID matcher is looser than the grammar the same file
declares. Extraction uses a token boundary that forbids even a trailing hyphen;
matching uses a lookahead that stops at the first character after the hyphen,
so any garbage may follow.

Second, both extractors strip fenced blocks _before_ HTML comments. Because
`withoutFences` (`:470-492`) is a stateful line scanner, a fence marker that
only exists inside a comment flips its state, the comment's `-->` is stripped
with the fake fence, and the now-unterminated comment swallows the rest of the
section. Real declarations and definitions after such a comment disappear. The
opposite failure — a fenced example escaping its fence — cannot occur under
the current order, because the same unterminated comment swallows the example
too.

Third, nothing decodes entity or percent escapes, so an encoded separator hides
a malformed identifier behind a boundary the matcher accepts (and an
undecodable escape like `%zz` is accepted as a boundary as well), and nothing
excludes raw HTML blocks from link-definition scanning.

Fourth, the mode selector's malformed-date guard reads only
`oat_external_plan_date`. Programs deliberately fall back to `created`, and
that fallback has no malformed-input guard, so an unparsable `created` sorts a
program into the permissive branch and every program rule is skipped.

Separately, `WAVE_STATUSES` accepts both `merged` and `done` and its comment
says why: the producing skill contradicts itself. The producing template and
both live programs use only `merged`; a single sentence in the skill's
program-close step says the final ledger row flips to `done`.

## Implementation steps

### 1. Settle the producer vocabulary in `oat-wave-program`

In `.agents/skills/oat-wave-program/SKILL.md`:

- At `:117`, change "When the final wave's ledger row flips to `done`" to
  "flips to `merged`". Change nothing else in that step; the disposition value
  at `:125` (`completion tail: … → done`) and the plan-row flip at `:103` are
  correct and stay.
- At `:67-69`, extend the **Status ledger** bullet so it states the ledger
  vocabulary explicitly (`composed → in-progress → merged`), says that `done`
  is the wave-table plan-row status defined in the Wave table bullet above and
  never a ledger status, and names the executable owner of the ledger
  vocabulary: the external-plan readiness contract in
  `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
  (`WAVE_STATUSES`). Name the file and the symbol; never a line number
  (`DR-260906-standing-claims-in-skills-name`).
- Bump `metadata.version` at `:9` once (`1.5.1` → `1.5.2` at the inspected
  `HEAD`; bump from whatever is current on the execution base).
- Sweep for pins by the OLD version literal before assuming there are none:

```bash
git grep -n -- "<old-version-literal>" -- packages/cli/src tools/smoke .agents/skills
git grep -n -- "oat-wave-program" -- packages/cli/src tools/smoke .agents/skills apps/oat-docs/docs
```

At the inspected `HEAD` neither sweep returns a version assertion for this
skill, so no pin moves. If one now exists, update it in the same change.

Confirm — do not edit — that
`.agents/skills/oat-wave-program/assets/execution-program-template.md:21-23`
still emits `{ composed / in-progress / merged }`.

**Verify:**
`git grep -n 'ledger row flips' -- .agents/skills/oat-wave-program/SKILL.md` →
one hit, naming `merged`;
``git grep -n '`done`' -- .agents/skills/oat-wave-program/SKILL.md`` → the
remaining hits are the plan-row flip (`:103`), the new Status-ledger clause
that names `done` as a plan-row status, and the completion-tail disposition
(`:125`) only;
`git fetch origin main && pnpm run check:skill-bumps` → exit `0` with
`oat-wave-program` reported as bumped; `pnpm oat:validate-skills` → exit `0`.
Capture every exit code explicitly.

### 2. Narrow `WAVE_STATUSES` to the settled vocabulary

In `skills-bundled-docs-contract.test.ts`, set
`WAVE_STATUSES = ['composed', 'in-progress', 'merged']` (`:169`) and rewrite the
comment at `:164-168`: it no longer records a producer contradiction, it records
that `oat-wave-program` names one ledger vocabulary and that `done` belongs to
the wave-table plan rows, which this contract does not validate. Cite the skill
by path and the **Status ledger** bullet, not by line number — the current
comment's `SKILL.md:66` / `SKILL.md:116` cites are already off by one.

The existing case `'wave status outside the vocabulary'` (`:3325-3334`) builds
its expected message from `WAVE_STATUSES.join(', ')` and therefore follows the
change automatically; do not hard-code the message. The real-program redating
loop at `:3416-3435` is what proves both live ledgers still pass.

**Verify:**
`pnpm exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts -t 'execution program'`
→ passes, including the two real programs redated past the contract landing
date (both ledgers use only `merged`), plus a new case asserting a `done`
ledger status is now a violation whose message ends in
`composed, in-progress, merged`.

### 3. Consume the complete backlog-ID extension before the boundary

Replace `BACKLOG_ID_MATCH_END` (`:284`) with a form that consumes zero or more
complete extension segments and then requires the same Unicode-aware token
boundary extraction uses:

```
const BACKLOG_ID_MATCH_END = `(?:-[A-Za-z0-9]+)*${BACKLOG_ID_TOKEN_END}`;
```

Keep the declaration below `BACKLOG_ID_TOKEN_END` (`:281`) so it composes from
the one grammar rather than restating it, and rewrite the comment at `:282-283`
to say what is now true: a link may name the ID exactly or extend it by any
number of complete `-segment`s, and by nothing else — the same rule extraction
applies, so a link can never satisfy a neighbouring or malformed identifier.
`identifiesSource` (`:431-434`) needs no change beyond the constant (step 5
changes what it matches against).

**Verify:**
`pnpm exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts -t 'backlink'`
→ for declared `BL-123`: `BL-123` ✓, `BL-123-other` ✓,
`BL-123-other-more` ✓ (the multi-segment accepted case is retained),
`BL-123-other_more` ✗, `BL-123-otheré` ✗, `BL-123-other--tail` ✗,
`BL-123-` ✗, `BL-1234` ✗, `BL-123foo` ✗.

### 4. Resolve comments, fences, and raw HTML blocks in one document-order pass

Replace the two `withoutHtmlComments(withoutFences(…))` chains with a single
line-oriented scanner — `renderableBlockLines(section: string): string` —
placed beside `withoutFences` and used by both `linkDefinitions` (`:342`) and
`sourceDeclarations` (`:505`). Resolving all three block constructs in one
pass is what makes the ordering bug unrepeatable; two chained helpers can always
be reordered again.

The scanner walks lines once, carrying three pieces of state:

- **HTML comment.** A comment may open mid-line and close mid-line. When a
  comment is open, drop content up to `-->` and continue scanning the remainder
  of the same line for the other constructs; an unterminated comment consumes
  the rest of the input, matching `HTML_COMMENT`'s `(?:-->|$)` at `:318`.
  Comment resolution happens **first on each line**, so a fence marker that
  exists only inside a comment is never seen as a fence marker.
- **Fenced block.** Reuse `FENCE_OPENER` / `FENCE_CLOSER` (`:132-133`) and the
  existing closer rule (same marker character, length ≥ the opener's) from
  `withoutFences` (`:481-488`); drop the opener, the contents, and the closer.
- **Raw HTML block.** A line whose first non-space character is `<` and which
  matches `/^ {0,3}<\/?[A-Za-z][A-Za-z0-9-]*(?:[\s/>]|$)/` opens an HTML
  block that ends at the next blank line (CommonMark's type-6/7 end condition).
  Drop the block's lines. A link definition can never legally open an HTML
  block, so this only removes text Markdown would render as raw HTML. A
  comment opener `<!--` is not an HTML-block opener for this purpose — the
  comment rule above owns it.

Precedence within a line is document order: comment state first, then whichever
of fence or HTML block is already open, then a new opener. `withoutFences` has
exactly the two call sites this step replaces; remove it once both are gone.
`withoutHtmlComments` is additionally used by `withoutInlineCode` (`:332`),
which `declarationLinks` needs for inline comments inside a single declaration
— keep that one.

**Weaker-anywhere note (Critical to enumerate, not to skip):** this step is the
one change in this plan that can make a previously _rejected_ document
_accepted_ — a plan whose only valid source declaration or definition sat after
a comment-hidden fence opener was rejected before and is accepted after. That
widening is deliberate and bounded to exactly that shape. The raw-HTML-block
exclusion is a narrowing. There is no fenced-example escape to close (see the
evidence: under the current order the unterminated comment already hides it),
so Group B's fenced-example case is a **pin**, not a fix. All must be covered
by controls, and step 7's corpus control must show no live plan's
classification changes.

**Verify:**
`pnpm exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts -t 'comment'`
→ the five control cases in the test plan pass.

### 5. Decode entity and percent escapes, consistently, before matching

Add `decodeLinkText(value: string): string | null` beside `identifiesSource`:

1. Replace numeric character references (`&#\d+;` and `&#[xX][0-9a-fA-F]+;`)
   and the five named entities (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`)
   with their characters. One pass only — a double-encoded value decodes to a
   string that still contains `&`, which is outside `[\p{L}\p{N}_-]` and so
   cannot forge a boundary.
2. Percent-decode with `decodeURIComponent` inside a `try`/`catch`; on failure
   return `null`.

In `identifiesSource` (`:423-425`), build the haystack from the **decoded**
label and destination. When `decodeLinkText` returns `null` for either, the
link identifies nothing: return `false` for every kind. Do not match against the
raw and the decoded forms together — a union would be strictly weaker than
either.

**Verify:**
`pnpm exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts -t 'decod'`
→ for declared `BL-123`: `BL-123%2D%2Devil` ✗, `BL-123&#45;&#45;evil` ✗,
`BL-123&#x2D;&#x2D;evil` ✗, `BL%2D123` ✓ (it renders as `BL-123`),
`BL-123%2Dother` ✓, `BL-123%zz` ✗ (undecodable → identifies nothing),
`BL-123&amp;#45;&#45;evil` ✗ (double-encoded, single pass).

### 6. Fail closed on an unparsable program `created`

In `evaluateExternalPlan`, add a constant beside the existing violation strings
(`:135-162`):

```
const MALFORMED_CREATED_VIOLATION =
  'created must be an ISO YYYY-MM-DD date or timestamp';
```

Then, around `:848-858`, compute the program fallback and its own malformed
guard explicitly:

- `createdDate` = `isoDatePart(frontmatter.created)` when
  `kind === 'program'` and `date === undefined`, else `undefined`;
- `malformedCreated` = `kind === 'program' && date === undefined &&
frontmatter.created !== undefined && createdDate === undefined`;
- `effectiveDate` = `kind === 'program' ? (date ?? createdDate) : date`;
- `mode` is `legacy` only when `!malformedDate && !malformedCreated` and the
  effective date is absent or before `CONTRACT_LANDING_DATE`.

After the legacy early return (`:870`), push `MALFORMED_CREATED_VIOLATION` when
`malformedCreated`, exactly as `malformedDate` pushes its own violation at
`:872`. Do **not** change behaviour for a program with no `created` at all, for
`kind: 'plan'`, or for `kind: 'index'`: `legacyProgram` (`:3404-3414`) and
`legacy plans without a date are read in legacy mode and default to READY`
(`:3040`) pin those and must keep passing unchanged.

**Verify:**
`pnpm exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts -t 'execution program'`
→ a program with `created: 'yesterday'` and no plan date is `prospective`,
carries `MALFORMED_CREATED_VIOLATION`, and additionally reports every ledger
rule it violates; the producer-shaped valid case and the no-`created` legacy
case are unchanged.

### 7. Run the corpus control over the whole live corpus, wave 7 included

Extend the sweep case
`every current external plan is accepted under its date-selected mode`
(`:3061-3100`) so it proves the tightening changed no live classification:

- keep `expect(rejected).toEqual([])` and the existing
  `expect(plans.length).toBeGreaterThanOrEqual(44)` floor;
- derive the prospective set from the evaluation rather than a hard-coded file
  list: collect every plan whose `modes` entry is `'prospective'`;
- assert that set is non-empty and has at least 3 members, so the control
  cannot pass vacuously on a corpus that happens to contain no post-contract
  document. Wave 7's own plans supply them (19 at the inspected `HEAD`,
  including this plan, `2026-09-08-close-the-docs-index-follow-ups.md`, and
  `2026-09-08-reconcile-the-oat-doctor-example.md`) and are swept
  automatically because the case reads the directory;
- keep the two named legacy assertions
  (`2026-08-19-hermetic-cli-assets-root.md`,
  `2026-09-04-honor-metadata-version-for-skills.md`) so a mode-selection
  regression is still caught by name.

Run the control **before** and **after** steps 2–6 on the same tree and diff
the `modes` map and the `rejected` list; both must be identical. Record that
comparison — it is the evidence for the item's "classification unchanged"
criterion.

**Verify:**
`pnpm exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts -t 'every current external plan is accepted'`
→ passes, with `rejected` empty and at least 3 prospective plans. The recorded
before/after `modes` maps are identical.

### 8. Gate

**Verify (lane mode, the default under the execution program):** run the full
contract file, then `pnpm check`, `pnpm type-check`,
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

All new cases go in
`packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`,
following the structural pattern of the existing
`every prospective contract rule rejects its own violation` (`:3120`) and
`holds an execution program to its own contract instead of exempting it`
(`:3295`) cases: a table of `[name, input, expectation]` tuples evaluated in a
loop, with real `evaluateExternalPlan` / `linksToItsSource` calls rather than
re-implemented logic.

**Group A — suffix boundaries** (`backlink identifier boundaries`):
declared `BL-123` against `BL-123`, `BL-123-other`, `BL-123-other-more`
(accepted); `BL-123-other_more`, `BL-123-otheré`, `BL-123-other--tail`,
`BL-123-`, `BL-1234`, `BL-123foo` (rejected). Regression proved: a link to a
neighbouring or malformed identifier satisfying a declared ID. **Red-then-green
control:** run Group A against the pre-fix `BACKLOG_ID_MATCH_END` — the three
malformed-suffix cases fail (they are accepted); `BL-123-` is rejected before
and after and is the pin. Record the failure output before applying step 3.

**Group B — comment/fence order** (`comment-hidden fences`): five cases built
as whole `## Source and live evidence` sections and evaluated through
`sourceDeclarations` / `linkDefinitions`:

1. a terminated comment containing a fence opener, followed by a valid linked
   declaration → the declaration is found (the enumerated widening);
2. an unterminated comment containing a fence opener, followed by a
   declaration → the declaration is **not** found (the comment swallows the
   rest of the input, as `HTML_COMMENT` already specifies);
3. a terminated comment containing a fence opener, then a real fence containing
   an _example_ declaration → the example stays hidden (a pin: hidden before
   by the unterminated-comment accident, hidden after by the fence);
4. a terminated comment containing a fence opener, followed by a valid
   reference-link definition and a declaration that uses it → the definition
   resolves and the declaration is found (the same widening on the
   `linkDefinitions` side, which the source item names explicitly);
5. a reference-link definition inside a `<div>…</div>` raw HTML block → the
   reference does not resolve, so a declaration relying on it is rejected;
   the same definition outside the block still resolves (the narrowing).
   **Red-then-green control:** cases 1, 4, and 5 fail against the pre-fix
   chains (1 and 4 because the declaration/definition is lost; 5 because the
   definition resolves); cases 2 and 3 pass before and after and are the pins
   that the fix did not over-correct. Record all five pre-fix results.

**Group C — decoding** (`encoded backlink identifiers`): the seven cases listed
in step 5's verify line, plus a percent-encoded **path** declaration
(`` `src/x y.md` `` declared, `src/x%20y.md` linked → accepted) so decoding is
proven consistent across kinds rather than special-cased for backlog IDs.
**Red-then-green control:** the `%2D%2D`, `&#45;&#45;`, `&#x2D;&#x2D;`, and
`%zz` cases are accepted pre-fix and rejected post-fix; `BL%2D123` is rejected
pre-fix and accepted post-fix. Record both directions — the second is the
enumerated widening for this group.

**Group D — malformed readiness dates** (`program created fails closed`):
a program with `created: 'yesterday'` and no plan date → `prospective` with
`MALFORMED_CREATED_VIOLATION`; a program with `created: '2026-09-20T05:24:43Z'`
→ `prospective`, no violations (unchanged); a program with no `created` and no
plan date → `legacy`, no violations (unchanged); a **plan** with
`created: 'yesterday'` and no plan date → `legacy`, no violations (the fallback
is program-only). Plus a `done` ledger status → violation naming the narrowed
`WAVE_STATUSES`. **Red-then-green control:** the first case and the `done` case
are accepted pre-fix (`legacy` / no violation) and rejected post-fix; record
both.

**Group E — corpus control**, run last, after A–D:
`every current external plan is accepted under its date-selected mode` as
extended in step 7 — `rejected` empty, at least 3 prospective plans, the two
named legacy classifications unchanged, and the recorded before/after `modes`
maps identical. This is the case that proves the four tightenings and the one
widening did not break the durable corpus or any plan wave 7 itself adds.

- Focused command:
  `pnpm exec vitest run src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
  → all cases pass (101 at `HEAD` plus the new groups).
- Full relevant suite: `pnpm exec vitest run src/commands/init` from
  `packages/cli` → green.
- Gate suites: `pnpm run check:skill-bumps` → exit `0`;
  `pnpm oat:validate-skills` → exit `0`.

## Done criteria

- [ ] `oat-wave-program/SKILL.md` uses one terminal ledger vocabulary
      (`merged`), distinguishes it from the wave-table plan-row `done`, names
      its executable backstop by file and symbol with no line number, and is
      bumped exactly once in the PR (`1.5.1` → `1.5.2` on the inspected base).
- [ ] `WAVE_STATUSES` is `['composed', 'in-progress', 'merged']`, its comment
      cites no line number, a `done` ledger status is a violation, and both
      live execution programs still pass redated past the contract landing
      date.
- [ ] The matcher consumes the complete `(?:-[A-Za-z0-9]+)*` extension before
      enforcing the Unicode-aware boundary; the multi-segment accepted case is
      retained and every Group A malformed suffix is rejected.
- [ ] One document-order scanner resolves HTML comments, fenced blocks, and raw
      HTML blocks for both definition and declaration extraction, with Group B's
      five controls recorded; `withoutFences` no longer exists as a separate
      pre-pass.
- [ ] Entity- and percent-encoded link text is decoded before matching and
      undecodable text identifies nothing, with Group C's controls recorded in
      both directions.
- [ ] An unparsable `created` on a `kind: program` document fails closed with
      `MALFORMED_CREATED_VIOLATION`; a missing `created`, a `kind: plan`
      document, and a `kind: index` document are unchanged.
- [ ] Separate controls exist for suffix boundaries, comment/fence order,
      decoding, and malformed readiness dates, followed by the corpus control.
- [ ] The corpus sweep classification is unchanged: the before/after `modes`
      maps are identical and `rejected` is empty, over a corpus that includes
      every plan wave 7 adds.
- [ ] Every widening (a previously rejected input now accepted) is enumerated in
      the review note with its control; nothing outside that enumeration became
      acceptable.
- [ ] Lane mode: the contract file, `pnpm check`, `pnpm type-check`, forced
      `turbo run test`, `pnpm run check:skill-bumps`, `pnpm lint`, and
      `pnpm format` all pass with captured exit codes, and no lockstep release
      file is edited. Standalone mode: one lockstep bump and all eight gates
      pass.
- [ ] `git status --short` contains no unexplained or out-of-scope files, and
      nothing under `.oat/repo/reference/external-plans/` was modified.

## STOP conditions

Stop and report instead of improvising when:

- the corpus control rejects a live plan after any tightening. Fix the rule, not
  the plan: no rule may make a durable plan unreadable, and editing a plan to
  satisfy a new rule would destroy the evidence the control exists to produce;
- the before/after `modes` maps differ for any live document;
- a widening appears that is not in the enumerated set from step 4 and Group C
  — any other input that moves from rejected to accepted is Critical
  (weaker-anywhere) and must stop the lane;
- narrowing `WAVE_STATUSES` would reject a live execution program, or a live
  program's ledger is found to use `done` — settle the artifact first, or stop
  and report; do not re-widen the contract to accommodate it;
- the single-pass scanner cannot reproduce the existing fence-closer semantics
  (same marker character, length ≥ the opener's) or the unterminated-comment
  behaviour — do not ship two chained helpers with a new order instead;
- decoding cannot be made single-pass and total (every input either decodes or
  yields `null`), or a union of raw and decoded matching is needed to keep a
  live plan passing — that union would be strictly weaker than either;
- the `created` fail-closed change alters classification for a `kind: plan` or
  `kind: index` document, or for a program with no `created` at all;
- the old-version-literal sweep finds an `oat-wave-program` version pin this
  plan claims does not exist — update it and record the correction;
- a named verification gate fails twice after one bounded correction;
- live state materially contradicts the drift-check evidence.

## Revalidation Before Execution

**Refresh applied 2026-09-09 (wave-7 p17, post-STOP amendment; amends steps 4, 5, and 7 and the Test plan — the Outcome, Scope, the enumerated-widening rule, and every other STOP stand):** the lane implemented all steps and a differential run of the real old and new code (identical injected probes under vitest) reproduced four widenings outside the enumerated set and three false-rejection classes, all produced by this plan's own step 4/5 prescriptions: (C1) a fence opener hidden by a raw HTML block (`<div>` … ` ```markdown ` … blank … declaration) becomes visible, so a declaration the old scanner hid is now accepted — step 4's claim that the raw-HTML-block rule is only a narrowing is false; (C2) line-preserving comment blanking re-indents a `-->[item]: …` remainder to three columns and manufactures a definition CommonMark would not read (a definition cannot interrupt a paragraph); (C3) the label is percent-decoded, so `[BL%2D123](unrelated)` matches — Markdown never percent-decodes link text; (C4) `decodeURIComponent` decodes reserved delimiters (`%2F`, `%23`, `%3F`, `%26`), so a destination that resolves elsewhere is matched. Also: `<!--` inside a fenced example is treated as a comment; `HTML_BLOCK_OPENER` (verbatim from step 4) accepts any tag-shaped name; a bare `%` in a label voids the link; the residual double-encoding check runs before decoding, so `%252D` bypasses it. **Amended mechanism (non-narrowing of the requirement — the acceptance set of the head must be the base's plus exactly the two enumerated widenings):** (1) the fence machine runs first over raw text and wins: a fence-shaped line always opens or closes a fence (mirroring the wave-7 p03 Markdown guard's rule), `<!--` inside a fence is literal, and a fence opener inside an HTML block still hides what follows it — C1 is therefore not accepted (deliberately non-CommonMark, strictly narrowing relative to the base); (2) a declaration or definition is recognized only when it begins at column 0 of the ORIGINAL line — never at a position created by blanking — which closes C2; (3) the label is never percent-decoded; only HTML character references are decoded in the label (the plan's existing rule), so a bare `%` in a label is ordinary text and C3 and I3 close together; (4) the destination is decoded in exactly one pass and only for unreserved characters (`%41`–`%7A` letters and digits, `%2D` `-`, `%5F` `_`, `%2E` `.`, `%7E` `~`); any other `%XX` (reserved delimiters and `%25` itself) is left in place, and any `%` remaining after that single pass is a residual that rejects the link — closing C4 and the `%252D` bypass in one rule; (5) `HTML_BLOCK_OPENER` is restricted to CommonMark's HTML-block conditions 1–7 (the closed type-6 tag list; a complete open or closing tag alone on a line for type 7) — closing I1; (6) step 5's verify example `BL-123&amp;#45;&amp;#45;evil` is rejected by a residual-character-reference check after one decode pass (the plan's stated rationale was inverted: a residual `&` satisfies the boundary class rather than defeating it) — the lane's construction is adopted; (7) the prospective floor in step 7 is raised from `>= 3` to `>= 18` (21 prospective plans are live; headroom three). **Test plan additions:** one case per closed class (C1 hidden-fence-in-HTML-block still hidden; C2 blanking-created definition not recognized; C3 label `%2D` not matched; C4 `%2F`/`%23`/`%26` destinations rejected as residual; `%252D` rejected; a fenced `<!--` literal; a `<span>`-prefixed declaration accepted; a `(100% done)` label with a valid destination accepted), each red against the pre-refresh working tree and green after; the before/after `modes` maps over the live corpus stay byte-identical; the corpus control stays clean. **Portability:** the bundled `oat-wave-program/SKILL.md` names the readiness contract by name, not by a monorepo test path. **Cross-model review:** `codex exec` wedged three times in this lane's environment (an MCP session-expired error); the lane substituted two independent in-harness reviewers — record that as a gap, and the root review re-attempts Codex once at the review gate.

Revalidate against live state before executing when: substantial time passes
after `2026-09-08`; `origin/main` advances materially from
`7d70ac307717b95917b8f92aa3fb9f236d1f75ba`; PR #190 or #125 lands, or
`keep-plan-writes-on-the-callers-model` merges first (apply the
`## Landing-event impact` rows); a dependency row changes state; any wave-7
lane merges a new external plan (re-run step 7's control); `WAVE_STATUSES`,
`BACKLOG_ID_MATCH_END`, `linkDefinitions`, `sourceDeclarations`,
`identifiesSource`, or `evaluateExternalPlan` moves or changes shape;
`oat-wave-program`'s `metadata.version` moves; a live execution program's
ledger changes; or a load-bearing evidence claim above cannot be reproduced. A
plan executed inside a wave refreshes its drift check against the exact
execution `HEAD` after predecessor lanes integrate, not only from the authored
SHA to `origin/main`.

## Review focus

- **Direction of every change.** Steps 2, 3, 5 (for encoded malformed
  identifiers), 6, and the raw-HTML-block exclusion in step 4 are narrowings.
  Two widenings are deliberate: a declaration or definition formerly hidden by
  a comment-hidden fence opener is now visible (step 4), and a link whose
  _rendered_ destination genuinely identifies the declared source is now
  matched through its encoding (step 5). Confirm the review note enumerates
  exactly those two and that the corpus control shows no live classification
  moved. Any further widening is Critical.
- **The ordering was honoured.** The producer vocabulary is settled in
  `oat-wave-program/SKILL.md` in the same change and _before_ `WAVE_STATUSES`
  is narrowed, so the contract never contradicts the skill it reads.
- **One scanner, not two chains.** The whole point of step 4 is that comments,
  fences, and HTML blocks can no longer be reordered relative to each other.
  A fix that merely swaps the two existing helpers is insufficient and should be
  rejected.
- **The controls can fail.** Every group carries a recorded red-then-green
  transcript; Group B cases 2 and 3 and Group D's unchanged cases are the pins
  that the fixes did not over-correct.
- **Corpus integrity.** Nothing under `.oat/repo/reference/external-plans/` is
  modified. If a plan had to be edited to keep the sweep green, that is a defect
  in the rule.
- Deferred deliberately: the stale `oat-wave-program 1.1.0` claim at
  `apps/oat-docs/docs/workflows/wave-workflows.md:16`; a _missing_ `created` on
  a program still sorting to legacy; and decoding on the declaration (named
  source) side, where an unrecognized source already falls through the
  "names nothing" branch.
