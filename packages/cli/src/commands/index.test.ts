import { describe, expect, it } from 'vitest';
import { createProgram } from '../app/create-program';
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

  it('program has providers command with list and inspect', () => {
    const program = createProgram();
    registerCommands(program);
    const providers = program.commands.find(
      (command) => command.name() === 'providers',
    );

    expect(providers).toBeDefined();
    const subcommands =
      providers?.commands.map((command) => command.name()) ?? [];
    expect(subcommands).toEqual(expect.arrayContaining(['list', 'inspect']));
  });

  it('program has doctor command', () => {
    expect(commandNames()).toContain('doctor');
  });

  it('--help shows all commands', () => {
    const program = createProgram();
    registerCommands(program);
    const help = program.helpInformation();

    expect(help).toContain('init');
    expect(help).toContain('status');
    expect(help).toContain('sync');
    expect(help).toContain('providers');
    expect(help).toContain('doctor');
  });
});
