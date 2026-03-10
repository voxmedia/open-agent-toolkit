import { describe, expect, it } from 'vitest';

import { createInstructionsCommand } from './index';

describe('instructions command', () => {
  it('registers validate and sync subcommands', () => {
    const command = createInstructionsCommand();
    const subcommands = command.commands.map((entry) => entry.name());
    expect(subcommands).toEqual(['validate', 'sync']);
  });

  it('exposes stable descriptions for subcommands', () => {
    const command = createInstructionsCommand();
    const validate = command.commands.find(
      (entry) => entry.name() === 'validate',
    );
    const sync = command.commands.find((entry) => entry.name() === 'sync');

    expect(validate?.description()).toContain('pointer');
    expect(sync?.description()).toContain('drift');
  });
});
