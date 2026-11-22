---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-11-22
oat_current_task_id: null
oat_generated: false
---

# Implementation: mdxcn

**Started:** 2026-11-21
**Last Updated:** 2026-11-21

This journal resumes interrupted implementation sessions. Every plan task has one block in its phase; `oat project journal check` validates it.

## Progress Overview

| Phase   | Status   | Tasks | Completed |
| ------- | -------- | ----- | --------- |
| Phase 1 | complete | 5     | 5/5       |
| Phase 2 | complete | 6     | 6/6       |
| Phase 3 | complete | 6     | 6/6       |
| Phase 4 | complete | 10    | 10/10     |

**Total:** 27/27 tasks completed

---

## Phase 1: Fence transform (docs-transforms, docs-config)

**Status:** complete
**Started:** 2026-11-21

### Phase Summary

**Outcome (what changed):**

- `docs-*` fenced code blocks now become figure components at build time. Fence meta becomes props, the body is reparsed as GFM Markdown (raw for `docs-terminal`), and the authored line numbers are kept.
- An unknown `docs-*` name fails the build, listing the eight known names. A `docs-*` fence nested inside a figure body also fails, so figure frames never nest.
- The shared docs-config chain runs `remarkTabs → remarkDocsFences → remarkLinks → remarkAlert → remarkMermaid`, so figures work inside tabs and links inside figures are normalized. docs-transforms' `defaultTransforms` is the same list without `remarkAlert`.

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

- The docs-config chain is `remarkTabs → remarkDocsFences → remarkLinks → remarkAlert → remarkMermaid`. A composed figure inside a tab next to an alert renders.

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

**Status:** complete
**Started:** 2026-11-21

### Phase Summary

**Outcome (what changed):**

- A contract test pins the fence names to the docs-theme components. A replay of a real, captured Fumadocs compile checks every figure's parsed state and that server HTML hides nothing.
- `oat docs check` reports unknown top-level and tab-nested `docs-*` fences for Fumadocs apps.
- The Fumadocs scaffold wires `withDocsFigures` and `figures.css`; a fresh app built from packed tarballs works with no manual steps.
- The OAT docs app uses the packaged figures on the ideas lifecycle page and `tool-packs.md`. The spike is gone.

**Key files touched:**

- `packages/docs-theme/src/compiled-fixtures.test.ts`, `src/figures/fence-contract.test.ts` and `src/figures/__fixtures__/`: the contract test and the replay.
- `packages/cli/src/commands/docs/check/docs-fences.ts`: the checker rule.
- `.oat/templates/docs-app-fuma/app/`: the scaffold wiring.
- `apps/oat-docs/`: adoption.

**Verification:**

- At `740ef27c0`: `pnpm check`, `pnpm type-check`, forced `pnpm test:evidence`, `pnpm build:docs`, the index freshness check and `docs:check` passed.
- The visual check passed in light and dark mode at 1440px and 390px.
- The review fixes were verified per task.

**Notes / Decisions:**

- Sequential phase in the root checkout. The implementer stopped at the IMPLEMENT-20 visual-proof boundary, and the root ran the visual check.
- The root review passed with 0 Critical, 0 High and 3 Low findings. Two Lows became p03-t05 and p03-t06, now done, and L3 was fixed in bookkeeping.

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

**Fresh-scaffold commands** (added for p03 review L3): these are as the implementer ran them. `$REPO` is the worktree root; `$T` is `mktemp -d /tmp/p03-scaffold.XXXXXX`, which was removed afterwards.

