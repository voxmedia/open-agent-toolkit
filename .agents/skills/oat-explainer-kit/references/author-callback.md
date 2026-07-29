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
- `factBase` contains the reconciled evidence for the run. Ground claims in that
  fact base and do not replace it with ambient project context.
- `authoring` selects the output path. Return Markdown for `markdown` and a
  complete HTML document for `html`.
- `theme` is attached to every request. HTML requests also carry the
  recipe-selected `shell`; use it as the starting canvas while following the
  brief's license to elaborate.
- A floor request may include `floor.requiredNarrative`, which identifies the
  narrative coverage checked later as non-blocking guidelines.

Return one matching `explainer-kit.author-result/v2`: preserve `artifactId`,
set exactly one of `content.markdown` or `content.html`, and include
`provenance`. Do not persist provider credentials or callback configuration in
the result.

## Expansion

Only a floor result may propose expansion. Put each proposal in
`proposedArtifacts` as `{id, profileId, rationale}`. Do not choose an artifact
type, authoring mode, brief, or shell in the proposal; the referenced recipe
profile, selected by `profileId`, owns those values.

The core validates proposal IDs, profile membership, collisions, and finite
caps. It rejects malformed proposals, records over-limit proposals as warnings,
and issues a new author request for every accepted artifact. Handle each
follow-up request independently and do not recursively propose more artifacts.

## Lifecycle invocation

Automated project-completion and implementation-tail recaps always call
`runOatExplainer` with `mode: unattended`. They construct the author seam before
invocation and supply it alongside the existing provider-neutral `critic` or
validated `criticModulePath`. Interactive invocations use the same author
contract; only the later approval behavior differs.
