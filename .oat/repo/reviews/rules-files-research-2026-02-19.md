# Cross-Provider AI Coding Agent Rules & Instruction Files: Research Synthesis

**Date**: 2026-02-19
**Scope**: Cross-provider best practices, community insights, and quantitative data for AI coding agent instruction files
**Method**: Systematic web search and source analysis across official documentation, engineering blogs, and community content

---

## Table of Contents

1. [Provider-Specific File Formats & Locations](#1-provider-specific-file-formats--locations)
2. [Quantitative Data: Sizes, Limits, Token Budgets](#2-quantitative-data-sizes-limits-token-budgets)
3. [AGENTS.md as a Cross-Tool Standard](#3-agentsmd-as-a-cross-tool-standard)
4. [Context Engineering Principles](#4-context-engineering-principles)
5. [Skills vs Rules vs Commands Taxonomy](#5-skills-vs-rules-vs-commands-taxonomy)
6. [Best Practices: What Works Across Tools](#6-best-practices-what-works-across-tools)
7. [Anti-Patterns: What Breaks](#7-anti-patterns-what-breaks)
8. [Monorepo & Large Project Strategies](#8-monorepo--large-project-strategies)
9. [Enterprise & Team Management](#9-enterprise--team-management)
10. [Portability Strategies](#10-portability-strategies)
11. [Source Registry & Reliability Assessment](#11-source-registry--reliability-assessment)

---

## 1. Provider-Specific File Formats & Locations

### Claude Code

| Aspect          | Detail                                                   |
| --------------- | -------------------------------------------------------- |
| Primary file    | `CLAUDE.md` (project root)                               |
| Local overrides | `CLAUDE.local.md` (.gitignored)                          |
| Global          | `~/.claude/CLAUDE.md`                                    |
| Rules           | `.claude/rules/*.md` with glob-scoped activation         |
| Skills          | `.claude/skills/<name>/SKILL.md` (Agent Skills standard) |
| Commands        | `.claude/commands/<name>.md` (legacy, still works)       |
| Subagents       | `.claude/agents/<name>.md`                               |
| Loading         | Eager from root up to CWD; lazy for child directories    |
| Imports         | `@path/to/file` syntax within CLAUDE.md                  |

**Source**: [Claude Code Official Docs](https://code.claude.com/docs) (Official, High Reliability)

### Cursor

| Aspect       | Detail                                                |
| ------------ | ----------------------------------------------------- |
| Primary file | `.cursor/rules/*.mdc` (Modular Markdown)              |
| Legacy       | `.cursorrules` (deprecated, single file)              |
| Rule types   | Always, Auto Attached (glob), Agent Requested, Manual |
| Team rules   | Dashboard-configured, applied to all team members     |
| User rules   | Global via Cursor Settings                            |
| Format       | YAML frontmatter + pseudo-XML body                    |

**Source**: [Trigger.dev Cursor Rules Guide](https://trigger.dev/blog/cursor-rules), [Elementor Engineers](https://medium.com/elementor-engineers/cursor-rules-best-practices-for-developers-16a438a4935c) (Reputable Engineering Blogs)

### GitHub Copilot

| Aspect          | Detail                                                 |
| --------------- | ------------------------------------------------------ |
| Primary file    | `.github/copilot-instructions.md`                      |
| Type-specific   | `.github/instructions/*.instructions.md` (glob-scoped) |
| Organization    | Organization-level instructions via admin settings     |
| Agent Skills    | `.github/skills/<name>/` (Agent Skills standard)       |
| Format          | Plain Markdown, natural language                       |
| File references | `[name](relative/path)` or `#file:relative/path`       |

**Source**: [GitHub Docs](https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot) (Official, High Reliability)

### OpenAI Codex

| Aspect         | Detail                                                                      |
| -------------- | --------------------------------------------------------------------------- |
| Primary file   | `AGENTS.md` (project root)                                                  |
| Global         | `~/.codex/AGENTS.md`                                                        |
| Overrides      | `AGENTS.override.md` (takes precedence at any level)                        |
| Fallback names | Configurable via `project_doc_fallback_filenames` in `~/.codex/config.toml` |
| Discovery      | Root to CWD, concatenated; later files override earlier                     |
| Max size       | **32 KiB combined** (configurable via `project_doc_max_bytes`)              |

**Source**: [OpenAI Codex Docs](https://developers.openai.com/codex/guides/agents-md/) (Official, High Reliability)

### JetBrains Junie

| Aspect            | Detail                                                                        |
| ----------------- | ----------------------------------------------------------------------------- |
| Primary file      | `.junie/guidelines.md`                                                        |
| Format            | Plain Markdown                                                                |
| Community catalog | [junie-guidelines GitHub repo](https://github.com/JetBrains/junie-guidelines) |
| Auto-generation   | Can analyze existing codebase to generate initial guidelines                  |

**Source**: [JetBrains Blog](https://blog.jetbrains.com/idea/2025/05/coding-guidelines-for-your-ai-agents/) (Official, High Reliability)

---

## 2. Quantitative Data: Sizes, Limits, Token Budgets

### Hard Limits (Documented)

| Provider    | Limit                                                                  | Source                                    |
| ----------- | ---------------------------------------------------------------------- | ----------------------------------------- |
| Codex       | 32 KiB combined instruction files                                      | OpenAI Codex docs (Official)              |
| Copilot     | ~1,000 lines max per file; "no longer than 2 pages" recommended        | GitHub Community Discussion, VS Code docs |
| Claude Code | Skill descriptions budget: 2% of context window, fallback 16,000 chars | Claude Code docs (Official)               |
| Cursor      | Individual .mdc files ideally under 50 lines                           | Community consensus                       |

### Practical Sizing Guidance

| Metric                    | Recommendation                                              | Source                                                                                           |
| ------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| CLAUDE.md length          | Under 500 lines, ideally under 300 lines                    | HumanLayer blog, Claude Code best practices                                                      |
| CLAUDE.md in practice     | 13KB professional monorepo (potential to grow to 25KB)      | [Shrivu Shankar blog](https://blog.sshh.io/p/how-i-use-every-claude-code-feature) (Practitioner) |
| HumanLayer root file      | Under 60 lines                                              | [HumanLayer](https://www.humanlayer.dev/blog/writing-a-good-claude-md)                           |
| Instruction count         | ~100 max for CLAUDE.md (system prompt already contains ~50) | HumanLayer blog                                                                                  |
| LLM instruction following | 150-200 instructions with reasonable consistency            | [Builder.io](https://www.builder.io/c/docs/ai-instruction-best-practices)                        |
| Fresh monorepo session    | ~20k tokens (10% of 200k budget)                            | Shrivu Shankar blog                                                                              |
| SKILL.md files            | Under 500 lines, move reference to supporting files         | Claude Code docs (Official)                                                                      |

### Token Budget Economics

- Every token in instruction files loads on every request (for always-on rules)
- Claude Code 200k context window: ~20k for monorepo session startup, leaving ~180k for work
- Performance degrades as context fills; this is the "most important resource to manage"
- Cursor: "fewer tokens for context means more capacity for generating quality responses"

**Key insight**: The "token tax" is real. Always-on rules consume budget on every interaction. Progressive disclosure (skills, auto-attached rules) is the primary mitigation.

---

## 3. AGENTS.md as a Cross-Tool Standard

### Specification Overview

AGENTS.md is "a README for agents" -- a dedicated, predictable place for context and instructions for AI coding agents. Stewarded by the **Agentic AI Foundation under the Linux Foundation**.

**Emerged from**: Collaborative efforts across OpenAI Codex, Amp, Google Jules, Cursor, and Factory.

### Adoption

- 60,000+ open-source projects use the format
- 20+ compatible platforms listed on agents.md
- Supported by: Codex, Cursor, Aider, Gemini CLI, Jules, Zed, Warp, Devin, Factory, goose, opencode, and others

### Format

- Plain Markdown, no required fields
- Common sections: Project overview, Build/test commands, Code style, Testing, Security, Commit/PR guidelines
- Headings provide semantic hints to agents
- Proximity rule: closest AGENTS.md to edited file wins; explicit user prompts override everything

### Cross-Tool Compatibility Assessment

**What AGENTS.md solves**: Reduces fragmentation by providing one file that works across many agent platforms, analogous to how EditorConfig standardized editor settings.

**What AGENTS.md does NOT solve**: Tool-specific features (skills, hooks, subagents, rule types) still require provider-specific files. AGENTS.md is a lowest-common-denominator approach for basic instructions and conventions.

**Source**: [agents.md](https://agents.md/) (Official Specification), [OpenAI Codex Docs](https://developers.openai.com/codex/guides/agents-md/) (Official)

---

## 4. Context Engineering Principles

### Core Framework (Anthropic Engineering)

Context engineering is "curating and maintaining the optimal set of tokens during LLM inference" -- encompassing system instructions, tools, external data, and message history.

**Key principles from Anthropic**:

1. **Finite resource with diminishing returns**: Attention budget constraints in transformer architecture mean more context does not equal better results.

2. **Altitude principle (Goldilocks zone)**: Avoid both overly brittle hardcoded logic and vague guidance that assumes shared context. Strive for specificity balanced with flexibility.

3. **Structural format**: Organize prompts into distinct sections using XML tags or Markdown headers. This delineation aids clarity, though exact formatting becomes less critical as models improve.

4. **Minimalist approach**: Pursue "the minimal set of information that fully outlines your expected behavior." Start minimal, then iteratively add instructions based on observed failure modes.

5. **Example curation**: Few-shot prompting with diverse, canonical examples rather than exhaustive edge case lists. "Examples are the pictures worth a thousand words."

6. **Tool design**: Maintain minimal viable toolset with clear, non-overlapping functionality. If engineers cannot definitively choose between tools, agents cannot either.

**Source**: [Anthropic Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) (Official, Highest Reliability)

### Long-Horizon Techniques

- **Compaction**: Summarize conversation history when nearing limits; preserve architectural decisions
- **Structured note-taking**: Persistent memory external to context windows
- **Sub-agent architecture**: Delegate focused tasks, consolidate results into brief summaries

### Martin Fowler / ThoughtWorks Framework

Context loading strategies fall into three decision patterns:

1. **LLM-controlled**: Agent decides when context is needed (enables unsupervised operation, introduces uncertainty)
2. **Human-triggered**: Explicit activation via commands (control at cost of automation)
3. **Deterministic**: Tool-driven events (predictable execution at specific lifecycle moments)

**Critical caution**: "Context engineering can increase effectiveness, but cannot ensure specific results" when LLMs are involved.

**Source**: [Martin Fowler](https://martinfowler.com/articles/exploring-gen-ai/context-engineering-coding-agents.html) (Highly Reputable Engineering Source)

---

## 5. Skills vs Rules vs Commands Taxonomy

### Builder.io Framework

| Aspect       | Rules                                       | Commands             | Skills                     |
| ------------ | ------------------------------------------- | -------------------- | -------------------------- |
| Triggering   | Always active                               | User-initiated       | Agent-determined           |
| Purpose      | Repository requirements, safety constraints | Repeatable workflows | Task-specific playbooks    |
| Context cost | Perpetual (loaded every request)            | Only when invoked    | Only when relevant         |
| Best use     | Naming conventions, testing requirements    | Workflow shortcuts   | Domain-specific procedures |

**Key insight**: "Larger context is not smarter context." Skills solve the attention-budget problem by surfacing relevant information only when needed.

**Litmus test for rules**: "Would this apply even when unstated?" If yes, make it a rule. If not, consider a skill.

### Claude Code Implementation

- **CLAUDE.md**: Always-loaded project conventions (rules)
- **Rules** (`.claude/rules/`): Path-scoped guidance with glob matching
- **Skills** (`.claude/skills/`): LLM or human-triggered, with progressive disclosure (descriptions loaded, full content only when invoked)
- **Hooks**: Deterministic scripts at lifecycle events (NOT advisory -- guaranteed execution)
- **Subagents**: Separate context windows for isolated tasks

**Source**: [Builder.io](https://www.builder.io/blog/agent-skills-rules-commands) (Reputable Engineering Blog)

---

## 6. Best Practices: What Works Across Tools

### Content Strategy (Cross-Provider Consensus)

**Include**:

- Build, test, lint commands that cannot be guessed
- Code style rules that differ from language defaults
- Repository etiquette (branch naming, PR conventions)
- Architectural decisions specific to the project
- Developer environment quirks (required env vars)
- Common gotchas or non-obvious behaviors
- The "WHY" behind conventions (improves edge case handling)
- File-scoped commands for faster feedback loops
- Three-tier boundaries: Always / Ask First / Never

**Exclude**:

- Anything the agent can figure out by reading code
- Standard language conventions the agent already knows
- Detailed API documentation (link instead)
- Information that changes frequently
- Long explanations or tutorials
- File-by-file descriptions of the codebase
- Self-evident practices like "write clean code"
- Code style that a linter enforces ("never send an LLM to do a linter's job")
- One-off task-specific instructions (pollute long-term context)

### Writing Style (Cross-Provider Consensus)

- Use concrete, specific language; avoid vague instructions
- Provide real-world examples from the actual codebase
- Reference actual files rather than abstract patterns
- Use markdown headings for clear section organization
- Include the reasoning ("why") behind rules
- Keep instructions short and self-contained
- Use emphasis ("IMPORTANT", "YOU MUST") sparingly for critical rules
- Provide alternatives ("use Y instead") rather than only prohibitions ("never use X")

### Iterative Development (Cross-Provider Consensus)

- Start small; document based on what the agent gets wrong, not as comprehensive manuals
- "Each addition should solve a real problem you have encountered, not theoretical concerns"
- Test rules with various prompts, including edge cases and intentionally problematic requests
- Treat instruction files like code: review when things go wrong, prune regularly
- Version control instruction files; the files compound in value over time
- "If Claude keeps doing something you don't want despite having a rule against it, the file is probably too long"

### Source Attribution

These practices are converged across: [Claude Code Best Practices](https://code.claude.com/docs/en/best-practices), [Anthropic Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents), [Addy Osmani](https://addyosmani.com/blog/good-spec/), [Builder.io](https://www.builder.io/blog/agents-md), [HumanLayer](https://www.humanlayer.dev/blog/writing-a-good-claude-md), [Trigger.dev](https://trigger.dev/blog/cursor-rules)

---

## 7. Anti-Patterns: What Breaks

### Content Anti-Patterns

1. **The kitchen sink session**: Starting with one task, asking something unrelated, going back. Context fills with irrelevant information. Fix: Clear between unrelated tasks.

2. **Over-specified instruction files**: Too long; agent ignores half because important rules get lost in noise. Fix: Ruthlessly prune. If the agent already does something correctly without the instruction, delete it.

3. **Auto-generating instruction files**: These are high-leverage documents requiring careful manual crafting.

4. **Treating as a catch-all**: Users append "hotfixes" for unrelated behavior issues, degrading the file over time.

5. **Vague instructions**: A GitHub study of 2,500+ agent files revealed "Most agent files fail because they're too vague." Examples: "Build me something cool," "Make it work better."

6. **Pseudo-code in instructions**: Loading instructions with pseudo-code or deterministic actions is an anti-pattern. Logical checks should be implemented as designed actions, not baked into agent decision-making.

7. **Dumping entire documentation**: Without summarization, this overwhelms the agent.

8. **Stale rules**: Rules that do not match current framework/API versions cause deprecated code generation.

9. **Excessive at-mentions**: Do not @-mention extensive docs; instead explain why/when to read them.

### Architectural Anti-Patterns

10. **Custom subagents that "gatekeep context"**: Adds indirection without clear benefit (Shrivu Shankar).

11. **Long lists of complex slash commands**: Limit to 2-3 personal shortcuts maximum (Shrivu Shankar).

12. **MCPs that mirror REST APIs**: Better to use CLI tools directly.

13. **Auto-compaction reliance**: Unreliable and poorly optimized (Shrivu Shankar).

14. **Skipping human review of critical code**: "If you cannot verify it, do not ship it."

### Source Attribution

[Claude Code Best Practices](https://code.claude.com/docs/en/best-practices), [Addy Osmani](https://addyosmani.com/blog/good-spec/), [Shrivu Shankar](https://blog.sshh.io/p/how-i-use-every-claude-code-feature), [Builder.io](https://www.builder.io/blog/agents-md)

---

## 8. Monorepo & Large Project Strategies

### Hierarchical File Placement

**Claude Code pattern**:

- Root `CLAUDE.md`: Repository-wide conventions, coding standards, common patterns
- Package-level `CLAUDE.md`: Framework-specific patterns, component architecture
- Loading: Eager from root up to CWD; lazy for child directories below CWD
- Conflict resolution: Deeper files take priority when instructions conflict

**Codex pattern**:

- Root `AGENTS.md`: Repository norms (linting, documentation)
- Nested `AGENTS.override.md`: Team-specific rules for specialized services
- Files concatenated root-down; later files override earlier
- Discovery stops at CWD

**Cursor pattern**:

- Multiple `.mdc` files in `.cursor/rules/` with glob scoping
- Auto Attached rules activate based on file pattern matching
- Splitting bloated `.cursorrules` into scoped `.mdc` files reduces token waste

### Context Optimization for Monorepos

- Lazy loading descendant CLAUDE.md files avoids loading potentially hundreds of kilobytes of irrelevant instructions at startup
- Put shared conventions in root; component-specific instructions stay isolated
- Frontend developers should not need backend-specific instructions cluttering their context
- File-scoped commands (`npm run tsc --noEmit path/to/file.tsx`) accelerate feedback loops vs. full builds
- A fresh monorepo session costs ~20k tokens, leaving ~180k for actual work

### Practical Guidance

- Document only tools used by 30%+ of engineers (Shrivu Shankar)
- Use skills/commands for domain-specific workflows rather than bloating root instructions
- Reference files rather than inlining content (`@path/to/import` in CLAUDE.md)

**Source**: [Claude Code Docs](https://code.claude.com/docs), [Shrivu Shankar](https://blog.sshh.io/p/how-i-use-every-claude-code-feature), [Codex Docs](https://developers.openai.com/codex/guides/agents-md/)

---

## 9. Enterprise & Team Management

### Team-Level Configuration

| Provider    | Team mechanism                                                               |
| ----------- | ---------------------------------------------------------------------------- |
| Claude Code | Enterprise managed settings; plugins for distributing skills/hooks/subagents |
| Cursor      | Team rules set in dashboard, available for all members                       |
| Copilot     | Organization-level instructions via admin settings                           |
| Codex       | Shared `AGENTS.md` in version control                                        |
| JetBrains   | Community-driven guidelines catalog via GitHub                               |

### Version Control as Foundation

All providers converge on: instruction files should be checked into version control as the team's shared source of truth. This enables:

- PR-based review of instruction changes
- History tracking of what worked vs. what did not
- Onboarding (new engineers get the accumulated knowledge)

### Spec-Driven Workflow (Addy Osmani)

- Specs become the shared source of truth -- "living, executable artifacts that evolve with the project"
- If the spec is incomplete or unclear, update it and re-sync the agent
- Include six essential areas: Commands, Testing, Project structure, Code style, Git workflow, Boundaries

### Safety Permissions

Explicitly distinguish what agents can execute autonomously vs. what requires approval:

- Allowed: file reading, single-file linting
- Restricted: package installations, git operations, full builds
- This is cross-provider advice, but implementation varies per tool

**Source**: [Addy Osmani](https://addyosmani.com/blog/good-spec/), [JetBrains Blog](https://blog.jetbrains.com/idea/2025/05/coding-guidelines-for-your-ai-agents/), [Builder.io](https://www.builder.io/blog/agents-md)

---

## 10. Portability Strategies

### Current State of Fragmentation

Each tool has its own file format:

- Claude Code: `CLAUDE.md` + `.claude/`
- Cursor: `.cursor/rules/*.mdc`
- Copilot: `.github/copilot-instructions.md` + `.github/instructions/`
- Codex: `AGENTS.md`
- Junie: `.junie/guidelines.md`

This creates maintenance burden: content drift between files, duplicated instructions, inconsistent behavior across tools.

### AGENTS.md as Interoperability Layer

- The primary convergence point: many tools now read AGENTS.md as a fallback
- 60,000+ repos using the format; 20+ tools supporting it
- Analogy: AGENTS.md is to coding agents as EditorConfig is to editors
- Limitation: lowest common denominator; cannot express tool-specific features

### Adapter / Sync Strategy

The approach of maintaining a canonical set of rules and syncing to provider-specific formats addresses the fragmentation:

- Keep canonical content in one place (e.g., AGENTS.md or a shared rules directory)
- Generate/sync provider-specific files from the canonical source
- Each tool gets its native format, but content stays DRY

### Practical Portability Observations

- Shared markdown content works for instructions/guidance (conventions, commands, architecture)
- Tool-specific features (glob scoping, YAML frontmatter, skill metadata) do not port
- Consider a layered approach: shared portable layer + tool-specific extensions
- The Agent Skills standard (agentskills.io) aims to standardize the skills layer across tools

### Three-Tier File Discovery (Cross-Provider Pattern)

All providers implement some version of:

1. **Global** (user-level): Applied to all projects
2. **Project root**: Shared team conventions
3. **Nested/scoped**: Directory or file-type specific overrides

This pattern is consistent enough to design a portable hierarchy around it.

**Source**: [agents.md](https://agents.md/), [Arun Iyer](https://aruniyer.github.io/blog/agents-md-instruction-files.html), [AGENTS.md on GitHub](https://github.com/agentsmd/agents.md)

---

## 11. Source Registry & Reliability Assessment

### Official Documentation (Highest Reliability)

| Source                        | URL                                                                                               | Key Contributions                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Claude Code Docs              | https://code.claude.com/docs                                                                      | CLAUDE.md format, skills, best practices, quantitative guidance   |
| Claude Code Best Practices    | https://code.claude.com/docs/en/best-practices                                                    | Token management, anti-patterns, CLAUDE.md include/exclude tables |
| Anthropic Context Engineering | https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents                 | Fundamental principles, altitude framework, minimalist approach   |
| OpenAI Codex AGENTS.md Guide  | https://developers.openai.com/codex/guides/agents-md/                                             | File hierarchy, 32KiB limit, override mechanism                   |
| GitHub Copilot Docs           | https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot | File format, referencing, organization instructions               |
| AGENTS.md Specification       | https://agents.md/                                                                                | Cross-tool standard, governance, adoption data                    |
| JetBrains Blog                | https://blog.jetbrains.com/idea/2025/05/coding-guidelines-for-your-ai-agents/                     | Junie format, community guidelines catalog                        |

### Reputable Engineering Blogs (High Reliability)

| Source                           | URL                                                                                            | Key Contributions                                             |
| -------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Martin Fowler / ThoughtWorks     | https://martinfowler.com/articles/exploring-gen-ai/context-engineering-coding-agents.html      | Context loading strategies taxonomy, probabilistic caution    |
| Addy Osmani                      | https://addyosmani.com/blog/good-spec/                                                         | PRD-like spec structure, boundary tiers, iterative approach   |
| Builder.io Skills/Rules/Commands | https://www.builder.io/blog/agent-skills-rules-commands                                        | Taxonomy of instruction types, progressive disclosure pattern |
| Builder.io AGENTS.md Guide       | https://www.builder.io/blog/agents-md                                                          | File-scoped commands, safety permissions, practical tips      |
| Trigger.dev Cursor Rules         | https://trigger.dev/blog/cursor-rules                                                          | .mdc format best practices, 10 essential tips                 |
| Elementor Engineers              | https://medium.com/elementor-engineers/cursor-rules-best-practices-for-developers-16a438a4935c | Rule organization, team setup patterns                        |

### Practitioner Experience Reports (Medium-High Reliability)

| Source                                   | URL                                                              | Key Contributions                                                       |
| ---------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Shrivu Shankar (sshh.io)                 | https://blog.sshh.io/p/how-i-use-every-claude-code-feature       | 13KB CLAUDE.md in practice, 20k token startup cost, avoid /compact      |
| HumanLayer                               | https://www.humanlayer.dev/blog/writing-a-good-claude-md         | 300-line / 60-line targets, 100 instruction max, progressive disclosure |
| Arun Iyer                                | https://aruniyer.github.io/blog/agents-md-instruction-files.html | Cross-tool file comparison table, hierarchy patterns                    |
| Builder.io AI Instruction Best Practices | https://www.builder.io/c/docs/ai-instruction-best-practices      | 150-200 instruction limit finding                                       |

### Community Content (Medium Reliability -- verify claims independently)

| Source                  | URL                                                                 | Key Contributions                               |
| ----------------------- | ------------------------------------------------------------------- | ----------------------------------------------- |
| 0xdevalias GitHub Gist  | https://gist.github.com/0xdevalias/f40bc5a6f84c4c5ad862e314894b2fa6 | Comprehensive cross-tool notes                  |
| Cursor Directory        | https://cursor.directory/rules/best-practices                       | Community rules catalog                         |
| Various Medium articles | Various                                                             | Practitioner experience, some unverified claims |

### Claims Requiring Verification

1. **"150-200 instructions"**: Builder.io claims LLMs can follow this range. Not corroborated by official provider documentation, but consistent with practitioner experience.

2. **"50 lines per .mdc file"**: Community consensus for Cursor, not an official limit.

3. **"1,000 lines max for copilot-instructions.md"**: From GitHub Community Discussion, not official docs. Actual limit may differ.

4. **"Most agent files fail because they're too vague"**: Attributed to a "GitHub study of 2,500+ agent files" by Addy Osmani. Original study not located for verification.

---

## Key Takeaways for the Open Agent Toolkit

### Design Implications

1. **Canonical content + adapter sync is validated**: The fragmentation problem is real and widely acknowledged. A sync-based approach aligns with community direction.

2. **AGENTS.md is the convergence point**: With Linux Foundation governance and 60k+ repos, it has the strongest cross-tool adoption momentum.

3. **Skills are the next frontier**: The Agent Skills standard (agentskills.io) is being adopted by Claude Code and Copilot. Building around this standard future-proofs the toolkit.

4. **Token budget is the binding constraint**: Everything flows from managing the context window effectively. Progressive disclosure (skills > rules > always-on) is the primary architecture.

5. **Three-tier hierarchy is universal**: Global > Project > Scoped is consistent across all providers. Build adapters around this shared mental model.

6. **Content strategy matters more than format**: The actual instructions -- what to include, what to exclude, how to phrase -- are more impactful than which file format is used.

7. **Sizing guidance converges**: Root instruction files should be 60-500 lines (300 is a good target). Skills/specific rules should be under 500 lines each. Total instruction budget under 32KB is a safe cross-provider ceiling.
