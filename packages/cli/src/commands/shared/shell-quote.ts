/**
 * Quote one shell word for a command the CLI prints for the user to run.
 * Plain paths and names stay bare; anything else is single-quoted.
 */
export function shellQuote(value: string): string {
  return /^[a-zA-Z0-9_./-]+$/.test(value)
    ? value
    : `'${value.replaceAll("'", "'\\''")}'`;
}
