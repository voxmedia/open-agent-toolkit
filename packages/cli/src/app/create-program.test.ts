import { describe, expect, it } from 'vitest';

import { createProgram } from './create-program';

describe('createProgram', () => {
  it('creates a commander program named "oat"', () => {
    const program = createProgram();

    expect(program.name()).toBe('oat');
  });

  it('registers --json global flag', () => {
    const program = createProgram();

    const optionNames = program.options.map((option) => option.long);
    expect(optionNames).toContain('--json');
  });

  it('registers --verbose global flag', () => {
    const program = createProgram();

    const optionNames = program.options.map((option) => option.long);
    expect(optionNames).toContain('--verbose');
  });

  it('registers --scope global option with choices', () => {
    const program = createProgram();

    const scopeOption = program.options.find(
      (option) => option.long === '--scope',
    );
    expect(scopeOption).toBeDefined();
    expect(scopeOption?.argChoices).toEqual(['project', 'user', 'all']);
  });

  it('registers --cwd global option', () => {
    const program = createProgram();

    const optionNames = program.options.map((option) => option.long);
    expect(optionNames).toContain('--cwd');
  });
});
