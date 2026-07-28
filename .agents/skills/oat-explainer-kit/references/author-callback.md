# Author callback contract

Lifecycle callers own the executable author seam; the explainer core owns
construction of each author request. In-process callers pass an `author`
callback to `runOatExplainer`. JSON-only and official CLI callers pass
`authorModulePath`, which must name a module with an `author` function export.
Provide exactly one of those inputs in both interactive and unattended modes.
The callback or module may use any provider, but its request and result remain
provider-neutral.

## Request handling

The callback receives one `explainer-kit.author-request/v2` per artifact. The
core constructs that request from recipe-owned policy:

- `brief` contains the prose loaded from the floor entry or expansion profile's
  `briefRef`; the author must treat the inlined brief as its editorial contract.
- `visualAuthoringGuidance` contains the installed core's bundled
  representation, hierarchy, responsive-navigation, table, diagram, and deck
  rules. Treat it as the medium baseline; do not read ambient or home-directory
  guidance.
- `factBase` contains the reconciled evidence for the run. Ground claims in that
  fact base and do not replace it with ambient project context.
- `authoring` selects the output path. Return Markdown for `markdown` and a
  complete HTML document for `html`.
- `theme` is attached to every request. HTML requests also carry the
  recipe-selected `shell`; use it as the starting canvas while following the
  brief's license to elaborate.
- A floor request may include `floor.requiredNarrative`, which identifies the
  narrative coverage checked later as non-blocking guidelines.
- `setContext` is the complete immutable planner-owned portfolio and shared
  ledger. `plannedArtifact` is the exact entry assigned to this callback;
  preserve its identity, sources, draft, and visual intent.

Return one matching `explainer-kit.author-result/v2`: preserve `artifactId`,
set exactly one of `content.markdown` or `content.html`, and include
`provenance`. Do not persist provider credentials or callback configuration in
the result.

## Planner-owned expansion

The set planner finalizes the complete floor and expansion portfolio before any
author runs. Authors must not return `proposedArtifacts` or otherwise add,
remove, replace, or reorder portfolio entries. Handle only the supplied
`plannedArtifact`; the core rejects author-driven expansion after planning.

## Lifecycle invocation

Automated project-completion and implementation-tail recaps always call
`runOatExplainer` with `mode: unattended`. They construct the author seam before
invocation and supply it alongside the existing provider-neutral `critic` or
validated `criticModulePath`. Interactive invocations use the same author
contract; only the later approval behavior differs.
