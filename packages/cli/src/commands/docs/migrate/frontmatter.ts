export interface FrontmatterResult {
  content: string;
  titleInjected: boolean;
  descriptionSeeded: boolean;
}

interface FrontmatterOptions {
  mkdocsTitle?: string;
  fileName: string;
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n/;
const HEADING_RE = /^#\s+(.+)$/m;

function fileNameToTitle(fileName: string): string {
  return fileName
    .replace(/\.md$/, '')
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function resolveTitle(content: string, options: FrontmatterOptions): string {
  if (options.mkdocsTitle) {
    return options.mkdocsTitle;
  }

  const headingMatch = HEADING_RE.exec(content);
  if (headingMatch) {
    return headingMatch[1]!.trim();
  }

  return fileNameToTitle(options.fileName);
}

export function injectFrontmatter(
  content: string,
  options: FrontmatterOptions,
): FrontmatterResult {
  const frontmatterMatch = FRONTMATTER_RE.exec(content);

  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1]!;
    const hasTitle = /^title:/m.test(frontmatter);
    const hasDescription = /^description:/m.test(frontmatter);

    if (hasTitle && hasDescription) {
      return { content, titleInjected: false, descriptionSeeded: false };
    }

    let updatedFrontmatter = frontmatter;
    let titleInjected = false;
    let descriptionSeeded = false;

    if (!hasTitle) {
      const title = resolveTitle(content, options);
      updatedFrontmatter = `title: ${title}\n${updatedFrontmatter}`;
      titleInjected = true;
    }

    if (!hasDescription) {
      updatedFrontmatter = `${updatedFrontmatter}\ndescription: ""`;
      descriptionSeeded = true;
    }

    return {
      content: content.replace(
        frontmatterMatch[0],
        `---\n${updatedFrontmatter}\n---\n`,
      ),
      titleInjected,
      descriptionSeeded,
    };
  }

  // No frontmatter — create one
  const title = resolveTitle(content, options);
  return {
    content: `---\ntitle: ${title}\ndescription: ""\n---\n\n${content}`,
    titleInjected: true,
    descriptionSeeded: true,
  };
}
