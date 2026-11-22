---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-11-21
oat_current_task_id: p03-t05
oat_generated: false
---

# Implementation: mdxcn

**Started:** 2026-11-21
**Last Updated:** 2026-11-21

This journal resumes interrupted implementation sessions. Every plan task has one block in its phase; `oat project journal check` validates it.

## Progress Overview

| Phase   | Status      | Tasks | Completed |
| ------- | ----------- | ----- | --------- |
| Phase 1 | complete    | 5     | 5/5       |
| Phase 2 | complete    | 6     | 6/6       |
| Phase 3 | in_progress | 6     | 4/6       |
| Phase 4 | pending     | 4     | 0/4       |

**Total:** 15/21 tasks completed

---

## Phase 1: Fence transform (docs-transforms, docs-config)

**Status:** complete
**Started:** 2026-11-21

### Phase Summary

**Outcome (what changed):**

- `docs-*` fenced code blocks now become figure components at build time. Fence meta becomes props, the body is reparsed as GFM Markdown (raw for `docs-terminal`), and the authored line numbers are kept.
- An unknown `docs-*` name fails the build, listing the eight known names. A `docs-*` fence nested inside a figure body also fails, so figure frames never nest.
- The shared docs-config chain runs `remarkTabs → remarkDocsFences → remarkLinks → remarkMermaid`, so figures work inside tabs and links inside figures are normalized.

**Key files touched:**

- `packages/docs-transforms/src/reparse.ts`: the shared `reparseMarkdown` helper, extracted from remark-tabs.
- `packages/docs-transforms/src/remark-docs-fences.ts`: the plugin and the `DOCS_FENCES` table.
- `packages/docs-config/src/source-config.ts`: the chain wiring.

**Verification:** after fan-in on the merged tree:

- the docs-transforms suite passes (67 tests);
- the docs-config suite passes (24);
- build, type-check and check pass for both packages.

**Notes / Decisions:**

- Run as one member of the parallel group `[p01, p02]` in worktree `.worktrees/mdxcn/p01`, branch `mdxcn/p01`. It was merged into the project branch as `849272f8f`.
- The root review passed with 0 Critical and 0 High findings. Its 1 Medium and 1 Low became p01-t04 and p01-t05, which are now done.

### Task p01-t01: Extract the shared reparse helper from remarkTabs

**Status:** completed
**Commit:** cabf8ae38dc043b6e129ac89d33754b7f056522a

**Outcome:**

- `reparseMarkdown(value, origin, afterParse?)` is shared. remarkTabs uses it, and its output, positions included, is unchanged.

**Files changed:**

- `packages/docs-transforms/src/reparse.ts`
- `packages/docs-transforms/src/reparse.test.ts`
- `packages/docs-transforms/src/remark-tabs.ts`

**Verification:** The reparse, tabs and composition tests failed first (RED), then all 16 passed. The docs-transforms suite passed (42), and type-check and check were clean.

### Task p01-t02: Add remarkDocsFences and DOCS_FENCES

**Status:** completed
**Commit:** f2ee20ac46faf41506ec4077f12fb5f443c111d9

**Outcome:**

- Eight `docs-*` fences map to figure components, and meta becomes props. A bare flag becomes MDX boolean shorthand (`true`). An unknown name triggers `file.fail` with `ruleId: unknown-docs-fence`.

**Files changed:**

- `packages/docs-transforms/src/remark-docs-fences.ts`
- `packages/docs-transforms/src/remark-docs-fences.test.ts`
- `packages/docs-transforms/src/index.ts`

**Verification:** The tests failed first (RED), then 19 passed. The suite passed (61).

**Notes / Decisions:**

- **Can-fail control:** with `file.fail` neutralized, only the unknown-fence test failed, on its own assertion. After restoring the file, it passed again.
- **Extra export:** `DocsFenceBody` is also exported from `index.ts`. `reparseMarkdown` stays internal.

### Task p01-t03: Wire the fence transform into the shared source chain

**Status:** completed
**Commit:** 1dfaecafbb523e1a41e0623659cfeaa3fa9b9b88

**Outcome:**

- The docs-config chain is `remarkTabs → remarkDocsFences → remarkLinks → remarkMermaid`. A composed figure inside a tab next to an alert renders.

