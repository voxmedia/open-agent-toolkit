---
oat_generated: true
oat_generated_at: 2026-07-29T04:05:56Z
oat_review_scope: p04
oat_review_type: code
oat_review_invocation: manual
oat_project: .oat/projects/shared/explainer-improvements
---

# Code Review: Phase p04

**Reviewed:** 2026-07-29T04:05:56Z
**Scope:** Effective p04 product delta for p04-t01 through p04-t04; OAT tracking-only changes excluded from code-quality findings
**Files reviewed:** 23 changed product files plus focused regression sources
**Commits:** `dda6ff61a2845614f87b81ac2dbee77261c1c175..cf579ca39ba6b0bc7b22e2adb70287dc1e77049f`
**Verdict:** BLOCKED

## Summary

The phase adds useful topology detection, GitHub backlink generation, manifest-derived catalogs, exact publication receipts, strict archive parsing, and a genuine packaged Git fixture. However, two load-bearing guarantees are bypassable: the artistic route does not bind or verify the parsed graph, and accepted backlink URLs can normalize away the pinned SHA to a moving ref. Mutable working-tree bytes can also be labeled with an unrelated `HEAD`, catalog URL validation trusts the URL field it is meant to validate, and three pre-existing completion integration cases are now red.

Findings: 2 critical, 3 important, 0 medium, 0 minor

## Findings

### Critical

- **C1 — The artistic path does not preserve or verify the original graph semantics** (`.agents/skills/explainer-kit/scripts/run.mjs:1524`)
  - Issue: Runtime topology inspection is restricted to Markdown author results. A non-linear Markdown diagram is rejected, while an HTML-authored artifact bypasses graph inspection entirely. `resolveDiagramRenderingRoute()` returns `artistic` for HTML, but no caller passes the parsed `nodes`/`edges` to the artistic author or verifies the resulting `data-from`/`data-to` edges. The e2e test supplies already-correct handcrafted HTML, so a flattened branch, fan-in, or cycle can still pass when a visual critic returns `pass`.
  - Fix: Make the parsed graph an immutable artistic-author input and validate the rendered graph against the original node/edge multiset before review can pass. If exact semantic validation is unavailable, reject the artifact. Add branch, fan-in, and cycle cases whose artistic author deliberately drops or rewires an edge and prove they fail; retain the linear inline case.
  - Requirement: p04-t01 acceptance — unsupported topology must be preserved by artistic composition or rejected, never silently flattened.

- **C2 — Dot-segment backlink URLs bypass the pinned-SHA contract** (`packages/cli/src/commands/project/archive/archive-utils.ts:847`)
  - Issue: The CLI regex accepts paths such as `.../blob/<40-sha>/../main/plan.md#L1` and `%2e%2e/main/plan.md`. WHATWG URL normalization turns both into `.../blob/main/plan.md#L1`, so a moving branch passes the “canonical immutable” parser. The core schema has the same broad URL pattern, and supplied fact-base citations are not normalized unless their source itself carries backlink fields (`.agents/skills/explainer-kit/scripts/lib/fact-base.mjs:525`). A direct probe confirmed both the CLI regex and `processFactBase()` accept the bypass.
  - Fix: Centralize canonical GitHub blob URL parsing. Parse and canonicalize the URL, reject raw or decoded empty/`.`/`..` path segments and non-canonical encoding, require an exact 40-hex blob segment after normalization, validate the line range, and require the complete repository/revision/path/lineRange/url tuple together. Derive and compare the URL rather than trusting a supplied URL string. Reuse equivalent logic in the core schema/runtime and CLI consumer.
  - Requirement: p04-t02 and p04-t04 acceptance — immutable reviewed backlinks only; malformed and moving references must be rejected.

### Important

- **I1 — Backlinks pin `HEAD` but hash and quote mutable working-tree bytes** (`.agents/skills/oat-explainer-kit/scripts/bind-project-sources.mjs:99`)
  - Issue: `resolveReviewedRepository()` records `git rev-parse HEAD`, while `provenanceForSources()` and `loadOatArtifact()` read the current filesystem (`bind-project-sources.mjs:148` and `:118`). There is no clean-tree, tracked-file, or Git-blob equality check. A direct probe committed one plan, modified it without committing, and received the old SHA backlink paired with the uncommitted text.
  - Fix: Read each reviewed source from `<sha>:<repo-relative-path>` and derive its line range/hash from those bytes, or fail closed unless the tracked working-tree bytes exactly equal that blob. Reject untracked source files and preserve the repository confinement checks.
  - Requirement: p04-t02 acceptance — the full reviewed commit SHA must identify the source bytes behind every claim.

- **I2 — Catalog validation accepts a stale URL on an unrelated origin** (`.agents/skills/explainer-kit/scripts/lib/catalog.mjs:131`)
  - Issue: The expected catalog entry copies `entry.url` itself, and `isAbsoluteArtifactUrl()` checks only HTTPS plus a pathname suffix. A direct probe changed a valid entry to `https://evil.example/site/initiatives/demo/index.html`; `validateInitiativeCatalog()` returned `{ valid: true }`. Generation currently emits the configured origin, but the validator does not enforce the catalog contract it advertises and cannot reject this malformed/stale entry.
  - Fix: Pass the normalized public base URL into validation and derive the exact expected URL from it and `renderedPath`. Compare the complete canonical URL, including origin and base path, and add wrong-origin, wrong-base-path, duplicate/extra-field, and encoded-path mutation cases.
  - Requirement: p04-t03 acceptance — absolute catalog URLs must be derived from the finalized manifest/public root and stale or malformed entries must be rejected.

