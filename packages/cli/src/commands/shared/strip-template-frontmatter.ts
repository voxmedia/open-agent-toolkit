export function stripTemplateFrontmatter(content: string): string {
  if (!content.startsWith('---\n')) {
    return content;
  }

  const end = content.indexOf('\n---', 4);
  if (end === -1) {
    return content;
  }

  const frontmatter = content.slice(4, end);
  if (
    !/\boat_template\s*:/i.test(frontmatter) &&
    !/\boat_template_name\s*:/i.test(frontmatter)
  ) {
    return content;
  }

  const afterFrontmatter = content.slice(end + '\n---'.length);
  return afterFrontmatter.replace(/^\r?\n+/, '');
}