````bash
pnpm build
for p in cli control-plane docs-config docs-theme docs-transforms; do (cd packages/$p && pnpm pack --pack-destination $T/tarballs); done
cd $T/repo && git init -q . && node $REPO/packages/cli/dist/index.js docs init --framework fumadocs --yes --target-dir site --app-name fresh-docs --site-name "Fresh Docs" --description "A fresh scaffold that exercises docs figure fences." --cwd $T/repo
# in $T/repo/site: package.json dependencies @open-agent-toolkit/docs-{config,theme,transforms} and devDependency @open-agent-toolkit/cli
# set to file:$T/tarballs/open-agent-toolkit-<name>-0.3.50.tgz; the same five file: specifiers appended
# (cli, control-plane, docs-config, docs-theme, docs-transforms) under the scaffold's pnpm-workspace.yaml overrides block
# add docs/project-layout.md with a docs-tree fence and list it in docs/index.md Contents
pnpm install --no-frozen-lockfile
pnpm exec oat docs nav sync --target-dir .
sed -i '' 's/```docs-tree title/```docs-nope title/' docs/project-layout.md && pnpm docs:check   # exit 1, reports [docs-fences]
# restore the page, then: pnpm docs:check   # exit 0
pnpm build   # exit 0
H=out/project-layout/index.html; grep -o '\[ PROJECT LEVEL \]' $H; grep -o 'data-frame="box"' $H; grep -c 'opacity:0' $H   # last is 0
cat out/_next/static/chunks/*.css | grep -o -F -e '.graph-frame' -e '.text-graph-accent' -e '--graph-accent:'
````

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

**Status:** completed
**Commit:** 4612758bde8de9995220411c9597edd7fb5ad9e0

**Outcome:**

- design.md's Checker rule and Error Handling now say the checker validates top-level and tab-nested fence names. A `docs-*` fence nested in a figure body fails the build only.

**Files changed:**

- `.oat/projects/shared/mdxcn/design.md`

**Verification:** `oxfmt` and `--check` passed. The wording matches `docs-fences.ts`, `markdown.ts:91` and the rule IDs in `remark-docs-fences.ts`.

### Task p03-t06: (review) Catch class-based hiding in the no-hidden-content replay assertion

**Status:** completed
**Commit:** 1023c377591578268c3949d0961f33eede64661c

**Outcome:**

- A new replay assertion splits every figure `class` attribute into tokens and rejects `hidden`, `invisible` and `opacity-0`.
- It also asserts that the legal look-alikes (`overflow-y-hidden`, `aria-hidden="true"`) are present, so the check never passes vacuously.

**Files changed:**

- `packages/docs-theme/src/compiled-fixtures.test.ts`

**Verification:** build passed, the docs-theme suite passed (153) and check passed.

**Notes / Decisions:**

- **Can-fail control:** a leading `hidden` class on the frame root failed only the new test, once per figure. The old attribute test still passed, which was the gap the review reported. The replay passed 12/12 after the file was restored.

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

**Outcome:** fixes completed: L1 in `4612758bd`, L2 in `1023c3775`, and L3 in this bookkeeping commit. These were Low findings, so there was no re-review. Phase accepted.

---

## Phase 4: Guidance, instructions and release

**Status:** complete
**Started:** 2026-11-22

### Phase Summary

**Outcome (what changed):**

- **Contributing guidance:** the Fumadocs scaffold and OAT contributing pages document every figure fence, with Syntax/Rendered examples and grammar. They also state the agent-readability, plain-text and no-nesting rules and the checker scope. The MkDocs page says the fences render as plain code.
- **Skills:** `oat-docs-bootstrap` covers figures. `oat-docs-analyze` repairs legacy scaffolds that miss the wrapper, the `figures.css` import or the docs-theme `@source`.
- **Instructions and release files:** the package READMEs and `AGENTS.md` files, the OAT docs pages and `NOTICES.md` (mdxcn MIT) are updated. The release contract pins the packed `figures.css` and the notice.
- **Versions:** all five public packages moved in lockstep to 0.3.54.

**Key files touched:**

- `.oat/templates/docs-app-fuma/docs/contributing.md`
- `apps/oat-docs/docs/contributing/markdown-features.md`
- `.agents/skills/oat-docs-{bootstrap,analyze}/`
- `NOTICES.md`
- `packages/cli/src/release/public-package-contract.ts`

**Verification:**

- All nine Definition of Done gates exit 0 at `d4fe17878`. The fix-round gates exit 0 at `b1e2ea5c7`.
- The forced `test:evidence` hit load-induced timeouts in suites the branch does not touch; root reruns pass (see p04-t04).

**Notes / Decisions:**

- `origin/main` was merged at the phase start (`5f6b7f24f`).
- One recovery: mdxcn-p04-rec-001.
- The root review passed with 0 Critical, 0 High, 1 Medium and 3 Low. All are fixed, and no re-review was needed.

### Task p04-t01: Document the figures in the scaffold contributing pages and app AGENTS guidance

**Status:** completed
**Commit:** a8a0049e2

**Outcome:**

- The Fumadocs scaffold contributing page has a Syntax/Rendered example and grammar for every fence, plus the agent-readability, plain-text and no-nesting rules.
- The MkDocs page says `docs-*` fences render as plain code.
- The scaffold app `AGENTS.md` says when to use a figure.

**Files changed:**

- `.oat/templates/docs-app-fuma/docs/contributing.md`
- `.oat/templates/docs-app-mkdocs/docs/contributing.md`
- `.oat/templates/docs-app-fuma/AGENTS.md`
- `packages/cli/src/commands/docs/init/integration.test.ts`

**Verification:** the `docs/init` suite and `src/validation` passed (571), and lint and the format check passed.

**Notes / Decisions:**

- **Can-fail control:** breaking the Rendered `docs-check` example failed the new every-fence assertion, naming `docs-check`.

### Task p04-t02: Update the oat-docs-bootstrap and oat-docs-analyze skills

**Status:** completed
**Commit:** 337badb85

**Outcome:**

- The bootstrap walkthrough and verification cover figures.
- Analyze has a legacy-scaffold check for a missing `withDocsFigures` wrapper or `figures.css` import.
- Skill versions: `oat-docs-bootstrap` 1.4.5 → 1.4.6, `oat-docs-analyze` 1.9.1 → 1.9.2.

**Files changed:**

- `.agents/skills/oat-docs-bootstrap/SKILL.md`
- `.agents/skills/oat-docs-analyze/SKILL.md`
- `.agents/skills/oat-docs-analyze/references/legacy-scaffold-checks.md`

**Verification:** the skill contract tests passed (1272). `oat:validate-skills`, `pnpm lint`, `pnpm format` and `check:skill-bumps` passed.

### Task p04-t03: Update OAT docs, package instructions, READMEs and NOTICES

**Status:** completed
**Commit:** e5f525af6

**Outcome:**

- The OAT Markdown Features page has a figure section with every fence; `documentation.md`, `check.md` and `file-locations.md` are updated.
- The package `AGENTS.md` files and READMEs are updated, and `NOTICES.md` has the mdxcn MIT entry.
- The release contract now requires the packed `figures.css` and the mdxcn notice in the packed `dist/figures/graph-frame.js`. Each vendored module is covered by `license-notice.test.ts`.

**Files changed:**

- `apps/oat-docs/docs/contributing/markdown-features.md`
- `apps/oat-docs/docs/contributing/documentation.md`
- `apps/oat-docs/docs/docs-tooling/check.md`
- `apps/oat-docs/docs/reference/file-locations.md`
- `apps/oat-docs/AGENTS.md`
- `apps/oat-docs/index.md` (generated)
- `packages/docs-theme/AGENTS.md`
- `packages/docs-theme/README.md`
- `packages/docs-transforms/AGENTS.md`
- `packages/docs-transforms/README.md`
- `packages/cli/src/release/public-package-contract.ts`
- `packages/cli/src/release/public-package-contract.test.ts`
- `NOTICES.md`

**Verification:**

- Build and the release contract passed (30). `build:docs` ran fresh, and `docs:check` reports 0 errors and 776 warnings (unchanged).
- **Release-contract negative control** against the real built `graph-frame.js`: the old contract accepted a missing module, a stripped copyright line and a pack without `figures.css`. The new contract rejects all three, and the valid control passes.
- **Visual check** (implementer, Playwright with system Chrome against the static export): all eight figures were checked in light and dark mode at 1440px and 390px.
  - Nothing is hidden and the page doesn't overflow. Compare and annotate scroll inside their frames.
  - The console is clean.

**Notes / Decisions:**

- **Plain-text guidance:** it covers every plain-text surface in the component source: tree rows, check items, decision options, compare cells, tight step bodies, notes and timeline labels. Markdown survives only in loose step and timeline bodies, decision follow-up paragraphs and annotate notes.
- **NOTICES:** the copyright and upstream commit `884eba5` were checked against the upstream LICENSE.

### Task p04-t04: Lockstep version bump and full Definition of Done gates

**Status:** completed
**Commit:** 342ae29a0

**Outcome:**

- All five public packages were bumped 0.3.53 → 0.3.54, and `public-package-versions.json` was regenerated.

**Files changed:**

- `packages/{cli,control-plane,docs-config,docs-theme,docs-transforms}/package.json`
- `packages/cli/assets/public-package-versions.json`

**Verification:** the Definition of Done gates at the final head `d4fe17878`:

1. `pnpm check`: 0 (cache replay; the identical tree ran fresh just before).
2. `pnpm type-check`: 0.
3. `pnpm test`: 0 (cli 450 files; smoke 165, skills 754, scripts 7).
4. `pnpm build`: 0 (cache replay).
5. `check:skill-bumps`: 0.
6. `release:check-versions`: 0, against `origin/main` `a5c28dca2` at 0.3.53.
7. `release:validate`: 0 (all five 0.3.54 tarballs).
8. `build:docs`: 0.
9. Index freshness: 0.

**Notes / Decisions:**

- **Forced `pnpm test:evidence` exited 1** on two timeouts in `configured-gate.integration.test.ts`, at a machine load average of 38–80 from unrelated workloads.
  - The implementer's isolated rerun passed 3/3.
  - The root reran `configured-gate.integration.test.ts` and `docs/literals` at `d4fe17878`, at load ~20: 17/17 passed.
  - The branch touches neither suite.
- **Node:** the gates ran on Node v26.11.1, while `.nvmrc` pins 22.23.4. CI runs the pinned version.
- **`.oat/sync/manifest.json`** still records `oatVersion: 0.3.53`. A branch-CLI sync reports no changes and no gate checks the field. It was left to sync tooling.

### Recovery Event mdxcn-p04-rec-001

- **Phase:** p04 (originating task p04-t03); **request:** mdxcn-p04-implementation-20261122; **attempt:** 1 of 10; **authorization:** phase-standing.
- **Discovered by:** Definition of Done gate 9 (index regeneration, then `git diff --exit-code`).
- **Defect (composition):** the Markdown Features description contained `docs-*`. The commit hook's `oxfmt` escaped it to `docs-\*`, so every regeneration differed from the committed index.
- **Original commit:** `e5f525af6b99ffd382cebff91c445a99310a7766` (unchanged).
- **Recovery commit:** `d4fe17878db97880c7248df0b1f28d4ede32d1f2`. It rewords the description to "figure fences" and regenerates the index.
- **Disposition:** recovered. Gate 9 passes on the committed head.
- **Root validation:** the original commit is unchanged, the recovery is in scope (p04-t03 files plus the recovery reservation in `state.md`), and the committed `completed` marker matches. The marker is cleared here, and `used_attempts: 1` is kept.

### Task p04-t05: (review) Add the missing docs-theme `@source` to the legacy-scaffold figure repair

**Status:** completed
**Commit:** d2b88a40418091a9c11ee7e17998acf9651028a9

**Outcome:**

- The legacy-scaffold figure check also detects a missing docs-theme `dist` `@source`. The repair adds it, with the path adjusted to the app's `node_modules`, and keeps it when it is present.
- design.md notes that scaffolds have carried the line since 0.3.15 (#350, `be168345e`).

**Files changed:**

- `.agents/skills/oat-docs-analyze/references/legacy-scaffold-checks.md`
- `.oat/projects/shared/mdxcn/design.md`

**Verification:** the skill contract tests passed (1272), `oat:validate-skills` passed (68 skills), `pnpm lint` and `pnpm format` passed, and `check:skill-bumps` passed after the commit. `oat-docs-analyze` stays at 1.9.2, because the bump is PR-scoped.

### Task p04-t06: (review) Correct the checker-scope wording and the `docs check` summaries

**Status:** completed
**Commit:** b1e2ea5c7b219d8982def981677b7834ae0fc72f

**Outcome:**

- Both contributing pages say `docs:check` checks fence names everywhere except inside a figure body.
- The `oat docs check` summaries in the CLI README and `cli-reference.md` list unknown `docs-*` figure fence names.
- A root follow-up, `c15736648`, adds the same to the `docs-tooling/workflows.md` summary, which the implementer flagged as out of fix scope.

**Files changed:**

- `.oat/templates/docs-app-fuma/docs/contributing.md`
- `apps/oat-docs/docs/contributing/markdown-features.md`
- `apps/oat-docs/docs/reference/cli-reference.md`
- `packages/cli/README.md`
- `apps/oat-docs/docs/docs-tooling/workflows.md` (root follow-up `c15736648`)

**Verification:** the `docs/init` and `src/validation` suites passed (571) and `pnpm --filter oat-docs check` passed. The index was unchanged, including after the root follow-up.

**Fix-round gates** at `b1e2ea5c7`, clean tree; all exited 0:

- `pnpm check` (fresh)
- `check:skill-bumps`
- `release:check-versions` (`origin/main` `a5c28dca2` at 0.3.53)
- `release:validate`
- `build:docs` (oat-docs fresh)
- gate 9
- the CLI tests for `docs/init`, `src/validation` and `init/tools/shared` (1422)

### Review Received: p04

**Review:** `reviews/archived/code-p04-review-2026-11-22T013926Z.md` (local only), reviewed head `dcc24fc8ff0387b2dbf44339b5b87fa46964a1f6`, invocation `auto`, request `mdxcn-p04-review-r1-20261122`
**Findings:** 0 critical, 0 high, 1 medium, 3 low
**Finding classes:**

- M1: accepted-requirement (design.md: `oat-docs-analyze` gets a legacy-scaffold check for a missing wrapper or CSS import, and figures must render styled).
- L1: accepted-requirement (design.md Checker rule, aligned in p03-t05; the guidance must state it accurately).
- L2: accepted-requirement (root AGENTS.md Definition of Done: the affected package README and docs pages describe changed behavior).
- L3: bookkeeping (implementation.md p04 wording).

- **M1 (Medium):** the legacy-scaffold figure repair assumes a docs-theme `@source` that pre-0.3.15 scaffolds lack, so their figures would render unstyled. Converted to p04-t05.
- **L1 (Low):** "top level and inside tabs only" understates the checker, which checks everything except figure bodies. Converted to p04-t06.
- **L2 (Low):** the CLI README and `cli-reference.md` `docs check` summaries omit `docs-fences`. Folded into p04-t06.
- **L3 (Low):** the ledger overstated the release contract's notice coverage and the recovery's file scope. Fixed at receive in this bookkeeping commit.

**Outcome:** fixes completed: M1 in `d2b88a404`; L1 and L2 in `b1e2ea5c7`, plus the root follow-up `c15736648`; L3 at receive. These were Medium and Low findings, so there was no re-review. Phase accepted.

### Task p04-t07: (final review) Name figure fences in the contributing Contents map and the docs-config README

**Status:** completed
**Commit:** 6336744053c15a13786d157cce0f5d1b0f27779e

**Outcome:**

- The contributing Contents entry names figure fences.
- The docs-config README says `createSourceConfig().remarkPlugins` transforms `docs-*` fences, which need `withDocsFigures` and `figures.css` from docs-theme. It links to the docs-theme README's figure section.

**Files changed:**

- `apps/oat-docs/docs/contributing/index.md`
- `packages/docs-config/README.md`

**Verification:** `pnpm --filter oat-docs check` and the docs-config check passed. The docs index is unchanged.

### Task p04-t08: (operator decision) Report authored columns for tab content

**Status:** completed
**Commit:** e4fc7a2bbb9f3a3b27006cd5c188fe2108dbe08e

**Outcome:**

- Tab content is relocated from the code block start plus `INDENTED_CODE_WIDTH` (4), so it reports authored columns. Nested tabs compose.
- A tab-nested unknown figure fence's error now reports its authored column.

**Files changed:**

- `packages/docs-transforms/src/remark-tabs.ts`
- `packages/docs-transforms/src/remark-tabs.test.ts`

**Verification:**

- The tests failed first (RED), with column 1 on the right line. After the fix, the suites passed: docs-transforms 68, docs-config 24, docs-theme 153 (the captured replay needed no recapture) and CLI `src/commands/docs` 460.
- Fix-round gates at `e4fc7a2bb`, all exit 0:
  - `pnpm check` (fresh)
  - `pnpm type-check`
  - `pnpm build`
  - `check:skill-bumps`
  - `release:check-versions` (`origin/main` `a5c28dca2` at 0.3.53)
  - `release:validate`
  - `build:docs`
  - gate 9
  - `test:smoke` (165)

**Notes / Decisions:**

- **Can-fail control:** removing the `+ 4` failed both column tests (expected 9, got 1). The file was restored.

### Task p04-t09: (final review r2) Compute tab-content columns from the authored indentation

**Status:** completed
**Commit:** b668002c2dbfb01b68c19cc2e4a26bf0953ede9d

**Outcome:**

- `reparseMarkdown`'s origin gains an optional per-line `lineColumns`. `remark-tabs` computes each content line's authored column from the characters its indented-code prefix consumed, with a tab advancing to the next stop.
- Space, tab, mixed and nested-tab indentation all report authored columns.
- `INDENTED_CODE_WIDTH` is now the tab-stop width and the fallback when there is no source text. The `remark-docs-fences` caller is unchanged.

**Files changed:**

- `packages/docs-transforms/src/remark-tabs.ts`
- `packages/docs-transforms/src/remark-tabs.test.ts`
- `packages/docs-transforms/src/reparse.ts`
- `packages/docs-transforms/src/reparse.test.ts`

**Verification:**

- The tests failed first (RED): the tab case got 5 instead of 2, with the line correct. Then the suites passed: docs-transforms 71, docs-config 24, docs-theme 153 (no recapture needed) and CLI `src/commands/docs` 460.
- Gates at `b668002c2`, all exit 0:
  - `pnpm check` (fresh)
  - `pnpm type-check`
  - `pnpm build`
  - both release gates
  - `build:docs`
  - gate 9
  - `test:smoke` (165)

**Notes / Decisions:**

- **Can-fail control:** dropping `lineColumns` (the fixed `+4` path) failed both new tests (got 5, expected 2). Built-output probes match the authored columns: tab 3:2, mixed 3:4, nested 5:3, and a per-line block 3:5 / 5:2.

### Task p04-t10: (final review r3) Measure tab-content indentation from the code block start

**Status:** completed
**Commit:** eda765135cd4d95af6728afaed87bac3f72cf129

**Outcome:**

- `lineColumnsOf` measures each line's indented-code prefix from the code block's start column, so blockquoted tab content reports its authored column (3:7, previously 3:3).
- The `prefixLength` comment states the deferred limitation: a tab character split across a container prefix is not modeled.

**Files changed:**

- `packages/docs-transforms/src/remark-tabs.ts`
- `packages/docs-transforms/src/remark-tabs.test.ts`

**Verification:**

- RED: the new blockquote assertion failed first (column 3, expected 7).
- After the fix:
  - docs-transforms: 72 passed
  - docs-config: 24 passed
  - docs-theme: 153 passed
  - docs-transforms check: clean
  - CLI `src/commands/docs`: 460 passed on one rerun. The first run hit 4 `literals.test.ts` timeouts at load average ~103 (environment-limited, as in earlier rounds). The rerun made no edits.
- The root reran `remark-tabs.test.ts`: 12 passed.

**Notes / Decisions:**

- **Can-fail control:** removing `.slice(start.column - 1)` fails only the new assertion (got 3:3, expected 3:7). The restored file is byte-identical. No existing expectation changed.

---

## Orchestration Runs

<!-- One line per dispatch request id, rendered by `oat project dispatch record --format line` and written as a list item. Update that line in place with the terminal outcome; never paste the record or event JSON. -->

<!-- orchestration-runs-start -->

- run/v1 · request=mdxcn-p01-implementation-20261121 · scope=p01 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-medium · model=claude-opus-5-5 · effort=medium · stamp=Dispatch: scope=p01 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:medium dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-medium · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=mdxcn-p01-review-r1-20261121 · scope=p01 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p01 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=mdxcn-p02-implementation-20261121 · scope=p02 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p02 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=mdxcn-p02-review-r1-20261121 · scope=p02 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p02 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=mdxcn-p03-implementation-20261121 · scope=p03 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p03 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=mdxcn-p03-review-r1-20261121 · scope=p03 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p03 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=mdxcn-p04-implementation-20261122 · scope=p04 · action=implementation · role=oat-phase-implementer · target=oat-phase-implementer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p04 action=implementation role=implementer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-phase-implementer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=mdxcn-p04-review-r1-20261122 · scope=p04 · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=p04 action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=mdxcn-final-review-r1-20261122 · scope=final · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=final action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=mdxcn-final-review-r2-20261122 · scope=final · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=final action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=mdxcn-final-review-r3-20261122 · scope=final · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=final action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=mdxcn-final-complexity-20261122 · scope=final · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=final action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~
- run/v1 · request=mdxcn-final-review-r4-20261122 · scope=final · action=review · role=oat-reviewer · target=oat-reviewer-claude-claude-opus-5-5-high · model=claude-opus-5-5 · effort=high · stamp=Dispatch: scope=final action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:claude-opus-5-5 effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-claude-claude-opus-5-5-high · launch=accepted · outcome=completed · terminal=yes · class=completed · continuation=~ · observed=~ · match=~

<!-- orchestration-runs-end -->

Parallel group `[p01, p02]` was forked at `4540a8485bb709ad403f4d0e0ab9732e45c678e8` into worktrees bootstrapped with `oat-worktree-bootstrap-auto`, using `pnpm run worktree:init` with no provider-sync changes. The branches were merged with `--no-ff` in plan order:

- p01: `849272f8f`;
- p02: `90cf42c53`.

Neither merge had a conflict. Integration verification passed for all three packages.

The implementer handles continued through the same handle for the p02 recovery and for both review-fix rounds.

## Reviews and Gates

<!-- Receipts for final and multi-phase reviews (a phase review receipt may stay in its phase) and one terminal line per gate run. state.md owns gate transitions; this slot keeps the outcome, waivers and operator choices. -->

- Plan quick-start gate: attempt 1 was blocked with 1 High and 1 Medium, which were resolved in artifacts (`08d0588d8`). Attempt 2 passed with 0 findings at `08d0588d8`. The phase review gate is disabled (operator choice).
- Final review cap (2026-11-22): three final rounds (4L, 1L, 1L). Complexity review `reviews/archived/complexity-final-2026-11-22T024150Z.md` (local only): deletion-rule compliant, provisional. Operator choice: corrective revision (p04-t10), defer the split-tab container case, then one review narrowed to the delta.
- **Gate:** oat-project-implement exit gate · **Scope:** final · **Outcome:** ok, then passed (0C/0H/0M/0L, run `09abb358`, codex-6-sol-xhigh) · attempt 1 of 2, no waiver
- Final verification (Step 12) at `36a6f7789`, forced and uncached (0 cached): `pnpm lint`, `pnpm type-check`, `pnpm build` and `pnpm test` all exit 0. `pnpm test` ran 12 of 12 turbo tasks; the CLI ran 450 test files. Logs are in `.oat/repo/analysis/mdxcn/step12-044931/` (local only).
- Project recap: skipped by operator choice (`oat_project_recap` skip/interactive, 2026-11-22).
- Final PR: https://github.com/voxmedia/open-agent-toolkit/pull/428 (scope final, 2026-11-22). DoD gates before push: `pnpm check`, `check:skill-bumps`, `release:check-versions`, `release:validate`, `build:docs` and gate 9 all exit 0.

### Review Received: final

**Review:** `reviews/archived/code-final-review-2026-11-22T015824Z.md` (local only), reviewed head `2d992742e6de26415c3caa5ffc2356a3790e50dc`, invocation `auto`, request `mdxcn-final-review-r1-20261122`
**Findings:** 0 critical, 0 high, 0 medium, 4 low
**Finding classes:**

- L1: bookkeeping (the implementation.md Deviations table).
- L2: bookkeeping (the chain wording in implementation.md summaries).
- L3: accepted-requirement (discovery: every surface listing docs authoring capabilities is updated).
- L4: accepted-requirement (root AGENTS.md Definition of Done: the affected package README describes changed behavior).

- **L1 (Low):** the Deviations table lacked the p03-t05 and p04-t05 design deltas. Fixed at receive: two rows added.
- **L2 (Low):** three ledger summaries listed the docs-config chain without `remarkAlert`. Fixed at receive.
- **L3 (Low):** the contributing Contents map omitted figure fences. Converted to p04-t07.
- **L4 (Low):** the docs-config README did not mention the fence transform or its rendering requirements. Converted to p04-t07.
- **Operator decisions (2026-11-22):** convert all four Lows, and fix the deferred p01-t05 tab-column concern now, as p04-t08.

**Outcome:** fixes completed: L1 and L2 at receive; L3 and L4 in `633674405`; tab columns in `e4fc7a2bb`. A final re-review follows.

### Review Received: final (round 2)

**Review:** `reviews/archived/code-final-review-2026-11-22T021225Z.md` (local only), reviewed head `967e1572886de3468abd42ec338ab9641de189a6`, invocation `auto`, request `mdxcn-final-review-r2-20261122`
**Findings:** 0 critical, 0 high, 0 medium, 1 low
**Finding classes:**

- L1: accepted-requirement (the operator's p04-t08 decision: tab content reports authored columns).

- **Round 1:** all four findings were confirmed resolved.
- **L1 (Low):** tab-character indentation inside tab content still reports too large a column, because p04-t08 adds a fixed 4. It is not a regression (it previously reported column 1), and lines are correct.
- **Operator decision (2026-11-22):** compute the column from the source. Converted to p04-t09.

**Outcome:** fix completed in `b668002c2`. A third final review follows.

### Review Received: final (round 3)

**Review:** `reviews/archived/code-final-review-2026-11-22T023657Z.md` (local only), reviewed head `b0bd1399db4613654f2d9e19556f1994f77e7e9f`, invocation `auto`, request `mdxcn-final-review-r3-20261122`
**Findings:** 0 critical, 0 high, 0 medium, 1 low
**Finding classes:**

- L1: regression (p04-t09 broke blockquoted tab columns, which were correct at `967e15728`).
- L1 note (split tabs across container prefixes): new-hardening (no contract source names container columns; it predates p04-t08). Routed to the operator.

- **Round 2:** the finding was confirmed resolved outside blockquotes.
- **L1 (Low):** `lineColumnsOf` measures the prefix from the source line start, so blockquoted tab content reports columns 4 too small. Converted to p04-t10.
- **L1 note:** a tab character split across a list or blockquote prefix gives a wrong column, both before and after the fix. Deferred by the operator (see Deferred Findings).
- **Review cap:** the final review reached its three-cycle cap. A complexity review ran (`reviews/archived/complexity-final-2026-11-22T024150Z.md`, local only). Its verdict was deletion-rule compliant, provisional, with a recommended corrective revision. The operator chose that revision on 2026-11-22: fix the regression, defer the split-tab case, then one review narrowed to the delta.

**Outcome:** fix completed in `eda765135`. One final review narrowed to that delta follows.

### Review Received: final (round 4)

**Review:** `reviews/archived/code-final-review-2026-11-22T040047Z.md` (local only), reviewed head `68251269bacedb4f26db192ea2d3f5aba42cbaca`, invocation `auto`, request `mdxcn-final-review-r4-20261122`. Narrowed to the p04-t10 delta by the operator's cap decision.
**Findings:** 0 critical, 0 high, 0 medium, 2 low
**Finding classes:**

- L1: bookkeeping (the Final Summary omitted p04-t10 and said "Open: none" despite the deferral).
- L2: new-hardening (varying-width container prefixes; no contract source requires container columns; not a regression).

- **Round 3:** L1 confirmed resolved. RED and can-fail reproduced. A 21-case position probe shows no regression against `b0bd1399d`, and seven blockquote cases are correct again.
- **L1 (Low):** fixed at receive: the Final Summary credits p04-t10 and names the deferred limitation.
- **L2 (Low):** deferred by the operator (2026-11-22) and folded into the round-3 split-tab deferral.
- **Deferred Mediums:** none exist to resurface.

**Outcome:** passed. The operator dispositioned both Lows (fix L1 at receive, defer L2).

### Review Received: final (implementation exit gate)

**Review:** `reviews/archived/final-review-2026-11-22T044315Z.md` (local only), reviewed head `06da295d9707e77f739ce7ddf8bfef152dc59ca9`, invocation `gate`, gate run `09abb358-6c9e-43a6-aec1-8e504c94aab5`, target `codex-6-sol-xhigh` (gpt-6.1-sol, xhigh; different family from the Claude producer)
**Findings:** 0 critical, 0 high, 0 medium, 0 low
**Finding classes:** none (no findings).

- The full merge-base range `a5c28dca2..06da295d9` was reviewed. The reviewer ran 434 tests across the three docs packages and the CLI checker, init and release-contract suites.
- It also ran:
  - a live-compile control: byte-identical to the captured fixture;
  - fence boundary controls (old chain accepts, new chain rejects with the categorical rule IDs, and a valid figure is still accepted);
  - packed-output controls;
  - a deferred-column control.
- **Deferred Mediums:** none. The consolidated split-tab and varying-prefix Low deferral was rechecked and accepted as recorded.
- **Limits stated by the reviewer:** no rerun of the nine-gate sequence, browser visuals or a packed fresh-app build. It ran on local Node 26.11.1, while the repo pins 22.23.4.

**Outcome:** passed.

## Deferred Findings

<!-- One line per approved deferral (finding, rationale, approval, follow-up trigger), plus excluded parallel phases and unmerged worktrees. -->

- **p01-t05 concern (Low):** resolved by operator decision at the final review (2026-11-22): fix now, converted to p04-t08. It is no longer deferred.
- **Final review round 3, L1 note (Low, new-hardening):** a tab character split across a list-item or blockquote prefix gives tab content the wrong column; lines are correct. It predates p04-t08, no tracked page uses it, and only the `file.fail` place reads it. Deferred by the operator at the final-review cap (2026-11-22). Final review round 4 L2 adds a variant: a container prefix whose width varies by line (` >     beta` under `>`) is also not modeled (5:7 for 5:8; same as `967e15728`). The operator folded it into this deferral (2026-11-22). **Trigger:** a page with tabs inside a blockquote or list item that uses tab-character indentation; an author report of a misleading fence-error column; or a consumer that starts reading tab-content columns.

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review                                                      | Source Artifact                      | Planned / Documented                                                                                           | Actual / Accepted                                                                                                                                                                                                                                                                                                             | Reason                                                                                                                                           | Source of Truth | Follow-up                                                                                    |
| ------------------------------------------------------------------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- | -------------------------------------------------------------------------------------------- |
| p02-t02, p02-t03 / p02 review M1                                   | design.md grammar table              | Steps "bold title", decision without an open state, compare option columns, and no annotate/terminal fallbacks | Upstream-faithful grammar: bold is the current step and italic the next; plain options are open; the first column of compare holds row labels; annotate titles fall back to `code`; a `✓` terminal line is a pass                                                                                                             | Matches upstream mdxcn and fixes the compare column shift                                                                                        | Implementation  | design.md aligned in p02-t05 (`8c3eeecdd`); p04-t01 takes its grammar from the aligned table |
| p02-t03                                                            | plan p02-t01 patch list              | Patches listed in the plan                                                                                     | Further patches: steps reads its state from the title only, and every body block is kept; check finds a checkbox inside a loose item; compare keeps a bold or `Total` last row; dimming uses the `opacity-40` class; `a` is added as a host tag; JSX item forms and the `palette`, `corner` and `className` props are dropped | Static server rendering and Markdown-only authoring                                                                                              | Implementation  | Recorded in each vendored file header                                                        |
| p01-t02                                                            | plan p01-t02 exports                 | `remarkDocsFences`, `DOCS_FENCES`                                                                              | Also exports the `DocsFenceBody` type                                                                                                                                                                                                                                                                                         | Additive type for consumers                                                                                                                      | Implementation  | p04-t03 README export list                                                                   |
| p03-t01                                                            | plan p03-t01 files                   | `compiled-fixtures.test.ts` under `src/figures/`; the CLI public-package contract test was not listed          | The replay test is at `packages/docs-theme/src/compiled-fixtures.test.ts`; `public-package-contract.test.ts` was updated for p02's `figures.css` export                                                                                                                                                                       | Avoids parent-relative imports (docs-theme has no aliases); the contract test was already failing after p02-t01 and the task requires it to pass | Implementation  | None                                                                                         |
| p01-t04 / p01 review M1                                            | design Error Handling                | Unknown fence fails                                                                                            | A nested `docs-*` fence also fails (`nested-docs-fence`)                                                                                                                                                                                                                                                                      | Unknown nested fences passed silently; failing keeps frames from nesting                                                                         | Implementation  | p04 guidance states that fences cannot nest                                                  |
| p03-t05 / p03 review L1                                            | design Checker rule / Error Handling | Unknown fences fail both the build and `docs check`                                                            | The checker covers every fence except those inside a figure body; only the build catches a nested one                                                                                                                                                                                                                         | The checker's parse treats figure bodies as literal code; the build already fails loudly, and discovery defers grammar checking                  | Implementation  | design.md aligned in `4612758bd`; the guidance states the scope                              |
| p04-t05 / p04 review M1                                            | design Data Flow / upgrade path      | Apps already `@source` the docs-theme `dist`                                                                   | Scaffolds before 0.3.15 (#350) lack the line; the analyze legacy repair adds it                                                                                                                                                                                                                                               | Older apps would otherwise build with unstyled figures                                                                                           | Implementation  | design.md and `legacy-scaffold-checks.md` aligned in `d2b88a404`                             |
| p04-t08, p04-t09, p04-t10 / operator decisions at the final review | design.md positions (authored lines) | Reparsed content reports authored lines                                                                        | Tab content also reports authored columns, computed per line from the indented-code prefix measured from the block start; a tab split across a container prefix is a deferred limitation                                                                                                                                      | Operator chose to fix the p01-t05 concern and then to compute from source                                                                        | Implementation  | Recorded here and in Deferred Findings; design.md keeps the lines-only requirement           |

## Final Summary (for PR/docs)

**What shipped:**

- **`docs-*` figure fences:** eight fenced code block languages render as static, server-rendered figure components on Fumadocs docs apps. They are `docs-steps`, `docs-tree`, `docs-timeline`, `docs-terminal`, `docs-decision`, `docs-check`, `docs-compare` and `docs-annotate`, adapted from mdxcn under MIT.
  - The `remarkDocsFences` transform (docs-transforms) turns a fence into a component. Fence meta becomes props, the body is reparsed as Markdown (raw for terminal), and authored line positions are kept.
  - An unknown or nested `docs-*` fence fails the build.
  - The shared docs-config chain runs `remarkTabs → remarkDocsFences → remarkLinks → remarkAlert → remarkMermaid`.
- **docs-theme:** the eight components, `withDocsFigures(components)` and a `./figures.css` export with scoped `--graph-*` tokens. There is no motion, no React context, and no content hidden in the server HTML. Every vendored module carries the mdxcn MIT notice.
- **`oat docs check`:** a new `docs-fences` error rule reports unknown fence names on Fumadocs apps, everywhere except inside a figure body (the build catches those).
- **Scaffold:** new Fumadocs apps are wired for figures with no manual steps. The contributing page documents every fence with Syntax/Rendered examples, grammar, and the agent-readability, plain-text and no-nesting rules. MkDocs apps get a one-line note that the fences render as plain code.
- **Skills:**
  - `oat-docs-bootstrap` (1.4.6) covers figures.
  - `oat-docs-analyze` (1.9.2) repairs legacy scaffolds that miss the wrapper, the `figures.css` import or the docs-theme `@source`.
- **OAT docs:** the lifecycle page and `tool-packs.md` use figures. Markdown Features, `documentation.md`, `check.md`, `file-locations.md`, `cli-reference.md` and `workflows.md` are updated.
- **Tab positions:** content inside tabs now reports authored columns as well as lines, computed from each line's actual indentation, including tab characters, measured from the code block start so blockquoted tab content is correct. These were operator decisions at the final review (p04-t08, p04-t09, p04-t10).
- **Release:** `NOTICES.md` has the mdxcn entry, the release contract pins `figures.css` and the notice, and the five public packages moved to 0.3.54 in lockstep.

**Key files/modules:**

- `packages/docs-transforms/src/{remark-docs-fences.ts,reparse.ts}`
- `packages/docs-config/src/source-config.ts`
- `packages/docs-theme/src/figures/`
- `packages/docs-theme/figures.css`
- `packages/cli/src/commands/docs/check/docs-fences.ts`
- `.oat/templates/docs-app-fuma/`
- `.agents/skills/oat-docs-{bootstrap,analyze}/`
- `apps/oat-docs/`
- `NOTICES.md`

**Verification:**

- Per-phase suites with RED-first tests and recorded can-fail controls.
- A replay of a real captured Fumadocs compile, with its provenance header.
- A fresh-scaffold build from packed tarballs.
- Root visual checks in light and dark mode at 1440px and 390px.
- The nine Definition of Done gates pass at `d4fe17878`, and the fix-round gates pass at `b1e2ea5c7`.
- The forced `test:evidence` hit load-induced timeouts in untouched suites; root reruns passed (p04-t04).
- Final verification is recorded under Reviews and Gates.

**Design deltas:** see Deviations from Plan / Design. The main ones:

- The upstream-faithful figure grammar (p02-t05).
- Nested `docs-*` fences fail the build (p01-t04).
- The checker scope excludes figure bodies (p03-t05).
- Legacy scaffolds may lack the docs-theme `@source` (p04-t05).
- The replay test lives at `src/compiled-fixtures.test.ts`.

**Open:** one deferred limitation (see Deferred Findings). Tab content inside a list item or blockquote can report the wrong column when a tab character spans the container prefix, or when the prefix width varies by line; lines are correct. The p01-t05 tab-column concern is fixed in p04-t08 by operator decision.

## References

- Plan: `plan.md`
- Design: `design.md`
- Discovery: `discovery.md`
