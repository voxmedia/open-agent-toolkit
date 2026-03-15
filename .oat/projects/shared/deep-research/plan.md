---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-03-14
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: []
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: Research & Verification Skill Suite

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with phase checkpoints and review gates.

**Goal:** Build five provider-agnostic OAT skills (/skeptic, /compare, /deep-research, /analyze, /synthesize) forming a layered research, analysis, verification, and synthesis suite with shared schemas, cross-cutting conventions, and a sub-agent definition.

**Architecture:** Layered skill system — /skeptic is self-contained, /compare is standalone + sub-agent, /deep-research and /analyze are orchestrators that dispatch parallel workers and conditionally invoke /compare, /synthesize consumes artifacts from all above. Sub-agent dispatch follows the 3 execution tier pattern. All skills are provider-agnostic.

**Tech Stack:** Markdown SKILL.md files following OAT/Agent Skills Open Standard conventions. No executable code.

**Commit Convention:** `feat({task-id}): {description}` — e.g., `feat(p01-t01): add shared schema templates`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user (quick mode — no HiLL gates)
- [x] Set `oat_plan_hill_phases` in frontmatter (empty — no pause points)

---

## Phase 1: Foundation (schemas + sub-agent)

Shared infrastructure that other skills reference: schema templates for structured artifact output, and the skeptical-evaluator sub-agent definition.

### Task p01-t01: Create shared schema template files

**Files:**

- Create: `.agents/skills/deep-research/references/schema-base.md`
- Create: `.agents/skills/deep-research/references/schema-technical.md`
- Create: `.agents/skills/deep-research/references/schema-comparative.md`
- Create: `.agents/skills/deep-research/references/schema-conceptual.md`
- Create: `.agents/skills/deep-research/references/schema-architectural.md`
- Create: `.agents/skills/deep-research/references/schema-analysis.md`

**Step 1: Create base schema**

The base template shared by /deep-research and /analyze. Must include:

- Required artifact frontmatter contract (`oat_skill`, `oat_schema`, `oat_topic`, `oat_model`, `oat_generated_at`) plus optional keys
- Executive Summary section
- Methodology section (research methodology for /deep-research, analysis methodology for /analyze)
- Findings section (placeholder — structure varies by extended schema)
- Sources & References section

**Step 2: Create extended schema templates**

Each extended schema inherits the base and adds domain-specific sections:

- `schema-technical.md`: packages, repo analysis, code examples, integration notes
- `schema-comparative.md`: comparison table, dimensions, scoring, recommendation (shared with /compare)
- `schema-conceptual.md`: key themes, mental models, notable references, open questions
- `schema-architectural.md`: tradeoffs, constraints, decision framework, risk considerations
- `schema-analysis.md`: per-angle findings (6 angles), cross-angle synthesis, prioritized recommendations

**Step 3: Verify**

Run: `ls -la .agents/skills/deep-research/references/schema-*.md | wc -l`
Expected: 6 files exist

Run: Verify each schema file contains frontmatter and section headings matching the design specification

**Step 4: Commit**

```bash
git add .agents/skills/deep-research/references/schema-*.md
git commit -m "feat(p01-t01): add shared schema templates for research and analysis artifacts"
```

---

### Task p01-t02: Create skeptical-evaluator sub-agent definition

**Files:**

- Create: `.agents/agents/skeptical-evaluator.md`

**Step 1: Write agent definition**

Follow the pattern established by `.agents/agents/oat-reviewer.md` for structure. Must include:

- Frontmatter: `name`, `version` (1.0.0), `description`, `tools` (Read, Bash, Grep, Glob, WebSearch, WebFetch), `color` (red)
- Role description: adversarial evidence gatherer operating in a separate context
- Input contract: receives structured context package (CLAIM, BASIS, CLAIM_TYPE, AVAILABLE_SOURCES, INSTRUCTION)
- Output contract: returns inline findings to orchestrator (not written to disk)
- Behavioral rules: attempt to disprove first, cite specifically, never hallucinate sources, note supporting evidence only after exhausting contradictions
- Evidence gathering strategy per claim type (code_behavior, library_specific, documentation, factual, architectural)

**Step 2: Verify**

Run: Confirm file exists and frontmatter parses correctly
Run: Verify the agent definition includes all required contract elements from the design

**Step 3: Commit**

```bash
git add .agents/agents/skeptical-evaluator.md
git commit -m "feat(p01-t02): add skeptical-evaluator sub-agent definition"
```

---

## Phase 2: Independent Skills (/skeptic + /compare)

These skills have no orchestration dependencies on each other. /skeptic already has a draft; /compare is new.

### Task p02-t01: Update /skeptic SKILL.md to align with design

**Files:**

