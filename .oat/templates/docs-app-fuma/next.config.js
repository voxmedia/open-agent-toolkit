import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createDocsConfig } from '@open-agent-toolkit/docs-config';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

export default createDocsConfig({
  ...(basePath ? { basePath } : {}),
  turbopack: { root: dirname(fileURLToPath(import.meta.url)) },
});
