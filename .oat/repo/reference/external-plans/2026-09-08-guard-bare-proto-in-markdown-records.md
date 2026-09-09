---
oat_generated: true
oat_external_plan: true
oat_external_plan_source: backlog-item
oat_external_plan_sources:
  - .oat/repo/pjm/backlog/archived/BL-260908-keep-a-bare-proto-in-markdown.md
oat_external_plan_commit: a594614024725979ebf24bd9a34b3565c30fbffb
oat_external_plan_main_commit: 7d70ac307717b95917b8f92aa3fb9f236d1f75ba
oat_external_plan_date: '2026-09-08'
oat_execution_status: READY
oat_backlog_items:
  - BL-260908-keep-a-bare-proto-in-markdown
oat_issue_url: null
created: '2026-09-08T21:19:08Z'
---

# Guard repository Markdown against the formatter rewriting a bare prototype-key literal into bold

> [!NOTE]
> This is an external implementation plan, not a canonical OAT project
> `plan.md`. Execute it directly, or import it for tracked OAT execution with
> `oat-project-import-plan <this-file>`.
>
> Begin with the drift check. Follow the steps and verification gates in order.
> If a STOP condition occurs, stop and report instead of improvising.

> [!IMPORTANT]
> **Execution status: READY.** No unsatisfied hard dependency blocks execution.
> PR #273 merged on 2026-09-08 and added five decision records and eight docs
> pages inside this guard's scope; re-enumerated on top of its merge commit,
> the violation set is unchanged (eight occurrences in six files). One
> `Soft ordering` row records that the sibling `harden-normalized-config-maps`
> lane edits a decision record inside this guard's scope, so this lane lands
> first and never shares a parallel group with it; that is an ordering
> preference, not a block.

## Outcome

A repository contract test sweeps every tracked Markdown file under
`.oat/repo/**` and `apps/oat-docs/docs/**` and fails when the literal
`` `__proto__` `` appears without a code span, or when its formatter-mangled
form (a bold `proto`, produced when `oxfmt` reads the surrounding underscores as
emphasis markers) appears outside a code span. The eight live occurrences of
that corruption — five already mangled, three bare frontmatter titles that feed
generated Markdown and become mangled on the next commit that stages the
generated file — are repaired in the same change by backticking them, so the
guard is green on the repaired tree and red on the tree as it stands today.
Nothing about `oxfmt`'s behavior changes; the guard makes the silent
meaning-destroying rewrite loud.

## Source and live evidence

- Source backlog item:
  [BL-260908-keep-a-bare-proto-in-markdown — Keep a bare prototype-key literal in Markdown prose from being formatted into bold](../../pjm/backlog/archived/BL-260908-keep-a-bare-proto-in-markdown.md)
- Read that item's `## Triage widening (2026-09-08)` section before executing;
  it is what widens the guard beyond decision records and docs.
- Inspected `HEAD`: `a594614024725979ebf24bd9a34b3565c30fbffb` — the tree whose
  content this plan read (branch `wave-7-plans`).
- Comparison baseline: `7d70ac307717b95917b8f92aa3fb9f236d1f75ba` — the fetched
  `origin/main` tip, which is PR #273's merge commit. `HEAD` is that tip plus
  commits that touch only `.oat/repo/reference/external-plans/` and
  `.oat/repo/pjm/backlog/` (`git diff --name-only origin/main..HEAD` lists
  nothing else). The backlog-item edits on the branch are `external_plans`
  reverse links and `updated` stamps; none adds or removes an occurrence.
