---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-11-21
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p04'] # phases to pause AFTER completing (empty = every phase)
oat_auto_review_at_hill_checkpoints: true
oat_plan_parallel_groups: [['p01', 'p02']] # groups of phases that run concurrently in worktrees; [] = fully sequential
oat_plan_source: quick # spec-driven | quick | imported | lite | brief
oat_import_reference: null # e.g., references/imported-plan.md
oat_import_source_path: null # original source path provided by user
oat_import_provider: null # codex | cursor | claude | null
oat_generated: false
oat_template: false
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
`pnpm format:fix` and the lint-staged hook run. Include `.css` files: oxfmt
formats CSS and `oxfmt --check .` in package `check` scripts fails on
unformatted CSS, even though lint-staged does not format CSS on commit.

**Cross-package builds:** packages resolve `@open-agent-toolkit/docs-transforms`
and `@open-agent-toolkit/docs-theme` through their built `dist`.
`pnpm --filter <pkg> exec vitest` does not build dependencies, so every
verification that imports a sibling package's new exports first runs that
package's `build`.

**Upstream source:** take mdxcn components from the registry JSON at
`https://mdxcn.dev/r/<name>.json`, extracting each `files[].content` with a
JSON parser, not shell `jq`/`echo`. Record the upstream version or fetch date
in each vendored file's header.

**Spike reference:** the spike copies are read-only, in the main worktree only:

- the spike remark plugin, `cn` stand-in and vendored components, under
  `/Users/tstang/.t3/worktrees/open-agent-toolkit/t3-1aced216-22e6aad08f8c1005/.oat/repo/analysis/mdxcn-spike/`
  (`lib/`, `registry/`, `tracked.patch`);
- mdxcn's site stylesheet, at
  `.oat/repo/analysis/mdxcn-spike/mdxcn-globals.css` in the same worktree. The
  CSS utilities are at lines 353–446.

Do not copy two of the spike's shortcuts: `motion`, and a transform that
injected `not-prose`. Keep `cn` as a local class joiner with no
tailwind-merge. Figures accept no author-supplied `className` that would need
conflict merging, and adding tailwind-merge would touch the lockfile in p02.

## Pre-implementation (root orchestrator, before p01)

The spike is still uncommitted in the main worktree: tracked edits under
`apps/oat-docs` and `pnpm-lock.yaml`, plus the untracked
`apps/oat-docs/registry/`, `apps/oat-docs/lib/remark-docs-fences.ts` and
`apps/oat-docs/lib/utils.ts`. With user approval, the root:

1. Saves `git diff` of the tracked spike paths as
   `.oat/repo/analysis/mdxcn-spike/tracked.patch`.
2. Copies `apps/oat-docs/registry/`, `apps/oat-docs/lib/` and
   `/tmp/mdxcn-tools/mdxcn-globals.css` into
   `.oat/repo/analysis/mdxcn-spike/`, which is gitignored.
3. Restores the tracked paths to `HEAD`, deletes the untracked spike files,
   and runs `pnpm install`.
4. Confirms `git status --short` is empty.

Phase work starts from that clean tree. p03-t04 replaces the spike with the
packaged capability.

## Planning Checklist

- [x] Confirmed HiLL checkpoints (p04 only, from workflow.hillCheckpointDefault=final)
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

`oat_plan_parallel_groups: [['p01', 'p02']]`

- **p01** writes only `packages/docs-transforms/**` and
  `packages/docs-config/**`.
- **p02** writes only `packages/docs-theme/**`. It removes `motion` rather
  than adding it, and adds no new dependency, so `pnpm-lock.yaml` is
  untouched. It keeps test inputs inline, so it needs no CLI version-policy
  edit.
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

Run: `pnpm --filter @open-agent-toolkit/docs-transforms build && pnpm --filter @open-agent-toolkit/docs-config exec vitest run src/source-config.test.ts && pnpm --filter @open-agent-toolkit/docs-transforms exec vitest run src/composition.test.ts`
Expected: fails.

**Step 2: Implement (GREEN)**

Insert `remarkDocsFences` after `remarkTabs` in the `source-config.ts` plugin
list.

Run: same as Step 1.
Expected: passes.

**Step 3: Format and verify**

Run: `pnpm exec oxfmt packages/docs-config/src/source-config.ts packages/docs-config/src/source-config.test.ts packages/docs-transforms/src/composition.test.ts && pnpm --filter @open-agent-toolkit/docs-transforms build && pnpm --filter @open-agent-toolkit/docs-config test && pnpm --filter @open-agent-toolkit/docs-config type-check && pnpm --filter @open-agent-toolkit/docs-config check`
Expected: all pass.

**Step 4: Commit**

`feat(p01-t03): add docs fences to the shared remark chain`

---

### Task p01-t04: (review) Fail the build on docs-\* fences nested in a figure body

**Files:**

- Modify: `packages/docs-transforms/src/remark-docs-fences.ts`
- Modify: `packages/docs-transforms/src/remark-docs-fences.test.ts`

**Step 1: Understand the issue**

Review finding (p01 review M1, `reviews/archived/code-p01-review-2026-11-21T231056Z.md`):
`walk` never examines the reparsed children of a figure it has just built. A
`docs-*` fence inside a Markdown-body figure is therefore never checked: an
unknown `docs-nope` inside `docs-steps` passes silently, and a known
`docs-terminal` there stays a plain code block. Discovery Key Decision 1 and
the Success Criteria require an unknown fence to fail with a clear message.
Location: `packages/docs-transforms/src/remark-docs-fences.ts:90`

**Step 2: Write test (RED)**

Add cases for:

- an unknown `docs-nope` fence nested in a `docs-steps` list item, which fails
  with the existing unknown-fence message listing the known names;
- a known `docs-terminal` fence nested in a `docs-steps` body, which fails
  with a message saying that docs figure fences cannot be nested inside
  another figure, naming both fences and the nested fence's line.

