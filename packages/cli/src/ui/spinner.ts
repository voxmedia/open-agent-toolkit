import ora, { type Ora } from 'ora';

export interface Spinner {
  text: string;
  start(text?: string): Spinner;
  stop(): Spinner;
  succeed(text?: string): Spinner;
  fail(text?: string): Spinner;
  info(text?: string): Spinner;
  warn(text?: string): Spinner;
}

interface CreateSpinnerOptions {
  json: boolean;
  interactive: boolean;
}

class NoopSpinner implements Spinner {
  public text: string;

  constructor(text: string) {
    this.text = text;
  }

  start(text?: string): Spinner {
    if (text) {
      this.text = text;
    }
    return this;
  }

  stop(): Spinner {
    return this;
  }

  succeed(text?: string): Spinner {
    if (text) {
      this.text = text;
    }
    return this;
  }

  fail(text?: string): Spinner {
    if (text) {
      this.text = text;
    }
    return this;
  }

  info(text?: string): Spinner {
    if (text) {
      this.text = text;
    }
    return this;
  }

  warn(text?: string): Spinner {
    if (text) {
      this.text = text;
    }
    return this;
  }
}

export function createSpinner(
  text: string,
  options: CreateSpinnerOptions,
): Spinner {
  if (options.json || !options.interactive) {
    return new NoopSpinner(text);
  }

  return ora({ text }) as unknown as Spinner;
}