- Planning date: `2026-09-08`
- Working tree while planning: `git status --porcelain` was empty.
- Verified evidence:
  - **The rewrite reproduces.** In a `mktemp -d` scratch file containing
    `A bare __proto__ in prose.` and ``Backticked `__proto__` stays.``, running
    `pnpm exec oxfmt --write <file>` rewrote the first line's literal into a
    bold `proto` and left the backticked one untouched. A third line carrying
    a bare literal _and_ an unrelated inline code span (``… next to `code` span``)
    was mangled the same way, so the presence of a code span elsewhere on the
    line does not protect a bare occurrence. `oxfmt` 0.36.x is pinned at
    `package.json:49`.
  - **The mangling vector is lint-staged, not `pnpm format`.** `package.json:20`
    scopes the root `oxfmt --check` to `.agents/skills/**`,
    `apps/oat-docs/docs/**`, and `tools/smoke/**` — `.oat/repo/**` is not in it.
    `.lintstagedrc.mjs:14` maps `'*.md'` to
    `oxfmt --write --no-error-on-unmatched-pattern` with **no path restriction**,
    so every staged Markdown file in the repository, `.oat/repo/**` included, is
    rewritten at commit time. `.oxfmtrc.jsonc` `ignorePatterns` exempts
    `.oat/**/explainers/**` and `.oat/repo/reference/project-recaps/**` but
    nothing else under `.oat/repo`.
  - **Eight live occurrences, enumerated by a scratch scan** that strips fenced
    blocks and inline code spans and then matches both forms, run over
    `git ls-files` for `.oat/repo` and `apps/oat-docs/docs`:

    | File                                                                        | Line | Form                       |
    | --------------------------------------------------------------------------- | ---- | -------------------------- |
    | `.oat/repo/reference/decisions/DR-260908-a-stop-whose-remedy-lies.md`       | 14   | mangled (1)                |
    | `.oat/repo/pjm/backlog/completed.md`                                        | 19   | mangled (2 on the line)    |
    | `.oat/repo/pjm/backlog/index.md`                                            | 269  | mangled (1, generated row) |
    | `.oat/repo/pjm/backlog/index.md`                                            | 274  | mangled (1, generated row) |
    | `.oat/repo/pjm/backlog/archived/BL-260908-guard-normalized-config-maps.md`  | 3    | bare, in the YAML `title`  |
    | `.oat/repo/pjm/backlog/archived/BL-260908-keep-a-bare-proto-in-markdown.md` | 3    | bare, in the YAML `title`  |
    | `.oat/repo/pjm/backlog/archived/BL-260903-preserve-proto-named-config.md`   | 3    | bare, in the YAML `title`  |

    That is six files and eight occurrences. At this `HEAD` the scan covers
    712 tracked Markdown files across `.oat/repo` (641) and
    `apps/oat-docs/docs` (71) and returns exactly the seven rows above; the
    same scan over `.agents/skills` (216 files), `.oat/projects` (134 files),
    and `.oat/templates` (29 files) returns zero, and over every tracked
    Markdown file in the repository (1,207) returns the same seven rows. So
    widening the scope from the item's `.oat/repo/reference/decisions/**` +
    `.oat/repo/pjm/**` to all of `.oat/repo/**` costs no additional repair,
    and PR #273's five new decision records and eight docs pages are clean.

  - **The generated index is downstream of the item titles, not an independent
    source.** `packages/cli/src/commands/backlog/regenerate-index.ts:51` reads
    `frontmatter.title` verbatim; `:98-113` renders it into a table cell through
    `encodeMarkdownTableCell` (`:87-96`), which escapes `&`, `\`, `|`, `<`, and
    `>` and passes backticks through untouched. So the item title is the source,
    the generator copies it faithfully, and `oxfmt` mangles the result on the
    next commit that stages `index.md`. `.oat/repo/pjm/backlog/index.md:3`
    states the table lives in a managed section regenerated by the CLI.
  - **`completed.md` is downstream of the archived item's title in the same
    way.** `packages/cli/src/commands/backlog/archive.ts:269` reads the item
    title from its frontmatter and `:284` writes the entry line as
    `- <date> — <id> — <title> — <summary>`; the archived item's bare title
    became the two bold tokens on `completed.md:19` at the commit that staged
    it. Repairing the archived title and the `completed.md` line together keeps
    the two consistent.
  - **The index is current and the generator's output is not
    formatter-normalized.** In a scratch copy of `.oat/` at this `HEAD`,
    `oat backlog regenerate-index` rewrote the whole managed table (no blank
    line after the `<!-- OAT BACKLOG-INDEX -->` marker, unpadded columns —
    111 insertions / 113 deletions against the committed file), and a following
    `oxfmt --write .oat/repo/pjm/backlog/index.md` restored the committed file
    byte for byte. So (a) no row is stale today, and (b) step 5 must run
    `oxfmt --write` on the regenerated index before diffing, exactly as the
    commit hook would, or the diff will not be confined to the two rows.
  - **Backticks survive a YAML round-trip in a plain scalar.** Parsing
    ``title: Keep a bare `__proto__` in Markdown prose from being formatted into bold``
    with the repository's `yaml` package returns the string intact and
    re-serializes it unquoted and unchanged. A backtick is a reserved YAML
    indicator only in leading position, and none of the three titles begins with
    one.
  - **`.oat/repo/reference/decisions/DR-260907-oat-config-reads-materialize.md`
    is already clean** — six occurrences, all backticked, including the `title`
    and the H1. It is the file the sibling `harden-normalized-config-maps` lane
    edits.
  - **`.oat/repo/reference/decisions/index.md` carries no occurrence.** It is
    generated from record titles by `oat decision regenerate-index`, and every
    record title that names the key already backticks it; the scan above
    confirms the generated index is clean and this plan does not regenerate it.
  - **`markdownlint` exists but is scoped to the docs app.**
    `apps/oat-docs/.markdownlint.jsonc` is the only markdownlint configuration
    in the repository, `markdownlint-cli2` is a devDependency of
    `apps/oat-docs` alone (`apps/oat-docs/package.json:33`), and it is invoked
    only as `markdownlint-cli2 'docs/**/*.md'` from that package's `check`
    script (`apps/oat-docs/package.json:11`).
  - **Repo-corpus contract tests already have a home and an idiom.**
    `packages/cli/src/validation/named-skill-load-contract.test.ts` and
    `packages/cli/src/validation/autonomy-gate-inventory.test.ts` both sweep
    repository Markdown outside the package, resolve the repository root as
    `resolve(process.cwd(), '..', '..')` (vitest runs from `packages/cli`), and
    both explicitly exclude fenced code blocks from their candidate definition.
  - PJM adoption: `oat pjm doctor --json` reports `adoption.state: "declared"`,
    so a `oat backlog regenerate-index` write is permitted.

- Corrections to the source item and the planning brief:
  - The brief stated "there is no `.markdownlint*` config today". **False** —
    `apps/oat-docs/.markdownlint.jsonc` exists. It is docs-app-scoped, which is
    still the reason a markdownlint rule is the wrong instrument here (see
    `## Implementation steps`, step 1), but the premise as written is wrong.
  - The item's triage cites `.oat/repo/pjm/backlog/completed.md:14`. **The
    occurrence is at `:19`**, and there are two on that line, not one.
  - The item's acceptance criteria name only "decision records and docs". The
    triage widening adds `.oat/repo/pjm/**`; this plan implements the widened
    scope and, on the evidence above, widens once more to all of `.oat/repo/**`
    at zero repair cost.
  - The item's description says wave-6 p03 verified "0 mangled / 7 backticked
    occurrences by hand". That was true of the files p03 touched; it is not true
    of the repository, which is what makes the guard necessary.

