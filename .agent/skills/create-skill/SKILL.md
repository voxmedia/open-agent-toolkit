---
name: create-skill
description: Create a new skill in .agent/skills/ following the openskills standard. Use when adding reusable workflows or capabilities for AI coding agents.
argument-hint: "[skill-name]"
disable-model-invocation: true
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
user-invocable: true
---

# Create Skill

Create a new skill for AI coding agents using the openskills standard. Skills live in `.agent/skills/` and work across Claude Code, Cursor, and other compatible agents.

## When to Use

Use when:

- Creating a new reusable workflow or capability
- Automating a repeated task that would benefit from structured instructions
- Adding a new command that both Claude Code and Cursor should support
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
- **Description**: When to use this skill (shown in autocomplete)
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
description: When to use this skill (primary trigger mechanism)
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
- `argument-hint`, `allowed-tools`, `user-invocable` are Claude Code specific
- Other agents ignore unknown frontmatter fields, so it's safe to include them
- `description` should answer "when should I use this?" in one sentence

Present the plan and wait for user approval before creating files.

### Step 4: Create Skill File

Create the skill at `.agent/skills/{skill-name}/SKILL.md`

**Key requirements:**

- Skill name matches directory name
- Workflow steps use "Step 1, 2, 3..." naming
- Include both "Basic Usage" and "Conversational" example styles
- Use imperative form for instructions

**Supporting files** (create if needed):

Skills can include supporting files in subdirectories:

```
.agent/skills/{skill-name}/
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

After creating the skill, run openskills sync to update AGENTS.md:

```bash
npx openskills sync -y
```

Verify:

- File created at `.agent/skills/{skill-name}/SKILL.md`
- Frontmatter syntax is valid
- Skill appears in `AGENTS.md`
- Examples include both invocation styles

Provide:

- Path to created file
- Summary of skill capabilities
- How to invoke: `/skill-name`
- Next steps (test the skill)

## Best Practices

### Naming

- Use kebab-case for skill names (e.g., `create-pr-description`, `docs-new`)
- Keep names short but descriptive
- Prefix related skills (e.g., `docs-new`, `docs-update`, `docs-review`)

### Content

- **Context window is a public good**—keep skills lean, challenge every paragraph
- Description is the trigger—include "when to use" in frontmatter, not just body
- Use clear, task-based headings
- Include working examples for both invocation styles
- Document all arguments with defaults
- Keep command-like skills concise; complex workflows can be detailed
- Avoid duplication—info lives in SKILL.md or references, not both

### Frontmatter Reference

| Field | Required | Claude Code | Cursor | Description |
|-------|----------|-------------|--------|-------------|
| `name` | ✅ | ✅ | ✅ | Skill identifier (becomes `/name` command) |
| `description` | ✅ | ✅ | ✅ | When to use this skill (shown in autocomplete) |
| `disable-model-invocation` | | ✅ | ✅ | If `true`, only user can invoke |
| `argument-hint` | | ✅ | ❌ | Hint for expected arguments |
| `allowed-tools` | | ✅ | ❌ | Tools agent can use without prompts |
| `user-invocable` | | ✅ | ❌ | If `false`, hidden from `/` menu |
| `context` | | ✅ | ❌ | Set to `fork` for isolated subagent |
| `license` | | ❌ | ✅ | License name or reference |
| `compatibility` | | ❌ | ✅ | Environment requirements |
| `metadata` | | ❌ | ✅ | Arbitrary key-value mapping |

Unknown fields are ignored, so Claude Code fields work in universal skills.

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

- [openskills CLI](https://github.com/numman-ali/openskills)
- [AI Skills Documentation](apps/honeycomb-docs/docs/ai/skills.md)
- [Agent Skills Open Standard](https://agentskills.io)
- [Claude Code Skills](https://code.claude.com/docs/en/skills)
- [Cursor Skills](https://cursor.com/docs/context/skills)

## Troubleshooting

**Skill not appearing in menu:**

- Run `npx openskills sync -y` to regenerate AGENTS.md
- Verify YAML frontmatter syntax is valid
- Check that skill name matches directory name
- Ensure `user-invocable` is not set to `false` (Claude Code)
- Restart the AI assistant

**Skill invocation fails:**

- Verify file created at `.agent/skills/{name}/SKILL.md`
- Check file path is correct
- Ensure no syntax errors in SKILL.md

**Supporting files not loading:**

- Verify files are in the correct subdirectory
- Check file paths in SKILL.md instructions

## Success Criteria

Successful skill creation:

- ✅ Skill created at `.agent/skills/{name}/SKILL.md`
- ✅ `npx openskills sync -y` run successfully
- ✅ Skill appears in AGENTS.md
- ✅ Frontmatter valid
- ✅ Workflow uses "Step" naming
- ✅ Both example styles included
- ✅ Supporting files in skill directory (if applicable)
- ✅ Skill can be invoked with `/skill-name`
