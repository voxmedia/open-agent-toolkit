---
oat_status: complete
oat_ready_for: oat-project-plan
oat_blockers: []
oat_last_updated: 2026-08-28
oat_generated: false
oat_template: false
---

# Design: portable-agent-references

## Overview

This project makes cross-skill reads portable across every Markdown asset
shipped by a user-default tool pack. The existing ratchet covers authored skill
Markdown but recognizes only sibling `SKILL.md` targets and ignores agent
assets. The revised contract derives its scan surface from `PACK_MANIFEST`,
enumerates both skill and agent Markdown, recognizes cross-skill `SKILL.md`
targets plus file and directory targets under `references/`, and permits only
exact reviewed baselines for self-references or historical evidence.

Executable violations are fixed at the caller, not hidden from the scanner.
Loaded skills use loaded-skill, user, then project resolution. Materialized
agents use user then project resolution because OAT does not expose a stable
loaded-agent source path across Codex, Claude, and Cursor. Every dependency is
resolved independently, validated at the exact target path, and paired with a
fail-closed recovery command naming the owning pack and intended scope.

## Architecture

### System Context

Canonical skills and agents under `.agents/` are bundled into the CLI and
materialized into provider-specific views. A path that works in the source
repository may therefore fail after user-scope installation. The portability
ratchet is a release-time contract over the same manifest that defines those
shipped user-default assets.

**Key Components:**

- **Manifest-driven surface collector:** selects user-default skill and agent
  assets and enumerates their authored Markdown.
- **Cross-skill reference classifier:** distinguishes portable reads,
  executable repository-relative cross-skill reads, self-references, and exact
  historical evidence.
- **Portable caller contracts:** resolve concrete sibling files using the
  candidate order available to a loaded skill or materialized agent.
- **Bundle/provider verification:** proves canonical fixes survive CLI bundling
  and provider materialization.

### Component Diagram

```text
PACK_MANIFEST
     |
     v
user-default skill + agent assets -----> authored Markdown collector
                                                |
                                                v
                                  cross-skill reference classifier
                                     | portable      | violation
                                     v               v
                                  accepted     exact evidence report
                                                       |
                                                       v
                                             caller resolver migration

canonical .agents content -> bundle-assets -> provider views -> verification
```

### Data Flow

1. Select packs whose `defaultScope` is `user` and collect their skill and
   agent asset definitions.
2. Enumerate canonical Markdown for each asset, skipping only generated or
   materialized subtrees already excluded by the existing contract.
3. Normalize Markdown path spellings and extract cross-skill targets ending in
   `SKILL.md` or naming a file or directory at or below `references/`.
4. Ignore same-owner local references; compare remaining findings with the
   exact historical-evidence baseline.
5. Fail with deterministic `source -> target` evidence for any unapproved
   executable read.
6. Contract tests verify each remediated caller's candidate order, independent
   bindings, target validation, recovery behavior, and bundled/provider copy.

## Component Design

### Manifest-Driven Portability Ratchet

**Purpose:** Prevent executable repository-relative cross-skill reads from
shipping in any user-default skill or agent.

**Responsibilities:**

- Derive coverage from pack asset definitions rather than a manually curated
  skill list.
- Scan both canonical skill trees and single-file agent assets.
- Match quoted, unquoted, linked, `./`, and `../` spellings for `SKILL.md` and
  both file-form and directory-form reference targets.
- Report exact source and target values and retain only exact non-executable
  baselines.

**Interfaces:**

```typescript
interface CrossSkillReference {
  file: string;
  targetSkill: string;
  targetPath: string;
}

function collectUserDefaultMarkdownAssets(): MarkdownAsset[];
function collectBareCrossSkillReferences(
  asset: MarkdownAsset,
): CrossSkillReference[];
```

The concrete helper names may differ. The contract is the manifest-derived
asset set and deterministic reference identity, not a particular internal API.

**Design Decisions:**

- Keep historical evidence separate from executable migration inventory so a
  temporary remediation list cannot become a permanent wildcard exemption.
- Treat same-skill references as local bundle reads rather than cross-skill
  violations when their target travels with the asset.
- Treat short-form follow-on reads such as
  `subagent-orchestration/references/provider-codex.md` as local to an already
  validated, explicitly bound sibling root. They are outside the bare-read
  ratchet only when their anchoring read establishes that root first. The
  scanner does not match short forms; caller-contract assertions enforce this
  anchoring requirement.

### Loaded-Skill Resolver

**Purpose:** Make utility, workflow, and research skills find sibling skill
contracts and references after installation.

**Responsibilities:**

