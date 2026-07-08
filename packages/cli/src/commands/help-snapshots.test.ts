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
  it('leaf subcommand help shows Global Options with json/verbose/cwd', () => {
    const program = createRegisteredProgram();
    const syncHelp = getCommandByPath(program, ['sync']).helpInformation();
    expect(syncHelp).toContain('Global Options:');
    expect(syncHelp).toContain('--json');
    expect(syncHelp).toContain('--verbose');
    expect(syncHelp).toContain('--cwd <path>');
  });

  it('scope consumers show --scope as a local option', () => {
    const program = createRegisteredProgram();

    // sync is a scope consumer
    const syncHelp = getCommandByPath(program, ['sync']).helpInformation();
    expect(syncHelp).toContain('--scope <scope>');

    // providers set is a scope consumer
    const providersSetHelp = getCommandByPath(program, [
      'providers',
      'set',
    ]).helpInformation();
    expect(providersSetHelp).toContain('--scope <scope>');

    // providers codex materialize is a scope consumer
    const codexMaterializeHelp = getCommandByPath(program, [
      'providers',
      'codex',
      'materialize',
    ]).helpInformation();
    expect(codexMaterializeHelp).toContain('--scope <scope>');
  });

  it('scope non-consumers do not show --scope', () => {
    const program = createRegisteredProgram();

    // config set has no ancestor with --scope, so it should not appear at all
    const configSetHelp = getCommandByPath(program, [
      'config',
      'set',
    ]).helpInformation();
    expect(configSetHelp).not.toContain('--scope');

    // instructions sync has no ancestor with --scope; it hardcodes project scope
    const instructionsSyncHelp = getCommandByPath(program, [
      'instructions',
      'sync',
    ]).helpInformation();
    expect(instructionsSyncHelp).not.toContain('--scope');
  });

  it('init tools core does not have --scope as a local option', () => {
    // init tools core hardcodes user scope and should not advertise --scope
    // in its own Options section. Commander v12 includes ancestor commands'
    // options in the "Global Options:" section, so --scope (a local option on
    // the `init` ancestor) will appear there — but NOT in the local Options
    // section of `init tools core` itself, which is what we verify here.
    const program = createRegisteredProgram();
    const initToolsCoreHelp = getCommandByPath(program, [
      'init',
      'tools',
      'core',
    ]).helpInformation();
    // Local options section ends before "Global Options:" — split there and
    // verify --scope is not in the local section.
    const localSection = initToolsCoreHelp.split('Global Options:')[0] ?? '';
    expect(localSection).not.toContain('--scope');
  });

  it('init tools --help does not list --scope as a local option', () => {
    // `oat init tools` is intentionally NOT a scope consumer at the guided-runner
    // level (asymmetric with `oat tools install` which does advertise --scope).
    // Commander v12 includes ancestor commands' options in the "Global Options:"
    // section, so --scope (from `init`) will appear there — but it must NOT
    // appear in the local Options section of `init tools` itself. This test
    // locks the absence so a future accidental local --scope add is caught.
    const program = createRegisteredProgram();
    const initToolsHelp = getCommandByPath(program, [
      'init',
      'tools',
    ]).helpInformation();
    // Local options section ends before "Global Options:" — split there and
    // verify --scope is not in the local section.
    const localSection = initToolsHelp.split('Global Options:')[0] ?? '';
    expect(localSection).not.toContain('--scope');
  });

  it('root --help matches snapshot', () => {
    const help = createRegisteredProgram().helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat [options] [command]

      Open Agent Toolkit CLI for provider interoperability

      Options:
        -V, --version     output the version number
        --json            Output a single JSON document
        --verbose         Enable verbose debug output
        --cwd <path>      Override working directory
        -h, --help        display help for command

      Commands:
        backlog           Manage file-backed backlog items and indexes
        decision          Manage file-backed decision records and indexes
        init [options]    Initialize canonical directories, manifest, and tool packs
        status [options]  Report provider sync and drift status
        sync [options]    Sync canonical content to provider views
        config            Read and write OAT config values
        gate              Resolve and manage workflow gate configuration
        local             Manage local-only paths (gitignored, worktree-synced)
        providers         Inspect provider capabilities and paths
        remove            Remove installed skills and managed provider views
        repo              Repository-level analysis and insight tools
        review            OAT review artifact commands
        doctor [options]  Run environment and setup diagnostics
        cleanup           Cleanup OAT project and artifact hygiene issues
        docs              OAT documentation bootstrap and maintenance commands
        instructions      Manage AGENTS.md and CLAUDE.md instruction file integrity
        index             OAT index generation commands
        pjm               Manage project-management repo reference docs
        project           Manage OAT project workflows
        state             OAT repo state commands
        tools             Manage OAT tool packs (install, update, remove, list)
        internal          Internal OAT maintenance commands
        help [command]    display help for command
      "
    `);
  });

  it('gate --help lists the review subcommand', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, ['gate']).helpInformation();

    expect(help).toContain(
      'review [options] <prompt...>               Run a review gate and map review findings to exit status',
    );
  });

  it('init --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, ['init']).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat init [options] [command]

      Initialize canonical directories, manifest, and tool packs

      Options:
        --scope <scope>  Limit execution scope (choices: "project", "user", "all",
                         default: "all")
        --hook           Install optional pre-commit hook
        --no-hook        Skip optional pre-commit hook install
        --setup          Run guided setup after initialization
        -h, --help       display help for command

      Global Options:
        -V, --version    output the version number
        --json           Output a single JSON document
        --verbose        Enable verbose debug output
        --cwd <path>     Override working directory

      Commands:
        tools            Install OAT tool packs (core, ideas, docs, workflows,
                         utility, project-management, research, brainstorm)
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
      "Usage: oat backlog generate-id [options] <title-or-slug>

      Generate a backlog item identifier (\`BL-YYMMDD-slug\`) from a title or slug

      Arguments:
        title-or-slug             Title or slug seed for the backlog item

      Options:
        --created-at <timestamp>  Creation timestamp seed for reproducible ID
                                  generation
        -h, --help                display help for command

      Global Options:
        -V, --version             output the version number
        --json                    Output a single JSON document
        --verbose                 Enable verbose debug output
        --cwd <path>              Override working directory
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
        -h, --help                             display help for command

      Global Options:
        -V, --version                          output the version number
        --json                                 Output a single JSON document
        --verbose                              Enable verbose debug output
        --cwd <path>                           Override working directory

      Commands:
        init [options]                         Scaffold the canonical backlog directory structure and starter files
        regenerate-index [options]             Regenerate the managed backlog index table
        archive [options] <id>                 Close out a backlog item: set a terminal status, record it in completed.md, move it to archived/, and regenerate the index
        generate-id [options] <title-or-slug>  Generate a backlog item identifier (\`BL-YYMMDD-slug\`) from a title or slug
        help [command]                         display help for command
      "
    `);
  });

  it('decision --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, ['decision']).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat decision [options] [command]

      Manage file-backed decision records and indexes

      Options:
        -h, --help                  display help for command

      Global Options:
        -V, --version               output the version number
        --json                      Output a single JSON document
        --verbose                   Enable verbose debug output
        --cwd <path>                Override working directory

      Commands:
        init [options]              Scaffold the canonical decision directory and
                                    index
        regenerate-index [options]  Regenerate the managed decision index table
        new [options] <title>       Create a new file-backed decision record
        migrate [options]           Migrate legacy decision-record.md into decision
                                    records
        help [command]              display help for command
      "
    `);
  });

  it('decision new --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, [
      'decision',
      'new',
    ]).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat decision new [options] <title>

      Create a new file-backed decision record

      Arguments:
        title                     Decision title

      Options:
        --decisions-root <path>   Decisions root directory (defaults to
                                  .oat/repo/reference/decisions)
        --status <status>         Decision status (default: "proposed")
        --context <text>          Initial context body text
        --created-at <timestamp>  Creation timestamp seed for reproducible ID
                                  generation
        -h, --help                display help for command

      Global Options:
        -V, --version             output the version number
        --json                    Output a single JSON document
        --verbose                 Enable verbose debug output
        --cwd <path>              Override working directory
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
                               .oat/repo/pjm/backlog)
        -h, --help             display help for command

      Global Options:
        -V, --version          output the version number
        --json                 Output a single JSON document
        --verbose              Enable verbose debug output
        --cwd <path>           Override working directory
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
        --scope <scope>  Limit execution scope (choices: "project", "user", "all",
                         default: "all")
        --hook           Emit a minimal pre-commit message: warn on managed drift,
                         info on strays
        -h, --help       display help for command

      Global Options:
        -V, --version    output the version number
        --json           Output a single JSON document
        --verbose        Enable verbose debug output
        --cwd <path>     Override working directory
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
        --scope <scope>  Limit execution scope (choices: "project", "user", "all",
                         default: "all")
        --dry-run        Preview sync changes without applying
        -h, --help       display help for command

      Global Options:
        -V, --version    output the version number
        --json           Output a single JSON document
        --verbose        Enable verbose debug output
        --cwd <path>     Override working directory
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
        -h, --help                   display help for command

      Global Options:
        -V, --version                output the version number
        --json                       Output a single JSON document
        --verbose                    Enable verbose debug output
        --cwd <path>                 Override working directory

      Commands:
        get <key>                    Get a resolved OAT config value
        set [options] <key> <value>  Set an OAT config value
        adopt [options] <template>   Adopt a bundled OAT config recommendation
        list                         List resolved OAT config values with sources
        dump                         Dump merged OAT config with source attribution
        describe [key]               Describe supported OAT config surfaces and keys
        help [command]               display help for command
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
        -h, --help                    display help for command

      Global Options:
        -V, --version                 output the version number
        --json                        Output a single JSON document
        --verbose                     Enable verbose debug output
        --cwd <path>                  Override working directory

      Commands:
        list [options]                List provider adapters and sync summary
        inspect [options] <provider>  Inspect provider details and mapping state
        set [options]                 Enable or disable project providers in sync
                                      config
        codex                         Codex provider utilities
        help [command]                display help for command
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
        --scope <scope>  Limit execution scope (choices: "project", "user", "all",
                         default: "all")
        -h, --help       display help for command

      Global Options:
        -V, --version    output the version number
        --json           Output a single JSON document
        --verbose        Enable verbose debug output
        --cwd <path>     Override working directory
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
        provider         Provider name

      Options:
        --scope <scope>  Limit execution scope (choices: "project", "user", "all",
                         default: "all")
        -h, --help       display help for command

      Global Options:
        -V, --version    output the version number
        --json           Output a single JSON document
        --verbose        Enable verbose debug output
        --cwd <path>     Override working directory
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
        --scope <scope>         Limit execution scope (choices: "project", "user",
                                "all", default: "project")
        --enabled <providers>   Comma-separated providers to enable
        --disabled <providers>  Comma-separated providers to disable
        -h, --help              display help for command

      Global Options:
        -V, --version           output the version number
        --json                  Output a single JSON document
        --verbose               Enable verbose debug output
        --cwd <path>            Override working directory
      "
    `);
  });

  it('providers codex --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, [
      'providers',
      'codex',
    ]).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat providers codex [options] [command]

      Codex provider utilities

      Options:
        -h, --help                          display help for command

      Global Options:
        -V, --version                       output the version number
        --json                              Output a single JSON document
        --verbose                           Enable verbose debug output
        --cwd <path>                        Override working directory

      Commands:
        materialize [options] <agent-name>  Materialize a canonical agent as a Codex
                                            role
        help [command]                      display help for command
      "
    `);
  });

  it('providers codex materialize --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, [
      'providers',
      'codex',
      'materialize',
    ]).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat providers codex materialize [options] <agent-name>

      Materialize a canonical agent as a Codex role

      Arguments:
        agent-name           Canonical agent name

      Options:
        --scope <scope>      Materialization scope (choices: "project", "user",
                             default: "project")
        --model <model>      Codex model ID
        --effort <effort>    Codex reasoning effort
        --role-name <role>   Override generated Codex role name
        --agent-path <path>  Path to canonical agent markdown
        --dry-run            Preview files without writing
        -h, --help           display help for command

      Global Options:
        -V, --version        output the version number
        --json               Output a single JSON document
        --verbose            Enable verbose debug output
        --cwd <path>         Override working directory
      "
    `);
  });

  it('review --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, ['review']).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat review [options] [command]

      OAT review artifact commands

      Options:
        -h, --help        display help for command

      Global Options:
        -V, --version     output the version number
        --json            Output a single JSON document
        --verbose         Enable verbose debug output
        --cwd <path>      Override working directory

      Commands:
        latest [options]  Find the most recent OAT review artifact
        help [command]    display help for command
      "
    `);
  });

  it('review latest --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, [
      'review',
      'latest',
    ]).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat review latest [options]

      Find the most recent OAT review artifact

      Options:
        --project <path>  Project path to scan in addition to ad-hoc review locations
        -h, --help        display help for command

      Global Options:
        -V, --version     output the version number
        --json            Output a single JSON document
        --verbose         Enable verbose debug output
        --cwd <path>      Override working directory
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
        --scope <scope>  Limit execution scope (choices: "project", "user", "all",
                         default: "all")
        -h, --help       display help for command

      Global Options:
        -V, --version    output the version number
        --json           Output a single JSON document
        --verbose        Enable verbose debug output
        --cwd <path>     Override working directory
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

      Global Options:
        -V, --version           output the version number
        --json                  Output a single JSON document
        --verbose               Enable verbose debug output
        --cwd <path>            Override working directory

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
        name             Skill name (e.g., oat-idea-scratchpad)

      Options:
        --scope <scope>  Limit execution scope (choices: "project", "user", "all",
                         default: "all")
        --dry-run        Preview removal without applying
        -h, --help       display help for command

      Global Options:
        -V, --version    output the version number
        --json           Output a single JSON document
        --verbose        Enable verbose debug output
        --cwd <path>     Override working directory
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
        --scope <scope>  Limit execution scope (choices: "project", "user", "all",
                         default: "all")
        --pack <pack>    Skill pack to remove (ideas|docs|workflows|utility|research)
        --dry-run        Preview removal without applying
        -h, --help       display help for command

      Global Options:
        -V, --version    output the version number
        --json           Output a single JSON document
        --verbose        Enable verbose debug output
        --cwd <path>     Override working directory
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

      Global Options:
        -V, --version   output the version number
        --json          Output a single JSON document
        --verbose       Enable verbose debug output
        --cwd <path>    Override working directory

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

      Global Options:
        -V, --version        output the version number
        --json               Output a single JSON document
        --verbose            Enable verbose debug output
        --cwd <path>         Override working directory

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
        -h, --help          display help for command

      Global Options:
        -V, --version       output the version number
        --json              Output a single JSON document
        --verbose           Enable verbose debug output
        --cwd <path>        Override working directory

      Commands:
        validate [options]  Validate AGENTS.md/CLAUDE.md sync integrity for the
                            selected strategy
        sync [options]      Repair AGENTS.md/CLAUDE.md sync drift using the selected
                            strategy
        help [command]      display help for command
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

      Global Options:
        -V, --version             output the version number
        --json                    Output a single JSON document
        --verbose                 Enable verbose debug output
        --cwd <path>              Override working directory

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
        -h, --help     display help for command

      Global Options:
        -V, --version  output the version number
        --json         Output a single JSON document
        --verbose      Enable verbose debug output
        --cwd <path>   Override working directory
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
        -h, --help     display help for command

      Global Options:
        -V, --version  output the version number
        --json         Output a single JSON document
        --verbose      Enable verbose debug output
        --cwd <path>   Override working directory
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
        --site-name <name>       Display title (distinct from --app-name)
        --target-dir <path>      Target directory for the docs app
        --description <text>     Site description
        --lint <mode>            Markdown lint mode (choices: "none",
                                 "markdownlint-cli2")
        --format <mode>          Markdown format mode (choices: "oxfmt", "none")
        --no-root-patch          Skip patching the consumer root package.json
        --yes                    Accept defaults without prompting
        -h, --help               display help for command

      Global Options:
        -V, --version            output the version number
        --json                   Output a single JSON document
        --verbose                Enable verbose debug output
        --cwd <path>             Override working directory
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

      Global Options:
        -V, --version        output the version number
        --json               Output a single JSON document
        --verbose            Enable verbose debug output
        --cwd <path>         Override working directory
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

      Validate AGENTS.md/CLAUDE.md sync integrity for the selected strategy

      Options:
        --strategy <strategy>  Sync strategy (choices: "pointer", "symlink", "copy",
                               default: "pointer")
        -h, --help             display help for command

      Global Options:
        -V, --version          output the version number
        --json                 Output a single JSON document
        --verbose              Enable verbose debug output
        --cwd <path>           Override working directory
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

      Repair AGENTS.md/CLAUDE.md sync drift using the selected strategy

      Options:
        --dry-run              Preview sync changes without applying
        --force                Overwrite mismatched CLAUDE.md files
        --strategy <strategy>  Sync strategy (choices: "pointer", "symlink", "copy",
                               default: "pointer")
        -h, --help             display help for command

      Global Options:
        -V, --version          output the version number
        --json                 Output a single JSON document
        --verbose              Enable verbose debug output
        --cwd <path>           Override working directory
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

      Global Options:
        -V, --version           output the version number
        --json                  Output a single JSON document
        --verbose               Enable verbose debug output
        --cwd <path>            Override working directory
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
        -h, --help                                   display help for command

      Global Options:
        -V, --version                                output the version number
        --json                                       Output a single JSON document
        --verbose                                    Enable verbose debug output
        --cwd <path>                                 Override working directory

      Commands:
        archive [options] [project-path]             Manage archived project data
        complete-discovery [options] <project-path>  Validate and mark a project discovery.md complete
        complete-state [options] <project-path>      Update a project state.md to the completed lifecycle shape
        dispatch-ceiling                             Resolve OAT project dispatch ceiling metadata
        list [options]                               List tracked OAT projects
        new [options] <name>                         Create or update an OAT project scaffold
        open [options] <name>                        Open or switch to an OAT project
        pause [options] [name]                       Pause an OAT project
        set-mode <mode>                              [deprecated] No-op. Execution mode is no longer selectable.
        split                                        Evaluate, validate, and run oat-project-split payloads
        status [options]                             Show the current OAT project state
        validate-plan [options]                      Validate plan.md parallelism metadata against the plan phase list
        help [command]                               display help for command
      "
    `);
  });

  it('project status --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, [
      'project',
      'status',
    ]).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat project status [options]

      Show the current OAT project state

      Options:
        --field <path>           Print a single field from the project status payload
                                 by dot path
        --project-path <path>    Read status from an explicit project path instead of
                                 the active project
        --shell <assignment...>  Print shell-safe NAME=value assignments for one or
                                 more NAME=path pairs
        -h, --help               display help for command

      Global Options:
        -V, --version            output the version number
        --json                   Output a single JSON document
        --verbose                Enable verbose debug output
        --cwd <path>             Override working directory
      "
    `);
  });

  it('project complete-state --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, [
      'project',
      'complete-state',
    ]).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat project complete-state [options] <project-path>

      Update a project state.md to the completed lifecycle shape

      Arguments:
        project-path   Project path to update

      Options:
        --archived     Mark the completed project as archived locally
        -h, --help     display help for command

      Global Options:
        -V, --version  output the version number
        --json         Output a single JSON document
        --verbose      Enable verbose debug output
        --cwd <path>   Override working directory
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
        --no-commit      Do not git-commit the scaffolded project directory
        -h, --help       display help for command

      Global Options:
        -V, --version    output the version number
        --json           Output a single JSON document
        --verbose        Enable verbose debug output
        --cwd <path>     Override working directory
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

      [deprecated] No-op. Execution mode is no longer selectable.

      Arguments:
        mode           Ignored. Execution mode is no longer selectable.

      Options:
        -h, --help     display help for command

      Global Options:
        -V, --version  output the version number
        --json         Output a single JSON document
        --verbose      Enable verbose debug output
        --cwd <path>   Override working directory
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
        -h, --help     display help for command

      Global Options:
        -V, --version  output the version number
        --json         Output a single JSON document
        --verbose      Enable verbose debug output
        --cwd <path>   Override working directory
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

      Global Options:
        -V, --version            output the version number
        --json                   Output a single JSON document
        --verbose                Enable verbose debug output
        --cwd <path>             Override working directory

      Commands:
        list [options]           List installed tools with version and status
        outdated [options]       Show tools with available updates
        info [options] <name>    Show details for an installed tool
        update [options] [name]  Update installed tools to bundled versions
        remove [options] [name]  Remove installed tools
        install [options]        Install OAT tool packs (core, ideas, docs,
                                 workflows, utility, project-management, research,
                                 brainstorm)
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
        --scope <scope>  Limit execution scope (choices: "project", "user", "all",
                         default: "all")
        -h, --help       display help for command

      Global Options:
        -V, --version    output the version number
        --json           Output a single JSON document
        --verbose        Enable verbose debug output
        --cwd <path>     Override working directory
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
        --scope <scope>  Limit execution scope (choices: "project", "user", "all",
                         default: "all")
        -h, --help       display help for command

      Global Options:
        -V, --version    output the version number
        --json           Output a single JSON document
        --verbose        Enable verbose debug output
        --cwd <path>     Override working directory
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
      project-management, research, brainstorm)

      Options:
        --scope <scope>               Limit execution scope (choices: "project",
                                      "user", "all", default: "all")
        --no-sync                     Skip auto-sync after install
        -h, --help                    display help for command

      Global Options:
        -V, --version                 output the version number
        --json                        Output a single JSON document
        --verbose                     Enable verbose debug output
        --cwd <path>                  Override working directory

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
        brainstorm [options]          Install OAT brainstorm skill (always-on entry
                                      point with visual companion)
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
        name             Tool name to remove

      Options:
        --scope <scope>  Limit execution scope (choices: "project", "user", "all",
                         default: "all")
        --pack <pack>    Remove all tools in a pack
                         (core|ideas|docs|workflows|utility|project-management|research|brainstorm)
        --all            Remove all installed tools
        --dry-run        Preview removals without applying
        --no-sync        Skip auto-sync after removal
        -h, --help       display help for command

      Global Options:
        -V, --version    output the version number
        --json           Output a single JSON document
        --verbose        Enable verbose debug output
        --cwd <path>     Override working directory
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
        name             Tool name to update

      Options:
        --scope <scope>  Limit execution scope (choices: "project", "user", "all",
                         default: "all")
        --pack <pack>    Update all tools in a pack
                         (core|ideas|docs|workflows|utility|project-management|research|brainstorm)
        --all            Update all outdated tools
        --dry-run        Preview updates without applying
        --no-sync        Skip auto-sync after update
        -h, --help       display help for command

      Global Options:
        -V, --version    output the version number
        --json           Output a single JSON document
        --verbose        Enable verbose debug output
        --cwd <path>     Override working directory
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
        name             Tool name

      Options:
        --scope <scope>  Limit execution scope (choices: "project", "user", "all",
                         default: "all")
        -h, --help       display help for command

      Global Options:
        -V, --version    output the version number
        --json           Output a single JSON document
        --verbose        Enable verbose debug output
        --cwd <path>     Override working directory
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

      Global Options:
        -V, --version     output the version number
        --json            Output a single JSON document
        --verbose         Enable verbose debug output
        --cwd <path>      Override working directory
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

      Global Options:
        -V, --version     output the version number
        --json            Output a single JSON document
        --verbose         Enable verbose debug output
        --cwd <path>      Override working directory
      "
    `);
  });
});
