---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-05
oat_generated: false
---

# Discovery: docs-bootstrap-skill

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Create a docs bootstrap skill that uses the OAT docs CLI to initialize a project with documentation. The skill:

1. Interactively walks users through `oat docs init` with more detail and support than the raw CLI
2. Detects monorepo vs single-package and adapts the flow accordingly
3. After scaffolding, verifies the build works and resolves issues
4. Educates users on how docs work: index.md as content maps, the `## Contents` contract
5. Explains that `oat-project-document` auto-populates docs during OAT workflows
6. Points out agent instructions scaffolded in the docs app directory
7. Explains `oat docs analyze` + `oat docs apply` for bootstrapping documentation content

Two framework paths: Fumadocs (full educational walkthrough) and MkDocs (thinner — setup, verify, shared concepts).

**Additionally in scope:** CLI fixes to `oat docs init` that were identified through hands-on testing.

## Clarifying Questions

### Question 1: Framework Support Depth

**Q:** Should the skill support both Fumadocs and MkDocs?
**A:** Yes, both supported. Fumadocs gets the full educational treatment. MkDocs is thinner — setup, verify build, then shared concepts (index.md contract, analyze/apply). MkDocs can note where it needs more elaboration later.
**Decision:** Both frameworks in scope. Fumadocs is primary; MkDocs is functional but leaner on framework-specific education.

### Question 2: Scaffolded Content Expectations

**Q:** The scaffolded content is docs-app-centric rather than project-centric — is that a problem?
**A:** No, that's expected. Scaffold content should teach you how the docs work. `oat docs analyze` is what populates project-specific documentation afterward.
**Decision:** Scaffold content stays docs-app-focused. The skill explains this and guides users to analyze/apply for project content.

## Solution Space

### Approach: Guided Wrapper Skill (Chosen)

**Description:** The skill acts as an interactive guided wrapper around `oat docs init`. It runs the CLI command itself but pre-populates answers with intelligent defaults after asking the user more contextual questions. After init, it runs builds, resolves issues, then transitions into an educational walkthrough.

**Flow:** Preflight detection → interactive config gathering → run `oat docs init` with flags → install deps + verify build → educational walkthrough (index.md, agent instructions, analyze/apply)

**Rationale:** Full control over UX pacing. Can insert educational content at exactly the right moments. Low maintenance cost since it calls the CLI with flags rather than reimplementing logic.

**User validated:** Yes

## Friction Points from Hands-On Testing

### Round 1: Non-Monorepo Fumadocs (from real repo)

Captured from PR #13 bootstrapping + 8 fix commits over ~4 hours.

#### FP-1: OAT CLI dependency missing from scaffold

**Problem:** Scaffold wired `oat docs generate-index` into prebuild/predev scripts but didn't include `@open-agent-toolkit/cli` as a devDependency. CI broke because the binary wasn't available.

**Resolution:** Add `@open-agent-toolkit/cli` as a devDependency so CI gets it via `pnpm install`. The intermediate attempts (removing from prebuild, `|| true` wrapping) were wrong turns.

**CLI fix needed:** Scaffold template should include `@open-agent-toolkit/cli` in devDependencies by default.

#### FP-2: `@types/node` missing in scaffold

**Problem:** `@types/node` was available locally via hoisting but missing in CI isolated installs. TypeScript/Next.js build failed.

**CLI fix needed:** Scaffold template should include `@types/node` in devDependencies.

#### FP-3: `.oat/` gitignore confusion

**Problem:** Scaffold initially added `.oat/` to docs app `.gitignore`, but `.oat/config.json` needs to be tracked for OAT context.

**CLI fix needed:** Scaffold should create `<app>/.oat/config.json` as tracked and set up `.gitignore` to exclude `.oat/*` except `!.oat/config.json`.

#### FP-4: Dual `.oat/config.json` path confusion

**Problem:** Non-monorepo needs config at both root (`.oat/config.json`) and docs app level (`<app>/.oat/config.json`) with different relative paths to the same files. Error-prone.

**CLI fix needed:** Either resolve paths automatically from root config, or scaffold both configs with clear documentation about their relationship.

### Round 2: Cross-Repo Testing (Monorepo + Single-Package + Existing Docs)

#### FP-5: Index generation broken after init

**Problem:** `.oat/config.json` points to `<app>/index.md` but that file isn't created. AGENTS docs section points to `<app>/docs/index.md`. Internal inconsistency. The `predev`/`prebuild` hook uses `|| true` so failure is silent.

