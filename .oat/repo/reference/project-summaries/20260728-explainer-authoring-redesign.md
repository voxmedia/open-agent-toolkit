---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-27
oat_generated: true
oat_summary_last_task: prev2-t06
oat_summary_revision_count: 2
oat_summary_includes_revisions: ['rev1', 'rev2']
---

# Summary: explainer-authoring-redesign

## Overview

A prior Explainer Kit revision abstracted authoring into fixed slots, so every
generated recap filled the same shapes and the output was structurally thin —
the complaint that opened this project was that a shipped recap was "basic AF"
despite the kit passing its own gates. The diagnosis was that editorial
expectations had been encoded into machine contracts: the schema described
shapes rather than quality, so an author satisfying it exactly still produced a
formulaic page, and tightening the schema made it worse.

This project rebuilt authoring on two per-artifact paths and moved quality
expectations out of schemas and into prose.

## What Was Implemented

Eight phases, 20 planned tasks plus three correctives, then a 10-task revision
phase, a final scope reduction, four post-closeout rendering fixes, and a
six-task phase closing the remote PR review. Shipped as PR #179: 92 commits,
155 files, +26,790/−1,547 as of `28196ec7`.

- **Two authoring paths.** A narrative path promotes Markdown from provenance to
  actual renderer input, so tables, GFM-alert callouts, fenced timelines, and
  fenced diagrams render as structure instead of flattening to prose. An
  artistic path has the executing agent compose HTML from hash-pinned shells.
  Recipe policy selects the path through expansion profiles; the author does not.
- **`recipe/v2` replaces v1.** A dual-version loader carried both schemas
  through the middle of the project, and `p06-t04` then retired
  `explainer-kit.recipe/v1` at the 2.0.0 boundary. Bundled recipes and fixtures
  were migrated, and finite per-recipe and per-type expansion caps are enforced.
- **Guidelines degrade to warnings.** Floor-coverage misses emit
  `guideline-narrative-coverage-missing` rather than failing the run, while
  safety and provenance stay hard errors.
- **Approval moved after render and QA**, with the accepted artifact set
  persisted in `content-approval/v2` so a rejected draft resumes faithfully.
- **Provenance trust boundary.** Author identity and method bind through trusted
  caller configuration; the core stamps time from its injected clock and rejects
  author-asserted trust levels.
- **Render QA is opt-in** and never self-launching.
- **End-to-end anti-regression fixture** built on the shipped `project-recap`
  example, verified non-vacuous — breaking the table renderer fails 6 of 8
  assertions.

Final gates: core 231, adapter 59, release 44 (1 env-gated skip), smoke 129,
plus `release:validate`, `release:check-versions`, `lint`, and `type-check`.

## Key Decisions

- **Explainer authoring is two-path with a caller-owned author seam.** Editorial
  expectations live in author briefs as prose while schemas define only machine
  boundaries — prose carries quality, schemas carry identity. No content
  generator ships in the core or adapter; the executing agent is the author.
  Promoted to `DR-260726-explainer-authoring-is-two`.
- **Explainer render QA is opt-in and never self-launching.** The core never
  launches a browser; the generating agent reviews output in a browser when one
  is available. Promoted to `DR-260726-explainer-render-qa-is-opt`.
- **Policy owns expansion, not authors.** Recipes declare profiles that dictate
  type, authoring path, brief, and shell, preventing authors from choosing their
  own freedom level. Promoted to `DR-260726-recipe-policy-owns-expansion`.
- **Expansion artifacts get ID-bearing paths; floor artifacts keep existing
  ones** (D1), with `origin` carried explicitly so URL stability holds for
  already-published artifacts. Promoted to
  `DR-260726-expansion-artifacts-get-id`.
- **Core shell scripts are hash-pinned and authored scripts are rejected** (D3),
  validated as an ordered multiset. Promoted to
  `DR-260726-core-shell-scripts-are-hash`.

## Design Deltas

- **D9 added during the revision phase.** The final review observed that
  `author-request/v2` appeared only in tests and documentation, so autonomous
  richness was unproven. Rather than ship a content generator, the project
  recorded the author seam as deliberately caller-owned and verified richness
  behaviorally. The underlying limitation is accepted, not closed: whether an
  agent writes well is not unit-testable.
- **Automated render QA was removed after implementation.** `prev1-t06` built an
  auto-resolving browser runtime; a later scope review cut it. The shared
  `browser-runtime.mjs` module was retained because the pre-existing visual
  release gate had come to depend on it.