**Files changed:**

- `packages/docs-config/src/source-config.ts`
- `packages/docs-config/src/source-config.test.ts`
- `packages/docs-transforms/src/composition.test.ts`

**Verification:** The source-config tests failed first (RED), then 14 passed. docs-config passed (24) and docs-transforms passed (64).

### Task p01-t04: (review) Fail the build on docs-\* fences nested in a figure body

**Status:** completed
**Commit:** 9afaac1865346b702efa441b8e9c322580769ac6

**Outcome:**

- A `docs-*` fence inside a Markdown-body figure fails the build. An unknown name gets the unknown-fence message. A known name gets "Docs figure fences cannot be nested inside another figure", with `ruleId: nested-docs-fence`.

**Files changed:**

- `packages/docs-transforms/src/remark-docs-fences.ts`
- `packages/docs-transforms/src/remark-docs-fences.test.ts`

**Verification:** Both new tests failed first (RED). The suite then passed (66), with type-check and check clean.

**Notes / Decisions:**

- **Can-fail control:** with the nested scan disabled, both new tests failed on their own message assertions (`remark-docs-fences.test.ts:225`, `:249`).

### Task p01-t05: (review) Pin tab-origin positions after the reparse extraction

**Status:** completed
**Commit:** 3178bcfff14fbc1043f6c816d53e9712860f9b91

**Outcome:**

- A test pins the line positions of tab content under one and two tab levels.

**Files changed:**

- `packages/docs-transforms/src/remark-tabs.test.ts`

**Verification:** The suite passed (67) and docs-config passed (24).

**Notes / Decisions:**

- **Can-fail control:** an `undefined` origin made the test fail at `remark-tabs.test.ts:253` (it got line 1 instead of line 7).
- **Columns (pre-existing):** tab content reports column 1, losing the tab indentation, and the original `reparseContent` did the same. Design requires authored lines only. The columns are pinned as observed and the decision is deferred to the operator (see Deferred Findings).

### Review Received: p01

**Review:** `reviews/archived/code-p01-review-2026-11-21T231056Z.md` (local only), reviewed head `1dfaecafbb523e1a41e0623659cfeaa3fa9b9b88`, invocation `auto`, request `mdxcn-p01-review-r1-20261121`
**Findings:** 0 critical, 0 high, 1 medium, 1 low
**Finding classes:** M1 accepted-requirement (discovery Key Decision 1 and Success Criteria; design Error Handling); L1 accepted-requirement (design Testing Strategy; plan p01-t01 "positions unchanged")

- **M1 (Medium):** an unknown `docs-*` fence nested in a figure body passed silently. Converted to p01-t04, done in `9afaac186`.
- **L1 (Low):** no test pinned tab-origin positions after the helper extraction. Converted to p01-t05, done in `3178bcfff`.

**Outcome:** fixes completed. These were Medium and Low fixes, so there was no re-review. Phase accepted.

---

## Phase 2: Figure components (docs-theme)

**Status:** complete
**Started:** 2026-11-21

### Phase Summary

**Outcome (what changed):**

- OAT-owned static server-component copies of eight mdxcn figures (steps, tree, timeline, terminal, decision, check, compare, annotate), plus the frame and the child parser. Upstream React context and `motion` are removed.
- `withDocsFigures(components)` adds the eight figures with host-tag marking. A `./figures.css` export defines only `--graph-*`/`--color-graph-*` tokens and the frame/rule utilities.
- Every vendored module, in source and in `dist`, carries the full mdxcn MIT notice. A test fails if a compiled module loses it.

**Key files touched:**

- `packages/docs-theme/src/figures/*.tsx`: the figures and the frame.
- `packages/docs-theme/src/figures/graph-markdown.ts`: the child parser.
- `packages/docs-theme/figures.css`: the tokens and utilities.
- `packages/docs-theme/src/figures/index.ts`: the exports and `withDocsFigures`.

**Verification:** after fan-in on the merged tree:

- the docs-theme suite passes (139 tests);
- build, type-check and check pass;
- the built `dist/figures/index.js` imports under `node --conditions=react-server`.

**Notes / Decisions:**

