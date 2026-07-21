# Fact base

## Confirmed claims

- **design:** ---
  oat_status: complete
  oat_ready_for: oat-project-plan
  oat_blockers: []
  oat_last_updated: 2026-07-17
  oat_generated: false
  oat_template: false

---

# Design: explainer-kit

## Overview

The implementation keeps the proven engine/adapter split from discovery and
makes the boundary concrete. `explainer-kit` is a canonical generic skill with
bundled schemas, recipes, curated styles, templates, validators, QA helpers,
and an `s3-static` connector. It receives a complete run request plus transient
provider-neutral execution seams, produces a tracked artifact package, and
reads no OAT, user, vault, or destination config. `oat-explainer-kit` resolves
OAT configuration and project state, derives canonical paths, binds OAT
artifacts to generic recipe inputs, validates unattended author cardinality,
and invokes the core.

The stable extension seam is deliberately small: versioned inputs in; a
versioned artifact tree, manifest, build record, and optional publish receipt
out. The private wrapper performs personal preset/vault/Google Docs work before
and after core invocation. V1 adds no plugin registry or mid-pipeline callback
API.

The design does not claim deterministic rendering. It preserves the inputs and
intermediate content needed to iterate or rebuild, labels each rendered output
honestly, and treats durability as a separate stage. Autonomous recap failure
is a recorded product outcome, not a project-run failure.

## Architecture

### System Context

`explainer-kit` and `oat-explainer-kit` are bundled skills distributed by the
existing OAT CLI. No new npm package or service is introduced. Shared runtime
logic stays inside the core skill directory so direct callers receive the same
implementation as the OAT adapter.

**Key Components:**

- **Core Orchestrator:** Runs fact-base, authored content, theme, build, QA,
  durability, and optional publish stages from explicit inputs. Every
  unattended run requires one provider-neutral author callback; interactive
  runs retain the human review path.
- **Contract Validators:** Validate strict versioned JSON contracts, safe
  paths, hashes, and cross-record consistency.
- **Recipe Registry:** Defines generic source requirements, minimum narrative
  content, artifact types, and template bindings.
- **Theme Resolver:** Compiles one of four curated named styles, supplied
  bundles, deprecated palette/profile compatibility selections, and optional
  art direction into one concrete resolved theme.
- **Render and QA Assets:** Neutral production shells, build orchestration,
  structural checks, browser probes, and cohesion checks.
- **Artifact Recorder:** Writes the manifest and privacy-safe stage outcomes
  and updates them atomically.
- **S3 Static Connector:** Mirrors the `site/` subtree to corresponding roots,
  verifies it, and writes a receipt.
- **OAT Adapter:** Resolves typed config, project paths, lifecycle intent, and
  OAT source bindings.
- **Lifecycle Callers:** Planning, implementation-tail, autonomous, and
  completion workflows invoke the adapter at defined gates.
- **Release Validation:** Exercises canonical and packaged layouts, schemas,
  neutral templates, wrapper compatibility, and live acceptance evidence.

### Component Diagram

```text
OAT lifecycle skills ───────────────┐
                                    ▼
                             oat-explainer-kit
                          ┌─────────┴─────────┐
                          │ config + state   │
                          │ source bindings  │
                          └─────────┬─────────┘
                                    │ ExplainerRunRequestV1
Direct/private caller ──────────────┤
                                    ▼
                              explainer-kit
 ┌───────────┐  ┌─────────┐  ┌──────────┐  ┌─────────────┐
 │ fact base │→ │ author/ │→ │ resolved │→ │ render + QA │
 │ + critic  │  │ review  │  │ style    │  │             │
 └───────────┘  └─────────┘  └──────────┘  └──────┬──────┘
                                                   ▼
                                         artifact package
                                   manifest + build record + site/
                                                   │
                         ┌─────────────────────────┴────────────┐
                         ▼                                      ▼
                private post-processing                  s3-static connector
             vault notes / Google Docs                 sentinel → mirror → verify
                                                               │
                                                               ▼
                                                        publish receipt
```

### Data Flow

1. A caller constructs `ExplainerRunRequestV1` from explicit runtime inputs.
   The OAT adapter obtains each stored value through `oat config get --json` so
   value and source remain observable.
2. Strict validation normalizes the slug, roots, recipe ID, source set, theme
   selection, and optional publish request. Validation completes before output
   mutation.
3. The core creates `<outputRoot>/<slug>/` and an atomic build-record staging
   file. OAT callers derive `outputRoot`; generic callers provide it.
4. A supplied fact base receives a light consistency/freshness check. Otherwise
   the core federates sources, reconciles contradictions, runs the critic, and
   records operator overrides.
5. The recipe produces one approved content model per artifact. For every
   unattended run, the core invokes a provider-neutral author once per artifact
   with a validated `AuthorRequestV1`, validates the structured
   `AuthorResultV1`, rejects section-local source dumping, and retains the
   result as provenance before writing Markdown. Interactive runs may omit an
   author and retain the existing Markdown review gate.
6. Curated style selection compiles to `theme.resolved.json`; `clean-neutral`
   is the visible default. A supplied bundle has highest precedence, an
   explicit style wins over deprecated palette/profile compatibility inputs,
   and default or deprecated selection emits a warning. Raw natural-language
   art direction remains transient; only its hash and the resolved bundle hash
   are stored by default.
7. Builders render into `site/`, then structural, browser-layout, accessibility,
   and cross-set checks run. Every stage updates `build-record.json`
   atomically.
8. `manifest.json` binds source hashes, content hashes, theme hash, artifact
   hashes, rebuildability, and the generic run outcome.
9. For commit durability, the caller commits the generated paths and submits
   evidence for core verification. For publish durability, the connector
   returns verified evidence. `built-durable` is set only after verification.
10. The S3 connector verifies a run-unique sentinel, additively uploads the
    declared `site/` files, verifies every manifest artifact URL, and atomically
    writes `publish-receipt.json`.
11. Private wrappers consume the manifest and receipt for companion notes,
    Google Docs, and personal link maintenance.

### Artifact Layout

```text
<output-root>/<slug>/
├── run-request.json
├── source/
│   ├── fact-base.md
│   ├── fact-base.json
│   ├── overrides.json
│   ├── content-approval.json
│   ├── author/
│   │   └── <artifact-id>.json
│   └── content/
│       └── <artifact-id>.md
├── theme.resolved.json
├── manifest.json
├── build-record.json
├── publish-receipt.json          # present only after publish
└── site/                         # exact publish mirror root
    ├── initiatives/<slug>/index.html
    ├── initiatives/<slug>/catalog.json
    ├── diagrams/<slug>/<id>/index.html
    ├── explainers/<slug>/index.html
    └── decks/<slug>/<id>/index.html
```

Project runs use
`<resolved-project-path>/explainers/<slug>/`. Non-project OAT runs use
`.oat/repo/reference/explainers/<slug>/`. Direct callers pass `outputRoot`.

Repo-level explainers are durable reference products. Completion-time project
recap records live separately under `.oat/repo/reference/project-recaps/`.

Shared-project and repo runs track the complete run directory, including
`site/`; the implementation does not write `.gitignore` rules for them.
Local-project runs inherit the local project root's ignored/untracked posture,
so commit durability is unavailable unless the caller first relocates the run
to a tracked root. Direct callers own ignore policy for their output root and
may ignore only outputs whose manifest entries are both rebuildable and safely
reproduced elsewhere.

Each run owns its slug-scoped `catalog.json`. Aggregating catalogs across runs
or maintaining a destination-wide initiative index is out of scope for v1.

### Archive-Safe Final Location

Active project output remains under
`<resolved-project-path>/explainers/<slug>/`. When
`oat-project-complete` archives a shared project, `oat project archive` owns an
additional export of the selected final `project-recap` run before deleting the
active tree:

```text
.oat/repo/reference/project-recaps/<YYYYMMDD-project-slug>/
└── <complete selected project-recap package>
```

The base directory name uses the same `buildArchiveSnapshotName` identity as
project-summary exports. An existing destination is an error: the command does
not overwrite, merge, or invent a second completion snapshot for the same
project/date. The command copies the complete selected recap package, including
failed-run outcome records and successful intermediates, verifies every built
manifest artifact hash, and reports the tracked export root. Export writes to a
temporary sibling and atomically renames into place only after verification;
failure removes the staging path and leaves no partial destination. A
destination, copy, or verification failure fails archival before the active
project is removed. The gitignored archive remains local history and is never a
durable link target.

Project explainers are working artifacts. They are committed while useful to an
active shared project, but completion intentionally removes them from the
tracked branch with the rest of the project plans/designs. They remain in the
local archived project and are not re-attested or linked as post-completion
reference products.

Only shared projects enter this archive/export path. Local projects are not
archived by `oat-project-complete`; their explainer packages retain the local
project's untracked durability posture and must remain `built-not-durable`
unless verified publish evidence exists.

Manifest paths remain relative to each run root, so relocation does not rewrite
content/artifact entries. Commit durability evidence does carry repository
paths; for the selected recap it is re-attested against the tracked export
commit and supersedes evidence for the deleted active path. Summary and
archive-aware PR links point to the tracked recap export.

## Component Design

### Core Orchestrator

**Purpose:** Execute one validated recipe run without ambient configuration.

**Responsibilities:**

- Locate only bundled assets relative to the core skill directory.
- Validate the complete run request before creating the run directory.
- Require an author callback for unattended runs before narrative output while
  keeping the core's own fail-closed behavior independent of adapters.
- Execute stages in order and preserve successful intermediates.
- Maintain atomic manifest/build-record updates.
- Enforce human gates for interactive content approval and all publishing.
- Return a concise outcome with paths and recovery guidance.

**Interface:**

```typescript
interface ExplainerCore {
  run(
    request: ExplainerRunRequestV1,
    options?: ExplainerCoreRunOptionsV1,
  ): Promise<ExplainerRunResultV1>;
  recordDurability(
    request: DurabilityEvidenceRequestV1,
  ): Promise<ExplainerRunResultV1>;
}

interface ExplainerCoreRunOptionsV1 {
  author?: ExplainerAuthorV1;
  critic?: ProviderNeutralCriticV1;
}

interface ExplainerRunResultV1 {
  runRoot: string;
  manifestPath: string;
  buildRecordPath: string;
  publishReceiptPath?: string;
  outcome: 'built-durable' | 'built-not-durable' | 'failed' | 'incomplete';
  warnings: string[];
}
```

The skill-level interface may populate the request from invocation arguments or
`EXPLAINER_*` environment variables, but downstream helpers consume one
normalized request file. Environment variables are compatibility inputs, not a
second internal model.

**Dependencies:**

- Bundled schemas, recipes, templates, and scripts
- Node.js standard library and available agent workflow primitives
- Optional browser tooling for render QA

**Design Decisions:**

- Normalize once into a request file so wrappers do not couple to shell
  environment details.
- Resolve bundled paths from the installed skill root, never repository source.
- Use atomic temp-file rename for manifest/record updates so interruption does
  not leave valid-looking partial JSON.

### Contract Validators

**Purpose:** Enforce closed, versioned, privacy-safe contracts at every external
boundary.

**Responsibilities:**

- Validate request, fact-base metadata, author request/result, theme, manifest,
  build record, durability evidence, publish request, and publish receipt.
- Reject unknown required schema versions and unknown object keys.
- Normalize hashes, URLs, roots, and relative paths.
- Enforce cross-record invariants such as artifact hash agreement and
  durability evidence.
- Emit JSON errors for scripts and actionable prose for skill callers.

**Interface:**

```typescript
type ContractKind =
  | 'run-request'
  | 'fact-base'
  | 'theme'
  | 'manifest'
  | 'build-record'
  | 'durability-evidence'
  | 'publish-request'
  | 'publish-receipt'
  | 'author-request'
  | 'author-result';

interface ValidationResult {
  valid: boolean;
  normalizedPath?: string;
  errors: Array<{ path: string; code: string; message: string }>;
}
```

**Design Decisions:**

- Schema identifiers include the major contract version. V1 readers reject
  unsupported majors rather than guessing.
- Rebuild commands are argv arrays, never shell strings.
- Relative paths are POSIX-form, have no leading slash, contain no `..`
  segment, and must resolve under their declared root after symlink checks.

### Fact-Base and Content Pipeline

**Purpose:** Produce one authoritative cited input and narrative content before
rendering.

**Responsibilities:**

- Reconcile federated sources with explicit freshness precedence.
- Run adversarial contradiction and stale-snapshot checks.
- Record operator-confirmed overrides separately from raw sources.
- Construct one validated author request per artifact for unattended runs.
- Validate exact section IDs, substantive prose, artifact identity, and
  non-secret provenance before serializing per-artifact Markdown content.
- Reject section-local normalized word-shingle overlap that indicates source
  dumping while allowing concise fact-preserving prose.
- Apply the plain-language edit and maintain consistent terms/numbers.

**Interfaces:**

```typescript
interface FactBaseBindingV1 {
  mode: 'supplied' | 'federated';
  path?: string;
  sources?: SourceBindingV1[];
  freshnessPolicy: 'live-wins';
}

interface SourceBindingV1 {
  id: string;
  kind: 'file' | 'directory' | 'git' | 'github' | 'session' | 'other';
  locator: string;
  revision?: string;
  authoritativeFor?: string[];
}

type ExplainerAuthorV1 = (
  request: AuthorRequestV1,
) => AuthorResultV1 | Promise<AuthorResultV1>;

interface AuthorRequestV1 {
  schemaVersion: 'explainer-kit.author-request/v1';
  run: { runId: string; slug: string };
  recipe: {
    id: string;
    version: string;
    requiredNarrative: string[];
  };
  artifact: {
    id: string;
    type: 'hub' | 'diagram' | 'explainer' | 'deck' | 'catalog';
  };
  narrativeOutline: Array<{ id: string; title: string }>;
  factBase: FactBaseV1;
  discovery: {
    rounds: number;
    findings: string[];
    reason: 'not-requested' | 'two-empty-rounds' | 'hard-maximum';
  };
}

interface AuthorResultV1 {
  schemaVersion: 'explainer-kit.author-result/v1';
  artifactId: string;
  content: {
    title: string;
    description: string;
    eyebrow?: string;
    footer?: string;
    sections: Array<{ id: string; title: string; prose: string }>;
    artifactLinks?: Array<{
      id: string;
      type: 'hub' | 'diagram' | 'explainer' | 'deck' | 'catalog';
      label: string;
    }>;
  };
  provenance: {
    authorId: string;
    generatedAt: string;
    method?: string;
    model?: string;
  };
}
```

**Design Decisions:**

- `fact-base.md` is human-readable; `fact-base.json` stores citations, source
  hashes, unresolved claims, and contract metadata.
- Executable author callbacks and module paths remain transient and never enter
  `run-request.json`; validated author results are retained under
  `source/author/` and covered by immutable hashes.
- Every unattended run requires an author, regardless of recipe. Interactive
  runs may omit one because explicit human review still gates rendering.
- Content Markdown remains tracked even when rendered HTML is ignored.

### Recipe Registry

**Purpose:** Describe what a product contains without embedding OAT paths.

**Responsibilities:**

- Validate recipe IDs and recipe schema versions.
- Declare source roles, required narrative sections, artifact definitions, and
  template/profile compatibility.
- Expose canonical `project-explainer` and `project-recap`.
- Allow adapters to bind caller-specific sources to generic roles.

**Interface:**

```typescript
interface ExplainerRecipeV1 {
  schemaVersion: 'explainer-kit.recipe/v1';
  id: string;
  sourceRoles: Array<{
    role: string;
    required: boolean;
    accepts: SourceBindingV1['kind'][];
  }>;
  requiredNarrative: string[];
  artifacts: Array<{
    id: string;
    type: 'hub' | 'diagram' | 'explainer' | 'deck';
    template: string;
    required: boolean;
  }>;
}
```

`project-recap.requiredNarrative` contains the six confirmed accountability
elements. `project-explainer` emphasizes planned architecture, decisions,
risks, phases, and validation approach. OAT path knowledge lives only in the
adapter's source-role binding.

`project-recap` binds exactly one project source set. A multi-project
bird's-eye recap is a different product: the wave project owns the future
`program-recap` recipe and its lifecycle integration. That recipe can extend
this registry and use `FactBaseBindingV1.mode: 'supplied'` without changing the
v1 request, fact-base, theme, or manifest contracts.

### Theme Resolver

**Purpose:** Convert a curated style or compatibility selection into one
replayable concrete theme.

**Responsibilities:**

- Load one of `clean-neutral`, `business-corporate`, `navy-ocean`, or
  `dark-edgy`, or a caller-supplied bundle.
- Continue loading named palettes and profiles only for deprecated
  compatibility callers.
- Apply natural-language art direction as a compile-time transformation.
- Validate semantic completeness, contrast, numeric ranges, and template
  compatibility.
- Persist concrete values and privacy-safe provenance hashes.
- Warn on per-artifact deviation from the artifact-set theme.

**Resolution Order:**

1. Explicit resolved theme bundle input
2. Explicit curated `style`
3. Deprecated palette/profile compatibility selection when no style is present
4. Bundled `clean-neutral` default

A supplied bundle wins over all named selections. An explicit style wins over
deprecated palette/profile inputs. Each conflict, use of legacy inputs, and
implicit fallback to `clean-neutral` emits a visible warning.

**Design Decisions:**

- Light/dark are modes within one semantic palette, not unrelated palettes.
- `renderStrategy` defaults to `default-only`; callers can explicitly request
  `user-switchable`. The normalized run request and build record persist this
  rendering choice, while the resolved bundle always contains both validated
  modes. Render strategy is excluded from bundle identity and derived-preset
  promotion.
- V1 ships four complete curated systems spanning color, typography, density,
  geometry, component accents, motion, and diagram treatment. The old
  palette/profile matrix remains compatibility-only.
- Raw art direction is excluded from public records unless the caller
  explicitly opts into retaining it in a private output.

### Renderer and QA

**Purpose:** Produce self-contained neutral artifacts and prove structural and
visual fitness.

**Responsibilities:**

- Render approved content into neutral house, deck, diagram, or engineer-tour
  shells.
- Keep all CSS/JS local and inline in final HTML.
- Apply absolute cross-links from `publicBaseUrl` only when supplied; build-only
  artifacts also work from local HTTP.
- Run structural token/link/markup/leak checks.
- Run browser layout probes with motion disabled and representative viewports.
- Run cross-set terminology, number, and status cohesion checks.

**Design Decisions:**

- Examples move to `examples/` and use `example.com`; production templates
  contain only documented tokens.
- Unknown-size discovery remains bounded by two consecutive no-new-findings
  rounds and a recipe-level maximum.
- `rebuildable` defaults to `false` for agent-authored rendering. A renderer may
  claim `true` only when release validation can replay its argv/input hashes.

### Artifact Recorder

**Purpose:** Make provenance, partial success, durability, and recovery
machine-readable.

**Responsibilities:**

- Initialize stage state before work begins.
- Record stage start/end, warnings, errors, outputs, and recovery instructions.
- Hash all material inputs and outputs.
- Derive one generic run outcome independently from project lifecycle.
- Verify commit or publish evidence before setting `built-durable`.

**Design Decisions:**

- `manifest.json` describes products and provenance; `build-record.json`
  describes execution. They remain separate so public manifests stay compact.
- A failed render still has a valid manifest if the tracked source package was
  created; its artifact list may contain failed entries.
- The OAT adapter translates the generic outcome into recap language at
  lifecycle call sites; the core contract remains product-agnostic.

### S3 Static Connector

**Purpose:** Publish one completed `site/` tree to corresponding S3/public roots.

**Responsibilities:**

- Validate provider-specific input and the manifest before network access.
- Upload and publicly verify a sentinel unique to the run ID.
- Additively upload all declared files under `site/` with explicit MIME/cache
  metadata.
- Verify every published artifact declared by the manifest.
- Produce a receipt that maps relative paths to S3 and public URLs.

**Interface:**

```typescript
interface PublishConnectorV1 {
  provider: 's3-static';
  publish(input: S3StaticPublishRequestV1): Promise<PublishReceiptV1>;
}
```

**Design Decisions:**

- The connector receives complete roots; it does not infer CloudFront
  `originPath` topology.
- The sentinel is deleted after successful correspondence validation.
- Publishing is idempotent for the current manifest and non-destructive outside
  it: no root-wide `--delete`, no deletion of undeclared objects, and no
  overwrite of an undeclared path.
- Upload may retry bounded transient object operations, but auth, permission,
  root-correspondence, and public verification errors fail immediately.
- No connector may auto-publish from a lifecycle hook without a human gate.

### OAT Adapter

**Purpose:** Translate OAT config, project state, and artifacts into the generic
core contract.

**Responsibilities:**

- Check installed core presence and minimum compatible major/minor version.
- Resolve each supported config key through `oat config get --json`.
- Apply source-sensitive path handling and adapter cross-field validation.
- Derive project/non-project output roots.
- Bind OAT artifacts to generic recipe source roles.
- Resolve lifecycle intent and invoke the core.
- Accept either an in-process `author` or JSON-safe `authorModulePath`; reject
  two seams in all modes and reject zero seams for unattended calls before
  core invocation. Interactive calls may omit both.
- Own one shared tracked-run finalizer so planning, implementation, and
  completion callers do not improvise commit/durability choreography.

**Tracked-Run Finalizer:**

```typescript
interface FinalizeTrackedExplainerRunV1 {
  runRoot: string;
  manifestPath: string;
  commitMode: 'dedicated' | 'completion-bookkeeping';
  relocatedFrom?: string;
}
```

For a normal plan/implementation run, the finalizer creates a dedicated artifact
commit (`docs(oat): persist <recipe> for <project>`), calls
`recordDurability` with that commit and the generated paths, then commits the
manifest/build-record evidence update. For completion-time runs, the existing
lifecycle bookkeeping commit is the artifact commit; the evidence update is a
second commit. Both commits are pushed together. The core verifies commits but
never creates them.

If evidence verification fails, the run remains `built-not-durable`; the
failure is warned and recorded without blocking project completion. The
artifact commit is still pushed. A later attestation can update the same
manifest.

**Config Surface:**

| Key                                    | Type                                                       | Allowed scopes    | Built-in      |
| -------------------------------------- | ---------------------------------------------------------- | ----------------- | ------------- |
| `explainers.defaults.style`            | `clean-neutral\|business-corporate\|navy-ocean\|dark-edgy` | local/shared/user | clean-neutral |
| `explainers.defaults.palette`          | non-empty string or null (deprecated)                      | local/shared/user | null          |
| `explainers.defaults.visualProfile`    | non-empty string or null (deprecated)                      | local/shared/user | null          |
| `explainers.defaults.themeBundlePath`  | path                                                       | local/shared      | unset         |
| `explainers.publish.provider`          | `s3-static`                                                | shared            | unset         |
| `explainers.publish.s3Uri`             | normalized `s3://` URI                                     | shared            | unset         |
| `explainers.publish.publicBaseUrl`     | `https://` URL                                             | shared            | unset         |
| `explainers.publish.awsRegion`         | non-empty string                                           | shared            | unset         |
| `explainers.publish.awsProfile`        | non-empty string                                           | local/user        | unset         |
| `workflow.explainers.projectExplainer` | `always\|ask\|never`                                       | local/shared/user | ask           |
| `workflow.explainers.projectRecap`     | `always\|ask\|never`                                       | local/shared/user | ask           |

Shared `themeBundlePath` must be repository-relative. Local may be
repository-relative or absolute. User config intentionally has no path-based
theme selection. Runtime inputs may override every key without persistence.
Publish destination roots remain shared-only because they are team topology;
checkout-specific test destinations use explicit runtime overrides rather than
silently changing local config.

**Cross-Field Rules:**

- A theme bundle path overrides configured style and compatibility selections
  with a warning.
- An explicitly configured or runtime style overrides deprecated
  palette/profile selections with a warning.
- Palette/profile remain accepted only as nullable deprecated compatibility
  inputs. If no bundle, explicit style, or legacy input is present, the core
  selects `clean-neutral` and records a default-selection warning.
- Publish is build-only when `provider` is absent.
- If `provider` is set, `s3Uri`, `publicBaseUrl`, and `awsRegion` are required.
- `awsProfile` may remain absent to use the standard AWS credential chain.
- Config cannot select recipe, slug, fact-base path, output root, per-run art
  direction, or private lanes.

### OAT Lifecycle Integration

**Purpose:** Invoke project products at stable lifecycle gates without coupling
the core to OAT.

**Intent Model:**

```typescript
type ExplainerDecisionV1 = {
  decision: 'generate' | 'skip';
  source: 'interactive' | 'kickoff_prompt' | 'autonomous_policy';
  decided_at: string;
};

interface ExplainerProjectStateV1 {
  oat_project_explainer?: ExplainerDecisionV1 | null;
  oat_project_recap?: ExplainerDecisionV1 | null;
}
```

Validation rejects unknown keys, invalid timestamps, invalid decision/source
pairs, and autonomous-policy `skip`. The control-plane exposes both values but
artifact freshness/status remains in `manifest.json`.

**Resolution Function:**

```text
resolve(product, mode, state, preference, kickoffRequest):
  if mode is autonomous and product is recap:
    return generate(source=autonomous_policy)
  if mode is autonomous and product is explainer:
    return kickoff explicitly requested ? generate(kickoff_prompt) : skip
  if valid state intent exists:
    return state intent
  if preference is always:
    return generate
  if preference is never:
    return skip
  return ask-once
```

**Call Sites:**

- **Autonomous kickoff:** `oat-project-autonomous` persists forced recap intent
  immediately after project creation/resolution. It persists explainer intent
  only when the kickoff request explicitly asks for one. Resume reasserts the
  recap policy and warns/records any stale lower-precedence conflict.
- **Interactive planning entry:** `oat-project-plan` resolves
  `projectExplainer` before drafting. `ask` prompts once and persists the
  answer. After plan artifact review and commit, a generate decision invokes
  `project-explainer`. Failure warns and records but does not roll back a valid
  plan.
- **Implementation lifecycle tail:** After final code review and configured
  pre-approval summary/document steps, `oat-project-implement` checks for a
  fresh recap. Autonomous policy invokes `project-recap` before the final HiLL
  boundary. The outcome is included in the completion report; failure never
  blocks approval or later PR steps. A successful run uses the shared
  tracked-run finalizer; if the project is archived later, completion rehomes
  and re-attests the existing package.
- **Interactive completion:** `oat-project-complete` resolves
  `projectRecap` before lifecycle mutation. `ask` joins the existing batched
  completion prompt and persists the answer. A generate decision runs after
  optional summary refresh and before `complete-state`, unless a fresh recap
  manifest already exists. When archive is selected, the completion sequence
  is:
  1. generate or reuse the recap under the active project;
  2. pass that selected recap run to `oat project archive`, which exports only
     its complete package to the tracked dated recap root before deleting the
     active project;
  3. create the existing lifecycle bookkeeping commit containing the export and
     active-tree deletion;
  4. call `recordDurability` for the exported recap manifest using that commit and
     supersede active-path evidence;
  5. commit the evidence updates, then push both commits.
     Without archive, the same two-commit pattern uses the active project paths.
- **Summary visibility:** If `summary.md` exists, recap outcome is appended or
  refreshed in a concise `Explainer Outcome` section. The tracked build record
  remains the durable source of truth when no summary exists. Archive-aware
  summary and PR links use the tracked export root, never
  `.oat/projects/archived/`.

Wave/program callers are not modified in v1. The wave project owns the future
`program-recap` recipe and can later pass the same supplied fact-base contract;
this project does not broaden `project-recap` to cover multi-project products.

### Packaging and Release Validation

**Purpose:** Ensure source and shipped layouts behave identically.

**Responsibilities:**

- Add `explainer-kit` to `UTILITY_SKILLS` and `oat-explainer-kit` to
  `WORKFLOW_SKILLS`.
- Keep bundle-assets script arrays and manifest tests synchronized.
- Include every core schema, recipe, template, script, example, and reference
  under the skill directory.
- Validate versioned skill frontmatter and lockstep package version bumps.
- Install both packs into temporary user/project roots and run against those
  installed paths.

The utility pack remains explicitly installable at user scope; this project
does not change the default scope of unrelated utility skills. Adapter errors
direct private-wrapper users to install/update the utility pack at user scope.

