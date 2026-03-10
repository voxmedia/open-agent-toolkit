# GitHub Copilot Instruction Files and Customization System -- Deep Research

**Date:** 2026-02-19
**Scope:** Official GitHub/Microsoft documentation on Copilot's instruction and customization system
**Method:** Systematic retrieval from official docs + web search for supplementary sources

---

## Table of Contents

1. [Repository-Level Instructions](#1-repository-level-instructions)
2. [Scoped Instruction Files](#2-scoped-instruction-files)
3. [Prompt Files](#3-prompt-files)
4. [Custom Agent Files](#4-custom-agent-files)
5. [AGENTS.md Support](#5-agentsmd-support)
6. [VS Code Settings-Based Instructions](#6-vs-code-settings-based-instructions)
7. [Personal Instructions](#7-personal-instructions)
8. [Organization-Level Instructions](#8-organization-level-instructions)
9. [Precedence and Interaction Rules](#9-precedence-and-interaction-rules)
10. [Coding Agent Environment Setup](#10-coding-agent-environment-setup)
11. [Feature Support Matrix](#11-feature-support-matrix)
12. [Best Practices](#12-best-practices)
13. [Sources](#13-sources)

---

## 1. Repository-Level Instructions

**Source:** [GitHub Docs -- Adding repository custom instructions](https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot), [VS Code Docs -- Custom Instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)

### File Path and Format

- **Exact path:** `.github/copilot-instructions.md`
- **Format:** Markdown (natural language)
- **Location requirement:** Must be at the root of the `.github` directory in the repository

### Content

This file should contain information about the project such as:

- How to build and test the project
- Coding standards or conventions to follow
- Technology stack declarations
- Architectural patterns
- Security requirements
- Documentation standards

### How Copilot Loads This File

> "The instructions in the file(s) are available for use by Copilot as soon as you save the file(s). Instructions are automatically added to requests that you submit to Copilot."

- The file is "always-on" -- it is automatically included in every chat request within the repository context.
- Custom instructions appear in the **References list** of responses when used, providing transparency.

### Format Details

> "Whitespace between instructions is ignored."

Instructions can be written as a single block of text, each on a new line, or separated by blank lines. All are treated equivalently.

### Size Limits

- The best practices documentation recommends limiting any single instruction file to a **maximum of about 1,000 lines**.
- The coding agent guidelines reference approximately "2 pages" for repository-wide instructions.
- Beyond 1,000 lines, "the quality of responses may deteriorate."

### Generation

In VS Code, the `/init` command can "analyze your workspace and generate" a tailored `copilot-instructions.md` file automatically.

---

## 2. Scoped Instruction Files

**Source:** [GitHub Docs -- Adding repository custom instructions](https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot), [VS Code Docs -- Custom Instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions), [GitHub Docs -- Custom Instructions Tutorial](https://docs.github.com/en/copilot/tutorials/use-custom-instructions)

### File Naming Convention

- **Pattern:** `.github/instructions/<NAME>.instructions.md`
- Files **must** end with the `.instructions.md` extension
- The `<NAME>` portion indicates the purpose of the instructions (e.g., `python.instructions.md`, `api.instructions.md`, `react-components.instructions.md`)
- Subdirectories are supported within `.github/instructions/`
- Use **lowercase hyphenated filenames**

### Frontmatter Format -- ALL Supported Fields

```yaml
---
applyTo: '**/*.ts,**/*.tsx'
excludeAgent: 'code-review'
---
```

In VS Code, additional fields are recognized:

```yaml
---
name: 'Display Name'
description: 'Short description shown on hover in the Chat view.'
applyTo: '**/*.ts'
---
```

#### Field Reference

| Field          | Required | Description                                                                                                                                  |
| -------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `applyTo`      | No       | Glob pattern defining which files the instructions apply to automatically, relative to workspace root. Use `**` to apply to all files.       |
| `description`  | No       | Short description shown on hover in the Chat view (VS Code). In GitHub's awesome-copilot repo, this is listed as required for contributions. |
| `name`         | No       | Display name shown in the UI. Defaults to the file name if omitted. (VS Code)                                                                |
| `excludeAgent` | No       | Prevents the file from being used by a specific agent. Values: `"code-review"` or `"coding-agent"`.                                          |

#### applyTo Glob Pattern Examples

| Pattern              | Matches                                  |
| -------------------- | ---------------------------------------- |
| `*`                  | Files in current directory               |
| `**` or `**/*`       | All files in all directories recursively |
| `**/*.py`            | All `.py` files recursively              |
| `src/**/*.py`        | All `.py` files under `src/` recursively |
| `**/*.ts,**/*.tsx`   | Multiple patterns separated by commas    |
| `app/models/**/*.rb` | Ruby files under `app/models/`           |
| `**/tests/*.spec.ts` | Playwright test files                    |

### How Scoped Instructions Are Activated

Scoped instructions are activated **by file pattern matching**: when the `applyTo` glob matches a file that Copilot is currently working on.

> "If the path you specify matches a file that Copilot is working on, and a repository-wide custom instructions file also exists, then the instructions from both files are used."

This means scoped instructions are **additive** -- they do not replace the repository-wide instructions but are combined with them.

In VS Code, there is also semantic/description-based matching: if a `description` is provided but no `applyTo`, VS Code can match instructions based on the description's relevance to the current task.

### Interaction with copilot-instructions.md

Both files contribute instructions simultaneously. When a scoped instruction file matches the current context:

1. The repository-wide `.github/copilot-instructions.md` instructions are included
2. The matching `.github/instructions/*.instructions.md` instructions are also included
3. Both sets are combined and sent to Copilot

> "When multiple instruction files exist, VS Code combines and adds them to the chat context, no specific order is guaranteed."

### VS Code Configuration

- **Location setting:** `chat.instructionsFilesLocations` -- configures where VS Code looks for instruction files (default: `.github/instructions`)
- **Enable/disable:** `chat.includeApplyingInstructions` -- enable pattern-based instructions
- **Referenced instructions:** `chat.includeReferencedInstructions` -- enable Markdown-linked instructions

---

## 3. Prompt Files

**Source:** [VS Code Docs -- Prompt Files](https://code.visualstudio.com/docs/copilot/customization/prompt-files), [.NET Blog -- Prompt Files and Instructions Files Explained](https://devblogs.microsoft.com/dotnet/prompt-files-and-instructions-files-explained/)

### What Are Prompt Files

Prompt files are **reusable prompt templates** that encode common tasks as standalone files. The critical distinction from instructions:

> "Unlike custom instructions that apply automatically, you invoke prompt files manually in chat."

Instructions define **rules and standards** (always-on or pattern-matched). Prompt files define **specific tasks or workflows** (manually invoked).

### File Path and Naming

- **Location:** `.github/prompts/<NAME>.prompt.md`
- **User profile scope:** `prompts` folder of the current VS Code profile
- Additional locations configurable via `chat.promptFilesLocations`

### Frontmatter Format

```yaml
---
name: 'Display Name'
description: 'A short description of the prompt'
argument-hint: 'Hint text shown in the chat input field'
agent: 'agent'
model: 'GPT-4o'
tools: ['githubRepo', 'search/codebase']
---
```

#### All Frontmatter Fields

| Field           | Required | Description                                                                     |
| --------------- | -------- | ------------------------------------------------------------------------------- |
| `name`          | No       | Display name after typing `/` in chat; defaults to filename                     |
| `description`   | No       | A short description of the prompt                                               |
| `argument-hint` | No       | Hint text shown in the chat input field                                         |
| `agent`         | No       | Agent type: `ask`, `edit`, `agent`, `plan`, or a custom agent name              |
| `model`         | No       | Language model selection; uses current picker selection if unspecified          |
| `tools`         | No       | List of tool or tool set names available; supports MCP format `<server name>/*` |

### Body Content and References

The body uses Markdown format and supports:

- **File references:** Relative-path Markdown links `[name](relative/path)` or `#file:path` syntax
- **Tool references:** `#tool:<tool-name>` syntax (e.g., `#tool:githubRepo`)
- **Variable syntax:** `${variableName}` with support for:
  - `${workspaceFolder}`, `${workspaceFolderBasename}` -- workspace context
  - `${selection}`, `${selectedText}` -- editor selection
  - `${file}`, `${fileBasename}`, `${fileDirname}`, `${fileBasenameNoExtension}` -- current file
  - `${input:variableName}`, `${input:variableName:placeholder}` -- user input

### Invocation Methods

1. Type `/` plus prompt name in chat input
2. Run **Chat: Run Prompt** command from Command Palette
3. Press play button in editor title bar when a prompt file is open

### Tool Priority Order

1. Prompt file-specified tools (highest)
2. Referenced custom agent's tools
3. Default agent tools (lowest)

### Platform Support

Available in VS Code, Visual Studio, and JetBrains IDEs. In Visual Studio, prompts are invoked with `#[promptName]` rather than `/[promptName]`.

---

## 4. Custom Agent Files

**Source:** [GitHub Docs -- Custom Agents Configuration Reference](https://docs.github.com/en/copilot/reference/custom-agents-configuration), [GitHub awesome-copilot docs](https://github.com/github/awesome-copilot/blob/main/docs/README.agents.md)

### File Format

Custom agents use Markdown files with `.md` or `.agent.md` extensions. The filename (minus extension) is used for deduplication across configuration levels.

### Frontmatter Fields

```yaml
---
name: 'Agent Display Name'
description: "Description of the custom agent's purpose and capabilities"
target: 'vscode'
tools: ['read', 'edit', 'search']
infer: true
mcp-servers:
  server-name:
    type: stdio
    command: npx
    args: ['-y', '@some/mcp-server']
metadata:
  category: 'testing'
---
```

#### All Frontmatter Properties

| Field         | Required | Description                                                                  |
| ------------- | -------- | ---------------------------------------------------------------------------- |
| `description` | **Yes**  | Description of the custom agent's purpose and capabilities                   |
| `name`        | No       | Display name for the agent                                                   |
| `target`      | No       | Environment context: `vscode` or `github-copilot`; defaults to both          |
| `tools`       | No       | List of tool names available; defaults to all tools if unset                 |
| `infer`       | No       | Controls automatic agent selection based on task context; defaults to `true` |
| `mcp-servers` | No       | Additional MCP servers and tools for the agent                               |
| `metadata`    | No       | Key-value pairs for agent annotation                                         |

### Body Content

The Markdown content below frontmatter defines behavior and expertise. **Maximum: 30,000 characters.**

### Tools Configuration

- Omit entirely or use `tools: ["*"]` for all tools
- Specify individual tools: `tools: ["read", "edit", "search"]`
- Use `tools: []` to disable all tools
- Built-in tool aliases: `execute`, `read`, `edit`, `search`, `agent`, `web`

### MCP Server Configuration

> "MCP servers can only be configured directly within custom agent profiles at the organization and enterprise level."

Repository-level agents access tools from MCP servers configured in repository settings. Environment variables support: `$COPILOT_MCP_ENV_VAR_VALUE`, `${COPILOT_MCP_ENV_VAR_VALUE}`, and `${{ secrets.COPILOT_MCP_ENV_VAR_VALUE }}`.

---

## 5. AGENTS.md Support

**Source:** [VS Code Docs -- Custom Instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions), [GitHub Docs -- Best practices for coding agent](https://docs.github.com/copilot/how-tos/agents/copilot-coding-agent/best-practices-for-using-copilot-to-work-on-tasks)

### Supported Instruction File Types for the Coding Agent

The full list of instruction files Copilot supports:

- `/.github/copilot-instructions.md`
- `/.github/instructions/**/*.instructions.md`
- `**/AGENTS.md`
- `/CLAUDE.md`
- `/GEMINI.md`

### AGENTS.md in VS Code

- VS Code detects `AGENTS.md` in workspace root automatically
- **Setting:** `chat.useAgentsMdFile` -- enable/disable AGENTS.md detection
- **Nested support (experimental):** `chat.useNestedAgentsMdFiles` -- enables AGENTS.md in subfolders
  - When enabled, the agent "can then decide which instructions to use based on the files being edited"
- AGENTS.md is treated as an **always-on instruction** -- automatically included in every chat request

### AGENTS.md in the Coding Agent

The coding agent reads AGENTS.md files placed anywhere in the repository. The **nearest file takes precedence** -- if an AGENTS.md exists in a subdirectory closer to the files being edited, it will be preferred over one at the root.

### Format

AGENTS.md uses plain Markdown format. There is no required frontmatter. It serves as a comprehensive guide to the repository, including:

- Project structure and components
- Development workflow and commands
- Coding standards and conventions
- Contribution guidelines

---

## 6. VS Code Settings-Based Instructions

**Source:** [VS Code Docs -- Custom Instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)

### Settings Configuration

VS Code supports settings-based instructions (noted as a **deprecated** approach for specialized scenarios):

```json
{
  "github.copilot.chat.codeGeneration.instructions": [
    { "text": "Always use TypeScript strict mode." },
    { "file": "guidance/coding-standards.md" }
  ],
  "github.copilot.chat.pullRequestDescriptionGeneration.instructions": [
    { "text": "Always include a list of key changes." }
  ],
  "github.copilot.chat.reviewSelection.instructions": [
    { "file": "guidance/backend-review-guidelines.md" }
  ]
}
```

### Supported Properties

Each instruction entry supports two properties:

- `text` -- Inline text instruction
- `file` -- Reference to an external Markdown file

### How Settings Interact with File-Based Instructions

Settings-based instructions and file-based instructions are combined. The recommended approach is now to use file-based instructions (`.instructions.md` files) rather than settings, as the settings approach is deprecated.

### Additional CLAUDE.md Support

VS Code also searches for CLAUDE.md files in:

- Workspace root
- `.claude` folder in workspace
- User home directory (`~/.claude/CLAUDE.md`)
- Local variant (`CLAUDE.local.md` for local-only instructions)

Enable via `chat.useClaudeMdFile` setting. Note: uses a `paths` property (array format) instead of `applyTo` for Claude Rules format compatibility.

### Relevant VS Code Settings Summary

| Setting                              | Purpose                                              |
| ------------------------------------ | ---------------------------------------------------- |
| `chat.instructionsFilesLocations`    | Configure where VS Code looks for instruction files  |
| `chat.promptFilesLocations`          | Configure where VS Code looks for prompt files       |
| `chat.includeApplyingInstructions`   | Enable pattern-based instruction matching            |
| `chat.includeReferencedInstructions` | Enable Markdown-linked instructions                  |
| `chat.useAgentsMdFile`               | Enable AGENTS.md detection                           |
| `chat.useNestedAgentsMdFiles`        | Enable nested AGENTS.md in subfolders (experimental) |
| `chat.useClaudeMdFile`               | Enable CLAUDE.md detection                           |

### Diagnostics

Users can access **Configure Chat (gear icon) > Diagnostics** to view "all loaded custom agents, prompt files, instruction files" and identify loading errors or syntax problems.

---

## 7. Personal Instructions

**Source:** [GitHub Docs -- Adding personal custom instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-personal-instructions)

### How to Set

Personal instructions are configured through the GitHub.com interface:

1. Navigate to github.com/copilot
2. Click profile picture in bottom left
3. Select "Personal instructions"
4. Enter instructions in the text box

### Format

Personal instructions accept **any format**: a single block of text, each instruction on a new line, or instructions separated by blank lines. They are entered in a "Preferences and instructions" text box.

### Priority

> "Personal instructions take the highest priority."

They override both repository and organization instructions when there are conflicts.

---

## 8. Organization-Level Instructions

**Source:** [GitHub Docs -- Adding organization custom instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-organization-instructions)

### Who Can Set Them

> "Organization owners" are the only users permitted to add organization custom instructions.

Requires a **GitHub Copilot Business or GitHub Copilot Enterprise plan**.

### Where They Are Stored

Instructions are configured through organization settings on GitHub.com:

1. Profile picture > Organizations > Settings
2. Navigate to the Copilot section in left sidebar
3. Select "Custom instructions"
4. Enter in the "Preferences and instructions" text box

### Format

> Instructions can be input "as a single block of text, each on a new line, or separated by blank lines."

Plain text, not Markdown files.

### Scope

> "Organization custom instructions are currently only supported for Copilot Chat on GitHub.com, Copilot code review on GitHub.com and Copilot coding agent on GitHub.com."

They are **not** supported in IDE-based Copilot Chat (VS Code, Visual Studio, JetBrains).

### Activation

> "Your instructions are now active, and will stay active until you change or remove them."

### Status

This feature is "currently in public preview and is subject to change."

---

## 9. Precedence and Interaction Rules

**Source:** [GitHub Docs -- Adding repository custom instructions](https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot)

### Precedence Hierarchy

> "Personal instructions take the highest priority. Repository instructions come next, and then organization instructions are prioritized last. However, all sets of relevant instructions are provided to Copilot."

**Order (highest to lowest):**

1. **Personal instructions** -- User-specific preferences
2. **Repository instructions** -- `.github/copilot-instructions.md` + matching `.instructions.md` files
3. **Organization instructions** -- Org-wide settings

Key detail: all levels are provided to Copilot simultaneously. Priority determines which instructions take precedence when there are conflicts, but non-conflicting instructions from all levels are combined.

### AGENTS.md Precedence (Nested)

For AGENTS.md files, the **nearest file takes precedence** based on proximity to the files being edited.

### Prompt File Tool Priority

1. Prompt file-specified tools (highest)
2. Referenced custom agent's tools
3. Default agent tools (lowest)

---

## 10. Coding Agent Environment Setup

**Source:** [GitHub Docs -- Customizing the development environment](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/customize-the-agent-environment)

### copilot-setup-steps.yml

The coding agent environment is configured via a GitHub Actions workflow file.

- **Path:** `.github/workflows/copilot-setup-steps.yml`
- **Format:** Standard GitHub Actions workflow YAML

> "A copilot-setup-steps.yml file looks like a normal GitHub Actions workflow file, but must contain a single copilot-setup-steps job."

> "The job MUST be called copilot-setup-steps or it will not be picked up by Copilot."

### Purpose

> "Copilot can discover and install these dependencies itself via a process of trial and error, but this can be slow and unreliable."

Pre-installation through setup steps ensures deterministic, fast environment configuration.

### Customizable Settings Within the Job

- `steps` -- Individual actions executed before Copilot starts
- `permissions` -- Access controls for the job
- `runs-on` -- Runner specification (e.g., `ubuntu-4-core` for larger runners)
- `services` -- Supporting services
- `snapshot` -- Environment snapshots
- `timeout-minutes` -- Maximum execution time (capped at 59 minutes)

### Use Cases

- Preinstall tools or dependencies
- Upgrade to larger GitHub-hosted runners
- Run on self-hosted runners (ARC)
- Give Copilot a Windows development environment
- Enable Git Large File Storage (LFS)

### Trigger Behavior

> "The copilot-setup-steps.yml workflow won't trigger unless it's present on your default branch."

The workflow runs automatically when changes are made, showing alongside other PR checks for validation.

### Environment Variables

Variables are configured through GitHub Actions environment secrets and variables in the `copilot` environment.

### Agent Access Restrictions

The coding agent has:

- **Read-only access** to the repository
- Can only create and push to branches beginning with `copilot/`

---

## 11. Feature Support Matrix

**Source:** [GitHub Docs -- Adding repository custom instructions](https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot)

| Feature              | copilot-instructions.md | \*.instructions.md | AGENTS.md | Organization |
| -------------------- | ----------------------- | ------------------ | --------- | ------------ |
| Chat (GitHub.com)    | Yes                     | Yes                | --        | Yes          |
| Chat (VS Code)       | Yes                     | Yes                | Yes       | No           |
| Chat (Visual Studio) | Yes                     | Yes                | --        | No           |
| Chat (JetBrains)     | Yes                     | Yes                | --        | No           |
| Code review          | Yes                     | Yes (configurable) | --        | Yes          |
| Coding agent         | Yes                     | Yes                | Yes       | Yes          |
| Code completions     | **No**                  | **No**             | **No**    | **No**       |

**Critical limitation:**

> Custom instructions "are not taken into account for inline suggestions as you type in the editor."

Instructions only affect Copilot Chat, code review, and the coding agent -- NOT inline code completions.

---

## 12. Best Practices

**Source:** [GitHub Docs -- Best practices](https://docs.github.com/en/copilot/get-started/best-practices), [GitHub Docs -- Coding agent best practices](https://docs.github.com/copilot/how-tos/agents/copilot-coding-agent/best-practices-for-using-copilot-to-work-on-tasks), [GitHub Docs -- Code review tutorial](https://docs.github.com/en/copilot/tutorials/use-custom-instructions), [VS Code Docs -- Custom Instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)

### Content Organization

1. **Start minimal and iterate.** "Start with a minimal set of instructions and add more iteratively based on what works."
2. **Use clear structure.** Use distinct headings that separate different topics, bullet points for easy scanning, and short imperative directives rather than long narrative paragraphs.
3. **Organize across files.** Break complex repositories into focused files:
   - `copilot-instructions.md` for general standards
   - Language-specific files (e.g., `python.instructions.md`)
   - Domain-specific files (e.g., `api.instructions.md`)

### Writing Effective Instructions

4. **Include reasoning behind rules.** Do not just state rules; explain why they exist.
5. **Show concrete examples.** "Show preferred and avoided patterns with concrete code examples." Include both correct and incorrect patterns.
6. **Be specific with commands.** Document build, test, lint, and CI commands with validated sequences: `make build`, `make test`, `make ci`.
7. **Include preconditions and error handling.** Document workarounds for known issues.

### Sizing Guidelines

8. **Limit file size.** "Limit any single instruction file to a maximum of about 1,000 lines."
9. **Start with 10-20 focused instructions** for code review, test with real pull requests, then iterate.

### What NOT to Do

10. **Avoid conflicting instructions** across personal, repository, and organization levels.
11. **Do not include vague quality instructions** like "be more accurate" -- these have no effect.
12. **Do not attempt to change UX or formatting** through code review instructions.
13. **Do not reference external links** in code review instructions -- copy content directly instead.
14. **Keep instructions repository-agnostic,** not task-specific (use prompt files for tasks).

### For the Coding Agent Specifically

15. **Document which commands work and which do not** and the order in which commands should be run.
16. **Use copilot-setup-steps.yml** to pre-install dependencies so the agent can "hit the ground running."
17. **Write well-scoped issues** with clear descriptions, complete acceptance criteria, and directions about which files need to be changed.
18. **Batch feedback.** Use "Start a review" rather than individual comments to prevent fragmented agent work.

### Store and Share

19. **Store workspace instructions in version control** for team sharing.
20. **Reference instructions across prompt files and custom agents** to avoid duplication.

---

## 13. Sources

### Primary Official Documentation

1. [Adding repository custom instructions for GitHub Copilot -- GitHub Docs](https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot)
2. [Use custom instructions in VS Code -- VS Code Docs](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)
3. [Customizing Copilot -- GitHub Docs Overview](https://docs.github.com/en/copilot/customizing-copilot)
4. [Copilot Customization -- VS Code Docs](https://code.visualstudio.com/docs/copilot/copilot-customization)
5. [Prompt Files in VS Code -- VS Code Docs](https://code.visualstudio.com/docs/copilot/customization/prompt-files)
6. [Custom Agents Configuration Reference -- GitHub Docs](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
7. [About GitHub Copilot coding agent -- GitHub Docs](https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent)
8. [Customizing the coding agent environment -- GitHub Docs](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/customize-the-agent-environment)
9. [Adding organization custom instructions -- GitHub Docs](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-organization-instructions)
10. [Adding personal custom instructions -- GitHub Docs](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-personal-instructions)

### Best Practices and Tutorials

11. [Best practices for using GitHub Copilot -- GitHub Docs](https://docs.github.com/en/copilot/get-started/best-practices)
12. [Best practices for coding agent -- GitHub Docs](https://docs.github.com/copilot/how-tos/agents/copilot-coding-agent/best-practices-for-using-copilot-to-work-on-tasks)
13. [Using custom instructions for code review -- GitHub Docs Tutorial](https://docs.github.com/en/copilot/tutorials/use-custom-instructions)
14. [Prompt Files and Instructions Files Explained -- .NET Blog](https://devblogs.microsoft.com/dotnet/prompt-files-and-instructions-files-explained/)

### Community and Reference

15. [github/awesome-copilot -- Instructions README](https://github.com/github/awesome-copilot/blob/main/docs/README.instructions.md)
16. [github/awesome-copilot -- Agents README](https://github.com/github/awesome-copilot/blob/main/docs/README.agents.md)
17. [github/awesome-copilot -- AGENTS.md](https://github.com/github/awesome-copilot/blob/main/AGENTS.md)
