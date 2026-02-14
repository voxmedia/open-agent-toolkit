import { confirm, input, select } from '@inquirer/prompts';
import { CliError } from '../errors';

export interface PromptContext {
  interactive: boolean;
}

export interface SelectChoice<T extends string = string> {
  label: string;
  value: T;
  description?: string;
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'ExitPromptError' ||
      error.message.includes('User force closed'))
  );
}

export async function confirmAction(
  message: string,
  ctx: PromptContext,
): Promise<boolean> {
  if (!ctx.interactive) {
    return false;
  }

  try {
    return await confirm({ message, default: false });
  } catch (error) {
    if (isAbortError(error)) {
      return false;
    }
    throw error;
  }
}

export async function inputRequired(
  message: string,
  ctx: PromptContext,
): Promise<string | null> {
  if (!ctx.interactive) {
    throw new CliError('Input prompt requires interactive mode.', 1);
  }

  try {
    const value = (await input({ message })).trim();
    if (value.length === 0) {
      throw new CliError('Input is required.', 1);
    }
    return value;
  } catch (error) {
    if (isAbortError(error)) {
      return null;
    }
    throw error;
  }
}

export async function selectWithAbort<T extends string>(
  message: string,
  choices: SelectChoice<T>[],
  ctx: PromptContext,
): Promise<T | null> {
  if (!ctx.interactive) {
    throw new CliError('Selection prompt requires interactive mode.', 1);
  }

  try {
    const selected = await select({
      message,
      choices: choices.map((choice) => ({
        name: choice.label,
        value: choice.value,
        description: choice.description,
      })),
    });
    return selected as T;
  } catch (error) {
    if (isAbortError(error)) {
      return null;
    }
    throw error;
  }
}
