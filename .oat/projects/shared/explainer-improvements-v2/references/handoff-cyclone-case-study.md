# Handoff: Cyclone Comments Generalization Recap — Case Study Feedback

> Operator-supplied handoff (received 2026-08-05). Verbatim scope driver for
> `explainer-improvements-v2`. Preserved unmodified below.

---

You are working upstream on OAT’s `explainer-kit` and `oat-explainer-kit`.

Use the Duet `cyclone-comments-generalization` project recap as a production case study. Improve the explainer authoring, path derivation, publication, lifecycle, and visual-review contracts. Preserve the provider-neutral core/OAT-adapter boundary and existing safety guarantees.

Case study

Repository:
https://github.com/voxmedia/duet

Pull request:
https://github.com/voxmedia/duet/pull/6350

Project:
`.oat/projects/shared/cyclone-comments-generalization`

Durable recap run:
`.oat/projects/shared/cyclone-comments-generalization/explainers/project-recap-corrected`

Artifact commit:
`156baa09314734d1a6a45b473540087a763613dc`

Generated local artifacts:

- Hub:
  `.oat/projects/shared/cyclone-comments-generalization/explainers/project-recap-corrected/site/initiatives/project-recap-corrected/index.html`
- Architecture:
  `.oat/projects/shared/cyclone-comments-generalization/explainers/project-recap-corrected/site/diagrams/project-recap-corrected/architecture/index.html`
- Deck:
  `.oat/projects/shared/cyclone-comments-generalization/explainers/project-recap-corrected/site/decks/project-recap-corrected/deck/index.html`

Published artifact links

S3 console prefix:
https://us-east-1.console.aws.amazon.com/s3/buckets/vox-media-open-agent-toolkit?region=us-east-1&prefix=repositories/duet/projects/cyclone-comments-generalization/&showversions=false

Hub:

- S3 URI:
  s3://vox-media-open-agent-toolkit/repositories/duet/projects/cyclone-comments-generalization/initiatives/project-recap-corrected/index.html
- S3 HTTPS:
  https://vox-media-open-agent-toolkit.s3.us-east-1.amazonaws.com/repositories/duet/projects/cyclone-comments-generalization/initiatives/project-recap-corrected/index.html
- VoxOps:
  https://open-agent-toolkit.voxops.net/repositories/duet/projects/cyclone-comments-generalization/initiatives/project-recap-corrected/index.html

Architecture:

- S3 URI:
  s3://vox-media-open-agent-toolkit/repositories/duet/projects/cyclone-comments-generalization/diagrams/project-recap-corrected/architecture/index.html
- S3 HTTPS:
  https://vox-media-open-agent-toolkit.s3.us-east-1.amazonaws.com/repositories/duet/projects/cyclone-comments-generalization/diagrams/project-recap-corrected/architecture/index.html
- VoxOps:
  https://open-agent-toolkit.voxops.net/repositories/duet/projects/cyclone-comments-generalization/diagrams/project-recap-corrected/architecture/index.html

Deck:

- S3 URI:
  s3://vox-media-open-agent-toolkit/repositories/duet/projects/cyclone-comments-generalization/decks/project-recap-corrected/deck/index.html
- S3 HTTPS:
  https://vox-media-open-agent-toolkit.s3.us-east-1.amazonaws.com/repositories/duet/projects/cyclone-comments-generalization/decks/project-recap-corrected/deck/index.html
- VoxOps:
  https://open-agent-toolkit.voxops.net/repositories/duet/projects/cyclone-comments-generalization/decks/project-recap-corrected/deck/index.html

Authenticated `head-object` checks confirmed all three S3 objects exist. Anonymous requests currently return 403 from raw S3 and 401 from VoxOps.

Observed path and publication problems

1. Local output placement is correct.

For an active project, the adapter correctly selects:
`<active-project>/explainers/<run-slug>/`

For a repository-level explainer, the intended location is:
`.oat/repo/reference/explainers/<run-slug>/`

Direct core callers must supply an explicit output root.

Preserve these distinctions. Do not move active project runs to a repository-level top directory.

2. Remote project scoping is not derived automatically.

The shared configuration root is repository-scoped:

- S3 root should be equivalent to:
  `s3://vox-media-open-agent-toolkit/repositories/duet`
- Public root:
  `https://open-agent-toolkit.voxops.net/repositories/duet`

For a project invocation, the OAT adapter should derive:
`<repository-root>/projects/<project-slug>`

The core currently strips `site/` from a manifest path and appends the remainder directly to `s3Uri` and `publicBaseUrl`. Without adapter derivation, project artifacts would be published at:
`/repositories/duet/initiatives/...`

instead of:
`/repositories/duet/projects/cyclone-comments-generalization/initiatives/...`

Do not solve this by putting one project slug into shared repository configuration. Derive project scope per invocation in `oat-explainer-kit`. Keep `explainer-kit` destination-neutral.