- Run as one member of the parallel group `[p01, p02]` in worktree `.worktrees/mdxcn/p02`, branch `mdxcn/p02`. It was merged into the project branch as `90cf42c53`.
- Upstream LICENSE is byte-identical to `MIT_LICENSE_BODY`; the copyright line is `Copyright (c) 2026 Keshav Bagaade`. The upstream registry was fetched 2026-11-20, with mdxcn `main` at `884eba5` (2026-11-11).
- The root review passed with 0 Critical and 0 High findings. Its 1 Medium and 2 Low became p02-t05 and p02-t06, which are now done.

### Task p02-t01: Vendor the static frame, child parser and figures.css

**Status:** completed
**Commit:** 1822cef1ad0f9979cf839a1cf88c9bdcb6c49e73

**Outcome:**

- A static `GraphFrame` (with `not-prose` and an explicit `frame` prop, no context), the `graph-markdown` parser, a local `cn`, and `figures.css`.

**Files changed:**

- `packages/docs-theme/src/figures/graph-frame.tsx`
- `packages/docs-theme/src/figures/graph-markdown.ts`
- `packages/docs-theme/src/figures/cn.ts`
- `packages/docs-theme/src/figures/graph-frame.test.ts`
- `packages/docs-theme/figures.css`
- `packages/docs-theme/package.json`

**Verification:** The tests failed first (RED), then 45 passed. Type-check and check passed.

**Notes / Decisions:**

- **react-server can-fail control:** a temporary top-level `React.createContext` module made the child process exit 1 with `TypeError: React.createContext is not a function`.
- **No `--graph-danger` token:** none was added, because no figure uses `text-destructive`.

### Task p02-t02: Add DocsSteps, DocsTree and DocsTimeline

**Status:** completed
**Commit:** 8fda0f59e5b243a57e0bac117fc0d88f1ec020a0

**Outcome:**

- Static steps, tree (with the `whitespace-pre` indent fix) and timeline.

**Files changed:**

- `packages/docs-theme/src/figures/steps.tsx`
- `packages/docs-theme/src/figures/tree.tsx`
- `packages/docs-theme/src/figures/timeline.tsx`
- `packages/docs-theme/src/figures/figures-core.test.ts`

**Verification:** The tests failed first (RED), then 62 passed. Type-check and check passed.

### Task p02-t03: Add DocsTerminal, DocsDecision, DocsCheck, DocsCompare and DocsAnnotate

**Status:** completed
**Commit:** a8c2b90e2d78c5aa59352eb0e33b29533d6e430e

**Outcome:**

- Five more static figures. Their tests are built from the real Fumadocs `pre` and `table` overrides.

**Files changed:**

- `packages/docs-theme/src/figures/terminal.tsx`
- `packages/docs-theme/src/figures/decision.tsx`
- `packages/docs-theme/src/figures/check.tsx`
- `packages/docs-theme/src/figures/compare.tsx`
- `packages/docs-theme/src/figures/annotate.tsx`
- `packages/docs-theme/src/figures/figures-extended.test.ts`

**Verification:** The tests failed first (RED), then 18 passed. Type-check and check passed.

**Notes / Decisions:**

- **Compare:** fixes an upstream column-shift bug. The first column always holds row labels.

### Task p02-t04: Export the components and withDocsFigures, with a no-hidden-content guard

**Status:** completed
**Commit:** 6f7c021f1434ac830d819799f9ce3d062314192d

**Outcome:**

- `withDocsFigures` and the eight exports. A guard checks that the server HTML has no `opacity:0` or motion markup.

**Files changed:**

- `packages/docs-theme/src/figures/index.ts`
- `packages/docs-theme/src/figures/with-docs-figures.test.ts`
- `packages/docs-theme/src/index.ts`

**Verification:** Test, type-check, build and check all passed.

**Notes / Decisions:**

- **Can-fail control:** `opacity: 0` on a steps item failed exactly "DocsSteps renders fully visible server HTML".
- **Text assertion for the re-export:** importing `src/index.ts` under vitest fails on Fumadocs image-zoom CSS, so the index re-export is asserted as text, and the `dist` exports were checked separately.

### Task p02-t05: (review) Align design.md's figure grammar and CSS notes with the shipped components

**Status:** completed
**Commit:** 8c3eeecddce4ce3ef47bfa52fc57ebaca707f5be

