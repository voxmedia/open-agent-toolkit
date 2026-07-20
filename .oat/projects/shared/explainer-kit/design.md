---
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
bundled schemas, recipes, templates, validators, QA helpers, and an
`s3-static` connector. It receives a complete run request, produces a tracked
artifact package, and reads no OAT, user, vault, or destination config.
`oat-explainer-kit` resolves OAT configuration and project state, derives
canonical paths, binds OAT artifacts to generic recipe inputs, and invokes the
core.

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

- **Core Orchestrator:** Runs fact-base, content, theme, build, QA, durability,
  and optional publish stages from explicit inputs.
- **Contract Validators:** Validate strict versioned JSON contracts, safe
  paths, hashes, and cross-record consistency.
- **Recipe Registry:** Defines generic source requirements, minimum narrative
  content, artifact types, and template bindings.
- **Theme Resolver:** Compiles named selections, supplied bundles, and optional
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
 │ fact base │→ │ content │→ │ resolved │→ │ render + QA │
 │ + critic  │  │ models  │  │ theme    │  │             │
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
5. The recipe produces one approved content model per artifact. Interactive
   runs retain the existing Markdown review gate; unattended lifecycle recipes
   use their already-approved project artifacts and record that review source.
6. Theme selection compiles to `theme.resolved.json`. Raw natural-language art
   direction remains transient; only its hash and the resolved bundle hash are
   stored by default.
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
├── source/
│   ├── fact-base.md
│   ├── fact-base.json
│   ├── overrides.json
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
- Execute stages in order and preserve successful intermediates.
- Maintain atomic manifest/build-record updates.
- Enforce human gates for interactive content approval and all publishing.
- Return a concise outcome with paths and recovery guidance.

**Interface:**

```typescript
interface ExplainerCore {
  run(request: ExplainerRunRequestV1): Promise<ExplainerRunResultV1>;
  recordDurability(
    request: DurabilityEvidenceRequestV1,
  ): Promise<ExplainerRunResultV1>;
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

- Validate request, fact-base metadata, theme, manifest, build record, and
  publish receipt.
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
  | 'publish-receipt';

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
- Convert recipe narrative requirements into per-artifact Markdown content.
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
```

**Design Decisions:**

- `fact-base.md` is human-readable; `fact-base.json` stores citations, source
  hashes, unresolved claims, and contract metadata.
- Content Markdown remains tracked even when rendered HTML is ignored.
- Lifecycle recipes can treat approved OAT artifacts as reviewed source,
  avoiding a new interactive gate during autonomous completion.

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

**Purpose:** Convert flexible selection inputs into one replayable concrete
theme.

**Responsibilities:**

- Load bundled named palettes and profiles or a caller-supplied bundle.
- Apply natural-language art direction as a compile-time transformation.
- Validate semantic completeness, contrast, numeric ranges, and template
  compatibility.
- Persist concrete values and privacy-safe provenance hashes.
- Warn on per-artifact deviation from the artifact-set theme.

**Resolution Order:**

1. Explicit resolved theme bundle runtime input
2. Runtime palette/profile/art-direction selection
3. Adapter-resolved configured defaults
4. Bundled neutral default

A supplied bundle wins over named selections. If both are present, the resolver
uses the bundle and emits a warning.

**Design Decisions:**

- Light/dark are modes within one semantic palette, not unrelated palettes.
- `renderStrategy` defaults to `default-only`; callers can explicitly request
  `user-switchable`. The normalized run request and build record persist this
  rendering choice, while the resolved bundle always contains both validated
  modes. Render strategy is excluded from bundle identity and derived-preset
  promotion.
- V1 ships a small matrix to keep visual QA bounded.
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

