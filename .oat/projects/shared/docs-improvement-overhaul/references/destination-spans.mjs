import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const requireCli = createRequire(
  resolve(
    fileURLToPath(new URL('../../../../../', import.meta.url)),
    'packages/cli/package.json',
  ),
);
const requireRemark = createRequire(requireCli.resolve('remark-parse'));
const requireMdast = createRequire(
  requireRemark.resolve('mdast-util-from-markdown'),
);
const { parse, preprocess, postprocess } = await import(
  pathToFileURL(requireMdast.resolve('micromark')).href
);
const { decodeString } = await import(
  pathToFileURL(requireMdast.resolve('micromark-util-decode-string')).href
);

const ownerKey = (type, start, end) => `${type}:${start}:${end}`;

export function destinationSpans(content) {
  const events = postprocess(
    parse()
      .document()
      .write(preprocess()(content, undefined, true)),
  );
  const stack = [];
  const spans = new Map();
  for (const [event, token] of events) {
    if (event === 'exit') {
      if (stack.pop() !== token)
        throw new Error('Unbalanced Markdown token events');
      continue;
    }
    stack.push(token);
    if (
      !['resourceDestinationString', 'definitionDestinationString'].includes(
        token.type,
      )
    )
      continue;
    const owner = stack.findLast((ancestor) =>
      ['link', 'image', 'definition'].includes(ancestor.type),
    );
    if (!owner)
      throw new Error('Destination token has no link/image/definition owner');
    const key = ownerKey(owner.type, owner.start.offset, owner.end.offset);
    if (spans.has(key)) throw new Error(`Ambiguous destination token: ${key}`);
    const raw = content.slice(token.start.offset, token.end.offset);
    spans.set(key, {
      start: token.start.offset,
      end: token.end.offset,
      raw,
      decoded: decodeString(raw),
    });
  }
  return spans;
}

export function destinationSpan(node, spans) {
  const key = ownerKey(
    node.type,
    node.position.start.offset,
    node.position.end.offset,
  );
  const span = spans.get(key);
  if (!span || span.decoded !== node.url)
    throw new Error(
      `Parsed URL does not match destination token: ${key} ${JSON.stringify(node.url)}`,
    );
  return span;
}
