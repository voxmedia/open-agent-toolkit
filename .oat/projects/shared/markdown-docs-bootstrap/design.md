---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-30
oat_generated: false
oat_template: false
---

# Design: Markdown Docs Bootstrap

## Design Review Status

The full lightweight design was independently reviewed through Consensus Review, which returned pass with 0 critical, 0 high, 6 medium, and 2 low findings. The user approved the root agent's dispositions, and all eight are incorporated below. The review applies to the original draft at `7781647a2`; this revision has not received an independent re-review. The design is complete for quick planning; implementation is not approved or started. No `spec.md` is required. See `reviews/design-consensus-handoff.md` for the original evidence and disposition ledger.

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

`root` is a dedicated repository-relative content directory. Markdown bootstrap refuses the repository root (`.` or an equivalent spelling), paths outside the repository, and symlink aliases escaping it. Existing analysis of root-level Markdown remains supported. `index` is the authored root entrypoint, not a generated inventory. Custom roots use the equivalent `<root>/index.md`. Markdown setup does not introduce `documentation.config`. Preserve unrelated documentation fields such as excludes and completion requirements, and all unrelated repository config.

Explicit `tooling: markdown` overrides the legacy `<root>/docs` content-root heuristic. Apply this consistently to the shared content-root resolver, index generation's source default, and skill root resolution; retain the existing heuristic for other or undeclared tooling. This prevents a legitimate Markdown subsection named `docs` from being mistaken for the whole content tree. Instruction sync/validate exclude the entire configured Markdown content root from pointer writes, including parent pages outside that nested subsection. The override protects content; it does not turn docs pages into instruction-pointer sites.

### Authored and Generated Index Ownership

Every Markdown-bearing content directory uses an authored `index.md` containing useful context and a populated `## Contents` map. Sibling links use `page.md`; immediate child directory links use `section/index.md`. Asset-only directories retain their exemption. Generated inventories do not satisfy these authored obligations.

Markdown bootstrap does not run `generate-index`. If a user requests a generated inventory separately, an explicit `--output` must identify a location outside the full configured Markdown content root. Without an explicit output, configured Markdown generation fails before writing with guidance explaining the authored index and explicit-output requirement. For explicit output, protect both the canonical configured content root and the canonical configured `documentation.index`, independently of the selected `--docs-dir`; also retain the existing selected-source safety guard. Thus `--docs-dir docs/sub --output docs/index.md` is refused, as is a symlink alias to a protected path. Do not repoint `documentation.index` to a generated manifest. Fumadocs's existing manifest transition remains unchanged.

## Component Design

### 1. CLI Mode and Option Resolution

Extend the framework/mode selector and CLI choice list with `markdown`, keeping existing command and flags compatible. `oat docs init --framework markdown` is the noninteractive entrypoint. Markdown defaults the target directory to `docs` in all repository shapes and suppresses app-name, package-manager, and site-runtime questions.

Reuse the display-title input (`--site-name`, presented as documentation title in Markdown mode) for the scaffold title; derive a useful repository title when absent. Explicit app-only options such as `--app-name` or root package patching must not silently mutate package configuration; report their inapplicability. Markdown lint/format defaults are `none`; selected existing lint/format tools may be described in guidance but must not trigger dependency installation or create a docs package. Record this behavior in help and bootstrap wording.

### 2. Fresh Markdown Scaffold

Add a Markdown template shape with only an authored root `index.md` and `contributing.md`. The index contains repository-specific orientation based on known inputs and a real Contents link to contributing guidance. Both pages have title/description metadata. Contributing guidance defines the OAT index/navigation contract, context expectations, relative links, metadata conventions, asset exemptions, and analyze/apply workflow. Agent guidance belongs in the managed repository-root `AGENTS.md` Documentation section and human authoring conventions in `<root>/contributing.md`. Do not scaffold `<root>/AGENTS.md`. Preserve one if it already exists, along with its local instruction intent; it remains excluded from pointer sync inside the content tree. Do not copy site-specific package/plugin inventories or invent project architecture.

