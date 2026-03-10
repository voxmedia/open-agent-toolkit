import { describe, expect, it } from 'vitest';

import { createCleanupCommand } from './index';

describe('cleanup command', () => {
  it('registers project and artifacts subcommands', () => {
    const command = createCleanupCommand();
    const subcommands = command.commands.map((entry) => entry.name());
    expect(subcommands).toEqual(['project', 'artifacts']);
  });

  it('exposes stable descriptions for subcommands', () => {
    const command = createCleanupCommand();
    const project = command.commands.find(
      (entry) => entry.name() === 'project',
    );
    const artifacts = command.commands.find(
      (entry) => entry.name() === 'artifacts',
    );

    expect(project?.description()).toContain('state');
    expect(artifacts?.description()).toContain('artifacts');
  });
});
