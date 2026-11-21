---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-11-21
oat_phase: plan
oat_phase_status: in_progress
oat_plan_hill_phases: [] # phases to pause AFTER completing (empty = every phase)
oat_plan_parallel_groups: [['p01', 'p02']] # groups of phases that run concurrently in worktrees; [] = fully sequential
oat_plan_source: quick # spec-driven | quick | imported | lite | brief
oat_import_reference: null # e.g., references/imported-plan.md
oat_import_source_path: null # original source path provided by user
oat_import_provider: null # codex | cursor | claude | null
oat_generated: false
oat_template: true
---

# Implementation Plan: mdxcn

> Execute this plan using `oat-project-implement`. It runs sequentially by default and in parallel where `oat_plan_parallel_groups` declares groups.

**Goal:** OAT Fumadocs docs gain eight `docs-*` figure fences, rendered as
static mdxcn-style figures. The capability ships in the shared docs packages
and the `oat docs init` scaffold. Every contributing and bootstrap surface
documents it, in one lockstep release.

**Architecture:** A remark plugin in docs-transforms, placed after tabs and
before links in docs-config, turns `docs-*` fences into `Docs*` MDX elements.
docs-theme provides those elements as static server components, a
`withDocsFigures` component-map wrapper and a `figures.css` export. Full
rationale is in `design.md`.

**Tech Stack:** TypeScript ESM, unified/remark (mdast), React 19 server
components, Fumadocs 16, Tailwind v4, vitest, the OAT CLI (`docs check`,
`docs init`).

**Commit Convention:** `{type}({task-id}): {description}`. For example:
`feat(p01-t02): add docs-* fence transform`.

**Format step (every task that edits files):** run
`pnpm exec oxfmt <each created or edited file>` from the repository root. This
is the file-scoped form of the repository's oxfmt formatter, which
`pnpm format:fix` and the lint-staged hook run. Skip files oxfmt does not
handle, such as `.css`.

**Upstream source:** take mdxcn components from the registry JSON at
`https://mdxcn.dev/r/<name>.json`, extracting each `files[].content` with a
JSON parser, not shell `jq`/`echo`. Record the upstream version or fetch date
in each vendored file's header.

**Spike reference:** the spike copies are read-only, in the main worktree only:

- the spike remark plugin and vendored components, at
  `/Users/tstang/.t3/worktrees/open-agent-toolkit/t3-1aced216-22e6aad08f8c1005/.oat/repo/analysis/mdxcn-spike/`
  (see Pre-implementation);
- the ported CSS utilities, at `/tmp/mdxcn-tools/mdxcn-globals.css`, lines
  353–446.

Do not copy the spike's shortcuts. It used a `cn` without tailwind-merge,
`motion`, and a transform that injected `not-prose`.

## Pre-implementation (root orchestrator, before p01)

Untracked spike edits remain in the main worktree: `apps/oat-docs` changes
plus `pnpm-lock.yaml`. With user approval, the root saves them as a patch and
a copy of `apps/oat-docs/registry/` under the gitignored
`.oat/repo/analysis/mdxcn-spike/`, then restores those paths to `HEAD`.
Phase work must start from a clean tree. p03-t04 replaces the spike with the
packaged capability.

## Planning Checklist

- [ ] Confirmed HiLL checkpoints with user (confirmed at `oat-project-implement` start)
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

`oat_plan_parallel_groups: [['p01', 'p02']]`

- **p01** writes only `packages/docs-transforms/**` and
  `packages/docs-config/**`.
- **p02** writes only `packages/docs-theme/**`. It removes `motion` rather
  than adding it, and adds no new dependency, so `pnpm-lock.yaml` is
  untouched.
- The write sets are disjoint, and each phase verifies on its own with its
  package's tests, type-check and check.
- The one cross-package link is the contract test that docs-theme's
  components equal `DOCS_FENCES`. It is deliberately in p03-t01, after both
  phases merge, because it adds a docs-theme dev dependency on
  docs-transforms, which touches the lockfile.
- **p03** must stay sequential after the group. It integrates both packages
  into the CLI checker, the scaffold and the OAT docs app.
- **p04** must stay sequential after p03. Its guidance documents and
  examples need the integrated build to verify, and it owns the final
  lockstep version bump.

---

## Phase 1: Fence transform (docs-transforms, docs-config)

### Task p01-t01: Extract the shared reparse helper from remarkTabs

**Files:**

