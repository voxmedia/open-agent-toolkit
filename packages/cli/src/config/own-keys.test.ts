import { describe, expect, it } from 'vitest';

import { getOwnKey, setOwnKey } from './own-keys';

describe('setOwnKey', () => {
  it('stores a `__proto__` entry as an own key instead of a prototype', () => {
    const map: Record<string, { command: string }> = {};
    setOwnKey(map, '__proto__', { command: 'echo pwned' });

    expect(Object.keys(map)).toContain('__proto__');
    expect(Object.getPrototypeOf(map)).toBe(Object.prototype);
    expect(Object.prototype.hasOwnProperty.call(map, '__proto__')).toBe(true);
    // Round-trips through JSON with the key intact. The expected shape is
    // built with `Object.fromEntries` because an object literal spelling of
    // the same key would set the literal's prototype instead of an own key.
    expect(JSON.stringify(map)).toContain('"__proto__"');
    const roundTripped = JSON.parse(JSON.stringify(map)) as Record<
      string,
      unknown
    >;
    expect(Object.keys(roundTripped)).toEqual(['__proto__']);
    expect(roundTripped).toEqual(
      Object.fromEntries([['__proto__', { command: 'echo pwned' }]]),
    );
    // The injected members never become readable through the map itself.
    expect('command' in map).toBe(false);
    // The global prototype chain is untouched.
    expect(({} as Record<string, unknown>).command).toBeUndefined();
  });

  it('behaves exactly like assignment for an ordinary name', () => {
    const map: Record<string, number> = {};
    setOwnKey(map, 'real', 1);

    expect(Object.getOwnPropertyDescriptor(map, 'real')).toEqual({
      value: 1,
      enumerable: true,
      writable: true,
      configurable: true,
    });
    expect(Object.entries(map)).toEqual([['real', 1]]);

    setOwnKey(map, 'real', 2);
    expect(map.real).toBe(2);

    map.real = 3;
    expect(map.real).toBe(3);
  });
});

describe('getOwnKey', () => {
  it('returns undefined for inherited member names the map does not own', () => {
    const map: Record<string, string> = { real: 'value' };

    expect(getOwnKey(map, '__proto__')).toBeUndefined();
    expect(getOwnKey(map, 'constructor')).toBeUndefined();
    expect(getOwnKey(map, 'toString')).toBeUndefined();
    expect(getOwnKey(map, 'missing')).toBeUndefined();
  });

  it('returns the stored value for keys the map owns', () => {
    const map: Record<string, string> = { real: 'value' };
    setOwnKey(map, '__proto__', 'injected');
    setOwnKey(map, 'toString', 'shadowed');

    expect(getOwnKey(map, 'real')).toBe('value');
    expect(getOwnKey(map, '__proto__')).toBe('injected');
    expect(getOwnKey(map, 'toString')).toBe('shadowed');
  });
});
