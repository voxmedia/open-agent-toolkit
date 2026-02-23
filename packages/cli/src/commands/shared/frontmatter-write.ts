export function upsertFrontmatterField(
  block: string,
  field: string,
  value: string,
  overwrite: boolean,
): { nextBlock: string; changed: boolean; added: boolean } {
  const matcher = new RegExp(`^${field}:\\s*([^\\n]*?)(\\s*#.*)?$`, 'm');
  const match = block.match(matcher);

  if (match) {
    if (!overwrite) {
      return { nextBlock: block, changed: false, added: false };
    }

    const comment = match[2] ?? '';
    const nextBlock = block.replace(matcher, `${field}: ${value}${comment}`);
    return { nextBlock, changed: nextBlock !== block, added: false };
  }

  const normalized = block.endsWith('\n') ? block : `${block}\n`;
  return {
    nextBlock: `${normalized}${field}: ${value}`,
    changed: true,
    added: true,
  };
}

export function replaceFrontmatter(content: string, nextBlock: string): string {
  return content.replace(/^---\n([\s\S]*?)\n---/, `---\n${nextBlock}\n---`);
}

export function removeFrontmatterField(block: string, field: string): string {
  return block
    .split('\n')
    .filter((line) => !line.startsWith(`${field}:`))
    .join('\n');
}