- Create: `packages/docs-transforms/src/reparse.ts`
- Modify: `packages/docs-transforms/src/remark-tabs.ts`
- Create: `packages/docs-transforms/src/reparse.test.ts`

**Step 1: Write test (RED)**

`reparse.test.ts` asserts that `reparseMarkdown(value, origin, afterParse?)`:

- parses GFM (a table and a task list);
- offsets every node position by `origin` (line and column) and removes
  `offset`;
- calls `afterParse` with the parsed tree before relocation.

Run: `pnpm --filter @open-agent-toolkit/docs-transforms exec vitest run src/reparse.test.ts`
Expected: fails (module missing).

**Step 2: Implement (GREEN)**

Move the relocation logic from `remarkTabs`' private `reparseContent` into
`reparse.ts`. Tabs supplies its origin from the code block's start, as it does
today, and passes its nested-tab `transformChildren` as `afterParse`. The
helper stays internal: no `index.ts` export.

Run: `pnpm --filter @open-agent-toolkit/docs-transforms exec vitest run src/reparse.test.ts src/remark-tabs.test.ts`
Expected: new and existing tabs tests pass, with positions unchanged.

**Step 3: Format and verify**

Run: `pnpm exec oxfmt packages/docs-transforms/src/reparse.ts packages/docs-transforms/src/reparse.test.ts packages/docs-transforms/src/remark-tabs.ts && pnpm --filter @open-agent-toolkit/docs-transforms type-check && pnpm --filter @open-agent-toolkit/docs-transforms check`
Expected: no errors.

**Step 4: Commit**

`refactor(p01-t01): extract shared reparse helper from remark-tabs`

---

### Task p01-t02: Add remarkDocsFences and DOCS_FENCES

**Files:**

- Create: `packages/docs-transforms/src/remark-docs-fences.ts`
- Create: `packages/docs-transforms/src/remark-docs-fences.test.ts`
- Modify: `packages/docs-transforms/src/index.ts`

**Step 1: Write test (RED)**

The tests cover:

- each of the eight names maps to its component:
  - `docs-steps` → `DocsSteps`
  - `docs-tree` → `DocsTree`
  - `docs-timeline` → `DocsTimeline`
  - `docs-terminal` → `DocsTerminal`
  - `docs-decision` → `DocsDecision`
  - `docs-check` → `DocsCheck`
  - `docs-compare` → `DocsCompare`
  - `docs-annotate` → `DocsAnnotate`
- meta parsing: `title="a b"`, `title='a'`, `title=a`, and a bare flag
  becoming `true`;
- `markdown` body mode yields reparsed children whose positions start one line
  below the opening fence;
- `docs-terminal` (`raw` mode) keeps its body as a single `code` child, so
  `# comment` does not become a heading;
- an unknown `docs-nope` fence fails, naming the fence, its line and the known
  list;
- `ts`, `mermaid` and bare fences pass through unchanged;
- a `docs-*` fence nested in a list or blockquote is transformed.

Run: `pnpm --filter @open-agent-toolkit/docs-transforms exec vitest run src/remark-docs-fences.test.ts`
Expected: fails.

**Step 2: Implement (GREEN)**

Export `DOCS_FENCES: Record<string, { component: string; body: 'markdown' | 'raw' }>`
and `remarkDocsFences: Plugin<[], Root>` from `index.ts`. Add the plugin to
`defaultTransforms` directly after `remarkTabs`. Use the p01-t01 helper with
the fence-body origin (start line + 1). Emit `mdxJsxFlowElement` with no
`className` injection, because the frame carries `not-prose`.

Run: `pnpm --filter @open-agent-toolkit/docs-transforms exec vitest run src/remark-docs-fences.test.ts`
Expected: passes.

**Step 3: Can-fail proof**

Temporarily remove the `file.fail` call. Confirm the unknown-fence test fails
because of that assertion. Restore the call. Record the result in
`implementation.md`.

**Step 4: Format and verify**

Run: `pnpm exec oxfmt packages/docs-transforms/src/remark-docs-fences.ts packages/docs-transforms/src/remark-docs-fences.test.ts packages/docs-transforms/src/index.ts && pnpm --filter @open-agent-toolkit/docs-transforms test && pnpm --filter @open-agent-toolkit/docs-transforms type-check && pnpm --filter @open-agent-toolkit/docs-transforms check`
Expected: all pass.

**Step 5: Commit**

`feat(p01-t02): add docs-* fence transform`