## Dependencies

| Type                | Dependency                                                                                               | Required state                                                                                                                                                                          | Current state                                                                                                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Soft ordering       | [Harden normalized config maps](./2026-09-08-harden-normalized-config-maps.md)                           | Never in the same parallel group; this guard lands **first**, so that lane's edit to `DR-260907-oat-config-reads-materialize.md` is checked by the guard when it runs `turbo run test`. | Authored in the same batch, not merged. Its own `## Dependencies` carries the reciprocal row (keyed by `BL-260908-keep-a-bare-proto-in-markdown`) and its landing table rates this guard merging first as Minor. |
| Soft adjacency      | [Cover skill and script tests in repo gates](./2026-09-08-cover-skill-and-script-tests-in-repo-gates.md) | No group constraint: that lane writes `.lintstagedrc.mjs` and `AGENTS.md`, which this plan cites as evidence and never writes.                                                          | Authored in the same batch. If it lands first and the `'*.md'` task moved, re-anchor `.lintstagedrc.mjs:14` in the test header comment.                                                                          |
| Soft integration    | Any wave-7 lane that adds, closes, or renames a backlog item                                             | Regenerate `.oat/repo/pjm/backlog/index.md` after integration, `oxfmt --write` it, and re-run the guard test.                                                                           | Pending. `index.md` is a shared generated write surface for the whole wave.                                                                                                                                      |
| Satisfied adjacency | PR #273 (remote project management)                                                                      | Re-run the enumeration on the merged state; repair any new occurrence it introduces.                                                                                                    | Merged 2026-09-08 as `7d70ac307`. Re-enumerated on top of it: its five new `DR-260907-*` records, its decision-index rows, and its eight docs pages carry no occurrence; the set is still the seven rows above.  |
| Soft adjacency      | PR #190 (ReviewPlan Stage A, draft)                                                                      | Re-run the guard test on the merged state.                                                                                                                                              | Open draft. It writes `.oat/repo/pjm/backlog/index.md`, two items, and 8 docs pages.                                                                                                                             |
| Satisfied premise   | `.oat/repo/reference/decisions/DR-260907-oat-config-reads-materialize.md` already passes                 | The guard must not require repairing a file another lane owns.                                                                                                                          | Satisfied — verified clean at this `HEAD` (six occurrences, all backticked).                                                                                                                                     |

No unsatisfied hard dependency remains, so `oat_execution_status` is `READY`.

## Landing-event impact

| Event                                                                                      | Affected | Files in common                                                                                                                                 | Required update                                                                                                                                                                |
| ------------------------------------------------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PR #273 `feat: add provider-neutral remote project management` (merged 2026-09-08)         | None     | `.oat/repo/pjm/backlog/index.md`; five new `DR-260907-*` records and `.oat/repo/reference/decisions/index.md`; 8 `apps/oat-docs/docs/**` pages. | Already reflected: this plan's inspected `HEAD` sits on top of its merge commit and the re-enumeration found no new occurrence.                                                |
| PR #190 `ReviewPlan Stage A compatibility release` (draft) lands                           | Material | `.oat/repo/pjm/backlog/index.md`; two `.oat/repo/pjm/backlog/items/*.md`; one archived item; 8 `apps/oat-docs/docs/**` pages.                   | Same: re-run the guard test, repair by backticking.                                                                                                                            |
| PR #125 `oat-brainstorm visual companion` lands                                            | None     | None of its 26 files is under `.oat/repo/**` or `apps/oat-docs/docs/**`.                                                                        | No plan change.                                                                                                                                                                |
| Sibling lane `harden-normalized-config-maps` integrates first (against the recorded order) | Minor    | `.oat/repo/reference/decisions/DR-260907-oat-config-reads-materialize.md`.                                                                      | Re-run the guard test and repair by backticking if that lane wrote a bare literal; then re-run the drift check.                                                                |
| Sibling lane `cover-skill-and-script-tests-in-repo-gates` integrates first                 | None     | `.lintstagedrc.mjs` (evidence only).                                                                                                            | Re-anchor `.lintstagedrc.mjs:14` in the test header comment if the `'*.md'` task moved; the vector is unchanged unless that lane narrowed the glob, which it does not plan to. |
| Any wave-7 lane regenerates the backlog index                                              | Minor    | `.oat/repo/pjm/backlog/index.md`.                                                                                                               | Re-run `oat backlog regenerate-index` after integration, `oxfmt --write` the result, and confirm the guard is still green.                                                     |

## Drift check

Run before editing:

```bash
git fetch origin main
git diff --stat a594614024725979ebf24bd9a34b3565c30fbffb..origin/main -- packages/cli/src/validation .oat/repo/reference/decisions/DR-260908-a-stop-whose-remedy-lies.md .oat/repo/reference/decisions/DR-260907-oat-config-reads-materialize.md .oat/repo/pjm/backlog/completed.md .oat/repo/pjm/backlog/index.md .oat/repo/pjm/backlog/archived/BL-260908-guard-normalized-config-maps.md .oat/repo/pjm/backlog/archived/BL-260908-keep-a-bare-proto-in-markdown.md .oat/repo/pjm/backlog/archived/BL-260903-preserve-proto-named-config.md packages/cli/src/commands/backlog/regenerate-index.ts packages/cli/src/commands/backlog/archive.ts .lintstagedrc.mjs .oxfmtrc.jsonc
```

