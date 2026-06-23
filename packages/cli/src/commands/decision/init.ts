import { access, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { renderDecisionManagedSection } from './regenerate-index';

export interface DecisionInitResult {
  decisionsRoot: string;
  created: string[];
  skipped: string[];
}

const STARTER_INDEX = [
  '# OAT Decision Index',
  '',
  '> Generated decision table lives inside the managed section below. Keep curated narrative updates outside the marker pair so CLI regeneration stays safe.',
  '',
  '## Curated Overview',
  '',
  '- Add brief narrative summaries here as decisions are created and migrated.',
  '',
  renderDecisionManagedSection([]),
  '',
  '## Notes',
  '',
  '- Decision records live as file-per-record Markdown files in this directory.',
  '- Regenerate this index with `oat decision regenerate` after resolving conflicts.',
  '',
].join('\n');

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : null;

    if (code !== 'ENOENT') {
      throw error;
    }

    return false;
  }
}

export async function initializeDecisionRecords(
  decisionsRoot: string,
): Promise<DecisionInitResult> {
  const created: string[] = [];
  const skipped: string[] = [];
  await mkdir(decisionsRoot, { recursive: true });

  const indexPath = join(decisionsRoot, 'index.md');
  if (await pathExists(indexPath)) {
    skipped.push('index.md');
  } else {
    await writeFile(indexPath, STARTER_INDEX, 'utf8');
    created.push('index.md');
  }

  return {
    decisionsRoot,
    created,
    skipped,
  };
}