Skip OAT docs dependency resolution, package-manager discovery, root Turbo/package patches, site config, install/dev/build command construction, and site setup verification in the Markdown branch. Emit docs-root, authored-index, configuration, created-file, and guidance results through the existing init result boundary, extending it without changing existing framework result semantics unnecessarily.

### 3. Explicit Adoption and Repeat Runs

Add an explicit `--adopt` option for existing Markdown directories, surfaced through bootstrap's adopt/audit choice. It applies only to Markdown in this scope. For the Markdown branch, ordinary initialization still refuses a nonempty target; `--yes` alone does not authorize adoption or replacement. Skip the current generic config-replacement prompt in that branch and choose only fresh setup, explicit `--adopt`, or refusal. Configured Markdown may be reconciled through the same explicit adoption path.

Before any Markdown writes, reject unsafe roots, symlink escapes, and incompatible existing documentation config. Markdown initialization does not convert a Fumadocs/MkDocs app or retag an unknown declared stack; report the conflict and preserve state. Existing Fumadocs/MkDocs replacement prompts and `--yes` behavior remain unchanged, including an explicitly authorized framework init over configured Markdown. That operation may replace the documentation config while leaving the old Markdown files in place; document this existing behavior. Do not introduce a new conversion/replacement mechanism.

Adoption writes missing baseline index/contributing files only, never overwriting existing files. If the root index is absent, derive a useful initial map from actual sibling Markdown pages and immediate child directories that have authored index entrypoints, respecting configured excludes and asset-only exceptions. Do not create links to nonexistent child indexes. Missing child indexes and content/metadata gaps are audit recommendations rather than broad automatic repairs. For an otherwise empty directory, seed the contributing page and its link as in fresh setup.

Existing malformed, empty, or incomplete indexes remain untouched and are reported for analyze/apply. Preserve repository-specific audience/context and ownership guidance. The existing managed-section conflict and manual-required behavior remains authoritative for root instructions; arbitrary local guidance is not overwritten. A repeat adoption may add newly missing baseline files but preserves all existing bytes, avoids duplicate sections, and produces a no-change result when there is nothing to reconcile.

Config persistence sets tooling/root/authored index only after the target is validated and the entrypoint is available. Preserve unrelated config keys. An incompatible declared root or entrypoint requires an explicit user decision in bootstrap rather than silent reassignment; the CLI refuses the conflict. Honor dry-run for the new Markdown branch: inspect and report planned file/config/guidance changes without writes. Its preview must not invoke mutating scaffold, config-write, or managed-guidance functions.

### 4. Documentation Detection and Consumers

Keep Markdown evidence detection in the bootstrap skill's existing preflight. Configured tooling is authoritative; framework evidence takes precedence over a generic plain-directory candidate. Offer adopt/audit only when the chosen docs tree contains authored Markdown evidence, not merely because an empty docs directory or a repository-root README exists. Fresh setup remains available for an empty chosen target. Do not change `detectExistingDocs` or the general `oat init` tooling picker/config writer in this project; they are a separate entrypoint and are not bootstrap's detector.

Bootstrap leads with adopt/audit for an existing plain tree and delegates content repairs to analyze/apply. All relevant consumers must distinguish a Markdown content root/authored entrypoint from a framework app root/generated manifest. Enumerate these surfaces before implementation and again at final review:

- Bootstrap preflight, Config Inspection, walkthrough, and its instruction template.
- Analyze Step 0/root resolution and `references/quality-checklist.md`.
- Apply's root selection and file-level verification.
- Authoring's `references/docs-root-resolution.md` and applicable authored-source conventions in `references/oat-fumadocs-contract.md`.
- The shared documentation content-root resolver and its instruction-sync/validate consumers.
- Index generation's source defaults, configured-index protection, and Fumadocs-only config transition.
- `oat-project-document` and `oat-doctor` documentation config consumers; update only assumptions that conflict with Markdown semantics.
- Configuration/CLI-init help and docs pages, plus `apps/oat-docs/docs/provider-sync/instruction-sync.md`.