Expected at the authored baseline: no output. Then re-run the enumeration in
step 2 and compare the violation set against the seven-row table in
`## Source and live evidence`. A larger set is not a STOP — repair the extra
occurrences the same way and record them. A _smaller_ set means someone already
repaired part of this; confirm the guard still goes red on at least one
occurrence before proceeding, and STOP if it does not. When this plan runs as a
wave lane, re-run the drift check against the exact execution `HEAD` after
predecessor lanes integrate.

## Repository conventions

- Build: `pnpm build` → all packages compile; required before `pnpm test:smoke`
  or `pnpm test:release`.
- Typecheck: `pnpm type-check`.
- Focused test (from `packages/cli`):
  `pnpm exec vitest run src/validation/markdown-proto-literal-contract.test.ts`.
- Forced full test run: `HOME=$(mktemp -d) pnpm exec turbo run test --force`
  from the repository root. `pnpm test --force` does **not** force a re-run, and
  a green run showing `cache hit, replaying logs` or `>>> FULL TURBO` is not
  evidence.
- Lint/format check (non-mutating): `pnpm check`, plus `pnpm lint` and
  `pnpm format` — neither of the latter two runs in CI today.
- Capture each gate's exit code explicitly
  (`pnpm <gate> > gate.log 2>&1; echo "exit=$?"`).
- Implementation pattern: `packages/cli/src/validation/named-skill-load-contract.test.ts`
  — repository-root resolution via `resolve(process.cwd(), '..', '..')`, a
  documented bounded surface, an explicit candidate definition that excludes
  fenced code blocks, and a failure message that lists every offending
  `file:line`.
- Generated artifacts: never hand-edit the managed table in
  `.oat/repo/pjm/backlog/index.md`; regenerate it with
  `oat backlog regenerate-index`. Never hand-edit
  `.oat/repo/reference/decisions/index.md`; regenerate it with
  `oat decision regenerate-index`. Neither generated index is edited directly by
  this plan.
- PJM writes: run `oat pjm doctor --json` and require `adoption.state` of
  `declared` or `inferred-legacy` before any PJM write. Verified `declared` at
  the planning `HEAD`.
- Never run `oxfmt` over an OAT `state.md`; it mangles the frontmatter. No
  `state.md` is in scope here.
- Skill versioning: one `metadata.version` bump per changed skill per PR
  (top-level `version:` is gone since CLI 0.2.65). **This plan changes no
  skill**, so no bump applies; if a step ever did, locate every pin by searching
  the OLD VERSION LITERAL across `packages/cli/src`, `tools/smoke`, and
  `.agents/skills/*/tests`.
- `DR-260906-standing-claims-in-skills-name`: a standing claim written into a
  skill must name what makes it true. No skill prose changes here; the guard's
  own standing claim lives in the test file's header comment and names the
  `oxfmt` rewrite and the lint-staged vector that produce it.
- `.oat/config.json` keys parity: not touched by this plan.
- **Lane mode (the default under the wave-7 execution program):** this plan runs
  as a lane in wave 7, in a worktree at `.worktrees/wave-7/<lane>`, with a root
  review after. In lane mode run the focused test plus `pnpm check`,
  `pnpm type-check`, the forced `turbo run test`, `pnpm run check:skill-bumps`,
  `pnpm lint`, `pnpm format`, and `pnpm oat:validate-skills`. **Do not** edit
  lockstep release files and **do not** run `pnpm release:check-versions` or
  `pnpm release:validate`: the wave fan-in owns the single lockstep bump and the
  full definition-of-done sequence. Only a standalone execution bumps the five
  public packages itself, above freshly fetched `origin/main`, and runs all
  eight AGENTS.md gates in order.
- Git/PR convention: do not push or open a PR unless the wave orchestrator
  instructs it.

## Scope

### In scope

- New file `packages/cli/src/validation/markdown-proto-literal-contract.test.ts`
  — the contract test.
- Repairs, by wrapping the literal in backticks and changing nothing else on the
  line:
  - `.oat/repo/reference/decisions/DR-260908-a-stop-whose-remedy-lies.md:14`
  - `.oat/repo/pjm/backlog/completed.md:19` (both occurrences)
  - `.oat/repo/pjm/backlog/archived/BL-260908-keep-a-bare-proto-in-markdown.md:3`
    (YAML `title`)
  - `.oat/repo/pjm/backlog/archived/BL-260908-guard-normalized-config-maps.md:3`
    (YAML `title`)
  - `.oat/repo/pjm/backlog/archived/BL-260903-preserve-proto-named-config.md:3`
    (YAML `title`)
- `.oat/repo/pjm/backlog/index.md` — regenerated (not hand-edited) with
  `oat backlog regenerate-index` after the two active item titles are repaired.
- Lockstep release files
  (`packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`,
  `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`): never
  edited by this plan when it runs as a wave lane; the wave fan-in makes exactly
  one lockstep bump for the integrated wave. Only a standalone execution bumps
  them itself.

### Out of scope

- `oxfmt`, `.oxfmtrc.jsonc`, and `.lintstagedrc.mjs` — the rewrite is upstream
  behavior and the lint-staged glob is deliberately repository-wide. Changing
  either would be a different, larger decision, and `.lintstagedrc.mjs` is
  concurrently owned by the wave-7 repo-gates lane.
