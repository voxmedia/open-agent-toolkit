import {
  parse as parseJsonc,
  printParseErrorCode,
  type ParseError,
} from 'jsonc-parser';
import { describe, expect, it } from 'vitest';

import { parseJsonConfig } from './json';
import { SyncConfigSchema } from './sync-config';

const CONFIG_PATH = '/repo/.oat/config.json';

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

/**
 * Format the errors `jsonc-parser`'s `parse` collects, independently of the
 * production formatter, so the parity test below compares two implementations
 * rather than one implementation with itself.
 */
function baselineMessage(raw: string): string | null {
  const errors: ParseError[] = [];
  parseJsonc(raw, errors, {
    allowTrailingComma: true,
    disallowComments: true,
  });
  if (errors.length === 0) {
    return null;
  }

  const details = errors
    .map((error) => {
      const prefix = raw.slice(0, error.offset);
      const lines = prefix.split('\n');
      const line = lines.length;
      const column = (lines[lines.length - 1] ?? '').length + 1;
      return `${printParseErrorCode(error.error)} at ${line}:${column}`;
    })
    .join('; ');

  return `Config at ${CONFIG_PATH} is not valid JSON: ${details}`;
}

function nestedArrays(depth: number, leaf = '0'): string {
  return '['.repeat(depth) + leaf + ']'.repeat(depth);
}

