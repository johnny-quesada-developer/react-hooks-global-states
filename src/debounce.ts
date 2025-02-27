/**
 * @deprecated will be removed in the next major version
 */
export const debounce = <T extends (...args: any[]) => void>(callback: T, delay = 0) => {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>): void => {
    if (timeout) clearTimeout(timeout);

    timeout = setTimeout(() => {
      callback(...args);
    }, delay);
  };
};

export default debounce;
