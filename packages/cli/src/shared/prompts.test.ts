import { confirm, select } from '@inquirer/prompts';
import { describe, expect, it, vi } from 'vitest';
import { CliError } from '../errors';
import { confirmAction, selectWithAbort } from './prompts';

vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn(),
  select: vi.fn(),
}));

describe('shared prompts', () => {
  it('confirmAction returns true when user confirms', async () => {
    vi.mocked(confirm).mockResolvedValueOnce(true);

    const result = await confirmAction('Continue?', { interactive: true });

    expect(result).toBe(true);
  });

  it('confirmAction returns false when user declines', async () => {
    vi.mocked(confirm).mockResolvedValueOnce(false);

    const result = await confirmAction('Continue?', { interactive: true });

    expect(result).toBe(false);
  });

  it('selectWithAbort returns selected option', async () => {
    vi.mocked(select).mockResolvedValueOnce('apply');

    const result = await selectWithAbort(
      'Choose',
      [
        { label: 'Apply', value: 'apply' },
        { label: 'Skip', value: 'skip' },
      ],
      { interactive: true },
    );

    expect(result).toBe('apply');
  });

  it('selectWithAbort returns null on abort', async () => {
    const abortError = new Error('User force closed the prompt');
    abortError.name = 'ExitPromptError';
    vi.mocked(select).mockRejectedValueOnce(abortError);

    const result = await selectWithAbort(
      'Choose',
      [{ label: 'Apply', value: 'apply' }],
      { interactive: true },
    );

    expect(result).toBeNull();
  });

  it('selectWithAbort throws CliError in non-interactive mode', async () => {
    await expect(
      selectWithAbort('Choose', [{ label: 'Apply', value: 'apply' }], {
        interactive: false,
      }),
    ).rejects.toBeInstanceOf(CliError);
  });
});