Skill changes receive their required version bumps. Preserve framework-specific guidance where it remains correct instead of globally replacing the app-root model.

### Managed Root Documentation Guidance

Build the Markdown section deterministically from the effective root/index config and the fixed contributing path. It identifies Docs root `<root>`, Tooling Markdown, Authored index `<root>/index.md`, and Contributing `<root>/contributing.md`, followed by the applicable authoring and analyze/apply routing guidance. It contains no `<root>/docs/index.md` path or generated-index ownership claim. A missing managed block can be appended; an identical block is no-change; conflicting/manual guidance follows the existing helper's manual-required/blocked contract. Repeated adoption does not duplicate or forcibly replace sections.

### Read-only Dry-run Guidance Preview

Expose a production read-only preview of the managed-section classification from the shared agents-md helper, reusing its target/path validation, section parsing, and conflict classification. Factor the classification from writes rather than duplicating it in docs init or simulating mutation on real files. Actual upsert keeps its existing identity/recheck guards; preview is advisory and cannot guarantee that a later write succeeds.

For Markdown dry-run, return the existing `ok`/`partial` status vocabulary with `dryRun: true`, planned file/config changes, and the predicted guidance action (`created`, `appended`, `no-change`, `manual-required`, or `blocked`). If applicable guidance is manual-required or blocked, return partial with exit 1, identify the scaffold as planned rather than completed, and write nothing. A converged repeat adoption returns ok with exit 0, no planned changes, and guidance no-change. Other preflight refusals retain their non-success outcome before mutation. Dry-run may classify observable target/read/ownership problems; it must not claim write-permission certainty without performing a write.

### 5. Verification and Reporting

Fresh setup checks the recorded config, index/contributing metadata, meaningful Contents links, managed root guidance disposition, and absence of app/package changes. Existing adoption reports preserved content, created baseline files, and outstanding audit/repair work. Never describe an adopted tree as fully OAT-conformant merely because config and root guidance exist.

Markdown walkthrough explains where docs live, how index/context routing works, how to add a page or section, and how to use analyze/apply. It makes authored versus optional generated indexes clear. If the repo already has relevant lint/link tooling, run its documented checks; otherwise use the existing file-level verification path. A site build is not an acceptance requirement for Markdown consumers.

## Error Handling

- Nonempty targets without adoption: fail with an actionable adopt/audit instruction before mutation.
- Incompatible config/framework in Markdown init: fail with a concrete conflict and preserve the existing setup. Existing explicitly authorized framework replacement retains its prior semantics.
- Unsafe root or manifest output: refuse before writing; canonical path safety remains in force.
- Existing malformed content: preserve it and report audit findings, not scaffolding failure or automatic replacement.
- Managed guidance blocked/manual-required: retain partial with exit 1; real runs report created scaffold and outstanding guidance separately, while dry-run reports only planned changes and the predicted guidance outcome.
- Filesystem/config write failures: report actual partial state and created paths. Do not claim transactionality or successful convergence; safe re-run must preserve any previously created content.

## Testing Strategy

Use deliberate-testing's public-boundary approach. Acceptance cases come from this design and captured filesystem states, not implementation-mirroring assertions. Reuse existing init integration/config/index-generation harnesses instead of adding a separate fixture framework or test-only production hook.

