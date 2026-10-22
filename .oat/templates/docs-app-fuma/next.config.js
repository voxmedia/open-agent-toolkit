// {{TURBOPACK_ROOT_IMPORTS}}
import { createDocsConfig } from '@open-agent-toolkit/docs-config';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

export default createDocsConfig({
  ...(basePath ? { basePath } : {}),
  // {{TURBOPACK_ROOT_OPTION}}
});
