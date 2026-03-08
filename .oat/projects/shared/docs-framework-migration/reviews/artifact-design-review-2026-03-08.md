---
oat_generated: true
oat_generated_at: 2026-03-08
oat_review_scope: design
oat_review_type: artifact
oat_project: /Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/docs-framework-migration
---

# Artifact Review: design

**Reviewed:** 2026-03-08
**Scope:** Design artifact readiness and alignment with upstream specification for `docs-framework-migration`
**Files reviewed:** 4
**Commits:** n/a

## Summary

The design is substantially fleshed out and generally tracks the spec, but it is not yet implementation-ready. Two P0 requirements are still underdesigned or designed against the wrong content contract, and project bookkeeping has drifted enough that the next workflow step is ambiguous.

**Artifacts used:** `spec.md`, `design.md`, `plan.md`, `state.md`

## Findings

### Critical

- **GFM callout support is designed around the wrong syntax pipeline** (`design.md:93`)
  - Issue: The design says `> [!NOTE]` callouts will be handled by `remarkDirective` + `remarkDirectiveAdmonition` in both the data flow and package responsibilities ([design.md](/Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/docs-framework-migration/design.md#L93), [design.md](/Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/docs-framework-migration/design.md#L132)). The spec requires GFM blockquote callouts as part of FR2 and NFR1, not directive syntax ([spec.md](/Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/docs-framework-migration/spec.md#L73), [spec.md](/Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/docs-framework-migration/spec.md#L141)). As written, the design does not explain how the required authoring syntax is actually parsed or transformed.
  - Fix: Replace this with a concrete blockquote-callout design: name the parser/remark transform that consumes `> [!TYPE]` syntax, define its AST/output contract, and update the testing section so FR2/NFR1 verify that exact syntax rather than directive-based admonitions.
  - Requirement: FR2, NFR1

- **Theme contract does not fully cover the P0 branding and code-block requirements** (`design.md:196`)
  - Issue: FR4 requires configurable branding including colors and a code-block copy button ([spec.md](/Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/docs-framework-migration/spec.md#L88), [spec.md](/Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/docs-framework-migration/spec.md#L92)). The design mentions colors in responsibilities ([design.md](/Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/docs-framework-migration/design.md#L200)), but `BrandingConfig` omits any color surface and no component or extension point is defined for code-block copy behavior ([design.md](/Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/docs-framework-migration/design.md#L205), [design.md](/Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/docs-framework-migration/design.md#L231)). Implementers would have to guess how FR4 is meant to be satisfied.
  - Fix: Expand the theme package contract to define the branding tokens that consumers may set, the supported logo shape, and the exact mechanism for ensuring copy-enabled code blocks in the shared theme.
  - Requirement: FR4, NFR4

### Important

- **`nav.md` ordering is still an open question, leaving FR6 output nondeterministic** (`design.md:286`)
  - Issue: The nav generator responsibilities define traversal and title/description fallbacks, but no ordering rule is part of the designed behavior ([design.md](/Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/docs-framework-migration/design.md#L286)). The open-questions section explicitly leaves ordering undecided ([design.md](/Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/docs-framework-migration/design.md#L535)). That blocks deterministic output, fixture design, and acceptance of FR6.
  - Fix: Choose and document one ordering contract now, such as lexical filesystem order or frontmatter `weight` with lexical fallback, then reflect it in the data model and test scenarios.
  - Requirement: FR6

- **Workflow state and plan bookkeeping are materially out of sync with the design review target** (`state.md:19`)
  - Issue: `state.md` still says the project is awaiting spec approval and that design/plan do not exist ([state.md](/Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/docs-framework-migration/state.md#L19), [state.md](/Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/docs-framework-migration/state.md#L31)), while `design.md` exists and `plan.md` is present but still a placeholder template with unresolved `{...}` sections ([plan.md](/Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/docs-framework-migration/plan.md#L17), [plan.md](/Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/docs-framework-migration/plan.md#L23)). This drift makes the project lifecycle state unreliable and blocks a clean handoff into planning/implementation.
  - Fix: After updating the design, advance `state.md` to reflect the actual phase and replace the template `plan.md` with a real task plan before implementation starts.

### Medium

- **Package-manager-agnostic script wiring is not concretely specified** (`design.md:334`)
  - Issue: FR6 and NFR2 require `oat docs nav generate` to be available as an npm script and to work identically under npm, pnpm, and yarn ([spec.md](/Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/docs-framework-migration/spec.md#L113), [spec.md](/Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/docs-framework-migration/spec.md#L148)). The design says `docs init` will run nav generation and set config fields ([design.md](/Users/thomas.stang/Code/open-agent-toolkit/.oat/projects/shared/docs-framework-migration/design.md#L337)), but it does not define the scaffolded `package.json` script contract or how the CLI is invoked without package-manager-specific assumptions.
  - Fix: Add the generated script shape to the scaffold design, including how `dev` and `build` call nav generation and which executable path is relied on so the contract is testable across npm, pnpm, and yarn.
  - Requirement: FR6, NFR2

### Minor

None

## Alignment Assessment

### Completeness and Readiness

The design covers architecture, components, data flow, testing, migration, and phase breakdowns, so it is close to implementation-ready. It is not fully ready to hand off because two P0 behaviors are still either unspecified or specified against the wrong syntax contract, and the workflow artifacts have not been brought forward to the design/planning phase.

### Spec Alignment

| Requirement | Status | Notes |
|-------------|--------|-------|
| FR1 | aligned | Scaffold flow, template split, and static export path are described. |
| FR2 | partial | Config package is defined, but the callout approach does not match the required GFM authoring syntax. |
| FR3 | aligned | Transform package and unit-test expectations are present, though tabs edge cases should be closed before planning. |
| FR4 | partial | Theme package exists, but colors/copy-button behavior are not concretely designed. |
| FR5 | aligned | Codemod scope, dry-run default, and frontmatter injection are covered. |
| FR6 | partial | Generator behavior is mostly defined, but ordering remains unresolved and script wiring is underdesigned. |
| FR7 | aligned | Config schema extension and update points are documented. |
| FR8 | aligned | MkDocs preservation is represented in both architecture and init behavior. |
| NFR1 | partial | Plain `.md` authoring is preserved in intent, but the required callout syntax path is not actually designed. |
| NFR2 | partial | Package-manager neutrality is stated but not operationalized in scaffold scripts. |
| NFR3 | aligned | Static export concerns are addressed in config, pipeline, and tests. |
| NFR4 | partial | Open-source branding intent is present, but theme branding tokens are incomplete. |
| NFR5 | aligned | Thin-scaffold upgrade path is central to the architecture. |

### Internal Consistency

The artifact is mostly internally consistent, but the callout mechanism and theme contract sections do not match the behavior promised elsewhere in the document. The open question on nav ordering also conflicts with the otherwise prescriptive tone of the CLI output contract.

### Workflow / Bookkeeping Drift

Material drift is present. `design.md` exists, but project state still reports design/plan as absent, and `plan.md` has not been converted from template form into executable tasks.

## Verification Commands

Run these after updating the artifacts:

```bash
sed -n '85,170p' .oat/projects/shared/docs-framework-migration/design.md
sed -n '192,340p' .oat/projects/shared/docs-framework-migration/design.md
sed -n '447,466p' .oat/projects/shared/docs-framework-migration/design.md
sed -n '17,48p' .oat/projects/shared/docs-framework-migration/state.md
rg -n "TBD|\\{Phase Name\\}|\\{Task Name\\}" .oat/projects/shared/docs-framework-migration/plan.md
```

## Recommended Next Step

Resolve the Critical and Important design gaps, refresh `state.md` and `plan.md`, then rerun the design review. After that, run the `oat-project-review-receive` skill to convert accepted findings into plan tasks if needed.
