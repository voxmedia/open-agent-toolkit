/**
 * Read `key` from `map` only when it is an own key.
 *
 * Since `config/json.ts` materializes a key literally named `__proto__` as an
 * own data property, config-derived maps can carry names that also exist on
 * `Object.prototype`. A bare `map[name]` for a user-supplied name would
 * otherwise return an inherited member -- `Object.prototype` itself for
 * `__proto__`, a function for `constructor` or `toString` -- and read as
 * configuration that nobody wrote.
 */
export function getOwnKey<T>(
  map: Readonly<Record<string, T>>,
  key: string,
): T | undefined {
  return Object.prototype.hasOwnProperty.call(map, key)
    ? (map as Record<string, T>)[key]
    : undefined;
}

/**
 * Define `key` on `map` as an own data property.
 *
 * `map[key] = value` reaches the legacy prototype setter for a key named
 * `__proto__`, which loses the entry as data and installs its value as the
 * map's prototype. `Object.defineProperty` never invokes that setter. The
 * descriptor matches an ordinary assignment so the result is an unremarkable
 * object, exactly as `config/json.ts` does.
 */
export function setOwnKey<T>(
  map: Record<string, T>,
  key: string,
  value: T,
): void {
  Object.defineProperty(map, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}