describe('parseJsonConfig', () => {
  it('preserves a `__proto__` member as an own data key', () => {
    const parsed = parseJsonConfig(
      '{"version":1,"projects":{"root":".p","__proto__":{"keep":"me"},"constructor":{"c":1}}}',
      CONFIG_PATH,
    ) as { projects: Record<string, unknown> };

    expect(hasOwn(parsed.projects, '__proto__')).toBe(true);
    expect(Object.keys(parsed.projects)).toEqual([
      'root',
      '__proto__',
      'constructor',
    ]);
    expect(parsed.projects['__proto__']).toEqual({ keep: 'me' });
    // `constructor` was never at risk; assert it stayed ordinary anyway.
    expect(parsed.projects.constructor).toEqual({ c: 1 });
    expect(parsed.projects.root).toBe('.p');
  });

  it('does not install a `__proto__` member as the parsed object prototype', () => {
    // Negative control for the defect this parser exists to close. The former
    // `parse`-based implementation assigned members onto a plain object, so
    // `__proto__` hit the legacy prototype setter: the key vanished as data and
    // its value became the object's prototype, after which normalization read
    // the injected members as configured values. `oat config get
    // git.defaultBranch` answered `INJECTED` for exactly this document; it now
    // answers the built-in default.
    const parsed = parseJsonConfig(
      '{"version":1,"__proto__":{"git":{"defaultBranch":"INJECTED"}}}',
      CONFIG_PATH,
    ) as Record<string, unknown>;

    // Ordinary prototype, and the member is data rather than configuration.
    expect(Object.getPrototypeOf(parsed)).toBe(Object.prototype);
    expect(parsed.git).toBeUndefined();
    expect(hasOwn(parsed, '__proto__')).toBe(true);
    expect(parsed['__proto__']).toEqual({
      git: { defaultBranch: 'INJECTED' },
    });
    // The global prototype chain is untouched either way.
    expect(({} as Record<string, unknown>).git).toBeUndefined();
  });

  it('builds ordinary objects and arrays that survive a JSON round-trip', () => {
    const raw =
      '{"a":{"b":1},"arr":[{"c":2},"s",3,null,true],"__proto__":{"k":"v"}}';
    const parsed = parseJsonConfig(raw, CONFIG_PATH) as {
      a: object;
      arr: unknown[];
    };

    expect(Object.getPrototypeOf(parsed)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(parsed.a)).toBe(Object.prototype);
    expect(Array.isArray(parsed.arr)).toBe(true);
    expect(Object.getPrototypeOf(parsed.arr)).toBe(Array.prototype);
    expect(Object.getPrototypeOf(parsed.arr[0] as object)).toBe(
      Object.prototype,
    );
    expect(parsed.arr.slice(1)).toEqual(['s', 3, null, true]);
    expect(parsed.arr).toHaveLength(5);

    // The preserved key survives serialization, so a read-modify-write cycle
    // cannot silently drop it.
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(JSON.parse(raw));
    expect(JSON.stringify(parsed)).toContain('"__proto__"');

    // Non-object roots are returned unchanged.
    expect(parseJsonConfig('42', CONFIG_PATH)).toBe(42);
    expect(parseJsonConfig('"text"', CONFIG_PATH)).toBe('text');
    expect(parseJsonConfig('null', CONFIG_PATH)).toBeNull();
    expect(parseJsonConfig('[1,2]', CONFIG_PATH)).toEqual([1, 2]);
  });

  it('coerces to a primitive exactly as `JSON.parse` output does', () => {
    // Consumer control for `config/oat-config.ts`, whose invalid
    // `projects.defaultScope` diagnostic interpolates the raw value with
    // `String(rawDefaultScope)`. A null-prototype object has no `toString`, so
    // an earlier attempt at this fix turned that actionable CliError into
    // `TypeError: Cannot convert object to primitive value`. These objects keep
    // `Object.prototype`, so the coercion is byte-identical to before.
    for (const raw of ['{}', '[{}]', '{"a":1}', '[1,2]']) {
      const parsed = parseJsonConfig(
        `{"defaultScope":${raw}}`,
        CONFIG_PATH,
      ) as {
        defaultScope: unknown;
      };
      const baseline = (
        JSON.parse(`{"defaultScope":${raw}}`) as {
          defaultScope: unknown;
        }
      ).defaultScope;

      expect(String(parsed.defaultScope)).toBe(String(baseline));
      expect(`${parsed.defaultScope as string}`).toBe(`${baseline as string}`);
    }

    // The same guarantee for an object that actually carries the hazardous key.
    const withProto = parseJsonConfig('{"__proto__":{"x":1}}', CONFIG_PATH);
    expect(String(withProto)).toBe('[object Object]');
  });

  it('accepts trailing commas', () => {
    expect(parseJsonConfig('{"a":1,"b":[1,2,],}', CONFIG_PATH)).toEqual({
      a: 1,
      b: [1, 2],
    });
  });

  it('rejects comments with a `line:column` SyntaxError naming the config path', () => {
    let thrown: unknown;
    try {
      parseJsonConfig('{\n  "a": 1 // nope\n}', CONFIG_PATH);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(SyntaxError);
    expect((thrown as SyntaxError).message).toBe(
      `Config at ${CONFIG_PATH} is not valid JSON: InvalidCommentToken at 2:10`,
    );
  });

  it('rejects empty and whitespace-only content exactly as before', () => {
    // A document holding no value at all records `ValueExpected`, so this stays
    // a rejection rather than becoming a silent `undefined`; the previous
    // `parse`-based implementation rejected the same inputs with the same
    // message. The reported position is the end of the scanned content, so the
    // whitespace case is not `1:1`.
    const cases: [raw: string, location: string][] = [
      ['', '1:1'],
      ['   \n\t ', '2:3'],
    ];

    for (const [raw, location] of cases) {
      expect(() => parseJsonConfig(raw, CONFIG_PATH)).toThrow(SyntaxError);
      expect(() => parseJsonConfig(raw, CONFIG_PATH)).toThrow(
        `Config at ${CONFIG_PATH} is not valid JSON: ValueExpected at ${location}`,
      );
    }
  });

  it('materializes deep documents without consuming the call stack', () => {
    const deep = parseJsonConfig(
      `{"projects":{"futureSibling":${nestedArrays(1000)}}}`,
      CONFIG_PATH,
    ) as { projects: { futureSibling: unknown } };

    let cursor: unknown = deep.projects.futureSibling;
    let measured = 0;
    while (Array.isArray(cursor)) {
      measured += 1;
      cursor = cursor[0];
    }
    expect(measured).toBe(1000);
    expect(cursor).toBe(0);

    // A malformed document at depth still fails as a `SyntaxError` naming a
    // position, never as a `RangeError`.
    let thrown: unknown;
    try {
      parseJsonConfig(`{"a":${nestedArrays(1000, '0,,')}}`, CONFIG_PATH);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(SyntaxError);
    expect((thrown as SyntaxError).message).toContain(
      `Config at ${CONFIG_PATH} is not valid JSON:`,
    );
  });

  it('agrees with the previous `parse` implementation on a deeply nested document', () => {
    // Depth is the one part of the contract that cannot be pinned to a
    // constant: the usable limit is however much V8 stack is left, which moves
    // with the host, the JIT's warm-up state, and whether this runs in a Vitest
    // worker or the CLI. So this compares the two implementations on one fixed
    // document rather than searching for each one's maximum — two moving
    // maxima converge to within a frame or two once the parser code is warm,
    // which would make a comparison of them flaky rather than meaningful.
    //
    // 2400 is chosen to sit above the ceiling of a *recursive* materializer,
    // which is the regression under guard: `getNodeValue` stops near 2112 here
    // while `parse` and this parser both keep going, so that approach fails
    // this test outright.
    const document = nestedArrays(2400);

    const accepts = (run: () => void): boolean => {
      try {
        run();
        return true;
      } catch {
        return false;
      }
    };

    const baselineAccepts = accepts(() => {
      const errors: ParseError[] = [];
      parseJsonc(document, errors, {
        allowTrailingComma: true,
        disallowComments: true,
      });
      if (errors.length > 0) {
        throw new Error('rejected');
      }
    });

    // Only a claim about parity: if this host gave the previous parser enough
    // stack for the document, it has to give this one enough too.
    if (baselineAccepts) {
      expect(accepts(() => void parseJsonConfig(document, CONFIG_PATH))).toBe(
        true,
      );
    }
  });

  it('rejects exactly the documents the previous `parse` implementation rejected', () => {
    // The tree API changes how values are built, not what is accepted. For each
    // document the thrown message is compared against an independently
    // formatted baseline built from the errors `parse` collects, so a changed
    // error code, offset, ordering or line:column fails here. A regression
    // would mean a malformed config started parsing, or a valid one started
    // failing, as a side effect of the prototype fix.
    const corpus = [
      '',
      '   ',
      '{}',
      '[]',
      '{"a":1}',
      '{"a":1,}',
      '[1,2,]',
      '// lead\n{"a":1}',
      '{"a":1} // trail',
      '{/* mid */"a":1}',
      '{"a":1,,}',
      '{',
      '{"a"}',
      '{"a":}',
      '[1 2]',
      "{'a':1}",
      '{"a":undefined}',
      '{"a":1}{"b":2}',
      '{"a":1} garbage',
      '[,1]',
      '{"__proto__":{"x":1}}',
      // Multiline and multi-error documents, where a line:column or ordering
      // drift would otherwise hide.
      '{\n  "a": 1,\n  "b": // c\n}',
      '{\n  "a": ,\n  "b": ,\n}',
      '[\n  1,\n  2\n  3\n]',
    ];

    for (const raw of corpus) {
      const expected = baselineMessage(raw);

      let thrown: unknown;
      try {
        parseJsonConfig(raw, CONFIG_PATH);
      } catch (error) {
        thrown = error;
      }

      if (expected === null) {
        expect(thrown, `${JSON.stringify(raw)} must parse`).toBeUndefined();
        continue;
      }

      expect(thrown, `${JSON.stringify(raw)} must be rejected`).toBeInstanceOf(
        SyntaxError,
      );
      expect(
        (thrown as SyntaxError).message,
        `message parity for ${JSON.stringify(raw)}`,
      ).toBe(expected);
    }
  });

  it('produces objects the real `SyncConfigSchema` accepts', () => {
    // `config/sync-config.ts` feeds the parser output straight into
    // `SyncConfigSchema.safeParse`, so the production schema is used here
    // rather than a stand-in that could accept documents it would reject.
    const parsed = parseJsonConfig(
      '{"version":1,"defaultStrategy":"auto","providers":{"claude":{"enabled":true},"__proto__":{"enabled":false}}}',
      CONFIG_PATH,
    );

    const result = SyncConfigSchema.safeParse(parsed);
    expect(result.success).toBe(true);
    expect(result.success && result.data.providers?.claude?.enabled).toBe(true);
    // The input keeps the preserved key, which is the property under test here.
    expect(
      hasOwn(
        (parsed as { providers: Record<string, unknown> }).providers,
        '__proto__',
      ),
    ).toBe(true);
    // What zod then does with it is zod's business, and it is safe: `z.record`
    // validates the entry (the control below proves it is not skipped) but
    // omits it from the output object, whose prototype stays ordinary.
    expect(result.success && Object.keys(result.data.providers ?? {})).toEqual([
      'claude',
    ]);
    expect(
      result.success && Object.getPrototypeOf(result.data.providers ?? {}),
    ).toBe(Object.prototype);

    // A control that must fail, so the acceptance above is not vacuous.
    expect(
      SyncConfigSchema.safeParse(
        parseJsonConfig(
          '{"version":1,"defaultStrategy":"auto","providers":{"__proto__":"not-an-object"}}',
          CONFIG_PATH,
        ),
      ).success,
    ).toBe(false);
  });
});