3. Publish configuration is incomplete.

The Duet config currently sets only:
`explainers.publish.publicBaseUrl`

The provider, S3 URI, and AWS region remain unset. Therefore publication stays build-only.

After implementing project-aware destination derivation, document and validate the complete shared configuration:

- provider: `s3-static`
- repository-level S3 root
- repository-level public root
- AWS region

Configuration alone must not authorize publication; retain the explicit human gate.

4. Artistic HTML bypasses canonical link construction.

The committed hub contains:

- `../architecture/`
- `../deck/`

Those paths are wrong from `site/initiatives/<slug>/index.html` and depend on directory-index behavior that S3/VoxOps does not provide.

The correct targets are:

- `../../diagrams/<slug>/architecture/index.html`
- `../../decks/<slug>/deck/index.html`

The structured Markdown renderer already computes artifact paths ending in `index.html`. Free-form artistic HTML bypasses that path builder.

Provide artistic authors with canonical artifact URLs or replace arbitrary links with artifact IDs that the renderer resolves. Add a post-render internal-link validator that:

- resolves every local `href` against the source artifact;
- requires the target to exist in the manifest/site tree;
- requires explicit `index.html`;
- rejects directory-style links;
- checks all artifacts, not only the hub.

5. Published bytes diverged from the durable manifest.

Because the generated links were broken, the S3 hub was patched during manual publication while the committed durable run remained immutable.

Manifest hub hash:
`fda2a2be649ec3903dca9b13e14c7be41c6fa7746abb04a7b66b140b73d6f9fa`

Published transformed hub hash:
`32442e87c50ddabd12ce1868cf9b74a70cef0e24af025e546c6f3a8c741fd4bc`

S3 metadata records both values, but this is still an undesirable split between durable source, manifest, and publication.

Require:

- published bytes to match the finalized manifest;
- link corrections to trigger rebuild, browser review, visual review, durability, and publication;
- no publication-time HTML transformation;
- a durable `publish-receipt.json` containing all object and public URLs.

6. Protected public URLs conflict with the connector contract.

The current `s3-static` destination contract requires credential-free HTTPS verification before uploading. VoxOps returns 401 to the Cloud Agent, while raw S3 returns 403 anonymously.

Resolve this explicitly:

- either maintain the anonymous-public requirement and report VoxOps as an incompatible destination before publication;
- or add an injected, provider-neutral authenticated public-verification seam that never persists credentials;
- or separate canonical URL generation from public byte verification while retaining a trustworthy verification requirement.

Do not silently treat a 401 as publication success.

7. Public URLs were incomplete in project records.

Only the hub URL was recorded fully in project state/summary. Architecture and deck URLs had to be inferred from the prefix and manifest.

Publish receipts and lifecycle summaries should expose every artifact’s:

- ID;
- rendered path;
- S3 URI;
- canonical public URL;
- content hash;
- verification result.

8. Secondary path-contract gaps discovered in the audit

Review and either fix or document:

- `publicBaseUrl` is nested under `durability.publish`, while some render paths inspect only the top-level request field;
- repository invocation exists in `resolve-paths.mjs`, but the current adapter entry point rejects non-project invocations;
- callers can accidentally supply an output root already ending in the run slug, producing double nesting;
- render-time and publish-time URL construction should use the same segment encoding rules.

Observed lifecycle and recovery problems

1. The autonomous recap gate ran after final approval instead of at its required pre-approval position.

Add a lifecycle invariant: when a recap resolves to `generate`, final approval cannot complete until the recap gate has recorded a terminal outcome.

2. First run: `project-recap`

Outcome:
`built-needs-review`

Reason:
mobile architecture text clipping.

Durability and publication were correctly skipped, but there was no automatic bounded correction path.

3. Second correction attempt: `project-recap-corrective-2`

Outcome:
failed during content processing.

Error:
`request.sourceIds is not iterable`

Investigate and add regression coverage for this callback/request-shape failure.

4. Final correction: `project-recap-corrected`

Outcome:
`built-durable`

Browser evidence:
320, 768, and 1440 viewport captures.

Warnings:

- theme fallback/default warning;
- `guideline-narrative-coverage-missing`.

Publish stage:
skipped.

Publication was performed manually afterward, so no core publish receipt exists.

5. Failed-run evidence was local and git-excluded.

Define a clear policy for failed or superseded recap runs:

- retain a compact failure record durably;
- archive diagnostic evidence intentionally; or
- delete it intentionally.

Do not rely on untracked local directories as the only evidence of lifecycle failures.

Visual-design problems

The narrative hub is acceptable, but the deck and diagram are visibly weak.

1. Recipe contradiction

`project-recap.json` requires hub, architecture, and deck as floor artifacts. The project recap brief says expansion should happen only when complexity earns it.