- Modify: `.agents/skills/skeptic/SKILL.md`

**Step 1: Align with design conventions**

Update the existing draft to:

- Use "Execution Tier" naming consistently (replace any "Tier 1/2/3" references with "Execution Tier 1/2/3")
- Reference the skeptical-evaluator agent definition created in p01-t02
- Align claim types with the design's 5-type classification
- Ensure the 4 verdict frames match the design exactly
- Add step logging format matching OAT convention (phase banner, `[N/M]` steps, `→` for long ops)
- Ensure provider split block for sub-agent detection follows `create-agnostic-skill` conventions
- Verify `allowed-tools` frontmatter is correct
- Ensure the context package structure matches the design specification

**Step 2: Verify**

Run: Read the updated SKILL.md and verify it references the skeptical-evaluator agent, uses Execution Tier naming, and includes all 5 claim types and 4 verdict frames

**Step 3: Commit**

```bash
git add .agents/skills/skeptic/SKILL.md
git commit -m "feat(p02-t01): align skeptic skill with design conventions and execution tier naming"
```

---

### Task p02-t02: Create /compare SKILL.md

**Files:**

- Create: `.agents/skills/compare/SKILL.md`

**Step 1: Write skill file**

Follow `create-agnostic-skill` conventions for cross-provider compatibility. Must include:

Frontmatter:

- `name: compare`
- `version: 0.1.0`
- `description`: domain-aware comparative analysis with clear recommendations
- `argument-hint`: items to compare + optional flags
- `user-invocable: true`
- `allowed-tools`: Read, Glob, Grep, Bash, WebSearch, WebFetch, AskUserQuestion, Agent, mcp\_\_\*

Workflow:

1. Parse items and optional dimensions from `$ARGUMENTS`; detect `--save` and `--context` flags
2. If `--context` provided, read context file/directory
3. Domain classification → dimension selection (npm packages, architectural approaches, business strategies, tools/apps, general)
4. Research each option against dimensions using available sources
5. Score/rank with qualitative assessment; produce clear recommendation
6. Output inline (default) or write artifact with `--save` flag using `schema-comparative.md` template
7. When writing artifact: include model-tagged filename, artifact frontmatter contract

Sub-agent invocation contract (when dispatched from /deep-research or /analyze):

- Uses comparative schema format
- Returns inline to orchestrator (no file write, no model-tagged filename)
- Step logging adapts (sub-agent context vs standalone)

**Step 2: Verify**

Run: Verify SKILL.md exists, frontmatter is valid, and includes domain→dimension mapping table, `--save` flag handling, `--context` flag handling, model-tagged filename convention, and sub-agent invocation contract

**Step 3: Commit**

```bash
git add .agents/skills/compare/SKILL.md
git commit -m "feat(p02-t02): add compare skill for domain-aware comparative analysis"
```

---

## Phase 3: Orchestrator Skills (/deep-research + /analyze)

Both dispatch parallel workers and conditionally invoke /compare. These depend on the /compare pattern and shared schemas from Phase 1.

### Task p03-t01: Create /deep-research SKILL.md

**Files:**

- Create: `.agents/skills/deep-research/SKILL.md`

**Step 1: Write skill file**

Follow `create-agnostic-skill` conventions. Must include:

Frontmatter:

- `name: deep-research`
- `version: 0.1.0`
- `description`: comprehensive research orchestrator producing structured artifacts
- `argument-hint`: topic + optional flags
- `user-invocable: true`
- `allowed-tools`: Read, Glob, Grep, Bash, WebSearch, WebFetch, AskUserQuestion, Agent, mcp\_\_\*

Workflow:

1. Parse topic from `$ARGUMENTS`; detect `--depth`, `--focus`, `--context`, output path flags
2. If `--context` provided, read context file/directory → extract constraints, focus areas, prior art
3. Topic classification (informed by context) → extended schema selection (technical, comparative, conceptual, architectural)
4. Research angle planning (context shapes priorities)
5. Sub-agent availability probe → select Execution Tier
6. [Execution Tier 1] Parallel worker dispatch — general-purpose sub-agents with structured prompts per angle, each receiving context summary. Provider split block for dispatch mechanism.
7. [Execution Tier 2] Sequential self-execution per angle
8. [Conditional] If competing options emerge → dispatch /compare as sub-agent (returns inline, embedded as supplementary section)
9. Aggregate findings from all angles
10. Resolve output target (Obsidian → path → default)
11. Write structured artifact using base + extended schema, with artifact frontmatter contract and model-tagged filename
12. Step logging throughout (phase banner, `[N/M]` steps)

Key contracts to include:

