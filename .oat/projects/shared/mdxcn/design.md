---
oat_status: complete
oat_ready_for: null
oat_last_updated: 2026-11-21
oat_generated: false
oat_template: false
---

# Design: mdxcn

Lightweight quick-mode design. It was drafted collaboratively, and the user
approved each section in session on 2026-11-21. Requirements and decisions are
in `discovery.md`.

## Overview

OAT docs pages gain eight figure fences:

- `docs-steps`
- `docs-tree`
- `docs-timeline`
- `docs-terminal`
- `docs-decision`
- `docs-check`
- `docs-compare`
- `docs-annotate`

An author writes ordinary Markdown inside the fence. The build turns the fence
into a framed monospace figure adapted from [mdxcn](https://mdxcn.dev), and
GitHub keeps showing it as a readable code block.

The work spans three public packages and follows the pattern Mermaid and tabs
already use:

- **docs-transforms** gains one remark plugin. It recognizes `docs-*` fences,
  reparses each body as GFM Markdown, turns fence meta (`title="…"`) into
  props, and emits an MDX element. An unknown `docs-*` name fails the build. A
  shared reparse helper is extracted from `remarkTabs`, so both plugins report
  authored source positions.
- **docs-theme** ships OAT-owned, static, server-rendered copies of the eight
  mdxcn components. They have no `motion`, are visible without JavaScript, and
  are isolated from prose styles. It also ships a CSS entry point with the
  frame utilities and theme-mapped tokens, and a wrapper that adds the
  components to an MDX component map.
- **docs-config** adds the plugin to the default chain, after tabs and before
  links.

The `oat docs init` scaffold registers the components and imports the CSS, so
new apps get the fences with no wiring. Every surface that tells authors which
capabilities exist is updated in the same change:

- the scaffold contributing pages (Fumadocs documents the fences, and MkDocs
  says they render as plain code);
- the scaffold app AGENTS guidance;
- the `oat-docs-bootstrap` walkthrough;
- the `oat-docs-analyze` legacy-scaffold checks;
- OAT's own Markdown Features page.

The rule "a new docs capability updates contributing guidance" is written into
the instructions of the transforms and theme packages. All of this ships as one
lockstep release.

## Architecture

### System Context

Authoring stays in `.md`, with no MDX needed. fumadocs-mdx compiles pages
through the shared remark chain from `@open-agent-toolkit/docs-config`. Pages
render through the app's MDX component map, and the app stylesheet supplies
tokens and utilities.

Agent endpoints (`llms.txt`, `llms-full.txt` and per-page `content.md`) serve
the authored Markdown. Agents therefore read the fence source, not the rendered
figure.

### Data Flow

1. The author writes ` ```docs-tree title="Project level" ` in a `.md` page.
2. fumadocs-mdx runs the chain **tabs → docs fences → links → alerts →
   Mermaid**.
   - Tabs runs first, so a figure inside a tab is already a `code` node when
     the fence plugin walks the tree.
   - The fence plugin swaps that node for `<DocsTree title="Project level">`
     and reparses the body as GFM. Positions are relocated to the authored
     lines.
   - Links runs after it and normalizes `.md` links inside figures.
3. At render, the page's MDX component map resolves `DocsTree` to the
   docs-theme server component. The component reads its Markdown children
   (lists, `**bold**`, `*italic*`, `label: value`, `— note`) and draws the
   frame.
4. The app stylesheet imports `@open-agent-toolkit/docs-theme/figures.css`,
   which holds the frame utilities and the `--graph-*` tokens. The accent and
   muted tokens map onto the existing `--color-fd-*` theme variables. Scaffolded apps already `@source`
   the docs-theme `dist`, so the components' Tailwind classes are generated.

### Decisions

- **Component delivery:** docs-theme exports `withDocsFigures(components)`. It
  adds the eight `Docs*` components and marks overridden host tags (`p`, `ul`,
  `li`, …) so figures still recognize their children.
  - This replaces upstream `withMdxcn`. None of mdxcn's alert, quote, terminal
    or footnote upgrades are included.
  - The scaffold becomes
    `withDocsFigures({ ...defaultComponents, Mermaid, Tab, Tabs, img: ZoomImage })`.
  - The `Docs` prefix avoids collisions, for example with Fumadocs `Steps`.
- **One name list:** docs-transforms exports the `DOCS_FENCES` table. A
  contract test in docs-theme asserts the components it exports match that
  table. For this, docs-theme takes docs-transforms as a workspace dev
  dependency.
- **Checker:** `oat docs check` reports an unknown `docs-*` fence name as an
  error for Fumadocs apps, reusing `DOCS_FENCES`. The CLI already depends on
  docs-transforms. MkDocs apps are not checked, because the fences are plain
  code there.
- **Reparse helper:** the relocation logic moves out of `remarkTabs` into an
  internal shared module that takes an explicit line and column origin. The
  origins differ: a tab body starts at its block, and a fence body starts one
  line after the opening fence. Tabs keeps its nested-tab recursion as a hook.
  The helper is not a public export.
- **Upgrade path:** an existing app that bumps the packages but doesn't wrap
  its components gets MDX's own "Expected component `DocsTree` to be defined"
  error the first time a page uses a figure. Pages without figures are
  unaffected. `oat-docs-analyze` flags a missing wrapper or CSS import as a
  legacy-scaffold finding and gives the exact two-line fix.

## Component Design

### remarkDocsFences (docs-transforms)

- **Purpose:** turn `docs-*` fences into figure elements.
- **Responsibilities:**
  - Walk `code` nodes whose `lang` starts with `docs-`.
  - Look up the name in the exported `DOCS_FENCES` table, which maps each
    fence name to a component name and a body mode.
  - Replace the node with an `mdxJsxFlowElement`.
- **Attributes:** meta in the forms `key="v"`, `key='v'` and `key=v` becomes
  string attributes. Bare flags become `true`.
- **Body modes:**
  - `markdown` (the default): the body is reparsed as GFM with relocated
    positions.
  - `raw` (`docs-terminal` only): the body is passed through as one `code`
    child. Lines such as `# comment` and `$ cmd` would otherwise become
    headings and paragraphs.
- **Errors:** an unknown name calls `file.fail` with the fence name, its
  position and the list of known names.
- **Interface:**
  - `remarkDocsFences: Plugin<[], Root>`
  - `DOCS_FENCES: Record<string, { component: string; body: 'markdown' | 'raw' }>`
  - Both are added to the exports, and the plugin is added to
    `defaultTransforms` after `remarkTabs`.

### Shared reparse helper (docs-transforms, internal)

- **Signature:** `reparseMarkdown(value, origin, afterParse?)` returns the
  relocated children.
- **Behavior:** it parses with remark-parse and remark-gfm, then offsets
  line and column by `origin` and drops the `offset` field.
- **Tabs:** passes its nested-tab recursion as `afterParse`.

### Figure components (docs-theme)

These are server components with no `motion`.

| Fence           | Component      | Body grammar (as shipped; from mdxcn)                                                                                                                                                                                                                                                                                               | Fence attributes                                                                               |
| --------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `docs-steps`    | `DocsSteps`    | Ordered or unordered list, one item per step, numbered `01`, `02`, …. A loose item's first paragraph is the title and every block after it is the body. A tight item reads `Title — body` and keeps nested lists. A **bold** title marks the current step, an _italic_ title the next; a plain title is done.                       | `title`, `frame`                                                                               |
| `docs-tree`     | `DocsTree`     | Nested list. `name — note` draws the note right-aligned. A **bold** node and its path (every ancestor) take the accent while the other rows recede. A trailing `/` is only an authoring convention; it is not parsed.                                                                                                               | `title`, `frame`                                                                               |
| `docs-timeline` | `DocsTimeline` | List of `label: text` items (split at the first `: `). `— note` or a loose item's body blocks add a muted note. Plain = done (●), **bold** = now (● accent), _italic_ = next (○).                                                                                                                                                   | `title`, `frame`                                                                               |
| `docs-terminal` | `DocsTerminal` | Raw lines. `$ cmd` = command, `# …` = comment, a line starting with `✓` (or `✔`, `√`) = pass, the rest is output.                                                                                                                                                                                                                   | `title` (default `shell`), `frame`, `prompt` (`prompt="#"` changes the command glyph from `$`) |
| `docs-decision` | `DocsDecision` | List of options, then optional paragraphs for what follows (drawn under a rule). **bold** = chosen (●), _italic_ = rejected (×), plain = open (○). `— reason` is drawn muted after the option.                                                                                                                                      | `title` (default `decision`), `frame`, `status`, `date`                                        |
| `docs-check`    | `DocsCheck`    | GFM task list, tight or loose. `[x]` = done, `[ ]` = open. `— note` goes under the item. A nested list holds sub-tasks.                                                                                                                                                                                                             | `title`, `frame`                                                                               |
| `docs-compare`  | `DocsCompare`  | GFM table. The first column always holds the row labels; a named first header labels that column (a blank, `—` or `-` header leaves it unnamed). The other headers are option columns. `yes`/`true`/`✓`/`x` draw ✓ and `no`/`false`/`-`/`–`/`—` draw –; any other text is drawn as written. A last bold or `Total` row stays a row. | `title`, `frame`, `accent="Col"` (highlights one column; the others recede)                    |
| `docs-annotate` | `DocsAnnotate` | A code fence whose lines end in markers such as `// (1)`, `# (2)`, `-- (3)`, `/* (4) */` or `<!-- (5) -->`, then an ordered list: item 1 explains (1). Marked lines stay bright and the rest recede. The outer fence has four backticks.                                                                                            | `title` (defaults to `code`: Fumadocs adds no `language-*` class, so set `title`), `frame`     |

- **Shared pieces:**
  - `GraphFrame`: a dashed frame with corners and a `[ TITLE ]` label. Its root
    carries `not-prose`, so the transform no longer injects a class.
  - `graph-markdown`: the child parser, including host-tag marking.
- **Changes from upstream:**
  - `motion` and `"use client"` are removed, and so is upstream's frame
    context (`GraphFrameContext`, `GraphFrameProvider`, `useGraphFrame`).
    React's `react-server` build has no `createContext` or `useContext`, so
    the frame style is an explicit `frame` prop (default `"box"`) that
    `GraphFrame` passes to its parts. Fences never nest frames. No state,
    effect or context hooks remain, so the components are server components.
    A test imports each one under `node --conditions=react-server`.
  - The tree `whitespace-pre` indent fix is applied.
  - Inline code renders as a code chip, not bold.
- **Provenance:** each vendored file header records the upstream mdxcn version
  and these patches.

### withDocsFigures (docs-theme)

- Returns the given map plus the eight components, with host tags marked.
- Used by the scaffold `page.tsx` and by OAT's own `page.tsx`.

### figures.css (docs-theme)

The file ships as a new `./figures.css` package export and contains:

- the `--graph-*` tokens. `--graph-accent` and `--graph-muted` map onto
  `--color-fd-*`; the frame and faint tokens (and the two spare accent
  tokens) keep fixed light and dark values. Only
  `--graph-*` and `--color-graph-*` names are defined, so a downstream app's
  own `--background`, `--foreground` and `--destructive` are never overridden.
  Upstream's generic token classes are rewritten to `fd-*` or `graph-*` ones;
- an `@theme inline` block;
- the `graph-frame`, `graph-rule`, `graph-rule-y`, `scrollbar-graph` and
  `graph-scroll-x` utilities;
- the full mdxcn MIT notice.

Each vendored component file also carries the full MIT notice in a header that
`tsc` preserves, because docs-theme redistributes the code and `NOTICES.md`
ships only with the CLI. The release contract pins the notice in the CLI's
`NOTICES.md` and in one packed docs-theme file.

### Checker rule (CLI `docs check`)

On Fumadocs apps, a fenced `docs-*` language that isn't in `DOCS_FENCES` is an
error. It is reported with its line and the known list.

### Guidance and instructions (Markdown only)

- **Scaffold Fumadocs contributing page:** one Syntax/Rendered example per
  fence, plus each fence's grammar.
- **Scaffold MkDocs contributing page:** one sentence saying `docs-*` fences
  render as plain code blocks.
- **Agent-readability rule:** added to the contributing pages. Emphasis must
  not be the only carrier of an important state, so write it in the text too,
  for example "brainstorming (current)". Agents read the fence source through
  the llms endpoints.
- **Scaffold app `AGENTS.md`:** when to use a figure rather than a list or
  Mermaid.
- **`oat-docs-bootstrap`:** walkthrough and verification text.
- **`oat-docs-analyze`:** a legacy-scaffold check for a missing wrapper or CSS
  import.
- **OAT docs:** Markdown Features, `documentation.md` and the app `AGENTS.md`.
- **Package `AGENTS.md` for transforms and theme:** a completion check that a
  new authoring capability updates the contributing guidance, the scaffold
  templates and the bootstrap guidance.
- **`NOTICES.md`:** an mdxcn entry.

## Error Handling

- An unknown `docs-*` fence fails the build (`file.fail`) and the fast
  `docs check` pass. Both report the position and the known names.
- A missing component registration gives MDX's error naming the component.
  Analyze flags it ahead of time.
- Malformed figure bodies degrade the same way upstream does: the components
  render whatever children parse. No new validation is added beyond fence
  names. Grammar checking is deferred (see `discovery.md`).

## Testing Strategy

### Fixture Provenance

Two kinds of test input exist:

- **Hand-built inputs (component unit tests, p02).** Inline element trees are
  modeled on upstream mdxcn registry examples and doc comments, and each test
  file header says so. They stay inline in `.test.ts` files so nothing compiles
  into `dist`.
- **Captured compile fixtures (p03).** One page holds all eight fences,
  including one inside a tab and one with a `.md` link. It is compiled the way
  fumadocs-mdx compiles `.md`: `@mdx-js/mdx` `compile` with `format: 'md'`
  and `applyMdxPreset` over the shared remark chain, which adds `rehypeCode`.
  The function-body output is committed under `src/**/__fixtures__/` with a
  provenance header. That directory is excluded from `tsc`, the version policy,
  oxfmt (root `.oxfmtrc.jsonc`) and the package's oxlint passes (an
  `--ignore-pattern` in its scripts). The test runs the captured module and renders it through
  the live scaffold component map, so a component regression fails it.

