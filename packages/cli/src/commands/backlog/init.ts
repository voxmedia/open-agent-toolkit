import { access, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const INDEX_START = '<!-- OAT BACKLOG-INDEX -->';
const INDEX_END = '<!-- END OAT BACKLOG-INDEX -->';
const DIRECTORY_PLACEHOLDER = '.gitkeep';

const EMPTY_MANAGED_TABLE = [
  INDEX_START,
  '',
  '| ID | Title | Status | Priority | Scope | Estimate |',
  '| --- | --- | --- | --- | --- | --- |',
  '| _No backlog items yet_ | - | - | - | - | - |',
  '',
  INDEX_END,
].join('\n');

const STARTER_INDEX = [
  '# OAT Backlog Index',
  '',
  '> Generated backlog table lives inside the managed section below. Keep curated narrative updates in the overview section so CLI regeneration stays safe.',
  '',
  '## Curated Overview',
  '',
  '- Add brief narrative summaries here as backlog items are created and reprioritized.',
  '',
  EMPTY_MANAGED_TABLE,
  '',
  '## Notes',
  '',
  '- Active item files live in `backlog/items/`',
  '- Archived item files live in `backlog/archived/`',
  '- Historical completions are summarized in `backlog/completed.md`',
  '',
].join('\n');

const STARTER_COMPLETED = [
  '# OAT Backlog Completed',
  '',
  '> Summary archive for completed backlog work. Keep newest entries first. Use `backlog/archived/` for full file-per-item historical records when a completed item still needs rich context.',
  '',
  '## Entry Format',
  '',
  '- `YYYY-MM-DD — bl-XXXX — Title — one-line outcome summary`',
  '',
  '## Completed Items',
  '',
].join('\n');

async function writeFileIfMissing(
  filePath: string,
  content: string,
): Promise<void> {
  try {
    await access(filePath);
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : null;

    if (code !== 'ENOENT') {
      throw error;
    }

    await writeFile(filePath, content, 'utf8');
  }
}

export async function initializeBacklog(backlogRoot: string): Promise<void> {
  await mkdir(join(backlogRoot, 'items'), { recursive: true });
  await mkdir(join(backlogRoot, 'archived'), { recursive: true });
  await writeFileIfMissing(
    join(backlogRoot, 'items', DIRECTORY_PLACEHOLDER),
    '',
  );
  await writeFileIfMissing(
    join(backlogRoot, 'archived', DIRECTORY_PLACEHOLDER),
    '',
  );

  await writeFileIfMissing(join(backlogRoot, 'index.md'), STARTER_INDEX);
  await writeFileIfMissing(
    join(backlogRoot, 'completed.md'),
    STARTER_COMPLETED,
  );
}