- Research-angle worker prompt template (what each worker receives)
- /compare conditional invocation (inline return, no intermediate file)
- Output target resolution priority
- `--depth` flag behavior (surface/standard/exhaustive)
- `--focus` flag behavior (narrows to specific angle)
- Schema reference paths

**Step 2: Verify**

Run: Verify SKILL.md exists, references schema files in `references/`, includes all 4 extended schema types, has Execution Tier 1/2/3 dispatch logic with provider split, --context threading, model-tagged filename, and artifact frontmatter contract

**Step 3: Commit**

```bash
git add .agents/skills/deep-research/SKILL.md
git commit -m "feat(p03-t01): add deep-research orchestrator skill"
```

---

### Task p03-t02: Create /analyze SKILL.md

**Files:**

- Create: `.agents/skills/analyze/SKILL.md`

**Step 1: Write skill file**

Follow `create-agnostic-skill` conventions. Must include:

Frontmatter:

- `name: analyze`
- `version: 0.1.0`
- `description`: multi-angle analysis of existing artifacts, codebases, documents, or systems
- `argument-hint`: target to analyze + optional --context
- `user-invocable: true`
- `allowed-tools`: Read, Glob, Grep, Bash, WebSearch, WebFetch, AskUserQuestion, Agent, mcp\_\_\*

Workflow:

1. Parse target from `$ARGUMENTS`; detect `--context` flag
2. If `--context` provided, read context file/directory → extract evaluation criteria
3. Input type classification (code, document, architecture, idea, mixed)
4. Analysis angle selection — all 6 always run, emphasis weighted by input type:
   - Adversarial/Critical, Gap Analysis, Opportunity Analysis, Structural/Organizational, Consistency/Coherence, Audience/Clarity
5. Sub-agent availability probe → select Execution Tier
6. [Execution Tier 1] Parallel worker dispatch — one general-purpose sub-agent per analysis angle, each receiving target content, angle description, context criteria, output format instructions. Provider split block.
7. [Execution Tier 2] Sequential self-execution per angle
8. [Conditional] If angle surfaces comparables → dispatch /compare as sub-agent
9. Cross-angle synthesis → prioritized recommendations
10. Write structured artifact using base + analysis extended schema, with artifact frontmatter contract and model-tagged filename
11. Step logging throughout

Key contracts to include:

- Input type → angle emphasis mapping table
- Analysis-angle worker prompt template
- /compare conditional invocation (same contract as /deep-research)
- `--context` separates "what to analyze" from "what to analyze it against"
- Schema reference: `schema-analysis.md`

**Step 2: Verify**

Run: Verify SKILL.md exists, includes all 6 analysis angles, input type→emphasis table, Execution Tier dispatch with provider split, --context handling, model-tagged filename, and artifact frontmatter contract

**Step 3: Commit**

```bash
git add .agents/skills/analyze/SKILL.md
git commit -m "feat(p03-t02): add analyze skill for multi-angle analysis"
```

---

## Phase 4: Synthesis + Integration

/synthesize consumes artifacts from all above. Then sync and verify.

### Task p04-t01: Create /synthesize SKILL.md

**Files:**

- Create: `.agents/skills/synthesize/SKILL.md`

**Step 1: Write skill file**

Follow `create-agnostic-skill` conventions. Must include:

Frontmatter:

- `name: synthesize`
- `version: 0.1.0`
- `description`: merge multiple analysis artifacts into a single coherent report with provenance tracking
- `argument-hint`: directory or file paths + optional --inline
- `user-invocable: true`
- `allowed-tools`: Read, Glob, Grep, Bash, AskUserQuestion

Note: no Agent, WebSearch, WebFetch — synthesis reads existing artifacts, doesn't research or dispatch.

Workflow:

1. Parse `$ARGUMENTS` — directory path (primary) or explicit file paths; detect `--inline` flag
2. [Directory mode] Scan directory for `.md` files → read frontmatter → filter by `oat_skill` key (artifact frontmatter contract). Report discovered artifacts.
3. [Explicit mode] Read specified file paths directly
4. Classify input types → determine output schema (superset of inputs; homogeneous = input schema + synthesis fields; mixed = generic synthesis wrapper)
5. For each source artifact:
   - Extract findings, conclusions, recommendations
   - Track provenance (file, `oat_model`, `oat_generated_at`)
6. Reconcile across sources:
   - Identify agreements (high confidence — multiple sources converge)
   - Surface contradictions (flag + lean, not decided fact)
   - Deduplicate without losing unique insights
7. Produce output:
   - [Artifact, default] Write synthesis document with superset schema sections: Source Agreement, Contradictions, Provenance Table, Unique Insights, Synthesis Methodology
   - [Inline, --inline flag] Condensed summary

Key contracts to include:

