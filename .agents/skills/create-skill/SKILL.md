---
name: create-skill
version: 1.0.0
description: Use when adding a reusable workflow skill for AI coding agents. Scaffolds a new .agents/skills skill using the Agent Skills open standard.
argument-hint: "[skill-name]"
disable-model-invocation: true
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
user-invocable: true
---

# Create Skill

Create a new skill for AI coding agents using the [Agent Skills open standard](https://agentskills.io). Skills live in `.agents/skills/` (canonical source) and work across Claude Code, Cursor, Codex CLI, Gemini CLI, GitHub Copilot, and 20+ other compatible agents.

For deep-dive research on cross-provider compatibility, frontmatter behavior, and distribution patterns, see `.agents/docs/skills-guide.md`.

## When to Use

Use when:

- Creating a new reusable workflow or capability
- Automating a repeated task that would benefit from structured instructions
- Adding a new command that should work across Claude Code, Cursor, Codex, and other agents
- Extending AI assistant capabilities for the repository

**If you are creating a new `oat-*` skill:**
- Prefer `/create-oat-skill` (it references this baseline guidance and adds OAT-specific conventions like `{PROJECTS_ROOT}` resolution and separator progress banners).

## When NOT to Use

Don't create a skill when:

- The task is a one-time operation
- The workflow is still evolving rapidly
- The task is too simple to benefit from structured instructions
- Existing skills can be composed to achieve the goal

## Arguments

Parse the following from `$ARGUMENTS`:

- **skill-name**: (required) Name for the skill in kebab-case (e.g., `my-new-skill`)

## Workflow

### Step 1: Gather Skill Information

If not provided in arguments, ask for:

**Required:**

- **Skill name**: kebab-case identifier (e.g., `create-ticket`, `docs-review`)
- **Description**: Prefer the formula `Use when [trigger condition]. [What it does for disambiguation].` Allowed trigger stems: `Use when`, `Run when`, or `Trigger when`.
- **Purpose**: What problem does this skill solve?

**Optional:**

- **Arguments**: What parameters should the skill accept?
- **Model invocation**: Should the agent be able to invoke this automatically? (default: no)
- **User invocable**: (Claude Code only) Should this appear in the `/` menu? (default: yes)
- **Tool restrictions**: (Claude Code only) Which tools should the skill be allowed to use?
- **Supporting files**: Does the skill need templates, scripts, or reference files?

### Step 2: Apply Progressive Disclosure

**The context window is a shared resource.** Skills share context with everything else the agent needs. Structure information in three levels:

1. **Metadata** (~100 words): Name + description in frontmatter, always loaded
2. **SKILL.md body** (<5k words): Loads when skill triggers
3. **Bundled resources**: Files in `references/`, `scripts/`, `assets/` loaded as-needed

**Writing principles:**
- Challenge each piece of information—does the agent truly need this? Does this paragraph justify its token cost?
- Description is the primary trigger mechanism—include "when to use" there, not just in the body
- Prefer concise examples over verbose explanations
- Use imperative form (direct commands)
- Avoid duplication between SKILL.md and reference files

### Step 3: Plan Skill Structure

**Section structure** (adjust based on complexity):

1. Title (H1) + brief description
2. When to Use / When NOT to Use (if applicable)
3. Arguments (if skill accepts arguments)
4. Workflow/Steps (use "Step 1, 2, 3..." naming)
5. Examples (both Basic Usage and Conversational)
6. Troubleshooting (if applicable)
7. Success Criteria

For detailed guidance, see `references/skill-template.md`.

**Template:**

```markdown
---
name: skill-name
version: 1.0.0
description: Use when [trigger condition]. [What it does for disambiguation].
argument-hint: "[arg1] [--flag]"
disable-model-invocation: true
allowed-tools: Read, Write, Glob, Grep
user-invocable: true
---

# Skill Title

Brief description of what this skill does.

## When to Use

Use when:
- Condition 1
- Condition 2

## When NOT to Use

Don't use when:
- Condition 1
- Condition 2

## Arguments

Parse from `$ARGUMENTS`:
- **required-arg**: (required) Description
- **--optional-flag**: (optional) Description with default

## Workflow

### Step 1: First Step

Instructions...

### Step 2: Second Step

Instructions...

## Examples

### Basic Usage

\`\`\`
/skill-name arg1 --flag
\`\`\`

### Conversational

\`\`\`
Natural language request that triggers this skill
\`\`\`

## Troubleshooting

**Common issue:**
- Solution

## Success Criteria

- ✅ Criterion 1
- ✅ Criterion 2
```

**Frontmatter notes:**
- `argument-hint`, `allowed-tools`, `user-invocable`, `context`, `hooks` are Claude Code specific
- Other agents ignore unknown frontmatter fields, so it's safe to include Claude-specific fields everywhere
- `name`: max 64 chars for cross-provider portability (Codex allows 100, but 64 is the spec limit)
- `version`: include valid semver and start new skills at `1.0.0`
- `description`: **single line, ≤ 500 chars** (Codex enforces single-line ≤ 500 chars; spec allows 1024)
- Bump `version` on future edits: patch for fixes/clarifications, minor for backward-compatible behavior additions, major for breaking workflow/interface changes

**Writing the `description` field:**

The description is your **primary routing mechanism** — agents load only `name` + `description` at startup across all installed skills, then semantic-match against the user's prompt. The SKILL.md body handles "what it does" once loaded. The description's job is to win the routing decision.

1. **Lead with triggering conditions**: "Use when…" / "Run this when…"
2. **Include keywords for disambiguation**: nouns + verbs that differentiate from similar skills
3. **Don't summarize the workflow**: providers route on description without reading the body
4. **Front-load trigger keywords in the first 50 characters** (truncation may occur at scale)
5. **Use this default pattern**: `Use when [trigger condition]. [What it does for disambiguation].` `Run when` and `Trigger when` are also valid trigger stems when wording is clearer.

Examples:
- Bad: "Reviews code by checking spec compliance, then code quality, then creates PR"
- Good: "Use when reviewing code or checking PRs. Systematic quality and security analysis."

Present the plan and wait for user approval before creating files.

### Step 4: Create Skill File

Create the skill at `.agents/skills/{skill-name}/SKILL.md`

**Key requirements:**

- Skill name matches directory name
- New skills include `version: 1.0.0` in frontmatter
- Workflow steps use "Step 1, 2, 3..." naming
- Include both "Basic Usage" and "Conversational" example styles
- Use imperative form for instructions

**Supporting files** (create if needed):

Skills can include supporting files in subdirectories:

```
.agents/skills/{skill-name}/
├── SKILL.md                     # Main instructions (required)
├── scripts/                     # Executable code agents can run
│   └── setup.sh
├── references/                  # Additional docs loaded on demand
│   └── api-spec.md
└── assets/                      # Templates, images, data files
    └── template.md
```

| Directory    | Purpose                                       |
| ------------ | --------------------------------------------- |
| `scripts/`   | Executable code that agents can run           |
| `references/`| Additional documentation loaded on demand     |
| `assets/`    | Static resources like templates or data files |

### Step 5: Sync and Verify

After creating the skill, run OAT sync to update provider views:

```bash
oat sync --apply
```

Verify:

- File created at `.agents/skills/{skill-name}/SKILL.md`
- Frontmatter syntax is valid
- Frontmatter includes valid semver `version:` (new skills start at `1.0.0`)
- Skill appears in `AGENTS.md`
- Examples include both invocation styles
- If the skill name starts with `oat-`, run `pnpm oat:validate-skills` and fix any findings

Provide:

- Path to created file
- Summary of skill capabilities
- How to invoke: `/skill-name`
- Next steps (test the skill)

## Best Practices

### Naming

- Use kebab-case for skill names (e.g., `create-pr-description`, `docs-new`)
- Max 64 chars for cross-provider portability (lowercase letters, numbers, hyphens; no leading/trailing hyphen)
- Keep names short but descriptive
- Prefix related skills (e.g., `docs-new`, `docs-update`, `docs-review`)
- Skill directory name must match the `name` field in frontmatter

### Content

- **Context window is a public good**—keep skills lean, challenge every paragraph
- Description is the trigger—include "when to use" in frontmatter, not just body
- Bump `version` for edits: patch = fixes/clarifications, minor = backward-compatible additions, major = breaking changes
- Keep SKILL.md **under 500 lines / ~5,000 tokens** (spec constraint)
- Use clear, task-based headings
- Include working examples for both invocation styles
- Document all arguments with defaults
- Keep command-like skills concise; complex workflows can be detailed
- Avoid duplication—info lives in SKILL.md or references, not both

### Interactive Input

Skills that need user decisions (parameter choices, confirmations, disambiguation) should include interactive prompts in their workflow steps.

**Write instructions portably:** Use natural language like "Ask the user which approach they prefer" in workflow prose. All providers can handle this conversationally.

**Claude Code enhancement:** Add `AskUserQuestion` to `allowed-tools` in frontmatter. Claude Code renders these as structured UI prompts with selectable options, headers, and multi-select support. Other providers ignore the field and handle the same instructions as conversational questions.

**When to include interactive input:**
- Decisions with 2–4 discrete options (approach, config, scope)
- Confirmation gates before destructive or high-impact actions
- Collecting required parameters not provided in arguments

**When NOT to:**
- Autonomous/subagent skills — use argument defaults or flags to drive decisions instead of prompting mid-execution
- Questions with open-ended answers — just ask conversationally in the skill prose

### Progress Feedback

For multi-step skills, print brief progress updates so the user knows what's happening:

- Use `[N/N]` step indicators for sequential work (e.g., `[1/3] Resolving dependencies…`)
- For long-running operations (tests, builds, large diffs), print a start line and a completion line
- Keep it concise — don't print a line for every shell command

### Shared References

- If multiple skills need the same reference document, place it in `.agents/docs/` (not duplicated per skill)
- Skill-specific references go in the skill's own `references/` directory
- Reference from SKILL.md via relative path: `[guide](../../docs/my-guide.md)`

### Frontmatter Reference

Legend: ✅ supported | ⚠️ provider-specific | 💤 ignored | ❓ unknown

| Field | Spec | Claude Code | Cursor | Codex CLI | Gemini CLI |
|-------|------|-------------|--------|-----------|------------|
| `name` | ✅ required | ✅ | ✅ | ✅ required | ✅ |
| `description` | ✅ required | ✅ | ✅ | ✅ required | ✅ |
| `license` | ✅ optional | ❓ | ✅ | 💤 | ❓ |
| `compatibility` | ✅ optional | ❓ | ✅ | 💤 | ❓ |
| `metadata` | ✅ optional | ❓ | ✅ | 💤 | ❓ |
| `allowed-tools` | ⚠️ experimental | ✅ | ❓ | 💤 | ❓ |
| `disable-model-invocation` | ❌ | ✅ | ✅ | 💤 | ❓ |
| `user-invocable` | ❌ | ✅ | ❓ | 💤 | ❓ |
| `argument-hint` | ❌ | ✅ | ❓ | 💤 | ❓ |
| `context` / `agent` | ❌ | ✅ | ❌ | 💤 | ❓ |
| `hooks` | ❌ | ✅ | ❌ | 💤 | ❓ |

**Key takeaway:** `name` + `description` are the only truly portable interface. Codex ignores unknown keys (safe to include Claude fields), so layer tool-specific fields on top of a portable baseline. For the full matrix, see `.agents/docs/skills-guide.md`.

### Detail Level

| Skill Type               | Detail Level | Examples                            |
| ------------------------ | ------------ | ----------------------------------- |
| Complex workflows        | Detailed     | docs-new, docs-review               |
| Simple command-like      | Concise      | update-doc-refs, create-ticket      |
| Reference/standards      | Detailed     | repo-documentation                  |
| Helper (auto-invoked)    | Moderate     | read-relevant-docs                  |

## Examples

### Basic Usage

```
/create-skill my-new-skill
```

```
/create-skill deploy-preview
```

### Conversational

```
Create a new skill called code-review that helps review pull requests
```

```
I need a skill for running database migrations
```

## Reference

- [Agent Skills Open Standard](https://agentskills.io) — the spec
- [Claude Code Skills](https://code.claude.com/docs/en/skills) — Claude-specific features
- [Cursor Skills](https://cursor.com/docs/context/skills) — Cursor-specific features
- [Codex CLI Skills](https://developers.openai.com/codex/skills) — Codex-specific features
- [Gemini CLI Skills](https://geminicli.com/docs/cli/skills/) — Gemini-specific features
- [npx skills CLI](https://github.com/vercel-labs/skills) — installing remote/community skills
- [Skills best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) — authoring guidance
- `.agents/docs/skills-guide.md` — local deep-dive: compatibility matrix, resolved questions, patterns
- `.agents/docs/reference-architecture.md` — local: where skills/agents/docs live and why

## Troubleshooting

**Skill not appearing in menu:**

- Run `oat sync --apply` to regenerate provider views
- Verify YAML frontmatter syntax is valid
- Check that skill name matches directory name
- Ensure `user-invocable` is not set to `false` (Claude Code)
- Restart the AI assistant

**Skill invocation fails:**

- Verify file created at `.agents/skills/{name}/SKILL.md`
- Check file path is correct
- Ensure no syntax errors in SKILL.md

**Supporting files not loading:**

- Verify files are in the correct subdirectory
- Check file paths in SKILL.md instructions

## Success Criteria

Successful skill creation:

- ✅ Skill created at `.agents/skills/{name}/SKILL.md`
- ✅ `oat sync --apply` run successfully
- ✅ For `oat-*` skills, `pnpm oat:validate-skills` passes
- ✅ Skill appears in AGENTS.md
- ✅ Frontmatter valid
- ✅ Workflow uses "Step" naming
- ✅ Both example styles included
- ✅ Supporting files in skill directory (if applicable)
- ✅ Skill can be invoked with `/skill-name`