The spike's converted lifecycle page is the end-to-end artifact.

### Unit Tests: docs-transforms

- Each `DOCS_FENCES` name produces the right element.
- Meta parsing: quoted values, bare values and flags.
- Terminal `raw` mode.
- An unknown name fails with the fence, its line and the known list.
- Non-`docs-` fences pass through unchanged.
- Positions map to authored lines for both the fence and tab origins. The
  existing tabs tests stay green after the helper extraction.
- Composition:
  - a figure inside a tab;
  - a `.md` link inside a figure, normalized by `remarkLinks`;
  - `> [!NOTE]` and Mermaid beside a figure, unaffected.

### Unit Tests: docs-theme

- `renderToStaticMarkup` of each component from its inline input. The tests
  assert the frame, the title, item states (done/now/next, chosen/rejected,
  `[x]`) and tree nesting and indents.
- Host-tag detection covers Fumadocs' `pre`, `table` and `a` overrides.
- The server HTML contains no `opacity:0` or `motion` markup.
- `withDocsFigures` keeps existing entries and adds all eight.
- Contract: the component names equal `DOCS_FENCES`. For this, docs-theme
  takes docs-transforms and docs-config as workspace dev dependencies.
- Captured compile fixtures replayed through the live component map (see
  Fixture Provenance).