- Artifact frontmatter contract keys used for auto-detection (`oat_skill`, `oat_schema`, `oat_topic`, `oat_model`, `oat_generated_at`)
- Superset output schema table (input schema fields + synthesis additions)
- Conflict resolution protocol (flag → lean → mark as lean not fact)
- No sub-agent dispatch (no execution tiers)
- Does not modify input artifacts

**Step 2: Verify**

Run: Verify SKILL.md exists, includes auto-detection logic referencing artifact frontmatter contract, superset schema table, conflict resolution protocol, provenance tracking, and --inline flag handling

**Step 3: Commit**

```bash
git add .agents/skills/synthesize/SKILL.md
git commit -m "feat(p04-t01): add synthesize skill for multi-source artifact merging"
```

---

### Task p04-t02: Sync provider views and verify cross-provider loading

**Files:**

- Modified by sync: `.claude/skills/`, `.cursor/skills/`, `.codex/agents/` (provider views)
- Modified by sync: `.claude/agents/` (agent provider view)

**Step 1: Run OAT sync**

```bash
oat sync --scope all
```

This propagates all 5 skills and the skeptical-evaluator agent to provider-specific views.

**Step 2: Verify skill registration**

Run: `ls .agents/skills/skeptic/SKILL.md .agents/skills/compare/SKILL.md .agents/skills/deep-research/SKILL.md .agents/skills/analyze/SKILL.md .agents/skills/synthesize/SKILL.md`
Expected: All 5 SKILL.md files exist

Run: `ls .agents/agents/skeptical-evaluator.md`
Expected: Agent definition exists

Run: `ls .agents/skills/deep-research/references/schema-*.md | wc -l`
Expected: 6 schema files

Run: Verify provider views were created by `oat sync`

**Step 3: Commit**

```bash
git add .claude/ .cursor/ .codex/ .agents/
git commit -m "feat(p04-t02): sync provider views for all research and verification skills"
```

---

## Phase 5: Review Fixes (final)

Fix tasks generated from final code review.

### Task p05-t01: (review) Remove /skeptic from /synthesize artifact source references

**Files:**

- Modify: `.agents/skills/synthesize/SKILL.md`

**Step 1: Understand the issue**

Review finding: /skeptic is inline-only and never writes artifacts. /synthesize incorrectly lists it as a supported artifact source in the description (line 4), body text (line 12), and "When to Use" section (lines 17-18).

**Step 2: Implement fix**

- Line 4 (frontmatter description): Change to reference only `/deep-research`, `/analyze`, and `/compare`
- Line 12 (body description): Same — remove `/skeptic` reference
- Lines 17-18 ("When to Use"): Remove `/skeptic` from the list of combinable skills

**Step 3: Verify**

Run: `grep -n 'skeptic' .agents/skills/synthesize/SKILL.md`
Expected: No remaining references to /skeptic as an artifact source

**Step 4: Commit**

```bash
git add .agents/skills/synthesize/SKILL.md
git commit -m "fix(p05-t01): remove /skeptic from /synthesize artifact source references"
```

---

### Task p05-t02: (review) Fix /synthesize explicit-file mode frontmatter requirement

**Files:**

- Modify: `.agents/skills/synthesize/SKILL.md`

**Step 1: Understand the issue**

Review finding: Step 2 (line 127) says "warn (but continue) if a file lacks oat_skill frontmatter — treat it as unstructured input." But Steps 3-6 require `oat_schema`, `oat_skill`, `oat_model`, `oat_generated_at` for classification, provenance, and output. The unstructured input path is never actually supported.

**Step 2: Implement fix**

Change line 127 from "Warn (but continue) if a file lacks `oat_skill` frontmatter -- treat it as unstructured input." to: "Warn and **skip** files that lack `oat_skill` frontmatter — artifact frontmatter is required for both discovery modes."

**Step 3: Verify**

Run: `grep -n 'unstructured' .agents/skills/synthesize/SKILL.md`
Expected: No remaining references to "unstructured input"

**Step 4: Commit**

```bash
git add .agents/skills/synthesize/SKILL.md
git commit -m "fix(p05-t02): require frontmatter in /synthesize explicit-file mode"
```

---

### Task p05-t03: (review) Remove promised output path from /compare --save

**Files:**

- Modify: `.agents/skills/compare/SKILL.md`

**Step 1: Understand the issue**

Review finding: Line 185 says "Output target: specified path or current directory" but no `--output` argument exists. The "specified path" promise is unimplemented.

**Step 2: Implement fix**

Change line 185 from "Output target: specified path or current directory" to "Output target: current directory"

**Step 3: Verify**

Run: `grep -n 'specified path' .agents/skills/compare/SKILL.md`
Expected: No remaining references to "specified path"

**Step 4: Commit**

