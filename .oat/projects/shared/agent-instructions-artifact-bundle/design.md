---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-03-19
oat_generated: false
oat_template: false
---

# Design: agent-instructions-artifact-bundle

## Overview

This project introduces an artifact bundle for the `oat-agent-instructions-analyze` to
`oat-agent-instructions-apply` handoff. The current markdown artifact works for human review, but it compresses
behavioral guidance, counter-examples, workflow steps, and recommendation-scoped evidence into one document. That
compression is the main source of fidelity loss between analysis and application.

The new design keeps the human-readable analysis summary while adding a machine-oriented bundle directory that carries a
generation-ready contract for each recommendation. Apply will consume the bundle as its primary structured input and
use the human summary as review context rather than as the sole contract.

## Architecture

### System Context

This work changes the contract between two existing skills rather than collapsing them into one. Analyze remains
responsible for discovery, validation, and human-review output. Apply remains responsible for taking approved
recommendations and rendering instruction files. The bundle sits between them as a richer persisted handoff.

**Key Components:**

- **Analysis summary artifact:** Human-readable review document that explains findings, evidence, and recommended
  actions.
- **Bundle manifest:** Structured index of recommendations, bundle metadata, and file locations.
- **Recommendation packs:** Per-recommendation context documents carrying evidence, conventions, anti-patterns, and
  generation constraints.
- **Apply bundle reader:** Validation and translation layer that consumes the manifest and packs to produce the apply
  plan.

### Component Diagram

```text
repo analysis
    |
    v
analyze skill
    |-- analysis.md (human review)
    |-- bundle/summary.md
    |-- bundle/recommendations.yaml
    `-- bundle/packs/<recommendation-id>.md
                    |
                    v
              apply skill
                    |
                    v
          generated AGENTS/rules/files
```

### Data Flow

Analyze first produces the same reviewed findings it does today, then emits a bundle alongside the summary. The
manifest lists each recommendation and points to its corresponding pack. Each pack carries the exact evidence,
structural conventions, behavioral rules, anti-patterns, workflow steps, and claim corrections that apply needs for
one generated output.

Apply validates the bundle structure, reads the manifest, loads only the packs required for approved recommendations,
and generates files from that contract. If bundle fields and human summary disagree, the bundle should win for
generation while the mismatch is surfaced as a validation issue.

```text
1. analyze validates repo facts
2. analyze writes summary + manifest + packs
3. reviewer approves recommendations
4. apply reads manifest
5. apply loads relevant packs
6. apply generates files and syncs provider assets
```

## Component Design

### Human Review Artifact

**Purpose:** Preserve the current reviewable analysis experience.

**Responsibilities:**

- Summarize findings, severity, and rationale for reviewers.
- Link to the bundle outputs so reviewers can inspect the generation contract.
- Remain concise enough for PR review and discussion.

**Dependencies:**

- Existing analysis artifact structure.
- Bundle manifest for cross-linking.

**Design Decisions:**

- Keep the markdown summary instead of replacing it; reviewers still need a narrative artifact.
- Reduce the summary's responsibility as the only apply contract once the bundle exists.

### Bundle Manifest

**Purpose:** Give apply a machine-oriented index of what to read and generate.

**Responsibilities:**

- Record bundle metadata and versioning.
- Enumerate recommendations with stable IDs.
- Point to the pack file for each recommendation.
- Record approval-sensitive fields like disclosure mode and target path.

**Interfaces:**

```yaml
bundleVersion: 1
artifactSummary: summary.md
recommendations:
  - id: rec-001
    action: create
    target: .cursor/rules/example.mdc
    providerFormat: cursor-rule
    severity: high
    disclosure: inline
    pack: packs/rec-001.md
```

**Dependencies:**

- Analysis recommendation data.
- Recommendation pack files.

**Design Decisions:**

- Use YAML for readability in-repo and compatibility with existing markdown-heavy workflows.
- Keep one recommendation per pack so apply can load targeted context instead of one oversized artifact.

### Recommendation Pack

**Purpose:** Preserve generation-ready context for one recommendation.

**Responsibilities:**

- Capture evidence refs and factual validations.
- Record structural conventions and behavioral rules.
- Preserve anti-patterns, counter-examples, and new-file workflows.
- Carry command ordering, preferred defaults, and claim corrections.

**Interfaces:**

```md
# Recommendation Pack: rec-001

## Target

## Evidence

## Structural Conventions

## Behavioral Conventions

## Counter-Examples

## New-File Workflow

## Preferred Default for New Files

## Claim Corrections

## Generation Constraints
```

**Dependencies:**

- Repository evidence sampled during analyze.
- Recommendation metadata from the summary artifact.

**Design Decisions:**

- Keep packs in Markdown so they remain easy to inspect in PRs.
- Standardize section names so apply can parse them reliably.

### Apply Bundle Reader

**Purpose:** Turn the bundle into an apply-time execution contract.

**Responsibilities:**

- Validate bundle completeness before generation.
- Refuse generation when manifest entries or pack references are missing.
- Translate bundle fields into apply plan entries and template inputs.

**Dependencies:**

- `oat-agent-instructions-apply` skill validation flow.
- Apply plan template and instruction templates.

**Design Decisions:**

- Bundle data becomes the primary generation contract; apply should not rediscover repo intent.
- Human summary remains context, not a fallback excuse to improvise missing bundle fields.

## Testing Strategy

### Unit and Fixture Coverage

- Add fixture coverage for at least two representative recommendation types:
  - a glob-scoped rule requiring behavioral guidance and counter-examples
  - a scoped `AGENTS.md` recommendation requiring command ordering or workflow notes
- Validate that the manifest and pack structure round-trips into apply plan entries without dropping fields.

### Integration Coverage

- Exercise an analyze fixture that emits both summary and bundle outputs.
- Exercise apply against that bundle and confirm the generated plan preserves counter-examples, new-file workflows,
  claim corrections, and preferred defaults.

### Manual Verification

- Review the human summary and bundle side-by-side to confirm the bundle carries richer detail without bloating the
  summary.
- Verify apply stops when a referenced pack is missing or malformed.