**Outcome:**

- design.md's grammar table, attribute column, token mapping and overflow notes now match the component source.

**Files changed:**

- `.oat/projects/shared/mdxcn/design.md`

**Verification:** `oxfmt` format and `--check` passed.

### Task p02-t06: (review) Extend the server-component check to every non-test figure module

**Status:** completed
**Commit:** 5273066f28c86aefc8261a085cd0a1f67a4bea26

**Outcome:**

- The hook scan and the react-server import now cover every `src/figures/*.ts(x)` module except tests.

**Files changed:**

- `packages/docs-theme/src/figures/graph-frame.test.ts`

**Verification:** Build passed, the suite passed (139), and check, type-check and lint passed.

**Notes / Decisions:**

- **Can-fail control:** a `useContext` call appended to `graph-markdown.ts` failed exactly "graph-markdown.ts has no client-only code".

### Recovery Event mdxcn-p02-rec-001

- **Phase:** p02 (originating tasks p02-t02 and p02-t03); **request:** mdxcn-p02-implementation-20261121
- **Defect:** six vendored `dist/figures/*.js` modules lost the mdxcn MIT header. Their leading `import type … from 'react'` was elided by `tsc`, and the header comment went with it.
- **Disposition:** direction-required. The dispatch had forbidden `state.md` writes, so no reservation was made, nothing was edited and no attempt was used. The root then authorized recovery.

### Recovery Event mdxcn-p02-rec-002

- **Phase:** p02; **attempt:** 1 of 10; **authorization:** phase-standing (root decision on rec-001)
- **Dispatch target:** oat-phase-implementer-claude-claude-opus-5-5-high, same handle
- **Original commits:** `8fda0f59e5b243a57e0bac117fc0d88f1ec020a0`, `a8c2b90e2d78c5aa59352eb0e33b29533d6e430e` (unchanged)
- **Recovery commit:** `228d3e3ddff659c1b93795b1505ba83121df163f`. It rewrites the six imports as inline `import { type … }` and adds `license-notice.test.ts`.
- **Disposition:** recovered. On the committed HEAD the notice test passed 12/12 and the package suite 136/136.
- **Can-fail control:** reverting `tree.tsx` failed only that module's notice test.
- **Root verification:** a clean rebuild shows the notice in all 11 vendored modules (`cn.js` is OAT-authored). The ledger marker was cleared at fan-in, and `used_attempts: 1` is kept.

### Review Received: p02

**Review:** `reviews/archived/code-p02-review-2026-11-21T231835Z.md` (local only), reviewed head `228d3e3ddff659c1b93795b1505ba83121df163f`, invocation `auto`, request `mdxcn-p02-review-r1-20261121`
**Findings:** 0 critical, 0 high, 1 medium, 2 low
**Finding classes:**

- M1: accepted-requirement (root AGENTS.md and the implement contract: intentional design divergence must be recorded; p04-t01 takes its grammar from design.md).
- L1: accepted-requirement (the design statement on token mapping and overflow).
- L2: accepted-requirement (design.md: "No state, effect or context hooks remain").

- **M1 (Medium):** design.md's grammar table was stale against the shipped, upstream-faithful grammar. Converted to p02-t05, done in `8c3eeecdd`.
- **L1 (Low):** design overstated the token mapping and the `graph-scroll-x` overflow handling. Folded into p02-t05. The unused tokens were left in `figures.css`, because the review called removing them optional and the plan required those utilities.
- **L2 (Low):** the server-component scan covered `.tsx` files only. Converted to p02-t06, done in `5273066f2`.

**Outcome:** fixes completed. These were Medium and Low fixes, so there was no re-review. Phase accepted.

---

## Phase 3: Integration (contract, checker, scaffold, OAT docs app)

**Status:** in_progress
**Started:** 2026-11-21

### Task p03-t01: Add the fence/component contract test and captured compile fixtures

**Status:** completed
**Commit:** 2625a7612a4c0017bef94b9f4ab5325264496703

**Outcome:**

- `fence-contract.test.ts` pins every `DOCS_FENCES` name to a docs-theme export, in both directions.
- `compiled-fixtures.test.ts` replays a real Fumadocs compile of `all-fences.md` through the figures.
- The fixtures are excluded from `dist`, oxlint and oxfmt. The version-policy ignore list matches the new tsconfig exclusion.

