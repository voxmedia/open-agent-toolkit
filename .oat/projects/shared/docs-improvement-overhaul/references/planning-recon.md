# Planning reconnaissance

Captured 2026-10-01 after the user requested continuation through lightweight design and plan readiness, with Fable reviewing throughout. Read-only native helpers supplied the reports below. They did not edit source, install dependencies, or execute tests. These are design inputs, not completed implementation or acceptance evidence.

## Route and deployment inventory

Source: `/root/route_inventory`, native Luna xhigh bounded inventory. There are 70 Markdown routes, including 11 indexes; no MDX routes were found.

| Source directory     | Pages including index |
| -------------------- | --------------------: |
| Docs root            |                     2 |
| CLI Utilities        |                     9 |
| Contributing         |                    11 |
| Docs Tooling         |                     4 |
| User Guide (`guide`) |                     2 |
| Provider Sync        |                     7 |
| Reference            |                     6 |
| Workflows root       |                     2 |
| Ideas                |                     2 |
| Projects             |                    21 |
| Skills               |                     4 |

- `packages/docs-config/src/next-config.ts:8` uses static export and trailing slashes. `apps/oat-docs/next.config.js:3` sets `/open-agent-toolkit` as basePath. GitHub Pages deploys `apps/oat-docs/out` through `.github/workflows/deploy-docs.yml:41`.
- The catch-all page statically generates discovered pages and calls `notFound()` for unknown slugs. No explicit alias/redirect mechanism was found in the app or Next config. Old-route preservation therefore needs a static-export-compatible design, not an assumed server redirect.
- `packages/docs-transforms/src/remark-links.ts:97` normalizes Markdown extensions, indexes, trailing slashes, fragments, and queries. Moving pages must update relative source links; preserving old URLs alone does not repair those links.
- `tools/docs/check-links.ts` supports `--url` and `--no-external`, checks page statuses, fragments, and resources, and exits nonzero on failures. Its default target is the deployed site; local acceptance must supply the local built-site URL. No CI invocation was found.
- Hosted docs references outside the docs app: 17 targets in five READMEs (root, CLI, docs-config, docs-theme, docs-transforms). A source-relative link also exists in `subagent-orchestration/references/provider-cursor.md:122`.
- Path consumers include the pre-existing stale topic map in `.agents/skills/oat-docs/SKILL.md:94`, current CLI Utilities citations in `oat-doctor/SKILL.md:199`, and older tree references in `docs-completed-projects-gap-review/SKILL.md:64`. Inventory these explicitly rather than assuming URL search covers all consumers.
- Bundling copies the docs tree into CLI assets via `packages/cli/scripts/bundle-inputs.mjs:149` and `bundle-assets.sh:105`. Regenerate bundled output; do not hand-edit it.

## Navigation mechanism constraints

Source: `/root/navigation_design_recon`, native GPT-6.1 Sol medium intelligent reconnaissance.

- `packages/cli/src/commands/docs/nav/sync.ts:70` is MkDocs-only: fixed `docs` directory and `mkdocs.yml`, without a framework selector, check-only mode, ownership marker, or cleanup contract.
- The Contents parser accepts cross-section paths inside the docs root. For a directory index it recursively expands that section; this behavior must not be reused unchanged for Fumadocs local ownership (`nav/contents.ts:72`, `:92`, `:185`).
- The parser's authored syntax is the first exact H2 Contents section with dash-bullet inline links. Indented bullets flatten. It is regex-based and may match fenced examples; it does not support a general Markdown navigation language. Missing or empty Contents throws (`nav/contents.ts:15`, `:26`, `:34`, `:44`).
- Resolution currently supports `.md`, drops fragments before filesystem resolution, and does not strip queries. Pure anchors and external URLs are unsupported by that resolver. Preserve existing MkDocs behavior when adding a separate Fumadocs projection.
- No current Fumadocs metadata files were found. The app loader uses route base `/`, separately from Next's deployment basePath.
- Metadata generation must precede `fumadocs-mdx` in current app and scaffold predev/prebuild scripts, so the first build consumes it (`apps/oat-docs/package.json:6`, `.oat/templates/docs-app-fuma/package.json.template:8`).

### Installed consumer evidence

Recon inspected installed `fumadocs-core` 16.10.2 and `fumadocs-mdx` 14.3.2. These are dependency-source observations, not a reproduced browser acceptance result.

- Native page/folder identifiers affect ownership. Cross-section identifiers can reparent nodes; cross-links should instead use routed link entries.
- Native leaf labels come from frontmatter. Folder labels can use metadata title. Literal `[Label](/route/#fragment)` entries retain authored label and URL but create synthetic nodes without the native page reference. Distinct authored-label behavior needs real-loader and breadcrumb/previous-next verification.
- Non-root indexes attach automatically as folder landings; root index must be explicitly included. Avoid duplicate child landing entries.
- Avoid `pagesIndex`: installed core and MDX metadata schemas differ on support. No such field is needed for the basic design.
- Custom slug loaders and non-root route bases are not covered by filename-to-route inference; bound support explicitly rather than implying universal Fumadocs compatibility.

Evidence pointers: installed core `dist/loader-DrgsG18J.js:380`, `:448`, `:487`, `:503`, `:518`, `:538`; core `dist/source/schema.js:10`; MDX `dist/config/index.js:8`.

## Candidate design boundaries

These are recon recommendations for root/Fable review, not approved API declarations:

- Extend the CLI nav domain with explicit `--framework fumadocs|mkdocs` and `--check`; preserve legacy MkDocs calls. Explicit framework selection in generated scripts avoids ambiguous autodetection.
- Separate ordered Contents parsing from Fumadocs local-folder projection: own leaf, own child index, own landing, cross-section link, and anchor link have distinct behavior.
- Decide label authority explicitly. Native identifiers alone cannot reproduce authored labels differing from page frontmatter.
- Build and validate the entire output/cleanup plan before writing. Refuse unmarked authored metadata; remove only positively owned generated metadata within the docs root. Check mode reports missing/different/stale output without writing.
- Keep navigation generation distinct from the agent inventory, compatibility routes, and the supported-skill catalog.

## Acceptance boundaries to carry into design

1. CLI/filesystem: authored order, deterministic repeat, no source mutation, non-writing drift check, conflict refusal, and safe owned-output cleanup.
2. Real Fumadocs consumer: labels, folder/page order, root and child landings once, cross-links without reparenting, and deployment basePath applied exactly once.
3. MkDocs regression: current fixtures and special YAML configuration retain behavior.
4. Scaffold/first-build boundary: generated metadata enters `.source` on the first build, not only a second run.
5. Static site: all baseline routes still resolve, source links and legacy fragments work, and compatibility pages do not pollute primary navigation/search.

Existing focused commands:

```bash
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/docs/nav/sync.test.ts
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/docs/init/scaffold.test.ts src/commands/docs/init/integration.test.ts
pnpm --filter @open-agent-toolkit/docs-transforms test
pnpm --filter @open-agent-toolkit/docs-config test
pnpm build:docs
pnpm release:validate
```

Implementation must pair tests with credible failure modes and independent oracles under `deliberate-testing`; these commands were identified, not executed during reconnaissance.