- Probe the loaded skill's sibling root, then user scope, then project scope.
- Resolve each sibling independently and validate the exact requested file.
- Stop with owning-pack install/update recovery instead of ambient discovery.

**Design Decisions:**

- Preserve the contract merged in PR #226 rather than introducing another
  fallback order.
- Bind concrete roots per dependency so mixed-scope packs remain supported.

### Materialized-Agent Resolver

**Purpose:** Make workflow agents load their required sibling skill and
reference contracts without depending on provider view paths.

**Responsibilities:**

- Probe user scope, then project scope, independently for every dependency.
- Validate the exact target before optional dispatch or delegated review.
- Preserve dispatch order, selection rules, launch safeguards, and the
  reviewer/implementer ownership boundaries.

**Design Decisions:**

- Do not use `${AGENT_DIR}`: Codex receives agent content as developer
  instructions and Claude/Cursor use distinct provider directories, so no
  portable loaded-agent-root contract exists.
- Prefer user scope because the owning packs default there; retain project
  fallback for project installations.

### Validation and Release Integration

**Purpose:** Prove the source, bundle, provider views, and published version
metadata describe the same portable behavior.

**Responsibilities:**

- Replace the phase-implementer bare-path exemption with positive portable
  assertions and add equivalent reviewer/codebase-mapper coverage.
- Verify bundled skill/agent assets, and generated provider views for the
  Codex materialization surface. Codex is the contract-gated provider; the
  Claude and Cursor views rely on manual regeneration plus the
  `oat sync --scope all --dry-run` drift check. Broadening the sync contract
  test to a second adapter is a recorded follow-up.
- Enforce one version bump for each changed canonical skill or agent and the
  lockstep public-package release contract.

## Error Handling

### Missing Sibling Dependency

The caller names the missing skill, identifies its owning pack, prints both
install and update recovery commands for the intended user or project scope,
and stops before dispatch. It does not use ambient discovery or continue with
partial guidance.

### Ambiguous or Historical Reference

The ratchet fails with exact source/target evidence unless the reference is a
same-owner local read or appears in the exact reviewed historical baseline.
New baseline entries require an explicit rationale; directory or skill-wide
wildcards are invalid.

### Provider Materialization Drift

Bundle/provider-copy assertions fail when canonical changes are not reflected
in shipped assets. The implementation refreshes provider views through the
normal sync tooling rather than editing generated views as independent source.

## Testing Strategy

### Unit and Contract Tests

- Table-driven matcher cases cover `SKILL.md`, reference files, reference
  directories with and without trailing slashes, quoted, plain, linked, `./`,
  `../`, portable-variable, and same-owner forms.
- Manifest fixtures prove both user-default skill and agent assets are scanned
  while non-user-default assets remain outside the rule.
- Exact-baseline tests prevent a new file, target, or executable caller from
  inheriting a historical exemption.
- Caller contract tests assert skill and agent candidate orders separately,
  independent roots, exact target checks, fail-closed language, and pack-aware
  recovery.
- Existing dispatch-consumer tests assert portable phase-implementer and
  reviewer behavior with no special bare-path branch.

### Bundle and Provider Tests

- Run the bundle script into a temporary assets root and inspect all changed
  skills and agents.
- Materialize the current canonical agents through the sync harness into a
  temporary root by first copying canonical `.agents/agents/*.md` into that
  root. Never read `packages/cli/assets/agents` directly in this contract. Then
  assert no canonical bare reads reappear in the derived provider role content;
  keep the repository sync dry-run as a separate drift check.

### Repository Verification

- Run the focused bundled-docs and skill-validation Vitest files throughout
  implementation.
- Run skill/agent version assertions, provider sync, lockstep release checks,
  and the complete Definition of Done sequence in repository order.
- Run `pnpm lint` and `pnpm format` because canonical skills and agents change.

## Implementation Phases

### Phase 1: Global Ratchet and Portable Callers

Build the manifest-driven skill/agent ratchet with an exact migration
inventory, port every executable violation it identifies, and reduce that
inventory to zero while preserving only justified historical evidence.

### Phase 2: Packaging, Documentation, and Release Validation

Refresh versions and provider views, document the global user-default
portability invariant, run focused verification, then execute the complete
repository gate sequence.

## References

- Discovery: `discovery.md`
- Prior project record:
  `.oat/repo/reference/project-summaries/20260828-portable-skill-references.md`
- Pack manifest:
  `packages/cli/src/commands/tools/shared/pack-manifest.ts`
- Existing ratchet:
  `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`
- Dispatch consumer validation: `packages/cli/src/validation/skills.test.ts`