---

### Task p01-t03: Wire the fence transform into the shared source chain

**Files:**

- Modify: `packages/docs-config/src/source-config.ts`
- Modify: `packages/docs-config/src/source-config.test.ts`
- Modify: `packages/docs-transforms/src/composition.test.ts`

**Step 1: Write test (RED)**

- **source-config:** the chain order is tabs → docs fences → links → alert →
  Mermaid.
- **composition:**
  - a `docs-tree` fence inside a `=== "Tab"` body becomes `DocsTree` inside
    `Tab`;
  - a `[x](page.md)` link inside a figure is normalized by `remarkLinks`;
  - a `> [!NOTE]` alert and a Mermaid fence next to a figure are unchanged.

Run: `pnpm --filter @open-agent-toolkit/docs-config exec vitest run src/source-config.test.ts && pnpm --filter @open-agent-toolkit/docs-transforms exec vitest run src/composition.test.ts`
Expected: fails.

**Step 2: Implement (GREEN)**

Insert `remarkDocsFences` after `remarkTabs` in the `source-config.ts` plugin
list.

Run: same as Step 1.
Expected: passes.

**Step 3: Format and verify**

Run: `pnpm exec oxfmt packages/docs-config/src/source-config.ts packages/docs-config/src/source-config.test.ts packages/docs-transforms/src/composition.test.ts && pnpm --filter @open-agent-toolkit/docs-config test && pnpm --filter @open-agent-toolkit/docs-config type-check && pnpm --filter @open-agent-toolkit/docs-config check`
Expected: all pass.

**Step 4: Commit**

`feat(p01-t03): add docs fences to the shared remark chain`

---

## Phase 2: Figure components (docs-theme)

Tests in docs-theme use `.test.ts` with `React.createElement`. The vitest
`include` and the tsconfig `exclude` only cover `*.test.ts`, and `.tsx` tests
would compile into `dist`.

### Task p02-t01: Vendor the static frame, child parser and figures.css

**Files:**

- Create: `packages/docs-theme/src/figures/graph-frame.tsx`
- Create: `packages/docs-theme/src/figures/graph-markdown.ts`
- Create: `packages/docs-theme/src/figures/cn.ts`
- Create: `packages/docs-theme/figures.css`
- Create: `packages/docs-theme/src/figures/graph-frame.test.ts`
- Modify: `packages/docs-theme/package.json` (add the `"./figures.css"`
  export and add `figures.css` to `files`)

**Step 1: Write test (RED)**

Render `GraphFrame` with `title="Ideas"` through `renderToStaticMarkup` and
assert:

- the `[ IDEAS ]` label;
- the frame root has `not-prose`;
- there is no `opacity:0`, `transform` style or `motion` attribute.

Parse a small Markdown-derived element tree through `graph-markdown` and assert
host-tag detection for `p`, `ul`, `li`, `strong`, `em` and `code`, including
elements carrying the host marker. Assert that `package.json` exports
`./figures.css` and that the file exists.

Run: `pnpm --filter @open-agent-toolkit/docs-theme exec vitest run src/figures/graph-frame.test.ts`
Expected: fails.

**Step 2: Implement (GREEN)**

Port upstream `graph-frame` and `graph-markdown` with these changes:

- Remove `"use client"`, `graph-motion` and every `motion` import.
- Render visible markup only.
- Put `not-prose` on the frame root.
- Render inline `code` as a code chip, not bold.
- Make `cn` a local class joiner. Add no new dependency.

`figures.css` contains:

- `--graph-*` tokens mapped to `--color-fd-*`, with `.dark` overrides;
- the `@theme inline` block;
- the `graph-frame`, `graph-rule`, `graph-rule-y`, `scrollbar-graph` and
  `graph-scroll-x` utilities;
- an MIT attribution header.

Each vendored file gets a header naming the upstream source, its date or
version, and the local patches.

Run: same as Step 1.
Expected: passes.

**Step 3: Format and verify**

Run: `pnpm exec oxfmt packages/docs-theme/src/figures/graph-frame.tsx packages/docs-theme/src/figures/graph-markdown.ts packages/docs-theme/src/figures/cn.ts packages/docs-theme/src/figures/graph-frame.test.ts packages/docs-theme/package.json && pnpm --filter @open-agent-toolkit/docs-theme type-check && pnpm --filter @open-agent-toolkit/docs-theme check`
Expected: no errors.