- `apps/oat-docs/.markdownlint.jsonc` and the docs app's `markdownlint-cli2`
  invocation — not extended, not reconfigured (see step 1's rationale).
- `.agents/skills/**`, `.oat/projects/**`, `.oat/templates/**`, and every
  Markdown file outside `.oat/repo/**` and `apps/oat-docs/docs/**`. All are
  verified clean today; adding them is a follow-up, not this change. In
  particular `.oat/projects/shared/wave-6-execution/implementation.md:194` and
  `:357` discuss the mangling and keep both forms correctly inside code spans —
  they must not be "repaired".
- `AGENTS.md` — the convention is documented in the test file's header comment,
  not in repository instructions. `AGENTS.md` is concurrently owned by the
  wave-7 repo-gates lane
  ([Cover skill and script tests in repo gates](./2026-09-08-cover-skill-and-script-tests-in-repo-gates.md)).
- `.oat/repo/reference/decisions/index.md` — generated, verified clean, and not
  regenerated by this plan; no record title changes here.
- Any escape hatch or opt-out marker for the guard. Backticks are always
  available and always correct; a suppression comment would reintroduce the
  silence this guard exists to remove.
- `packages/cli/src/commands/backlog/regenerate-index.ts` — read as evidence
  that titles are copied verbatim; the generator is correct and is not changed.
  Escaping in the generator is the rejected alternative (see step 1).
- Non-Markdown files, and Markdown outside `git ls-files` (untracked or ignored).

## Current state

Three things combine into a silent corruption:

1. `oxfmt` treats a bare double-underscore-delimited token in Markdown prose as
   strong emphasis and rewrites it, so the literal name of the JavaScript
   prototype key becomes a bold word and its meaning is destroyed. Backticked
   occurrences are left alone.
2. `.lintstagedrc.mjs:14` runs `oxfmt --write` over every staged `*.md` file
   with no path restriction, so the rewrite reaches `.oat/repo/**` even though
   the root `pnpm format` glob at `package.json:20` does not cover it.
3. Backlog item titles carry the bare literal in YAML frontmatter, where `oxfmt`
   does not touch it, and `oat backlog regenerate-index` copies those titles
   verbatim into `.oat/repo/pjm/backlog/index.md` — a Markdown table — where the
   next commit that stages the file mangles them. That is why two index rows and
   one `completed.md` entry are already corrupt while the source items are
   merely bare.

No gate notices any of this. `pnpm check`, `pnpm type-check`, `pnpm test`, and
`pnpm build` all pass on the corrupted tree, which is the defect this plan
closes.

## Implementation steps

### 1. Choose the instrument and record the rejection

Implement the guard as a **vitest contract test**, not a markdownlint rule.
Record this rationale in the test file's header comment:

- markdownlint is present only as `apps/oat-docs` devDependency
  `markdownlint-cli2`, configured by `apps/oat-docs/.markdownlint.jsonc`, and
  invoked only over that app's `docs/**/*.md`. Covering `.oat/repo/**` would
  mean a new root-level dependency, a new root config, a new root script, and a
  new CI step — four new surfaces for one rule.
- The rule is not a style rule expressible in markdownlint's built-in set; it
  would require a custom rule module, which markdownlint loads as JavaScript
  and which would then itself need a gate.
- `packages/cli/src/validation/` already holds repository-corpus contract tests
  that sweep Markdown outside the package, and they run under `turbo run test`,
  which CI already gates via `pnpm test` (`.github/workflows/ci.yml:36-37`). The
  guard therefore gets CI coverage with zero new wiring.
- The rejected alternative of escaping titles inside
  `packages/cli/src/commands/backlog/regenerate-index.ts` was not chosen: it
  would fix only the generated index, would leave `completed.md` and hand-written
  prose unguarded, and would make the generator responsible for a formatter
  quirk it has no knowledge of.

**Verify:** the header comment of the new test file names the `oxfmt` rewrite,
the `.lintstagedrc.mjs:14` vector, and the markdownlint rejection, and no new
dependency appears in any `package.json`
(`git diff --stat -- '**/package.json' pnpm-lock.yaml` → empty).

### 2. Enumerate the violations on the unmodified tree (red state, before any repair)

Write a throwaway enumeration script in a `mktemp -d` directory (never inside
the repository; never delete a variable path with `rm -rf`) that:

- lists candidate files with `git ls-files .oat/repo apps/oat-docs/docs`,
  filtered to `*.md`;
- blanks fenced code blocks (both backtick and tilde fences, tracking the
  opening fence marker so a nested fence of the other kind does not close it);
- removes inline code spans on each remaining line (a backtick run, then the
  shortest non-greedy span, then the same-length closing run);
- reports every remaining line matching either the bare literal or its bold
  mangled form.

**Verify:** the script reports exactly the seven rows in the evidence table
above and a total of eight occurrences (`completed.md:19` carries two) across
712 scanned files. Record the output verbatim; it is this change's red control.

### 3. Add the contract test

Create `packages/cli/src/validation/markdown-proto-literal-contract.test.ts`
using `packages/cli/src/validation/named-skill-load-contract.test.ts` as the
structural pattern:

- resolve the repository root as `resolve(process.cwd(), '..', '..')`;
- enumerate tracked Markdown under `.oat/repo` and `apps/oat-docs/docs` — read
  the file list from `git ls-files` so untracked scratch files and ignored paths
  are never scanned;
- reuse step 2's stripping logic verbatim so the test and the enumeration cannot
  drift;
- one `it` per form so each acceptance clause has its own red control: one
  rejecting the bold mangled form, one rejecting the bare literal;
- on failure, list every offending `file:line` with the offending line's text
  and state the fix ("wrap the literal in backticks"); an assertion that reports
  only a count is not acceptable;
- assert the scanned file count is greater than zero, so a broken glob or a
  wrong `cwd` fails loudly instead of passing vacuously.

Note in a comment that YAML frontmatter is scanned as prose _on purpose_: a bare
literal there is not mangled in place but propagates into generated Markdown
that is.

**Verify:** `pnpm exec vitest run src/validation/markdown-proto-literal-contract.test.ts`
from `packages/cli` → **both cases fail**, and the failure output lists exactly
the seven `file:line` rows from step 2. This is the plan's required
red-before-green control; capture the output.

### 4. Repair the two hand-written Markdown files

In `.oat/repo/reference/decisions/DR-260908-a-stop-whose-remedy-lies.md:14`,
wrap the mangled token in the `Wave 6 p03 (preserve …-named config keys)`
parenthetical back into a backticked literal. In
`.oat/repo/pjm/backlog/completed.md:19`, do the same for both occurrences on the
line. Change nothing else on either line — the decision record's substance and
the completed entry's `YYYY-MM-DD — ID — Title — summary` shape must be
byte-identical apart from the backticks.

**Verify:** `git diff -- .oat/repo/reference/decisions/DR-260908-a-stop-whose-remedy-lies.md .oat/repo/pjm/backlog/completed.md`
shows exactly two changed lines and three added backtick pairs; re-running
step 2's enumeration no longer reports either file.

### 5. Repair the three item titles and regenerate the index

Backtick the literal inside the `title:` value of
`.oat/repo/pjm/backlog/archived/BL-260908-keep-a-bare-proto-in-markdown.md`,
`.oat/repo/pjm/backlog/archived/BL-260908-guard-normalized-config-maps.md`, and
`.oat/repo/pjm/backlog/archived/BL-260903-preserve-proto-named-config.md`.
Leave the values unquoted; backticks are legal in a YAML plain scalar that does
not begin with one, and the repository's `yaml` package round-trips them
unchanged. Do not change `id`, `updated`, or any other field beyond what the
title edit requires, and do not touch the archived item's body.

Then, after confirming `oat pjm doctor --json` reports `adoption.state` of
`declared` or `inferred-legacy` (it reports `declared` at this `HEAD`),
regenerate the managed index rather than editing it, and normalize the
generator's output with the same formatter the commit hook applies:

```bash
pnpm run cli -- backlog regenerate-index
pnpm exec oxfmt --write .oat/repo/pjm/backlog/index.md
```

The second command is not optional. The generator emits an unpadded table with
no blank line after the `<!-- OAT BACKLOG-INDEX -->` marker, so the raw diff
against the committed, formatter-normalized file is a whole-table rewrite
(verified: 111 insertions / 113 deletions at this `HEAD`, collapsing to zero
after `oxfmt --write`). Running `oxfmt` here is also the point of the change:
the two repaired rows now carry backticks, so the formatter leaves them alone.

**Verify:** `git diff -- .oat/repo/pjm/backlog/index.md` shows changes confined
to the two rows for `BL-260908-guard-normalized-config-maps` and
`BL-260908-keep-a-bare-proto-in-markdown` (at this `HEAD`, `:269` and `:274`);
no row is added, removed, or reordered, and no whitespace-only hunk remains. If
any other row changes, STOP — the index was stale for an unrelated reason and
that is a separate change.

### 6. Turn the guard green and prove it can still fail

**Verify:**
`pnpm exec vitest run src/validation/markdown-proto-literal-contract.test.ts`
from `packages/cli` → both cases pass.

Then, once per clause: reintroduce a single mangled occurrence into
`.oat/repo/pjm/backlog/completed.md`, confirm the bold-form case fails and names
that `file:line`; restore. Reintroduce a single bare occurrence into the same
file, confirm the bare-form case fails and names it; restore. Finally, point the
test's root resolution at an empty directory and confirm the non-empty-corpus
assertion fails, so a silently empty sweep cannot pass; restore. Record all
three.

### 7. Confirm the repaired tree survives the formatter

Stage the repaired Markdown files and let the repository's own commit-time
formatter run over them, or equivalently run
`pnpm exec oxfmt --check <the six repaired files>`.

**Verify:** `oxfmt --check` reports the files already correctly formatted
(exit 0), proving the backticked form is stable under the very tool that
mangled the bare form. Re-run the guard test afterwards → still green.

### 8. Run the lane gates

**Verify (lane mode):** from the repository root, each with its exit code
captured separately — `pnpm check`, `pnpm type-check`,
`HOME=$(mktemp -d) pnpm exec turbo run test --force`,
`pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`, and
`pnpm oat:validate-skills` → every command exits 0. Do not edit lockstep release
files and do not run `pnpm release:check-versions` or `pnpm release:validate`.
**Standalone mode only:** additionally bump the five public packages above
freshly fetched `origin/main` and run the eight AGENTS.md gates in order.

## Test plan

- **New test:** `packages/cli/src/validation/markdown-proto-literal-contract.test.ts`
  with two named cases — one rejecting the bold mangled form, one rejecting the
  bare literal outside a code span — plus a non-empty-corpus assertion.
- **Structural pattern:**
  `packages/cli/src/validation/named-skill-load-contract.test.ts` (bounded
  surface documented in a header comment, fenced blocks excluded from the
  candidate definition, `file:line` reporting).
- **Regression proved:** a formatter rewrite that silently changes the meaning
  of documentation about a prototype-pollution fix, and the propagation path
  from a bare frontmatter title into a generated Markdown table.
- **Red-then-green negative control (required, one per clause):** step 3 shows
  **both** cases red on the unmodified tree, with the failure listing exactly the
  seven known `file:line` rows — this is a reproduction-grade control on real
  repository content, not a fixture. Step 6 shows each case red again after a
  single reintroduced occurrence, and the corpus assertion red against an empty
  root. Step 7 shows the repaired form stable under `oxfmt --check`.
- **Focused command:** from `packages/cli`,
  `pnpm exec vitest run src/validation/markdown-proto-literal-contract.test.ts`
  → 3 passing.
- **Full relevant suite:** `HOME=$(mktemp -d) pnpm exec turbo run test --force`
  from the repository root → passes without a cache replay.

## Done criteria

- [ ] `packages/cli/src/validation/markdown-proto-literal-contract.test.ts`
      fails on the bold mangled form and on a bare literal outside a code span,
      anywhere under `.oat/repo/**` or `apps/oat-docs/docs/**`, and names every
      offending `file:line`.
- [ ] The pre-repair red run is recorded and lists exactly the seven `file:line`
      rows in this plan's evidence table.
- [ ] All eight live occurrences are repaired by backticking, across the six
      files named in `## Scope`; the guard is green.
- [ ] `.oat/repo/pjm/backlog/index.md` was regenerated with
      `oat backlog regenerate-index`, not hand-edited, and its diff is confined
      to the two affected rows.
- [ ] `.oat/repo/reference/decisions/DR-260907-oat-config-reads-materialize.md`
      is unmodified by this change (the sibling lane owns it) and passes the
      guard.
- [ ] `pnpm exec oxfmt --check` reports the six repaired files correctly
      formatted, so the fix is stable under the tool that caused the corruption.
- [ ] Step 6's three neutralization controls are recorded.
- [ ] No new dependency, no new root script, and no change to `.lintstagedrc.mjs`,
      `.oxfmtrc.jsonc`, `AGENTS.md`, or
      `packages/cli/src/commands/backlog/regenerate-index.ts`.
- [ ] Lane mode: `pnpm check`, `pnpm type-check`,
      `HOME=$(mktemp -d) pnpm exec turbo run test --force`,
      `pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`, and
      `pnpm oat:validate-skills` each exit 0 with the exit code captured
      explicitly, and no lockstep release file is edited. Standalone mode: one
      lockstep bump and all eight AGENTS.md gates pass in order.
- [ ] `git status --short` contains no unexplained or out-of-scope files, and no
      scratch directory was created inside the repository.

## STOP conditions

Stop and report instead of improvising when:

- step 3's test passes on the unmodified tree — the detector is wrong (most
  likely its code-span stripping is too aggressive) and a guard that cannot go
  red is worthless;