```bash
git add .agents/skills/compare/SKILL.md
git commit -m "fix(p05-t03): remove unimplemented output path from /compare --save"
```

---

## Phase 6: Review Fixes (final re-review)

Fix tasks generated from final re-review (cycle 2).

### Task p06-t01: (review) Enforce full artifact metadata contract in /synthesize explicit-file mode

**Files:**

- Modify: `.agents/skills/synthesize/SKILL.md`

**Step 1: Understand the issue**

Review finding: Line 127 only checks for `skill` key presence, but Steps 3-4 require all 5 keys (`skill`, `schema`, `topic`, `model`, `generated_at`). A partially populated artifact can pass discovery and then fail downstream.

**Step 2: Implement fix**

Update line 127 to require all 5 artifact frontmatter contract keys, not just `skill`. Change the skip logic to: "Warn and **skip** files that lack any of the required artifact frontmatter keys (`skill`, `schema`, `topic`, `model`, `generated_at`) — all five are required for both discovery modes."

**Step 3: Verify**

Run: `grep -A2 'skip.*frontmatter' .agents/skills/synthesize/SKILL.md`
Expected: References all 5 required keys

**Step 4: Commit**

```bash
git add .agents/skills/synthesize/SKILL.md
git commit -m "fix(p06-t01): enforce full artifact metadata contract in /synthesize explicit-file mode"
```

---

### Task p06-t02: (review) Fix /synthesize intro to not overstate skill coverage

**Files:**

- Modify: `.agents/skills/synthesize/SKILL.md`

**Step 1: Understand the issue**

Review finding: Line 12 says "consuming outputs from all other skills" which implicitly includes /skeptic even though /skeptic is inline-only.

**Step 2: Implement fix**

Change "consuming outputs from all other skills" to "consuming outputs from these artifact-producing skills" on line 12.

**Step 3: Verify**

Run: `grep -n 'all other skills' .agents/skills/synthesize/SKILL.md`
Expected: No matches

**Step 4: Commit**

```bash
git add .agents/skills/synthesize/SKILL.md
git commit -m "fix(p06-t02): fix /synthesize intro to not overstate skill coverage"
```

---

## Phase 8: Research Tool Pack

Register the five research skills and the skeptical-evaluator agent as a new installable `research` tool pack, following the same patterns as the existing `ideas`, `workflows`, and `utility` packs.

### Task p08-t01: Register research pack in skill manifest and types

**Files:**

- Modify: `packages/cli/src/commands/init/tools/shared/skill-manifest.ts`
- Modify: `packages/cli/src/commands/tools/shared/types.ts`

**Step 1: Add research skills and agent to skill manifest**

Add after the utility pack section:

```typescript
// ── Research pack ─────────────────────────────────────────────────
export const RESEARCH_SKILLS = [
  'analyze',
  'compare',
  'deep-research',
  'skeptic',
  'synthesize',
] as const;

export const RESEARCH_AGENTS = ['skeptical-evaluator.md'] as const;
```

**Step 2: Update PackName type**

In `types.ts`, add `'research'` to the `PackName` union:

```typescript
export type PackName = 'ideas' | 'workflows' | 'utility' | 'research';
```

**Step 3: Verify**