## Data Models

### Run Request

```typescript
interface ExplainerRunRequestV1 {
  schemaVersion: 'explainer-kit.run-request/v1';
  recipe: {
    id: string;
    version: string;
  };
  slug: string;
  outputRoot: string;
  factBase: FactBaseBindingV1;
  theme?: ThemeSelectionV1;
  publicBaseUrl?: string;
  durability?: {
    strategy: 'none' | 'commit' | 'publish';
    publish?: S3StaticPublishRequestV1;
  };
  privacy?: { retainRawArtDirection: boolean };
  mode: 'interactive' | 'unattended';
}

interface ThemeSelectionV1 {
  style?: 'clean-neutral' | 'business-corporate' | 'navy-ocean' | 'dark-edgy';
  /** @deprecated Compatibility only; prefer style. */
  palette?: string;
  /** @deprecated Compatibility only; prefer style. */
  visualProfile?: string;
  suppliedBundlePath?: string;
  artDirection?: string;
  defaultMode?: 'light' | 'dark';
  renderStrategy?: 'default-only' | 'user-switchable';
}

interface DurabilityEvidenceRequestV1 {
  schemaVersion: 'explainer-kit.durability-evidence/v1';
  manifestPath: string;
  evidence:
    | {
        kind: 'commit';
        repoRoot: string;
        commit: string;
        paths: string[];
      }
    | {
        kind: 'publish';
        receiptPath: string;
      };
}
```

**Validation Rules:**

- `slug` is lowercase kebab-case.
- `outputRoot` is explicit and writable; the normalized run root stays inside
  it.
- `recipe.id` must resolve to a bundled or explicitly supplied valid recipe.
- `retainRawArtDirection: true` requires an art-direction input; otherwise the
  request is invalid. A supplied bundle does not invent or retain direction.
- `renderStrategy` defaults to `default-only`. That strategy renders only the
  resolved theme's `defaultMode`; `user-switchable` exposes both validated
  modes.
- Publish settings are complete or absent.
- Commit evidence is submitted only after the caller creates the commit. The
  verifier confirms the referenced commit contains the declared paths at the
  manifest hashes; the core never creates git commits.
- Commit evidence paths identify immutable inputs and built artifacts, not the
  mutable manifest/build-record files that receive the evidence. Their follow-up
  commit makes the attestation durable without requiring evidence about itself,
  so finalization terminates after two commits.

**Storage:** The normalized request is persisted in privacy-safe form under the
run root. Sensitive/transient values are redacted.

### Author Request and Result

The core constructs `AuthorRequestV1` from the validated recipe, artifact,
narrative outline, reconciled fact base, and bounded discovery result. It
invokes the provider-neutral author once per artifact and accepts only a
matching `AuthorResultV1` with exactly the required section IDs and substantive
prose. The callback or module locator is executable invocation state and is
never persisted in the run request.

For unattended calls, direct core callers provide `options.author`; the core
independently fails closed with `E_AUTHOR_REQUIRED` if it is absent. The core
CLI resolves `--author-module`. The OAT adapter accepts either `author` or
`authorModulePath`, validates exactly one for unattended mode before core
invocation, and allows neither for interactive mode. Validated results and
non-secret provenance are retained at `source/author/<artifact-id>.json` and
included in `manifest.immutableHashes`.

### Resolved Theme

```typescript
interface ThemeColorsV1 {
  surface: { canvas: string; panel: string; elevated: string };
  ink: { primary: string; muted: string; inverse: string };
  accent: { primary: string; secondary: string };
  status: {
    success: string;
    warning: string;
    danger: string;
    info: string;
  };
  diagramSeries: string[];
}

interface ResolvedThemeV1 {
  schemaVersion: 'explainer-kit.theme/v1';
  name: string;
  defaultMode: 'light' | 'dark';
  modes: {
    light: ThemeColorsV1;
    dark: ThemeColorsV1;
  };
  provenance: {
    style?: 'clean-neutral' | 'business-corporate' | 'navy-ocean' | 'dark-edgy';
    /** @deprecated Present only for compatibility selections. */
    palette?: string;
    /** @deprecated Present only for compatibility selections. */
    visualProfile?: string;
    derived: boolean;
    instructionHash?: string;
    suppliedBundleHash?: string;
  };
  typography: {
    sans: string[];
    serif: string[];
    mono: string[];
    scale: Record<string, string>;
    lineHeight: Record<string, number>;
  };
  spacing: { unit: number; scale: Record<string, number> };
  geometry: { radius: Record<string, number>; borderWidth: number };
  elevation: { shadows: Record<string, string> };
  density: 'compact' | 'comfortable' | 'spacious';
  motion: {
    enabled: boolean;
    durationMs: Record<string, number>;
    easing: Record<string, string>;
    reducedMotion: 'disable-nonessential';
  };
  diagrams: {
    lineWidth: number;
    nodeGap: number;
    arrowStyle: 'straight' | 'curved';
    labelTreatment: 'inline' | 'boxed';
  };
  bundleHash: string;
}
```

**Validation Rules:**

- Both modes contain the same closed, complete semantic roles.
- Colors use normalized hex values; required text/background pairs meet AA in
  each mode.
- Numeric scales are finite, positive, and bounded.
- Font lists include system fallbacks; rendered pages do not fetch remote
  fonts.
- `bundleHash` is calculated after canonical serialization and excludes itself.

**Storage:** `theme.resolved.json` is tracked beside the manifest.

### Artifact Manifest

```typescript
interface ArtifactManifestV1 {
  schemaVersion: 'explainer-kit.manifest/v1';
  runId: string;
  slug: string;
  recipe: { id: string; version: string };
  createdAt: string;
  source: {
    factBasePath: string;
    factBaseHash: string;
    sourceRevision?: string;
    inputHashes: Record<string, string>;
    authorResultPaths?: string[];
  };
  theme: { path: 'theme.resolved.json'; hash: string; derived: boolean };
  artifacts: ArtifactEntryV1[];
  immutableHashes: Record<string, string>;
  outcome: 'built-durable' | 'built-not-durable' | 'failed' | 'incomplete';
  buildRecord: { path: 'build-record.json'; hash: string };
  publishReceipt?: { path: 'publish-receipt.json'; hash: string };
  warnings: string[];
}

interface ArtifactEntryV1 {
  id: string;
  type: 'hub' | 'diagram' | 'explainer' | 'deck' | 'catalog';
  contentPath: string;
  renderedPath?: string;
  mediaType?: string;
  status: 'built' | 'failed' | 'skipped';
  hash?: string;
  rebuildable: boolean;
  rebuild?: {
    argv: string[];
    cwd: string;
    inputHashes: Record<string, string>;
  };
  durableEvidence?: Array<{
    kind: 'commit' | 'publish';
    ref: string;
    paths: string[];
    attestedAt: string;
    supersedes?: { ref: string; paths: string[] };
  }>;
  failure?: { code: string; message: string; recovery: string[] };
}
```

**Validation Rules:**

- Paths are relative to the run root; rendered paths must be under `site/`.
- `immutableHashes` covers the persisted request, fact-base JSON and Markdown,
  content approval, retained author results, serialized content, resolved
  theme, and built artifacts using exact file bytes.
- `built` requires a hash and existing output.
- `rebuildable: true` requires complete rebuild metadata.
- `built-durable` requires durable evidence for every required
  non-rebuildable artifact.
- Commit evidence is current only while its declared paths exist at the
  referenced repository state. Archive relocation appends verified evidence for
  the export paths and marks prior active-path evidence superseded.
- Manifest and build-record outcomes must agree.

**Storage:** `manifest.json` is tracked.

### Build Record

```typescript
interface BuildRecordV1 {
  schemaVersion: 'explainer-kit.build-record/v1';
  runId: string;
  renderStrategy: 'default-only' | 'user-switchable';
  startedAt: string;
  completedAt?: string;
  stages: Array<{
    id:
      | 'validate'
      | 'fact-base'
      | 'content'
      | 'theme'
      | 'render'
      | 'qa'
      | 'durability'
      | 'publish';
    status: 'pending' | 'running' | 'passed' | 'warned' | 'failed' | 'skipped';
    startedAt?: string;
    completedAt?: string;
    outputPaths: string[];
    warnings: string[];
    error?: { code: string; message: string; recovery: string[] };
  }>;
  outcome: 'built-durable' | 'built-not-durable' | 'failed' | 'incomplete';
}
```

**Validation Rules:**

- Stage transitions are monotonic.
- A failed stage cannot later become passed without a new recorded attempt.
- `renderStrategy` must match the normalized run request and is excluded from
  `ResolvedThemeV1` identity and `bundleHash`.
- Raw prompts, credentials, environment dumps, and unredacted subprocess output
  are forbidden.

**Storage:** `build-record.json` is tracked and atomically replaced.

### Publish Request and Receipt

```typescript
interface S3StaticPublishRequestV1 {
  schemaVersion: 'explainer-kit.publish-request/v1';
  provider: 's3-static';
  s3Uri: string;
  publicBaseUrl: string;
  awsRegion: string;
  awsProfile?: string;
  siteRoot: string;
  manifestPath: string;
}

interface PublishReceiptV1 {
  schemaVersion: 'explainer-kit.publish-receipt/v1';
  provider: 's3-static';
  publishedAt: string;
  roots: { s3Uri: string; publicBaseUrl: string };
  sentinel: {
    relativePath: string;
    uploadVerified: boolean;
    publicVerified: boolean;
    deleted: boolean;
  };
  artifacts: Array<{
    relativePath: string;
    hash: string;
    s3Uri: string;
    publicUrl: string;
    httpStatus: number;
    contentType: string;
  }>;
}
```

**Validation Rules:**

- Roots are normalized without trailing slashes.
- `s3Uri` uses `s3://`; `publicBaseUrl` uses HTTPS except explicit local test
  fixtures.
- Every receipt artifact corresponds to a manifest artifact or catalog file.
- A successful receipt requires sentinel verification and all required
  artifact verifications.
- Sentinel relative paths include the run ID plus an unguessable suffix.
- The connector rejects duplicate relative paths in a manifest and never uses
  root-wide deletion to reconcile a run.

**Storage:** `publish-receipt.json` is tracked after successful publish.

## API Design

This feature adds no HTTP service or database API. Its public interfaces are
skill invocation contracts, JSON files, OAT config keys, and project-state
frontmatter.

### Core Skill Invocation

**Method:** Agent skill invocation

**Request:** `ExplainerRunRequestV1` plus transient execution options.
Unattended callers provide `options.author` in-process or `--author-module` on
the core CLI. Compatibility `EXPLAINER_*` values normalize to the same
data-only request.

**Response:** `ExplainerRunResultV1` plus the persisted artifact package.

**Errors:**

- `E_INPUT_SCHEMA`: unsupported/invalid request
- `E_PATH_ESCAPE`: path leaves its declared root
- `E_RECIPE_UNSUPPORTED`: unknown recipe/version
- `E_FACT_BASE`: reconciliation or supplied-base validation failure
- `E_AUTHOR_REQUIRED`: unattended invocation omitted an author
- `E_AUTHOR_REQUEST`: constructed author input violates its contract
- `E_AUTHOR_RESULT`: author output is malformed or incomplete
- `E_SOURCE_DUMP`: an authored section copies excessive source wording
- `E_THEME`: incomplete/invalid resolved theme
- `E_RENDER`: required artifact rendering failure
- `E_QA`: structural/render/cohesion failure
- `E_DURABILITY`: output built but durability evidence failed
- `E_PUBLISH_AUTH`: credentials unavailable/expired
- `E_PUBLISH_ROOTS`: S3/public roots do not correspond
- `E_PUBLISH_VERIFY`: upload succeeded but public verification failed

Validation/input errors stop before mutation. Later failures preserve prior
stages and return paths to the durable record.

### OAT Adapter Invocation

**Method:** Agent skill invocation with recipe ID, slug, project context, and
optional runtime overrides.

**Request:** Adapter-specific context that resolves to
`ExplainerRunRequestV1`.

**Response:** Core result plus OAT-specific artifact location and intent source.

**Errors:**

- Missing core or incompatible version: fail closed with utility-pack
  install/update command.
- Unattended author cardinality other than exactly one: fail at the adapter
  boundary before core invocation. Interactive invocations may omit an author.
- Invalid author module or export: fail at the adapter boundary without
  persisting the module path.
- Invalid config scope/value: point to `oat config describe <key>`.
- Incomplete publish block: continue only if the user explicitly chooses a
  build-only run; lifecycle auto-runs default to build-only.
- Invalid autonomous recap skip: reject interactively; unattended runs
  override, warn, and record.

### OAT Config API

The CLI registry adds the eleven keys in the config table. `get --json` must
return `{key, value, source}`. `set` enforces allowed surface and scalar type.
`describe` documents precedence, scope, default, owning command, and
cross-field validation ownership. `style` is the primary visual-selection key;
palette/profile remain nullable and explicitly deprecated.

### Project State API

The control-plane parser and project-state validator add typed optional
`oat_project_explainer` and `oat_project_recap` fields. They appear in
`ProjectState` as nullable decisions. Existing projects with absent fields
remain valid.

### Archive Recap Export API

`oat project archive --json` extends its existing result with an optional,
backward-compatible recap export report. `oat-project-complete` supplies the
selected run through `--project-recap-run <project-relative-run-path>`; the
option is absent when recap policy resolves to no generation.

```typescript
interface ArchiveProjectRecapExportV1 {
  sourceRunRoot: string;
  exportRoot: string;
  manifest: {
    relativePath: 'manifest.json';
    verifiedArtifactCount: number;
  };
}
```

The command validates that the selected run is inside the project's
`explainers/` directory and that its manifest recipe is `project-recap`. It
rejects an existing destination, stages to a temporary sibling, hash-verifies,
then atomically renames before active-tree removal. A failed attempt cleans the
staging path. The completion skill uses `exportRoot` to construct commit
evidence and archive-aware links.

## Security Considerations

### Authentication

The core has no authentication system. `s3-static` uses the standard AWS
credential chain and optional profile name. It never accepts access keys,
secret keys, session tokens, or SSO tokens as persisted config.

### Authorization

AWS authorization is evaluated by AWS for the supplied profile/chain. The
connector performs no ACL broadening and never sets public-read. CDN access
policy remains external infrastructure.

### Data Protection

- Shared config may contain team destination roots but no credentials.
- `awsProfile` is restricted to local/user config.
- Raw art-direction text, raw prompts, environment dumps, and credentials are
  excluded from manifests/build records.
- Author callbacks and module paths are never persisted. Retained author
  results contain only validated content and non-secret provenance.
- Fact bases may contain sensitive project facts; publishing uploads only
  `site/`, never `source/` or build records.
- Public templates receive escaped content and validated CSS/token values.

### Threat Mitigation

- **Path traversal/symlinks:** Canonicalize and verify every root and relative
  path before reads, writes, rebuilds, or upload.
- **Shell injection:** Use argv arrays and quote-safe subprocess APIs; never
  execute manifest strings through a shell.
- **Template injection:** Escape untrusted text by context and reject raw script
  insertion from content models.
- **Secret leakage:** Redact known credential forms and deny environment
  serialization.
- **Destination mismatch:** Sentinel-first public verification prevents bulk
  upload to an unverified root pairing.
- **Accidental branding leak:** Token scan plus configurable denylist and seeded
  negative fixture.
- **Over-publishing:** Connector root is fixed to `site/`; it cannot walk
  sibling tracked source files.

## Performance Considerations

### Scalability

The expected set is fewer than 20 HTML artifacts. The core may parallelize
independent artifact renders after content/theme resolution, with a default
concurrency ceiling of four to avoid browser and agent-resource spikes.

### Caching

V1 does not add a cache service. Input and output hashes support safe skipping
of unchanged structural checks and future incremental builds. Publish uses the
manifest to avoid re-hashing unrelated project files.

### Resource Limits

- Fact-base federation and critic fan-out are bounded by caller source count and
  existing agent workflow limits.
- Unknown-size artifact discovery stops after two no-new rounds and a recipe
  maximum.
- Browser QA runs representative viewport/profile combinations rather than the
  full Cartesian product.
- Publish verification uses bounded per-request timeouts and bounded transient
  retries.

### Database Optimization

No database is introduced.

## Error Handling

### Error Categories

- **Input/config errors:** Fail before output mutation with an actionable key,
  path, or schema location.
- **Content errors:** Preserve fact-base/intermediate output; mark the affected
  artifact failed.
- **Render/QA errors:** Preserve source/content/theme; record recovery commands
  and do not claim success.
- **Durability errors:** Mark `built-not-durable`; preserve local output and
  explain commit/publish recovery.
- **Archive export errors:** Fail archival before active-tree deletion. A later
  evidence-attestation failure does not block completion; it leaves the recap
  `built-not-durable` with the tracked export and recovery instructions.
- **External publish errors:** Preserve the complete local package and partial
  receipt diagnostics; never delete local artifacts.
- **Lifecycle policy conflicts:** Interactive invalid intent is rejected.
  Unattended autonomous conflicts are overridden, warned, and recorded.

### Retry Logic

- Validation and policy errors are not retried.
- Agent/renderer retries follow existing bounded orchestration limits and reuse
  the same run record.
- S3 object operations may retry transient network/5xx failures with bounded
  backoff.
- AWS auth, permission, topology, and public-verification errors require human
  correction.
- A new recovery attempt appends stage attempt metadata rather than erasing the
  prior failure.

### Logging

- Info: stage transitions, artifact counts, selected curated style, output
  paths, and verified URLs.
- Warn: overrides, deprecated palette/profile use, implicit style fallback,
  unresolved facts, cohesion deviations, non-durable output, optional artifact
  failures, and autonomous policy corrections.
- Error: concise code/message plus durable record path and recovery steps.
- Never log raw credentials, raw environment, or raw art-direction text by
  default.

## Testing Strategy

### Requirement-to-Test Mapping

| ID   | Verification       | Key Scenarios                                                            |
| ---- | ------------------ | ------------------------------------------------------------------------ |
| FR1  | integration        | Packaged core with no OAT; invalid schema/path/publish inputs            |
| FR2  | integration        | Federated contradictions; supplied fact base; override noise suppression |
| FR3  | integration        | Recipes; per-artifact author contracts; unattended fail-closed behavior  |
| FR4  | unit + visual      | Four curated styles; legacy compatibility; dual-mode/accessibility QA    |
| FR5  | unit + integration | Stage transitions; two-commit evidence; relocation and rebuildability    |
| FR6  | integration + e2e  | Root normalization; sentinel; MIME; live URL receipt                     |
| FR7  | unit + integration | Style config/precedence; deprecated legacy inputs; cross-field errors    |
| FR8  | unit + integration | Active roots; archive export/hash verification; symlinks and traversal   |
| FR9  | unit + integration | Autonomous/interactive precedence, ask-once persistence, stale conflict  |
| FR10 | integration        | Forced render and durability failures still allow project completion     |
| FR11 | integration        | Pack installs; dependency version failure; installed-path invocation     |
| FR12 | fixture + manual   | Wrapper-style pre/post fixture and real external wrapper RC run          |
| FR13 | structural         | Neutral assets, unresolved tokens, denylist and seeded leak              |
| FR14 | manual e2e         | RC evidence, live S3/CDN artifact and receipt                            |
| NFR1 | integration        | Empty environment and config-blind behavior                              |
| NFR2 | security           | Redaction, path/URL/template/subprocess validation                       |
| NFR3 | visual + manual    | Contrast, overflow, clipping, reduced motion, keyboard navigation        |
| NFR4 | integration        | Canonical hashes and replay spot-check selection                         |
| NFR5 | integration        | Honest partial outcomes and top-line completion warning                  |
| NFR6 | release            | Skill/package versions and `release:validate`                            |

### Unit Tests

- Contract normalization and strict schema failures
- Author request/result validation, exact section IDs, and source-dump bounds
- Curated style/compatibility merging, canonical hashes, and contrast
- Config key parsing, surfaces, style precedence, deprecations, and defaults
- Lifecycle decision validation and resolution table
- Artifact status/durability derivation
- Corresponding-root and relative-path mapping
- Secret redaction and template escaping

No numeric coverage threshold is added; all branch-heavy policy and validator
modules receive explicit table-driven cases.

### Integration Tests

- Real temporary directories for core request-to-manifest runs
- Supplied and federated fact-base fixtures
- Direct and module authors, omitted/conflicting author seams, retained
  provenance, and section-local source-dump rejection
- Forced failures at every stage with artifact preservation assertions
- Installed utility/workflows pack layouts
- Adapter use of `oat config get --json`
- Project/repo artifact roots and lifecycle state mutation
- Selected-recap copy-before-delete, exact dated reference root,
  destination-exists rejection, manifest hash verification, and
  atomic-staging cleanup/no-delete-on-failure
- Project explainer exclusion from the tracked post-completion tree
- Two-commit tracked-run finalization and superseded active-path evidence
- Local fake-S3/HTTP harness for mirror and public verification behavior
- Rebuild spot check: sample every deterministic renderer class plus one seeded
  false claim that must fail

### End-to-End Tests

- Build-only canonical recipe run from packaged core
- OAT project plan explainer run from packaged adapter
- Autonomous recap render failure followed by successful project completion
- Successful autonomous recap followed by archival, tracked export, re-attested
  durability, and non-404 archive-aware links
- Operator-run private-wrapper migration against the packaged RC
- One live S3/CloudFront sentinel-and-artifact run with retained receipt

### Visual QA Matrix

- Every curated style in both supported modes against the house shell
- Every curated style against prose, deck, and diagram artifact classes
- Representative deprecated palette/profile combinations for compatibility
- Every new/changed template across desktop and narrow viewport
- Full matrix only for release candidates or changes to shared semantic tokens

## Deployment Strategy

### Build Process

1. Add canonical skills/assets and update both pack manifests.
2. Bundle CLI assets and assert manifest/script consistency.
3. Run lint, format, type-check, tests, skill validation, and build.
4. Run packaged-layout and release validation.
5. Bump changed skill versions and all five lockstep public packages.
6. Produce a packaged release candidate for external acceptance.

### Deployment Steps

1. Install the utility pack at user scope in a clean test root.
2. Install the workflows pack at its intended scope.
3. Run packaged core and adapter build-only smoke tests.
4. Freeze v1 schema/recipe/minimum-core-version values in the RC.
5. Migrate and run the external private wrapper against the RC.
6. Provision/confirm the S3/CloudFront corresponding roots.
7. Run the live sentinel-and-artifact acceptance and retain its receipt.
8. Promote the unchanged passing RC through the normal package release flow.

### Rollback Plan

- Keep `oat-explainer-kit` 0.4.1 installed until both RC gates pass.
- If RC acceptance fails, fix the public seam or external wrapper as
  appropriate and issue a new RC; do not promote the failed candidate.
- If a released regression appears, restore the backed-up 0.4.1 skill and
  reinstall the last known-good packs using the migration runbook.

### Configuration

No new feature flag is required. Missing publish configuration means
build-only. Missing workflow preferences use `ask` interactively; autonomous
mode policy overrides recap preference.

### Monitoring

There is no runtime service dashboard. Operational evidence is:

- build record and manifest for each run
- publish receipt for each publish
- project summary/completion warning for recap failures
- CI/release validation output
- retained RC wrapper and live publish acceptance records

## Migration Plan

No database or data migration is required.

1. Land the public contracts, assets, config/state support, and fixtures.
2. Produce the packaged RC without modifying the operator's installed 0.4.1.
3. Back up 0.4.1 and migrate the private wrapper to request/manifest v1.
4. Run build-only direct-core, OAT-adapter, and private-wrapper smokes.
5. Run the real wrapper E2E and live S3/CDN acceptance.
6. Promote the RC, install the public packs, and only then retire 0.4.1.

The in-repo compatibility fixture is a development guard, not a substitute for
the operator-owned E2E.

Previously published flat-layout sites are not migrated automatically. Because
the connector is additive, their owners may retain them or consciously
republish under the typed v1 layout without destructive collisions.

## Open Questions

No design-blocking questions remain. The four curated style IDs and
palette/profile deprecation behavior are frozen Revision 1 contracts.
Implementation may tune the browser viewport list and rebuild spot-check sample
size without changing the contracts or acceptance boundaries.

## Implementation Phases

### Phase 1: Contracts, configuration, and packaging skeleton

**Goal:** Establish closed public seams before moving the working renderer.

**Tasks:**

- Add core/adapter canonical skill skeletons and pack entries.
- Implement versioned schema validators and fixtures.
- Add config registry/resolution and project-state intent types/validation.
- Add packaged dependency/version checks and installed-layout tests.

**Verification:** Config/state table tests, schema negative fixtures, bundle
consistency, and clean user-scope core install pass.

### Phase 2: Core pipeline, theme system, and neutral assets

**Goal:** Produce complete build-only artifact packages from both canonical
recipes.

**Tasks:**

- Evolve the fact-base/content pipeline and recipe registry from the drafts.
- Implement four curated styles, deprecated palette/profile compatibility, and
  default-only/user-switchable render strategies.
- Neutralize production templates and externalize examples.
- Implement manifest/build-record persistence, render QA, leak checks, and
  durability classification.

**Verification:** Packaged build-only recipe runs, theme visual matrix,
forced-stage failures, leak fixture, and artifact contract validation pass.

### Phase 3: OAT adapter and lifecycle integration

**Goal:** Make project explainer/recap behavior available through OAT policy.

**Tasks:**

- Implement config-to-request translation and canonical path derivation.
- Bind project artifacts to recipe source roles.
- Implement the shared two-commit tracked-run finalizer.
- Add interactive plan and completion resolution.
- Add autonomous kickoff intent and non-blocking lifecycle-tail recap.
- Extend CLI-owned archival to export and hash-verify only the selected final
  `project-recap` package before active-tree removal, report the tracked
  reference root, and re-attest its manifest.
- Surface recap outcome in completion reporting and summary when present.

**Verification:** Full precedence matrix, ask-once behavior, fresh-manifest
deduplication, autonomous failure completion, and archive-safe durability tests
pass.

### Phase 4: Publishing, documentation, and release validation

**Goal:** Complete the public connector and repository-level quality gates.

**Tasks:**

- Implement sentinel-first additive `s3-static` upload/verify/receipt flow.
- Add destination topology examples and migration/extension documentation.
- Add wrapper compatibility and packaged-layout release fixtures.
- Add attribution and release-policy version updates.

**Verification:** Local connector integration, seeded topology failures,
documentation contract checks, and `pnpm release:validate` pass.

### Phase 5: Release-candidate acceptance

**Goal:** Prove the frozen seams against real external dependencies.

**Tasks:**

- Produce the packaged RC and freeze contract versions.
- Support the operator-owned private-wrapper migration.
- Record the passing real wrapper E2E.
- Run and record one live S3/CDN sentinel-and-artifact acceptance.

**Verification:** Both durable acceptance records reference the same unchanged
RC; only then is release promotion allowed.

## Dependencies

### External Dependencies

- AWS CLI and operator credentials for the live publish gate
- Operator-provisioned S3/CloudFront corresponding roots
- External private wrapper and its vault/Google Docs tooling for RC acceptance
- MIT `visual-explainer` patterns, with attribution

### Internal Dependencies

- OAT layered config registry and resolver
- OAT control-plane project-state parser and validators
- Project planning, implementation-tail, autonomous, completion, and summary
  skills
- Utility/workflows pack manifests and bundle-assets process
- Skill validation and release validation

### Development Dependencies

- Node.js 22, pnpm, TypeScript, Vitest, shell helpers, and browser QA tooling
  already present in the repository

## Risks and Mitigation

- **External wrapper blocks release:** Probability Medium | Impact High
  - **Mitigation:** Freeze contracts in a packaged RC and provide the fixture,
    migration runbook, and clear owner split.
  - **Contingency:** Continue implementation fixes on new RCs; keep 0.4.1
    installed until one passes.
- **Config surface increases monolithic config complexity:** Probability High |
  Impact Medium
  - **Mitigation:** Add metadata/types in the existing registry but keep
    explainer normalization in a focused module with table-driven tests.
  - **Contingency:** Refactor config registry internals within the same behavior
    boundary if direct additions become unsafe.
- **Agent-authored output is mislabeled rebuildable:** Probability Medium |
  Impact High
  - **Mitigation:** Default false and require replay evidence for true.
  - **Contingency:** Release validation downgrades or rejects unsupported
    claims.