- the drift re-run in `## Drift check` finds _fewer_ occurrences than the seven
  recorded here and the guard cannot be shown red on any remaining one;
- repairing an occurrence would change the meaning of a decision record or a
  completed-item summary rather than only its rendering — a decision record is a
  durable record, and rewriting its substance is not authorized here;
- `oat pjm doctor --json` reports `adoption.state` of `none` or
  `partial-initialization` (the `oat backlog regenerate-index` write cannot be
  made; initialize with `oat pjm init` first);
- `oat backlog regenerate-index` changes any row other than the two named in
  step 5;
- the fix appears to require editing `.lintstagedrc.mjs`, `.oxfmtrc.jsonc`,
  `AGENTS.md`, or the backlog index generator — all are out of scope and two of
  them are concurrently owned by the wave-7 repo-gates lane;
- **the weaker-anywhere rule fires.** This change adds a guard, so it should be
  strictly stricter. Any Markdown content that the pre-change tree would have
  rejected and the post-change tree accepts is a Critical finding — for example
  a code-span-stripping bug that swallows a real prose occurrence, an escape
  hatch added to make a stubborn file pass, or narrowing the scanned surface
  below `.oat/repo/**` plus `apps/oat-docs/docs/**`;
- a named verification gate fails twice after one bounded correction;
- the work would expose, copy, or rotate a credential without explicit
  authority.

