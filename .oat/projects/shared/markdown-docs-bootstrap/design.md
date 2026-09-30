---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-30
oat_generated: false
oat_template: false
---

# Design: Markdown Docs Bootstrap

## Design Review Status

Full lightweight draft, as requested by the user. The user replaced section-by-section confirmation with full drafting and an independent Consensus Review using Opus 5.5 at High effort. This draft awaits that review and user acceptance; it is not implementation approval. No `spec.md` is required for this quick project.

## Overview

Add `markdown` to the existing docs initialization and bootstrap workflow. Markdown has an authored content directory rather than a docs application: the default root is `docs`, its root `index.md` is the human and agent context entrypoint, and `documentation.tooling` is `markdown`. Fresh setup supplies useful index/context and contributing guidance, records config, and updates the repository's managed Documentation guidance. It creates no app package, framework config, site dependencies, or build commands.

Existing documentation is adopted through an explicit, additive path. Bootstrap establishes config and guidance while preserving authored content; content and navigation repairs are proposed through the existing analyze/apply workflow. The same applicable OAT index, navigation, metadata, context, and authoring contracts hold for Markdown. Generated manifests remain optional, separate artifacts and never replace an authored index. Fumadocs/MkDocs behavior and existing generic docs fallback remain supported.

Package-version drift, dependency upgrades, tooling approval classes, and changes to other repositories are outside this project. It implements only the Markdown portion of the source backlog item, which must remain open for its other acceptance criteria.

## Architecture

### Existing Boundaries and Reuse

- CLI `docs init` owns option resolution, scaffolding, documentation config persistence, managed root guidance, and terminal/JSON results.
- Bootstrap skill owns user discovery, existing-docs routing, contextual guidance, and verification. It delegates content audits and approved repairs to analyze/apply.
- Config remains the existing `documentation` section; its permissive tooling string does not need a new restrictive enum.
- Content-root resolution is shared with instruction synchronization and validation. Markdown must mean the configured root itself, even when it contains a child directory named `docs`.
- Index generation remains a source-to-manifest operation with the existing refusal to write inside its source tree.

### Data Flow

1. Detect explicit documentation config and existing framework markers before proposing Markdown adoption. A framework's ordinary content directory must not be mislabeled as a separate Markdown setup.
2. Resolve mode and root. For Markdown, use the selected root as the content root and its authored `index.md` as the configured entrypoint.
3. Inspect the target and config before mutation. Classify it as fresh, existing Markdown needing adoption, already configured Markdown, conflicting framework/config, or unsafe target.
4. Fresh initialization writes a small Markdown scaffold and managed guidance. Explicit adoption adds missing baseline files only and records/reconciles compatible config and guidance.
5. Verify config, managed guidance disposition, paths, authored entrypoint, and links. Existing structural/content gaps become analyze recommendations; apply performs approved repairs.
6. Report created, preserved, and unresolved work clearly. Repeated setup preserves existing content and does not duplicate guidance.

### Configuration Contract

```json
{
  "documentation": {
    "tooling": "markdown",
    "root": "docs",
    "index": "docs/index.md"
  }
}
```

`root` is a repository-relative content directory. `index` is its authored root entrypoint, not a generated inventory. Custom roots use the equivalent `<root>/index.md`. Markdown setup does not introduce `documentation.config`. Preserve unrelated documentation fields such as excludes and completion requirements, and all unrelated repository config.

Explicit `tooling: markdown` overrides the legacy `<root>/docs` content-root heuristic. Apply this consistently to the shared content-root resolver, index generation's source default, and skill root resolution; retain the existing heuristic for other or undeclared tooling. This prevents a legitimate Markdown subsection named `docs` from hiding its parent's content and guidance.

### Authored and Generated Index Ownership

Every Markdown-bearing content directory uses an authored `index.md` containing useful context and a populated `## Contents` map. Sibling links use `page.md`; immediate child directory links use `section/index.md`. Asset-only directories retain their exemption. Generated inventories do not satisfy these authored obligations.

Markdown bootstrap does not run `generate-index`. If a user requests a generated inventory separately, the existing explicit `--output` must identify a location outside the source directory. For configured Markdown, default generation without an output should fail before writing with mode-specific guidance explaining the authored index and showing the explicit-output requirement. Keep the existing canonical-path safety guard for explicit output; do not weaken it or repoint `documentation.index` to the manifest. Fumadocs's existing manifest transition remains unchanged.

## Component Design