- **Template neutrality removes useful production patterns:** Probability Low |
  Impact Medium
  - **Mitigation:** Tokenize branding while retaining component structure;
    move examples rather than deleting them.
  - **Contingency:** Restore neutralized patterns from attributed fixtures.
- **Autonomous recap causes lifecycle regressions:** Probability Medium |
  Impact High
  - **Mitigation:** Keep status separate, preserve existing phase ownership,
    centralize commit choreography, deduplicate by manifest freshness, and test
    every failure stage.
  - **Contingency:** Disable only the adapter invocation in a patch while
    retaining recorded autonomous intent; never reinterpret failure as project
    failure.
- **Archival invalidates tracked recap paths:** Probability High | Impact High
  - **Mitigation:** CLI-owned copy-before-delete export, manifest hash
    verification, destination-exists rejection, re-attested evidence, and
    archive-aware links.
  - **Contingency:** Fail archival before deletion when export verification
    fails; if later attestation fails, push the export and report
    `built-not-durable` with recovery instructions.
- **S3/CDN roots do not correspond:** Probability Medium | Impact High
  - **Mitigation:** Sentinel-first verification before bulk transfer.
  - **Contingency:** Fail with root/origin-path diagnostics and preserve the
    local package.
- **Visual QA matrix becomes expensive:** Probability Medium | Impact Medium
  - **Mitigation:** Small curated sets and risk-based representative matrix.
  - **Contingency:** Split full matrix into release-only validation while
    retaining changed-template checks on normal CI.
- **Public skill assets trigger lockstep release churn:** Probability Certain |
  Impact Medium
  - **Mitigation:** Batch the coherent feature, bump once per skill/PR, and run
    release validation before RC creation.

## References

- Specification: `spec.md`
- Discovery: `discovery.md`
- Reference drafts: `references/skill-drafts/`
- Knowledge base: `.oat/repo/knowledge/`
- Architecture: `.oat/repo/knowledge/architecture.md`
- Conventions: `.oat/repo/knowledge/conventions.md`
- Testing: `.oat/repo/knowledge/testing.md`
- **implementation:** ---
  oat_status: complete
  oat_ready_for: oat-project-pr-final
  oat_blockers: []
  oat_last_updated: 2026-07-21
  oat_current_task_id: null
  oat_generated: false

---

# Implementation: explainer-kit

**Started:** 2026-07-16
**Last Updated:** 2026-07-17

> This document is used to resume interrupted implementation sessions.
>
> Conventions:
>
> - `oat_current_task_id` always points at the **next plan task to do** (not the last completed task).
> - When all plan tasks are complete, set `oat_current_task_id: null`.
> - Reviews are **not** plan tasks. Track review status in `plan.md` under `## Reviews` (e.g., `| final | code | passed | ... |`).
> - Keep phase/task statuses consistent with the Progress Overview table so restarts resume correctly.
> - Before running the `oat-project-pr-final` skill, ensure `## Final Summary (for PR/docs)` is filled with what was actually implemented.

## Progress Overview

| Phase      | Status    | Tasks | Completed |
| ---------- | --------- | ----- | --------- |
| Phase 1    | complete  | 6     | 6/6       |
| Phase 2    | complete  | 10    | 10/10     |
| Phase 3    | complete  | 9     | 9/9       |
| Phase 4    | complete  | 9     | 9/9       |
| Phase 5    | completed | 4     | 4/4       |
| Revision 1 | complete  | 10    | 10/10     |

**Total:** 48/48 tasks completed

---

## Phase 1: Contracts, configuration, and packaged skeleton

**Status:** complete
**Started:** 2026-07-16

### Phase Summary

**Outcome (what changed):**

- Added canonical `explainer-kit` and `oat-explainer-kit` skill skeletons and
  pack registration.
- Added strict v1 JSON Schemas and runtime/path validation.
- Added typed explainer configuration and project-state lifecycle intent.
- Added installed-core compatibility checks for the OAT adapter.

**Key files touched:**

- `.agents/skills/explainer-kit/` - core contracts and validators.
- `.agents/skills/oat-explainer-kit/` - adapter contract and compatibility
  checks.
- `packages/cli/src/config/` - typed configuration.
- `packages/control-plane/src/` - project-state lifecycle intent.

**Verification:**

- Result: all p01 task suites pass after append-only fix `e7742119` restored
  the adapter's initial `1.0.0` version.

**Notes / Decisions:**

- The user approved adding `packages/control-plane/src/project.ts` to p01-t04.
- The user accepted the non-behavioral p01-t03 commit-subject deviation.
- Root failed to create required bookkeeping commits after each task; this
  section is the explicit reconciliation and must not be represented as
  retroactive per-task bookkeeping.

### Task p01-t01: Scaffold canonical skills and register both packs

**Status:** completed
**Commit:** `043f91bf`

**Outcome (required when completed):**

- Both canonical skills exist, are assigned to utility/workflow packs, and are
  included by the asset bundler.

**Files changed:**

- `.agents/skills/{explainer-kit,oat-explainer-kit}/SKILL.md`
- `packages/cli/scripts/bundle-assets.sh`
- `packages/cli/src/commands/init/tools/shared/{skill-manifest.ts,bundle-consistency.test.ts}`
- `packages/cli/src/validation/skills.test.ts`

**Verification:**

- Result: originally passed; root reconciliation later found a regression
  introduced by p01-t05's version bump.

**Notes / Decisions:**

- No task-boundary deviation.

**Issues Encountered:**

- Current cross-task version regression is routed to a p01 fix.

---

### Task p01-t02: Define strict versioned contract schemas

**Status:** completed
**Commit:** `3cb70802`

**Outcome:**

- Added eight closed v1 schemas plus schema identity/invariant tests.

**Verification:**

- `node --test .agents/skills/explainer-kit/tests/schemas.test.mjs` — pass
  (5/5).

---

### Task p01-t03: Register typed explainer configuration

**Status:** completed
**Commit:** `24a7bf72`

**Outcome:**

- Registered typed build, publish, and lifecycle preference configuration with
  layered resolution and CLI metadata.

**Verification:**

- Config and command suites — pass (268/268).

**Notes:**

- User accepted commit subject `feat(config): register explainer settings`
  instead of the planned subject.

---

### Task p01-t04: Add explainer intent to project state

**Status:** completed
**Commit:** `6c9f46b1`

**Outcome:**

- Added typed optional explainer/recap decisions to parsed and public project
  state plus CLI validation.

**Verification:**

- Control-plane and project-state suites — pass (42/42).

---

### Task p01-t05: Enforce packaged core dependency compatibility

**Status:** completed
**Commit:** `a7d5a3b8`
**Fix Commit:** `e7742119`

**Outcome:**

- Added installed-core compatibility checks and install/update guidance.

**Verification:**

- Compatibility and installer suites — pass (23/23).
- Root reconciliation found and fixed a cross-task version regression.
- Re-run of the affected validation and bundling suites — pass (121/121).

---

### Task p01-t06: Implement contract and safe-path validation

**Status:** completed
**Commit:** `0d829a44`

**Outcome:**

- Added runtime contract validation, canonical hashes, and root-confined path
  resolution.

**Verification:**

- `node --test .agents/skills/explainer-kit/tests/contracts.test.mjs` — pass
  (6/6).

---

## Phase 2: Core pipeline

**Status:** complete
**Started:** 2026-07-17

### Phase Summary

**Outcome:**

- Built the config-blind explainer core from versioned inputs through
  reconciled facts, recipes, themes, neutral rendering, QA, records, and
  optional durability.
- Added explicit interactive content approval and bounded unattended
  orchestration.

**Verification:**

- Root full core suite — pass (98/98).
- Scoped lint and format — pass with zero warnings/errors.
- Phase range whitespace check — pass.
- Phase 2 review found three critical and two important issues.

### Phase 2 Review — Fixes Completed

**Artifact:** `reviews/p02-review-2026-07-18T012116Z.md`

**Accepted findings:**

- Confine all rendered/content writes against nested symlink escapes.
- Enforce recipe source-role cardinality in production core invocation.
- Require the complete immutable retained package for commit durability.
- Make `user-switchable` themes operable and keyboard-accessible.
- Preserve no-JS deck x-axis inner-content containment.

**Disposition:** All five findings were resolved in append-only commit
`bcfba605`. Full core verification passed 102/102 tests; direct symlink,
source-set, durability, theme-toggle, no-JS, and print probes passed; and lint,
format, and whitespace checks were clean. Re-review passed with zero findings;
canonical artifact: `reviews/p02-review-2026-07-18T015729Z.md`.

### Task p02-t01: Normalize run requests and create atomic run records

**Status:** completed
**Commit:** `28fc86cd`

**Outcome:**

- Added confined filesystem helpers and atomic initialization/update/write
  primitives for explainer run requests, build records, and manifests.
- Normalizes slugs, redacts transient art direction by default, enforces
  monotonic stage transitions, and cleans failed temporary writes.

**Verification:**

- Records suite — pass (9/9).
- Existing contract/path suite — pass (9/9).
- Scoped formatting and whitespace checks — pass.

---

### Task p02-t02: Implement reconciled fact-base processing

**Status:** completed
**Commit:** `889ef086`

**Outcome:**

- Added supplied and federated fact-base reconciliation with source precedence,
  citations, contradiction classification, operator overrides, and unresolved
  claim tracking.
- Added a provider-neutral adversarial critic seam for federated runs while
  keeping supplied runs on lightweight consistency/freshness checks.

**Verification:**

- Fact-base, contract, and schema suites — pass (21/21).
- Scoped formatting and whitespace checks — pass.

---

### Task p02-t03: Add recipe registry and canonical narrative contracts

**Status:** completed
**Commit:** `3cd8c3f8`

**Outcome:**

- Added versioned project-explainer, project-recap, and engineer-tour recipe
  contracts plus registry lookup and narrative validation.
- Enforced one-project recap binding, six accountability sections, closed
  source roles, and bounded unknown-size discovery.

**Verification:**

- Recipe, contract, and schema suites — pass (23/23).
- Scoped formatting, lint, and whitespace checks — pass.

---

### Task p02-t04: Implement dual-mode theme resolution

**Status:** completed
**Commit:** `1286424d`

**Outcome:**

- Added five curated semantic palettes, three visual profiles, and dual-mode
  theme resolution with canonical identity hashes.
- Enforced supplied-bundle precedence, AA contrast pairs, art-direction
  redaction/hash behavior, and separation of render strategy from bundle
  identity.

**Verification:**

- Theme suite — pass (8/8).
- Schema, contract, and records regression suites — pass (23/23).
- Scoped formatting and whitespace checks — pass.

---

### Task p02-t05: Neutralize production templates

**Status:** completed
**Commit:** `91118804`

**Outcome:**

- Added four neutral, tokenized production shells and external RFC 2606 example
  fixtures with leak-guard coverage.
- Deck presentation defaults to horizontal paging, confines x-axis inner
  overflow, supports both arrow pairs, degrades to readable no-JS flow, and
  prints vertically.

**Verification:**

- Template, recipe, and theme suites — pass (24/24).
- Scoped formatting, lint, and whitespace checks — pass.

---

### Task p02-t06: Implement typed-path rendering

**Status:** completed
**Commit:** `942b3286`

**Outcome:**

- Added validated recipe/theme/template rendering to typed site paths with
  escaped substitution, explicit index URLs, cross-links, and separate render
  strategy handling.
- Preserved deck horizontal paging, no-JS flow, and print behavior through
  rendering.

**Verification:**

- Renderer, recipe, theme, and template suites — pass (32/32).
- Scoped lint, formatting, and whitespace checks — pass.

---

### Task p02-t07: Add structural, accessibility, and leak QA

**Status:** completed
**Commit:** `52645538`

**Outcome:**

- Added structural, accessibility, leak, overflow, reduced-motion, keyboard,
  responsive-width, and cross-artifact cohesion checks.
- Added a provider-independent browser probe contract without making browser
  tooling a core dependency.

**Verification:**

- QA, renderer, and template suites — pass (27/27).
- Scoped lint, formatting, and whitespace checks — pass.

---

### Task p02-t08: Implement honest durability evidence

**Status:** completed
**Commit:** `84806204`

**Outcome:**

- Added commit and publish durability verification with rebuildability false by
  default, replay evidence, supersession arrays, and mutable-record exclusion.
- Durability recording never creates commits and preserves
  `built-not-durable` when evidence cannot be verified.

**Verification:**

- Durability, schema, contract, and records suites — pass (33/33).
- Post-commit durability suite — pass (10/10).
- Scoped lint, formatting, and whitespace checks — pass.

---

### Task p02-t09: Compose the config-blind core run

**Status:** completed
**Commit:** `de89b40d`

**Outcome:**

- Composed the config-blind validate-to-manifest core pipeline for supplied and
  federated inputs without requiring `.oat` files.
- Enforced critic-mode separation, discovery bounds, privacy-safe records,
  retained failure intermediates, and request-only durability/publish stages.

**Verification:**

- Full config-free core suite — pass (91/91).
- Run integration suite — pass (7/7).
- Scoped lint, formatting, and whitespace checks — pass.

---

### Task p02-t10: Gate interactive content approval and resume

**Status:** completed
**Commit:** `7c908abc`

**Outcome:**

- Added explicit interactive content approval after Markdown generation,
  preventing render/durability/publish before approval.
- Added persisted rejection/correction state and same-run resume while
  unattended lifecycle runs remain non-prompting with provenance.

**Verification:**

- Approval and integration suites — pass (14/14).
- Full core suite — pass (98/98).
- Scoped lint, formatting, and whitespace checks — pass.

---

## Phase 3: OAT adapter and lifecycle integration

**Status:** complete
**Started:** 2026-07-18

### Phase Summary

**Outcome:**

- Added OAT config/source binding, lifecycle intent, lifecycle entry points,
  recap generation/finalization, archive export, and archive-safe
  re-attestation/linking.

**Verification:**

- Adapter suite — pass (42/42).
- CLI archive, lifecycle contract, and skill suites — pass (193/193).
- CLI type-check, lint, canonical skill validation, formatting, and whitespace
  checks — pass.
- Phase 3 code review pending.

### Phase 3 Review — Fixes Completed

**Artifact:** `reviews/p03-review-2026-07-18T035042Z.md`

**Accepted findings:**

- Provide a lifecycle-usable provider-neutral critic seam and test against the
  real core.
- Reject absent, malformed, or inconsistent finalizer attestation results.
- Roll back newly created recap exports when later archive-copy work fails.
- Validate complete v1 recap manifests and immutable hash coverage before
  archive export.

**Disposition:** All four findings were resolved in append-only commit
`205bd030`. Adapter tests passed 45/45, archive/lifecycle tests passed 99/99,
direct real-core and malformed-attestation probes passed, and skill validation,
CLI type-check/lint, format, and whitespace checks were clean. Release
validation remains intentionally deferred to the planned Phase 4 lockstep
version task. Re-review passed with zero findings; canonical artifact:
`reviews/p03-review-2026-07-18T120653Z.md`.

### Task p03-t01: Resolve adapter config and canonical output roots

**Status:** completed
**Commit:** `1dedbdd6`

**Outcome:**

- Added source-aware OAT config translation and canonical project/non-project
  output-root resolution into versioned core requests.
- Enforced publish cross-fields, runtime override limits, direct-call
  rejection, and symlink/traversal containment.

**Verification:**

- Config, path, core contract, and adapter compatibility suites — pass (21/21).
- Scoped lint, formatting, and whitespace checks — pass.

---

### Task p03-t02: Bind OAT artifacts and invoke the core

**Status:** completed
**Commit:** `4a28b255`

**Outcome:**

- Added OAT project artifact source-role binding with review provenance and
  supplied fact-base pass-through.
- Added cross-scope installed-core invocation through one normalized
  request/result/manifest seam without ambient private configuration.

**Verification:**

- Adapter run, config/path, compatibility, and core integration suites — pass
  (36/36).
- Scoped syntax, lint, formatting, and whitespace checks — pass.

---

### Task p03-t03: Implement lifecycle intent resolution

**Status:** completed
**Commit:** `81606e90`

**Outcome:**

- Added pure lifecycle intent precedence resolution and safe frontmatter
  persistence with stale-write protection.
- Enforced ask-once behavior, autonomous forced recap, kickoff-only autonomous
  explainer intent, and invalid-skip rejection.

**Verification:**

- Adapter intent suites — pass (27/27).
- Control-plane and CLI project-state suites — pass (64/64).
- Scoped lint, formatting, and whitespace checks — pass.

---

### Task p03-t04: Integrate plan and autonomous kickoff gates

**Status:** completed
**Commit:** `85224702`

**Outcome:**

- Added interactive ask-once/post-plan explainer guidance and failure semantics
  without altering plan review, dispatch, or HiLL contracts.
- Added autonomous forced-recap and kickoff-request-only explainer intent.

**Verification:**

- Skill contract RED failed for the two missing behaviors, then GREEN passed
  with 119 relevant tests.
- Root rerun of full skill validation — pass (98/98); the worker's reported
  metadata blocker was not reproducible in the committed tree.
- Scoped lint, formatting, and whitespace checks — pass.

---

### Task p03-t05: Centralize tracked-run commit finalization

**Status:** completed
**Commit:** `256e9eb6`

**Outcome:**

- Added bounded two-commit planning/verification for immutable artifact
  durability followed by mutable evidence attestation.
- Supports dedicated and completion-bookkeeping modes, exact unrelated-change
  isolation, recoverable verification failure, later attestation, and
  push-together guidance.

**Verification:**

- Finalizer suite — pass (5/5).
- Adapter and durability regression suites — pass (38/38).
- Scoped lint, formatting, and whitespace checks — pass.

---

### Task p03-t06: Integrate implementation-tail recap and summary visibility

**Status:** completed
**Commit:** `1734ec5a`

**Outcome:**

- Added deduplicated implementation-tail recap attempts, final-HiLL placement,
  mandatory autonomous attempt, and non-blocking failure semantics.
- Added concise recap outcome visibility to project summaries while preserving
  existing implementation review sequencing.

**Verification:**

- Skill contract RED failed for the missing behaviors, then GREEN passed
  (20/20).
- Root combined contract and skill validation — pass (118/118); the worker's
  reported metadata blocker was not reproducible in the committed tree.
- Scoped lint, formatting, and whitespace checks — pass.

---

### Task p03-t07: Export the selected recap during archive

**Status:** completed
**Commit:** `586d135b`

**Outcome:**

- Added optional selected project-recap export to the dated durable reference
  root with recipe/containment/hash verification and atomic non-overwriting
  rename.
- Preserved existing summary/S3 archive behavior and prevents active deletion
  when recap export fails.

**Verification:**

- Archive suite RED: 12 failed / 60 passed; GREEN: 72/72 passed.
- CLI type-check and lint — pass.
- Scoped formatting and whitespace checks — pass.

---

### Task p03-t08: Integrate interactive completion policy

**Status:** completed
**Commit:** `0bde665c`
**Structural Fix Commit:** `93c24886`

**Outcome:**

- Added batched completion intent, recap reuse/selection, archive argument
  plumbing, no-recap flow, plan-explainer exclusion, and local-scope
  non-export semantics.
- Completed mandatory adapter skill metadata discovered by the canonical
  validator.

**Verification:**

- Completion integration suite — pass (5/5).
- Lifecycle contract suite — pass (23/23).
- Canonical `oat:validate-skills` — pass (59 skills).
- Combined skill tests — pass (121/121).
- Scoped lint, formatting, and whitespace checks — pass.

---

### Task p03-t09: Finalize recap durability and archive-aware links

**Status:** completed
**Commit:** `39c5dbe6`

**Outcome:**

- Added completion-time archive export consumption, lifecycle bookkeeping,
  exported-recap re-attestation, active-path evidence supersession, and final
  evidence commit.
- Rewrites summary/PR links to tracked reference roots and treats attestation
  failure as a recorded warning without failing completion.

**Verification:**

- Completion suite RED: 5/10 failed; GREEN: 10/10 passed.
- Finalizer suite — pass (5/5).
- Archive and skill contract suites — pass (95/95).
- Canonical skill validation, scoped lint, formatting, and whitespace — pass.

---

## Phase 4: Publishing, compatibility, documentation, and release validation

**Status:** complete
**Started:** 2026-07-18

### Task p04-t01: Implement sentinel-first additive S3 publishing

**Status:** completed
**Commit:** `2f38ee33`

**Outcome:**

- Added corresponding-root S3 publishing with run-unique sentinel-first public
  verification, additive idempotent uploads, explicit metadata, receipts, and
  sentinel cleanup.
- Rejects duplicate paths, undeclared overwrites, and delete-oriented behavior.

**Verification:**

- Connector, schema, contract, and durability suites — pass (34/34).
- Scoped lint, formatting, and whitespace checks — pass.

---

### Task p04-t02: Add release-grade visual and traceability fixtures

**Status:** completed
**Commit:** `661e9268`

**Outcome:**

- Added bounded visual matrix coverage across palettes, modes, profiles,
  artifacts, viewports, and deck presentation fallbacks.
- Added false-rebuildability rejection, source/output hash checks, and retained
  0.4.1 operational-wisdom traceability.

**Verification:**

- Planned release QA suites — pass (11/11).
- Related QA, theme, render, template, and durability suites — pass (47/47).
- Scoped lint, formatting, and whitespace checks — pass.

---

### Task p04-t03: Add private-wrapper compatibility fixture and migration runbook

**Status:** completed
**Commit:** `0ea49701`

**Outcome:**

- Added a private-wrapper fixture proving pre-resolution through actual core
  execution, manifest consumption, and post-run linking without private
  concerns entering public configuration.
- Documented the frozen extension seam, migration/rollback and external RC gate,
  including the confirmed personal publish root only in private configuration
  context.

**Verification:**

- Wrapper smoke — pass (2/2).
- Core and adapter suites — pass (167/167).
- Skill validation — pass (98/98).
- Scoped lint, formatting, and whitespace checks — pass.

---

### Task p04-t04: Document the public explainer family

**Status:** completed
**Commit:** `c509f7ce`
**User approval:** Approved the exact page-level delta before substantive
authoring on 2026-07-18.

**Outcome:**

- Added the public explainer family guide and updated skills, project artifacts,
  configuration, and tool-pack documentation.
- Added external MIT pattern attribution and regenerated the derived docs index.

**Verification:**

- Docs formatting/lint, generated-index reproduction, full docs build, and
  whitespace checks — pass.
- Browser link checker could not start because the local Playwright Chromium
  binary is not installed; this is an environment limitation, not a docs-build
  failure.

---

### Task p04-t05: Bump shipped versions and pass release validation

**Status:** completed
**Primary commit:** `b7cbfbd5`
**Repair commit:** `11e0ef91`
**Approved boundary correction:** Added
`packages/cli/src/validation/skills.test.ts`,
`packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`,
and `.agents/docs/autonomy-contract.md` after the full workspace suite exposed
stale version pins and unmapped Phase 3 lifecycle prompt sites.

**Outcome:**

- Skill-delta validation and lockstep public-package release validation pass.
- Build, lint, format, type-check, and the full workspace test suite pass.
- Focused repaired fixtures pass (124/124); full suites passed across CLI,
  control plane, docs packages, and smoke tests.

---

### Task p04-t06: Prove packaged core and adapter execution

**Status:** completed
**Commit:** `d98fe0b9`

**Outcome:**

- Added packaged-layout smoke coverage using bundled assets in an isolated
  temporary root.
- Proved config-free core and adapter execution plus fail-closed missing and
  incompatible core behavior without source-checkout fallback.

**Verification:**

- Packaged-layout smoke — pass (4/4).
- Related wrapper smoke — pass (6/6).
- CLI asset suite — pass (3,055 tests).
- Scoped lint, formatting, and whitespace checks — pass.

---

### Task p04-t07: Build reproducible retained release candidates

**Status:** completed
**Commit:** `87b0cbbb`

**Outcome:**

- Added a timestamp-free retained RC builder with stable commit, package/skill
  version, schema/recipe, artifact hash, and candidate identity records.
- Rejects dirty release inputs and candidates that change while building; never
  publishes.

**Verification:**

- RC builder suite — pass (3/3), independently rerun after authentication
  recovery.
- Commit contains exactly the two planned files.

---

### Task p04-t08: Run connector entry points from the retained RC

**Status:** completed
**Commit:** `e9d045fe`

**Outcome:**

- Added a fail-closed packaged RC runner that verifies manifest identity and
  every tarball hash before contained entry-point execution.
- Records packaged execution evidence and rejects traversal, symlink escape,
  undeclared entries, malformed manifests, hash mismatch, and source fallback.

**Verification:**

- RC runner suite — pass (7/7).
- Combined RC builder, packaged-layout, and wrapper suites — pass (16/16).
- Actual packed CLI probe, scoped lint, formatting, and whitespace — pass.

---

### Task p04-t09: Validate external acceptance evidence

**Status:** completed
**Commit:** `0e52c735`

**Outcome:**

- Added fail-closed wrapper, publish, and combined acceptance validation against
  one unchanged retained RC.
- Validates packaged execution, verdicts, receipt/artifact hashes, sentinel
  lifecycle, evidence completeness, and changed-candidate rejection.

**Verification:**

- Acceptance suite — pass (10/10).
- Phase RC/runner/layout/wrapper/S3 matrix — pass (35/35).
- Scoped lint, formatting, and whitespace checks — pass.

---

### Phase 4 Review — Fixes Completed

**Canonical artifact:**
`reviews/p04-review-2026-07-18T171004Z.md`

**Findings:** 6 critical, 2 important, 1 medium, 0 minor.

**Disposition:** All nine findings were resolved in append-only commits
`086f2885` and `a3369e68`. The follow-up handles tracked symlink inputs
deterministically and fails closed for dangling, external, or undeclared
targets. Full workspace/release gates, 65 real-browser measurements, public
byte/hash probes, and an actual committed RC build → packaged core run → bound
wrapper acceptance flow pass. Independent re-review is pending; Phase 5 remains
blocked until it passes.

### Phase 4 Re-review — Second Fix Pass

**Canonical artifact:**
`reviews/p04-rereview-2026-07-18T185004Z.md`

**Findings:** 2 critical, 0 important, 0 medium, 0 minor. Eight baseline
findings are independently resolved; the packaged-execution binding finding
remains open.

**Disposition:** Parse the real core's complete machine JSON result and add a
real builder → packaged core → execution-record integration test. Remove
wrapper-owned post-run receipt assertion from the core runner; validate the
complete wrapper receipt separately against the immutable core execution
record, manifest hash, and run ID. Update the extension sequence and reject
foreign receipts even when caller-authored hashes agree. Re-run and re-review.

**Fix outcome:** Resolved in append-only commit `519df4c3`. The actual clean
retained RC now completes packaged core execution, separate wrapper post-run
receipt creation, and acceptance for the same immutable run; a foreign receipt
is rejected. Phase 4 suites pass 67/67, full workspace/release/docs/browser
gates pass, and 65 browser measurements are retained. The moving
`origin/main` now makes the skill-version delta validator report three
lifecycle versions that passed against the branch's original base
`69d5fe0c`; no out-of-scope version change was made. Independent re-review is
pending.

### Phase 4 Final Re-review — Upstream Reconciliation Required

**Canonical artifact:**
`reviews/p04-final-rereview-2026-07-18T192615Z.md`

**Findings:** 0 critical, 1 important, 0 medium, 0 minor. All eleven
implementation findings are resolved and the implementation verdict passes.

**Remaining release blocker:** Current `origin/main` independently shipped
overlapping project-log lifecycle changes and consumed the same three skill
versions plus lockstep package version `0.1.73`. The branch validates against
its original base but not current main. Reconcile both feature sets and advance
versions from the resulting current-base diff before freezing the Phase 5 RC.

**Reconciliation outcome:** The approved merge strategy completed in
`5c6ade31`. Both recap and project-log lifecycle behavior are preserved,
overlapping skills advanced to `1.5.4` / `2.1.4` / `1.3.4`, and all five
public packages advanced together to `0.1.74`. Final reconciliation review
passed with zero findings:
`reviews/p04-reconciliation-review-2026-07-18T200037Z.md`.

---

## Phase 5: Release-candidate acceptance