Prove each case can fail by temporarily removing the nested scan, checking
that the case's own assertion is the one that fails, and then restoring the
scan.

**Step 3: Implement fix (GREEN)**

After building the element for a `markdown`-body entry, scan its reparsed
children for `code` nodes whose `lang` starts with `docs-`, and fail through
`file.fail`. Report unknown names with the existing message, and report known
names as not nestable. This keeps design's rule that fences never nest frames.
`raw`-body entries (terminal) need no scan.

**Step 4: Verify**

Run: `pnpm exec oxfmt packages/docs-transforms/src/remark-docs-fences.ts packages/docs-transforms/src/remark-docs-fences.test.ts && bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/docs-transforms test && pnpm --filter @open-agent-toolkit/docs-transforms type-check && pnpm --filter @open-agent-toolkit/docs-transforms check`
Expected: all pass.

**Step 5: Commit**

`fix(p01-t04): reject docs fences nested inside a figure body`

---

### Task p01-t05: (review) Pin tab-origin positions after the reparse extraction

**Files:**

- Modify: `packages/docs-transforms/src/remark-tabs.test.ts`

**Step 1: Understand the issue**

Review finding (p01 review L1, `reviews/archived/code-p01-review-2026-11-21T231056Z.md`):
design's Testing Strategy requires positions that map to authored lines for
both the fence and the tab origins, and p01-t01 expects tabs "with positions
unchanged". No test asserts a position inside reparsed tab content, so an
off-by-one or missing origin would stay green.
Location: `packages/docs-transforms/src/remark-tabs.ts:90`

**Step 2: Add the test**

Add one `remark-tabs.test.ts` case asserting the start line and column of a
node in a tab body. Include a nested `=== "Inner"` tab, for example a list item
authored under two levels of tab indentation. Prove the test can fail by
temporarily passing `undefined` as the origin in `remark-tabs.ts`, then restore
the file.

**Step 3: Verify**

Run: `pnpm exec oxfmt packages/docs-transforms/src/remark-tabs.test.ts && bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/docs-transforms test && pnpm --filter @open-agent-toolkit/docs-transforms check`
Expected: all pass.

**Step 4: Commit**

`test(p01-t05): pin reparsed tab content positions`

---

## Phase 2: Figure components (docs-theme)

Tests in docs-theme use `.test.ts` with `React.createElement`. The vitest
`include` and the tsconfig `exclude` only cover `*.test.ts`, so `.tsx` tests
or separate fixture modules under `src/` would compile into `dist` and count
toward the version policy.

p02 element-tree inputs are therefore declared inline in their `.test.ts`
files. They are hand-built unit inputs for component logic, and each test file
header says so. The fixtures captured from a real compile, which the
Definition of Done requires for parsers of external formats, come in p03-t01
once the transform and components are integrated.

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

Parse a small Markdown-derived element tree through `graph-markdown`. Assert
host-tag detection for `p`, `ul`, `ol`, `li`, `strong`, `em`, `code`, `pre`,
`table` and `a`, including elements carrying the host marker. Fumadocs
overrides `pre`, `table` and `a` with its own components. Assert that
`package.json` exports `./figures.css` and that the file exists. Also assert
that `figures.css` defines only `--graph-*` and `--color-graph-*` custom
properties, with no unprefixed `--background`, `--foreground` or
`--destructive`.

Add a server-component check to the same test file, covering every
`src/figures/*.tsx` module present, so later tasks are covered automatically.
`renderToStaticMarkup` under vitest uses React's ordinary export and cannot
detect the problem: React's `react-server` condition exposes neither
`createContext` nor `useContext`.

- A source scan asserts that no figure module contains `"use client"`,
  `createContext`, `useContext`, `useState`, `useEffect`, `useReducer`,
  `useLayoutEffect` or a `motion` import. `useId` and `useMemo` stay allowed.
- A child process runs `node --conditions=react-server` with the repository
  root's `tsx` loader (`--import tsx`). It imports each figure module and
  exits 0.
- A control proves the check can fail. A temporary module that calls
  `React.createContext` at the top level makes the child exit non-zero, and
  that module is removed afterwards. Report the failure reason it produces.

Run: `pnpm --filter @open-agent-toolkit/docs-theme exec vitest run src/figures/graph-frame.test.ts`
Expected: fails.

**Step 2: Implement (GREEN)**

Port upstream `graph-frame` and `graph-markdown` with these changes:

- Remove `"use client"`, `graph-motion` and every `motion` import.
- Remove upstream's frame context: `GraphFrameContext`, `GraphFrameProvider`
  and `useGraphFrame`, and `React.useContext` in `GraphFrame`.
  - `GraphFrame` takes an explicit `frame` prop (default `"box"`) and passes
    it to the parts that need it, such as `GraphBody` and the title placement.
  - Every ported consumer that called `useGraphFrame` or wrapped content in
    `GraphFrameProvider frame="none"` gets that value from a prop or a fixed
    default instead.
  - OAT fences render one frame per figure and never nest frames, so nothing
    needs inherited frame state.
  - Do not add a client boundary, because the design specifies server
    components.
- Render visible markup only.
- Put `not-prose` on the frame root.
- Render inline `code` as a code chip, not bold.
- Make `cn` a local class joiner. Add no new dependency.
- Rewrite upstream's generic shadcn token classes to prefixed tokens. For
  example, `text-foreground` becomes `text-fd-foreground`, and
  `text-destructive` becomes a `--graph-danger`-based class. A shared package
  stylesheet must not override a downstream app's own `--background`,
  `--foreground` or `--destructive`.

`figures.css` contains:

- `--graph-*` tokens mapped to `--color-fd-*`, with `.dark` overrides. Only
  `--graph-*` and `--color-graph-*` names are defined;
- the `@theme inline` block;
- the `graph-frame`, `graph-rule`, `graph-rule-y`, `scrollbar-graph` and
  `graph-scroll-x` utilities;
