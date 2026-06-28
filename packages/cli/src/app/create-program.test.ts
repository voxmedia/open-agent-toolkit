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

  it('does not register --scope as a global option', () => {
    // --scope is now a per-command option on scope-consuming commands only
    const program = createProgram();

    const optionNames = program.options.map((option) => option.long);
    expect(optionNames).not.toContain('--scope');
  });

  it('registers --cwd global option', () => {
    const program = createProgram();

    const optionNames = program.options.map((option) => option.long);
    expect(optionNames).toContain('--cwd');
  });
});