**CLI fix needed:** Either generate the index file during init, or fail loudly with remediation steps. Fix path inconsistency between config and AGENTS.md.

#### FP-6: Single-package repo setup incomplete

**Problem:** In non-monorepo, scaffold creates `<app>/` as subdirectory but root `pnpm install` doesn't install it. No workspace wiring, no guidance.

**CLI fix needed:** Either create/update workspace wiring, or print explicit next steps (`cd <app> && pnpm install && pnpm build`).

#### FP-7: No preflight checks

**Problem:** Init happily overwrites existing docs setup without checking for:

- Existing `.oat/config.json` documentation config
- Existing docs app or docs-related root scripts
- Existing AGENTS docs section

**CLI fix needed:** Detect existing setup and ask whether to replace, scaffold alongside, or abort.

#### FP-8: No monorepo integration guidance

**Problem:** If root scripts or filters assume app name `docs` and user picks a different name, nothing warns them about what to update.

**CLI/Skill fix needed:** Detect root script assumptions and surface what needs updating.

#### FP-9: Doesn't detect local OAT packages

**Problem:** If repo already contains workspace copies of docs-config/docs-theme/docs-transforms, scaffold pulls published `@open-agent-toolkit/*` packages instead of wiring to local workspace packages.

**CLI fix needed:** Detect local OAT packages and offer to wire to them via `workspace:*`.

#### FP-10: First-build tsconfig rewrite churn

**Problem:** Next.js rewrites `tsconfig.json` on first build because scaffold doesn't preseed Next-compatible settings.

**CLI fix needed:** Preseed tsconfig with Next.js-compatible settings so first build is clean.

## Key Decisions

1. **Approach:** Guided wrapper skill that calls `oat docs init` with flags rather than reimplementing scaffold logic.
2. **Framework scope:** Both Fumadocs and MkDocs supported; Fumadocs primary with full education, MkDocs functional but leaner.
3. **CLI fixes in scope:** Friction points FP-1 through FP-10 are CLI bugs/improvements that should be fixed alongside the skill, not just worked around.
4. **Content expectations:** Scaffold content is docs-app-focused by design. The skill explains this and guides to analyze/apply for project content.
5. **Package naming:** All references use `@open-agent-toolkit/*` (not legacy `@tkstang/*`).

## Constraints

- Skill calls the CLI rather than reimplementing scaffold logic — changes to scaffold behavior should be CLI fixes
- Must work for repos that don't have OAT installed globally (devDependency strategy)
- CI runners and repo-specific workflow issues are out of scope for the skill

## Success Criteria

- User can run the skill in a monorepo or single-package repo and get a working docs site on first build
- No silent failures — every error has a clear remediation
- User understands the index.md contract, agent instructions, and how to populate docs after bootstrap
- Preflight checks prevent accidental overwrites of existing docs setup
- All 10 friction points are resolved (in CLI, skill, or both)

## Out of Scope

- CI runner configuration (repo-specific)
- Project-specific content in scaffolded docs (that's what analyze/apply does)
- Deep MkDocs educational content (noted as future enhancement)

## Deferred Ideas

- MkDocs framework-specific deep education — label as "needs elaboration" in the skill
- Auto-running `oat docs analyze` + `oat docs apply` as part of bootstrap (could be offered as optional final step)

## Open Questions

- **Ideal guided flow sequence:** Preflight → config gathering → scaffold → install → verify build → education → (optional) analyze/apply. Does this match user expectations?
- **Error recovery:** If build fails after scaffold, should the skill attempt auto-fix or present the error and guide the user?
- **Existing docs coexistence:** When preflight detects existing docs, what are the valid coexistence patterns? (replace, second app, abort — anything else?)

## Assumptions

- Users have pnpm available (required by the monorepo tooling)
- Users are running the skill from the repo root
- The OAT CLI is available either globally or will be installed as part of the flow

## Risks

- **CLI fix scope creep:** 10 friction points is substantial CLI work alongside the skill
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Prioritize fixes that block the skill flow; defer nice-to-haves

## Blockers

- **Blocked on CLI fixes:** FP-1 through FP-10 need to be resolved in `oat docs init` before the skill can be accurately tested and designed. A separate project (`docs-init-fixes`) has been created to track that work.
- Resume this project after CLI fixes land and the user can test clean bootstrapping flows.

## Next Steps

- Complete `docs-init-fixes` project (CLI improvements)
- User re-tests bootstrapping with fixed CLI in both repo shapes
- Resume this project's discovery with clean feedback
- Decide on design depth (straight to plan vs lightweight design)
- Build the skill against the improved CLI