- the full mdxcn MIT notice (copyright line plus permission text).

Each vendored file gets a header with the upstream source, its date or version,
the local patches and the full mdxcn MIT notice. The notice is required because
docs-theme redistributes the code, and NOTICES.md ships only in the CLI. Keep
the header as a `/*! … */` block comment that `tsc` preserves in `dist`, and
confirm that it does. Inside the comment, write the `Copyright …` line and the
licence text with no `*` line prefixes, so the packed file contains
`Copyright …\n\n${MIT_LICENSE_BODY}` exactly as p04-t03 pins it. Before
writing it, confirm that the upstream LICENSE wording and wrapping match
`MIT_LICENSE_BODY` (`packages/cli/src/release/public-package-contract.ts`).
Record any difference in `implementation.md`; if there is one, the pin uses the
upstream text.

Run: same as Step 1.
Expected: passes.

**Step 3: Format and verify**

Run: `pnpm exec oxfmt packages/docs-theme/src/figures/graph-frame.tsx packages/docs-theme/src/figures/graph-markdown.ts packages/docs-theme/src/figures/cn.ts packages/docs-theme/src/figures/graph-frame.test.ts packages/docs-theme/figures.css packages/docs-theme/package.json && pnpm --filter @open-agent-toolkit/docs-theme type-check && pnpm --filter @open-agent-toolkit/docs-theme check`
Expected: no errors.

**Step 4: Commit**

`feat(p02-t01): vendor static mdxcn frame, parser and figures.css`

---

### Task p02-t02: Add DocsSteps, DocsTree and DocsTimeline

**Files:**

- Create: `packages/docs-theme/src/figures/{steps,tree,timeline}.tsx`
- Create: `packages/docs-theme/src/figures/figures-core.test.ts`

**Step 1: Write test (RED)**

Inline element-tree inputs are modeled on upstream mdxcn examples and the
spike's lifecycle page. The test header records that provenance and states
that captured compile fixtures come in p03-t01.

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
- Create: `packages/docs-theme/src/figures/figures-extended.test.ts`

**Step 1: Write test (RED)**

First confirm each grammar against the upstream registry source and doc
comments. Record any divergence from `design.md`'s grammar table in
`implementation.md` before writing inline inputs. Terminal and annotate
receive their code inside a Fumadocs `pre` (CodeBlock) with Shiki line spans,
and compare receives its table inside the Fumadocs `Table` override. Model
those wrapped shapes in the inputs, not bare `pre`/`table` elements. Assert:

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
- A guard test renders every figure from its inline input. It asserts the
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

### Task p02-t05: (review) Align design.md's figure grammar and CSS notes with the shipped components

**Files:**

- Modify: `.oat/projects/shared/mdxcn/design.md`

**Step 1: Understand the issue**

Review findings (p02 review M1 and L1, `reviews/archived/code-p02-review-2026-11-21T231835Z.md`):
the Component Design grammar table no longer matches the upstream-faithful
grammar the components ship, and p04-t01 writes the contributing grammar from
that table. The token-mapping and overflow notes are also stale. The code is
the source of truth.
Location: `design.md:165` (grammar table), `design.md:200` (tokens),
`design.md:324` (overflow)

**Step 2: Update design.md**

- **steps:** the first paragraph (or `Title — body` in a tight list) is the
  title. A **bold** title marks the current step, an _italic_ title the next.
- **decision:** a plain option is open. Add the `status` and `date`
  attributes.
- **compare:** the first column always holds row labels, and a named first
  header labels that column. `yes`/`true`/`✓`/`x` draw ✓, and
  `no`/`false`/`-`/`–`/`—` draw –. Add the `accent="Col"` attribute.
- **annotate:** the title defaults to `code` unless the fence sets `title`.
- **terminal:** a leading `✓` line is a pass, and `prompt="#"` changes the
  command glyph.
- **tree:** a bold node and its path take the accent while other rows recede.
  A trailing `/` is only an authoring convention.
- **figures.css:** `--graph-accent` and `--graph-muted` map onto
  `--color-fd-*`; the frame and faint tokens keep fixed light and dark values.
  Wide figures handle overflow with `overflow-x-auto`.

**Step 3: Verify**

Run: `pnpm exec oxfmt .oat/projects/shared/mdxcn/design.md`
Expected: formatted. Every grammar row matches the component source.

**Step 4: Commit**

`docs(p02-t05): align design grammar with shipped figure components`

---

### Task p02-t06: (review) Extend the server-component check to every non-test figure module

**Files:**

- Modify: `packages/docs-theme/src/figures/graph-frame.test.ts`

**Step 1: Understand the issue**

Review finding (p02 review L2, `reviews/archived/code-p02-review-2026-11-21T231835Z.md`):
the hook and context scan and the react-server import select only `.tsx`
files. `graph-markdown.ts` and `index.ts` (`withDocsFigures`) are therefore
unscanned, though design.md states that no state, effect or context hooks
remain in any figure module.
Location: `packages/docs-theme/src/figures/graph-frame.test.ts:214`

**Step 2: Implement fix**

Select `/\.tsx?$/` and exclude `*.test.ts`, so the scan and the import cover
every non-test figure module. Prove the change can fail by temporarily adding
a `useContext` call to `graph-markdown.ts` and checking that the scan reports
it, then restore the file.

**Step 3: Verify**

Run: `pnpm exec oxfmt packages/docs-theme/src/figures/graph-frame.test.ts && pnpm --filter @open-agent-toolkit/docs-theme build && bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/docs-theme test && pnpm --filter @open-agent-toolkit/docs-theme check`
Expected: all pass.

**Step 4: Commit**

`test(p02-t06): scan every figure module for server-component hooks`

---

## Phase 3: Integration (contract, checker, scaffold, OAT docs app)

### Task p03-t01: Add the fence/component contract test and captured compile fixtures

**Files:**