### 1. CLI Mode and Option Resolution

Extend the framework/mode selector and CLI choice list with `markdown`, keeping existing command and flags compatible. `oat docs init --framework markdown` is the noninteractive entrypoint. Markdown defaults the target directory to `docs` in all repository shapes and suppresses app-name, package-manager, and site-runtime questions.

Reuse the display-title input (`--site-name`, presented as documentation title in Markdown mode) for the scaffold title; derive a useful repository title when absent. Explicit app-only options such as `--app-name` or root package patching must not silently mutate package configuration; report their inapplicability. Markdown lint/format defaults are `none`; selected existing lint/format tools may be described in guidance but must not trigger dependency installation or create a docs package. Record this behavior in help and bootstrap wording.

### 2. Fresh Markdown Scaffold

Add a Markdown template shape with only an authored root `index.md` and `contributing.md`. The index contains repository-specific orientation based on known inputs and a real Contents link to contributing guidance. Both pages have title/description metadata. Contributing guidance defines the OAT index/navigation contract, context expectations, relative links, metadata conventions, asset exemptions, and analyze/apply workflow. Add scoped docs `AGENTS.md` guidance only through the existing managed instruction mechanisms; do not copy site-specific package/plugin inventories or invent project architecture.

Skip OAT docs dependency resolution, package-manager discovery, root Turbo/package patches, site config, install/dev/build command construction, and site setup verification in the Markdown branch. Emit docs-root, authored-index, configuration, created-file, and guidance results through the existing init result boundary, extending it without changing existing framework result semantics unnecessarily.

### 3. Explicit Adoption and Repeat Runs

Add an explicit `--adopt` option for existing Markdown directories, surfaced through bootstrap's adopt/audit choice. It applies only to Markdown in this scope. Ordinary initialization still refuses a nonempty target; `--yes` alone does not authorize adoption or replacement. Configured Markdown may be reconciled through the same explicit adoption path.

Before any writes, reject unsafe roots, symlink escapes, and incompatible existing documentation config. Do not silently convert a Fumadocs/MkDocs app or retag an unknown declared stack. Framework conversion/replacement stays outside this project; explain the conflict and preserve state.

Adoption writes missing baseline index/contributing files only, never overwriting existing files. If the root index is absent, derive a useful initial map from actual sibling Markdown pages and immediate child directories that have authored index entrypoints, respecting configured excludes and asset-only exceptions. Do not create links to nonexistent child indexes. Missing child indexes and content/metadata gaps are audit recommendations rather than broad automatic repairs. For an otherwise empty directory, seed the contributing page and its link as in fresh setup.

Existing malformed, empty, or incomplete indexes remain untouched and are reported for analyze/apply. Preserve repository-specific audience/context and ownership guidance. The existing managed-section conflict and manual-required behavior remains authoritative for root instructions; arbitrary local guidance is not overwritten. A repeat adoption may add newly missing baseline files but preserves all existing bytes, avoids duplicate sections, and produces a no-change result when there is nothing to reconcile.

Config persistence sets tooling/root/authored index only after the target is validated and the entrypoint is available. Preserve unrelated config keys. An incompatible declared root or entrypoint requires an explicit user decision in bootstrap rather than silent reassignment; the CLI refuses the conflict. Honor dry-run for the new Markdown branch: inspect and report planned file/config/guidance changes without writes.

### 4. Documentation Detection and Consumers

Configured tooling is authoritative. Existing framework probes retain precedence over plain-directory fallback. Add a final generic Markdown candidate only when a docs directory contains authored Markdown evidence, not merely because an empty directory or README exists. Bootstrap can still offer fresh setup for an empty chosen target.

Update the docs bootstrap front door to lead with adopt/audit for an existing plain tree. Audit hands off to analyze/apply for content changes. Make Markdown root/index semantics explicit in analyze/apply, docs authoring guidance, and the relevant configuration/help docs. Remove framework-only assumptions from Markdown walkthrough and verification while preserving their site-mode behavior.

Instruction sync/validate must use the configured Markdown content root consistently so context routing does not omit parent pages when a nested `docs` directory exists. This is a consumer integration, not a new instruction-management framework.

### 5. Verification and Reporting

Fresh setup checks the recorded config, index/contributing metadata, meaningful Contents links, managed root guidance disposition, and absence of app/package changes. Existing adoption reports preserved content, created baseline files, and outstanding audit/repair work. Never describe an adopted tree as fully OAT-conformant merely because config and root guidance exist.