**Step 4: Commit**

`feat(p02-t01): vendor static mdxcn frame, parser and figures.css`

---

### Task p02-t02: Add DocsSteps, DocsTree and DocsTimeline

**Files:**

- Create: `packages/docs-theme/src/figures/{steps,tree,timeline}.tsx`
- Create: `packages/docs-theme/src/figures/fixtures/{steps,tree,timeline}.ts`
- Create: `packages/docs-theme/src/figures/figures-core.test.ts`

**Step 1: Write test (RED)**

Fixtures are mdast-equivalent React element trees, derived from upstream mdxcn
examples and the spike's lifecycle page. Their headers record provenance.

Assert:

- **Steps:** numbered items `01`–`04` with titles and bodies.
- **Tree:** nesting, branch glyphs, a preserved indent under a last-child
  folder (the `whitespace-pre` fix) and right-aligned `— note` text.
- **Timeline:** plain = done ●, bold = now (accent class), italic = next ○.
- **All three:** no hidden-content styles.

Run: `pnpm --filter @open-agent-toolkit/docs-theme exec vitest run src/figures/figures-core.test.ts`
Expected: fails.

**Step 2: Implement (GREEN)**

Port the three components as static server components named `DocsSteps`,
`DocsTree` and `DocsTimeline`, built on p02-t01.

Run: same as Step 1.
Expected: passes.

**Step 3: Format and verify**

Run: `pnpm exec oxfmt <the created files> && pnpm --filter @open-agent-toolkit/docs-theme type-check && pnpm --filter @open-agent-toolkit/docs-theme check`
Expected: no errors.

**Step 4: Commit**

`feat(p02-t02): add static steps, tree and timeline figures`

---

### Task p02-t03: Add DocsTerminal, DocsDecision, DocsCheck, DocsCompare and DocsAnnotate

**Files:**

- Create: `packages/docs-theme/src/figures/{terminal,decision,check,compare,annotate}.tsx`
- Create: `packages/docs-theme/src/figures/fixtures/{terminal,decision,check,compare,annotate}.ts`
- Create: `packages/docs-theme/src/figures/figures-extended.test.ts`

**Step 1: Write test (RED)**

First confirm each grammar against the upstream registry source and doc
comments. Record any divergence from `design.md`'s grammar table in
`implementation.md` before writing fixtures. Assert:

- **Terminal:** from a `raw` code child, `$ cmd` lines are commands, `# …`
  lines are comments and the rest is output.
- **Decision:** bold = chosen (accent), italic = rejected (muted), and
  `— reason` is rendered.
- **Check:** `[x]` rows are done and nested sub-tasks render.
- **Compare:** a GFM table produces option columns, with true/false drawn as
  ✓ and –.
- **Annotate:** a code fence with `// (1)` markers is paired with its ordered
  list of notes.
- **All five:** no hidden-content styles.

Run: `pnpm --filter @open-agent-toolkit/docs-theme exec vitest run src/figures/figures-extended.test.ts`
Expected: fails.

**Step 2: Implement (GREEN)**

Port the five components statically, with the same patch rules as p02-t01.

Run: same as Step 1.
Expected: passes.

**Step 3: Format and verify**

Run: `pnpm exec oxfmt <the created files> && pnpm --filter @open-agent-toolkit/docs-theme type-check && pnpm --filter @open-agent-toolkit/docs-theme check`
Expected: no errors.

**Step 4: Commit**

`feat(p02-t03): add terminal, decision, check, compare and annotate figures`

---

### Task p02-t04: Export the components and withDocsFigures, with a no-hidden-content guard

**Files:**

- Create: `packages/docs-theme/src/figures/index.ts`
- Create: `packages/docs-theme/src/figures/with-docs-figures.test.ts`
- Modify: `packages/docs-theme/src/index.ts`

**Step 1: Write test (RED)**

- `withDocsFigures(map)` keeps the existing entries and adds all eight `Docs*`
  components.
- Host-tag overrides in the input map, such as a custom `p`, are marked so
  that figures still detect them.
- A guard test renders every figure from its fixture. It asserts the
  server HTML has no `opacity:0`, `translateY` or `data-motion` markup and no
  `use client` dependency.

Run: `pnpm --filter @open-agent-toolkit/docs-theme exec vitest run src/figures/with-docs-figures.test.ts`
Expected: fails.

**Step 2: Implement (GREEN)**