- The `figures.css` export is present, and the CSS defines no unprefixed custom
  properties.

### CLI Tests

- `docs check`:
  - An unknown `docs-*` fence errors on a Fumadocs fixture.
  - Known fences pass.
  - MkDocs fixtures are not checked.
- The scaffold contract tests are updated for the template wording, the
  `withDocsFigures` wiring and the CSS import.
- The `oat docs init` integration test covers both frameworks.

### Can-Fail Proof

- Restoring `initial={{opacity:0}}` fails the no-hidden-content test.
- Removing `file.fail` fails the unknown-fence test.

### End-to-End and Visual

- `pnpm build:docs` succeeds with the lifecycle page and the Markdown Features
  examples.
- A freshly scaffolded Fumadocs app builds with one figure page. It is wired
  to packed branch builds of the docs packages and the CLI, so its prebuild
  `docs check` runs the branch's `docs-fences` rule.
- Manual check in light and dark at desktop and phone widths:
  - no figure overflow: the wide figures (tree, terminal, compare and
    annotate) scroll with `overflow-x-auto`;
  - no hydration warning in the console.
- The full Definition of Done gate list, including the skill-bump,
  lockstep-version and manifest-freshness checks.

## References

- Discovery: `discovery.md`.
- Spike screenshots: `.oat/repo/analysis/mdxcn-spike/` (gitignored).
- Spike source: the uncommitted spike on branch
  `research/mdxcn-markdown-transforms`, kept in the working tree until
  implementation replaces it:
  - `apps/oat-docs/lib/remark-docs-fences.ts`
  - `apps/oat-docs/registry/default/`
  - the `apps/oat-docs/app/globals.css` additions
- Upstream: <https://mdxcn.dev>, <https://github.com/shadcn-labs/mdxcn> (MIT).
