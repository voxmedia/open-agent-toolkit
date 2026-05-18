# Directory Assessment Criteria

When does a directory need its own instruction file? Use these criteria to identify coverage gaps during analysis. The full guidance lives in `docs/agent-instruction.md` — this is a distilled, actionable checklist.

Apply these criteria **per directory, at every depth** — not just to top-level apps and packages. A nested subdirectory such as `packages/<pkg>/src/<domain>/` is assessed with exactly the same indicators as a top-level package. The size of a directory's parent never gates whether that directory is evaluated.

## Primary Indicators (any one = likely needs instructions)

### 1. Has Own Build Configuration

- Contains `package.json`, `tsconfig.json`, `Cargo.toml`, `go.mod`, or similar
- Has its own build/test/lint commands distinct from the root
- **Signal strength:** Strong — this is a semi-independent unit with its own workflow

### 2. Different Tech Stack from Parent

- Uses a different language, framework, or runtime than the parent directory
- Example: root is TypeScript/Node but this directory is Python or Rust
- **Signal strength:** Strong — agents need different conventions and commands

### 3. Public API Surface

- Exposes APIs consumed by external callers (REST endpoints, library exports, CLI commands)
- Has consumers outside the repo or outside the directory
- **Signal strength:** Strong — API contracts and conventions must be explicit

### 4. Distinct Domain Boundary

- Represents a bounded context or module with domain-specific business logic
- Has its own data models, terminology, or invariants
- Has non-obvious conventions an agent would otherwise miss — patterns that diverge from the parent's defaults
- **Applies at any depth.** A top-level package and a nested domain subdirectory are assessed the same way: `packages/billing/`, `services/auth/`, `lib/search-engine/`, **and** `packages/<pkg>/src/<domain>/` (for example, a `bigquery-sync/` or `payment-reconciliation/` subdirectory inside an otherwise modest package).
- **Signal strength:** Strong — this is the primary trigger for a nested instruction file. A bounded domain with its own models, terminology, invariants, and non-obvious conventions warrants a file **at any depth, regardless of how large or small its parent is**. Domain specificity, not parent size, decides this.

### 5. Significant Codebase

- Contains a substantial body of code (loosely, 10+ source files) with specialized conventions
- Has patterns or conventions that differ from the rest of the repo
- **Signal strength:** Moderate — a larger directory benefits more from explicit guidance, but only when it has conventions of its own
- **File count is never sufficient on its own.** A directory with many files that all mirror the parent's conventions is not a trigger — there is nothing distinct to capture. This indicator only fires alongside genuinely divergent, non-obvious conventions. Treat the "10+" figure as a loose illustration of "non-trivial", not a precise threshold.

## Nested Instruction Files (Progressive Specificity)

Instruction files form a hierarchy. A root `AGENTS.md` carries repo-wide conventions; deeper files carry progressively more specific guidance for the subtree they scope. **Deeper = more specific, never broader.**

A nested instruction file **inherits everything from its ancestors** and contains **only the domain-specific delta** — the conventions, models, terminology, and invariants that are true for that subtree and are not already captured (or are contradicted) above it. A child file must **not repeat** the parent: no copied conventions, no restated repo-wide rules. See `references/docs/agent-instruction.md` §13 ("Scoped Files (When and How)") for the full progressive-disclosure model.

Because a nested file is small and additive — it adds a thin delta rather than a full document — **the cost of adding one is low**. The decision bar is therefore qualitative, not size-based:

> Would an agent working only from the nearest existing (ancestor) instruction file get something wrong, or miss something, in this directory's domain?

If yes, the directory is a coverage-gap candidate. If no — the ancestor file already covers everything an agent needs here — it is not, regardless of how many files the directory contains.

**Worked example.** A package has ~29 source files overall and a root-level `AGENTS.md` describing the package's general conventions. Inside it, `src/bigquery-sync/` holds ~15 files implementing BigQuery sync: it has its own data models, its own terminology (sync cursors, watermark tables, backfill windows), and non-obvious invariants (ordering guarantees, idempotency keys, partition-boundary handling) that appear nowhere else in the package. The parent package is well under any "large" bar, so an app/package-only or size-gated reading would conclude "no nested file warranted." That conclusion is wrong: an agent editing `src/bigquery-sync/` from the package-level `AGENTS.md` alone would miss the sync invariants and likely introduce a correctness bug. `src/bigquery-sync/` is a legitimate coverage-gap candidate — it meets Indicator 4 — and should be surfaced with a scoped `AGENTS.md` recommendation that captures only the sync-specific delta.

## Decomposing Broad Recommendations

When an area you would recommend a single instruction file for actually spans **distinct sub-areas**, decompose the recommendation: assess and recommend per sub-area instead of writing one broad, vague file. The trigger for decomposition is **heterogeneity**, not file count.

Decompose when the area's subdirectories differ by:

- tech stack or runtime (for example, an embedded React client vs Node server code)
- dominant file-type patterns (for example, resolvers vs repositories vs jobs)
- build or tooling configuration (separate tsconfigs, bundlers, framework configs)
- domain boundary or API surface

When you find heterogeneity, assess its major subdirectories starting at depth 1–2 before writing a single broad recommendation. If the first pass still leaves a sub-area that is clearly heterogeneous, keep decomposing deeper until the distinct conventions are visible or the analysis stops yielding materially different guidance. A homogeneous area — even a large one — needs only one recommendation; there are no distinct sub-areas to split out.

Record distinct sub-areas in the coverage gap assessment. A scoped `AGENTS.md` recommendation for a heterogeneous area should enumerate the major sub-areas and their conventions, not just report a total file count.

## Secondary Indicators (strengthen the case but not sufficient alone)

### 6. Has Specialized Testing Patterns

- Uses different test frameworks or patterns than the root
- Has integration tests, E2E tests, or performance tests with specific setup requirements

### 7. Has Deployment or Infrastructure Concerns

- Contains IaC, deployment configs, or CI/CD pipelines
- Has environment-specific configuration

### 8. Multiple Contributors with Different Conventions

- Directory is a common source of style inconsistencies or review feedback
- Has implicit conventions that are not documented anywhere

## Assessment Output

For each directory meeting 1+ primary indicators:

| Directory | Indicators       | Severity    | Recommendation                                     |
| --------- | ---------------- | ----------- | -------------------------------------------------- |
| `{path/}` | {which criteria} | High/Medium | Create scoped AGENTS.md / Create rules for {topic} |

**Severity mapping:**

- **High:** Primary indicators 1-3 (own build, different stack, public API) — these are clear gaps
- **Medium:** Primary indicators 4-5 (domain boundary, significant codebase) — beneficial but not urgent

## Exclusions

Do NOT flag these as needing instructions:

- `node_modules/`, `dist/`, `build/`, `.git/` — generated/external
- Directories that merely follow their parent's conventions with nothing distinct to capture — regardless of size. If an agent working from the nearest ancestor instruction file would already do the right thing here, a nested file would only repeat the parent.
- Test directories that follow the same patterns as their parent — covered by parent instructions
- Directories already covered by a parent's scoped rules (e.g., Cursor rule with `globs: packages/cli/**`)

**Anti-sprawl:** Do not recommend an instruction file for a directory just because it contains many files. File count alone is never a trigger. If those files all follow the parent's conventions — no distinct domain, no divergent patterns, nothing an agent would get wrong from the ancestor file — the directory is excluded no matter how large it is. The positive trigger is always distinct, non-obvious conventions worth capturing, not size.