**Status:** completed
**Started:** 2026-07-18
**Completed:** 2026-07-19

**Wave reconciliation:** Wave promotion #158 was merged to main and reconciled
into this branch in merge commit `12c82fb4`. The previously frozen RC is now
superseded and must not be used for either external acceptance gate.

### Task p05-t01: Produce and identify the frozen packaged RC

**Status:** completed
**Commit:** `24ffdac7`
**Frozen code commit:** `c485b784`
**RC ID:** `sha256:a7f90d1ccf98d390389e32a11bb7a994db9e03b67fab475f26e16ee2ed395348`

**Outcome:**

- Retained all five `0.1.74` package tarballs and recorded the two `1.0.0`
  explainer skills, schemas, recipes, and artifact hashes.
- A second pre-commit build produced byte-identical RC identity; all retained
  tarball hashes match the tracked record.

**Verification:**

- Release validation, formatting, and whitespace checks — pass.
- Commit contains exactly `rc.json` and `rc.md`; retained tarballs stay under
  untracked `dist/explainer-kit-rc/`.

**Superseded:** RC
`sha256:a7f90d1ccf98d390389e32a11bb7a994db9e03b67fab475f26e16ee2ed395348`
predates merged wave promotion #158 and package version `0.2.1`. Task
`p05-t01` is reopened to replace both tracked RC records and retained tarballs.

### Task p05-t01 (replacement): Refreeze after wave merge

**Status:** completed
**Commit:** `7cb6fb18`
**Frozen code commit:** `534a408e`
**RC ID:** `sha256:f212d630a2e1f8dfeb42f7d1aa4a4522f485848143dd43a702313c792050b854`

**Outcome:**

- Replaced the tracked RC identity and five retained tarballs with the
  reconciled `0.2.1` package set.
- Recorded the superseded RC, explainer skill/schema/recipe identities, and
  verified hashes.

**Verification:**

- Release validation passes.
- Two pre-commit builds produced byte-identical records and tarballs; every
  retained tarball matches `rc.json`.
- The real private wrapper remains unavailable locally; `p05-t02` requires the
  operator-owned migration and cannot use the in-repo fixture as a substitute.

**Superseded:** Wave p06 landed in PR #161 and consumed package version `0.2.2`;
this candidate must not be used for external acceptance.

### Task p05-t01 (final replacement): Refreeze after p06

**Status:** completed
**Frozen code commit:** `da1e7a71`
**RC ID:** `sha256:985d0abdac8245376d56dc16d5f263324ffb070d4157f51e0a65504eddee62bb`

**Outcome:**

- Merged p06 from main, advanced all five public packages to `0.2.3`, and
  registered the wave-owned `program-recap` recipe in the core recipe registry.
- Retained the final five package tarballs and published the exact
  `rcId`/commit/`oat-explainer-kit` subtree pins for the operator runbook.

**Verification:**

- Program-recap tests passed RED → GREEN; core recipe/integration tests pass
  (22/22).
- Release validation, lint, type-check, and the full workspace test suite pass
  (CLI 3,242 tests plus smoke suites).
- Two local final-RC builds produced byte-identical records and all five
  tarballs.
- A cache-bypassed Mini rebuild matched four package tarballs, all 1,257 CLI
  paths, 1,254 CLI file hashes, both skill subtrees, all schemas, and all
  recipes. The only differences were ordering within three generated `.d.ts`
  files; runtime JavaScript and declaration maps matched.
- Cross-machine provenance is resolved as semantically benign declaration
  emission outside the explainer surfaces. Acceptance remains bound to the
  exact retained `dc1f2d82…93b1` CLI tarball and `2cf98952…b654`
  `oat-explainer-kit` subtree.

### Task p05-t02: Record the operator-owned private-wrapper E2E

**Status:** completed
**Commit:** `931644ce`
**RC ID:** `sha256:985d0abdac8245376d56dc16d5f263324ffb070d4157f51e0a65504eddee62bb`

**Outcome:**

- A fresh laptop agent migrated the real personal wrapper from the exact
  retained RC, with operator-supplied personal seams and the 0.4.1 backup
  preserved for rollback.
- All six wrapper gates passed, including vault, Google Docs, presets, live
  personal publishing, manifest consumption, and rollback.
- Sanitized validator-shaped evidence, the original harness result, manifest,
  publish receipt, and execution report are retained under the acceptance root.

**Verification:**

- `validate-explainer-acceptance.mjs --gate wrapper` passes independently with
  packaged `scripts/run.mjs`, `built-durable`, and a validated post-run receipt.
- The public acceptance artifact returns bytes matching
  `4f59d3d2…edcce`; the deleted sentinel is not publicly retrievable.
- The initial publish failure was an IAM `s3:DeleteObject` permission gap; after
  the operator granted the required permission and orphaned sentinels were
  cleaned, the unchanged RC passed.

### Task p05-t03: Record the live S3/CDN smoke test

**Status:** completed
**Commit:** `e699aebe`
**RC ID:** `sha256:985d0abdac8245376d56dc16d5f263324ffb070d4157f51e0a65504eddee62bb`

**Outcome:**

- The exact retained RC executed packaged `scripts/publish.mjs` through
  `run-explainer-rc.mjs`, using the accepted wrapper run's retained manifest and
  byte-identical site artifact.
- One declared HTML artifact was published to the operator-approved date-scoped
  roots; the receipt binds request, manifest, artifact, and RC identity.
- The plan command was corrected to include the runner's required
  `--artifacts-dir` and the connector's mandatory `--confirm-publish` flag.

**Verification:**

- `validate-explainer-acceptance.mjs --gate publish` passes with one artifact,
  all sentinel checks true, and zero undeclared overwrites or deletes.
- `--gate all` passes both wrapper and publish gates against the unchanged RC.
- Independent CDN retrieval returned HTTP 200 with bytes matching
  `4f59d3d2…edcce`; S3 `head-object` confirmed the sentinel key was deleted.

### Task p05-t04: Confirm promotion readiness

**Status:** completed
**Commit:** `5b2c153b`
**Decision:** approved for promotion

**Outcome:**

- `promotion.md` reconciles the RC, private-wrapper, and packaged publish
  records and confirms one unchanged package, skill, schema, recipe, and
  bundle-input identity.
- The frozen RC may be promoted unchanged. Any identity change requires a new
  freeze and rerun of both external gates.

**Verification:**

- `validate-explainer-acceptance.mjs --gate all` passed both external gates.
- `pnpm release:validate` passed all five public package archives and 65
  browser-backed visual measurements.
- `pnpm test` passed across all six workspace packages; the root smoke suite
  passed 129/129 with zero failures.

## Phase p-rev1: Revision 1 — W6 recap durability, authored content, and curated styles

**Status:** complete
**Started:** 2026-07-20
**Completed:** 2026-07-21
**Current task:** None

### Revision Received: Inline Feedback

**Date:** 2026-07-20
**Source:** Operator feedback plus first live unattended Stoa W6 recap evidence

**Changes requested:**

- Hash and verify the complete immutable recap package so lifecycle archive
  succeeds without weakening validation.
- Require a structured caller-supplied author for unattended content, retain
  provenance, and reject obvious raw-source dumping.
- Replace the default palette/profile front door with four accepted curated
  styles while preserving a documented legacy compatibility path.
- Prove the packaged revision through full repository gates and a live Stoa W6
  recap/archive regression before promotion and project completion.

**New tasks added:** `prev1-t01`, `prev1-t02`, `prev1-t03`, `prev1-t04`,
`prev1-t05`, `prev1-t06`, `prev1-t07`, `prev1-t08`, `prev1-t09`,
`prev1-t10`

**Migrated artifacts:**

- `references/revision-1-discovery.md`
- `references/revision-1-theme-previews/`
- Existing W6 handoff and theme-reference files under `references/`

### Task Outcomes

| Task      | Status    | Commit     | Verification                                                             |
| --------- | --------- | ---------- | ------------------------------------------------------------------------ |
| prev1-t01 | completed | `4f456a91` | Core contracts/run tests and CLI archive tests passed                    |
| prev1-t02 | completed | `8708f4d3` | Schema, approval, QA, and run integration tests passed                   |
| prev1-t03 | completed | `d8dec777` | Theme, render, visual, adapter, and CLI config tests passed              |
| prev1-t04 | completed | `0895a8c0` | Codex config codec and full repository verification passed               |
| prev1-t05 | completed | `5f7206bd` | Packaged W6 recap, archive, release, visual, and repository gates passed |
| prev1-t06 | completed | `3d9ce8b4` | 132 config tests and adapter/package integration passed                  |
| prev1-t07 | completed | `2c8c0fa5` | Adapter author seam and official packaged CLI smoke passed               |
| prev1-t08 | completed | `aa74980f` | Section-local source-dump QA and full acceptance gates passed            |
| prev1-t09 | completed | `5a753029` | Design alignment, formatting, diff check, and contract assertions passed |
| prev1-t10 | completed | `3bf11f25` | Author-cardinality TDD and all serial repository/release gates passed    |

The first aggregate attempt hit one five-second timeout in
`post-implement-sequence-contracts.test.ts`; the isolated retry passed all 18
tests in 853 ms. The final serial repository suite passed in full.

**Acceptance:** The `0.2.10` packaged candidate generated a six-section W6
recap with retained author provenance, verified eight immutable byte-hashed
paths, exported successfully through `oat project archive
--project-recap-run`, and left the retained archive unchanged. See
`references/revision-1-w6-acceptance.md`.

**Review:** The fresh-context review found two Critical and one Important
defect. Findings are recorded in
`reviews/2026-07-21-p-rev1-code-review.md` and converted into `prev1-t06`
through `prev1-t08`.

**Fix verification:** All repository and release gates passed serially. The
rebuilt `0.2.10` candidate reran the real W6 recap and archive export with
eight immutable paths, six distinct authored sections, and no retained-source
archive mutation. The updated candidate identity is recorded in
`references/revision-1-w6-acceptance.md`.

**Re-review:** The first re-review confirmed C1 and I1 resolved and the
substantive C2 propagation path working. It found one Important stale-design
issue, one Medium omitted-author boundary issue, and one formatting-only
Minor. These are converted into `prev1-t09` and `prev1-t10`.

**Final fix verification:** The adapter now rejects zero or two unattended
author seams before core invocation while preserving interactive omission and
direct/module success. The authoritative design matches Revision 1 and the
prior review artifact is whitespace-clean.

**Final re-review:** Passed with zero Critical, Important, Medium, or Minor
findings. All prior Revision 1 findings are resolved.

**Next:** Open the follow-up PR.

---

## Orchestration Runs

_Each run from `oat-project-implement` appends an entry below with:_
_- Run header (number, timestamp, branch, tier, policy, phase counts)_
_- Phase Outcomes table_
_- Parallel Groups list_
_- Outstanding Items_

<!-- orchestration-runs-start -->

### Run 6 — 2026-07-21T03:22:00Z

- Branch: `tkstang/fix-w6-recap-path`
- Tier: 1, policy-resolved Cursor CLI route
- Request: `dispatch-p-rev1-rereview-fixes-20260720-01`
- Phase base: `7ea3936f`
- Outcome: passed for `prev1-t09` and `prev1-t10`
- Task commits: `5a753029`, `3bf11f25`
- Verification: design contract assertions, author-cardinality TDD, 19 focused
  adapter/package tests, repository-local sync, format, lint, type-check, full
  tests, five-package release validation, and 65 visual measurements
- Reviewer: pending narrowed fresh-context re-review

Dispatch: scope=p-rev1-rereview-fixes action=implementation role=implementer
producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high
effort_axis=not-applicable dispatch_policy=high
dispatch_ceiling=gpt-5.6-sol-high
target=oat-phase-implementer-gpt-5-6-sol-high

### Run 5 — 2026-07-21T02:12:00Z

- Branch: `tkstang/fix-w6-recap-path`
- Tier: 1, policy-resolved Cursor CLI route
- Request: `dispatch-p-rev1-review-fixes-20260720-01`
- Phase base: `8b5b87f3`
- Outcome: passed for `prev1-t06` through `prev1-t08`
- Task commits: `3d9ce8b4`, `2c8c0fa5`, `aa74980f`
- Verification: 3,284 CLI tests, 129 smoke tests, lint, type-check, format,
  five-package release validation, 65 visual measurements, rebuilt packaged
  W6 recap, successful archive export, and unchanged retained source archive
- Reviewer: pending fresh-context re-review

Dispatch: scope=p-rev1-review-fixes action=implementation role=implementer
producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high
effort_axis=not-applicable dispatch_policy=high
dispatch_ceiling=gpt-5.6-sol-high
target=oat-phase-implementer-gpt-5-6-sol-high

### Run 4 — 2026-07-21T00:04:00Z

- Branch: `tkstang/fix-w6-recap-path`
- Tier: 1, policy-resolved Cursor CLI route
- Requests:
  - `dispatch-p-rev1-w6-acceptance-20260720-01`
  - `dispatch-p-rev1-w6-acceptance-20260720-02`
  - `dispatch-p-rev1-w6-acceptance-20260720-03`
- Phase base: `8176a213`; final bounded base: `a0594b48`
- Outcome: passed for `prev1-t05`
- Task commit: `5f7206bd`
- Verification: 3,277 CLI tests, 129 smoke tests, lint, type-check, format,
  five-package release validation, 65 visual measurements, real authored W6
  recap, eight-path immutable verification, successful archive export, and
  unchanged retained source archive
- Reviewer: pending fresh-context Revision 1 review
- Boundary corrections: literal skill-version assertions, unattended smoke
  authors, and canonical-versus-byte archive hash semantics

Dispatch: scope=p-rev1-w6-acceptance action=implementation role=implementer
producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high
effort_axis=not-applicable dispatch_policy=high
dispatch_ceiling=gpt-5.6-sol-high
target=oat-phase-implementer-gpt-5-6-sol-high

### Run 3 — 2026-07-20T23:33:00Z

- Branch: `tkstang/fix-w6-recap-path`
- Tier: 1, policy-resolved Cursor CLI route
- Request: `dispatch-p-rev1-codex-indent-20260720-01`
- Phase base: `cb4449c0`
- Outcome: passed for bounded continuation `prev1-t04`
- Task commit: `0895a8c0`
- Verification: 3,276 tests, lint, type-check, and format passed
- Reviewer: deferred until `prev1-t05` completes

Dispatch: scope=p-rev1-codex-indent action=implementation role=implementer
producer=unknown provenance=unknown model_axis=selected:gpt-5.6-sol-high
effort_axis=not-applicable dispatch_policy=high
dispatch_ceiling=gpt-5.6-sol-high
target=oat-phase-implementer-gpt-5-6-sol-high

### Run 2 — 2026-07-20T22:09:56Z

- Branch: `tkstang/fix-w6-recap-path`
- Tier: 1, policy-resolved Cursor CLI route
- Request: `dispatch-p-rev1-20260720-01`
- Phase base: `9204742be899b9f133a9e99be56215798083f2a4`
- Outcome: blocked after 3/4 originally dispatched tasks
- Fix loops: 0
- Reviewer: not launched because the phase did not complete

| Phase  | Verdict | Task commits                       | Review  |
| ------ | ------- | ---------------------------------- | ------- |
| p-rev1 | blocked | `4f456a91`, `8708f4d3`, `d8dec777` | pending |

Dispatch: scope=p-rev1 action=implementation role=implementer producer=unknown
provenance=unknown model_axis=selected:gpt-5.6-sol-high
effort_axis=not-applicable dispatch_policy=high
dispatch_ceiling=gpt-5.6-sol-high
target=oat-phase-implementer-gpt-5-6-sol-high

Outstanding: `prev1-t04` was added from operator feedback after dispatch.
Former `prev1-t04` became `prev1-t05` and remains blocked on the retained Stoa
W6 archive and a real author module.

_Orchestration runs from `oat-project-implement` are appended here, most-recent-first within the file but append-only at the bottom of the log._

<!-- orchestration-runs-end -->

---

## Implementation Log

Chronological log of implementation progress.

### 2026-07-17 — Implementation Run 1

- Plan: five sequential phases, 38 tasks.
- Dispatch: Tier 1 target-pinned Cursor subagents; managed `high` policy;
  selected model `gpt-5.6-sol-high`.
- HiLL checkpoints: final phase only (`p05`).
- Auto-review at HiLL checkpoints: enabled.
- Phase 1 task commits: p01-t01 through p01-t06.
- Phase 1 verification: passed after append-only fix `e7742119`.
- Bookkeeping correction: root did not update tracking after each task commit.
  One reconciliation commit records the actual history; future task dispatches
  must return control after each code commit for root-owned bookkeeping.

### Phase 1 Review — Fixes Completed

**Artifact:** `reviews/p01-review-2026-07-17T224106Z.md`

**Findings:**

- Critical: resolve the user-scoped core independently from a project-scoped
  adapter.
- Important: enforce POSIX safe-relative paths through the public contract
  validator.
- Important: enforce run-request cross-field invariants.
- Medium: enforce the allowed decision/source matrix per lifecycle product.

**Disposition:** All four findings were resolved in append-only commit
`fb1068eb`. The implementer reported 491 focused tests passing, both affected
packages passing type-check and lint, scoped formatting passing, and no
remaining blocker. Re-review passed with zero findings; canonical artifact:
`reviews/p01-review-2026-07-17T230548Z.md`.

### Operator Input — Personal Publish Root

- Confirmed `personal-oat` public root:
  `https://dy4vzrzaexuy5.cloudfront.net`.
- Filled the supplied private-wrapper `presets.example.json` placeholder.
- Added an explicit p04-t03 handoff to reuse the same root in the eventual
  private Stoa configuration example without introducing it into neutral public
  core fixtures.

### Operator Input — Deck Presentation Axis

- Added directly to upcoming task p02-t05 before template implementation.
- `deck-shell.html` defaults to left-to-right paging, confines wide inner
  content on the x-axis, supports both horizontal and vertical arrow pairs,
  remains readable without JavaScript, and prints as a vertical document.

### 2026-07-16

**Session Start:** {time}

- [x] p01-t01: {Task name} - {commit sha}
- [ ] p01-t02: {Task name} - in progress

**What changed (high level):**

- {short bullets suitable for PR/docs}

**Decisions:**

- {Decision made and rationale}

**Follow-ups / TODO:**

- {anything discovered during implementation that should be captured for later}

**Blockers:**

- {Blocker description} - {status: resolved/pending}

**Session End:** {time}

---

### 2026-07-16

**Session Start:** {time}

{Continue log...}

---

## Post-Completion Integration Reconciliation

### 2026-07-19 — Current-main merge

- Merged current `origin/main` into `tkstang/explainer-kit` as `dfe4b527`.
- Preserved current-main final-gate enforcement, reviewer reconnaissance, and
  provider synchronization while retaining the explainer lifecycle hooks.
- Moved implementation-tail recap instructions from the top-level
  `oat-project-implement` skill into its existing
  `references/completion-and-closeout.md` route. This satisfies current-main's
  progressive-disclosure boundary without changing recap order or semantics.
- Advanced `oat-project-implement` to `2.1.7` and all five lockstep public
  packages to `0.2.6`.
- Regenerated provider views and `.oat/sync/manifest.json`.
- Verification passed:
  - `pnpm format`
  - `pnpm lint`
  - `pnpm type-check`
  - `pnpm test` (3,268 CLI tests plus workspace smoke suites)
  - `pnpm release:validate` (five `0.2.6` package archives and 65 browser
    measurements)
  - retained external acceptance validator (`--gate all`)
- Release implication: the accepted `0.2.3` RC and evidence remain immutable
  historical records, but the reconciled source and package identities require
  a new RC and external acceptance rerun after merge to `main`.

## Deviations from Plan / Design

Document any intentional deviations from the original plan, spec, or design. Include accepted review findings where the shipped implementation is source of truth and a lifecycle artifact needs alignment.

| Task / Review | Source Artifact               | Planned / Documented                                               | Actual / Accepted                                                                  | Reason                                                                                                                   | Source of Truth                     | Follow-up                                                   |
| ------------- | ----------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | ----------------------------------------------------------- |
| p01-t03       | `plan.md`                     | Commit subject `feat(p01-t03): register typed explainer config`    | Commit `24a7bf72` uses `feat(config): register explainer settings`                 | User accepted the non-behavioral subject deviation; files and verification remained task-bounded                         | Commit `24a7bf72`                   | None                                                        |
| p01-t04       | `plan.md`                     | State intent task omitted `packages/control-plane/src/project.ts`  | Added `project.ts` to the task boundary before implementation                      | `getProjectState()` manually constructs the public `ProjectState`, so the design cannot be implemented without this file | Updated `plan.md`                   | Resume p01-t04 in the original phase session                |
| bookkeeping   | Implementation workflow       | Separate root-owned tracking commit after every code commit        | Six task commits landed without interleaved tracking commits                       | Root delegated the full phase without a per-task return boundary                                                         | Git history and this reconciliation | Enforce per-task return and bookkeeping from Phase 2 onward |
| p01-t05       | `plan.md` / p01-t01 invariant | New skill family remains at `1.0.0` until centralized release bump | p01-t05 changed `oat-explainer-kit` to `1.1.0`; fix `e7742119` restored `1.0.0`    | Implementer applied the general changed-skill bump rule despite this project's centralized bump plan                     | Fix commit `e7742119`               | None                                                        |
| p03-t08       | Repository skill validator    | Task boundary excluded `.agents/skills/oat-explainer-kit/SKILL.md` | Append-only fix `93c24886` added required invocation metadata and progress heading | Canonical `oat:validate-skills` exposed mandatory structure missed by narrower Vitest validation                         | Fix commit `93c24886`               | None                                                        |
| p05-t01       | Cross-machine RC verification | Rebuilt CLI tarball should match the frozen whole-archive hash     | Three generated `.d.ts` files differed only in declaration ordering                | TypeScript emitted semantically equivalent ordering across hosts; all runtime and explainer surfaces matched             | `rc.md` and Mini evidence           | Acceptance consumed the exact retained archive              |
| p05-t02       | Operator wrapper environment  | Personal publish leg should complete with existing IAM policy      | First attempt lacked `s3:DeleteObject` for sentinel cleanup                        | The connector intentionally deletes its run-unique sentinel after public verification                                    | Private-wrapper acceptance record   | Permission granted; unchanged RC rerun passed               |
| p05-t03       | `plan.md` publish command     | Listed command should execute the retained packaged connector      | Required `--artifacts-dir` and `--confirm-publish` arguments were missing          | The runner requires an explicit retained artifact root and the connector requires human approval                         | Updated `plan.md` and smoke record  | None                                                        |

## Test Results

Track test execution during implementation.

| Phase | Tests Run                  | Passed | Failed | Coverage                                   |
| ----- | -------------------------- | ------ | ------ | ------------------------------------------ |
| 1     | 491                        | 491    | 0      | Full post-review-fix Phase 1 matrix passes |
| 2     | 102                        | 102    | 0      | Full post-review-fix Phase 2 suite passes  |
| 3     | 144                        | 144    | 0      | Full post-review-fix Phase 3 matrix passes |
| 4     | 67 + full workspace        | all    | 0      | RC, acceptance, docs, and browser gates    |
| 5     | 129 smoke + full workspace | all    | 0      | Final external and promotion gates         |

## Final Summary (for PR/docs)

**What shipped:**

- A generic `explainer-kit` core with versioned run, fact-base, manifest,
  durability, theme, publish-request, and publish-receipt contracts.
- Named `project-explainer`, `project-recap`, `engineer-tour`, and
  `program-recap` recipes; neutral visual shells; adversarial fact-base
  reconciliation; and additive S3/CDN publishing.
- An `oat-explainer-kit` adapter with typed configuration, lifecycle policy,
  archive-safe recap exports, state intent, and project/repo output routing.
- A private-wrapper migration scaffold and release-grade acceptance tooling
  proven against the operator's real vault, Google Docs, and publish seams.

**Behavioral changes (user-facing):**

- Interactive project workflows can ask for a plan explainer unless configured
  otherwise; autonomous workflows require the final recap while keeping the
  plan explainer opt-in.
- Project recaps remain durable after archival through dated exports under
  `.oat/repo/reference/project-explainers/`; transient plan explainers stay with
  the project.
- Publishing is explicit, preset-selected, sentinel-first, additive, and
  disabled by default in the personal wrapper.

**Key files / modules:**

- `.agents/skills/explainer-kit/` - generic contracts, recipes, renderer,
  publishing connector, and tests.
- `.agents/skills/oat-explainer-kit/` - OAT configuration, lifecycle adapter,
  archive exports, and state integration.
- `tools/release/` - reproducible RC build/run, visual validation, and external
  acceptance validators.
- `.oat/repo/reference/explainer-kit-acceptance/v1/` - immutable RC,
  private-wrapper, live publish, and promotion evidence.

**Verification performed:**

- Phase-scoped unit/integration suites, lint, format, type-check, and build
  checks passed throughout implementation.
- Final `pnpm release:validate` and `pnpm test` passed.
- A fresh operator-supervised wrapper migration passed all six private gates.
- The packaged connector published through the frozen RC and passed independent
  CDN hash and S3 sentinel-deletion checks.

**Design deltas (if any):**

- The wave project added `program-recap` through the designed recipe extension
  seam before final freeze.
- Cross-machine declaration ordering made whole-tarball rebuilding
  non-byte-identical on the Mini; acceptance therefore consumed the exact
  retained laptop archive while separately verifying every explainer surface.
- The live publish plan command was corrected to include required artifact-root
  and explicit publish-confirmation arguments.

## Planning Gate Feedback

- **2026-07-17:** The configured cross-family plan gate target
  `codex-5-6-sol-max` was accepted against committed planning baseline
  `27659c61` and timed out after 900000ms. Its reviewer later wrote
  `artifact-plan-review-2026-07-17T191324Z.md`; receive-review resolved all
  findings directly in `plan.md` and `design.md`.
- **2026-07-17:** The user accepted the artifact corrections after manual
  review and explicitly waived the configured gate rerun for this project.
  Planning is complete and implementation may begin.

### Review Received: plan

**Date:** 2026-07-17
**Review artifact:**
`reviews/archived/artifact-plan-review-2026-07-17T191324Z.md`

**Findings:**

- Critical: 0
- Important: 4
- Medium: 3
- Minor: 1

**Artifact dispositions:**

- I1: clarified the separate managed-review and cross-family-gate statuses.
- I2: added the versioned durability-evidence schema and validation coverage.
- I3: made `renderStrategy` explicit at the renderer/build-record seam.
- I4: assigned provider-neutral adversarial critic execution and integration
  coverage.
- M1: added the local-project non-export completion case.
- M2: added cross-set terminology, number, and status cohesion QA.
- M3: assigned and tested bounded unknown-size discovery controls.
- m1: prohibited broad staging and narrowed affected task commit commands.

**New tasks added:** None; this was an artifact review and the approved changes
were applied directly.

**Next:** Execute the plan with `oat-project-implement`.

## References

- Plan: `plan.md`
- Design: `design.md`
- Spec: `spec.md`
- **plan:** ---
  oat_plan_source: spec-driven
  oat_status: complete
  oat_ready_for: oat-project-implement
  oat_blockers: []
  oat_last_updated: 2026-07-20
  oat_phase: plan
  oat_phase_status: complete
  oat_plan_parallel_groups: []
  oat_plan_hill_phases: ['p05']
  oat_auto_review_at_hill_checkpoints: true
  oat_import_reference: null
  oat_import_source_path: null
  oat_import_provider: null
  oat_generated: false
  oat_template: false

---

# Implementation Plan: explainer-kit

> Execute this plan using `oat-project-implement`. The phases are sequential
> because each consumes contracts or lifecycle behavior established earlier.

**Goal:** Ship a destination-blind `explainer-kit` core and an OAT lifecycle
adapter with stable contracts, neutral visual assets, honest durability,
archive-safe project recaps, and release-candidate acceptance evidence.

**Architecture:** Runtime logic and assets live inside the canonical core skill.
The adapter resolves OAT config/state and invokes the same versioned request,
manifest, build-record, durability, and publish contracts used by direct and
private callers.

**Tech Stack:** Node.js 22 ESM (`.mjs`), JSON Schema, Bash where retained from
the reference implementation, TypeScript 5.8 for CLI/control-plane integration,
Vitest/Node test runner, Playwright/browser QA, pnpm/Turborepo, AWS CLI.

