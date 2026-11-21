---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-11-21
oat_generated: false
---

# Discovery: mdxcn

## Initial Request

Explore [mdxcn](https://www.mdxcn.dev/) and build its components into
markdown-based transforms, so OAT docs can render rich MDX figures from plain
Markdown. Authors write fenced code blocks (for example
` ```docs-timeline title="Idea states" `). The build turns each fence into a
framed monospace figure, and the source still reads well on GitHub.

Added later in the session: every new docs capability must also update the
contributing guidance that scaffolded docs apps receive, and the
`oat-docs-bootstrap` guidance that describes it. "Contributing should cover
anything new that is a capability, like a visual capability, that is available
to be used in docs."

## Background: the spike

An untracked spike on branch `research/mdxcn-markdown-transforms` proved the
approach on `workflows/ideas/lifecycle.md`. Screenshots are kept in the
gitignored `.oat/repo/analysis/mdxcn-spike/`.

- A fence plugin of about 60 lines, placed after `remarkTabs`, swaps
  `docs-steps`, `docs-tree` and `docs-timeline` fences for mdxcn components. It
  reparses the fence body as GFM Markdown, turns fence meta into props, and
  fails the build on an unknown `docs-*` name.
- mdxcn is a shadcn registry (MIT), not an npm package, so its components are
  copied in. They parse their Markdown children by host tag. Bold marks
  "current", italic marks "next", and the grammar also uses `label: value`,
  `a → b` and `x — note`.
- The spike rendered correctly in light and dark mode with the docs theme
  accent. It also found six problems:
  1. Fumadocs `.prose` styles leak into figures. Fixed with `not-prose`.
  2. The frame and rule CSS utilities live in mdxcn's site stylesheet, not in
     the registry items.
  3. An upstream tree bug collapses indents under a last child
     (`whitespace-nowrap`).
  4. The `motion` entry animation renders items at opacity 0 on the server,
     which caused a hydration mismatch under reduced motion.
  5. Inline code inside figures renders bold, not as code.
  6. fumadocs-mdx does not hot-reload plugin files imported by
     `source.config.ts`. This is a development note only.

## Clarifying Questions

### Question 1: Authoring syntax

**Q:** Fences, directives or JSX?
**A:** Fences. This follows the same pattern as the existing Mermaid and tabs
transforms.
**Decision:** Use fenced code blocks with a `docs-` prefix on the language
(`docs-steps`, `docs-tree`, …). The prefix keeps the names from colliding with
real code languages and makes the feature easy to grep.

### Question 2: Callouts

**Q:** Should mdxcn's callout replace the GitHub alert syntax?
**A:** No. `> [!NOTE]` matters because GitHub renders it natively.
**Decision:** Keep `remark-github-blockquote-alert` for callouts, and switch
off mdxcn's alert, quote, terminal and footnote upgrades.

### Question 3: Component set

**Q:** Which mdxcn components should the first version cover?
**A:** The docs-relevant set.
**Decision:** Eight components: steps, tree, timeline, terminal, decision,
check, compare and annotate. Charts and business widgets are left out.

### Question 4: Animation

**Q:** Keep mdxcn's `motion` animation?
**A:** No. Ship static components.
**Decision:** Remove the animation from OAT's copies. Figures render fully
visible on the server, with no `motion` dependency for downstream docs apps.
This avoids the hydration mismatch and empty frames for print, no-JS and agent
readers.

### Question 5: Contributing coverage

**Q:** What must change besides the transform?
**A:** Every capability available to docs authors must appear in the
contributing guidance that scaffolded docs apps receive, and in the bootstrap
skill's description of it.
**Decision:** Treat the scaffold contributing templates, scaffold app AGENTS
guidance, `oat-docs-bootstrap` walkthrough and verification text, and
`oat-docs-analyze` legacy-scaffold checks as in scope. Also make the rule
durable in the repository's instructions, so future transforms follow it too.

## Solution Space

The approach was settled during the session and validated by the spike.
Markdown fences become components at build time through a remark transform,
matching the existing `remarkMermaid` and `remarkTabs`. Two alternatives were
rejected:

- **Raw MDX JSX in pages.** Rejected because pages would stop being plain
  Markdown. That breaks the GitHub readability, agent endpoint and
  `.md`-first conventions.
- **Upstream mdxcn's own `withMdxcn` upgrades for alerts, quotes and
  terminals.** Rejected for callouts (see Question 2). Not needed for the
  rest.

### Chosen Direction

**Approach:** A shared `docs-*` fence transform in the public docs-transforms
package. OAT-owned static copies of the selected mdxcn components ship in the
docs theme, wired by default in the shared docs config and the `oat docs init`
scaffold.
**Rationale:** It ships one capability to every OAT Fumadocs app, keeps
authoring in Markdown, and reuses the established transform pattern.
**User validated:** Yes. The user approved the spike direction, then the
component set and animation choices above.

## Key Decisions

1. **Syntax:** ` ```docs-<name> key="value" ` fences. Fence meta becomes
   props, and the body is reparsed as GFM Markdown. An unknown `docs-*` name
   fails the build with the list of known names.
2. **Pipeline position:** The transform runs after tabs, so figures work inside
   tabs. It runs before links, so links inside figures are normalized.
3. **Callouts:** stay on GitHub alert syntax through remarkAlert.
4. **Components:** steps, tree, timeline, terminal, decision, check, compare
   and annotate. These are vendored and owned by OAT with an MIT attribution in
   `NOTICES.md`, not tracked against upstream automatically.
5. **Rendering:** static and server-rendered. There is no `motion` dependency
   and figures stay visible without JavaScript.
6. **Spike fixes carried forward:** isolation from prose styles, the frame and
   rule CSS utilities with theme-mapped tokens, and the tree indent fix.
7. **Inline code in figures** renders as code, matching surrounding docs, not
   as mdxcn's bold. To be confirmed at the requirements gate.
8. **MkDocs:** no figure support. MkDocs contributing guidance says `docs-*`
   fences render as plain code blocks there.
9. **Contributing coverage:** every surface that lists docs authoring
   capabilities is updated in the same change. The rule "new docs capability
   ⇒ update contributing guidance, scaffold templates and bootstrap guidance"
   is recorded in the instructions of the transforms and theme packages.
10. **Release:** shipped changes to docs-transforms, docs-theme, docs-config,
    the CLI scaffold and bundled skills require the lockstep five-package
    version bump, plus a skill version bump for each changed skill.

## Constraints

- Pages stay plain `.md`. No MDX is needed to use a figure.
- Fence source must stay readable on GitHub, where it renders as a code block.
- Existing transforms (tabs, links, alerts, Mermaid) keep their behavior and
  order.
- Downstream OAT docs apps receive the capability through the shared packages
  and the scaffold, not by copying files.
- Follow the repository's Definition of Done gates, including the generated
  docs manifest freshness check.
- mdxcn is MIT licensed. Attribution is required in `NOTICES.md`.
- The CLI contract tests pin scaffold template wording, so template edits need
  matching test updates.

## Success Criteria

- Authors can use all eight `docs-*` fences in `.md` pages. Each renders as a
  framed figure in light and dark mode on the OAT docs site, including inside
  tabs.
- Figures are fully visible in server-rendered HTML, and there is no hydration
  warning.
- An unknown `docs-*` fence fails with a clear message that names the known
  fences.
- A freshly scaffolded Fumadocs app (`oat docs init`) supports the fences with
  no manual wiring, and its contributing page documents them with
  Syntax/Rendered examples.
- `oat-docs-bootstrap` describes the capability accurately, and
  `oat-docs-analyze` flags older scaffolds that lack it.
- OAT's own Markdown Features page documents every fence. The lifecycle page
  and at least one other real page use figures.
- The "new capability ⇒ contributing guidance" rule is written into
  repository instructions.
- All CI gates pass, with lockstep and skill version bumps.

## Out of Scope

- The other roughly 39 mdxcn components: charts, data widgets, timers and
  business documents.
- Directive (`::graph-*`) or Comark syntax.
- MkDocs rendering of figures.
- Automatic syncing with upstream mdxcn.
- Replacing GitHub alert callouts or Mermaid diagrams.

## Deferred Ideas

- Adding more mdxcn components on demand, which is cheap once the mechanism
  exists. Deferred until a page needs one.
- Reporting the tree indent bug upstream to mdxcn. This is an outward-facing
  action and needs the user's go-ahead separately.
- Teaching `oat docs check` the grammar of each fence, beyond fence names.
  Deferred until a real authoring error shows it is needed.

## Open Questions

- **Checker coverage:** Should `oat docs check` reject unknown `docs-*` fence
  names without building, the way it validates Mermaid today, or is the build
  failure enough? Resolve in design.
- **Component delivery:** How the theme package ships the components, their
  CSS utilities and tokens to downstream apps. Options include a single
  exported component map, a CSS entry point, and Tailwind source scanning of
  the package.
- **Shared reparse helper:** Whether to extract `remarkTabs`' private
  `reparseContent` (position relocation, nested transforms) for reuse.
- **Upgrade path:** How existing downstream apps adopt the components when
  their page registration predates them, and whether a missing registration
  fails clearly.

## Assumptions

- Each component's Markdown child grammar is as stable as the spike suggests.
  Each of the five new components needs its grammar confirmed against its
  upstream source.
- Tailwind v4 in downstream apps can pick up utility classes used inside the
  theme package, as it does for the existing theme components.

## Risks

- **Vendored drift:** OAT's static copies diverge from upstream fixes.
  - **Likelihood:** Medium
  - **Impact:** Low
  - **Mitigation Ideas:** Record the upstream version and the local patches in
    the vendored files and in `NOTICES.md`.
- **Downstream breakage on upgrade:** Apps that bump the packages but keep an
  old page registration fail when a page uses a figure.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** A default export that apps already spread, an analyze
    check, and release notes.
- **Contract test churn:** Template wording changes break pinned CLI tests.
  - **Likelihood:** High
  - **Impact:** Low
  - **Mitigation Ideas:** Update the tests in the same task as the template
    edits.

## Next Steps

Quick mode, at the design-depth decision point. Component delivery, checker
coverage and the upgrade path are architecture questions, so a lightweight
design is the expected next step before planning.
