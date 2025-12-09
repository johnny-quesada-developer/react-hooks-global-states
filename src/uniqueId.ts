/**
 * A branded unique identifier type
 */
export type BrandedId<T extends string | undefined> = `${T extends string ? T : ''}${string}` & {
  __brand: T;
};

/**
 * Generates a unique identifier string, optionally prefixed.
 * @param prefix - Optional string to prefix the unique ID
 * @returns A unique identifier string
 *
 * @example
 * uniqueId(); // e.g., "k9j3n5x8q2"
 * uniqueId('user:'); // e.g., "user:k9j3n5x8q2"
 *
 * // Creating a reusable unique ID generator for a specific prefix
 * const makeOrderId = uniqueId.for('order:');
 * makeOrderId(); // e.g., "order:k9j3n5x8q2"
 * makeOrderId.assert('order:k9j3n5x8q2'); // true
 * makeOrderId.assert('user:k9j3n5x8q2
 */
export const uniqueId = (() => {
  let counter = 0;

  const getBrandedId = <T extends string | undefined>(prefix: T, base: number) => {
    return (prefix + Date.now().toString(36) + base.toString(36)) as BrandedId<T>;
  };

  const $uniqueId = <T extends string | undefined>(prefix?: T) => {
    if (counter === Number.MAX_SAFE_INTEGER) counter = 0;

    return getBrandedId(prefix, counter++) as BrandedId<T>;
  };

  /**
   * Creates a reusable unique ID generator for a specific prefix
   * Brands the id with the given prefix
   * @param prefix - The prefix to brand the unique ID
   * @returns A function that generates branded unique IDs
   * @example
   * const makeSessionId = uniqueId.for('session:');
   * const sessionId = makeSessionId(); // e.g., "session:k9j3n5x8q2"
   * makeSessionId.is(sessionId); // true
   * makeSessionId.assert(sessionId); // no error
   */
  $uniqueId.for = <T extends string>(prefix: T) => {
    let $counter = 0;

    const generateBrandedId = (): BrandedId<T> => {
      if ($counter === Number.MAX_SAFE_INTEGER) $counter = 0;

      return getBrandedId(prefix, $counter++);
    };

    /**
     * Checks if the give value match the structure of the branded ID
     */
    generateBrandedId.is = (value: unknown): value is BrandedId<T> => {
      return typeof value === 'string' && value.startsWith(prefix);
    };

    /**
     * Asserts that the given value is a branded ID, throws an error if not
     */
    generateBrandedId.assert = function (value: unknown): asserts value is BrandedId<T> {
      if (!generateBrandedId.is(value)) {
        throw new Error(
          `The value "${String(value)}" does not match the expected prefix "${String(prefix)}"`,
        );
      }
    };

    return generateBrandedId;
  };

  /**
   * Creates a reusable unique ID generator without a prefix
   * Brands the id without adding prefix, LESS SAVE THAN .for(prefix)
   */
  $uniqueId.of = <T extends string>() => {
    return () => $uniqueId<T>();
  };

  return $uniqueId;
})();

export default uniqueId;
