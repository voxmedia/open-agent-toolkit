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
        init [options]   Initialize canonical directories, manifest, and tool packs
        status           Report provider sync and drift status
        sync [options]   Sync canonical content to provider views
        config           Read and write OAT config values
        providers        Inspect provider capabilities and paths
        doctor           Run environment and setup diagnostics
        cleanup          Cleanup OAT project and artifact hygiene issues
        instructions     Manage AGENTS.md and CLAUDE.md instruction file integrity
        index            OAT index generation commands
        project          Manage OAT project workflows
        state            OAT repo state commands
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
        -h, --help  display help for command

      Commands:
        tools       Install OAT tool packs (ideas, workflows, utility)
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
        --apply     Apply sync changes (default is dry-run)
        -h, --help  display help for command
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
        --apply     Apply sync changes (default is dry-run)
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
        new [options] <name>    Create or update an OAT project scaffold
        open [options] <name>   Open or switch to an OAT project
        pause [options] [name]  Pause an OAT project
        set-mode <mode>         Set project implementation execution mode
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
        -h, --help  display help for command
      "
    `);
  });
});