Run: `pnpm --filter @oat/cli type-check`
Expected: No type errors

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/shared/skill-manifest.ts packages/cli/src/commands/tools/shared/types.ts
git commit -m "feat(p08-t01): register research pack in skill manifest and types"
```

---

### Task p08-t02: Create research pack install module

**Files:**

- Create: `packages/cli/src/commands/init/tools/research/install-research.ts`
- Create: `packages/cli/src/commands/init/tools/research/index.ts`

**Step 1: Create install-research.ts**

Follow the utility pack pattern (`install-utility.ts`). Re-export `RESEARCH_SKILLS` and `RESEARCH_AGENTS` from skill-manifest. Include `InstallResearchOptions`, `InstallResearchResult`, and `installResearch` function. The installer copies both skills and agents (unlike utility which only copies skills).

**Step 2: Create index.ts (command module)**

Follow the utility pack pattern (`utility/index.ts`). Create `createInitToolsResearchCommand()` returning a Commander command named `'research'`. Research is user-eligible (both project and user scope). Include interactive skill selection, force overwrite option, and scope resolution.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli type-check`
Expected: No type errors

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/research/
git commit -m "feat(p08-t02): add research pack install module"
```

---

### Task p08-t03: Wire research pack into init tools, scan-tools, and remove-skills

**Files:**

- Modify: `packages/cli/src/commands/init/tools/index.ts`
- Modify: `packages/cli/src/commands/tools/shared/scan-tools.ts`
- Modify: `packages/cli/src/commands/remove/skills/remove-skills.ts`

**Step 1: Update init/tools/index.ts**

- Import `createInitToolsResearchCommand`, `installResearch`, types from `./research`
- Add `'research'` to local `ToolPack` type
- Add to `PACK_CHOICES`: `{ label: 'Research [project|user]', value: 'research', checked: true }`
- Add to `PACK_DESCRIPTIONS`: `research: 'Research, analysis, verification, and synthesis'`
- Update `isUserEligibleSelection` to include `'research'`
- Add installation block for `selectedPacks.includes('research')` (same pattern as ideas/utility — user-eligible scope)
- Update non-interactive default: add `'research'` to the fallback array
- Add to `DEFAULT_DEPENDENCIES`: `installResearch`
- Add to `InitToolsDependencies` interface: `installResearch` function type
- Register subcommand: `.addCommand(createInitToolsResearchCommand())`
- Update command description string to include `research`
- Update `buildToolPacksSectionBody` to mention research in user-scoped skills line

**Step 2: Update scan-tools.ts**

- Import `RESEARCH_SKILLS` and `RESEARCH_AGENTS` from research install module
- Add to `resolveSkillPack`: `if ((RESEARCH_SKILLS as readonly string[]).includes(name)) return 'research';`
- Add to `resolveAgentPack`: `if ((RESEARCH_AGENTS as readonly string[]).includes(filename)) return 'research';`

**Step 3: Update remove-skills.ts**

- Import `RESEARCH_SKILLS` from research install module
- Add `'research'` to local `PackName` type
- Add `research: RESEARCH_SKILLS` to `PACK_SKILLS`
- Add `'research'` to `isPackName` check
- Update error message to include `research`

**Step 4: Verify**

Run: `pnpm --filter @oat/cli type-check`
Expected: No type errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/init/tools/index.ts packages/cli/src/commands/tools/shared/scan-tools.ts packages/cli/src/commands/remove/skills/remove-skills.ts
git commit -m "feat(p08-t03): wire research pack into init tools, scan-tools, and remove-skills"
```

---

### Task p08-t04: Update bundle script and tests

**Files:**

- Modify: `packages/cli/scripts/bundle-assets.sh`
- Modify: `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts`
- Create: `packages/cli/src/commands/init/tools/research/install-research.test.ts`
- Create: `packages/cli/src/commands/init/tools/research/index.test.ts`
- Modify: `packages/cli/src/commands/tools/shared/scan-tools.test.ts`
- Modify: `packages/cli/src/commands/remove/skills/remove-skills.test.ts`
- Modify: `packages/cli/src/commands/init/tools/index.test.ts`

**Step 1: Add research skills and agent to bundle-assets.sh**

Add to the `SKILLS` array: `analyze`, `compare`, `deep-research`, `skeptic`, `synthesize`

Add to the agents loop: `skeptical-evaluator.md`

**Step 2: Add bundle-consistency test for research pack**

Follow the pattern of the existing workflow/ideas/utility tests. Add a test case that validates `RESEARCH_SKILLS` entries are present in the bash `SKILLS` array, and `RESEARCH_AGENTS` entries are in the agents loop.

**Step 3: Create research pack tests**

- `install-research.test.ts`: Test `installResearch` copies skills and agents correctly
- `index.test.ts`: Test `createInitToolsResearchCommand` registers correctly

Follow the patterns in `install-utility.test.ts` and `utility/index.test.ts`.

**Step 4: Update existing tests**

- `scan-tools.test.ts`: Add test for research skill/agent pack resolution
- `remove-skills.test.ts`: Add test for `research` pack name validation
- `init/tools/index.test.ts`: Update pack selection tests, subcommand registration tests, pack description tests to include `research`

**Step 5: Verify**

Run: `pnpm --filter @oat/cli test`
Expected: All tests pass

Run: `pnpm --filter @oat/cli type-check`
Expected: No type errors

**Step 6: Commit**

```bash
git add packages/cli/scripts/bundle-assets.sh packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts packages/cli/src/commands/init/tools/research/ packages/cli/src/commands/tools/shared/scan-tools.test.ts packages/cli/src/commands/remove/skills/remove-skills.test.ts packages/cli/src/commands/init/tools/index.test.ts
git commit -m "feat(p08-t04): update bundle script and tests for research pack"
```

---

### Task p08-t05: Update documentation

**Files:**

- Modify: `apps/oat-docs/docs/guide/tool-packs.md`
- Modify: `apps/oat-docs/docs/guide/cli-reference.md`

**Step 1: Update tool-packs.md**

Add `research` pack to the pack list with description, scope info, and included skills.

**Step 2: Update cli-reference.md**

Add `research` to `oat tools install` subcommands and pack references.

