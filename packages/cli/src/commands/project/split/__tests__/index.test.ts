import { describe, expect, it } from 'vitest';

import { createProjectCommand } from '../../index';
import { createProjectSplitCommand } from '../index';

describe('oat project split (subcommand router)', () => {
  it('registers under `oat project split` and lists the ready subcommands', () => {
    const split = createProjectSplitCommand();

    expect(split.name()).toBe('split');
    expect(split.commands.map((command) => command.name())).toEqual([
      'evaluate-signals',
      'validate-plan',
      'run',
    ]);
  });

  it('is registered on the project command', () => {
    const project = createProjectCommand();

    expect(project.commands.map((command) => command.name())).toContain(
      'split',
    );
  });
});