- **Manifest warning vocabulary changed.** `render-qa-skipped-no-headless-runtime`
  and `render-qa-disabled-by-configuration` collapsed into
  `render-qa-skipped-no-probe`, carried by the `explainer-kit` 2.0.0 major.

## Notable Challenges

- **A pre-existing regression blocked the start.** 11 core tests were already
  failing on `origin/main`, bisected to PR #170: one test referenced a project
  directory that PR had deleted, and ten had fixtures stale against a new
  immutable-coverage validation. Repaired as a `p00` pre-phase to establish a
  green baseline before redesign work began.
- **Probe false positives blocked two later phases.** The layout probe reported
  intentionally paged deck slides as clipped, and read the conventional
  reduced-motion idiom (`0.01ms`) as active animation. Both required correctives
  (`p05-t02a`, `p05-t02b`) because they blocked `release:validate`.
- **Parallel phases aborted three times at preflight** because
  `pnpm run worktree:init` restamped `.oat/sync/manifest.json` outside the
  declared write sets. Resolved by reverting the file and re-dispatching with an
  explicit exemption.
- **The review loop did not converge.** The plan needed six gate cycles before
  implementation; the final code review produced 10 findings, and a re-review of
  those 11 fix commits produced 8 more. The loop was ended deliberately rather
  than continued.
- **No gate could see the styling surface.** The narrative renderer's markup and
  the shells' stylesheets are separate surfaces, and every assertion covered the
  former. Four defects reached rendered output through that gap, each found by
  looking at the page rather than by a test or the release gate — the bare
  section numeral, downscaled diagram labels, fragmented wrapped lists, and the
  `engineer-tour` shell's entirely unstyled block output. The shell gap was
  latent on `main` and became reachable only because this project's renderer
  emits that markup. This is the concrete case for the project's decision that
  the generating agent reviews output in a browser: the suite was green and
  `release:validate` passed at every one of those points.
- **A review triage published a false disproof.** Triaging the remote review,
  the root orchestrator searched only `scripts/lib/*.mjs`, concluded nothing read
  `profile.shell`, and re-scoped Bugbot's finding as a dead key to remove — a
  conclusion recorded in `plan.md`, the review artifact, and a PR comment. The
  consuming code was in `scripts/run.mjs`. The implementer found it, refused to
  delete a load-bearing key, and blocked instead of complying. The block was
  correct: root reproduced `templates/undefined.html`, corrected all three
  artifacts, posted a retraction on the PR comment carrying the false claim, and
  re-dispatched with the finding restored as reported. Worth preserving because
  the failure was a scoped search treated as exhaustive, and the recovery
  depended on a subagent contradicting its own instructions.

## Tradeoffs Made

- **Richness is verified by example, not by test.** The alternative — a bundled
  content generator — would recreate the slot-filling rigidity the project
  existed to remove. A caller supplying a thin author still gets thin output.
- **Layout regressions rely on the release gate and agent review** rather than
  per-run automation, so a layout defect can reach a reader if nobody looks.
  Accepted because render QA had grown to own a browser dependency and a
  disproportionate share of the test surface for artifacts published to a
  private bucket.
- **Four review findings were dropped rather than fixed or backlogged.** Two
  HTML-safety gaps (`input[type=image]` with a remote `src`, and relative CSS
  `url()`) are real but unreachable while artifacts are composed from
  hash-pinned shells; an anchor collision requires an author to use `overview`,
  `introduction`, and `lead` simultaneously; and one warning is already re-added
  by the pipeline.

## Revision History

- **Phase rev1** — the final code review's 10 findings implemented across 11
  commits: HTML safety, three distinct probe defects (scroll reachability,
  hidden headings, pseudo-element motion), render degradation warnings reaching
  the manifest, a single stable warning ID per finding, the provenance trust
  boundary, the QA runtime seam, D9, per-type expansion caps, Markdown lead
  preservation with deterministic ID disambiguation, and artifact alignment.
  Each probe sub-fix was individually revert-verified in real Chromium.
- **Post-revision scope reduction** — three commits making render QA opt-in,
  clearing stale render/QA warnings on a corrected resume, and correcting the
  `f257f96d` deviation description. Core and adapter counts fell from 226 and 60
  to 221 and 59 as six tests were removed with the behavior they described.