**Commit Convention:** `{type}(pNN-tNN): {description}`

**Atomic Staging Rule:** Every task must stage only the exact paths listed in
that task's **Files** section. Directory-wide pathspecs are prohibited when
they could include work from another task.

## Planning Checklist

- [x] Defer HiLL checkpoint confirmation to `oat-project-implement`
- [x] Evaluated phases for parallelism; all phases are sequential dependencies
- [x] User confirmed the phase/task breakdown
- [x] Complete dispatch ladder verified
- [x] Project dispatch policy recorded: managed `high`
- [x] Optional Phase gate review disabled by user
- [x] Managed structured pre-gate plan review passed
- [x] Cross-family gate explicitly waived by the user after manual review and
      acceptance of the late artifact's fixes

## Parallelism

No parallel phase group is proposed. Phase 2 consumes Phase 1 contracts and pack
layout; Phase 3 consumes the core; Phase 4 consumes core/adapter integration;
Phase 5 consumes one frozen release candidate.

## Phase 1: Contracts, configuration, and packaged skeleton

**Milestone:** Both public skills install from their intended packs, strict v1
contracts validate, and OAT config/state can represent lifecycle intent.

### Task p01-t01: Scaffold canonical skills and register both packs

**Files:**

- Create: `.agents/skills/explainer-kit/SKILL.md`
- Create: `.agents/skills/oat-explainer-kit/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/skill-manifest.ts`
- Modify: `packages/cli/scripts/bundle-assets.sh`
- Modify: `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts`
- Modify: `packages/cli/src/validation/skills.test.ts`

**Step 1: Write test (RED)**

Add expectations that `explainer-kit` is in `UTILITY_SKILLS`,
`oat-explainer-kit` is in `WORKFLOW_SKILLS`, both are bundled, and canonical
frontmatter starts at version `1.0.0`.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/bundle-consistency.test.ts src/validation/skills.test.ts`
Expected: New pack/bundle assertions fail.

**Step 2: Implement (GREEN)**

Create minimal canonical skills with responsibilities, dependency direction,
and asset-relative path rules; register both pack entries and bundler paths.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/SKILL.md .agents/skills/oat-explainer-kit/SKILL.md packages/cli/src/commands/init/tools/shared/skill-manifest.ts packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts packages/cli/src/validation/skills.test.ts`

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/bundle-consistency.test.ts src/validation/skills.test.ts`
Expected: Both skills are valid and pack/bundle lists agree.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/SKILL.md .agents/skills/oat-explainer-kit/SKILL.md packages/cli/src/commands/init/tools/shared/skill-manifest.ts packages/cli/scripts/bundle-assets.sh packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts packages/cli/src/validation/skills.test.ts
git commit -m "feat(p01-t01): scaffold explainer skill family"
```

### Task p01-t02: Define strict versioned contract schemas

**Files:**

- Create: `.agents/skills/explainer-kit/schemas/run-request.schema.json`
- Create: `.agents/skills/explainer-kit/schemas/fact-base.schema.json`
- Create: `.agents/skills/explainer-kit/schemas/theme.schema.json`
- Create: `.agents/skills/explainer-kit/schemas/manifest.schema.json`
- Create: `.agents/skills/explainer-kit/schemas/build-record.schema.json`
- Create: `.agents/skills/explainer-kit/schemas/durability-evidence.schema.json`
- Create: `.agents/skills/explainer-kit/schemas/publish-request.schema.json`
- Create: `.agents/skills/explainer-kit/schemas/publish-receipt.schema.json`
- Create: `.agents/skills/explainer-kit/tests/schemas.test.mjs`

**Step 1: Write test (RED)**

Cover required schema IDs and closed object shapes for every versioned
contract, including `DurabilityEvidenceRequestV1`; cover shared outcome enums,
path fields, render strategy persistence, durability evidence arrays, and
receipt artifact uniqueness declarations.

Run: `node --test .agents/skills/explainer-kit/tests/schemas.test.mjs`
Expected: Tests fail because schemas do not exist.

**Step 2: Implement (GREEN)**

Encode the design's exact v1 data models as closed JSON Schemas. Keep
cross-record and filesystem rules for p01-t06.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/schemas .agents/skills/explainer-kit/tests/schemas.test.mjs`

**Step 4: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/schemas.test.mjs`
Expected: Schema structure and identity cases pass.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/schemas/run-request.schema.json .agents/skills/explainer-kit/schemas/fact-base.schema.json .agents/skills/explainer-kit/schemas/theme.schema.json .agents/skills/explainer-kit/schemas/manifest.schema.json .agents/skills/explainer-kit/schemas/build-record.schema.json .agents/skills/explainer-kit/schemas/durability-evidence.schema.json .agents/skills/explainer-kit/schemas/publish-request.schema.json .agents/skills/explainer-kit/schemas/publish-receipt.schema.json .agents/skills/explainer-kit/tests/schemas.test.mjs
git commit -m "feat(p01-t02): define explainer v1 schemas"
```

### Task p01-t03: Register typed explainer configuration

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/oat-config.test.ts`
- Modify: `packages/cli/src/config/resolve.ts`
- Modify: `packages/cli/src/config/resolve.test.ts`
- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`

**Step 1: Write test (RED)**

Add table-driven cases for all ten `explainers.*` and
`workflow.explainers.*` keys: type, scope, default, source precedence,
repository-relative shared theme paths, and shared-only publish roots.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/config/resolve.test.ts src/commands/config/index.test.ts`
Expected: New keys are unknown or unresolved.

**Step 2: Implement (GREEN)**

Extend `OatConfig`, defaults, parser/serializer, config key metadata, and
`get/set/list/describe` behavior without adding artifact-root keys.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/config/oat-config.ts packages/cli/src/config/oat-config.test.ts packages/cli/src/config/resolve.ts packages/cli/src/config/resolve.test.ts packages/cli/src/commands/config/index.ts packages/cli/src/commands/config/index.test.ts`

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/config/resolve.test.ts src/commands/config/index.test.ts`
Expected: Every key is discoverable and invalid scope/value cases fail.

**Step 5: Commit**

```bash
git add packages/cli/src/config/oat-config.ts packages/cli/src/config/oat-config.test.ts packages/cli/src/config/resolve.ts packages/cli/src/config/resolve.test.ts packages/cli/src/commands/config/index.ts packages/cli/src/commands/config/index.test.ts
git commit -m "feat(p01-t03): register typed explainer config"
```

### Task p01-t04: Add explainer intent to project state

**Files:**

- Modify: `packages/control-plane/src/types.ts`
- Modify: `packages/control-plane/src/project.ts`
- Modify: `packages/control-plane/src/state/parser.ts`
- Modify: `packages/control-plane/src/state/parser.test.ts`
- Modify: `packages/control-plane/src/project.test.ts`
- Modify: `packages/cli/src/validation/project-state.ts`
- Modify: `packages/cli/src/validation/project-state.test.ts`

**Step 1: Write test (RED)**

Cover nullable explainer/recap decisions, valid sources/timestamps, absent-field
compatibility, unknown keys, invalid source/decision pairs, and autonomous
recap `skip` rejection.

Run: `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/state/parser.test.ts src/project.test.ts && pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/project-state.test.ts`
Expected: New state fields are unavailable or rejected.

**Step 2: Implement (GREEN)**

Add `ExplainerDecisionV1` and optional `oat_project_explainer` /
`oat_project_recap` parsing and CLI validation.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/control-plane/src/types.ts packages/control-plane/src/project.ts packages/control-plane/src/state/parser.ts packages/control-plane/src/state/parser.test.ts packages/control-plane/src/project.test.ts packages/cli/src/validation/project-state.ts packages/cli/src/validation/project-state.test.ts`

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/state/parser.test.ts src/project.test.ts && pnpm --filter @open-agent-toolkit/cli exec vitest run src/validation/project-state.test.ts`
Expected: Old projects remain valid and intent invariants pass.

**Step 5: Commit**

```bash
git add packages/control-plane/src/types.ts packages/control-plane/src/project.ts packages/control-plane/src/state/parser.ts packages/control-plane/src/state/parser.test.ts packages/control-plane/src/project.test.ts packages/cli/src/validation/project-state.ts packages/cli/src/validation/project-state.test.ts
git commit -m "feat(p01-t04): model explainer lifecycle intent"
```

### Task p01-t05: Enforce packaged core dependency compatibility

**Files:**

- Create: `.agents/skills/oat-explainer-kit/scripts/check-core.mjs`
- Create: `.agents/skills/oat-explainer-kit/tests/check-core.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/utility/install-utility.test.ts`
- Modify: `packages/cli/src/commands/init/tools/workflows/install-workflows.test.ts`

**Step 1: Write test (RED)**

Cover compatible installed core, missing core, old major/minor, source-tree-only
false positives, and exact utility-pack install/update guidance.

Run: `node --test .agents/skills/oat-explainer-kit/tests/check-core.test.mjs`
Expected: Dependency checks do not exist.

**Step 2: Implement (GREEN)**

Implement `checkCoreCompatibility({ adapterRoot, minimumVersion })` using only
installed canonical paths and document fail-closed adapter behavior.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-explainer-kit packages/cli/src/commands/init/tools/utility/install-utility.test.ts packages/cli/src/commands/init/tools/workflows/install-workflows.test.ts`

**Step 4: Verify**

Run: `node --test .agents/skills/oat-explainer-kit/tests/check-core.test.mjs && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/utility/install-utility.test.ts src/commands/init/tools/workflows/install-workflows.test.ts`
Expected: Installed-layout dependency behavior passes.

**Step 5: Commit**

```bash
git add .agents/skills/oat-explainer-kit/scripts/check-core.mjs .agents/skills/oat-explainer-kit/tests/check-core.test.mjs .agents/skills/oat-explainer-kit/SKILL.md packages/cli/src/commands/init/tools/utility/install-utility.test.ts packages/cli/src/commands/init/tools/workflows/install-workflows.test.ts
git commit -m "feat(p01-t05): enforce explainer core compatibility"
```

### Task p01-t06: Implement contract and safe-path validation

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/lib/contracts.mjs`
- Create: `.agents/skills/explainer-kit/scripts/lib/safe-paths.mjs`
- Create: `.agents/skills/explainer-kit/scripts/validate.mjs`
- Create: `.agents/skills/explainer-kit/tests/contracts.test.mjs`

**Step 1: Write test (RED)**

Cover valid v1 fixtures plus unknown versions/keys, unsafe relative paths and
symlink escapes, incomplete publish blocks, invalid render strategy, duplicate
artifact paths, canonical hashes, cross-record mismatch, raw-secret fields,
and direct validation of the `durability-evidence` contract kind.

Run: `node --test .agents/skills/explainer-kit/tests/contracts.test.mjs`
Expected: Runtime contract validation does not exist.

**Step 2: Implement (GREEN)**

Implement `validateContract(kind, value)`, canonical hashing, and root-confined
path resolution. Return structured path/code/message errors without reading
ambient config.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/scripts/lib/contracts.mjs .agents/skills/explainer-kit/scripts/lib/safe-paths.mjs .agents/skills/explainer-kit/scripts/validate.mjs .agents/skills/explainer-kit/tests/contracts.test.mjs`

**Step 4: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/contracts.test.mjs`
Expected: Positive, negative, path, hash, and cross-record cases pass.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/contracts.mjs .agents/skills/explainer-kit/scripts/lib/safe-paths.mjs .agents/skills/explainer-kit/scripts/validate.mjs .agents/skills/explainer-kit/tests/contracts.test.mjs
git commit -m "feat(p01-t06): validate explainer contracts"
```

## Phase 2: Core pipeline, themes, rendering, and durability

**Milestone:** Direct packaged-core build-only runs produce complete,
schema-valid packages for both canonical recipes without OAT config.

### Task p02-t01: Normalize run requests and create atomic run records

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/lib/fs-safe.mjs`
- Create: `.agents/skills/explainer-kit/scripts/lib/records.mjs`
- Create: `.agents/skills/explainer-kit/tests/records.test.mjs`

**Step 1: Write test (RED)**

Cover output-root containment, symlink/traversal rejection, slug normalization,
privacy-safe request persistence, monotonic stages, interruption-safe temp
files, and incomplete/failed initial outcomes.

Run: `node --test .agents/skills/explainer-kit/tests/records.test.mjs`
Expected: Record helpers are missing.

**Step 2: Implement (GREEN)**

Implement `initializeRun(request)`, `updateBuildRecord(run, stage)`, and
`writeManifestAtomic(run, manifest)`.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/scripts/lib .agents/skills/explainer-kit/tests/records.test.mjs`

**Step 4: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/records.test.mjs`
Expected: Filesystem and record state tests pass.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/fs-safe.mjs .agents/skills/explainer-kit/scripts/lib/records.mjs .agents/skills/explainer-kit/tests/records.test.mjs
git commit -m "feat(p02-t01): add atomic explainer run records"
```

### Task p02-t02: Implement reconciled fact-base processing

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/lib/fact-base.mjs`
- Create: `.agents/skills/explainer-kit/references/fact-base-contract.md`
- Create: `.agents/skills/explainer-kit/tests/fact-base.test.mjs`

**Step 1: Write test (RED)**

Cover supplied-base consistency/freshness checks, federated source precedence,
contradiction classification, operator overrides, citations, and unresolved
claims. Assert that federated processing invokes a provider-neutral critic
callback and incorporates its result, while supplied fact bases run only the
documented lightweight consistency/freshness check.

Run: `node --test .agents/skills/explainer-kit/tests/fact-base.test.mjs`
Expected: Fact-base processor is missing.

**Step 2: Implement (GREEN)**

Implement supplied/federated normalization and a provider-neutral critic
execution seam without embedding provider-specific dispatch commands. Define
how the critic result enters contradiction classification and provenance.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/scripts/lib/fact-base.mjs .agents/skills/explainer-kit/references/fact-base-contract.md .agents/skills/explainer-kit/tests/fact-base.test.mjs`

**Step 4: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/fact-base.test.mjs`
Expected: Both source modes produce cited, reconciled records.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/fact-base.mjs .agents/skills/explainer-kit/references/fact-base-contract.md .agents/skills/explainer-kit/tests/fact-base.test.mjs
git commit -m "feat(p02-t02): implement explainer fact base"
```

### Task p02-t03: Add recipe registry and canonical narrative contracts

**Files:**

- Create: `.agents/skills/explainer-kit/recipes/project-explainer.json`
- Create: `.agents/skills/explainer-kit/recipes/project-recap.json`
- Create: `.agents/skills/explainer-kit/recipes/engineer-tour.json`
- Create: `.agents/skills/explainer-kit/scripts/lib/recipes.mjs`
- Create: `.agents/skills/explainer-kit/tests/recipes.test.mjs`

**Step 1: Write test (RED)**

Assert recipe/version lookup, closed source roles, one-project recap binding,
the six recap accountability sections, unsupported recipe errors, and generic
engineer-tour independence. Cover recipe-level unknown-size discovery limits:
stop after two consecutive no-new-findings rounds and always stop at the
recipe's hard maximum.

Run: `node --test .agents/skills/explainer-kit/tests/recipes.test.mjs`
Expected: Registry and recipes are missing.

**Step 2: Implement (GREEN)**

Implement `loadRecipe(id, version)`, narrative/content-model validation, and
closed discovery-limit configuration. Do not add `program-recap`.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/recipes .agents/skills/explainer-kit/scripts/lib/recipes.mjs .agents/skills/explainer-kit/tests/recipes.test.mjs`

**Step 4: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/recipes.test.mjs`
Expected: Canonical and optional recipe contracts pass.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/recipes/project-explainer.json .agents/skills/explainer-kit/recipes/project-recap.json .agents/skills/explainer-kit/recipes/engineer-tour.json .agents/skills/explainer-kit/scripts/lib/recipes.mjs .agents/skills/explainer-kit/tests/recipes.test.mjs
git commit -m "feat(p02-t03): add explainer recipe registry"
```

### Task p02-t04: Implement dual-mode theme resolution

**Files:**

- Create: `.agents/skills/explainer-kit/palettes/neutral.json`
- Create: `.agents/skills/explainer-kit/palettes/ocean.json`
- Create: `.agents/skills/explainer-kit/palettes/ember.json`
- Create: `.agents/skills/explainer-kit/palettes/forest.json`
- Create: `.agents/skills/explainer-kit/palettes/violet.json`
- Create: `.agents/skills/explainer-kit/profiles/clean.json`
- Create: `.agents/skills/explainer-kit/profiles/editorial.json`
- Create: `.agents/skills/explainer-kit/profiles/technical.json`
- Create: `.agents/skills/explainer-kit/scripts/lib/theme.mjs`
- Create: `.agents/skills/explainer-kit/tests/theme.test.mjs`

**Step 1: Write test (RED)**

Cover neutral defaults, 3–5 palettes, 2–3 profiles, supplied-bundle precedence,
art-direction hashes/redaction, both complete modes, AA pairs, canonical bundle
hashes, and default-only/user-switchable presentation. Assert that
`renderStrategy` is persisted in normalized requests/build records while
remaining absent from `ResolvedThemeV1` and `bundleHash`.

Run: `node --test .agents/skills/explainer-kit/tests/theme.test.mjs`
Expected: Theme resolver/assets are missing.

**Step 2: Implement (GREEN)**

Implement `resolveTheme(selection)` with closed semantic roles and keep
`renderStrategy` in the normalized request/build record, not bundle identity;
the renderer receives it as a separate input.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/palettes .agents/skills/explainer-kit/profiles .agents/skills/explainer-kit/scripts/lib/theme.mjs .agents/skills/explainer-kit/tests/theme.test.mjs`

**Step 4: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/theme.test.mjs`
Expected: Theme precedence, contrast, and hash cases pass.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/palettes/neutral.json .agents/skills/explainer-kit/palettes/ocean.json .agents/skills/explainer-kit/palettes/ember.json .agents/skills/explainer-kit/palettes/forest.json .agents/skills/explainer-kit/palettes/violet.json .agents/skills/explainer-kit/profiles/clean.json .agents/skills/explainer-kit/profiles/editorial.json .agents/skills/explainer-kit/profiles/technical.json .agents/skills/explainer-kit/scripts/lib/theme.mjs .agents/skills/explainer-kit/tests/theme.test.mjs
git commit -m "feat(p02-t04): implement resolved theme system"
```

### Task p02-t05: Neutralize production templates

**Files:**

- Create: `.agents/skills/explainer-kit/templates/house-style.html`
- Create: `.agents/skills/explainer-kit/templates/deck-shell.html`
- Create: `.agents/skills/explainer-kit/templates/diagram-shell.html`
- Create: `.agents/skills/explainer-kit/templates/engineer-tour.html`
- Create: `.agents/skills/explainer-kit/examples/project-explainer/fact-base.md`
- Create: `.agents/skills/explainer-kit/examples/project-explainer/content.md`
- Create: `.agents/skills/explainer-kit/examples/project-recap/fact-base.md`
- Create: `.agents/skills/explainer-kit/examples/project-recap/content.md`
- Create: `.agents/skills/explainer-kit/examples/theme-bundle.json`
- Create: `.agents/skills/explainer-kit/tests/templates.test.mjs`

**Step 1: Write test (RED)**

Cover documented tokens, inline-only assets, valid shell structure, and absence
of organization-specific names, colors, destinations, or example content.
Assert worked examples exist only under `examples/` and use RFC 2606 domains.
For `deck-shell.html`, cover left-to-right slide advance as the presentation
default, x-axis overflow confinement inside slide content, both keyboard arrow
pairs (`Left`/`Right` and `Up`/`Down`), a readable no-JS fallback, and a
vertical print layout.

Run: `node --test .agents/skills/explainer-kit/tests/templates.test.mjs`
Expected: Neutral production templates are missing.

**Step 2: Implement (GREEN)**

Evolve the reference shells while removing hardcoded branding/destinations and
preserving sticky navigation, diagrams, deck layout, and expandable code. Move
worked content into the exact external example fixtures.
Implement the deck as horizontal paging by default; preserve vertical document
flow when JavaScript is unavailable and in print media. Keep wide inner content
contained on the x-axis rather than expanding the page.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/templates .agents/skills/explainer-kit/examples .agents/skills/explainer-kit/tests/templates.test.mjs`

**Step 4: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/templates.test.mjs`
Expected: Every production shell is neutral and token-complete; deck navigation,
overflow, no-JS, and print-axis cases pass.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/templates/house-style.html .agents/skills/explainer-kit/templates/deck-shell.html .agents/skills/explainer-kit/templates/diagram-shell.html .agents/skills/explainer-kit/templates/engineer-tour.html .agents/skills/explainer-kit/examples/project-explainer/fact-base.md .agents/skills/explainer-kit/examples/project-explainer/content.md .agents/skills/explainer-kit/examples/project-recap/fact-base.md .agents/skills/explainer-kit/examples/project-recap/content.md .agents/skills/explainer-kit/examples/theme-bundle.json .agents/skills/explainer-kit/tests/templates.test.mjs
git commit -m "feat(p02-t05): add neutral explainer templates"
```

### Task p02-t06: Implement typed-path rendering

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/lib/render.mjs`
- Create: `.agents/skills/explainer-kit/tests/render.test.mjs`

**Step 1: Write test (RED)**

Cover escaped content, template token substitution, local assets, default-only
and user-switchable modes, explicit index URLs, typed site paths, artifact
cross-links, and unknown template/token rejection.

Run: `node --test .agents/skills/explainer-kit/tests/render.test.mjs`
Expected: Renderer is missing.

**Step 2: Implement (GREEN)**

Implement
`renderArtifact({ recipeArtifact, content, theme, renderStrategy, publicBaseUrl })`
using only validated recipes/themes, a separately validated render strategy,
and bundled templates.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/scripts/lib/render.mjs .agents/skills/explainer-kit/tests/render.test.mjs`

**Step 4: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/render.test.mjs`
Expected: Neutral self-contained artifacts render to typed paths.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/render.mjs .agents/skills/explainer-kit/tests/render.test.mjs
git commit -m "feat(p02-t06): render typed explainer artifacts"
```

### Task p02-t07: Add structural, accessibility, and leak QA

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/lib/qa.mjs`
- Create: `.agents/skills/explainer-kit/scripts/render-qa.mjs`
- Create: `.agents/skills/explainer-kit/tests/qa.test.mjs`
- Create: `.agents/skills/explainer-kit/tests/fixtures/seeded-leak.html`

**Step 1: Write test (RED)**

Cover unresolved tokens, denylisted strings, inline-only assets, tag balance,
heading/link rules, inner-container overflow probes, reduced motion, keyboard
navigation, representative widths, seeded leak rejection, and cross-set
cohesion. Add positive/negative artifact-set fixtures for inconsistent
terminology, numeric claims, and statuses.

Run: `node --test .agents/skills/explainer-kit/tests/qa.test.mjs`
Expected: QA entry points are missing.

**Step 2: Implement (GREEN)**

Implement structural and cross-set cohesion checks plus a browser-probe
contract that can use available Playwright/browser tooling without becoming a
core dependency.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/scripts/lib/qa.mjs .agents/skills/explainer-kit/scripts/render-qa.mjs .agents/skills/explainer-kit/tests`

**Step 4: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/qa.test.mjs`
Expected: Positive fixtures pass and the seeded leak/overflow cases fail.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/qa.mjs .agents/skills/explainer-kit/scripts/render-qa.mjs .agents/skills/explainer-kit/tests/qa.test.mjs .agents/skills/explainer-kit/tests/fixtures/seeded-leak.html
git commit -m "feat(p02-t07): add explainer render QA"
```

### Task p02-t08: Implement honest durability evidence

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/lib/durability.mjs`
- Create: `.agents/skills/explainer-kit/scripts/record-durability.mjs`
- Create: `.agents/skills/explainer-kit/tests/durability.test.mjs`

**Step 1: Write test (RED)**

Cover false-by-default rebuildability, deterministic replay evidence, commit
blob/hash verification, publish receipt verification, mutable-record exclusion,
two-commit termination, evidence arrays/supersession, and honest outcome
agreement.

Run: `node --test .agents/skills/explainer-kit/tests/durability.test.mjs`
Expected: Durability verifier is missing.

**Step 2: Implement (GREEN)**

Implement `recordDurability(request)` without creating commits and preserve
`built-not-durable` on verification failure.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/scripts/lib/durability.mjs .agents/skills/explainer-kit/scripts/record-durability.mjs .agents/skills/explainer-kit/tests/durability.test.mjs`

**Step 4: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/durability.test.mjs`
Expected: Commit/publish evidence and false-claim cases pass.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/durability.mjs .agents/skills/explainer-kit/scripts/record-durability.mjs .agents/skills/explainer-kit/tests/durability.test.mjs
git commit -m "feat(p02-t08): implement durability evidence"
```

### Task p02-t09: Compose the config-blind core run

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/run.mjs`
- Create: `.agents/skills/explainer-kit/references/contracts.md`
- Modify: `.agents/skills/explainer-kit/SKILL.md`
- Create: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`

**Step 1: Write test (RED)**

Run canonical recipes from temporary directories with no `.oat` files; cover
supplied/federated facts, stage failures, retained intermediates, privacy-safe
records, schema-valid results, and unattended approved-source runs. Assert
federated runs execute the adversarial critic while supplied runs perform only
the lightweight check. Exercise both the two-empty-round discovery stop and
the recipe hard maximum.

Run: `node --test .agents/skills/explainer-kit/tests/run.integration.test.mjs`
Expected: Core orchestration entry point is missing.

**Step 2: Implement (GREEN)**

Compose validate → fact-base → recipe/content → theme → render → QA →
manifest/build-record for unattended approved-source runs, with optional
durability/publish invoked only by request. Enforce recipe discovery bounds and
wire the provider-neutral critic execution seam only for federated inputs.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/scripts/run.mjs .agents/skills/explainer-kit/references/contracts.md .agents/skills/explainer-kit/SKILL.md .agents/skills/explainer-kit/tests/run.integration.test.mjs`

**Step 4: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/*.test.mjs`
Expected: Full config-free core suite passes.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/run.mjs .agents/skills/explainer-kit/references/contracts.md .agents/skills/explainer-kit/SKILL.md .agents/skills/explainer-kit/tests/run.integration.test.mjs
git commit -m "feat(p02-t09): compose explainer core pipeline"
```

### Task p02-t10: Gate interactive content approval and resume

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/lib/content-approval.mjs`
- Create: `.agents/skills/explainer-kit/tests/content-approval.test.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`
- Modify: `.agents/skills/explainer-kit/SKILL.md`

**Step 1: Write test (RED)**

Cover interactive pause after Markdown generation, no render/publish before
approval, rejection/correction persistence, same-run resume after approval, and
unattended lifecycle provenance that does not prompt.

Run: `node --test .agents/skills/explainer-kit/tests/content-approval.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs`
Expected: Interactive runs render without an explicit approval state.

**Step 2: Implement (GREEN)**

Implement `resolveContentApproval(run, mode, reviewedSource)` and resumable
stage state. Publishing remains independently human-gated.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/scripts/lib/content-approval.mjs .agents/skills/explainer-kit/tests/content-approval.test.mjs .agents/skills/explainer-kit/scripts/run.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/explainer-kit/SKILL.md`

**Step 4: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/content-approval.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs`
Expected: Interactive approval/resume and unattended provenance cases pass.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/content-approval.mjs .agents/skills/explainer-kit/tests/content-approval.test.mjs .agents/skills/explainer-kit/scripts/run.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/explainer-kit/SKILL.md
git commit -m "feat(p02-t10): gate explainer content approval"
```

## Phase 3: OAT adapter and lifecycle integration

**Milestone:** OAT resolves policy and paths, invokes the packaged core at plan
and completion gates, and preserves only final recap records through archival.

### Task p03-t01: Resolve adapter config and canonical output roots

**Files:**

- Create: `.agents/skills/oat-explainer-kit/scripts/resolve-config.mjs`
- Create: `.agents/skills/oat-explainer-kit/scripts/resolve-paths.mjs`
- Create: `.agents/skills/oat-explainer-kit/tests/config-paths.test.mjs`
- Create: `.agents/skills/oat-explainer-kit/references/config-contract.md`

**Step 1: Write test (RED)**

Cover `oat config get --json` value/source use, runtime overrides, cross-field
publish checks, active shared/local project roots, repo reference explainers,
direct-call rejection, symlinks, and traversal.

Run: `node --test .agents/skills/oat-explainer-kit/tests/config-paths.test.mjs`
Expected: Adapter resolution is missing.

**Step 2: Implement (GREEN)**

Implement source-aware translation into `ExplainerRunRequestV1` and fixed
`.oat/repo/reference/explainers/` non-project placement.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-explainer-kit`

