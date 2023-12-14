/**
 * Shallow compare two values and return true if they are equal.
 * This function just compare the first level of the values.
 * @param value1
 * @param value2
 * @returns {boolean} true if the values are equal, false otherwise
 */
export declare const shallowCompare: <T>(value1: T, value2: T) => boolean;
/**
 * Debounce a function.
 */
export declare const debounce: <T extends (...args: any[]) => any>(callback: T, delay?: number) => (...args: Parameters<T>) => ReturnType<T>;
export declare const uniqueId: () => string;
