---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-16
oat_generated: false
oat_template: false
oat_template_name: design
---

# Design: cursor-subagent-materialization

## Overview

Extend OAT's sync-time materialization architecture with a provider-neutral extension boundary while retaining provider-owned codecs and file semantics. The existing Codex materializer remains the behavioral reference: canonical role definitions are the sole instruction source, generated variants carry managed-owner provenance (`supported-catalogue`, `user-config`, or `project-config`), and sync/status/stray handling compute desired state before applying writes. Cursor adds a Markdown codec that preserves the canonical body and emits only documented `model:` frontmatter values.

Cursor target selection is deliberately split into two identities. The resolver and generated variant name use the ladder-surface flat ID, while an explicit mapping entry supplies the base-ID-plus-brackets value written to frontmatter. No fallback derives one form from the other: an unmapped config-owned target cannot produce a managed variant and must fail with an actionable diagnostic rather than emit an undocumented flat ID. The supported catalogue is the shipped capability set; layered user/project configuration can change ownership and select mapped entries without changing codec behavior.

The verification lane is a release gate for mapping data, not a best-effort smoke test. One pinned test agent per syntax family must establish that Cursor accepted the configured pin before entries from that family ship. The awkward Claude Fable and Grok entries remain unresolved design inputs until that lane supplies evidence; they are corrected or excluded rather than guessed. Runtime audit language records the selected variant and model as launcher-owned `configured` provenance, reports `CURSOR_CONVERSATION_ID` for transcript correlation, and never claims Cursor self-verified its model.

## Architecture

### System Context

The ordinary provider adapter still maps canonical `.agents/agents/*.md` files into provider views. Materialized variants are a second, computed sync extension because one canonical role can expand into many provider-native files and because stale managed variants need ownership-aware cleanup. Sync, status, init, and stray handling should consume a small provider-extension contract instead of importing Codex-specific plan types and functions directly.

Provider-neutral orchestration owns lifecycle mechanics only: compute a desired plan, expose operations for dry-run/status, apply it, and identify managed entries. Each provider module retains its native codec, target collection, marker parser, collision rules, and any provider-specific side files. This keeps Codex TOML/config merging independent from Cursor Markdown generation while removing the command layer's current Codex-only branching.

**Key components:**

- **Materialization extension registry:** Runs enabled provider extensions after the canonical sync plan and combines their operation/result summaries.
- **Codex extension adapter:** Wraps the existing Codex codec, owner system, TOML role generation, and `config.toml` merge without changing its output contract.
- **Cursor mapping catalogue and codec:** Maps flat ladder IDs to documented bracket syntax and renders managed Markdown variants from canonical agents.
- **Cursor extension adapter:** Collects catalogue/config targets, computes owner-aware create/update/remove operations, and rejects discovery-name collisions.
- **Dispatch compiler and audit guidance:** Resolves Cursor candidates to native variant names and records launcher-owned `configured` provenance.

### Component Diagram

```text
canonical .agents/agents/*.md
              |
              v
       scanCanonical()
              |
        +-----+----------------------+
        | ordinary adapter mappings  |
        | (.cursor base symlinks)    |
        +----------------------------+
              |
              v
 materialization extension registry
        |                         |
        v                         v
 Codex extension             Cursor extension
 TOML codec + config         mapping table + Markdown codec
        |                         |
 .codex/agents/*.toml        .cursor/agents/*.md
 .codex/config.toml          managed owner comments
```

### Data Flow

1. Resolve canonical roles and layered dispatch configuration for the requested sync scope.
2. For each enabled materialization extension, collect supported-catalogue targets plus mapped user/project targets and assign the strongest applicable owner.
3. Build a deterministic variant name from the base role and ladder-surface ID; look up the separate frontmatter model value from the explicit Cursor mapping table.
4. Render desired provider-native content, detect duplicate names and unmanaged cross-directory collisions, and diff it against existing managed files.
5. Apply or report create/update/remove/skip operations. Never remove a file whose managed marker and owner do not match the cleanup scope.
6. Compile managed Cursor dispatch to the same deterministic variant name. The launcher selects that native agent type first and records the selected mapping as configured, while runtime identity remains not reported.

## Component Design

### Provider Materialization Extension Contract

**Purpose:** Remove Codex-specific orchestration from sync/status/init while keeping native formats provider-owned.

**Responsibilities:**