**Step 4: Verify**

Run: `node --test .agents/skills/oat-explainer-kit/tests/config-paths.test.mjs`
Expected: Config/path matrix passes.

**Step 5: Commit**

```bash
git add .agents/skills/oat-explainer-kit/scripts/resolve-config.mjs .agents/skills/oat-explainer-kit/scripts/resolve-paths.mjs .agents/skills/oat-explainer-kit/tests/config-paths.test.mjs .agents/skills/oat-explainer-kit/references/config-contract.md
git commit -m "feat(p03-t01): resolve OAT explainer inputs"
```

### Task p03-t02: Bind OAT artifacts and invoke the core

**Files:**

- Create: `.agents/skills/oat-explainer-kit/scripts/bind-project-sources.mjs`
- Create: `.agents/skills/oat-explainer-kit/scripts/run.mjs`
- Create: `.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/SKILL.md`

**Step 1: Write test (RED)**

Cover plan/design/spec/implementation/summary source roles, approved-artifact
review provenance, supplied fact-base pass-through, core result propagation,
missing/incompatible core, and no ambient private config.

Run: `node --test .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`
Expected: Adapter run path is missing.

**Step 2: Implement (GREEN)**

Implement project source binding and invoke the installed core with one
normalized request/manifest seam.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-explainer-kit`

**Step 4: Verify**

Run: `node --test .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`
Expected: Adapter/core integration passes.

**Step 5: Commit**

```bash
git add .agents/skills/oat-explainer-kit/scripts/bind-project-sources.mjs .agents/skills/oat-explainer-kit/scripts/run.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs .agents/skills/oat-explainer-kit/SKILL.md
git commit -m "feat(p03-t02): bind OAT explainer sources"
```

### Task p03-t03: Implement lifecycle intent resolution

**Files:**

- Create: `.agents/skills/oat-explainer-kit/scripts/resolve-intent.mjs`
- Create: `.agents/skills/oat-explainer-kit/scripts/persist-intent.mjs`
- Create: `.agents/skills/oat-explainer-kit/tests/intent.test.mjs`
- Create: `.agents/skills/oat-explainer-kit/references/lifecycle-contract.md`

**Step 1: Write test (RED)**

Cover mode → project state → workflow preference → default precedence,
ask-once persistence, stale conflicts, autonomous forced recap, prompt-only
autonomous explainer, and invalid autonomous skip.

Run: `node --test .agents/skills/oat-explainer-kit/tests/intent.test.mjs`
Expected: Intent resolver is missing.

**Step 2: Implement (GREEN)**

Implement pure `resolveIntent(...)` plus safe frontmatter persistence helpers.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-explainer-kit`

**Step 4: Verify**

Run: `node --test .agents/skills/oat-explainer-kit/tests/intent.test.mjs`
Expected: Full precedence table passes.

**Step 5: Commit**

```bash
git add .agents/skills/oat-explainer-kit/scripts/resolve-intent.mjs .agents/skills/oat-explainer-kit/scripts/persist-intent.mjs .agents/skills/oat-explainer-kit/tests/intent.test.mjs .agents/skills/oat-explainer-kit/references/lifecycle-contract.md
git commit -m "feat(p03-t03): resolve explainer lifecycle intent"
```

### Task p03-t04: Integrate plan and autonomous kickoff gates

**Files:**

- Modify: `.agents/skills/oat-project-plan/SKILL.md`
- Modify: `.agents/skills/oat-project-autonomous/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

**Step 1: Write test (RED)**

Add contract assertions for plan ask-once behavior, post-plan generation,
failure-without-plan-rollback, autonomous forced recap intent, and
kickoff-request-only explainer intent.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: Lifecycle skill contracts lack explainer gates.

**Step 2: Implement (GREEN)**

Add adapter invocation steps without changing existing plan artifact review,
dispatch, or HiLL contracts. Defer PR-scoped skill version bumps to p04-t05.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-project-plan/SKILL.md .agents/skills/oat-project-autonomous/SKILL.md packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: Planning/autonomous contract assertions pass.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-plan/SKILL.md .agents/skills/oat-project-autonomous/SKILL.md packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "feat(p03-t04): add explainer planning intent"
```

### Task p03-t05: Centralize tracked-run commit finalization

**Files:**

- Create: `.agents/skills/oat-explainer-kit/scripts/finalize-tracked-run.mjs`
- Create: `.agents/skills/oat-explainer-kit/tests/finalize-tracked-run.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/references/lifecycle-contract.md`

**Step 1: Write test (RED)**

Cover dedicated versus completion-bookkeeping commit modes, artifact commit
then evidence commit, mutable-record exclusion, push-together instructions,
verification failure, later attestation, and unrelated-change isolation.

Run: `node --test .agents/skills/oat-explainer-kit/tests/finalize-tracked-run.test.mjs`
Expected: Shared finalizer is missing.

**Step 2: Implement (GREEN)**

Implement a command planner/verifier; the adapter may invoke git but the core
still only verifies evidence and never creates commits.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-explainer-kit`

**Step 4: Verify**

Run: `node --test .agents/skills/oat-explainer-kit/tests/finalize-tracked-run.test.mjs`
Expected: Two-commit choreography terminates and failure remains recoverable.

**Step 5: Commit**

```bash
git add .agents/skills/oat-explainer-kit/scripts/finalize-tracked-run.mjs .agents/skills/oat-explainer-kit/tests/finalize-tracked-run.test.mjs .agents/skills/oat-explainer-kit/references/lifecycle-contract.md
git commit -m "feat(p03-t05): centralize explainer durability commits"
```

### Task p03-t06: Integrate implementation-tail recap and summary visibility

**Files:**

- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `.agents/skills/oat-project-summary/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

**Step 1: Write test (RED)**

Assert fresh-recap deduplication, mandatory autonomous attempt, non-blocking
failed/built-not-durable outcomes, final HiLL placement, concise summary
outcome, and preserved existing implementation review sequencing.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: Implementation/summary contracts lack recap behavior.

**Step 2: Implement (GREEN)**

Add lifecycle-tail adapter/finalizer calls and summary outcome rules. Defer
PR-scoped skill version bumps to p04-t05.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-project-implement/SKILL.md .agents/skills/oat-project-summary/SKILL.md packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: Non-blocking recap and summary visibility contracts pass.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-implement/SKILL.md .agents/skills/oat-project-summary/SKILL.md packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "feat(p03-t06): add implementation recap lifecycle"
```

### Task p03-t07: Export the selected recap during archive

**Files:**

- Modify: `packages/cli/src/commands/project/archive/index.ts`
- Modify: `packages/cli/src/commands/project/archive/index.test.ts`
- Modify: `packages/cli/src/commands/project/archive/push-runner.ts`
- Modify: `packages/cli/src/commands/project/archive/push-runner.test.ts`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.test.ts`

**Step 1: Write test (RED)**

Cover optional `--project-recap-run`, project containment, recipe identity,
exact `reference/project-recaps/YYYYMMDD-slug` root, existing-destination
failure, temp sibling cleanup, hash verification, atomic rename, failed recap
packages, no-recap runs, and no active deletion on export failure.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/index.test.ts src/commands/project/archive/push-runner.test.ts src/commands/project/archive/archive-utils.test.ts`
Expected: Archive command does not accept/export recap packages.

**Step 2: Implement (GREEN)**

Extend archive options/result with `ArchiveProjectRecapExportV1`; export only
the selected recap and preserve existing summary/S3 behavior.

**Step 3: Format**

Run: `pnpm exec oxfmt --write packages/cli/src/commands/project/archive`

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/index.test.ts src/commands/project/archive/push-runner.test.ts src/commands/project/archive/archive-utils.test.ts`
Expected: Copy-before-delete and retry-safe archive cases pass.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/project/archive/index.ts packages/cli/src/commands/project/archive/index.test.ts packages/cli/src/commands/project/archive/push-runner.ts packages/cli/src/commands/project/archive/push-runner.test.ts packages/cli/src/commands/project/archive/archive-utils.ts packages/cli/src/commands/project/archive/archive-utils.test.ts
git commit -m "feat(p03-t07): export durable project recaps"
```

### Task p03-t08: Integrate interactive completion policy

**Files:**

- Modify: `.agents/skills/oat-project-complete/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- Create: `.agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs`

**Step 1: Write test (RED)**

Cover batched ask behavior, persisted generate/skip intent, fresh-recap reuse,
final recap selection, archive argument plumbing, no-recap completion, and
project-explainer exclusion from durable reference products. Add a local-scope
project case asserting no tracked recap export, no archive argument, and
`built-not-durable` unless independent publish evidence exists.

Run: `node --test .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: Completion flow lacks explainer policy and selection.

**Step 2: Implement (GREEN)**

Wire adapter resolution, recap selection, and archive argument construction
into completion. Defer durability/link choreography to p03-t09 and the
PR-scoped skill version bump to p04-t05.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-project-complete/SKILL.md .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`

**Step 4: Verify**

Run: `node --test .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/review-skill-contracts.test.ts`
Expected: Interactive completion policy and selection cases pass.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-complete/SKILL.md .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts
git commit -m "feat(p03-t08): integrate completion recap policy"
```

### Task p03-t09: Finalize recap durability and archive-aware links

**Files:**

- Modify: `.agents/skills/oat-project-complete/SKILL.md`
- Modify: `.agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/references/lifecycle-contract.md`

**Step 1: Write test (RED)**

Cover archive export report consumption, lifecycle bookkeeping commit, exported
recap re-attestation, active-path evidence supersession, evidence commit,
failed-attestation warning without completion failure, and non-404 summary/PR
links to the tracked reference root.

Run: `node --test .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs`
Expected: Completion stops before re-attestation and durable link rewriting.

**Step 2: Implement (GREEN)**

Add the two-commit completion choreography and archive-aware links. Never use
the gitignored archive as evidence or a post-completion link target.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-project-complete/SKILL.md .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs .agents/skills/oat-explainer-kit/references/lifecycle-contract.md`

**Step 4: Verify**

Run: `node --test .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs`
Expected: Archive-safe durability and link cases pass.

**Step 5: Commit**

```bash
git add .agents/skills/oat-project-complete/SKILL.md .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs .agents/skills/oat-explainer-kit/references/lifecycle-contract.md
git commit -m "feat(p03-t09): reattest archived project recaps"
```

## Phase 4: Publishing, compatibility, documentation, and release validation

**Milestone:** The public connector and packaged family pass repository quality
gates, and the frozen extension seam is ready for external acceptance.

### Task p04-t01: Implement sentinel-first additive S3 publishing

**Files:**

- Create: `.agents/skills/explainer-kit/scripts/lib/s3-static.mjs`
- Create: `.agents/skills/explainer-kit/scripts/publish.mjs`
- Create: `.agents/skills/explainer-kit/tests/s3-static.test.mjs`
- Create: `.agents/skills/explainer-kit/references/destination-contract.md`

**Step 1: Write test (RED)**

Cover corresponding-root normalization, run-unique sentinel suffixes, auth
failure, additive/idempotent uploads, duplicate paths, MIME/cache metadata,
explicit index URLs, public verification, receipts, and no delete/undeclared
overwrite.

Run: `node --test .agents/skills/explainer-kit/tests/s3-static.test.mjs`
Expected: Connector is missing.

**Step 2: Implement (GREEN)**

Implement argv-safe AWS CLI/HTTP operations with bounded transient retries and
human-gated invocation.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/scripts .agents/skills/explainer-kit/tests/s3-static.test.mjs .agents/skills/explainer-kit/references/destination-contract.md`

**Step 4: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/s3-static.test.mjs`
Expected: Local fake-S3/HTTP connector suite passes.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/lib/s3-static.mjs .agents/skills/explainer-kit/scripts/publish.mjs .agents/skills/explainer-kit/tests/s3-static.test.mjs .agents/skills/explainer-kit/references/destination-contract.md
git commit -m "feat(p04-t01): add s3 static connector"
```

### Task p04-t02: Add release-grade visual and traceability fixtures

**Files:**

- Create: `.agents/skills/explainer-kit/tests/visual-matrix.test.mjs`
- Create: `.agents/skills/explainer-kit/tests/rebuildability.test.mjs`
- Create: `.agents/skills/explainer-kit/tests/fixtures/operational-wisdom.json`
- Modify: `.agents/skills/explainer-kit/scripts/render-qa.mjs`

**Step 1: Write test (RED)**

Cover all curated palettes/modes, every profile/artifact class, representative
viewports, a seeded false rebuildable claim, source/output hashes, and the
0.4.1 operational-wisdom trace.

Run: `node --test .agents/skills/explainer-kit/tests/visual-matrix.test.mjs .agents/skills/explainer-kit/tests/rebuildability.test.mjs`
Expected: Release fixtures/checks are missing.

**Step 2: Implement (GREEN)**

Add bounded matrix selection and trace fixtures without introducing a
deterministic renderer requirement.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/tests .agents/skills/explainer-kit/scripts/render-qa.mjs`

**Step 4: Verify**

Run: `node --test .agents/skills/explainer-kit/tests/visual-matrix.test.mjs .agents/skills/explainer-kit/tests/rebuildability.test.mjs`
Expected: Visual/traceability fixtures pass and false claims fail.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/tests/visual-matrix.test.mjs .agents/skills/explainer-kit/tests/rebuildability.test.mjs .agents/skills/explainer-kit/tests/fixtures/operational-wisdom.json .agents/skills/explainer-kit/scripts/render-qa.mjs
git commit -m "test(p04-t02): add explainer release QA fixtures"
```

### Task p04-t03: Add private-wrapper compatibility fixture and migration runbook

**Files:**

- Create: `tools/smoke/explainer-kit/wrapper-compatibility.test.mjs`
- Create: `tools/smoke/explainer-kit/fixtures/private-wrapper.mjs`
- Create: `.agents/skills/explainer-kit/references/extension-contract.md`
- Create: `.agents/skills/oat-explainer-kit/references/migration.md`
- Modify: `.agents/skills/explainer-kit/SKILL.md`
- Modify: `.agents/skills/oat-explainer-kit/SKILL.md`

**Step 1: Write test (RED)**

Exercise wrapper pre-resolution → `ExplainerRunRequestV1` → core run → manifest
consumption → post-run linking, with personal concerns remaining outside public
config.

Run: `node --test tools/smoke/explainer-kit/wrapper-compatibility.test.mjs`
Expected: Compatibility fixture/runbook are missing.

**Step 2: Implement (GREEN)**

Evolve the supplied migration draft into the frozen public extension contract,
RC sequence, rollback path, and operator-owned real-wrapper gate.
Carry the confirmed `personal-oat` public root
`https://dy4vzrzaexuy5.cloudfront.net` into the private wrapper's
`presets.example.json` and eventual Stoa configuration example; keep the
destination out of neutral public core fixtures.

**Step 3: Format**

Run: `pnpm exec oxfmt --write tools/smoke/explainer-kit .agents/skills/explainer-kit .agents/skills/oat-explainer-kit`

**Step 4: Verify**

Run: `node --test tools/smoke/explainer-kit/wrapper-compatibility.test.mjs`
Expected: Fixture proves the public seam without private assets.

**Step 5: Commit**

```bash
git add tools/smoke/explainer-kit/wrapper-compatibility.test.mjs tools/smoke/explainer-kit/fixtures/private-wrapper.mjs .agents/skills/explainer-kit/references/extension-contract.md .agents/skills/oat-explainer-kit/references/migration.md .agents/skills/explainer-kit/SKILL.md .agents/skills/oat-explainer-kit/SKILL.md
git commit -m "test(p04-t03): prove wrapper extension seam"
```

### Task p04-t04: Document the public explainer family

**Files:**

- Create: `apps/oat-docs/docs/workflows/skills/explainer-kit.md`
- Modify: `apps/oat-docs/docs/workflows/skills/index.md`
- Modify: `apps/oat-docs/docs/workflows/projects/artifacts.md`
- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md`
- Modify: `apps/oat-docs/docs/cli-utilities/tool-packs.md`
- Modify: `apps/oat-docs/index.md` (generated)
- Modify: `NOTICES.md`

**Step 1: Analyze documentation delta**

Compare shipped contracts/config/pack placement with existing pages; keep
program-recap, private destinations, and legacy flat-layout migration out of v1.

**Step 2: Present delta plan and obtain approval**

Show the exact page-level additions/edits and attribution change to the user.
Do not author substantive documentation until the user approves that delta.

**Step 3: Author**

Document core/adapter usage, project-explainer versus durable project-recap,
repo reference paths, theme selection, build-only behavior, publishing, and
MIT-derived visual patterns.

**Step 4: Format**

Run: `pnpm exec oxfmt --write apps/oat-docs/docs/workflows/skills/explainer-kit.md apps/oat-docs/docs/workflows/skills/index.md apps/oat-docs/docs/workflows/projects/artifacts.md apps/oat-docs/docs/cli-utilities/configuration.md apps/oat-docs/docs/cli-utilities/tool-packs.md NOTICES.md`

**Step 5: Verify**

Run: `pnpm -w run cli:source -- docs generate-index --docs-dir apps/oat-docs/docs --output apps/oat-docs/index.md && pnpm build:docs`
Expected: Authored contents, generated index, and docs build pass.

**Step 6: Commit**

```bash
git add apps/oat-docs/docs/workflows/skills/explainer-kit.md apps/oat-docs/docs/workflows/skills/index.md apps/oat-docs/docs/workflows/projects/artifacts.md apps/oat-docs/docs/cli-utilities/configuration.md apps/oat-docs/docs/cli-utilities/tool-packs.md apps/oat-docs/index.md NOTICES.md
git commit -m "docs(p04-t04): document explainer kit"
```

### Task p04-t05: Bump shipped versions and pass release validation

**Files:**

- Modify: `.agents/skills/explainer-kit/SKILL.md`
- Modify: `.agents/skills/oat-explainer-kit/SKILL.md`
- Modify: `.agents/skills/oat-project-autonomous/SKILL.md`
- Modify: `.agents/skills/oat-project-plan/SKILL.md`
- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `.agents/skills/oat-project-complete/SKILL.md`
- Modify: `.agents/skills/oat-project-summary/SKILL.md`
- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- Modify: `.agents/docs/autonomy-contract.md`

**Step 1: Verify version delta (RED)**

Run: `pnpm run cli:source -- internal validate-skill-version-bumps --base-ref origin/main && pnpm release:validate`
Expected: Skill-delta validation reports missing existing-skill bumps and
release validation reports missing lockstep public-package bumps.

**Step 2: Implement (GREEN)**

Keep new skills at their single PR-scoped version, bump every changed existing
skill once, and bump all five public packages in lockstep from the then-current
version.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .agents/skills/explainer-kit/SKILL.md .agents/skills/oat-explainer-kit/SKILL.md .agents/skills/oat-project-autonomous/SKILL.md .agents/skills/oat-project-plan/SKILL.md .agents/skills/oat-project-implement/SKILL.md .agents/skills/oat-project-complete/SKILL.md .agents/skills/oat-project-summary/SKILL.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json pnpm-lock.yaml`

**Step 4: Verify**

Run: `pnpm build && pnpm lint && pnpm format && pnpm type-check && pnpm test && pnpm run cli:source -- internal validate-skill-version-bumps --base-ref origin/main && pnpm release:validate`
Expected: Workspace, skill-version, and publishable-package release gates pass.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/SKILL.md .agents/skills/oat-explainer-kit/SKILL.md .agents/skills/oat-project-autonomous/SKILL.md .agents/skills/oat-project-plan/SKILL.md .agents/skills/oat-project-implement/SKILL.md .agents/skills/oat-project-complete/SKILL.md .agents/skills/oat-project-summary/SKILL.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json pnpm-lock.yaml packages/cli/src/validation/skills.test.ts packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts .agents/docs/autonomy-contract.md
git commit -m "chore(p04-t05): prepare explainer release candidate"
```

### Task p04-t06: Prove packaged core and adapter execution

**Files:**

- Create: `tools/smoke/explainer-kit/packaged-layout.test.mjs`
- Create: `tools/smoke/explainer-kit/fixtures/package-root.mjs`

**Step 1: Write test (RED)**

Build CLI assets into a temporary root, install the utility/workflows skill
directories at their intended scopes, invoke a config-free packaged
`project-explainer` run, invoke the packaged adapter against that core, and
cover missing/incompatible-core failures.

Run: `node --test tools/smoke/explainer-kit/packaged-layout.test.mjs`
Expected: Packaged-layout execution fixture is missing.

**Step 2: Implement (GREEN)**

Use `OAT_ASSETS_DIR` with `packages/cli/scripts/bundle-assets.sh`; never resolve
runtime assets back to the source checkout.

**Step 3: Format**

Run: `pnpm exec oxfmt --write tools/smoke/explainer-kit/packaged-layout.test.mjs tools/smoke/explainer-kit/fixtures/package-root.mjs`

**Step 4: Verify**

Run: `node --test tools/smoke/explainer-kit/packaged-layout.test.mjs`
Expected: Installed core/adapter success and dependency failures pass.

**Step 5: Commit**

```bash
git add tools/smoke/explainer-kit/packaged-layout.test.mjs tools/smoke/explainer-kit/fixtures/package-root.mjs
git commit -m "test(p04-t06): verify packaged explainer execution"
```

### Task p04-t07: Build reproducible retained release candidates

**Files:**

- Create: `tools/release/build-explainer-rc.mjs`
- Create: `tools/release/build-explainer-rc.test.mjs`

**Step 1: Write test (RED)**

Cover retained package tarballs and an RC manifest with commit, package/skill
versions, schema/recipe IDs, hashes, stable ordering, changed candidates, and
volatile timestamp exclusion.

Run: `node --test tools/release/build-explainer-rc.test.mjs`
Expected: RC builder is missing.

**Step 2: Implement (GREEN)**

Implement `build-explainer-rc.mjs --output <dir> --record <json>`. It retains
local tarballs and writes a stable tracked identity record; it does not publish.

**Step 3: Format**

Run: `pnpm exec oxfmt --write tools/release/build-explainer-rc.mjs tools/release/build-explainer-rc.test.mjs`

**Step 4: Verify**

Run: `node --test tools/release/build-explainer-rc.test.mjs`
Expected: Retention, stable identity, and changed-candidate cases pass.

**Step 5: Commit**

```bash
git add tools/release/build-explainer-rc.mjs tools/release/build-explainer-rc.test.mjs
git commit -m "feat(p04-t07): build retained explainer RC"
```

### Task p04-t08: Run connector entry points from the retained RC

**Files:**

- Create: `tools/release/run-explainer-rc.mjs`
- Create: `tools/release/run-explainer-rc.test.mjs`

**Step 1: Write test (RED)**

Cover RC manifest validation, tarball hash verification, temporary extraction,
allowed entry-point containment, packaged execution records, cleanup, and
source-tree fallback rejection.

Run: `node --test tools/release/run-explainer-rc.test.mjs`
Expected: Packaged RC runner is missing.

**Step 2: Implement (GREEN)**

Implement `run-explainer-rc.mjs --rc-manifest <json> --entry <path> --record
<json> -- <entry args>` with structured nonzero failures.

**Step 3: Format**

Run: `pnpm exec oxfmt --write tools/release/run-explainer-rc.mjs tools/release/run-explainer-rc.test.mjs`

**Step 4: Verify**

Run: `node --test tools/release/run-explainer-rc.test.mjs`
Expected: Only hash-verified packaged entry points execute.

**Step 5: Commit**

```bash
git add tools/release/run-explainer-rc.mjs tools/release/run-explainer-rc.test.mjs
git commit -m "feat(p04-t08): run frozen explainer RC"
```

### Task p04-t09: Validate external acceptance evidence

**Files:**

- Create: `tools/release/validate-explainer-acceptance.mjs`
- Create: `tools/release/validate-explainer-acceptance.test.mjs`

**Step 1: Write test (RED)**

Cover wrapper/publish/all modes, matching frozen RC IDs, passing verdicts,
packaged connector execution, receipt hashes, sentinel deletion, missing
evidence, and changed candidate rejection.

Run: `node --test tools/release/validate-explainer-acceptance.test.mjs`
Expected: Acceptance validator is missing.

**Step 2: Implement (GREEN)**

Implement `validate-explainer-acceptance.mjs <acceptance-dir> --gate
wrapper|publish|all` with structured nonzero failures.

**Step 3: Format**

Run: `pnpm exec oxfmt --write tools/release/validate-explainer-acceptance.mjs tools/release/validate-explainer-acceptance.test.mjs`

**Step 4: Verify**

Run: `node --test tools/release/validate-explainer-acceptance.test.mjs`
Expected: Identity, mismatch, packaged execution, and verdict cases pass.

**Step 5: Commit**

```bash
git add tools/release/validate-explainer-acceptance.mjs tools/release/validate-explainer-acceptance.test.mjs
git commit -m "feat(p04-t09): validate explainer acceptance"
```

## Phase 5: Release-candidate acceptance

**Milestone:** One unchanged packaged RC passes the real private-wrapper and
live S3/CDN gates; only then is v1 promotion allowed.

### Task p05-t01: Produce and identify the frozen packaged RC

**Files:**

- Create: `.oat/repo/reference/explainer-kit-acceptance/v1/rc.json`
- Create: `.oat/repo/reference/explainer-kit-acceptance/v1/rc.md`

**Step 1: Build candidate**

Run: `pnpm release:validate && node tools/release/build-explainer-rc.mjs --output dist/explainer-kit-rc --record .oat/repo/reference/explainer-kit-acceptance/v1/rc.json`
Expected: Retained local tarballs and a tracked RC identity record are created.
Add operator notes in `rc.md`; record commit, package/skill versions,
schema/recipe IDs, and artifact hashes.

**Step 2: Format**

Run: `pnpm exec oxfmt --write .oat/repo/reference/explainer-kit-acceptance/v1/rc.json .oat/repo/reference/explainer-kit-acceptance/v1/rc.md`

**Step 3: Verify**

Run: `node tools/release/build-explainer-rc.mjs --output dist/explainer-kit-rc --record .oat/repo/reference/explainer-kit-acceptance/v1/rc.verify.json && cmp .oat/repo/reference/explainer-kit-acceptance/v1/rc.json .oat/repo/reference/explainer-kit-acceptance/v1/rc.verify.json && rm .oat/repo/reference/explainer-kit-acceptance/v1/rc.verify.json`
Expected: Rebuilding the unchanged candidate produces the same identity record.

**Step 4: Commit**

```bash
git add .oat/repo/reference/explainer-kit-acceptance/v1/rc.json .oat/repo/reference/explainer-kit-acceptance/v1/rc.md
git commit -m "chore(p05-t01): freeze explainer release candidate"
```

### Task p05-t02: Record the operator-owned private-wrapper E2E

**Files:**

- Create: `.oat/repo/reference/explainer-kit-acceptance/v1/private-wrapper-result.json`
- Create: `.oat/repo/reference/explainer-kit-acceptance/v1/private-wrapper-e2e.md`

**Step 1: Execute external runbook**

The operator/wave project migrates the real private wrapper to the v1 seam,
then runs:

```bash
~/.agents/skills/personal-explainer-kit/scripts/acceptance.mjs \
  --rc-manifest "$PWD/.oat/repo/reference/explainer-kit-acceptance/v1/rc.json" \
  --request "$PRIVATE_WRAPPER_ACCEPTANCE_REQUEST" \
  --output "$PWD/.oat/repo/reference/explainer-kit-acceptance/v1/private-wrapper-result.json"
```

The private request remains outside the repository. The run validates vault,
Google Docs, presets, personal destinations, manifest consumption, and rollback.

**Step 2: Record evidence**

Capture RC identity, sanitized command/context, manifest/receipt hashes,
durability result, capability checklist, and operator verdict. No credentials
or private content enter this repository.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .oat/repo/reference/explainer-kit-acceptance/v1/private-wrapper-result.json .oat/repo/reference/explainer-kit-acceptance/v1/private-wrapper-e2e.md`