- Modify: `packages/docs-theme/package.json`:
  - dev dependencies `@open-agent-toolkit/docs-transforms: workspace:*`,
    `@open-agent-toolkit/docs-config: workspace:*`, `@mdx-js/mdx` and
    `fumadocs-mdx`. Use the versions already in the lockfile (`@mdx-js/mdx`
    3.1.1, the workspace's fumadocs-mdx). `fumadocs-core`, which provides
    `rehypeCode`, is already a dev dependency.
- Modify: `pnpm-lock.yaml`
- Modify: `packages/docs-theme/tsconfig.json` (exclude
  `src/**/__fixtures__/**`)
- Modify: `.oxfmtrc.jsonc` (add `packages/docs-theme/src/figures/__fixtures__/**`
  to `ignorePatterns`, with the existing captured-fixture provenance comment).
  lint-staged and `oxfmt --check .` would otherwise rewrite or fail the
  byte-for-byte captures. Run from the package directory, oxfmt still reads the
  root config.
- Modify: `packages/docs-theme/package.json` scripts. Add
  `--ignore-pattern 'src/**/__fixtures__/**'` to both oxlint passes in
  `lint`, `lint:fix`, `check` and `check:fix`. The package runs `oxlint .` with
  no package config, and the root `.oxlintrc.json` ignorePatterns do not apply
  there, so the captured JavaScript would otherwise be linted.
- Modify: `packages/cli/src/release/public-package-contract.ts` (add
  `src/**/__fixtures__/**` to docs-theme `versionPolicyIgnorePatterns`, kept
  equal to the tsconfig test exclusion)
- Create: `packages/docs-theme/src/figures/fence-contract.test.ts`
- Create: `packages/docs-theme/src/figures/__fixtures__/all-fences.md`
- Create: `packages/docs-theme/src/figures/__fixtures__/all-fences.compiled.js`
  (the captured function-body MDX output, with a provenance header)
- No capture script file. The exact capture command, a `node --input-type=module`
  or `tsx -e` one-liner, is recorded in the fixture header so the capture can be
  reproduced. A script outside `src/` would not be type-checked.
- Create: `packages/docs-theme/src/figures/compiled-fixtures.test.ts`

**Step 1: Contract test (RED, then GREEN)**

Assert that the component names in `DOCS_FENCES` equal
`DOCS_FIGURE_COMPONENTS`, as sets.

Run: `pnpm install && pnpm --filter @open-agent-toolkit/docs-transforms build && pnpm --filter @open-agent-toolkit/docs-config build && pnpm --filter @open-agent-toolkit/docs-theme exec vitest run src/figures/fence-contract.test.ts`
Expected: passes. Temporarily remove one entry on either side and confirm it
fails, then restore.

**Step 2: Captured compile fixtures**

`all-fences.md` holds one realistic example of each of the eight fences,
including one figure inside a `=== "Tab"` and one containing a `.md` link.

1. **Capture:** compile `all-fences.md` the way fumadocs-mdx compiles a `.md`
   page:
   `compile(source, { format: 'md', ...(await applyMdxPreset({ remarkPlugins: createSourceConfig().remarkPlugins })('runtime')) })`.
   `compile` comes from `@mdx-js/mdx`, `applyMdxPreset` from
   `fumadocs-mdx/config` and `createSourceConfig` from
   `@open-agent-toolkit/docs-config`. The preset adds Fumadocs' own remark
   steps around the shared chain, plus `rehypeCode` and `rehypeToc`. Its
   `'runtime'` mode emits function-body output.
2. Commit that output as `all-fences.compiled.js`. Its header records the
   `@mdx-js/mdx`, fumadocs-mdx and fumadocs-core versions and the capture
   command.
3. **Replay:** `compiled-fixtures.test.ts` `run`s the captured module with
   React's JSX runtime. It renders the result through `renderToStaticMarkup`
   with the live scaffold map,
   `withDocsFigures({ ...defaultMdxComponents, Mermaid, Tab, Tabs, img: ZoomImage })`.
   `defaultMdxComponents` comes from `fumadocs-ui/mdx`, and the others come
   from docs-theme's own `src`. The test asserts on that fresh render, not on
   frozen HTML, so a component regression fails it.

The test asserts these parsed figure states:

- timeline done/now/next;
- decision chosen/rejected;
- check `[x]`;
- compare ✓/–;
- terminal command/comment/output;
- annotate marker/note pairing;
- the tabbed figure and the normalized link;
- server HTML that hides nothing.

Fix any component that misreads the real Fumadocs `pre`, `table` or `a`
overrides, and record each fix in `implementation.md`.

**Can-fail proof:** temporarily invert the timeline's bold/italic state
detection and confirm the compiled-fixture test fails on the timeline
assertion. Then restore it and record the result.

Run: `pnpm --filter @open-agent-toolkit/docs-theme exec vitest run src/figures/compiled-fixtures.test.ts`
Expected: passes against the captured real output.

**Step 3: Format, verify and commit**

Do not format the `__fixtures__/` files. They are captures, and the ignore
patterns above exempt them.

Run: `pnpm exec oxfmt packages/docs-theme/package.json packages/docs-theme/tsconfig.json packages/docs-theme/src/figures/fence-contract.test.ts packages/docs-theme/src/figures/compiled-fixtures.test.ts packages/cli/src/release/public-package-contract.ts .oxfmtrc.jsonc && pnpm --filter @open-agent-toolkit/docs-theme test && pnpm --filter @open-agent-toolkit/docs-theme build && ! find packages/docs-theme/dist -path '*__fixtures__*' | grep -q . && pnpm --filter @open-agent-toolkit/docs-theme check && bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/release/public-package-contract.test.ts`
Expected: tests pass, `dist` has no fixtures, the docs-theme check passes with
the fixtures ignored, and the version-policy contract test passes.

Commit: `test(p03-t01): pin fence names and capture compiled figure fixtures`

---

### Task p03-t02: Reject unknown docs-\* fences in `oat docs check` for Fumadocs apps

**Files:**

- Create: `packages/cli/src/commands/docs/check/docs-fences.ts`, beside
  `diagrams.ts`
- Modify: `packages/cli/src/commands/docs/check/checker.ts` (wire the rule
  group the way `checker.ts:91-104` gates the others)
- Modify: `packages/cli/src/commands/docs/check/checker.test.ts`
- Modify: `packages/cli/src/config/documentation-check.ts` (add `docs-fences`
  to `DOCS_CHECK_RULES`; unknown `--rules` values are rejected, so this is
  required)

**Step 1: Write test (RED)**

- A Fumadocs fixture with a `docs-nope` fence reports one error. The error
  carries rule id `docs-fences`, file, line and known list.
- Known fences produce no finding.
- MkDocs and Markdown fixtures with `docs-nope` produce no finding.
- `--rules docs-fences` runs only this rule, and `--rules` without it skips the
  rule.

Run: `pnpm --filter @open-agent-toolkit/docs-transforms build && bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/docs/check`
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

**Step 3: Build a freshly scaffolded app with a figure**

Build all workspace packages with `pnpm build`. Then:

1. Run the branch CLI's `docs init` (Fumadocs, non-interactive) into a
   temporary directory outside the repository.
2. Point its `@open-agent-toolkit/docs-*` dependencies and its
   `@open-agent-toolkit/cli` dev dependency at the branch build. Prefer
   `pnpm pack` tarballs of all four packages. Otherwise the template's
   `{{OAT_CLI_DEP}}` resolves to the published CLI (`scaffold.ts:272-277`),
   and the app's prebuild `oat docs check` would not exercise the branch's
   `docs-fences` rule.
3. Add one page with a `docs-tree` fence and install.
4. Run the app's build.

Expected: the build succeeds, the page's static HTML contains the figure, and
`figures.css` utilities appear in the emitted CSS. Record the commands and
result in `implementation.md`, then delete the temporary directory. This
covers discovery's "no manual wiring" criterion. The template tests alone do
not.

**Step 4: Format, verify and commit**

Run: `pnpm exec oxfmt '.oat/templates/docs-app-fuma/app/[[...slug]]/page.tsx' .oat/templates/docs-app-fuma/app/globals.css <edited test files> && pnpm --filter @open-agent-toolkit/cli type-check`

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

Run: `pnpm exec oxfmt <edited .md and .tsx files> apps/oat-docs/app/globals.css`

Commit: `feat(p03-t04): adopt packaged docs figures in OAT docs`

---

### Task p03-t05: (review) State the checker's fence-name scope in design.md

**Files:**

- Modify: `.oat/projects/shared/mdxcn/design.md`

**Step 1: Understand the issue**

Review finding (p03 review L1, `reviews/archived/code-p03-review-2026-11-22T000358Z.md`):
design.md's Error Handling says both the build and the fast `docs check` pass
report an unknown `docs-*` fence. The checker parses with
`remarkParse + remarkGfm + remarkTabs`, though, so a `docs-*` fence inside a
figure body is opaque text to it. Only the build, which reparses figure bodies,
rejects such a fence (`unknown-docs-fence` / `nested-docs-fence`). The build
fails loudly, so nothing broken ships, and discovery defers grammar checking.
The design is aligned to the shipped checker rather than adding a
nested-body scan.
Location: `design.md:216` (Checker rule), `design.md:244` (Error Handling)

**Step 2: Update design.md**

- **Checker rule:** the checker validates top-level and tab-nested fence
  names. A `docs-*` fence inside a figure body is left to the build, which
  rejects any nested `docs-*` fence.
- **Error Handling:** an unknown top-level or tab-nested `docs-*` fence fails
  both the build and `docs check`. A `docs-*` fence nested in a figure body
  fails the build only.

**Step 3: Verify**

Run: `pnpm exec oxfmt .oat/projects/shared/mdxcn/design.md`

Expected: formatted. Both sections match `docs-fences.ts` and
`remark-docs-fences.ts`.

**Step 4: Commit**

`docs(p03-t05): scope the docs check fence rule in design`

---

### Task p03-t06: (review) Catch class-based hiding in the no-hidden-content replay assertion

**Files:**

- Modify: `packages/docs-theme/src/compiled-fixtures.test.ts`

**Step 1: Understand the issue**

Review finding (p03 review L2, `reviews/archived/code-p03-review-2026-11-22T000358Z.md`):
`/\shidden(=|\s|>)/` misses a `hidden` class at either end of a class list,
and Tailwind's `invisible`. The assertion is therefore weaker than its name,
"hides no figure content".
Location: `packages/docs-theme/src/compiled-fixtures.test.ts:240-248`

**Step 2: Implement fix**

Add a class-token assertion that rejects standalone `hidden`, `invisible` and
`opacity-0` tokens anywhere in a `class` attribute. It must still allow
`aria-hidden` and `overflow-*-hidden`. Prove it can fail: temporarily add a
`hidden` class as the first token on one figure element, confirm the new
assertion fails on that token, then restore the file.

**Step 3: Verify**

Run: `pnpm exec oxfmt packages/docs-theme/src/compiled-fixtures.test.ts && pnpm --filter @open-agent-toolkit/docs-theme build && bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/docs-theme test && pnpm --filter @open-agent-toolkit/docs-theme check`

Expected: all pass.

**Step 4: Commit**

`test(p03-t06): reject class-based hiding in the figure replay`

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
- **Fumadocs contributing page, checker sentence:** add unknown `docs-*`
  fences to the list of what `docs:check` checks (currently
  `.oat/templates/docs-app-fuma/docs/contributing.md:94`).
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
- Modify: `.agents/skills/oat-docs-analyze/SKILL.md`, where it summarizes what
  the checker covers (around line 552), to add the `docs-fences` rule.
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
- Modify: `packages/docs-transforms/README.md`. The example chain
  (around line 23) becomes `[remarkTabs, remarkDocsFences, remarkLinks, remarkMermaid]`,
  and the export list (around lines 36–37) gains `remarkDocsFences` and
  `DOCS_FENCES`.
- Modify: `packages/docs-theme/README.md` (usage: `withDocsFigures`, the
  `figures.css` import)
- Modify: `apps/oat-docs/docs/reference/file-locations.md` (the docs-transforms
  plugin list, around line 196)
- Modify: `apps/oat-docs/docs/docs-tooling/check.md` (add the `docs-fences`
  rule to the rule table, around line 112)
- Modify: `NOTICES.md`. Add an mdxcn entry in the existing MIT format:
  Source, Version referenced, the vendored files and local patches, and
  `Copyright (c) <year> <holder>` followed by the full MIT text, copied from
  the upstream LICENSE.
- Modify: `packages/cli/src/release/public-package-contract.ts` and its test:
  - pin the mdxcn Source, Version and `Copyright …\n\n${MIT_LICENSE_BODY}`
    lines in the CLI's `assets/NOTICES.md` `requiredContents`;
  - add `figures.css` to docs-theme `requiredPaths`;
  - add a docs-theme `requiredPackedTextFiles` entry requiring the mdxcn MIT
    notice in one packed vendored `dist` file.

**Step 1: Verify**

Run: `pnpm build && bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/release/public-package-contract.test.ts`
(`pnpm release:validate` is left out here. Until p04-t04 bumps the lockstep
versions, it rejects packages that changed but still carry their merge-base
version. p04-t04's committed-tree gates run it.)
Then run: `pnpm build:docs && pnpm --filter oat-docs docs:check && pnpm check`
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

**Step 2: Format and commit**

Run: `pnpm exec oxfmt <edited package.json files>`

Commit: `chore(p04-t04): bump lockstep package versions for docs figure fences`

**Step 3: Verify**

Run each CI gate in order on the committed tree, capturing exit codes, for
example `pnpm <gate> > gate.log 2>&1; echo "exit=$?"`:

1. `pnpm check`
2. `pnpm type-check`
3. `pnpm test`. The root script is
   `turbo run test && pnpm test:smoke && pnpm test:skills && pnpm test:scripts`,
   matching CI. For evidence-grade proof, also run `pnpm test:evidence` for the
   uncached turbo pass.
4. `pnpm build`
5. `pnpm run check:skill-bumps`
6. `pnpm release:check-versions`
7. `pnpm release:validate`
8. `pnpm build:docs`
9. the generate-index command, then
   `git diff --exit-code -- apps/oat-docs/index.md`

Expected: every gate reports `exit=0`. Turbo cache replays are acceptable for
`check`, `build` and `build:docs`; `test:evidence` supplies the uncached test
run. If a gate forces a change, fix, format, commit and rerun the affected
gates.

---

### Task p04-t05: (review) Add the missing docs-theme `@source` to the legacy-scaffold figure repair

**Files:**

- Modify: `.agents/skills/oat-docs-analyze/references/legacy-scaffold-checks.md`
- Modify: `.oat/projects/shared/mdxcn/design.md`

**Step 1: Understand the issue**

Review finding (p04 review M1, `reviews/archived/code-p04-review-2026-11-22T013926Z.md`):
the new legacy-scaffold row tells the agent to keep the existing docs-theme
`@source`. Fumadocs scaffolds made before #350 (`be168345e`, lockstep
0.3.15) have no such line. An older app that follows the repair builds
cleanly, but Tailwind never scans the docs-theme `dist`, so every figure
renders unstyled with no error. design.md makes the same assumption for
current scaffolds.
Location: `legacy-scaffold-checks.md:19`, `design.md:93`

**Step 2: Implement fix**

- **Observed shape:** add a missing docs-theme `@source` line to the row's
  observed shape.
- **Repair:** add
  `@source '../node_modules/@open-agent-toolkit/docs-theme/dist/**/*.js';`
  when the line is absent, adjusted to the app's `node_modules` location.
  Keep it when it is present.
- **design.md:** note that current scaffolds carry the `@source` since
  0.3.15, and that the analyze repair adds it to older apps.
- **Versioning:** `oat-docs-analyze` already moved to 1.9.2 in this PR. The
  bump is PR-scoped, so no second bump is made.

**Step 3: Verify**

Run: `pnpm exec oxfmt .agents/skills/oat-docs-analyze/references/legacy-scaffold-checks.md .oat/projects/shared/mdxcn/design.md && bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared src/validation && pnpm oat:validate-skills && pnpm lint && pnpm format`

Expected: all pass. Commit, then run `pnpm run check:skill-bumps`.

**Step 4: Commit**

`docs(p04-t05): add the docs-theme source line to the legacy figure repair`

---

### Task p04-t06: (review) Correct the checker-scope wording and the `docs check` summaries

**Files:**

- Modify: `.oat/templates/docs-app-fuma/docs/contributing.md`
- Modify: `apps/oat-docs/docs/contributing/markdown-features.md`
- Modify: `packages/cli/README.md`
- Modify: `apps/oat-docs/docs/reference/cli-reference.md`
- Modify: any CLI test that pins the changed template sentence

**Step 1: Understand the issue**

Review findings (p04 review L1 and L2, `reviews/archived/code-p04-review-2026-11-22T013926Z.md`):

- **L1:** both contributing pages say the checker looks at fence names "at
  the top level and inside tabs only". It actually checks every `code` node
  after `remarkTabs`, so only figure bodies are skipped.
- **L2:** the `oat docs check` summaries in the CLI README and in
  `cli-reference.md` do not mention the `docs-fences` rule.

Location: `contributing.md:98`, `markdown-features.md:157`,
`packages/cli/README.md:52`, `cli-reference.md:84`

**Step 2: Implement fix**

- **Contributing pages:** reword both to say that `docs:check` checks fence
  names everywhere except inside a figure body, so the build is what catches
  a nested one. Change the template and OAT's page together.
- **Summaries:** add "and unknown `docs-*` figure fence names on Fumadocs
  apps" to both.
- **Index:** check whether the generated docs index changes. If it does,
  regenerate it with the generate-index command. Avoid unescaped `*` in any
  page description.

**Step 3: Verify**

Run: `pnpm exec oxfmt <edited files> && bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/docs/init src/validation && pnpm --filter oat-docs check && pnpm run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md && git diff --exit-code -- apps/oat-docs/index.md`

Expected: all pass, and the index is unchanged or committed regenerated.

**Step 4: Commit**

`docs(p04-t06): state the docs check fence scope and list the docs-fences rule`

---

### Task p04-t07: (final review) Name figure fences in the contributing Contents map and the docs-config README

**Files:**

- Modify: `apps/oat-docs/docs/contributing/index.md`
- Modify: `packages/docs-config/README.md`

**Step 1: Understand the issue**

Final review findings L3 and L4 (`reviews/archived/code-final-review-2026-11-22T015824Z.md`):

- **L3:** the contributing `## Contents` entry for Markdown Features omits
  figure fences, though the page's frontmatter description and the generated
  index list them.
- **L4:** the docs-config README does not say that
  `createSourceConfig().remarkPlugins` now transforms `docs-*` fences. It also
  doesn't say that rendering them needs `withDocsFigures` and `figures.css`
  from docs-theme.

Location: `apps/oat-docs/docs/contributing/index.md:14`,
`packages/docs-config/README.md:28-56`

**Step 2: Implement fix**

- **Contents entry:** change it to "Supported docs syntax for callouts, tabs,
  Mermaid, code blocks and figure fences."
- **docs-config README:** after the link-rewriting paragraph, add one
  sentence. It says the returned `remarkPlugins` also turn `docs-*` figure
  fences into `Docs*` elements, which need `withDocsFigures` and `figures.css`
  from `@open-agent-toolkit/docs-theme`. Link it to that README's figure
  section.

**Step 3: Verify**

Run: `pnpm exec oxfmt apps/oat-docs/docs/contributing/index.md packages/docs-config/README.md && pnpm --filter oat-docs check && pnpm run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md && git diff --exit-code -- apps/oat-docs/index.md && pnpm --filter @open-agent-toolkit/docs-config check`

Expected: all pass, and the index is unchanged.

**Step 4: Commit**

`docs(p04-t07): name figure fences in the contributing map and docs-config README`

---

### Task p04-t08: (operator decision) Report authored columns for tab content

**Files:**

- Modify: `packages/docs-transforms/src/remark-tabs.ts`
- Modify: `packages/docs-transforms/src/remark-tabs.test.ts`

**Step 1: Understand the issue**

Deferred p01-t05 concern, which the operator chose to fix at the final review
(2026-11-22). Tab content is an indented code block whose value is deindented
by four columns. `reparseMarkdown` relocates by the code block's start, which
is column 1 of the indentation. Lines are correct, but columns report the
deindented position: a list item authored at column 9 under two tab levels
reports column 1.
Location: `packages/docs-transforms/src/remark-tabs.ts:91`, and the test that
pins the old behaviour at `remark-tabs.test.ts:225`.

**Step 2: Implement fix (RED first)**

- **Test first:** change the test to expect authored columns, so it fails.
  Expected values: list item 7:9, strong 7:16, outer text 9:5.
- **Fix:** pass the origin as the code block start shifted by the
  indented-code width, `{ line: start.line, column: start.column + 4 }`.
  Nested tabs then compose, because the inner code block is relocated by the
  outer origin first.
- **Other origins:** keep `remark-docs-fences` and other callers unchanged.
- **Tests:** confirm that tab-nested figure fences report authored columns in
  their errors, and add one assertion if none exists.
- **Can-fail check:** revert the `+ 4` and confirm the column assertions fail.

**Step 3: Verify**

Run: `pnpm exec oxfmt packages/docs-transforms/src/remark-tabs.ts packages/docs-transforms/src/remark-tabs.test.ts && pnpm --filter @open-agent-toolkit/docs-transforms build && bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/docs-transforms test && bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/docs-config test && bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/docs-theme test && pnpm --filter @open-agent-toolkit/docs-transforms check`

Expected: all pass. The docs-theme replay fixture is a captured compile, so it
must not need recapturing, because only positions change. If it does, stop
and report.

**Step 4: Commit**

`fix(p04-t08): report authored columns for tab content`

---

### Task p04-t09: (final review r2) Compute tab-content columns from the authored indentation

**Files:**

- Modify: `packages/docs-transforms/src/remark-tabs.ts`
- Modify: `packages/docs-transforms/src/reparse.ts` (only if a per-line column offset is needed)
- Modify: `packages/docs-transforms/src/remark-tabs.test.ts`
- Modify: `packages/docs-transforms/src/reparse.test.ts` (only if `reparse.ts` changes)

**Step 1: Understand the issue**

Final re-review L1 (`reviews/archived/code-final-review-2026-11-22T021225Z.md`),
which the operator chose to fix by computing from source:

- p04-t08 adds a fixed `INDENTED_CODE_WIDTH` (4) to the code block's start
  column.
- An indented code block strips up to four columns of indentation. A tab
  advances to the next tab stop, while micromark counts it as one column.
- Tab-indented tab content therefore reports too large a column: `\talpha`,
  authored at column 2, reports column 5. Lines are correct.

Location: `remark-tabs.ts:6` (the constant's comment), `remark-tabs.ts:101`

**Step 2: Implement fix (RED first)**

- **RED:** add assertions that fail on the current code:
  - `\t`-indented tab content reports its authored column;
  - mixed `  \t` indentation does too;
  - two tab levels indented with tabs do too.
- **Fix:** derive each content line's column offset from the source. That
  offset is the number of characters the indented-code prefix consumed on
  that line: up to four columns, with a tab advancing to the next stop.
  - When lines in one block use different indentation, relocate per line. If
    that needs it, add an optional per-line column offset to the internal
    `reparseMarkdown`, and keep the `remark-docs-fences` call unchanged.
  - Nested tabs must still compose: the inner block's offsets come from the
    outer reparsed value.
- **Keep:** every space-indented expectation from p04-t08.
- **Comment:** correct the constant's comment, or remove the constant.
- **Can-fail check:** revert to the fixed `+ 4` and confirm the new tab
  assertions fail; then restore.

**Step 3: Verify**

Run: `pnpm exec oxfmt <edited files> && pnpm --filter @open-agent-toolkit/docs-transforms build && bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/docs-transforms test && bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/docs-config test && bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/docs-theme test && bash scripts/with-isolated-home.sh pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/docs && pnpm --filter @open-agent-toolkit/docs-transforms check`

Expected: all pass, and the captured replay needs no recapture.

**Step 4: Commit**

`fix(p04-t09): compute tab-content columns from the authored indentation`

---

## Reviews

| Scope | Type     | Status          | Date       | Artifact                                                    | Reviewed Head                            | Invocation | Gate Target       |
| ----- | -------- | --------------- | ---------- | ----------------------------------------------------------- | ---------------------------------------- | ---------- | ----------------- |
| p01   | code     | fixes_completed | 2026-11-21 | reviews/archived/code-p01-review-2026-11-21T231056Z.md      | 1dfaecafbb523e1a41e0623659cfeaa3fa9b9b88 | auto       | -                 |
| p02   | code     | fixes_completed | 2026-11-21 | reviews/archived/code-p02-review-2026-11-21T231835Z.md      | 228d3e3ddff659c1b93795b1505ba83121df163f | auto       | -                 |
| p03   | code     | fixes_completed | 2026-11-22 | reviews/archived/code-p03-review-2026-11-22T000358Z.md      | 2c8d3b84bc075c96a4731fd0bd4fedd27990fb5f | auto       | -                 |
| p04   | code     | fixes_completed | 2026-11-22 | reviews/archived/code-p04-review-2026-11-22T013926Z.md      | dcc24fc8ff0387b2dbf44339b5b87fa46964a1f6 | auto       | -                 |
| final | code     | fixes_completed | 2026-11-22 | reviews/archived/code-final-review-2026-11-22T015824Z.md    | 2d992742e6de26415c3caa5ffc2356a3790e50dc | auto       | -                 |
| final | code     | fixes_completed | 2026-11-22 | reviews/archived/code-final-review-2026-11-22T021225Z.md    | 967e1572886de3468abd42ec338ab9641de189a6 | auto       | -                 |
| plan  | artifact | fixes_completed | 2026-11-21 | structured (in-memory)                                      | 87753e28cfdecaa6cc5985354516c8b97a01dd22 | auto       | -                 |
| plan  | artifact | fixes_completed | 2026-11-21 | reviews/archived/artifact-plan-review-2026-11-21T162334Z.md | 2b41627f184ee2556978b80397489b4d7fc3e063 | gate       | codex-6-sol-xhigh |
| plan  | artifact | passed          | 2026-11-21 | reviews/archived/artifact-plan-review-2026-11-21T164854Z.md | 08d0588d801d7cd59afd08323f645b8a0735021b | gate       | codex-6-sol-xhigh |

For code-review events, `Reviewed Head` is the full 40-character SHA at the
head of the reviewed range. `Invocation` records `manual`, `auto` or `gate`.
`Gate Target` is filled in only for gate events. Legacy five-column rows remain
valid. Writers must preserve every existing row and every unknown trailing
cell, and never truncate a widened row back to five columns.

**Plan artifact review disposition (2026-11-21):** three structured review rounds by `oat-reviewer-claude-claude-opus-5-5-high`, dispatched as the resolved `high` ceiling exception.

- Round 1 found 2 High, 8 Medium and 2 Low; all were applied in `ccfebeb04`.
- Round 2 confirmed those fixes and found 3 Medium and 2 Low; all were applied in `87753e28c`.
- Round 3 confirmed those fixes and found 1 Low: the root `.oxlintrc.json` ignore does not reach docs-theme's package oxlint. The retry bound was exhausted, so that Low was fixed after review (a package-script `--ignore-pattern`, no capture script file). The fix was not re-reviewed. The configured quick-start gate reviews the final plan.
- Gate attempt 1 (`codex-6-sol-xhigh`, reviewed `2b41627f1`) blocked with 1 High and 1 Medium. Both were resolved in the artifacts. H1: p02-t01 and design.md now remove the upstream frame context and add a `react-server` import check. M1: p04-t03 no longer runs `pnpm release:validate` before the p04-t04 bump. Gate attempt 2 re-reviews the plan.
- Gate attempt 2 (`codex-6-sol-xhigh`, reviewed `08d0588d8`) passed with 0 critical, 0 high, 0 medium and 0 low findings, and confirmed both attempt-1 fixes. The plan is ready for implementation.

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 5 tasks. The fence transform, shared reparse helper and chain
  wiring, plus two review fixes.
- Phase 2: 6 tasks. Static figure components, `figures.css` and
  `withDocsFigures`, plus two review fixes.
- Phase 3: 6 tasks. The contract test and captured compile fixtures, the
  checker rule, scaffold wiring with a fresh-app build, and OAT docs adoption,
  plus two review fixes.
- Phase 4: 9 tasks. Scaffold and skill guidance, OAT docs and instructions,
  and the lockstep release, plus two phase-review fixes and three final-review
  fixes.

**Total: 26 tasks**

---

## References

- Discovery: `discovery.md`
- Design: `design.md`
- Spike screenshots: `.oat/repo/analysis/mdxcn-spike/` (gitignored, main
  worktree)
- Upstream: <https://mdxcn.dev>, <https://github.com/shadcn-labs/mdxcn> (MIT)
- Repository Definition of Done: root `AGENTS.md`