## Revalidation Before Execution

**Refresh applied 2026-09-08 (wave-7 p03 execution; supersedes the step-2 detection algorithm and strengthens the invariant test — the Outcome, Scope, weaker-anywhere rule, and STOP conditions stand):** Step 2's prescribed algorithm ("remove inline code spans on each remaining line") is not implementable on the current tree: it reports two false positives on multi-line code spans (`2026-09-08-harden-normalized-config-maps.md:128` and `:783`), which `oxfmt --write` provably protects (the file is byte-identical after formatting while an appended bare literal is rewritten). The shipped detector is **block-scoped**: classify lines into CommonMark blocks (fenced code, indented code, raw HTML blocks, headings, tables, lists, blockquotes, paragraphs), blank matched fenced-code pairs, mask inline code spans within a block only, and report a bare `__proto__` literal in any remaining prose line. The root review's `oxfmt` oracle battery (54 shapes) then found three silent-acceptance holes in that classifier, which this refresh makes part of the contract: (1) **fence pairing is container-aware** — a fence opener inside a blockquote records its quote-prefix depth, only a fence line at the same depth closes it, and the fence force-closes (blanking nothing beyond its own container) when a non-blank line's quote depth drops below the opener's; a `> ```` ` line never becomes a document-level opener; (2) **raw HTML blocks cover CommonMark types 1–7**, adding type 6 (the block-level tag-name list — `div`, `details`, `table`, `section`, and the rest of the CommonMark list — ending at a blank line) and type 7 (a complete open or closing tag alone on a line, blank-line terminated), so a fence-shaped line inside `<div>`/`<details>` opens nothing; (3) **every line matching the fence pattern is an atomic region boundary** in the line classifier, so an unclosed backtick run can never pair across a fence line, whether or not the fence was paired. **Invariant test (supersedes the table-only check):** the "never accepts an input the formatter would mangle" test derives each case's `formatter` verdict by writing the case to a `mktemp -d` file and running `pnpm exec oxfmt --write` (the repository's own formatter, not a new dependency), asserting `**proto**` presence, and fails when a derived-`mangles` case has no reported occurrence — so the recorded verdicts cannot go stale when the `oxfmt` pin moves. **Documented strict false positives (no escape hatch, per the STOP):** besides indented code, unrecognized fences, and table rows, the guard also rejects a literal inside a link destination, link or reference-definition title, image alt text, autolink, HTML comment, and `<div>`-block content although `oxfmt` preserves them; the failure message carries a second remedy for link constructs (percent-encode the segment as `%5F%5Fproto%5F%5F`, or move the URL into a reference definition whose label can be backticked) because backticks inside a destination or autolink break the link. Test-plan additions: the eleven battery shapes the review names (five blockquote-fence probes, three `<div>`/`<details>` probes, the invalid-info-string fence probe, plus a link-destination and an HTML-comment false-positive case) pinned in `DETECTOR_CASES` with `oxfmt`-derived verdicts; the red control (pre-repair tree → exactly seven rows / eight occurrences) unchanged.

