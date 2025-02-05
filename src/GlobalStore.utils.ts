import { isPrimitive, isDate, isNil } from 'json-storage-formatter';
import { useRef } from 'react';

export const shallowCompare = <T>(value1: T, value2: T) => {
  const isEqual = value1 === value2;
  if (isEqual) return true;

  const typeofValue1 = typeof value1;
  const typeofValue2 = typeof value2;

  if (typeofValue1 !== typeofValue2) return false;

  if (
    isNil(value1) ||
    isNil(value2) ||
    (isPrimitive(value1) && isPrimitive(value2)) ||
    (isDate(value1) && isDate(value2)) ||
    (typeofValue1 === 'function' && typeofValue2 === 'function')
  ) {
    return value1 === value2;
  }

  const isArray = Array.isArray(value1);

  if (isArray) {
    const array1 = value1 as unknown[];
    const array2 = value2 as unknown[];

    if (array1.length !== array2.length) return false;

    for (let i = 0; i < array1.length; i++) {
      const value1 = array1[i];
      const value2 = array2[i];

      if (value1 !== value2) return false;
    }
  }

  const isMap = value1 instanceof Map;

  if (isMap) {
    const map1 = value1 as Map<unknown, unknown>;
    const map2 = value2 as Map<unknown, unknown>;

    if (map1.size !== map2.size) return false;

    for (const [key, value] of map1) {
      const value2 = map2.get(key);

      if (value !== value2) return false;
    }
  }

  const isSet = value1 instanceof Set;

  if (isSet) {
    const set1 = value1 as Set<unknown>;
    const set2 = value2 as Set<unknown>;

    if (set1.size !== set2.size) return false;

    for (const value of set1) {
      if (!set2.has(value)) return false;
    }
  }

  if (!isRecord(value1) || !isRecord(value2)) return value1 === value2;

  // for objects
  const keys1 = Object.keys(value1);
  const keys2 = Object.keys(value2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    const propObject1 = value1[key];
    const propObject2 = value2[key];

    if (propObject1 !== propObject2) return false;
  }

  return true;
};

export const debounce = <T extends (...args: Parameters<T>) => void>(callback: T, delay = 0) => {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>): void => {
    if (timeout) clearTimeout(timeout);

    timeout = setTimeout(() => {
      callback(...args);
    }, delay);
  };
};

export const uniqueId = ((prefix: string = '') => {
  let counter = 0;

  return (): string => {
    if (counter === Number.MAX_SAFE_INTEGER) counter = 0;

    return prefix + Date.now().toString(36) + (counter++).toString(36);
  };
})();

export const throwWrongKeyOnActionCollectionConfig = (action_key: string) => {
  throw new Error(`[WRONG CONFIGURATION!]: Every key inside the storeActionsConfig must be a higher order function that returns a function \n[${action_key}]: key is not a valid function, try something like this: \n{\n
    ${action_key}: (param) => ({ setState, getState, setMetadata, getMetadata, actions }) => {\n
      setState((state) => ({ ...state, ...param }))\n
    }\n
}\n`);
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  !isNil(value) && typeof value === 'object';

export const uniqueSymbol = Symbol('unique');

export type UniqueSymbol = typeof uniqueSymbol;

export const useConstantValueRef = <T>(initializer: () => T) => {
  const ref = useRef<typeof uniqueSymbol | T>(uniqueSymbol);

  if (ref.current === uniqueSymbol) {
    ref.current = initializer();
  }

  return ref as React.RefObject<T>;
};