Markdown walkthrough explains where docs live, how index/context routing works, how to add a page or section, and how to use analyze/apply. It makes authored versus optional generated indexes clear. If the repo already has relevant lint/link tooling, run its documented checks; otherwise use the existing file-level verification path. A site build is not an acceptance requirement for Markdown consumers.

## Error Handling

- Nonempty targets without adoption: fail with an actionable adopt/audit instruction before mutation.
- Incompatible config/framework: fail with a concrete conflict; preserve existing setup.
- Unsafe root or manifest output: refuse before writing; canonical path safety remains in force.
- Existing malformed content: preserve it and report audit findings, not scaffolding failure or automatic replacement.
- Managed guidance blocked/manual-required: retain the existing partial outcome and non-success disposition; report the created scaffold and outstanding guidance separately.
- Filesystem/config write failures: report actual partial state and created paths. Do not claim transactionality or successful convergence; safe re-run must preserve any previously created content.

## Testing Strategy

Use deliberate-testing's public-boundary approach. Acceptance cases come from this design and captured filesystem states, not implementation-mirroring assertions. Reuse existing init integration/config/index-generation harnesses instead of adding a separate fixture framework or test-only production hook.

| Public boundary                         | Credible failure protected                                                      | Observable acceptance cases                                                                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CLI docs init on a temporary repository | Markdown still invokes app scaffolding/package patching or records wrong paths  | Fresh default/custom-root setup creates OAT authored pages and literal expected config; package files unchanged; no framework files or app commands                     |
| CLI docs init adoption                  | A populated docs tree is overwritten or config silently retagged                | Nonempty target without adopt refused; adopt adds missing baseline only; existing page/index/guidance bytes unchanged; framework conflict refused; second run converges |
| CLI dry-run                             | A preview mutates real files/config/instructions                                | Compare full relevant tree/config bytes before and after dry-run; planned changes still reported                                                                        |
| Config plus instruction sync/validate   | A nested docs subsection steals the configured content root                     | Markdown root remains the literal root with a nested docs child; parent and child guidance/content are handled consistently; existing framework cases retain behavior   |
| CLI index generation                    | Generated output overwrites authored context or reassigns its config entrypoint | Default Markdown generation refused; explicit external output succeeds; source/output-inside-source refused; authored index and configured index unchanged              |
| Bundled bootstrap/guidance contract     | Markdown users are sent through install/build or lose OAT conventions           | Skill/template checks enforce applicable mode guidance; local manual acceptance of fresh and populated plain-doc repos confirms routing and repair reporting            |

Content-preservation and index-output claims need reproduction-grade controls: preserve a baseline tree with meaningful preexisting index/page/guidance bytes, demonstrate the pre-change missing Markdown capability, then show the new refusal and accepted controls at the owning public boundaries. Unsafe-output negative controls must fail for the output guard, not an unrelated missing-config error. Preserve exact commands and categorical outcomes for review.

For implementation, run repository gates in the documented order: check, type-check, test, build, skill version bumps, lockstep release version checks against freshly fetched origin/main, release validation, and docs build. Skill/template/docs changes require their version bumps and all five public package versions in lockstep; additionally run root lint/format for touched skill files. Distinguish cache replay from actual suite execution and use isolated test home only for tests, not provider review credentials. This design-only change receives file-scoped formatting and diff checks, not unrelated production suites.

## References

- [Discovery](discovery.md)
- [Source backlog item](../../../repo/pjm/backlog/items/BL-260911-make-docs-bootstrap-a-front.md)
- CLI option resolution: `packages/cli/src/commands/docs/init/resolve-options.ts`
- CLI init/config/guidance: `packages/cli/src/commands/docs/init/index.ts`
- Scaffold/target refusal: `packages/cli/src/commands/docs/init/scaffold.ts`
- Documentation config/content root: `packages/cli/src/config/oat-config.ts`
- Existing docs detection: `packages/cli/src/commands/init/detect-docs.ts`
- Manifest paths/safety: `packages/cli/src/commands/docs/index-generate/index.ts`
- Bootstrap skill and instruction template: `.agents/skills/oat-docs-bootstrap/`
- Existing plain-doc analysis/apply: `.agents/skills/oat-docs-analyze/SKILL.md`, `.agents/skills/oat-docs-apply/SKILL.md`
- Authoring contract: `.agents/skills/oat-docs-authoring/references/oat-fumadocs-contract.md`