- Provide provider-tagged compute/apply hooks and a common operation envelope.
- Preserve dry-run, partial-sync, aggregate-hash, and failure-count semantics.
- Let each provider retain typed private plan metadata and adoption logic.

**Interface shape:**

```typescript
interface MaterializationOperation {
  provider: string;
  action: 'create' | 'update' | 'remove' | 'skip';
  target: string;
  path: string;
  reason: string;
  entryName?: string;
}

interface MaterializationPlan {
  provider: string;
  operations: MaterializationOperation[];
  managedEntries: string[];
  aggregateHash: string;
}

interface MaterializationExtension<TPlan extends MaterializationPlan> {
  provider: string;
  computePlan(context: MaterializationContext): Promise<TPlan>;
  applyPlan(scopeRoot: string, plan: TPlan): Promise<ExtensionApplyResult>;
}
```

The common contract is intentionally narrow. It does not force Cursor to emulate Codex `config.toml`, nor does it move provider marker parsing into shared code.

### Cursor Model Mapping and Catalogue

**Purpose:** Keep selection IDs, generated names, and documented frontmatter values explicit and independently testable.

```typescript
type CursorPinSyntaxFamily =
  | 'gpt-effort'
  | 'claude-effort'
  | 'composer-fast'
  | 'grok-effort-fast';

interface CursorModelPinMapping {
  ladderModelId: string;
  frontmatterModel: string;
  syntaxFamily: CursorPinSyntaxFamily;
}

interface SupportedCursorRoleTarget extends CursorModelPinMapping {
  catalogue: true;
}
```

`ladderModelId` is the exact candidate string used by dispatch configuration. `frontmatterModel` is an explicit documented base-ID-plus-brackets value. There is no parser that strips suffixes and no fallback that writes `ladderModelId` into frontmatter.

The mapping registry may contain materializable entries beyond the bundled supported catalogue so user/project configuration can retain `user-config` or `project-config` ownership. A config target absent from the registry is rejected with an actionable mapping error; this is required to preserve the documented-syntax invariant. Catalogue tests require unique ladder IDs, unique generated variant names, valid bracket syntax, and a mapping for every shipped target.

### Cursor Markdown Codec and Ownership

**Purpose:** Emit one native Cursor agent definition per base role and mapped target.

**Responsibilities:**

- Start from the parsed canonical Markdown agent.
- Set an explicit normalized `name`, preserve `description`, and add only the mapped `model` field required by the variant.
- Encode `oat-managed`, role, and owner as YAML comments inside the existing frontmatter block, not as unsupported schema fields.
- Preserve the canonical body byte-for-byte.
- Parse markers before update/removal and refuse unmanaged or differently owned files.

Generated filenames and `name` values use one deterministic builder shared with the resolver. Before writing, the extension checks all Cursor-readable project agent locations (`.cursor/agents`, `.claude/agents`, and Cursor-compatible `.codex/agents` Markdown definitions). A collision with an unmanaged definition or a distinct desired mapping is an error. Codex TOML files are not treated as Cursor Markdown definitions merely because they share a stem.

The two canonical role definitions gain a provider-conditional return requirement: when `CURSOR_AGENT=1` and `CURSOR_CONVERSATION_ID` is present, include that conversation ID in the result. Their versions are bumped and all provider views are regenerated, so each Cursor variant body remains identical to its canonical source.

### Cursor Target Collection and Sync Lifecycle

**Purpose:** Preserve the Codex owner model across supported, user, and project sources.

Supported targets seed project sync as `supported-catalogue`. User-scope sync collects mapped Cursor candidates from effective user configuration as `user-config`. Project sync overlays mapped shared/local/project-state candidates as `project-config`. Duplicate targets collapse deterministically, with project ownership taking precedence for project output. Full sync cleans stale entries only for the relevant owner; partial sync never performs broad stale cleanup.

Status and init use the same computed plan, marker parser, and collision checks as sync. Doctor additionally compares each materialized ladder ID with the existing Cursor model catalogue probe. Catalogue availability is diagnostic; it does not transform IDs or elevate launcher-owned configuration into runtime verification.

### Resolver, Dispatch Guidance, and Provenance

The Cursor ceiling adapter changes from `model-arg` to `pinned-variant` and compiles the selected flat candidate to the deterministic reviewer/implementer variant name. Resolver output uses `dispatchArgs.variant`; managed launch guidance selects that native agent type first. Cursor has no model-argument fallback after an accepted launch. A fallback route is allowed only for a recorded pre-start native role-selection rejection and must not claim equivalent pin enforcement unless the replacement can express the same definition-level pin.