| Key                                    | Type                   | Allowed scopes    | Built-in |
| -------------------------------------- | ---------------------- | ----------------- | -------- |
| `explainers.defaults.palette`          | non-empty string       | local/shared/user | neutral  |
| `explainers.defaults.visualProfile`    | non-empty string       | local/shared/user | clean    |
| `explainers.defaults.themeBundlePath`  | path                   | local/shared      | unset    |
| `explainers.publish.provider`          | `s3-static`            | shared            | unset    |
| `explainers.publish.s3Uri`             | normalized `s3://` URI | shared            | unset    |
| `explainers.publish.publicBaseUrl`     | `https://` URL         | shared            | unset    |
| `explainers.publish.awsRegion`         | non-empty string       | shared            | unset    |
| `explainers.publish.awsProfile`        | non-empty string       | local/user        | unset    |
| `workflow.explainers.projectExplainer` | `always\|ask\|never`   | local/shared/user | ask      |
| `workflow.explainers.projectRecap`     | `always\|ask\|never`   | local/shared/user | ask      |

Shared `themeBundlePath` must be repository-relative. Local may be
repository-relative or absolute. User config intentionally has no path-based
theme selection. Runtime inputs may override every key without persistence.
Publish destination roots remain shared-only because they are team topology;
checkout-specific test destinations use explicit runtime overrides rather than
silently changing local config.

**Cross-Field Rules:**

- Named defaults are valid independently; a theme bundle path overrides them
  with a warning.
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
  palette?: string;
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
    palette?: string;
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
  };
  theme: { path: 'theme.resolved.json'; hash: string; derived: boolean };
  artifacts: ArtifactEntryV1[];
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

**Request:** `ExplainerRunRequestV1` or compatibility `EXPLAINER_*` values that
normalize to it.

**Response:** `ExplainerRunResultV1` plus the persisted artifact package.

**Errors:**

- `E_INPUT_SCHEMA`: unsupported/invalid request
- `E_PATH_ESCAPE`: path leaves its declared root
- `E_RECIPE_UNSUPPORTED`: unknown recipe/version
- `E_FACT_BASE`: reconciliation or supplied-base validation failure
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
- Invalid config scope/value: point to `oat config describe <key>`.
- Incomplete publish block: continue only if the user explicitly chooses a
  build-only run; lifecycle auto-runs default to build-only.
- Invalid autonomous recap skip: reject interactively; unattended runs
  override, warn, and record.

### OAT Config API

The CLI registry adds the ten keys in the config table. `get --json` must
return `{key, value, source}`. `set` enforces allowed surface and scalar type.
`describe` documents precedence, scope, default, owning command, and
cross-field validation ownership.

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

- Info: stage transitions, artifact counts, selected named palette/profile,
  output paths, and verified URLs.
- Warn: overrides, unresolved facts, cohesion deviations, non-durable output,
  optional artifact failures, and autonomous policy corrections.
- Error: concise code/message plus durable record path and recovery steps.
- Never log raw credentials, raw environment, or raw art-direction text by
  default.

## Testing Strategy

### Requirement-to-Test Mapping

| ID   | Verification       | Key Scenarios                                                            |
| ---- | ------------------ | ------------------------------------------------------------------------ |
| FR1  | integration        | Packaged core with no OAT; invalid schema/path/publish inputs            |
| FR2  | integration        | Federated contradictions; supplied fact base; override noise suppression |
| FR3  | integration        | Both canonical recipes; parameterized source roles; engineer tour        |
| FR4  | unit + visual      | Dual-mode bundle; default-only/switchable rendering; AA and matrix QA    |
| FR5  | unit + integration | Stage transitions; two-commit evidence; relocation and rebuildability    |
| FR6  | integration + e2e  | Root normalization; sentinel; MIME; live URL receipt                     |
| FR7  | unit + integration | Config registry, scopes, sources, precedence, cross-field errors         |
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
- Theme merging, canonical serialization, hash stability, and contrast
- Config key parsing, surfaces, source precedence, and defaults
- Lifecycle decision validation and resolution table
- Artifact status/durability derivation
- Corresponding-root and relative-path mapping
- Secret redaction and template escaping

No numeric coverage threshold is added; all branch-heavy policy and validator
modules receive explicit table-driven cases.

### Integration Tests

- Real temporary directories for core request-to-manifest runs
- Supplied and federated fact-base fixtures
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

- Every curated palette in both supported modes against the house shell
- Every visual profile against at least one prose, deck, and diagram artifact
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

No design-blocking questions remain. Implementation may tune the exact curated
palette/profile names, browser viewport list, and rebuild spot-check sample
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
- Implement theme resolution, curated palettes/profiles, and
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
