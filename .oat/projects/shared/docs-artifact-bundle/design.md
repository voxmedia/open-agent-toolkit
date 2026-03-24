---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-03-21
oat_generated: false
oat_template: false
---

# Design: docs-artifact-bundle

## Overview

This project adapts the artifact-bundle idea from the agent-instructions workflow to the docs
analyze/apply pair, but with a lighter contract. The current docs workflow already has a usable
review artifact, and many recommendations are simple enough that they do not need a second machine-
oriented bundle. The design therefore keeps the markdown analysis artifact as the canonical review
surface while adding stable recommendation IDs and optional per-recommendation packs for the
recommendation types most likely to lose nuance between analysis and apply.

The main design goal is to preserve recommendation-scoped detail only where docs apply actually
needs it: large creates, splits, complex content opportunities, and recommendations with nuanced
disclosure or workflow constraints. Simple updates should remain inline in the main artifact so the
docs workflow stays lighter than the agent-instructions workflow.

## Architecture

### System Context

This work changes the contract between `oat-docs-analyze` and `oat-docs-apply` without merging
them. Analyze remains responsible for discovery, evidence gathering, and recommendation shaping.
Apply remains responsible for turning approved recommendations into docs edits and nav updates. The
new contract introduces optional recommendation packs that sit beside the existing markdown analysis
artifact when a recommendation needs more execution context than the inline artifact can carry
comfortably.

**Key Components:**

- **Docs Analysis Artifact:** Reviewer-facing markdown artifact with stable recommendation IDs and
  the complete ordered recommendation set.
- **Recommendation Pack Contract:** Optional per-recommendation detail documents used only for
  complex docs changes.
- **Docs Apply Intake Layer:** Validation and planning logic that reads the markdown artifact first
  and loads packs only when referenced.
- **Regression Coverage:** Contract tests or fixtures that prove recommendation metadata and
  optional-pack behavior survive the analyze -> apply handoff.

### Component Diagram

```text
repo docs surface
    |
    v
oat-docs-analyze
    |-- docs-<timestamp>.md
    `-- optional packs/<recommendation-id>.md
                    |
                    v
             oat-docs-apply
                    |
                    v
         updated docs files / nav changes
```

### Data Flow

Analyze produces one markdown artifact for every run. Each recommendation gets a stable ID. Most
recommendations remain fully represented in the markdown artifact. When a recommendation crosses a
complexity threshold, analyze also emits a companion pack keyed by the same recommendation ID.
Apply builds its recommendation plan from the markdown artifact, then loads a matching pack only
when the artifact says one exists.

```text
1. analyze inventories docs surface and evidence
2. analyze writes markdown artifact with recommendation IDs
3. analyze emits optional packs for complex recommendations
4. user approves recommendations
5. apply reads the markdown artifact and recommendation IDs
6. apply loads optional packs where referenced
7. apply edits docs and runs nav / docs verification
```

## Component Design

### Docs Analysis Artifact

**Purpose:** Remain the canonical reviewer-facing artifact and primary recommendation index.

**Responsibilities:**

- Preserve the complete ordered findings and recommendations list.
- Assign a stable ID to every recommendation.
- Record whether each recommendation is inline-only or backed by a companion pack.
- Continue to carry evidence, confidence, disclosure, and link-target decisions for all
  recommendations.

**Dependencies:**

- Existing docs analysis artifact template.
- Existing docs quality, coverage, and claim-verification workflow.

**Design Decisions:**

- The markdown artifact remains mandatory for every run.
- Recommendation IDs are required for all recommendations, even when no pack exists.
- Optional-pack references are additive metadata, not a replacement for the reviewer-facing artifact.

### Recommendation Pack Contract

**Purpose:** Preserve richer execution context for recommendations that are too dense or nuanced to
fit cleanly inline in the main docs artifact.

**Responsibilities:**

- Capture structured content guidance for complex docs changes.
- Preserve disclosure nuances, anti-patterns, or workflow notes when those materially affect apply.
- Keep recommendation-scoped evidence grouped with the affected docs change instead of forcing apply
  to re-synthesize it from a large artifact section.

**Dependencies:**

- Recommendation IDs from the main artifact.
- A complexity threshold defined by docs analyze.

**Design Decisions:**

- Packs are optional and recommendation-scoped.
- Packs should be emitted only for complex recommendations such as `CREATE`, `SPLIT`, or large
  content-opportunity updates.
- The pack shape should be simpler than the agent-instructions version because docs apply edits prose
  rather than generating multiple provider formats.

### Docs Apply Intake Layer

**Purpose:** Consume the markdown artifact as the baseline plan source and augment it with pack data
only when a recommendation references a pack.

**Responsibilities:**

- Validate recommendation IDs and pack references.
- Build the recommendation plan from the markdown artifact without rediscovering docs conventions.
- Load pack content only for recommendations that reference one.
- Refuse to infer pack-only detail when the pack is missing or stale.

**Dependencies:**

- `oat-docs-apply` analysis-artifact intake.
- Apply plan template and docs editing flow.

**Design Decisions:**

- Apply should always be able to operate on simple recommendations without a pack.
- If a recommendation references a pack and the pack is missing, apply should stop rather than guess.
- Pack presence should tighten the contract for that recommendation, not globally force all
  recommendations into bundle mode.

## Testing Strategy

### Contract and Fixture Coverage

- Add at least one simple docs recommendation fixture that remains inline-only.
- Add at least one complex recommendation fixture that requires a pack.
- Verify that docs apply can build a plan from mixed runs where some recommendations have packs and
  others do not.
- Verify that a missing referenced pack fails clearly instead of degrading into guesswork.

### Key Scenarios

- Simple `UPDATE` recommendation with only inline artifact data.
- Large `CREATE` recommendation with a companion pack carrying content guidance.
- `SPLIT` recommendation where apply needs pack-level migration notes.
- Content-opportunity recommendation with `link_only` or `ask_user` nuance preserved across the
  handoff.