- **I3 — The new unconditional Git lookup regresses existing completion integration coverage** (`.agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs:389`)
  - Issue: Running the regression-critical p03 suite produced 159/162 passes. The three documented author-seam cases at lines 389, 448, and 473 fail before browser/critic assertions because their temporary repo fixture is not initialized as Git and has no origin. The failure reproduces in isolation (14/17 passed). This contradicts the claimed complete workspace pass and leaves the p03 completion/evidence behavior unverified under the new adapter boundary.
  - Fix: Initialize and commit the completion fixture with a canonical GitHub origin, as the packaged-layout fixture now does, then assert resolved repository/SHA provenance without injecting it. If non-Git repositories remain supported, make provenance capability explicit and preserve the prior behavior instead. Rerun the complete p03 regression union and full workspace suite.

### Medium

None.

### Minor

None.

## Requirements/Design Alignment

**Evidence sources used:** `plan.md`, `implementation.md`, `state.md`, and `references/imported-plan.md`. This is import mode; no `spec.md` or `design.md` is present or required.

### Requirements Coverage

| Requirement                     | Status  | Notes                                                                                                                        |
| ------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| p04-t01 topology routing        | Partial | Linear inline rendering and non-linear detection work, but artistic output is not semantically bound or verified.            |
| p04-t02 immutable backlinks     | Partial | Normal generated URLs are commit-pinned and encoded, but mutable source bytes and dot-segment URLs break immutability.       |
| p04-t03 manifest catalog        | Partial | Generation, artifact/source parity, publication ordering, and receipt checks work; strict URL validation is incomplete.      |
| p04-t04 consumers/package smoke | Partial | Packaged smoke genuinely resolves Git provenance, but strict CLI parsing is bypassable and completion regression cases fail. |
| p03 regression safety           | Partial | Browser, PNG, critic, records, durability, and package-coverage cases passed; three completion integration cases fail.       |

### Extra Work

None in the effective product delta. Root-owned `.oat` tracking commits were excluded from code-quality findings as requested.

## Independent Verification

- `git diff --check dda6ff61...cf579ca3` — passed.
- Complete p04 core/adapter union — 105/105 passed.
- CLI archive tests — 55/55 passed.
- Packaged-layout plus canonical package-coverage smoke — 5/5 passed.
- Focused topology/fact-base/render/catalog/publish/adapter tests — 87/87 passed.
- Regression-critical p03 browser/PNG/critic/records/durability/package-coverage run — 159/162 passed; the three completion integration failures reproduce alone at 14/17.
- Direct probes confirmed:
  - parsed non-linear graphs are retained by the low-level parser, but the runtime artistic route has no semantic handoff or output comparison;
  - uncommitted artifact bytes receive the prior `HEAD` backlink;
  - literal and percent-encoded dot segments normalize a supposedly pinned URL to `/blob/main/...`;
  - supplied fact-base citations accept the same moving-ref bypass and partial backlink tuples;
  - catalog validation accepts a matching path on an unrelated HTTPS origin.
- Packaged-layout inspection confirmed the fixture runs `git init`, adds a canonical origin, commits its files, and invokes the adapter without injected reviewed provenance.

## Bounded Remediation Tasks

1. **p04-t05:** Bind parsed graph semantics through artistic composition and reject edge/node drift.
2. **p04-t06:** Canonicalize backlink URLs across core and CLI, and bind source bytes to the reviewed Git blob.
3. **p04-t07:** Validate catalog artifact URLs against the exact configured public base.
4. **p04-t08:** Restore completion integration coverage with adapter-owned Git provenance and rerun p03/full regression gates.

## Verification Commands

```bash
node --test .agents/skills/explainer-kit/tests/contracts.test.mjs .agents/skills/explainer-kit/tests/diagram.test.mjs .agents/skills/explainer-kit/tests/e2e-recap.test.mjs .agents/skills/explainer-kit/tests/fact-base.test.mjs .agents/skills/explainer-kit/tests/render.test.mjs .agents/skills/explainer-kit/tests/s3-static.test.mjs .agents/skills/oat-explainer-kit/tests/run.integration.test.mjs
pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/archive/archive-utils.test.ts
node --test .agents/skills/oat-explainer-kit/tests/completion.integration.test.mjs tools/smoke/explainer-kit/packaged-layout.test.mjs tools/smoke/explainer-kit/package-coverage-consumers.test.mjs
pnpm check && pnpm lint && pnpm format && pnpm type-check && pnpm test && pnpm build && pnpm release:validate
```

## Recommended Next Step

Run `oat-project-review-receive` to convert C1, C2, and I1-I3 into the bounded p04 remediation tasks above. Phase p04 should remain blocked until a fresh review verifies the fixes.