| Public boundary                         | Credible failure protected                                                      | Observable acceptance cases                                                                                                                                                                                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CLI docs init on a temporary repository | Markdown still invokes app scaffolding/package patching or records wrong paths  | Fresh default/custom-root setup creates OAT authored pages and literal expected config; package files unchanged; no framework files or app commands                                                                                                                  |
| CLI docs init adoption                  | A populated docs tree is overwritten or config silently retagged                | Nonempty Markdown target without adopt refused even with --yes; adopt adds missing baseline only; existing page/index/guidance bytes unchanged; Markdown framework conflicts refused; authorized framework replacement keeps existing behavior; second run converges |
| CLI dry-run                             | A preview mutates real files/config/instructions                                | Tree/config/instruction bytes unchanged; planned changes and predicted guidance reported; blocked/manual-required yields partial/exit 1; converged repeat yields ok/exit 0 with no changes                                                                           |
| Config plus instruction sync/validate   | A nested docs subsection steals the configured content root                     | Markdown root remains the literal root with a nested docs child; parent and child content excluded from pointer writes; no docs-root AGENTS is scaffolded; existing framework behavior remains intact                                                                |
| CLI index generation                    | Generated output overwrites authored context or reassigns its config entrypoint | Default generation refused; external output succeeds; --docs-dir <root>/sub --output <root>/index.md and symlink aliases refused; full configured root and authored index protected; configured index unchanged                                                      |
| Bundled bootstrap/guidance contract     | Markdown users are sent through install/build or lose OAT conventions           | Skill/template checks enforce applicable mode guidance; local manual acceptance of fresh and populated plain-doc repos confirms routing and repair reporting                                                                                                         |

Include unsafe-root controls for `.` and repository-escaping paths. Assert deterministic managed guidance uses the configured authored index and converges without duplicate sections. Content-preservation and index-output claims need reproduction-grade controls: preserve a baseline tree with meaningful preexisting index/page/guidance bytes, demonstrate the pre-change missing Markdown capability, then show the new refusal and accepted controls at the owning public boundaries. Unsafe-output negative controls must fail for the output guard, not an unrelated missing-config error. Preserve exact commands and categorical outcomes for review.

For implementation, run repository gates in the documented order: check, type-check, test, build, skill version bumps, lockstep release version checks against freshly fetched origin/main, release validation, and docs build. Skill/template/docs changes require their version bumps and all five public package versions in lockstep; additionally run root lint/format for touched skill files. Distinguish cache replay from actual suite execution and use isolated test home only for tests, not provider review credentials. This design-only change receives file-scoped formatting and diff checks, not unrelated production suites.

## References

- [Discovery](discovery.md)
- [Source backlog item](../../../repo/pjm/backlog/items/BL-260911-make-docs-bootstrap-a-front.md)
- CLI option resolution: `packages/cli/src/commands/docs/init/resolve-options.ts`
- CLI init/config/guidance: `packages/cli/src/commands/docs/init/index.ts`
- Scaffold/target refusal: `packages/cli/src/commands/docs/init/scaffold.ts`
- Documentation config/content root: `packages/cli/src/config/oat-config.ts`
- General init detection/config, unchanged in this project: `packages/cli/src/commands/init/detect-docs.ts`, `packages/cli/src/commands/init/index.ts`
- Managed root guidance and preview boundary: `packages/cli/src/commands/shared/agents-md.ts`
- Instruction content exclusions: `packages/cli/src/commands/instructions/instructions.utils.ts`
- Manifest paths/safety: `packages/cli/src/commands/docs/index-generate/index.ts`
- Bootstrap skill and instruction template: `.agents/skills/oat-docs-bootstrap/`
- Existing plain-doc analysis/apply: `.agents/skills/oat-docs-analyze/SKILL.md`, `.agents/skills/oat-docs-apply/SKILL.md`
- Authoring contract: `.agents/skills/oat-docs-authoring/references/oat-fumadocs-contract.md`
- Root-resolution conventions: `.agents/skills/oat-docs-authoring/references/docs-root-resolution.md`
- Analysis checklist: `.agents/skills/oat-docs-analyze/references/quality-checklist.md`
- Other docs config consumers: `.agents/skills/oat-project-document/SKILL.md`, `.agents/skills/oat-doctor/SKILL.md`
- Instruction/config docs: `apps/oat-docs/docs/provider-sync/instruction-sync.md`, `apps/oat-docs/docs/cli-utilities/configuration.md`, `apps/oat-docs/docs/cli-utilities/config-and-local-state.md`