**Step 4: Verify**

Run: `node tools/release/validate-explainer-acceptance.mjs .oat/repo/reference/explainer-kit-acceptance/v1 --gate wrapper`
Expected: Wrapper verdict passes and references exactly the frozen RC.

**Step 5: Commit**

```bash
git add .oat/repo/reference/explainer-kit-acceptance/v1/private-wrapper-result.json .oat/repo/reference/explainer-kit-acceptance/v1/private-wrapper-e2e.md
git commit -m "test(p05-t02): record private wrapper acceptance"
```

### Task p05-t03: Record the live S3/CDN smoke test

**Files:**

- Create: `.oat/repo/reference/explainer-kit-acceptance/v1/live-publish-request.json`
- Create: `.oat/repo/reference/explainer-kit-acceptance/v1/live-publish-result.json`
- Create: `.oat/repo/reference/explainer-kit-acceptance/v1/publish-receipt.json`
- Create: `.oat/repo/reference/explainer-kit-acceptance/v1/s3-cdn-smoke.md`

**Step 1: Execute live test**

Create a credential-free request that references an RC artifact and the
operator-provisioned corresponding roots, then run:

```bash
node tools/release/run-explainer-rc.mjs \
  --rc-manifest .oat/repo/reference/explainer-kit-acceptance/v1/rc.json \
  --artifacts-dir dist/explainer-kit-rc \
  --entry scripts/publish.mjs \
  --record .oat/repo/reference/explainer-kit-acceptance/v1/live-publish-result.json \
  -- \
  --request .oat/repo/reference/explainer-kit-acceptance/v1/live-publish-request.json \
  --receipt .oat/repo/reference/explainer-kit-acceptance/v1/publish-receipt.json \
  --confirm-publish
```

The runner verifies/extracts the recorded core tarball and forbids a source-tree
fallback. Credentials come only from the standard AWS chain. Retain the
sanitized receipt and packaged-execution record.

**Step 2: Validate**

Confirm the sentinel used a run-unique unguessable suffix, was removed, no
undeclared object changed, MIME is correct, and receipt hashes match the RC
artifact.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .oat/repo/reference/explainer-kit-acceptance/v1/live-publish-request.json .oat/repo/reference/explainer-kit-acceptance/v1/live-publish-result.json .oat/repo/reference/explainer-kit-acceptance/v1/publish-receipt.json .oat/repo/reference/explainer-kit-acceptance/v1/s3-cdn-smoke.md`

**Step 4: Verify**

Run: `node tools/release/validate-explainer-acceptance.mjs .oat/repo/reference/explainer-kit-acceptance/v1 --gate publish`
Expected: Live URL, sentinel, receipt, packaged connector identity, and frozen
RC identity pass.

**Step 5: Commit**

```bash
git add .oat/repo/reference/explainer-kit-acceptance/v1/live-publish-request.json .oat/repo/reference/explainer-kit-acceptance/v1/live-publish-result.json .oat/repo/reference/explainer-kit-acceptance/v1/publish-receipt.json .oat/repo/reference/explainer-kit-acceptance/v1/s3-cdn-smoke.md
git commit -m "test(p05-t03): record live explainer publish"
```

### Task p05-t04: Confirm promotion readiness

**Files:**

- Create: `.oat/repo/reference/explainer-kit-acceptance/v1/promotion.md`

**Step 1: Reconcile evidence**

Verify RC, private-wrapper, and S3/CDN records reference one unchanged commit
and package/skill/schema/recipe set. Any failure requires a new RC and rerun of
both external gates.

**Step 2: Run final gates**

Run: `node tools/release/validate-explainer-acceptance.mjs .oat/repo/reference/explainer-kit-acceptance/v1 --gate all && pnpm release:validate && pnpm test`
Expected: Both external gates reference the unchanged RC and the repository
remains release-valid.

**Step 3: Format**

Run: `pnpm exec oxfmt --write .oat/repo/reference/explainer-kit-acceptance/v1/promotion.md`

**Step 4: Commit**

```bash
git add .oat/repo/reference/explainer-kit-acceptance/v1/promotion.md
git commit -m "chore(p05-t04): approve explainer v1 promotion"
```

## Reviews

| Scope  | Type     | Status          | Date       | Artifact                                                    |
| ------ | -------- | --------------- | ---------- | ----------------------------------------------------------- |
| p01    | code     | passed          | 2026-07-17 | reviews/p01-review-2026-07-17T230548Z.md                    |
| p02    | code     | passed          | 2026-07-18 | reviews/p02-review-2026-07-18T015729Z.md                    |
| p03    | code     | passed          | 2026-07-18 | reviews/p03-review-2026-07-18T120653Z.md                    |
| p04    | code     | passed          | 2026-07-18 | reviews/p04-reconciliation-review-2026-07-18T200037Z.md     |
| p05    | code     | pending         | -          | -                                                           |
| p-rev1 | code     | fixes_completed | 2026-07-21 | reviews/2026-07-21-p-rev1-code-review.md                    |
| p-rev1 | code     | passed          | 2026-07-21 | reviews/2026-07-21-p-rev1-code-rereview-2.md                |
| final  | code     | passed          | 2026-07-21 | reviews/2026-07-21-p-rev1-code-rereview-2.md                |
| spec   | artifact | pending         | -          | -                                                           |
| design | artifact | pending         | -          | -                                                           |
| plan   | artifact | fixes_completed | 2026-07-17 | reviews/archived/artifact-plan-review-2026-07-17T191324Z.md |

**Status values:** `pending` → `received` → `fixes_added` →
`fixes_completed` → `passed`

## Phase p-rev1: Revision 1 — W6 recap durability, authored content, and curated styles

Source: inline operator feedback and first live unattended Stoa W6 recap
evidence (2026-07-20)

**Revision contract:**

- Preserve schema-v1 compatibility through additive fields and explicit legacy
  diagnostics.
- Require provider-neutral authored content for every unattended run; keep the
  existing interactive review path.
- Add named `style` selection as the default front door while continuing to
  accept legacy `palette`/`visualProfile` selections with deprecation warnings.
- Treat the accepted four shared-content previews under
  `references/revision-1-theme-previews/` as the visual baseline.

### Task prev1-t01: (revision) Hash the complete immutable recap package

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/explainer-kit/schemas/manifest.schema.json`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/contracts.test.mjs`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.test.ts`
- Modify: `.agents/skills/explainer-kit/references/contracts.md`

**Step 1: Add failing cross-boundary fixtures**

Reproduce the W6 archive failure with a completed recap whose manifest omits
`run-request.json` and `source/content-approval.json`. Assert that newly
generated manifests cover every retained immutable input/provenance file and
that the CLI archive validator verifies the same set.

**Step 2: Align generation and validation**

Expand core immutable hashing to include the privacy-safe persisted request,
content approval, and any retained author-provenance record introduced by
`prev1-t02`. Keep the core schema/runtime validator and TypeScript archive
validator aligned on one documented v1 coverage contract. Historical
incomplete manifests must fail with a targeted legacy-manifest diagnostic;
do not weaken archive validation or silently invent hashes.

**Step 3: Verify**

Run:
`node --test .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs && pnpm --filter @open-agent-toolkit/cli test -- archive-utils.test.ts`

Expected: complete-package manifests archive successfully; omitted, stale, or
tampered immutable files fail deterministically.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/scripts/run.mjs .agents/skills/explainer-kit/scripts/lib/contracts.mjs .agents/skills/explainer-kit/schemas/manifest.schema.json .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/explainer-kit/tests/contracts.test.mjs packages/cli/src/commands/project/archive/archive-utils.ts packages/cli/src/commands/project/archive/archive-utils.test.ts .agents/skills/explainer-kit/references/contracts.md
git commit -m "fix(prev1-t01): hash complete recap packages"
```

### Task prev1-t02: (revision) Require structured authored content for unattended runs

**Files:**

- Create: `.agents/skills/explainer-kit/schemas/author-request.schema.json`
- Create: `.agents/skills/explainer-kit/schemas/author-result.schema.json`
- Modify: `.agents/skills/explainer-kit/scripts/lib/contracts.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/content-approval.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/lib/qa.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/tests/schemas.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/content-approval.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/qa.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`
- Modify: `.agents/skills/explainer-kit/references/contracts.md`
- Modify: `.agents/skills/explainer-kit/SKILL.md`

**Step 1: Freeze the author contracts**

Define a versioned per-artifact request containing the recipe, required
narrative outline, reconciled fact base, and discovery context. Define a
structured result with exact section IDs, authored prose, and non-secret author
provenance. Keep the persisted run request data-only; resolve callbacks
in-process through `options.author` and in JSON-only CLI callers through
`--author-module`.

**Step 2: Fail closed and retain provenance**

Invoke the author once per recipe artifact. Every unattended run without an
author must fail at the content stage before generated narrative is written.
Validate section completeness and prose before serialization, retain the
validated author record, and leave the interactive reviewed-source path
unchanged.

**Step 3: Add a source-dumping backstop**

Add deterministic normalized word-shingle overlap checks against raw source
artifacts. Calibrate thresholds with concise legitimate W6 prose, obvious
verbatim dumps, and boundary fixtures; report actionable diagnostics without
making the heuristic a substitute for the mandatory author seam.

**Step 4: Verify**

Run:
`node --test .agents/skills/explainer-kit/tests/schemas.test.mjs .agents/skills/explainer-kit/tests/content-approval.test.mjs .agents/skills/explainer-kit/tests/qa.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs`

Expected: unattended no-author and source-dump fixtures fail without narrative;
in-process and CLI-module authors produce validated content and provenance.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/schemas/author-request.schema.json .agents/skills/explainer-kit/schemas/author-result.schema.json .agents/skills/explainer-kit/scripts/lib/contracts.mjs .agents/skills/explainer-kit/scripts/lib/content-approval.mjs .agents/skills/explainer-kit/scripts/lib/qa.mjs .agents/skills/explainer-kit/scripts/run.mjs .agents/skills/explainer-kit/tests/schemas.test.mjs .agents/skills/explainer-kit/tests/content-approval.test.mjs .agents/skills/explainer-kit/tests/qa.test.mjs .agents/skills/explainer-kit/tests/run.integration.test.mjs .agents/skills/explainer-kit/references/contracts.md .agents/skills/explainer-kit/SKILL.md
git commit -m "feat(prev1-t02): require unattended content authors"
```

### Task prev1-t03: (revision) Ship four curated named styles

**Files:**

- Create: `.agents/skills/explainer-kit/styles/clean-neutral.json`
- Create: `.agents/skills/explainer-kit/styles/business-corporate.json`
- Create: `.agents/skills/explainer-kit/styles/navy-ocean.json`
- Create: `.agents/skills/explainer-kit/styles/dark-edgy.json`
- Modify: `.agents/skills/explainer-kit/schemas/run-request.schema.json`
- Modify: `.agents/skills/explainer-kit/schemas/theme.schema.json`
- Modify: `.agents/skills/explainer-kit/scripts/lib/theme.mjs`
- Modify: `.agents/skills/explainer-kit/templates/deck-shell.html`
- Modify: `.agents/skills/explainer-kit/tests/theme.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/templates.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/render.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/visual-matrix.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/scripts/resolve-config.mjs`
- Modify: `.agents/skills/oat-explainer-kit/tests/config-paths.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/references/config-contract.md`
- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/oat-config.test.ts`
- Modify: `packages/cli/src/config/resolve.ts`
- Modify: `packages/cli/src/config/resolve.test.ts`
- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md`

**Step 1: Add named-style compatibility**

Add optional `style` selection with the four curated names. An explicit
supplied bundle retains highest precedence; explicit `style` wins over legacy
matrix fields; legacy `palette`/`visualProfile` remains accepted as an advanced
compatibility path and emits a deprecation warning. An omitted selection uses
`clean-neutral` and records a visible default-selection warning.

**Step 2: Implement whole-system style bundles**

Translate the accepted previews into complete style contracts spanning color,
typography, density, geometry, component accents, and motion. All decks use
fixed-viewport horizontal navigation, accessible controls, hash/counter
synchronization, localized short-screen overflow, print layout, and
reduced-motion behavior. Accent colors may recur semantically across a deck but
must not duplicate within one visible card/stat row. Dark/Edgy uses a solid
canvas with no dot texture.

**Step 3: Verify**

Run:
`node --test .agents/skills/explainer-kit/tests/theme.test.mjs .agents/skills/explainer-kit/tests/templates.test.mjs .agents/skills/explainer-kit/tests/render.test.mjs .agents/skills/explainer-kit/tests/visual-matrix.test.mjs .agents/skills/oat-explainer-kit/tests/config-paths.test.mjs && pnpm --filter @open-agent-toolkit/cli test -- oat-config.test.ts resolve.test.ts`

Expected: all four styles are visually distinct and pass desktop/mobile,
keyboard, reduced-motion, print, overflow, leak, and compatibility checks.

**Step 4: Commit**

```bash
git add .agents/skills/explainer-kit/styles .agents/skills/explainer-kit/schemas/run-request.schema.json .agents/skills/explainer-kit/schemas/theme.schema.json .agents/skills/explainer-kit/scripts/lib/theme.mjs .agents/skills/explainer-kit/templates/deck-shell.html .agents/skills/explainer-kit/tests/theme.test.mjs .agents/skills/explainer-kit/tests/templates.test.mjs .agents/skills/explainer-kit/tests/render.test.mjs .agents/skills/explainer-kit/tests/visual-matrix.test.mjs .agents/skills/oat-explainer-kit/scripts/resolve-config.mjs .agents/skills/oat-explainer-kit/tests/config-paths.test.mjs .agents/skills/oat-explainer-kit/references/config-contract.md packages/cli/src/config/oat-config.ts packages/cli/src/config/oat-config.test.ts packages/cli/src/config/resolve.ts packages/cli/src/config/resolve.test.ts apps/oat-docs/docs/cli-utilities/configuration.md
git commit -m "feat(prev1-t03): add curated explainer styles"
```

### Task prev1-t04: (revision) Normalize generated Codex config indentation

**Files:**

- Modify: `packages/cli/src/providers/codex/codec/config-merge.ts`
- Modify: `packages/cli/src/providers/codex/codec/config-merge.test.ts`
- Modify: `packages/cli/src/providers/codex/codec/sync-extension.test.ts`
- Modify: `.codex/config.toml`

**Step 1: Add a failing formatting contract**

Assert that merged and fully generated Codex project configs keep every table
header and key/value line left-aligned while preserving TOML semantics,
unmanaged settings, idempotency, and multiline string contents.

**Step 2: Normalize serializer output safely**

Apply Codex-config-specific formatting after `@iarna/toml` serialization. Do
not change the generic role-file serializer or rely on a direct hand-edit of
generated `.codex/config.toml`. Regenerate the checked-in project config through
the Codex extension path.

**Step 3: Verify**

Run:
`pnpm --filter @open-agent-toolkit/cli test -- config-merge.test.ts sync-extension.test.ts`

Expected: generated config parses identically, is idempotent, and contains no
unexpected leading indentation outside string content.

**Step 4: Commit**

```bash
git add packages/cli/src/providers/codex/codec/config-merge.ts packages/cli/src/providers/codex/codec/config-merge.test.ts packages/cli/src/providers/codex/codec/sync-extension.test.ts .codex/config.toml
git commit -m "fix(prev1-t04): normalize codex config indentation"
```

### Task prev1-t05: (revision) Validate the packaged revision with the live W6 recap

**Status:** complete

**Files:**

- Modify: `.agents/skills/explainer-kit/SKILL.md`
- Modify: `.agents/skills/oat-explainer-kit/SKILL.md`
- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json`
- Modify: `packages/cli/src/validation/skills.test.ts`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.ts`
- Modify: `packages/cli/src/commands/project/archive/archive-utils.test.ts`
- Modify: `tools/smoke/explainer-kit/packaged-layout.test.mjs`
- Modify: `tools/smoke/explainer-kit/wrapper-compatibility.test.mjs`
- Modify: `tools/smoke/explainer-kit/fixtures/package-root.mjs`
- Modify: `tools/smoke/explainer-kit/fixtures/private-wrapper.mjs`
- Modify: `.oat/sync/manifest.json`
- Modify: `.oat/projects/shared/explainer-kit/implementation.md`
- Create: `.oat/projects/shared/explainer-kit/references/revision-1-w6-acceptance.md`

**Step 1: Reconcile shipped versions**

Bump each changed canonical skill once and advance all five public packages in
lockstep from merged-main `0.2.9` to `0.2.10`. Refresh generated provider views
and package-version metadata.

**Step 2: Run repository release gates**

Run:
`oat sync --scope all && pnpm format && pnpm lint && pnpm type-check && pnpm test && pnpm release:validate`

Expected: provider views match canonical skills and every required repository
and publishable-package gate passes.

**Step 3: Run the first-consumer regression**

Execute the retained Stoa W6 recap inputs through the packaged candidate with a
real author module and one accepted curated style. Verify authored,
publishable-quality narrative; complete immutable hashes; successful
`oat project archive --project-recap-run`; visual gates; and no undeclared
archive mutations. Record exact candidate identity and sanitized evidence.
The archive validator must preserve the manifest contract's canonical
fact-base/theme hashes while independently verifying complete file-byte
coverage through `immutableHashes`; do not require those distinct hash
semantics to be byte-identical.

**Step 4: Review**

Run a fresh-context final review over `p-rev1`, resolve any findings through the
normal review receive loop, and rerun affected gates.

**Step 5: Commit**

```bash
git add .agents/skills/explainer-kit/SKILL.md .agents/skills/oat-explainer-kit/SKILL.md packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets/public-package-versions.json packages/cli/src/validation/skills.test.ts packages/cli/src/commands/project/archive/archive-utils.ts packages/cli/src/commands/project/archive/archive-utils.test.ts tools/smoke/explainer-kit/packaged-layout.test.mjs tools/smoke/explainer-kit/wrapper-compatibility.test.mjs tools/smoke/explainer-kit/fixtures/package-root.mjs tools/smoke/explainer-kit/fixtures/private-wrapper.mjs .oat/sync/manifest.json .oat/projects/shared/explainer-kit/implementation.md .oat/projects/shared/explainer-kit/references/revision-1-w6-acceptance.md
git commit -m "chore(prev1-t05): validate explainer revision"
```

### Task prev1-t06: (review fix) Expose curated style through the public config CLI

**Status:** complete

**Files:**

- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`
- Modify: `.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`

**Step 1: Write tests (RED)**

Prove `explainers.defaults.style` is a real get/set key at local, shared, and
user scopes; accepted values are the four curated style IDs; invalid values
fail; and the adapter resolves the default through the real CLI-backed config
path. Assert the legacy palette/profile catalog entries are nullable and
deprecated rather than advertised as the primary defaults.

**Step 2: Implement (GREEN)**

Add the style key to the public catalog, ordering, validation, and scope
handling. Preserve legacy palette/profile compatibility without presenting it
as the default front door.

**Step 3: Verify**

Run the focused config and adapter tests, then formatting and lint.

**Step 4: Commit**

```bash
git commit -m "fix(prev1-t06): expose curated style config"
```

### Task prev1-t07: (review fix) Propagate unattended authors through the OAT adapter

**Status:** complete

**Files:**

- Modify: `.agents/skills/oat-explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`
- Modify: `.agents/skills/oat-explainer-kit/SKILL.md`
- Modify: `.agents/skills/oat-explainer-kit/references/lifecycle-contract.md`
- Modify: `tools/smoke/explainer-kit/fixtures/package-root.mjs`
- Modify: `tools/smoke/explainer-kit/packaged-layout.test.mjs`

**Step 1: Write tests (RED)**

Cover direct `author`, JSON-safe `authorModulePath`, missing/invalid module,
direct-plus-module conflict, validated export shape, actual-core execution, and
the official adapter CLI path. The smoke test must not use a custom runner to
inject `coreOptions.author`.

**Step 2: Implement (GREEN)**

Resolve exactly one provider-neutral author seam at the adapter boundary and
pass it to `core.runExplainer`. Keep executable callbacks out of persisted run
requests and preserve interactive behavior.

**Step 3: Verify**

Run focused adapter/core and packaged-layout smoke tests, then formatting and
lint.

**Step 4: Commit**

```bash
git commit -m "fix(prev1-t07): propagate adapter author seam"
```

### Task prev1-t08: (review fix) Reject section-local source dumping

**Status:** complete

**Files:**

- Modify: `.agents/skills/explainer-kit/scripts/lib/qa.mjs`
- Modify: `.agents/skills/explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/explainer-kit/tests/qa.test.mjs`
- Modify: `.agents/skills/explainer-kit/tests/run.integration.test.mjs`

**Step 1: Write tests (RED)**

Prove one verbatim section among several original sections is rejected, concise
fact-preserving prose remains valid, and the finding identifies the offending
section. Use reconciled fact-base claim text as the privacy-safe comparison
corpus; raw source documents remain outside the author and retained-package
contract.

**Step 2: Implement (GREEN)**

Score authored sections independently against the fact-base corpus, retaining
the aggregate check only if it adds coverage without diluting section-local
failures.

**Step 3: Verify**

Run focused QA/core integration tests, then every repository and release gate
serially. Re-run the packaged W6 acceptance and confirm the retained archive is
unchanged.

**Step 4: Re-review**

Repeat the fresh-context `p-rev1` review and require zero Critical, Important,
and Medium findings.

**Step 5: Commit**

```bash
git commit -m "fix(prev1-t08): detect section source dumping"
```

### Task prev1-t09: (re-review fix) Align the authoritative design with Revision 1

**Status:** complete

**Files:**

- Modify: `.oat/projects/shared/explainer-kit/design.md`
- Modify: `.oat/projects/shared/explainer-kit/reviews/2026-07-21-p-rev1-code-review.md`

**Step 1: Reconcile the design**

Update component responsibilities, contract kinds, author request/result
interfaces, curated-style theme selection/provenance, config precedence, and
requirement-to-test mapping. Preserve palette/profile only as deprecated
compatibility inputs.

**Step 2: Clean review formatting**

Remove trailing whitespace from the prior review artifact without changing its
substantive findings.

**Step 3: Verify and commit**

Run formatting, `git diff --check`, and targeted text assertions for the
Revision 1 contracts.

```bash
git commit -m "docs(prev1-t09): align revision design"
```

### Task prev1-t10: (re-review fix) Enforce author cardinality at the adapter boundary

**Status:** complete

**Files:**

- Modify: `.agents/skills/oat-explainer-kit/scripts/run.mjs`
- Modify: `.agents/skills/oat-explainer-kit/tests/run.integration.test.mjs`

**Step 1: Write tests (RED)**

Prove unattended adapter calls reject zero or two author seams before invoking
the core, while interactive calls permit zero. Retain direct and module author
success cases.

**Step 2: Implement (GREEN)**

Make author cardinality validation mode-aware at the adapter boundary without
weakening the core's independent failure behavior.

**Step 3: Verify**

Run focused adapter and packaged smoke tests, then all repository and release
gates serially.

**Step 4: Re-review and commit**

Commit the bounded fix, then repeat a narrowed fresh-context re-review.

```bash
git commit -m "fix(prev1-t10): require unattended adapter author"
```

## Implementation Complete

**Summary:**

- Phase 1: 6 tasks — schemas/validation, config/state, package skeleton
- Phase 2: 10 tasks — core pipeline, themes, rendering, QA, durability
- Phase 3: 9 tasks — OAT adapter and lifecycle/archive integration
- Phase 4: 9 tasks — publishing, compatibility, docs, release validation
- Phase 5: 4 tasks — frozen RC and external acceptance
- Phase p-rev1: 10 tasks — complete-package durability, authored content,
  curated styles, Codex config formatting, live W6 acceptance, and five
  review fixes

**Total: 48 tasks**

Revision 1 is ready for implementation from `prev1-t01`. The original project
remains active until the follow-up PR, live W6 acceptance, wave promotion, and
project completion are finished.

## References

- Design: `design.md`
- Specification: `spec.md`
- Discovery: `discovery.md`
- Reference drafts: `references/skill-drafts/`
- Revision 1 discovery: `references/revision-1-discovery.md`
- Revision 1 visual baseline: `references/revision-1-theme-previews/`
- Collaboration log: `brainstorming/2026-07-16-collab-log.md`
- **spec:** ---
  oat_status: complete
  oat_ready_for: oat-project-design
  oat_blockers: []
  oat_last_updated: 2026-07-16
  oat_generated: false
  oat_template: false

---

# Specification: explainer-kit

## Problem Statement

The existing `oat-explainer-kit` 0.4.1 proved a useful production workflow:
reconcile contradictory sources into one cited fact base, review the narrative
before rendering, build a coherent visual artifact set, verify it structurally
and visually, and optionally publish it. That workflow is currently coupled to
one operator's destinations, vault conventions, Google Docs tooling, branding,
and installed helper skills. It cannot be safely distributed as a reusable OAT
capability without either leaking private assumptions or dropping behavior the
operator relies on.

This project must split that working material into a generic, config-blind core
and a thin OAT lifecycle adapter. The public core must expose stable,
machine-readable inputs and outputs so a separately maintained private wrapper
can preserve personal presets, vault authoring, Google Docs sync, and personal
destinations without adding those concerns to OAT. The public adapter must add
typed OAT configuration, project artifact placement, lifecycle intent, and
project-level explainer/recap recipes.

The result must remain usable when rendering or publishing fails. Autonomous
projects must always attempt a recap and durably record the outcome, while
project completion remains independent of recap success. Release acceptance is
stricter than runtime completion: the packaged release candidate must pass the
real private-wrapper E2E and one live S3/CDN publish smoke test.

## Goals

### Primary Goals

- Ship `explainer-kit` as a destination-blind core in the utility pack and
  `oat-explainer-kit` as its OAT adapter in the workflows pack.
- Preserve the proven fact-base, draft-first, verification, rendering, and
  publishing workflow while removing organization- and operator-specific
  assumptions from public production assets.
- Define versioned run-input, fact-base, resolved-theme, artifact-manifest,
  build-record, and publish-receipt contracts.
- Provide the canonical `project-explainer` and `project-recap` recipes and
  integrate their intent policy into the OAT project lifecycle.
- Preserve all personal functionality through a documented pre/post
  orchestration seam and prove it against the real private wrapper before
  release.

### Secondary Goals

- Include a small curated palette/profile set and natural-language art
  direction that compiles to a concrete, replayable theme bundle.
- Retain selected engineering-tour patterns as an optional generic recipe.
- Leave a composable source-set seam for later wave/program-close callers
  without making those integrations a v1 dependency.

## Non-Goals

- Shipping `personal-explainer-kit`, personal presets, vault conventions,
  Google account settings, or Google Docs mechanics in the public repository.
- Adding a general plugin registry or mid-pipeline hook system.
- Requiring deterministic HTML rendering in v1.
- Automatically publishing lifecycle artifacts; publish remains human-gated.
- Blocking discovery, design, or initial implementation on external wrapper or
  infrastructure acceptance. Those checks run against the release candidate.
- Promoting wave/program-close integration on behalf of their owning projects.
- Defining `program-recap` in v1. It is a distinct multi-project product owned
  by the wave project; `project-recap` must not be stretched to substitute for
  it.
- Migrating already-published flat-layout explainer URLs. V1 publishing is
  additive, so owners may consciously republish under the typed layout.
- Creating a dedicated communications pack or brand-pack system in v1.
- Replacing OAT's existing project summary or PR description artifacts.

## Requirements

### Functional Requirements

**FR1: Generic core invocation contract**

- **Description:** The core must run with no OAT installation or config files
  and accept all run settings through explicit invocation arguments,
  environment variables, or versioned input files.
- **Acceptance Criteria:**
  - A build-only run succeeds in a temporary directory with no `.oat` files.
  - Input validation rejects unknown schema versions, unsafe paths, incomplete
    publish settings, and unsupported recipe IDs with actionable errors.
  - The public contract documents required, optional, and mutually exclusive
    inputs and the version compatibility policy.
- **Priority:** P0

**FR2: Reconciled fact-base pipeline**

- **Description:** Every artifact set must build from one cited, reconciled
  fact base rather than independently re-deriving facts per artifact.
- **Acceptance Criteria:**
  - Raw-source runs synthesize one fact base, run an adversarial contradiction
    pass, and retain explicit operator overrides.
  - Caller-supplied fact bases skip re-federation but receive a lightweight
    consistency/freshness check.
  - Unresolved claims remain visibly classified as needing confirmation.
- **Priority:** P0

**FR3: Recipe-driven artifact production**

- **Description:** The core must execute versioned recipes that define source
  needs, narrative structure, artifact types, and template selection.
- **Acceptance Criteria:**
  - V1 exposes canonical recipe IDs `project-explainer` and `project-recap`.
  - `project-recap` includes the original request, key agent decisions,
    as-built architecture, implementation record, validation evidence, and
    outcome.
  - `project-recap` accepts one project source set. A future `program-recap`
    recipe may use the same registry and supplied fact-base contract without
    changing v1 core schemas.
  - Recipe source sets are parameterized so future callers can supply
    non-project fact bases without changing the recipe contract.
  - An optional engineer-tour recipe can reuse generic sticky navigation,
    scroll highlighting, and expandable-code patterns without adding a skill
    dependency.
- **Priority:** P0

**FR4: Resolved theme system**

- **Description:** Selection inputs must compile into one validated resolved
  theme bundle consumed by every artifact in a set.
- **Acceptance Criteria:**
  - Selection supports a named semantic palette, a named visual profile, an
    optional supplied theme bundle, and optional natural-language art
    direction.
  - The core ships one neutral default, 3–5 curated palettes, and 2–3 curated
    profiles.
  - The resolved bundle covers color roles, typography, spacing, geometry,
    motion, and diagram treatment and is persisted with the artifact set.
  - Every resolved palette defines validated light and dark modes. A render
    strategy can commit output to the default mode or expose both modes.
  - Public records retain a derived flag and hashes, not raw natural-language
    art direction by default.
  - Palette/profile/template combinations meet AA contrast and render-QA
    acceptance.
- **Priority:** P0

**FR5: Artifact manifest and honest durability**

- **Description:** Every run must produce a versioned manifest and privacy-safe
  build record that describe artifacts, provenance, freshness, rebuildability,
  stage outcomes, and recovery instructions.
- **Acceptance Criteria:**
  - Each rendered artifact is classified `rebuildable: true|false`.
  - Rebuildable claims include an argv-form rebuild command and input hashes.
  - A successful non-rebuildable artifact is `built-durable` only after commit
    or verified publish; otherwise it is `built-not-durable`.
  - Fact base, content model, resolved theme, manifest, and build record are
    retained when later rendering or publishing stages fail.
  - Artifact freshness binds to source commit and artifact hashes.
  - Commit durability uses caller-created commits followed by core verification
    and a separately committed evidence update; the core never creates commits.
  - If archival relocates an artifact package, prior path evidence is superseded
    by evidence for the tracked export path before completion reports the recap
    as durable at its final location.
- **Priority:** P0

**FR6: S3 static publishing connector**

- **Description:** A public `s3-static` connector must publish a manifest
  artifact tree using corresponding S3 and public URL roots.
- **Acceptance Criteria:**
  - For relative path `P`, upload targets `<s3Uri>/P` and verification targets
    `<publicBaseUrl>/P`.
  - Roots are normalized without trailing slashes and `P` cannot start with a
    slash or escape the artifact root.
  - The connector verifies a sentinel before bulk upload, preserves explicit
    MIME types, verifies public artifact URLs, and emits a versioned receipt.
  - Publishing is additive and idempotent outside the current manifest set:
    the connector never deletes or overwrites undeclared objects and never
    performs root-wide destructive synchronization.
  - Sentinel paths are unique per run so concurrent publishes cannot collide.
  - Explicit `index.html` URLs are the portable default.
  - Authentication failures never expose credentials and never trigger unsafe
    automatic reauthentication.
- **Priority:** P0

**FR7: Typed OAT configuration adapter**

- **Description:** `oat-explainer-kit` must resolve typed `explainers.*` build
  and publish settings plus `workflow.explainers.*` lifecycle preferences
  through `oat config`.
- **Acceptance Criteria:**
  - `oat config get/set/list/describe` recognizes every public key, allowed
    scope, scalar type, enum, and default.
  - Resolution order is runtime input, local, shared, user, built-in default,
    subject to each key's allowed scopes.
  - The CLI owns scalar/scope validation; the adapter owns cross-field checks,
    theme precedence, and conversion into core inputs.
  - Runtime inputs override config without mutating stored config.
  - Private wrapper concerns do not appear in public OAT config.
- **Priority:** P0

**FR8: Scope-derived OAT artifact placement**

- **Description:** The adapter must choose canonical output roots from OAT
  context rather than a configurable artifact-root key.
- **Acceptance Criteria:**
  - Project artifact sets live under
    `<resolved-project-path>/explainers/`.
  - Before a shared project is archived, completion selects exactly one final
    `project-recap` run and the archive command copies that package to
    `.oat/repo/reference/project-recaps/<YYYYMMDD-project-slug>/`, verifies its
    manifest hashes, and only then removes the active project path.
  - A failed final recap still exports its structured outcome and successful
    intermediates. Projects whose resolved policy did not request a recap
    produce no recap export.
  - The export directory mirrors project-summary snapshot naming and fails
    before active-tree deletion if the destination already exists; it never
    overwrites or merges with an earlier record.
  - Export stages to a temporary sibling and atomically renames into place;
    failed copy or verification leaves no partial destination that blocks
    retry.
  - Project explainers are working artifacts: they remain in the local archived
    project but are intentionally absent from the tracked post-completion tree,
    like project plans and designs.
  - Recap exports are tracked and used by summary/PR links; gitignored archive
    paths are never treated as durable link targets.
  - Local-scope projects are not exported because the completion workflow does
    not archive them; their explainer packages inherit the local project's
    untracked durability posture.
  - Non-project OAT artifact sets live under
    `.oat/repo/reference/explainers/`.
  - Direct core callers must provide an explicit output root.
  - Paths remain within their resolved root after symlink and traversal checks.
- **Priority:** P0

**FR9: Lifecycle intent and policy**

- **Description:** OAT must resolve project explainer/recap intent from mode,
  project state, workflow preference, and built-in defaults.
- **Acceptance Criteria:**
  - `workflow.explainers.projectExplainer` and `.projectRecap` accept
    `always | ask | never`.
  - `state.md` can persist independent explainer and recap decisions with
    decision, source, and timestamp.
  - Precedence is mode policy, project state, workflow preference, built-in
    default.
  - Autonomous kickoff persists recap generation as non-suppressible and only
    persists explainer generation when explicitly requested.
  - Interactive intent can be recorded through planning; an unresolved `ask`
    preference prompts once at its lifecycle gate.
- **Priority:** P0

**FR10: Non-blocking mandatory autonomous recap**

- **Description:** Autonomous project completion must attempt a recap but must
  not depend on successful build, durability, or publishing.
- **Acceptance Criteria:**
  - The attempt and structured outcome record cannot be disabled by config.
  - Render/build failure warns, records cause and regeneration instructions,
    preserves successful intermediates, and allows project completion.
  - Recap status is independently classified as `built-durable`,
    `built-not-durable`, or `failed`.
  - Publishing remains optional and human-gated.
- **Priority:** P0

**FR11: Packaged dependency contract**

- **Description:** The workflows adapter must require a compatible packaged
  core and fail closed when it is missing or too old.
- **Acceptance Criteria:**
  - `explainer-kit` is listed in the utility pack and installs successfully at
    user scope with all required templates, schemas, scripts, and references.
  - `oat-explainer-kit` is listed in the workflows pack.
  - Missing/incompatible core errors include the exact utility-pack
    install/update guidance.
  - Release tests exercise installed packaged paths, never source-tree-only
    paths.
- **Priority:** P0

**FR12: Private-wrapper extension compatibility**

- **Description:** The public contract must let the external private wrapper
  retain personal presets, vault authoring, companion notes, Google Docs sync,
  and personal destinations through pre/post orchestration.
- **Acceptance Criteria:**
  - An in-repo compatibility fixture exercises wrapper-style input resolution,
    core invocation, manifest consumption, and post-run linking.
  - The migration runbook documents the contract freeze and rollback path.
  - A packaged release candidate is not promoted until the real private
    wrapper passes an operator-executed E2E with durable run evidence.
- **Priority:** P0

**FR13: Neutral templates and leak prevention**

- **Description:** Public production assets must be organization-neutral while
  allowing intentional caller branding through validated inputs.
- **Acceptance Criteria:**
  - Production templates contain no organization-specific URLs, buckets,
    account names, or hardcoded branding.
  - Examples use RFC 2606 domains and live outside production output paths.
  - Validation rejects unresolved tokens and denylisted leaked strings; a
    seeded-leak fixture proves the guard.
  - Adapted external patterns are attributed in `NOTICES.md`.
- **Priority:** P0

**FR14: Release acceptance evidence**

- **Description:** V1 release must be supported by packaged and live acceptance
  evidence without blocking earlier development phases.
- **Acceptance Criteria:**
  - The private-wrapper E2E runs against a frozen packaged release candidate.
  - One live S3/CDN run verifies the sentinel, publishes a real artifact,
    verifies its public URL, and retains the publish receipt.
  - Either acceptance failure blocks release promotion until corrected.
  - Wave/program-close hooks do not gate v1.
- **Priority:** P0

### Non-Functional Requirements

**NFR1: Portability and configuration isolation**

- **Description:** The generic core must work across supported agent providers
  and outside OAT without reading ambient config.
- **Acceptance Criteria:**
  - Core behavior is determined only by explicit inputs and bundled assets.
  - No absolute operator path or provider-specific command is required for a
    build-only run.
- **Priority:** P0

**NFR2: Security and privacy**

- **Description:** Inputs, logs, manifests, templates, and publish operations
  must avoid secret disclosure and unsafe filesystem/network behavior.
- **Acceptance Criteria:**
  - Raw AWS credentials are never accepted as config fields or persisted.
  - Public records omit raw art-direction text by default.
  - Paths, URLs, template values, subprocess arguments, and publish roots are
    validated before use.
  - Logs and receipts contain no credential material.
- **Priority:** P0

**NFR3: Accessibility and visual quality**

- **Description:** Shipped themes and templates must be readable,
  self-contained, responsive, and accessible.
- **Acceptance Criteria:**
  - Curated palette combinations satisfy WCAG AA contrast.
  - Structural checks cover self-containment, link form, unresolved tokens,
    heading readability, and balanced markup.
  - Browser QA covers viewport overflow, inner-container clipping, reduced
    motion, keyboard navigation where applicable, and representative widths.
- **Priority:** P0

**NFR4: Traceability and reproducibility**

- **Description:** Requirements, sources, artifacts, build stages, and
  acceptance evidence must be traceable without claiming determinism the
  implementation cannot provide.
- **Acceptance Criteria:**
  - Manifests use versioned schemas and cryptographic hashes for material
    inputs/outputs.
  - Rebuildability spot checks fail any unsupported `rebuildable: true` claim.
  - The 0.4.1 operational-wisdom trace remains complete.
- **Priority:** P0

**NFR5: Failure transparency**

- **Description:** Partial failure must be explicit, recoverable, and correctly
  separated from OAT project completion.
- **Acceptance Criteria:**
  - Every stage records status, warnings/errors, and recovery guidance.
  - Partial output is never reported as durable success.
  - Autonomous recap failure is top-line visible in the project summary or
    equivalent completion report.
- **Priority:** P0

**NFR6: Release integrity**

- **Description:** Shipped skill assets and public package versions must follow
  repository release policy.
- **Acceptance Criteria:**
  - Canonical skill versions increase for changed skills.
  - All five lockstep public packages receive the required version bump.
  - `pnpm release:validate` passes against bundled assets before release
    candidate promotion.
- **Priority:** P0

## Constraints

- The three reference drafts are starting material; implementation evolves them
  rather than replacing the proven workflow.
- Core reads no OAT, user, vault, or destination config files.
- Public config excludes personal lanes, vault paths, Google Docs accounts, and
  destination presets.
- Templates remain self-contained and retain battle-tested component/render-QA
  patterns unless a change is explicitly justified.
- The private wrapper remains externally owned and outside this project's
  implementation scope, despite being a release acceptance dependency.
- The existing `oat-explainer-kit` 0.4.1 stays installed until release-candidate
  acceptance succeeds.
- Public package and bundled-asset changes follow lockstep release policy.

## Dependencies

- OAT CLI config registry/resolution and `oat config get/set/list/describe`.
- OAT project state parsing/validation and lifecycle skills.
- Utility/workflows pack manifests and bundled-asset validation.
- Node.js 22 runtime and existing shell/browser QA capabilities.
- AWS CLI credentials supplied by the operator for the live `s3-static` test.
- Operator-provisioned S3/CloudFront corresponding roots.
- Externally maintained private wrapper for release-candidate E2E.
- MIT-licensed `visual-explainer` patterns with attribution in `NOTICES.md`.

## High-Level Design (Proposed)

The design uses a neutral engine/adapter split. `explainer-kit` owns versioned
contracts, fact-base reconciliation, recipe execution, theme resolution,
content/render orchestration, QA, manifest/build records, and the generic
`s3-static` connector. It receives a complete run request and writes one
artifact package; it never discovers OAT config or personal destinations.

`oat-explainer-kit` resolves OAT config with source metadata, derives the
canonical artifact root, validates cross-field constraints, resolves lifecycle
intent, binds OAT project artifacts into the generic recipe source set, and
invokes the core. OAT lifecycle skills call this adapter at the plan and
completion gates. Private integrations use the same core request and consume
the same manifest/receipt after the run.

**Key Components:**

- Core run contract and schema validators
- Fact-base/content pipeline and recipe registry
- Theme resolver and neutral production templates
- Artifact manifest, build record, and publish receipt
- `s3-static` publishing connector
- OAT config/state/lifecycle adapter
- Packaged-layout, compatibility, leak, render, and release acceptance tests

**Alternatives Considered:**

- Keep one OAT-specific monolith — rejected because it preserves private
  coupling and prevents run-anywhere reuse.
- Ship the personal wrapper publicly — rejected because personal accounts,
  vault mechanics, and destinations are not public OAT concerns.
- Add a plugin registry — rejected as unnecessary; stable pre/post
  orchestration covers the demonstrated extension needs.
- Create a communications pack — deferred until the family has at least three
  coherent public skills or an independent asset/release cadence.

## Success Metrics

- Build-only packaged-core smoke succeeds with no OAT files present.
- Both canonical recipes produce schema-valid tracked artifact packages.
- All curated themes pass contrast, structural, and representative render QA.
- OAT config keys are fully discoverable and reject invalid scopes/values.
- Autonomous recap failures produce durable records while project completion
  still succeeds.
- Packaged adapter correctly fails on absent/incompatible core and succeeds
  against the utility-pack artifact.
- In-repo compatibility fixture, real private-wrapper E2E, and live S3/CDN
  acceptance all pass against the same release candidate.
- Production-template leak scan and seeded negative fixture pass.
- `pnpm release:validate` passes with required skill and package versions.

## Requirement Index

| ID   | Description                             | Priority | Verification                                     | Planned Tasks                                                 |
| ---- | --------------------------------------- | -------- | ------------------------------------------------ | ------------------------------------------------------------- |
| FR1  | Generic core invocation contract        | P0       | integration: config-free packaged core           | p01-t02, p01-t06, p02-t01, p02-t09, p02-t10, p04-t06          |
| FR2  | Reconciled fact-base pipeline           | P0       | integration: raw and supplied fact-base paths    | p02-t02, p02-t09                                              |
| FR3  | Recipe-driven artifact production       | P0       | integration: canonical recipe outputs            | p02-t03, p02-t09, p02-t10                                     |
| FR4  | Resolved theme system                   | P0       | unit + visual: theme validation and matrix QA    | p02-t04, p02-t05, p02-t06, p04-t02                            |
| FR5  | Artifact manifest and honest durability | P0       | unit + integration: evidence and relocation      | p02-t01, p02-t08, p03-t05, p03-t07, p03-t09                   |
| FR6  | S3 static publishing connector          | P0       | integration + e2e: root mapping and live publish | p04-t01, p05-t03                                              |
| FR7  | Typed OAT configuration adapter         | P0       | unit + integration: key registry and resolution  | p01-t03, p03-t01                                              |
| FR8  | Scope-derived OAT artifact placement    | P0       | integration: active roots and archive exports    | p03-t01, p03-t07, p03-t08, p03-t09                            |
| FR9  | Lifecycle intent and policy             | P0       | unit + integration: precedence and prompts       | p01-t04, p03-t03, p03-t04, p03-t06, p03-t08                   |
| FR10 | Non-blocking mandatory autonomous recap | P0       | integration: forced failure completion path      | p03-t04, p03-t06, p03-t08                                     |
| FR11 | Packaged dependency contract            | P0       | integration: installed utility/workflows layout  | p01-t01, p01-t05, p04-t05, p04-t06                            |
| FR12 | Private-wrapper extension compatibility | P0       | fixture + manual e2e: wrapper migration          | p04-t03, p05-t02                                              |
| FR13 | Neutral templates and leak prevention   | P0       | structural: token, denylist, seeded leak         | p02-t05, p02-t07, p04-t02                                     |
| FR14 | Release acceptance evidence             | P0       | manual e2e: RC wrapper and S3/CDN receipts       | p04-t07, p04-t08, p04-t09, p05-t01, p05-t02, p05-t03, p05-t04 |
| NFR1 | Portability and configuration isolation | P0       | integration: empty-environment smoke             | p01-t06, p02-t09, p04-t05, p04-t06                            |
| NFR2 | Security and privacy                    | P0       | unit + security: validation and redaction        | p01-t06, p02-t07, p04-t01                                     |
| NFR3 | Accessibility and visual quality        | P0       | visual + manual: AA and browser QA               | p02-t04, p02-t05, p02-t06, p02-t07, p04-t02                   |
| NFR4 | Traceability and reproducibility        | P0       | integration: hashes and rebuild spot checks      | p02-t01, p02-t08, p04-t02                                     |
| NFR5 | Failure transparency                    | P0       | integration: partial-stage outcome records       | p02-t01, p02-t08, p03-t06, p03-t08, p03-t09                   |
| NFR6 | Release integrity                       | P0       | release: bundled validation and version policy   | p01-t01, p04-t05, p04-t07, p04-t08, p04-t09, p05-t04          |

## Open Questions

No requirement-level questions remain. Detailed schema fields, spot-check
selection, lifecycle call sites, and implementation sequencing are resolved in
`design.md`.

## Assumptions

- OAT config JSON output continues to expose both resolved value and source.
- Skills may bundle Node/shell validators and static templates in their own
  directories.
- The operator can provision the S3/CloudFront destination before release
  acceptance.
- The external wrapper can migrate against a packaged release candidate before
  public release.
- Wave/program callers can later supply the versioned fact-base contract
  without changing canonical recipe IDs.

## Risks

- **External release dependency:** Wrapper migration is outside project scope
  but blocks promotion.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Freeze contracts in an RC, provide fixture/runbook, and
    separate development completion from release promotion.
- **Theme/template matrix growth:** Curated combinations can multiply render
  QA cost.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation:** Keep palette/profile sets intentionally small and test a
    risk-based matrix.
- **False rebuildability claims:** Agent-assisted output may be mislabeled
  deterministic.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Default to non-rebuildable unless a replay spot check proves
    otherwise.
- **Config/state drift:** New keys span layered config and project frontmatter.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Closed schemas, source-aware resolution, precedence tests,
    and control-plane validation.
- **Publish topology mismatch:** S3 keys and served CDN paths can diverge.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation:** Corresponding roots, sentinel-first verification, and
    explicit receipt evidence.

## References

- Discovery: `discovery.md`
- Reference drafts: `references/skill-drafts/`
- Knowledge base: `.oat/repo/knowledge/project-index.md`
- Repository guidance: `AGENTS.md`
- **summary:** ---
  oat_status: complete
  oat_ready_for: null
  oat_blockers: []
  oat_last_updated: 2026-07-21
  oat_generated: true
  oat_summary_last_task: prev1-t10
  oat_summary_revision_count: 1
  oat_summary_includes_revisions: [p-rev1]

---

# Summary: explainer-kit

## Overview

The project turned a proven but personal explainer workflow into a public skill
family: a destination-neutral core and a thin OAT lifecycle adapter. It
preserved private-wrapper extensibility while making inputs, outputs,
durability, rendering, publishing, configuration, and lifecycle behavior
explicit and testable.

## What Was Implemented

- Shipped `explainer-kit` in the utility pack with versioned run, fact-base,
  author, theme, artifact-manifest, build-record, durability, publish-request,
  and publish-receipt contracts.
- Added supplied and federated fact-base processing, adversarial critic support,
  structured unattended authoring, section-sensitive source-copy QA, bounded
  discovery, content approval, rendering, visual QA, and privacy/leak checks.
- Added `project-explainer`, `project-recap`, `engineer-tour`, and
  `program-recap` recipes with retained, archive-safe artifact packages.
- Added four curated styles—Clean/Neutral, Business/Corporate, Navy/Ocean, and
  Dark/Edgy—with horizontal deck navigation, distinct local accents,
  responsive/reduced-motion behavior, and a deprecated compatibility path for
  legacy palette/profile inputs.
- Added `oat-explainer-kit` with typed OAT configuration, project source
  binding, lifecycle policy, output routing, installed-core compatibility,
  provider-neutral critic and author module seams, and exact unattended author
  cardinality enforcement.
- Added additive S3/CDN publishing with sentinel verification, public-byte
  checks, deletion confirmation, and retained receipts.
- Added complete immutable package hashing and archive export verification,
  preserving canonical object hashes separately from serialized file-byte
  hashes.
- Normalized generated Codex TOML indentation without changing parsed values,
  multiline strings, or idempotency.
- Advanced the five public packages in lockstep to `0.2.11`; final canonical
  skills are `explainer-kit@1.0.2` and `oat-explainer-kit@1.0.1`.

## Key Decisions

- **Core/adapter/private boundary:** The public core is config- and
  destination-blind; the OAT adapter resolves project/config concerns; private
  wrappers orchestrate personal pre/post lanes without a public plugin system.
- **Explicit author seam:** Unattended runs require one structured,
  provider-neutral author callback or module. Executable callbacks are never
  persisted; validated non-secret provenance is retained.
- **Curated style front door:** A named curated style is the default public
  selection. Palette/profile remain accepted only for backward compatibility.
- **Two hash semantics:** Canonical hashes identify normalized objects;
  `immutableHashes` verify exact retained bytes. Archive validation enforces
  complete coverage without conflating the two.
- **Non-blocking lifecycle, strict release:** Runtime recap failures do not
  block project completion, but promotion requires packaged external-wrapper
  and live publish acceptance.
- **Additive publishing:** Publishing never deletes unrelated destination
  objects; only the run-unique verification sentinel is removed.

## Design Deltas

- The first live unattended W6 recap showed that mechanical fact-base assembly
  could pass structural gates while producing poor narrative. Revision 1 added
  mandatory structured authors, retained provenance, and per-section
  source-copy detection.
- The original palette/profile matrix produced inconsistent default quality.
  Revision 1 replaced it with four accepted curated styles while preserving
  legacy inputs.
- Initial archive validation incorrectly compared canonical object hashes with
  pretty-printed file hashes. The final design preserves both identities and
  verifies each at the appropriate boundary.
- Final review found the public style key and adapter author path were not
  exercised end to end. The fixes added real CLI-backed and packaged adapter
  coverage and aligned the authoritative design.

## Notable Challenges

- Release-candidate verification crossed machines whose TypeScript declaration
  emission order differed semantically but not behaviorally; acceptance
  therefore consumed the exact retained tarballs and hashes.
- Live S3 acceptance initially lacked sentinel deletion permission. The
  unchanged candidate passed after the operator corrected IAM.
- Headless Chromium keyboard focus was machine-sensitive. The visual gate now
  primes focus, retries deck movement, and uses a semantic tabbability fallback
  without weakening accessibility requirements.
- Final review uncovered integration gaps hidden by green unit and smoke tests.
  Two bounded review loops added real CLI/adapter paths, section-local QA,
  design alignment, and pre-core author-cardinality checks.

## Tradeoffs Made

- HTML output is verified structurally and visually but is not required to be
  byte-deterministic.
- Natural-language art direction remains transient; the resolved replayable
  theme and privacy-safe provenance are retained instead.
- Source-copy QA compares authored sections with reconciled fact-base text, not
  raw private source documents.
- Agent-authored artifacts default to non-rebuildable unless replay evidence
  proves otherwise.

## Integration Notes

- JSON-only core callers use `--author-module`; OAT adapter contexts use
  `authorModulePath`. Unattended adapter calls must provide exactly one direct
  or module author seam.
- `explainers.defaults.style` is the supported config front door. Legacy
  `palette` and `visualProfile` values are nullable and deprecated.
- Durable archive consumers must verify every `immutableHashes` entry against
  file bytes; canonical fact-base/theme hashes are separate object identities.
- Publishing remains explicit and disabled by default for private wrappers.

## Revision History

### Revision 1

The post-merge revision fixed complete recap-package durability and unattended
content quality, replaced the default theme matrix with four curated styles,
and normalized generated Codex configuration. A real packaged Stoa W6 recap
then passed authored-content, immutable-hash, archive-export, visual, package,
and unchanged-source checks; two review loops closed all remaining integration
and design findings.

## Workflow Observations

### 2026-07-20 · structural · oat-project-implement · p-rev1

Phase implementer completed prev1-t01 through prev1-t03 and stopped before acceptance; see implementation.md Run 2 for the W6 archive and author-module boundary.

### 2026-07-21 · structural · oat-project-implement · prev1-t04

Generated Codex config formatting passed in commit 0895a8c0; Revision 1 now waits only on the W6 acceptance inputs recorded in implementation.md.

### 2026-07-21 · structural · oat-project-implement · prev1-t05

Expanded prev1-t05 to include packages/cli/src/validation/skills.test.ts after the mandated skill-version bump exposed its literal version pin; this is the load-bearing regression assertion for the planned bump.

### 2026-07-21 · structural · oat-project-implement · prev1-t05

Expanded prev1-t05 after the real W6 package exposed two acceptance-contract gaps: smoke harnesses must supply the required unattended author, and archive validation must keep canonical fact-base/theme hashes distinct from immutable file-byte hashes while still enforcing complete path coverage.

### 2026-07-21 · structural · oat-project-implement · 5f7206bd

Revision 1 implementation completed 43/43 tasks; packaged W6 acceptance and archive export passed. Fresh-context final review is next.

### 2026-07-21 · structural · oat-project-review-provide · reviews/2026-07-21-p-rev1-code-review.md

Fresh-context p-rev1 review received: 2 Critical and 1 Important finding. Converted into prev1-t06 through prev1-t08 for public style config, adapter author propagation, and section-local source-copy QA.

### 2026-07-21 · structural · oat-project-review-receive · aa74980f

Completed all three p-rev1 review fixes in commits 3d9ce8b4, 2c8c0fa5, and aa74980f. Full serial repository/release gates and rebuilt packaged W6 acceptance passed; fresh-context re-review is next.

### 2026-07-21 · structural · oat-project-review-provide · reviews/2026-07-21-p-rev1-code-rereview.md

First p-rev1 re-review received: prior C1 and I1 resolved; C2 propagation works but omitted unattended author is not rejected at the adapter boundary. Added prev1-t09 for stale design/minor formatting and prev1-t10 for exact author cardinality.

### 2026-07-21 · structural · oat-project-review-receive · 3bf11f25

Completed narrowed re-review fixes prev1-t09 and prev1-t10 in commits 5a753029 and 3bf11f25. Design alignment, author-cardinality TDD, and full serial repository/release gates passed; narrowed re-review is next.

### 2026-07-21 · structural · oat-project-review-provide · reviews/2026-07-21-p-rev1-code-rereview-2.md

Narrowed p-rev1 re-review passed with zero findings; all Revision 1 review findings are resolved and the follow-up PR is ready.

### 2026-07-21 · structural · oat-project-pr-final · https://github.com/voxmedia/open-agent-toolkit/pull/170

Opened the final Revision 1 follow-up PR after summary generation and a zero-finding final review.

## Unresolved claims

- None.
