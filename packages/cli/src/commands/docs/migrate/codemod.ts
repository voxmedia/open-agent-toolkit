export interface CodemodResult {
  content: string;
  admonitionsConverted: number;
}

const ADMONITION_TYPE_MAP: Record<string, string> = {
  note: 'NOTE',
  info: 'NOTE',
  abstract: 'NOTE',
  question: 'NOTE',
  quote: 'NOTE',
  warning: 'WARNING',
  tip: 'TIP',
  success: 'TIP',
  example: 'TIP',
  important: 'IMPORTANT',
  caution: 'CAUTION',
  danger: 'CAUTION',
  failure: 'CAUTION',
  bug: 'CAUTION',
};

const ADMONITION_RE = /^(?:!!!|\?\?\?)\s+(\w+)(?:\s+"([^"]*)")?\s*$/;

export function convertAdmonitions(content: string): CodemodResult {
  const lines = content.split('\n');
  const output: string[] = [];
  let admonitionsConverted = 0;
  let i = 0;

  while (i < lines.length) {
    const match = ADMONITION_RE.exec(lines[i]!);
    if (!match) {
      output.push(lines[i]!);
      i++;
      continue;
    }

    const typeName = match[1]!.toLowerCase();
    const title = match[2] ?? undefined;
    const gfmType = ADMONITION_TYPE_MAP[typeName] ?? 'NOTE';

    // GitHub-style alerts (and the Fumadocs alert plugin) do not support a
    // custom title on the marker line. Emit a bare `> [!TYPE]` marker and
    // promote the admonition's title to a bold first body line so it survives
    // rendering instead of being demoted to the generic type label.
    output.push(`> [!${gfmType}]`);
    admonitionsConverted++;
    i++;

    if (title) {
      output.push(`> **${title}**`);
      // Separate the promoted title from the body with a blockquote blank so it
      // renders as its own paragraph — but only when body content follows.
      if (i < lines.length && lines[i]!.startsWith('    ')) {
        output.push('>');
      }
    }

    while (i < lines.length) {
      const line = lines[i]!;
      if (line.startsWith('    ')) {
        output.push(`> ${line.slice(4)}`);
        i++;
      } else if (line === '') {
        // Check if next line is indented (continuation)
        if (i + 1 < lines.length && lines[i + 1]!.startsWith('    ')) {
          output.push('>');
          i++;
        } else {
          break;
        }
      } else {
        break;
      }
    }
  }

  return {
    content: output.join('\n'),
    admonitionsConverted,
  };
}
