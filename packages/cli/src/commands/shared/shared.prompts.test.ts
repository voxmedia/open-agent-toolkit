import { CliError } from '@errors/index';
import { checkbox, confirm, input, select } from '@inquirer/prompts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  confirmAction,
  inputRequired,
  inputWithDefault,
  selectManyOrEmpty,
  selectManyWithAbort,
  selectWithAbort,
} from './shared.prompts';

vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(),
  confirm: vi.fn(),
  input: vi.fn(),
  select: vi.fn(),
}));

describe('shared prompts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('confirmAction returns false in non-interactive mode', async () => {
    const result = await confirmAction('Continue?', { interactive: false });

    expect(result).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('inputRequired returns trimmed input in interactive mode', async () => {
    vi.mocked(input).mockResolvedValueOnce('  value  ');

    const result = await inputRequired('Enter value', { interactive: true });

    expect(result).toBe('value');
  });

  it('inputRequired throws CliError for empty input', async () => {
    vi.mocked(input).mockResolvedValueOnce('   ');

    await expect(
      inputRequired('Enter value', { interactive: true }),
    ).rejects.toBeInstanceOf(CliError);
  });

  it('inputRequired returns null on prompt abort', async () => {
    const abortError = new Error('User force closed the prompt');
    abortError.name = 'ExitPromptError';
    vi.mocked(input).mockRejectedValueOnce(abortError);

    const result = await inputRequired('Enter value', { interactive: true });

    expect(result).toBeNull();
  });

  it('inputRequired throws CliError in non-interactive mode', async () => {
    await expect(
      inputRequired('Enter value', { interactive: false }),
    ).rejects.toBeInstanceOf(CliError);
  });

  it('inputWithDefault returns trimmed input in interactive mode', async () => {
    vi.mocked(input).mockResolvedValueOnce('  oat-docs  ');

    const result = await inputWithDefault('Enter value', 'default-docs', {
      interactive: true,
    });

    expect(result).toBe('oat-docs');
  });

  it('inputWithDefault returns default for empty input', async () => {
    vi.mocked(input).mockResolvedValueOnce('   ');

    const result = await inputWithDefault('Enter value', 'default-docs', {
      interactive: true,
    });

    expect(result).toBe('default-docs');
  });

  it('inputWithDefault returns null on prompt abort', async () => {
    const abortError = new Error('User force closed the prompt');
    abortError.name = 'ExitPromptError';
    vi.mocked(input).mockRejectedValueOnce(abortError);

    const result = await inputWithDefault('Enter value', 'default-docs', {
      interactive: true,
    });

    expect(result).toBeNull();
  });

  it('inputWithDefault throws CliError in non-interactive mode', async () => {
    await expect(
      inputWithDefault('Enter value', 'default-docs', { interactive: false }),
    ).rejects.toBeInstanceOf(CliError);
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

  it('selectManyWithAbort returns selected options', async () => {
    vi.mocked(checkbox).mockResolvedValueOnce(['one', 'two']);

    const result = await selectManyWithAbort(
      'Choose many',
      [
        { label: 'One', value: 'one' },
        { label: 'Two', value: 'two' },
      ],
      { interactive: true },
    );

    expect(result).toEqual(['one', 'two']);
  });

  it('selectManyWithAbort returns null on abort', async () => {
    const abortError = new Error('User force closed the prompt');
    abortError.name = 'ExitPromptError';
    vi.mocked(checkbox).mockRejectedValueOnce(abortError);

    const result = await selectManyWithAbort(
      'Choose many',
      [{ label: 'One', value: 'one' }],
      { interactive: true },
    );

    expect(result).toBeNull();
  });

  it('selectManyWithAbort throws CliError in non-interactive mode', async () => {
    await expect(
      selectManyWithAbort('Choose many', [{ label: 'One', value: 'one' }], {
        interactive: false,
      }),
    ).rejects.toBeInstanceOf(CliError);
  });

  it('selectManyOrEmpty converts abort to empty selection', async () => {
    const abortError = new Error('User force closed the prompt');
    abortError.name = 'ExitPromptError';
    vi.mocked(checkbox).mockRejectedValueOnce(abortError);

    const result = await selectManyOrEmpty(
      'Choose many',
      [{ label: 'One', value: 'one' }],
      { interactive: true },
    );

    expect(result).toEqual([]);
  });
});
