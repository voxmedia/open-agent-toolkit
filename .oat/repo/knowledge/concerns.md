---
oat_generated: true
oat_generated_at: 2026-03-24
oat_source_head_sha: 539d8ac2b1ba2d2315bac69753ded87509967c6b
oat_source_main_merge_base_sha: 146eed87a123f0b31d60726a4acfd6d7c83d1478
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

# Codebase Concerns

**Analysis Date:** 2026-03-24

## Tech Debt

**Publish Metadata Gap:**

- Issue: All publishable-looking packages are still marked private and lack public-package metadata.
- Files: `package.json`, `packages/cli/package.json`, `packages/docs-config/package.json`, `packages/docs-theme/package.json`, `packages/docs-transforms/package.json`
- Impact: npm publication and consumer install flows are not yet production-ready.
- Fix approach: define public names/versioning policy, add publish metadata, and add release automation.

**Manual Asset Bundle Manifest:**

- Issue: `bundle-assets.sh` hard-codes the list of bundled skills, templates, agents, and scripts.
- Files: `packages/cli/scripts/bundle-assets.sh`
- Impact: new canonical assets can be omitted from the CLI bundle unless the script is updated in lockstep.
- Fix approach: generate the bundle manifest from a declarative source or validate bundle completeness automatically.

**Lockstep Version Assumption in Docs Scaffolding:**

- Issue: docs scaffolding assumes all OAT packages publish at the same version.
- Files: `packages/cli/src/commands/docs/init/scaffold.ts`
- Impact: independent package versioning would break generated consumer dependency declarations.
- Fix approach: either keep lockstep versions explicitly or introduce per-package version lookup logic.

## Known Bugs

**Knowledge Provenance Can Break Across Forks:**

- Symptoms: repo knowledge artifacts may record SHAs that are not present in the current clone.
- Files: `.oat/repo/knowledge/*.md`, `packages/cli/src/commands/state/generate.ts`
- Trigger: copying or forking a repo with generated knowledge from a different git history.
- Workaround: regenerate the knowledge base after cloning or forking.

**Workspace Bin Warning Before CLI Build:**

- Symptoms: a fresh `pnpm install` can warn that the `oat` binary cannot be linked for `apps/oat-docs` before `packages/cli/dist/index.js` exists.
- Files: `apps/oat-docs/package.json`, `packages/cli/package.json`
- Trigger: install in a clean checkout before building the CLI.
- Workaround: build `@voxmedia/oat-cli` after install or adjust workspace/bin expectations.

## Security Considerations

**Filesystem-Mutating CLI:**

- Risk: the CLI intentionally mutates project files, provider directories, and workflow artifacts.
- Files: `packages/cli/src/commands/**`, `packages/cli/src/engine/**`, `packages/cli/src/fs/**`
- Current mitigation: typed command flows, explicit scopes, tests, and dry-run modes in several commands.
- Recommendations: continue adding containment checks and dry-run coverage for destructive operations.

**Generated HTML in Mermaid Rendering:**

- Risk: Mermaid rendering uses `dangerouslySetInnerHTML`.
- Files: `packages/docs-theme/src/mermaid.tsx`
- Current mitigation: the component is intended for trusted docs content generated or reviewed in-repo.
- Recommendations: keep content trust boundaries explicit if the docs toolkit is published for third-party use.

## Performance Bottlenecks

**CLI Test and Build Surface Is Large:**

- Problem: `packages/cli` carries the majority of repository logic, tests, and bundled content.
- Files: `packages/cli/src/**`, `packages/cli/assets/**`
- Cause: one package owns both runtime logic and a large asset payload.
- Improvement path: keep package boundaries clean and consider validating or slimming published contents for public releases.

**Docs Build Requires Generated MDX Source and Indexing:**

- Problem: docs app build/dev includes `fumadocs-mdx` plus generated docs index work before Next runs.
- Files: `apps/oat-docs/package.json`
- Cause: static docs site generation depends on preprocessing steps.
- Improvement path: keep build hooks deterministic and ensure release workflows cache dependencies effectively.

## Fragile Areas

**Generated Asset Duplication:**

- Files: `apps/oat-docs/docs/**`, `packages/cli/assets/docs/**`, `packages/cli/assets/skills/**`
- Why fragile: the repository contains canonical docs/skills plus bundled copies under CLI assets.
- Safe modification: update canonical sources first, then rebuild or validate bundled assets.
- Test coverage: there are bundle-contract tests, but drift between source and bundle is still a maintenance hotspot.

**Publishing Surface Definition:**

- Files: root/package manifests, docs scaffolding code, GitHub workflows
- Why fragile: public naming and versioning choices affect internal workspace references, generated templates, and release automation together.
- Safe modification: change names/versioning in one coordinated pass with release and docs updates.
- Test coverage: current tests cover docs scaffolding behavior, but not end-to-end npm publishing.

## Scaling Limits

**Single Dominant CLI Package:**

- Current capacity: suitable for the current repo size and command set.
- Limit: additional responsibilities increase bundle size, command surface complexity, and publish risk.
- Scaling path: keep reusable libraries split out and avoid pulling docs-library concerns back into the CLI package.

## Dependencies at Risk

**Rapidly Moving Docs Toolchain:**

- Risk: Fumadocs, Next.js, React, and Mermaid can introduce breaking changes quickly.
- Impact: docs packages and generated docs apps may need coordinated updates.
- Migration plan: keep docs packages versioned and tested together; validate generated templates against dependency updates.

## Missing Critical Features

**No npm Release Workflow Yet:**

- Problem: the repo has CI and docs deployment, but no npm dry-run or publish pipeline.
- Blocks: public package distribution for the CLI and docs libraries.

**No Public Consumer Metadata Yet:**

- Problem: package manifests do not yet describe repository, bugs, homepage, files, or publish config.
- Blocks: clean npm package surfaces and polished consumer adoption.

## Test Coverage Gaps

**Public Packaging Surface:**

- What's not tested: npm pack contents, release automation, and installability of public package artifacts.
- Files: package manifests, workflows, bundle outputs
- Risk: packages may publish unnecessary files or omit required ones.
- Priority: High

**Cross-Package Publish Behavior:**

- What's not tested: lockstep versioning and renamed package consumption in generated docs apps.
- Files: `packages/cli/src/commands/docs/init/scaffold.ts`, package manifests
- Risk: docs app scaffolds or internal dependencies can break during public-package migration.
- Priority: High

---

_Concerns audit: 2026-03-24_