**Step 3: Verify**

Run: `pnpm build:docs`
Expected: Docs build succeeds

**Step 4: Commit**

```bash
git add apps/oat-docs/docs/guide/tool-packs.md apps/oat-docs/docs/guide/cli-reference.md
git commit -m "docs(p08-t05): add research pack to tool packs and CLI reference docs"
```

---

### Task p08-t06: Standardize output destination across artifact-producing skills

**Files:**

- Modify: `.agents/skills/deep-research/SKILL.md`
- Modify: `.agents/skills/analyze/SKILL.md`
- Modify: `.agents/skills/compare/SKILL.md`
- Modify: `.agents/skills/synthesize/SKILL.md`
- Modify: `.oat/repo/README.md`

**Step 1: Define shared output destination resolution**

All artifact-producing skills should follow the same output destination pattern:

1. **If an explicit path was provided** in `$ARGUMENTS`, use it — no prompt.
2. **Otherwise, ask the user** via `AskUserQuestion` (or provider equivalent) with a skill-specific default suggestion:
   - The prompt should be: _"Where would you like to write the artifact? (default: {suggested path})"_
   - If the user confirms the default (empty response or "yes"), use the suggested path.
   - If the user provides a path, use that instead.

**Skill-specific defaults** (resolution priority: repo OAT > user OAT > current directory):

| Skill             | Repo `.oat/` exists         | User `~/.oat/` exists (no repo) | No OAT                      |
| ----------------- | --------------------------- | ------------------------------- | --------------------------- |
| `/deep-research`  | `.oat/repo/research/`       | `~/.oat/research/`              | current directory           |
| `/analyze`        | `.oat/repo/analysis/`       | `~/.oat/analysis/`              | current directory           |
| `/compare --save` | `.oat/repo/analysis/`       | `~/.oat/analysis/`              | current directory           |
| `/synthesize`     | input artifacts directory\* | input artifacts directory\*     | input artifacts directory\* |

\* If all input artifacts came from the same directory, suggest that directory. Otherwise, fall back to OAT detection (repo `.oat/repo/analysis/` or user `~/.oat/analysis/`) or current directory.

Detection order:

1. Check for `.oat/` at repo root (project-level OAT)
2. Check for `~/.oat/` (user-level OAT)
3. Fall back to current directory

**Step 2: Update /deep-research**

- Remove the Obsidian vault auto-detection from Step 9 (output target resolution). Delete the Obsidian priority entirely.
- Replace the 3-priority resolution (Obsidian > explicit path > current directory) with the shared pattern above, using `.oat/repo/research/` as OAT default.
- Remove any Obsidian references from the Troubleshooting section if present.
- Update the Success Criteria to reflect the new prompt-based resolution.

**Step 3: Update /analyze**

- Add a new step between cross-angle synthesis and the write step: "Resolve output destination"
- Follow the shared pattern above, using `.oat/repo/analysis/` as OAT default. Renumber subsequent steps.
- Update the Arguments section to document the optional trailing output-path argument.

**Step 4: Update /compare**