**Files changed:**

- `packages/docs-theme/src/figures/fence-contract.test.ts`
- `packages/docs-theme/src/compiled-fixtures.test.ts`
- `packages/docs-theme/src/figures/__fixtures__/all-fences.md`
- `packages/docs-theme/src/figures/__fixtures__/all-fences.compiled.js`
- `packages/docs-theme/package.json`
- `packages/docs-theme/tsconfig.json`
- `packages/cli/src/release/public-package-contract.ts`
- `packages/cli/src/release/public-package-contract.test.ts`
- `.oxfmtrc.jsonc`
- `pnpm-lock.yaml`

**Verification:**

- The contract test passes 2/2 and the replay test 11/11. The docs-theme suite passes (152) and the version-policy contract passes 29/29.
- After a clean build, `dist` holds no fixtures or tests.

**Notes / Decisions:**

- **Fixture provenance** (recorded in the fixture header):
  - Captured 2026-11-21 with `@mdx-js/mdx` 3.1.1, fumadocs-mdx 14.3.2 and fumadocs-core 16.10.2, on Node v26.11.1 (the repository pins 22.23.4).
  - Compiled with `format: 'md'` and `applyMdxPreset` over `createSourceConfig().remarkPlugins`, in runtime mode.
- **Can-fail controls:**
  - Removing `DocsAnnotate` failed the contract test on that name, from either side.
  - Inverting the timeline's bold/italic detection failed only the timeline replay.
  - Dropping the new ignore pattern failed the tsconfig-equality contract.
- No component fixes were needed: no figure misread the real `pre`, `table` or `a` overrides.

### Task p03-t02: Reject unknown docs-\* fences in `oat docs check` for Fumadocs apps

**Status:** completed
**Commit:** 7dbcb662116fa45b901ab80dd80dca034998fc70

**Outcome:**

- A `docs-fences` rule in `oat docs check` reports unknown `docs-*` fence names with file and line, for Fumadocs apps only.

**Files changed:**

- `packages/cli/src/commands/docs/check/docs-fences.ts`
- `packages/cli/src/commands/docs/check/checker.ts`
- `packages/cli/src/commands/docs/check/checker.test.ts`
- `packages/cli/src/config/documentation-check.ts`

**Verification:** The tests failed first (RED). Then the docs-check, config and `src/config` suites passed (809), and CLI type-check and check passed.

**Notes / Decisions:**

- **Can-fail controls:**
  - Removing the Fumadocs-only gate failed the MkDocs and Markdown tests.
  - Removing the known-name lookup failed the unknown, known and `--rules` tests.

### Task p03-t03: Wire figures into the Fumadocs scaffold

**Status:** completed
**Commit:** 9c494f619537c642bcd7d91883e3468863863b33

**Outcome:**

- The Fumadocs scaffold template wraps its MDX components with `withDocsFigures` and imports `figures.css`, so a new app needs no manual wiring.

**Files changed:**

- `.oat/templates/docs-app-fuma/app/[[...slug]]/page.tsx`
- `.oat/templates/docs-app-fuma/app/globals.css`
- `packages/cli/src/commands/docs/init/integration.test.ts`

**Verification:** The tests failed first (RED), then the `docs/init` suite passed (150). The fresh-scaffold build:

- **Setup:** `pnpm build`, then `pnpm pack` of all five public packages. The branch CLI ran `docs init --framework fumadocs`, with dependencies pointed at the tarballs (fumadocs-core 16.19.6, next 16.4.6).
- **Content:** a page with a `docs-tree` fence was added.
- **Checks:**
  - The app's `docs:check` rejected a temporary `docs-nope` fence (exit 1) and passed once it was reverted.
  - `pnpm build` exited 0.
  - The exported HTML shows the figure with no `opacity:0`, and the emitted CSS contains the `graph-*` tokens and utilities.

### Task p03-t04: Replace the spike in the OAT docs app with the packaged capability

**Status:** completed
**Commit:** 740ef27c0a4d932831655beebc91537ee87a2c93

**Outcome:**