Add `withDocsFigures` and export it, the eight components and the
`DOCS_FIGURE_COMPONENTS` name list from the package index.

Run: same as Step 1.
Expected: passes.

**Step 3: Can-fail proof**

Temporarily add an `opacity: 0` initial style to one figure item. Confirm the
guard test fails on that assertion. Revert. Record the result in
`implementation.md`.

**Step 4: Format and verify**

Run: `pnpm exec oxfmt packages/docs-theme/src/figures/index.ts packages/docs-theme/src/figures/with-docs-figures.test.ts packages/docs-theme/src/index.ts && pnpm --filter @open-agent-toolkit/docs-theme test && pnpm --filter @open-agent-toolkit/docs-theme type-check && pnpm --filter @open-agent-toolkit/docs-theme build && pnpm --filter @open-agent-toolkit/docs-theme check`
Expected: all pass, and `dist/` contains the figures.

**Step 5: Commit**

`feat(p02-t04): export figure components and withDocsFigures`

---

## Phase 3: Integration (contract, checker, scaffold, OAT docs app)

### Task p03-t01: Add the fence/component contract test

**Files:**

- Modify: `packages/docs-theme/package.json` (dev dependency
  `@open-agent-toolkit/docs-transforms: workspace:*`)
- Modify: `pnpm-lock.yaml`
- Create: `packages/docs-theme/src/figures/fence-contract.test.ts`

**Step 1: Write test (RED, then GREEN)**

Assert that the component names in `DOCS_FENCES` equal
`DOCS_FIGURE_COMPONENTS`, as sets.

Run: `pnpm install && pnpm --filter @open-agent-toolkit/docs-theme exec vitest run src/figures/fence-contract.test.ts`
Expected: passes. Temporarily remove one entry on either side and confirm it
fails, then restore.

**Step 2: Format, verify and commit**

Run: `pnpm exec oxfmt packages/docs-theme/package.json packages/docs-theme/src/figures/fence-contract.test.ts && pnpm --filter @open-agent-toolkit/docs-theme test`

Commit: `test(p03-t01): pin docs fence names to theme components`

---

### Task p03-t02: Reject unknown docs-\* fences in `oat docs check` for Fumadocs apps

**Files:**

- Modify: `packages/cli/src/commands/docs/check/checker.ts` (or a new
  `docs-fences.ts` beside `diagrams.ts`)
- Modify: `packages/cli/src/commands/docs/check/checker.test.ts`
- Modify: the rule registry under `@config/documentation-check`, if rules are
  enumerated there

**Step 1: Write test (RED)**

- A Fumadocs fixture with a `docs-nope` fence reports one error. The error
  carries the rule id, file, line and known list.
- Known fences produce no finding.
- MkDocs and Markdown fixtures with `docs-nope` produce no finding.

Run: `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/docs/check`
Expected: fails.

**Step 2: Implement (GREEN)**

Reuse `DOCS_FENCES` from `@open-agent-toolkit/docs-transforms`. Gate the rule
on the resolved framework being `fumadocs` (see `files.ts`). Follow
`diagrams.ts` for how a rule scans fenced code and reports findings.

Run: same as Step 1.
Expected: passes.

**Step 3: Format and verify**

Run: `pnpm exec oxfmt <edited files> && pnpm --filter @open-agent-toolkit/cli type-check && pnpm --filter @open-agent-toolkit/cli check`

**Step 4: Commit**

`feat(p03-t02): report unknown docs-* fences in docs check`

---

### Task p03-t03: Wire figures into the Fumadocs scaffold

**Files:**

- Modify: `.oat/templates/docs-app-fuma/app/[[...slug]]/page.tsx` (wrap the
  map with `withDocsFigures`)
- Modify: `.oat/templates/docs-app-fuma/app/globals.css` (add
  `@import '@open-agent-toolkit/docs-theme/figures.css';`)
- Modify: the scaffold tests under `packages/cli/src/commands/docs/init/` that
  pin these files

**Step 1: Write test (RED)**

The scaffold and integration tests assert:

- the generated `page.tsx` uses `withDocsFigures({ ...defaultComponents, Mermaid, Tab, Tabs, img: ZoomImage })`;
- the generated `globals.css` imports `figures.css`;
- the MkDocs scaffold is unchanged.

Run: `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/docs/init`
Expected: fails.

**Step 2: Implement (GREEN)**

Edit the two templates.

Run: same as Step 1.
Expected: passes.

**Step 3: Format, verify and commit**

