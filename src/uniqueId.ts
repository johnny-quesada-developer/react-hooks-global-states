export declare const __brand: unique symbol;

/**
 * Branded unique identifier
 */
export type BrandedId<T extends string | undefined> = `${T extends string ? T : ''}${string}` & {
  [__brand]: T;
};

interface UniqueId {
  /**
   * Generates a unique identifier string, optionally prefixed.
   *
   * @example
   * uniqueId();           // "k9j3n5x8q2"
   * type Id1 = `${string}` & { [__brand]: undefined };
   *
   * uniqueId('user:');    // "user:k9j3n5x8q2"
   * type Id2 = `user:${string}` & { [__brand]: 'user:' };
   */
  <T extends string | undefined>(prefix?: T): BrandedId<T>;

  /**
   * Creates a reusable unique ID generator for a specific prefix.
   *
   * @example
   * const makeOrderId = uniqueId.for('order:');
   * const id = makeOrderId(); // "order:k9j3n5x8q2"
   * type OrderId = `order:${string}` & { [__brand]: 'order:' };
   */
  for<T extends string>(
    prefix: T,
  ): {
    (): `${T}${string}` & { [__brand]: T };

    /**
     * Checks if the given value matches the branded ID for this prefix.
     */
    is(value: unknown): value is `${T}${string}` & { [__brand]: T };

    /**
     * Asserts that the value matches this branded ID, throws otherwise.
     */
    assert(value: unknown): asserts value is `${T}${string}` & { [__brand]: T };

    /**
     * Returns a strictly branded generator using a custom symbol brand.
     */
    strict<Brand extends symbol>(): {
      (): `${T}${string}` & { [__brand]: Brand };
      is(value: unknown): value is `${T}${string}` & { [__brand]: Brand };
      assert(value: unknown): asserts value is `${T}${string}` & { [__brand]: Brand };
    };
  };

  /**
   * Creates a reusable unique ID generator without a prefix.
   */
  of<T extends string>(): () => string & { [__brand]: T };

  /**
   * Creates a strictly branded unique ID generator without a prefix.
   */
  strict<Brand extends symbol>(): () => string & { [__brand]: Brand };
}

/**
 * Generates a unique identifier string, optionally prefixed.
 */
export const uniqueId: UniqueId = (() => {
  let $counter = 0;

  const counter = () => {
    if ($counter === Number.MAX_SAFE_INTEGER) $counter = 0;
    return $counter++;
  };

  const getBrandedId = <T extends string | undefined>(prefix: T, base: number) => {
    return ((prefix ?? '') + Date.now().toString(36) + base.toString(36)) as BrandedId<T>;
  };

  const $uniqueId = <T extends string | undefined>(prefix?: T) => {
    return getBrandedId(prefix, counter()) as BrandedId<T>;
  };

  /**
   * Creates a reusable unique ID generator for a specific prefix
   * Brands the id with the given prefix
   * @param prefix - The prefix to brand the unique ID
   * @returns A function that generates branded unique IDs
   * @example
   * const makeSessionId = uniqueId.for('session:', Symbol('session'));
   * const sessionId = makeSessionId(); // e.g., "session:k9j3n5x8q2"
   * makeSessionId.is(sessionId); // true
   * makeSessionId.assert(sessionId); // no error
   */
  $uniqueId.for = <T extends string>(prefix: T) => {
    type BrandedId = `${T}${string}` & {
      [__brand]: T;
    };

    const generateBrandedId = (): BrandedId => {
      return getBrandedId(prefix, counter()) as BrandedId;
    };

    /**
     * Checks if the give value match the structure of the branded ID
     */
    generateBrandedId.is = (value: unknown): value is BrandedId => {
      return typeof value === 'string' && value.startsWith(prefix);
    };

    /**
     * Asserts that the given value is a branded ID, throws an error if not
     */
    generateBrandedId.assert = function (value: unknown): asserts value is BrandedId {
      if (!generateBrandedId.is(value)) {
        throw new Error(
          `The value "${String(value)}" does not match the expected prefix "${String(prefix)}"`,
        );
      }
    };

    /**
     * You can brand to an specific symbol declaration so that that even structural matching types are not compatible
     */
    generateBrandedId.strict = <Brand extends symbol>() => {
      type BrandedId = `${T}${string}` & {
        [__brand]: Brand;
      };

      const strictBrandGenerator = generateBrandedId as unknown as {
        (): BrandedId;
        is(value: unknown): value is BrandedId;
        assert(value: unknown): asserts value is BrandedId;
      };

      return strictBrandGenerator;
    };

    return generateBrandedId;
  };

  /**
   * Creates a reusable unique ID generator without a prefix
   * It cannot be asserted since there no prefix
   */
  $uniqueId.of = <T extends string>() => {
    type BrandedId = string & {
      [__brand]: T;
    };

    const generateBrandedId = $uniqueId.for('') as unknown as {
      (): BrandedId;
    };

    return generateBrandedId;
  };

  /**
   * You can brand to an specific symbol declaration
   * It cannot be asserted since there no prefix
   */
  $uniqueId.strict = <Brand extends symbol>() => {
    type BrandedId = string & {
      [__brand]: Brand;
    };

    const strictBrandGenerator = $uniqueId as unknown as {
      (): BrandedId;
    };

    return strictBrandGenerator;
  };

  return $uniqueId;
})();

export default uniqueId;