Dispatch reports describe the variant/model as **configured** by the launcher. `CURSOR_CONVERSATION_ID` is session-correlation evidence only; runtime model/effort remain `not-reported`. Skill and provider-reference edits must land after, or be carefully rebased over, `gate-execution-hardening` commit `c57bdc9d` because that project edits the same dispatch guidance.

### Verification Lane

The lane creates one temporary pinned test definition per syntax family, launches each by native agent type, and captures evidence that the configured pin took. It tests representative known mappings first, then the awkward Fable and Grok decompositions. Only mappings supported by positive evidence are added to the shipped registry/catalogue and recommendation; ambiguous or silently falling-back entries are excluded and recorded in project verification results.

This live lane is separate from `cursor-agent --list-models`: catalogue presence checks availability of the flat ladder ID, while the launch verifies definition-level bracket syntax. A bonus flat-ID experiment may be recorded, but generated files and tests never rely on it.

## Data Models

The mapping table is the only new durable data model. It is checked-in TypeScript data, not user configuration and not generated from CLI output. Ownership remains metadata on generated files; reusable ladder policy remains in the bundled/config JSON surfaces.

No new config field is introduced for frontmatter syntax in this project. Supporting a new Cursor flat ID therefore requires adding and live-verifying an explicit mapping entry before it can materialize. This keeps malformed or undocumented pin strings out of generated assets.

## Error Handling

- **Missing mapping:** fail plan computation for the affected config-owned target with its source and flat ID; never emit the flat ID as frontmatter.
- **Name collision:** fail before writes when normalized desired names collide or when a Cursor-readable unmanaged definition owns the name.
- **Managed-marker mismatch:** leave the file untouched and report a stray/conflict; cleanup is limited to files with a recognized owner marker.
- **Unavailable catalogue ID:** doctor reports the existing availability diagnostic. Sync may still render an explicitly mapped definition, but release verification cannot approve a shipped catalogue entry without live evidence.
- **Silent Cursor fallback:** treat absence of positive pin evidence as inconclusive, not success. Exclude the mapping from shipped data.
- **Partial apply failure:** retain the extension result's applied/failed/skipped counts and return a non-successful sync result without deleting unrelated managed files.

## Testing Strategy

### Unit Tests

- Mapping table: exact flat-to-bracket pairs, syntax-family assignment, no flat suffixed value in `frontmatterModel`, uniqueness, and catalogue coverage.
- Cursor codec: explicit five-field-compatible frontmatter, comment markers, canonical body identity, deterministic names, and conversation-ID instruction inherited from canonical roles.
- Owner parsing/cleanup: supported, user, and project ownership; legacy/unmanaged preservation; stale-owner boundaries.
- Resolver: each managed Cursor candidate compiles to the expected `dispatchArgs.variant`, never `dispatchArgs.model`.
- Dispatch reporting: configured provenance and not-reported runtime identity remain distinct.

### Integration Tests

- Sync dry-run/apply/idempotence for project and user scopes, including partial sync and config-owned targets.
- Combined Codex and Cursor extension execution proves the provider-neutral registry preserves existing Codex output and summaries.
- Status/init/stray flows use the same desired-state plan and detect cross-directory name conflicts.
- Bundled recommendation tests assert the intended multi-family tier placement and that every Cursor candidate is materializable.
- Canonical role version bumps plus `oat sync --scope all` produce current provider views without hand-edited generated files.

### Live Verification

- Launch one native pinned test subagent per syntax family and record the exact definition, requested model syntax, conversation ID, and observed confirmation.
- Resolve Fable and Grok only through this lane; correct their mapping or exclude them.
- Generate the full supported variants, launch representative reviewer and implementer variants by native agent type, and verify transcript correlation without claiming runtime model self-report.

### Release Checks

- Run focused CLI tests during implementation, then package lint/type-check/test/build checks appropriate to touched surfaces.
- Bump every changed canonical skill/agent version, bump the five public packages in lockstep, and run `pnpm release:validate`.
- Run `oat sync --scope all`, inspect generated diffs, and ensure no hand-authored provider-view changes remain.

## References

- Authoritative requirements: `discovery.md`
- Codex command reference: `packages/cli/src/commands/providers/codex/materialize.ts`
- Codex codec reference: `packages/cli/src/providers/codex/codec/`
- Coordination dependency: `gate-execution-hardening` task p02-t06 / commit `c57bdc9d`
