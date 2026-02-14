import type { Command } from 'commander';
import { describe, expect, it } from 'vitest';
import { createProgram } from '../app/create-program';
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
        init [options]   Initialize canonical directories and manifest
        status           Report provider sync and drift status
        sync [options]   Sync canonical content to provider views
        providers        Inspect provider capabilities and paths
        doctor           Run environment and setup diagnostics
        help [command]   display help for command
      "
    `);
  });

  it('init --help matches snapshot', () => {
    const program = createRegisteredProgram();
    const help = getCommandByPath(program, ['init']).helpInformation();
    expect(help).toMatchInlineSnapshot(`
      "Usage: oat init [options]

      Initialize canonical directories and manifest

      Options:
        --hook      Install optional pre-commit hook
        --no-hook   Skip optional pre-commit hook install
        -h, --help  display help for command
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
});