- **Rendering this project's own recap after closeout found four more defects**,
  all in the styling surface no assertion covered. Three were narrow: bare
  body-size section numerals in the house shells (`191bdfcf`), wrapped list items
  reparsed as paragraphs so most lists broke into fragments (`bf0a8b43`), and
  diagram SVGs carrying only a `viewBox` so they stretched to the column and
  downscaled 14px labels to 8px (`0514b04d`). The fourth was larger
  (`fb55ba94`): the `engineer-tour` shell styled none of the blocks the narrative
  renderer emits, so deep-dive callouts rendered as bare text and tables without
  structure, and `renderLegacyDiagram` drew 360-wide nodes at `x=80` into a
  360-wide viewBox stacked past its 540 height, clipping every section-rail node
  into a solid black bar. Both were revert-verified; the `.section-number` guard
  was generalized to assert every structure the renderer emits, and a new test
  asserts the section rail stays inside the shell viewport. Core and adapter
  stood at 224 and 59 at that point — the 221 and 59 above plus the
  section-number guard, a wrapped-list-item Markdown test, and the viewport-fit
  test.
- **Phase rev2** — six fix tasks closing the remote Bugbot review of PR #179
  (4 Medium, 2 Minor), each independently reproduced at the root before being
  converted into a task. Two were shell regressions this PR had introduced and
  were ordered first because they degraded every rendered deep-dive: snippet code
  blocks drew a frame nested inside the `.snippet` panel's own frame
  (`93d395da`), and `.diagram-card .node` set `stroke` on the `<g>` wrapping both
  `<rect>` and `<text>`, so SVG stroke inheritance rendered every section-rail
  label as outlined glyphs (`e695e889`). Both were browser-confirmed rather than
  accepted on assertions alone. The rest were contract and plumbing gaps:
  legacy approval records paired an `html` floor artifact with a hardcoded
  Markdown content path (`f496268d`); `addExpansionWarnings` filtered out
  `type-limit`, leaving `expansionTypeLimit` dead so declared `maxPerType`
  overruns never reached the manifest (`0e27108e`); `probeRenderedPage` silently
  dropped the `disableAnimations` and `injectedCss` fields its caller sent, which
  left the `animations-enabled` check unable to verify what it reported
  (`82114224`); and `if ('shell' in profile)` validated `shell` only when the key
  was present, so an `authoring: html` profile without it loaded as valid and
  failed later reading `templates/undefined.html` (`6ff2172b`). Every task was
  revert-verified. Core and adapter close at 231 and 59.

## Follow-up Items

Recorded for memory, explicitly not backlogged — the operator decided these do
not warrant tracked work:

- `isUnsafeUrl` accepts `<input type="image" src="https://…">` and relative CSS
  `url(...)` references. Verified reproducible. Matters only if artifact HTML
  ever stops coming from an agent working off hash-pinned shells.
- A generated lead section can take `#lead` from an authored heading when
  `overview`, `introduction`, and `lead` are all already used.
- `checkGuidelines` omits the per-type expansion warning that the main pipeline
  appends separately, so direct consumers of that exported function lose it.
- Autonomous prose richness remains verified by rendered example rather than by
  automated evaluation.

Two further items were backlogged after closeout, on separate topics from the
four above:

- `BL-260727-ship-mit-notices-inside` — Ship MIT notices inside distributed
  packages (high, task, S). Adapted MIT code (Nico Bailon's visual-explainer,
  Obra Superpowers, shadcn/improve) ships without the required copyright and
  permission notice, because repo-root `NOTICES.md` is not part of the published
  package payload.
- `BL-260727-close-the-explainer-kit-visual` — Close the Explainer Kit visual
  authoring capability gap (medium, feature, L). The inline fenced-diagram
  renderer silently flattens non-linear graphs — branches, fan-ins, and cycles —
  into a linear chain, and the upstream visual-explainer workflows remain
  unreachable from the bundled recipes.

## Workflow Observations

### 2026-07-25 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-max threshold=important findings=critical:0,important:5,medium:3,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-authoring-redesign/reviews/artifact-plan-review-2026-07-25T183814Z.md

### 2026-07-25 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-max threshold=important findings=critical:0,important:5,medium:3,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-authoring-redesign/reviews/artifact-plan-review-2026-07-25T190445Z.md

### 2026-07-25 · structural · oat gate review · plan

target=cursor-gpt-5-6-sol-max threshold=important findings=critical:0,important:4,medium:1,minor:0 exit=1 status=blocked artifact=.oat/projects/shared/explainer-authoring-redesign/reviews/artifact-plan-review-2026-07-25T191042Z.md
