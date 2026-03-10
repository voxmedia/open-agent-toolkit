import { createProgram } from '@app/create-program';
import { describe, expect, it } from 'vitest';

import { registerCommands } from './index';

describe('command registration', () => {
  function commandNames() {
    const program = createProgram();
    registerCommands(program);
    return program.commands.map((command) => command.name());
  }

  it('program has init command', () => {
    expect(commandNames()).toContain('init');
  });

  it('program has status command', () => {
    expect(commandNames()).toContain('status');
  });

  it('program has sync command', () => {
    expect(commandNames()).toContain('sync');
  });

  it('program has providers command with list, inspect, and set', () => {
    const program = createProgram();
    registerCommands(program);
    const providers = program.commands.find(
      (command) => command.name() === 'providers',
    );

    expect(providers).toBeDefined();
    const subcommands =
      providers?.commands.map((command) => command.name()) ?? [];
    expect(subcommands).toEqual(
      expect.arrayContaining(['list', 'inspect', 'set']),
    );
  });

  it('program has doctor command', () => {
    expect(commandNames()).toContain('doctor');
  });

  it('program has remove command with skill and skills', () => {
    const program = createProgram();
    registerCommands(program);
    const remove = program.commands.find(
      (command) => command.name() === 'remove',
    );

    expect(remove).toBeDefined();
    const subcommands = remove?.commands.map((command) => command.name()) ?? [];
    expect(subcommands).toEqual(expect.arrayContaining(['skill', 'skills']));
  });

  it('program has cleanup command with project and artifacts', () => {
    const program = createProgram();
    registerCommands(program);
    const cleanup = program.commands.find(
      (command) => command.name() === 'cleanup',
    );

    expect(cleanup).toBeDefined();
    const subcommands =
      cleanup?.commands.map((command) => command.name()) ?? [];
    expect(subcommands).toEqual(
      expect.arrayContaining(['project', 'artifacts']),
    );
  });

  it('program has instructions command with validate and sync', () => {
    const program = createProgram();
    registerCommands(program);
    const instructions = program.commands.find(
      (command) => command.name() === 'instructions',
    );

    expect(instructions).toBeDefined();
    const subcommands =
      instructions?.commands.map((command) => command.name()) ?? [];
    expect(subcommands).toEqual(expect.arrayContaining(['validate', 'sync']));
  });

  it('program has docs command with analyze, apply, init, and nav', () => {
    const program = createProgram();
    registerCommands(program);
    const docs = program.commands.find((command) => command.name() === 'docs');

    expect(docs).toBeDefined();
    const subcommands = docs?.commands.map((command) => command.name()) ?? [];
    expect(subcommands).toEqual(
      expect.arrayContaining(['analyze', 'apply', 'init', 'nav']),
    );
  });

  it('program has project command with new, open, pause, and set-mode', () => {
    const program = createProgram();
    registerCommands(program);
    const project = program.commands.find(
      (command) => command.name() === 'project',
    );

    expect(project).toBeDefined();
    const subcommands =
      project?.commands.map((command) => command.name()) ?? [];
    expect(subcommands).toEqual(
      expect.arrayContaining(['new', 'open', 'pause', 'set-mode']),
    );
  });

  it('program has internal command with validate-oat-skills', () => {
    const program = createProgram();
    registerCommands(program);
    const internal = program.commands.find(
      (command) => command.name() === 'internal',
    );

    expect(internal).toBeDefined();
    const subcommands =
      internal?.commands.map((command) => command.name()) ?? [];
    expect(subcommands).toContain('validate-oat-skills');
  });

  it('--help shows all commands', () => {
    const program = createProgram();
    registerCommands(program);
    const help = program.helpInformation();

    expect(help).toContain('init');
    expect(help).toContain('status');
    expect(help).toContain('sync');
    expect(help).toContain('config');
    expect(help).toContain('providers');
    expect(help).toContain('remove');
    expect(help).toContain('doctor');
    expect(help).toContain('cleanup');
    expect(help).toContain('docs');
    expect(help).toContain('instructions');
    expect(help).toContain('project');
    expect(help).toContain('internal');
  });
});
