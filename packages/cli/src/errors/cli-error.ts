export class CliError extends Error {
  constructor(
    message: string,
    public readonly exitCode: 1 | 2 = 1,
  ) {
    super(message);
    this.name = 'CliError';
  }
}
