import { createProgram } from '@app/create-program';
import type { Command } from 'commander';
import { describe, expect, it } from 'vitest';

import { registerCommands } from './index';

function createRegisteredProgram(): Command {
  const program = createProgram();
  registerCommands(program);
  return program;
}

function getCommandByPath(program: Command, path: string[]): Command {
  let current = program;
  for (const segment of path) {
    const next = current.commands.find((command) => command.name() === segment);
    if (!next) {
      throw new Error(`Command path not found: ${path.join(' ')}`);
    }
    current = next;
  }
  return current;
}

describe('help output snapshots', () => {
  it('root --help matches snapshot', () => {
    const help = createRegisteredProgram().helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat [options] [command]

      Open Agent Toolkit CLI for provider interoperability

      Options:
        -V, --version    output the version number
        --json           Output a single JSON document
        --verbose        Enable verbose debug output
        --scope <scope>  Limit execution scope (choices: "project", "user", "all",
                         default: "all")
        --cwd <path>     Override working directory
        -h, --help       display help for command

      Commands:
        backlog          Manage file-backed backlog items and indexes
        init [options]   Initialize canonical directories, manifest, and tool packs
        status           Report provider sync and drift status
        sync [options]   Sync canonical content to provider views
        config           Read and write OAT config values
        local            Manage local-only paths (gitignored, worktree-synced)
        providers        Inspect provider capabilities and paths
        remove           Remove installed skills and managed provider views
        repo             Repository-level analysis and insight tools
        doctor           Run environment and setup diagnostics
        cleanup          Cleanup OAT project and artifact hygiene issues
        docs             OAT documentation bootstrap and maintenance commands
        instructions     Manage AGENTS.md and CLAUDE.md instruction file integrity
        index            OAT index generation commands
        project          Manage OAT project workflows
        state            OAT repo state commands
        tools            Manage OAT tool packs (install, update, remove, list)
        internal         Internal OAT maintenance commands
        help [command]   display help for command
      "
    `);
  });

  it('init --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, ['init']).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat init [options] [command]

      Initialize canonical directories, manifest, and tool packs

      Options:
        --hook      Install optional pre-commit hook
        --no-hook   Skip optional pre-commit hook install
        --setup     Run guided setup after initialization
        -h, --help  display help for command

      Commands:
        tools       Install OAT tool packs (core, ideas, docs, workflows, utility,
                    project-management, research)
      "
    `);
  });

  it('backlog generate-id --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, [
      'backlog',
      'generate-id',
    ]).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat backlog generate-id [options] <filename>

      Generate a backlog item identifier from a filename seed

      Arguments:
        filename                  Filename or slug seed for the backlog item

      Options:
        --created-at <timestamp>  Creation timestamp seed for reproducible ID
                                  generation
        -h, --help                display help for command
      "
    `);
  });

  it('backlog --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, ['backlog']).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat backlog [options] [command]

      Manage file-backed backlog items and indexes

      Options:
        -h, --help                        display help for command

      Commands:
        init [options]                    Scaffold the canonical backlog directory
                                          structure and starter files
        regenerate-index [options]        Regenerate the managed backlog index table
        generate-id [options] <filename>  Generate a backlog item identifier from a
                                          filename seed
        help [command]                    display help for command
      "
    `);
  });

  it('backlog init --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, [
      'backlog',
      'init',
    ]).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat backlog init [options]

      Scaffold the canonical backlog directory structure and starter files

      Options:
        --backlog-root <path>  Backlog root directory (defaults to
                               .oat/repo/reference/backlog)
        -h, --help             display help for command
      "
    `);
  });

  it('status --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, ['status']).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat status [options]

      Report provider sync and drift status

      Options:
        -h, --help  display help for command
      "
    `);
  });

  it('sync --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, ['sync']).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat sync [options]

      Sync canonical content to provider views

      Options:
        --dry-run   Preview sync changes without applying
        -h, --help  display help for command
      "
    `);
  });

  it('config --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, ['config']).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat config [options] [command]

      Read and write OAT config values

      Options:
        -h, --help         display help for command

      Commands:
        get <key>          Get a resolved OAT config value
        set <key> <value>  Set an OAT config value
        list               List resolved OAT config values with sources
        dump               Dump merged OAT config with source attribution
        describe [key]     Describe supported OAT config surfaces and keys
        help [command]     display help for command
      "
    `);
  });

  it('providers --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, ['providers']).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat providers [options] [command]

      Inspect provider capabilities and paths

      Options:
        -h, --help          display help for command

      Commands:
        list                List provider adapters and sync summary
        inspect <provider>  Inspect provider details and mapping state
        set [options]       Enable or disable project providers in sync config
        help [command]      display help for command
      "
    `);
  });

  it('providers list --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, [
      'providers',
      'list',
    ]).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat providers list [options]

      List provider adapters and sync summary

      Options:
        -h, --help  display help for command
      "
    `);
  });

  it('providers inspect --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, [
      'providers',
      'inspect',
    ]).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat providers inspect [options] <provider>

      Inspect provider details and mapping state

      Arguments:
        provider    Provider name

      Options:
        -h, --help  display help for command
      "
    `);
  });

  it('providers set --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, [
      'providers',
      'set',
    ]).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat providers set [options]

      Enable or disable project providers in sync config

      Options:
        --enabled <providers>   Comma-separated providers to enable
        --disabled <providers>  Comma-separated providers to disable
        -h, --help              display help for command
      "
    `);
  });

  it('doctor --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, ['doctor']).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat doctor [options]

      Run environment and setup diagnostics

      Options:
        -h, --help  display help for command
      "
    `);
  });

  it('remove --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, ['remove']).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat remove [options] [command]

      Remove installed skills and managed provider views

      Options:
        -h, --help              display help for command

      Commands:
        skill [options] <name>  Remove a single installed skill by name
        skills [options]        Remove installed skills by pack
        help [command]          display help for command
      "
    `);
  });

  it('remove command exposes both skill and skills subcommands', () => {
    const program = createRegisteredProgram();
    const removeCommand = getCommandByPath(program, ['remove']);
    const commandNames = removeCommand.commands.map((command) =>
      command.name(),
    );
    expect(commandNames).toContain('skill');
    expect(commandNames).toContain('skills');
  });

  it('remove skill --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, [
      'remove',
      'skill',
    ]).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat remove skill [options] <name>

      Remove a single installed skill by name

      Arguments:
        name        Skill name (e.g., oat-idea-scratchpad)

      Options:
        --dry-run   Preview removal without applying
        -h, --help  display help for command
      "
    `);
  });

  it('remove skills --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, [
      'remove',
      'skills',
    ]).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat remove skills [options]

      Remove installed skills by pack

      Options:
        --pack <pack>  Skill pack to remove (ideas|docs|workflows|utility|research)
        --dry-run      Preview removal without applying
        -h, --help     display help for command
      "
    `);
  });

  it('index --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, ['index']).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat index [options] [command]

      OAT index generation commands

      Options:
        -h, --help      display help for command

      Commands:
        init [options]  Generate a thin project-index.md for quick repo orientation
        help [command]  display help for command
      "
    `);
  });

  it('cleanup --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, ['cleanup']).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat cleanup [options] [command]

      Cleanup OAT project and artifact hygiene issues

      Options:
        -h, --help           display help for command

      Commands:
        project [options]    Cleanup project pointers, state, and lifecycle drift
        artifacts [options]  Cleanup stale review and external-plan artifacts
        help [command]       display help for command
      "
    `);
  });

  it('instructions --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, ['instructions']).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat instructions [options] [command]

      Manage AGENTS.md and CLAUDE.md instruction file integrity

      Options:
        -h, --help      display help for command

      Commands:
        validate        Validate AGENTS.md to CLAUDE.md pointer integrity
        sync [options]  Repair AGENTS.md to CLAUDE.md pointer drift
        help [command]  display help for command
      "
    `);
  });

  it('docs --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, ['docs']).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat docs [options] [command]

      OAT documentation bootstrap and maintenance commands

      Options:
        -h, --help                display help for command

      Commands:
        analyze                   Run the docs analysis workflow
        apply                     Run the docs apply workflow
        generate-index [options]  Generate a docs index from markdown files
        init [options]            Scaffold an OAT docs app
        migrate [options]         Migrate MkDocs markdown to Fumadocs format
                                  (admonitions, frontmatter)
        nav                       Docs navigation commands
        help [command]            display help for command
      "
    `);
  });

  it('docs analyze --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, [
      'docs',
      'analyze',
    ]).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat docs analyze [options]

      Run the docs analysis workflow

      Options:
        -h, --help  display help for command
      "
    `);
  });

  it('docs apply --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, ['docs', 'apply']).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat docs apply [options]

      Run the docs apply workflow

      Options:
        -h, --help  display help for command
      "
    `);
  });

  it('docs init --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, ['docs', 'init']).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat docs init [options]

      Scaffold an OAT docs app

      Options:
        --framework <framework>  Documentation framework (choices: "fumadocs",
                                 "mkdocs")
        --app-name <name>        Docs app name
        --target-dir <path>      Target directory for the docs app
        --description <text>     Site description
        --lint <mode>            Markdown lint mode (choices: "none",
                                 "markdownlint-cli2")
        --format <mode>          Markdown format mode (choices: "oxfmt", "none")
        --yes                    Accept defaults without prompting
        -h, --help               display help for command
      "
    `);
  });

  it('docs nav sync --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, [
      'docs',
      'nav',
      'sync',
    ]).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat docs nav sync [options]

      Regenerate docs navigation from index.md contents

      Options:
        --target-dir <path>  Docs app directory containing mkdocs.yml
        -h, --help           display help for command
      "
    `);
  });

  it('instructions validate --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, [
      'instructions',
      'validate',
    ]).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat instructions validate [options]

      Validate AGENTS.md to CLAUDE.md pointer integrity

      Options:
        -h, --help  display help for command
      "
    `);
  });

  it('instructions sync --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, [
      'instructions',
      'sync',
    ]).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat instructions sync [options]

      Repair AGENTS.md to CLAUDE.md pointer drift

      Options:
        --dry-run   Preview sync changes without applying
        --force     Overwrite mismatched CLAUDE.md files
        -h, --help  display help for command
      "
    `);
  });

  it('index init --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, ['index', 'init']).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat index init [options]

      Generate a thin project-index.md for quick repo orientation

      Options:
        --head-sha <sha>        Override HEAD SHA
        --merge-base-sha <sha>  Override merge-base SHA
        -h, --help              display help for command
      "
    `);
  });

  it('project --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, ['project']).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat project [options] [command]

      Manage OAT project workflows

      Options:
        -h, --help              display help for command

      Commands:
        archive                 Manage archived project data
        list                    List tracked OAT projects
        new [options] <name>    Create or update an OAT project scaffold
        open [options] <name>   Open or switch to an OAT project
        pause [options] [name]  Pause an OAT project
        set-mode <mode>         Set project implementation execution mode
        status                  Show the current OAT project state
        help [command]          display help for command
      "
    `);
  });

  it('project new --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, [
      'project',
      'new',
    ]).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat project new [options] <name>

      Create or update an OAT project scaffold

      Arguments:
        name             Project name (letters, numbers, dash, underscore)

      Options:
        --mode <mode>    Scaffold mode (choices: "spec-driven", "quick", "import",
                         default: "spec-driven")
        --force          Non-destructive scaffold; create missing files only
        --no-set-active  Do not update active project in local config
        --no-dashboard   Do not refresh .oat/state.md after scaffold
        -h, --help       display help for command
      "
    `);
  });

  it('project set-mode --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, [
      'project',
      'set-mode',
    ]).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat project set-mode [options] <mode>

      Set project implementation execution mode

      Arguments:
        mode        Execution mode: single-thread or subagent-driven

      Options:
        -h, --help  display help for command
      "
    `);
  });

  it('state refresh --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, [
      'state',
      'refresh',
    ]).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat state refresh [options]

      Regenerate the OAT repo state dashboard (.oat/state.md)

      Options:
        -h, --help  display help for command
      "
    `);
  });

  it('tools --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, ['tools']).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat tools [options] [command]

      Manage OAT tool packs (install, update, remove, list)

      Options:
        -h, --help               display help for command

      Commands:
        list                     List installed tools with version and status
        outdated                 Show tools with available updates
        info <name>              Show details for an installed tool
        update [options] [name]  Update installed tools to bundled versions
        remove [options] [name]  Remove installed tools
        install [options]        Install OAT tool packs (core, ideas, docs,
                                 workflows, utility, project-management, research)
        help [command]           display help for command
      "
    `);
  });

  it('tools list --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, ['tools', 'list']).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat tools list [options]

      List installed tools with version and status

      Options:
        -h, --help  display help for command
      "
    `);
  });

  it('tools outdated --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, [
      'tools',
      'outdated',
    ]).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat tools outdated [options]

      Show tools with available updates

      Options:
        -h, --help  display help for command
      "
    `);
  });

  it('tools install --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, [
      'tools',
      'install',
    ]).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat tools install [options] [command]

      Install OAT tool packs (core, ideas, docs, workflows, utility,
      project-management, research)

      Options:
        --no-sync                     Skip auto-sync after install
        -h, --help                    display help for command

      Commands:
        core [options]                Install OAT core skills (diagnostics, docs)
        ideas [options]               Install OAT ideas skills, templates, and idea
                                      workflow files
        docs [options]                Install OAT docs workflow skills
        project-management [options]  Install OAT project-management skills and
                                      templates
        workflows [options]           Install OAT workflows skills, agents,
                                      templates, and scripts
        utility [options]             Install OAT utility skills
        research [options]            Install OAT research skills
      "
    `);
  });

  it('tools remove --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, [
      'tools',
      'remove',
    ]).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat tools remove [options] [name]

      Remove installed tools

      Arguments:
        name           Tool name to remove

      Options:
        --pack <pack>  Remove all tools in a pack
                       (core|ideas|docs|workflows|utility|project-management|research)
        --all          Remove all installed tools
        --dry-run      Preview removals without applying
        --no-sync      Skip auto-sync after removal
        -h, --help     display help for command
      "
    `);
  });

  it('tools update --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, [
      'tools',
      'update',
    ]).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat tools update [options] [name]

      Update installed tools to bundled versions

      Arguments:
        name           Tool name to update

      Options:
        --pack <pack>  Update all tools in a pack
                       (core|ideas|docs|workflows|utility|project-management|research)
        --all          Update all outdated tools
        --dry-run      Preview updates without applying
        --no-sync      Skip auto-sync after update
        -h, --help     display help for command
      "
    `);
  });

  it('tools info --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, ['tools', 'info']).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat tools info [options] <name>

      Show details for an installed tool

      Arguments:
        name        Tool name

      Options:
        -h, --help  display help for command
      "
    `);
  });

  it('internal validate-oat-skills --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, [
      'internal',
      'validate-oat-skills',
    ]).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat internal validate-oat-skills [options]

      Validate required structure of oat-* workflow skills

      Options:
        --base-ref <ref>  Also require changed canonical skills to bump version
                          relative to this git ref
        -h, --help        display help for command
      "
    `);
  });

  it('internal validate-skill-version-bumps --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, [
      'internal',
      'validate-skill-version-bumps',
    ]).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat internal validate-skill-version-bumps [options]

      Validate that changed canonical skills bump version relative to a git base ref

      Options:
        --base-ref <ref>  Git ref used as the comparison base for changed canonical
                          skills
        -h, --help        display help for command
      "
    `);
  });
});
