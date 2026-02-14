export function isInteractive(json: boolean): boolean {
  return Boolean(process.stdin.isTTY) && !json;
}