Run: `pnpm exec oxfmt '.oat/templates/docs-app-fuma/app/[[...slug]]/page.tsx' <edited test files> && pnpm --filter @open-agent-toolkit/cli type-check`

Commit: `feat(p03-t03): register docs figures in the Fumadocs scaffold`

---

### Task p03-t04: Replace the spike in the OAT docs app with the packaged capability

**Files:**

- Modify: `apps/oat-docs/app/[[...slug]]/page.tsx` (`withDocsFigures`)
- Modify: `apps/oat-docs/app/globals.css` (import `figures.css`)
- Modify: `apps/oat-docs/docs/workflows/ideas/lifecycle.md` (the three spike
  conversions)
- Modify: at least one more real page using a new figure, for example a
  `docs-terminal` or `docs-compare` example where the page already shows that
  content in prose or a code block
- Confirm the spike-only files are absent: `apps/oat-docs/registry/`,
  `apps/oat-docs/lib/remark-docs-fences.ts`, `apps/oat-docs/lib/utils.ts`, the
  `motion` dependency and the local `source.config.ts` plugin override

**Step 1: Implement**

Convert the lifecycle page's Flow, Directory structure and State model
sections. Use the agent-readability rule: state is written in the text, not
only in emphasis, for example "brainstorming (current)". Then convert one more
page.

**Step 2: Verify**

Run: `pnpm build:docs`
Then run, sequentially:
`pnpm run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md`
and `git diff --exit-code -- apps/oat-docs/index.md`, committing the
regenerated index if it changed.

Run: `pnpm --filter oat-docs docs:check`

Expected: the build succeeds and the checker passes. Then serve the static
export and check the converted pages:

- light and dark mode;
- desktop and about 390px widths;
- no overflow;
- no hydration warning in the console.

Save screenshots to the gitignored `.oat/repo/analysis/mdxcn/`.

**Step 3: Format and commit**

Run: `pnpm exec oxfmt <edited .md and .tsx files>`

Commit: `feat(p03-t04): adopt packaged docs figures in OAT docs`

---

## Phase 4: Guidance, instructions and release

### Task p04-t01: Document the figures in the scaffold contributing pages and app AGENTS guidance

**Files:**

- Modify: `.oat/templates/docs-app-fuma/docs/contributing.md`
- Modify: `.oat/templates/docs-app-mkdocs/docs/contributing.md`
- Modify: `.oat/templates/docs-app-fuma/AGENTS.md`
- Modify: the CLI tests that pin these template sentences
  (`packages/cli/src/commands/docs/init/*.test.ts`)

**Step 1: Implement**

- **Fumadocs contributing page:**
  - Add the figure fences to the supported-features sentence.
  - Add a "Figure fences" section with each fence's grammar and one
    Syntax/Rendered tab pair per fence.
  - Add the agent-readability rule.
  - Add the four-backtick rule for `docs-annotate`.
- **MkDocs contributing page:** add one sentence saying `docs-*` fences render
  as plain code blocks.
- **Fumadocs app AGENTS:** add when to choose a figure over a list, a table or
  Mermaid.

**Step 2: Verify**

Run: `bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/docs/init`
Expected: passes, with pinned wording updated in the same task.

**Step 3: Format and commit**

Run: `pnpm exec oxfmt <edited files>`

Commit: `docs(p04-t01): document figure fences in scaffold contributing guidance`

---

### Task p04-t02: Update the oat-docs-bootstrap and oat-docs-analyze skills

**Files:**

- Modify: `.agents/skills/oat-docs-bootstrap/SKILL.md`
  - walkthrough: `contributing.md` covers code blocks, Mermaid, GFM alerts and
    figure fences;
  - verification: `docs check` reports unknown `docs-*` fences on Fumadocs.
- Modify: `.agents/skills/oat-docs-analyze/references/legacy-scaffold-checks.md`
  - a new check: a Fumadocs app missing the `withDocsFigures` wrapper or the
    `figures.css` import, or whose contributing page lacks figure-fence
    guidance;
  - the check gives the exact two-line fix.
- Bump `metadata.version` in both skills' `SKILL.md`.

**Step 1: Verify**

Run:
`bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation && pnpm oat:validate-skills && pnpm lint`
Expected: all pass. These contract tests pin skill sentences.

**Step 2: Format and commit**

Run: `pnpm exec oxfmt <edited files>`