Make the hub the floor. Require a diagram or deck only when the planner identifies a distinct reader question and sufficient supporting evidence. If the product requires a consistent three-artifact set, require each artifact to have a distinct narrative purpose and reject redundant filler.

2. Renderer ownership

Authors currently return complete HTML and can improvise layout and CSS. In this run they copied the neutral shells almost unchanged.

Prefer artifact-specific structured content contracts:

- deck: slide purpose, layout archetype, headline, evidence, comparison, visual, action;
- diagram: nodes, groups, edges, labels, layout direction, emphasis;
- hub: sections, evidence tables, cards, callouts, artifact references.

Let the renderer own layout, typography, spacing, responsive behavior, and components.

3. Typography

Current styles rely on generic `system-ui`, `ui-serif`, and Georgia. The deck assigns the generic serif stack to every display heading.

Add a real type system:

- bundled, licensed fonts or deterministic high-quality stacks;
- display, heading, body, UI, annotation, and mono roles;
- weights, tracking, line heights, measures, and optical sizing;
- medium-specific scales for pages, decks, and SVG labels;
- reliable font embedding/loading without external active content.

4. Deck quality

Several slides are only a large heading plus one paragraph on an otherwise empty viewport.

Add controlled slide archetypes:

- outcome hero;
- before/after;
- architecture;
- decision/trade-off;
- evidence scoreboard;
- comparison;
- next action.

Add deterministic checks for:

- repeated title-plus-paragraph slides;
- excessive empty space;
- duplicated slide-position text;
- lack of meaningful visual variation;
- overflow and presentation-distance legibility.

5. Diagram quality

The architecture diagram uses manually authored SVG coordinates in a fixed
`1200×720` viewBox, four visually identical boxes, unlabeled connectors, redundant legend text, excess whitespace, and zoom/pan controls that are unnecessary for such a small graph.

Accept semantic graph data and render it centrally:

- ownership, dependency, sequence, and state-flow layouts;
- auto-fit viewBox;
- edge labels;
- containers/swimlanes;
- overlap and crossing detection;
- content-aware spacing;
- zoom/pan only when the graph exceeds the viewport.

6. Visual review false positive

The corrected set received `pass` with zero findings despite the typography, deck composition, and diagram-quality problems.

Expand the visual-review rubric and required output to score:

- intentional typography;
- hierarchy;
- composition and balance;
- information density;
- medium leverage;
- template repetition;
- diagram semantics;
- cross-artifact cohesion.

Legible and unclipped is necessary but not sufficient. The current deck and diagram screenshots should produce `correct`, not `pass`.

Required acceptance criteria

Path and publication:

- Project invocations write locally under `<active-project>/explainers/<run>/`.
- Repository invocations write under `.oat/repo/reference/explainers/<run>/`.
- Direct callers retain explicit output-root behavior.
- Repository-level publish config dynamically derives `/projects/<project-slug>` for project runs.
- Every rendered and published artifact ends in explicit `index.html`.
- Every internal link resolves to a manifest-declared target.
- Published bytes exactly match manifest hashes.
- Successful publication emits a receipt listing every S3 and public URL.
- Protected-public-root behavior is explicit and tested.
- No credentials enter requests, manifests, logs, or receipts.
- Publication remains human-gated and additive.

Visual quality:

- Artifact selection is content-adaptive or each required artifact has a distinct justified role.
- Renderer-owned structured layouts replace unconstrained full-document styling for standard artifacts.
- Typography is deterministic and role-based.
- Decks use multiple appropriate layout archetypes.
- Diagrams use semantic layouts with fit-to-content behavior.
- Visual review evaluates design quality, not merely clipping and accessibility.
- Existing accessibility, keyboard, reduced-motion, print, and mobile requirements remain intact.

Lifecycle:

- Recap gate ordering is enforced before final approval.
- `built-needs-review` has a bounded correction/rebuild path.
- Failed-run evidence has an explicit durability policy.
- Corrected runs cannot publish until browser and visual review pass.

Tests:

- Add unit tests for local and remote path derivation.
- Add project and repository invocation fixtures.
- Add internal-link validation fixtures, including the broken links from this case.
- Add publication tests that verify explicit `index.html`, project prefixes, hashes, and receipts.
- Add a regression test for `request.sourceIds is not iterable`.
- Add desktop/tablet/mobile golden fixtures for hub, diagram, and deck.
- Include a negative visual-quality fixture based on this deck and diagram that must not receive `pass`.

Constraints:

- Keep `explainer-kit` destination-neutral and config-blind.
- Keep OAT project/repository topology in `oat-explainer-kit`.
- Do not hard-code Duet, VoxOps, or this bucket into the core.
- Preserve immutable manifests and additive S3 behavior.
- Do not solve broken links through post-publication mutation.
- Preserve source provenance and accessibility.