- Update the `--save` artifact output section to include output destination resolution.
- Follow the shared pattern above, using `.oat/repo/analysis/` as OAT default.
- Only applies when `--save` is specified (inline output doesn't write files).

**Step 5: Update /synthesize**

- Update Step 6 (Produce output) to include output destination resolution before writing.
- For `/synthesize`, the default has an additional heuristic: if all input artifacts came from the same directory, suggest that directory. Otherwise, fall back to OAT detection (`.oat/repo/analysis/`) or current directory.
- The prompt should be: _"Where would you like to write the synthesis? (default: {suggested path})"_

**Step 6: Update .oat/repo/README.md**

- Add `research/` directory to the Structure section with description: "Generated research artifacts produced by `/deep-research`."
- Update `analysis/` description to include `/analyze` and `/compare` artifact types alongside the existing `oat-agent-instructions-analyze` type.

**Step 7: Verify**

Run: `grep -n 'AskUserQuestion\|output.*destination\|\.oat/repo/research\|\.oat/repo/analysis' .agents/skills/deep-research/SKILL.md .agents/skills/analyze/SKILL.md .agents/skills/compare/SKILL.md .agents/skills/synthesize/SKILL.md`
Expected: All four skills reference AskUserQuestion and their respective OAT-aware destination

Run: `grep -n 'Obsidian\|obsidian' .agents/skills/deep-research/SKILL.md`
Expected: No matches

**Step 8: Commit**

```bash
git add .agents/skills/deep-research/SKILL.md .agents/skills/analyze/SKILL.md .agents/skills/compare/SKILL.md .agents/skills/synthesize/SKILL.md .oat/repo/README.md
git commit -m "feat(p08-t06): standardize output destination with user prompt and OAT-aware defaults"
```

---

### Task p08-t07: Per-pack scope selection in interactive install flow

**Files:**

- Modify: `packages/cli/src/commands/init/tools/index.ts`
- Modify: `packages/cli/src/commands/init/tools/index.test.ts`

**Step 1: Update interactive install flow**

Currently, when multiple user-eligible packs are selected, a single scope prompt applies to all of them. Change this so that during interactive `oat tools install` (bare command with multi-pack selection), users can choose per pack whether to install at user level or project level for packs that support both scopes.

Implementation approach:

- After pack selection, if user-eligible packs are present and scope is `all` (interactive), present per-pack scope choices instead of a single scope prompt
- For packs that are project-only (e.g., `workflows`), skip the prompt — always project scope
- For user-eligible packs (`ideas`, `utility`, `research`), ask individually or provide a grouped prompt
- Keep the existing single-scope behavior when `--scope project` or `--scope user` is explicitly passed

**Step 2: Update tests**

Update `index.test.ts` to cover:

- Per-pack scope selection in interactive mode
- Explicit `--scope` still overrides per-pack selection
- Non-interactive mode still defaults all to project

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test`
Expected: All tests pass

Run: `pnpm --filter @oat/cli type-check`
Expected: No type errors

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/index.ts packages/cli/src/commands/init/tools/index.test.ts
git commit -m "feat(p08-t07): per-pack scope selection in interactive install flow"
```

---

### Task p09-t01: (review) Update --pack help text to include research

**Files:**

- Modify: `packages/cli/src/commands/tools/remove/index.ts`
- Modify: `packages/cli/src/commands/tools/update/index.ts`
- Modify: `packages/cli/src/commands/help-snapshots.test.ts`

**Step 1: Understand the issue**

Review finding: `VALID_PACKS` accepts `research`, but the `--pack` option description strings in `tools remove` and `tools update` still advertise only `ideas|workflows|utility`.
Location: `packages/cli/src/commands/tools/remove/index.ts:65` and equivalent in `tools/update`

**Step 2: Update help descriptions**

In both `tools/remove/index.ts` and `tools/update/index.ts`, update the `--pack` option description to include `research` in the list (e.g., `ideas|workflows|utility|research`).

**Step 3: Update help snapshots**

Run: `npx vitest run -u help-snapshots`
Expected: Snapshots updated for the new description strings

**Step 4: Verify**

Run: `pnpm --filter @oat/cli test`
Expected: All tests pass

Run: `pnpm --filter @oat/cli type-check`
Expected: No type errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/tools/remove/index.ts packages/cli/src/commands/tools/update/index.ts packages/cli/src/commands/help-snapshots.test.ts
git commit -m "fix(p09-t01): update --pack help text to include research"
```

---

## Reviews

| Scope     | Type     | Status | Date       | Artifact                                                 |
| --------- | -------- | ------ | ---------- | -------------------------------------------------------- |
| p01       | code     | passed | 2026-03-14 | implementation.md (orchestration run 1)                  |
| p02       | code     | passed | 2026-03-14 | implementation.md (orchestration run 1)                  |
| p03       | code     | passed | 2026-03-14 | implementation.md (orchestration run 1)                  |
| p04       | code     | passed | 2026-03-14 | implementation.md (orchestration run 1)                  |
| final     | code     | passed | 2026-03-15 | reviews/archived/final-review-2026-03-15.md              |
| discovery | artifact | passed | 2026-03-14 | reviews/archived/artifact-discovery-review-2026-03-14.md |
| design    | artifact | passed | 2026-03-14 | reviews/archived/artifact-design-review-2026-03-14.md    |

---

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks — Foundation (shared schemas + sub-agent definition)
- Phase 2: 2 tasks — Independent skills (/skeptic update + /compare)
- Phase 3: 2 tasks — Orchestrator skills (/deep-research + /analyze)
- Phase 4: 2 tasks — Synthesis + integration (/synthesize + sync)
- Phase 5: 3 tasks — Review fixes (final)
- Phase 6: 2 tasks — Review fixes (final re-review)
- Phase 7: 1 task — Review fixes (final re-review cycle 3)
- Phase 8: 7 tasks — Research tool pack, output destination standardization, per-pack scope selection
- Phase 9: 1 task — Review fix (help text)

**Total: 22 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md`
- Discovery: `discovery.md`
- Brainstorming: `reference/brainstorming.md`
- Skeptic draft: `reference/skeptic-SKILL.md`
- Create-agnostic-skill conventions: `.agents/skills/create-agnostic-skill/SKILL.md`
- Review-provide execution tier pattern: `.agents/skills/oat-project-review-provide/SKILL.md`
