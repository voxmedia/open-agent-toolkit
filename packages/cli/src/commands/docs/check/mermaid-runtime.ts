import type { JSDOM } from 'jsdom';
import type { Mermaid } from 'mermaid';

let runtime: Promise<{ dom: JSDOM; mermaid: Mermaid }> | undefined;
let queue: Promise<unknown> = Promise.resolve();

async function withDom<T>(dom: JSDOM, action: () => Promise<T>): Promise<T> {
  const keys = ['window', 'document'] as const;
  const saved = keys.map((key) =>
    Object.getOwnPropertyDescriptor(globalThis, key),
  );
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: dom.window,
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: dom.window.document,
  });
  try {
    return await action();
  } finally {
    keys.forEach((key, index) => {
      const descriptor = saved[index];
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
}
async function loadRuntime(): Promise<{ dom: JSDOM; mermaid: Mermaid }> {
  const { JSDOM } = await import('jsdom');
  // Defaults intentionally disable script execution and external resources.
  const dom = new JSDOM('');
  try {
    const mermaid = await withDom(
      dom,
      async () => (await import('mermaid')).default,
    );
    process.once('beforeExit', () => dom.window.close());
    return { dom, mermaid };
  } catch (error) {
    dom.window.close();
    throw error;
  }
}
/** Lazy, real Node DOM for Mermaid syntax parsing only. Never renders SVG. */
export async function parseMermaid(source: string): Promise<void> {
  const result = queue.then(async () => {
    runtime ??= loadRuntime();
    const { dom, mermaid } = await runtime;
    await withDom(dom, async () => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        logLevel: 'fatal',
      });
      await mermaid.parse(source);
    });
  });
  queue = result.catch(() => undefined);
  await result;
}
