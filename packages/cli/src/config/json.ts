import {
  parseTree,
  printParseErrorCode,
  type Node,
  type ParseError,
  type ParseOptions,
} from 'jsonc-parser';

const JSON_CONFIG_PARSE_OPTIONS: ParseOptions = {
  allowTrailingComma: true,
  disallowComments: true,
};

/**
 * Parse one OAT config document.
 *
 * This is the single parse chokepoint for every OAT config read, so the
 * prototype question is decided here rather than in each consumer.
 *
 * `jsonc-parser`'s `parse` fills a plain object by assignment, and assignment
 * to a member literally named `__proto__` reaches the legacy prototype setter.
 * That loses the key as data *and* installs its value as the parsed object's
 * prototype, after which normalization reads the injected members as though
 * they had been configured: a config file holding only
 * `{"__proto__":{"git":{"defaultBranch":"x"}}}` made `oat config get
 * git.defaultBranch` answer `x`. So the tree API is used instead, and the tree
 * is materialized here rather than by `getNodeValue`.
 *
 * Materialization defines every own key with `Object.defineProperty`, which
 * stores `__proto__` as an ordinary own data property without ever invoking
 * the prototype setter. The objects it builds are otherwise completely
 * ordinary: they keep `Object.prototype`, so every consumer coercion — most
 * importantly `String(value)` in the `projects.defaultScope` diagnostic at
 * `config/oat-config.ts` — behaves byte-identically to the previous
 * implementation, and the result round-trips through `JSON.stringify`
 * unchanged. `getNodeValue` is deliberately not used: it returns
 * null-prototype objects, which break those coercions, and it recurses, which
 * roughly halved the accepted nesting depth and turned deep-but-valid
 * documents into a `RangeError` instead of the contracted `SyntaxError`. The
 * walk below uses an explicit stack for that reason, which restores parity
 * with the previous implementation. Parity, not a guarantee: `parseTree` still
 * recurses while scanning, so the hard limit is a stack depth that moves with
 * the host and the JIT rather than a fixed number.
 *
 * The error contract is untouched: `parseTree` reports the same `ParseError`
 * codes at the same offsets as `parse` for every input, so the set of
 * documents that are rejected and the `SyntaxError` message are both
 * byte-identical to the previous implementation.
 */
export function parseJsonConfig(raw: string, configPath: string): unknown {
  const errors: ParseError[] = [];
  const root = parseTree(raw, errors, JSON_CONFIG_PARSE_OPTIONS);

  if (errors.length > 0) {
    const details = errors
      .map((error) => formatParseError(raw, error))
      .join('; ');
    throw new SyntaxError(
      `Config at ${configPath} is not valid JSON: ${details}`,
    );
  }

  // TypeScript narrowing after the rejection above: `parseTree` returns no root
  // for any document that holds no value — empty or whitespace-only content,
  // but also a stray `]` or comment-only content — and every one of those
  // records a parse error and has already thrown. The branch keeps the walk
  // total rather than describing a reachable case.
  if (root === undefined) {
    return undefined;
  }

  return materializeTree(root);
}

/**
 * Assignment that cannot be intercepted by an accessor on the prototype chain.
 *
 * `target[key] = value` would invoke the legacy `__proto__` setter; a data
 * descriptor never does. The descriptor matches what a plain assignment would
 * otherwise produce, so the property is indistinguishable from an ordinary
 * one, and re-defining a repeated key overwrites in place exactly as
 * assignment did.
 */
function defineOwnProperty(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}

interface MaterializeFrame {
  node: Node;
  attach: (value: unknown) => void;
}

/**
 * Convert a parse tree into plain JavaScript values without recursion.
 *
 * Each frame carries the callback that attaches its finished value to the
 * parent container, so containers are created on the way down and filled as
 * their children pop. Nesting depth costs a heap array entry rather than a
 * call frame, which is what keeps a deeply nested config from overflowing the
 * stack.
 */
function materializeTree(root: Node): unknown {
  let result: unknown;
  const stack: MaterializeFrame[] = [
    {
      node: root,
      attach: (value) => {
        result = value;
      },
    },
  ];

  while (stack.length > 0) {
    const frame = stack.pop();
    if (frame === undefined) {
      break;
    }
    const { node } = frame;

    if (node.type === 'array') {
      const children = node.children ?? [];
      const array: unknown[] = new Array<unknown>(children.length);
      frame.attach(array);
      // Pushed in reverse so children pop in source order.
      for (let index = children.length - 1; index >= 0; index -= 1) {
        const child = children[index];
        if (child === undefined) {
          continue;
        }
        stack.push({
          node: child,
          attach: (value) => {
            array[index] = value;
          },
        });
      }
      continue;
    }

    if (node.type === 'object') {
      const object: Record<string, unknown> = {};
      frame.attach(object);
      const properties = node.children ?? [];
      for (let index = properties.length - 1; index >= 0; index -= 1) {
        const property = properties[index];
        const keyNode = property?.children?.[0];
        const valueNode = property?.children?.[1];
        // A property with no value node is an incomplete document, which the
        // error check has already rejected; skipping it matches `getNodeValue`.
        if (keyNode === undefined || valueNode === undefined) {
          continue;
        }
        const key = String(keyNode.value);
        stack.push({
          node: valueNode,
          attach: (value) => {
            defineOwnProperty(object, key, value);
          },
        });
      }
      continue;
    }

    frame.attach(node.value);
  }

  return result;
}

function formatParseError(raw: string, error: ParseError): string {
  const location = offsetToLineColumn(raw, error.offset);
  return `${printParseErrorCode(error.error)} at ${location.line}:${location.column}`;
}

function offsetToLineColumn(
  raw: string,
  offset: number,
): { line: number; column: number } {
  const prefix = raw.slice(0, offset);
  const lines = prefix.split('\n');
  const lastLine = lines[lines.length - 1] ?? '';

  return {
    line: lines.length,
    column: lastLine.length + 1,
  };
}