Revalidate this plan against live state before executing when:

- substantial time passes after `2026-09-08`;
- `origin/main` advances materially from
  `7d70ac307717b95917b8f92aa3fb9f236d1f75ba`;
- PR #190 lands, or the sibling `harden-normalized-config-maps` or
  `cover-skill-and-script-tests-in-repo-gates` lane integrates — apply the
  `## Landing-event impact` table and re-enumerate;
- a dependency named in `## Dependencies` changes state;
- the cited line anchors move (`DR-260908-a-stop-whose-remedy-lies.md:14`,
  `completed.md:19`, `index.md:269` and `:274`, the three `title:` lines at `:3`,
  `regenerate-index.ts:51` and `:87-113`, `archive.ts:269-284`,
  `.lintstagedrc.mjs:14`, `package.json:20`);
- the `oxfmt` pin at `package.json:49` moves — re-run the scratch reproduction
  first; if the rewrite no longer happens, the guard is still worth landing but
  its rationale must be updated rather than copied forward;
- the enumeration in step 2 cannot be reproduced.

Executed inside a wave, refresh the drift check against the exact execution
`HEAD` after predecessor lanes integrate, not only from the authored SHA to
`origin/main`.

## Review focus

- That the code-span stripping is not over-broad. The single most likely defect
  is a regex that swallows real prose; the reviewer should confirm the guard
  still goes red when a bare occurrence is inserted into ordinary prose next to
  an unrelated inline code span on the same line.
- That every repair is a backtick and nothing else. Diff each repaired line and
  confirm the surrounding words, the decision record's argument, and the
  completed entry's format are untouched.
- That `.oat/repo/pjm/backlog/index.md` was regenerated rather than hand-edited,
  and that its diff is confined to the two rows.
- That the archived item's title edit is defensible: it is a durable record, and
  the justification is that the bare literal is a rendering hazard which
  propagates into `completed.md`, not a change to what was decided.
- That the red control in step 3 was really run against the unmodified tree
  before any repair. A guard landed together with its repairs is exactly the
  shape of a test that has never been shown able to fail.
- Deferred on purpose: extending the guard to `.agents/skills/**`,
  `.oat/projects/**`, and `.oat/templates/**` (all verified clean today);
  escaping titles in the backlog index generator; and any change to the
  repository-wide `'*.md'` lint-staged glob that caused the corruption.

## Execution record (2026-09-09, wave 7)

Executed as wave-7 p03 (PR #286 `wave-7-execution`, CLI 0.2.67; lane commit(s) `c4053df73` → integration `e92bb7b91`; fix `b108f2dbf` → `e8cbfb090`): a repository contract test (`markdown-proto-literal-contract.test.ts`) rejects a bare `__proto__` literal outside a code span anywhere under `.oat/repo/**` and `apps/oat-docs/docs/**`, with a block-scoped CommonMark classifier (container-aware fence pairing, HTML block types 1–7, fence lines as region boundaries) and an invariant test that derives every case's verdict from real `oxfmt --write`; the seven pre-existing occurrences (two item titles, an archived item title, `completed.md`, the regenerated index, one decision-record line) repaired. Verification: focused 46/46; forced check/type-check/test `Cached: 0` (386 files / 7093); check:skill-bumps, lint, format, validate-skills; red control = exactly the plan's seven rows / eight occurrences on the pre-repair tree, zero on the head; Codex R1 3C/1I/1M/1m + R2 3C (all reproduced against `oxfmt --write`, fixed); root review CHANGES REQUESTED (3C/1I/1M/2m from a 54-shape `oxfmt` battery) → fix round → round 2 PASS (69-shape battery, 0 mangled-but-accepted). Deviations: block-scoped masking instead of the plan's line-level inline-span strip (unimplementable on the tree: two multi-line code spans in an unwritable plan file) — adjudicated justified and written into the plan as a dated refresh together with the three review-found rules and the `oxfmt`-derived invariant.