Commit: `docs(p04-t02): cover figure fences in docs bootstrap and analyze skills`

---

### Task p04-t03: Update OAT docs, package instructions, READMEs and NOTICES

**Files:**

- Modify: `apps/oat-docs/docs/contributing/markdown-features.md` (a figure
  fences section with paired Syntax/Rendered examples for all eight)
- Modify: `apps/oat-docs/docs/contributing/documentation.md` (feature list)
- Modify: `apps/oat-docs/AGENTS.md` (transform list)
- Modify: `packages/docs-transforms/AGENTS.md` and
  `packages/docs-theme/AGENTS.md`, adding this completion check: "A new docs
  authoring capability updates the scaffold contributing templates, scaffold
  app AGENTS guidance, `oat-docs-bootstrap`/`oat-docs-analyze` guidance and
  OAT's Markdown Features page in the same PR."
- Modify: `packages/docs-transforms/README.md` and
  `packages/docs-theme/README.md` (usage: `withDocsFigures`, the
  `figures.css` import)
- Modify: `NOTICES.md` (an mdxcn MIT entry naming the vendored files and
  local patches)

**Step 1: Verify**

Run: `pnpm build:docs && pnpm --filter oat-docs docs:check && pnpm check`
Then run, sequentially, the generate-index command and the
`git diff --exit-code -- apps/oat-docs/index.md` check from p03-t04.
Expected: all pass. Review the Markdown Features figures in the rendered site.

**Step 2: Format and commit**

Run: `pnpm exec oxfmt <edited files>`

Commit: `docs(p04-t03): document figure fences across OAT docs and package guidance`

---

### Task p04-t04: Lockstep version bump and full Definition of Done gates

**Files:**

- Modify: the `version` field in `packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`
- Modify: any version-pinned files that `pnpm release:check-versions` reports

**Step 1: Implement**

Run `git fetch origin main`. Bump all five packages to one version strictly
greater than `origin/main`'s.

**Step 2: Verify**

Run each CI gate in order, capturing exit codes, for example
`pnpm <gate> > gate.log 2>&1; echo "exit=$?"`:

1. `pnpm check`
2. `pnpm type-check`
3. `pnpm test:evidence`
4. `pnpm build`
5. `pnpm run check:skill-bumps`, after committing
6. `pnpm release:check-versions`
7. `pnpm release:validate`
8. `pnpm build:docs`
9. the generate-index command, then
   `git diff --exit-code -- apps/oat-docs/index.md`

Expected: every gate reports `exit=0`, with no replays from cache.

**Step 3: Format and commit**

Run: `pnpm exec oxfmt <edited package.json files>`

Commit: `chore(p04-t04): bump lockstep package versions for docs figure fences`

---

## Reviews

| Scope | Type     | Status  | Date | Artifact | Reviewed Head | Invocation | Gate Target |
| ----- | -------- | ------- | ---- | -------- | ------------- | ---------- | ----------- |
| p01   | code     | pending | -    | -        | -             | -          | -           |
| p02   | code     | pending | -    | -        | -             | -          | -           |
| p03   | code     | pending | -    | -        | -             | -          | -           |
| p04   | code     | pending | -    | -        | -             | -          | -           |
| final | code     | pending | -    | -        | -             | -          | -           |
| plan  | artifact | pending | -    | -        | -             | -          | -           |

For code-review events, `Reviewed Head` is the full 40-character SHA at the
head of the reviewed range. `Invocation` records `manual`, `auto` or `gate`.
`Gate Target` is filled in only for gate events. Legacy five-column rows remain
valid. Writers must preserve every existing row and every unknown trailing
cell, and never truncate a widened row back to five columns.

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 3 tasks. The fence transform, shared reparse helper and chain
  wiring.
- Phase 2: 4 tasks. Static figure components, `figures.css` and
  `withDocsFigures`.
- Phase 3: 4 tasks. The contract test, checker rule, scaffold wiring and OAT
  docs adoption.
- Phase 4: 4 tasks. Scaffold and skill guidance, OAT docs and instructions,
  and the lockstep release.

**Total: 15 tasks**

---

## References

- Discovery: `discovery.md`
- Design: `design.md`
- Spike screenshots: `.oat/repo/analysis/mdxcn-spike/` (gitignored, main
  worktree)
- Upstream: <https://mdxcn.dev>, <https://github.com/shadcn-labs/mdxcn> (MIT)
- Repository Definition of Done: root `AGENTS.md`