- The OAT docs app uses the packaged figures.
  - **Lifecycle page:** the Flow section is now `docs-steps`, Directory structure `docs-tree`, and State model `docs-timeline`.
  - **`tool-packs.md`:** the `oat tools info` output is now `docs-terminal`.
- No spike leftovers remain: no local plugin, `registry/` copies or `motion` dependency.

**Files changed:**

- `apps/oat-docs/app/[[...slug]]/page.tsx`
- `apps/oat-docs/app/globals.css`
- `apps/oat-docs/docs/workflows/ideas/lifecycle.md`
- `apps/oat-docs/docs/getting-started/tool-packs.md`

**Verification:**

- `pnpm build:docs` ran fresh, building 187 pages. The index freshness check passed.
- `docs:check` reports 0 errors and 776 warnings, the same count as at the phase base. `pnpm --filter oat-docs check` passed.
- **Visual check (by the root, at the implementer's IMPLEMENT-20 proof boundary):** Chrome DevTools against the static export. Both routes were checked in light and dark mode at 1440px and at 390px.
  - The document never overflows. At 390px the tree and terminal scroll inside their frames, and the timeline wraps.
  - The console is empty on every load, so there are no hydration warnings.
  - Screenshots are in `.oat/repo/analysis/mdxcn/` (local only).

**Phase verification** at `740ef27c0`, clean tree:

- `pnpm check` ran fresh.
- `pnpm type-check`: unchanged packages were replayed from cache.
- `pnpm test:evidence` was forced with an isolated HOME. The suites passed: cli 450 files, control-plane 14, docs-theme 10, docs-transforms 5, docs-config 5.
- The docs index is fresh.

### Task p03-t05: (review) State the checker's fence-name scope in design.md

**Status:** pending
**Commit:** -

### Task p03-t06: (review) Catch class-based hiding in the no-hidden-content replay assertion

**Status:** pending
**Commit:** -

### Review Received: p03

**Review:** `reviews/archived/code-p03-review-2026-11-22T000358Z.md` (local only), reviewed head `2c8d3b84bc075c96a4731fd0bd4fedd27990fb5f`, invocation `auto`, request `mdxcn-p03-review-r1-20261121`
**Findings:** 0 critical, 0 high, 0 medium, 3 low
**Finding classes:**

- L1: accepted-requirement (design.md Error Handling: unknown fences are reported by both the build and `docs check`).
- L2: accepted-requirement (discovery and design: figures hide no content in server HTML).
- L3: bookkeeping (plan p03-t03 Step 3 asks for the commands to be recorded in implementation.md).

- **L1 (Low):** `docs check` misses a `docs-*` fence nested in a figure body, which the build rejects. Converted to p03-t05 as artifact alignment. design.md is narrowed to the shipped checker scope rather than a nested-body scan being added: the build already fails loudly, and discovery defers grammar checking.
- **L2 (Low):** the replay's no-hidden-content assertion misses class-based hiding at the ends of a class list. Converted to p03-t06.
- **L3 (Low):** the fresh-scaffold record gives outcomes but not the exact commands. Fixed in root bookkeeping from the implementer's verbatim commands; no plan task.

**Outcome:** fixes pending. These are Low findings, so there is no re-review.

---

## Phase 4: Guidance, instructions and release

**Status:** pending
**Started:** -

### Task p04-t01: Document the figures in the scaffold contributing pages and app AGENTS guidance

**Status:** pending
**Commit:** -

### Task p04-t02: Update the oat-docs-bootstrap and oat-docs-analyze skills

**Status:** pending
**Commit:** -

### Task p04-t03: Update OAT docs, package instructions, READMEs and NOTICES

**Status:** pending
**Commit:** -

### Task p04-t04: Lockstep version bump and full Definition of Done gates

**Status:** pending
**Commit:** -

---

## Orchestration Runs

<!-- One line per dispatch request id, rendered by `oat project dispatch record --format line` and written as a list item. Update that line in place with the terminal outcome; never paste the record or event JSON. -->

<!-- orchestration-runs-start -->

- run/v1 · request=mdxcn-p01-implementation-20261121 · scope=p01 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-medium · model=claude-opus-5-5 · effort=medium · stamp=Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:medium dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-medium · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=mdxcn-p01-review-r1-20261121 · scope=p01 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=mdxcn-p02-implementation-20261121 · scope=p02 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p02 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=mdxcn-p02-review-r1-20261121 · scope=p02 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=mdxcn-p03-implementation-20261121 · scope=p03 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p03 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~

<!-- orchestration-runs-end -->

Parallel group `[p01, p02]` was forked at `4540a8485bb709ad403f4d0e0ab9732e45c678e8` into worktrees bootstrapped with `oat-worktree-bootstrap-auto`, using `pnpm run worktree:init` with no provider-sync changes. The branches were merged with `--no-ff` in plan order:

- p01: `849272f8f`;
- p02: `90cf42c53`.

Neither merge had a conflict. Integration verification passed for all three packages.

The implementer handles continued through the same handle for the p02 recovery and for both review-fix rounds.

## Reviews and Gates

<!-- Receipts for final and multi-phase reviews (a phase review receipt may stay in its phase) and one terminal line per gate run. state.md owns gate transitions; this slot keeps the outcome, waivers and operator choices. -->

- Plan quick-start gate: attempt 1 was blocked with 1 High and 1 Medium, which were resolved in artifacts (`08d0588d8`). Attempt 2 passed with 0 findings at `08d0588d8`. The phase review gate is disabled (operator choice).

## Deferred Findings

<!-- One line per approved deferral (finding, rationale, approval, follow-up trigger), plus excluded parallel phases and unmerged worktrees. -->

- **p01-t05 concern (Low):** awaiting the operator. Tab content reports column 1 instead of the authored column; lines are correct. This behaviour predates the change, and design requires lines only. A fix would add the tab indentation to the origin column in `remark-tabs.ts`.

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review                    | Source Artifact         | Planned / Documented                                                                                           | Actual / Accepted                                                                                                                                                                                                                                                                                                             | Reason                                                                                                                                           | Source of Truth | Follow-up                                                                                    |
| -------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- | -------------------------------------------------------------------------------------------- |
| p02-t02, p02-t03 / p02 review M1 | design.md grammar table | Steps "bold title", decision without an open state, compare option columns, and no annotate/terminal fallbacks | Upstream-faithful grammar: bold is the current step and italic the next; plain options are open; the first column of compare holds row labels; annotate titles fall back to `code`; a `✓` terminal line is a pass                                                                                                             | Matches upstream mdxcn and fixes the compare column shift                                                                                        | Implementation  | design.md aligned in p02-t05 (`8c3eeecdd`); p04-t01 takes its grammar from the aligned table |
| p02-t03                          | plan p02-t01 patch list | Patches listed in the plan                                                                                     | Further patches: steps reads its state from the title only, and every body block is kept; check finds a checkbox inside a loose item; compare keeps a bold or `Total` last row; dimming uses the `opacity-40` class; `a` is added as a host tag; JSX item forms and the `palette`, `corner` and `className` props are dropped | Static server rendering and Markdown-only authoring                                                                                              | Implementation  | Recorded in each vendored file header                                                        |
| p01-t02                          | plan p01-t02 exports    | `remarkDocsFences`, `DOCS_FENCES`                                                                              | Also exports the `DocsFenceBody` type                                                                                                                                                                                                                                                                                         | Additive type for consumers                                                                                                                      | Implementation  | p04-t03 README export list                                                                   |
| p03-t01                          | plan p03-t01 files      | `compiled-fixtures.test.ts` under `src/figures/`; the CLI public-package contract test was not listed          | The replay test is at `packages/docs-theme/src/compiled-fixtures.test.ts`; `public-package-contract.test.ts` was updated for p02's `figures.css` export                                                                                                                                                                       | Avoids parent-relative imports (docs-theme has no aliases); the contract test was already failing after p02-t01 and the task requires it to pass | Implementation  | None                                                                                         |
| p01-t04 / p01 review M1          | design Error Handling   | Unknown fence fails                                                                                            | A nested `docs-*` fence also fails (`nested-docs-fence`)                                                                                                                                                                                                                                                                      | Unknown nested fences passed silently; failing keeps frames from nesting                                                                         | Implementation  | p04 guidance states that fences cannot nest                                                  |

## Final Summary (for PR/docs)

Filled at completion.

## References

- Plan: `plan.md`
- Design: `design.md`
- Discovery: `discovery.md`
