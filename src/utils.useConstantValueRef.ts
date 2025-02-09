import { useRef } from 'react';
import { uniqueSymbol } from './utils.uniqueSymbol';

export const useConstantValueRef = <T>(initializer: () => T) => {
  const ref = useRef<typeof uniqueSymbol | T>(uniqueSymbol);

  if (ref.current === uniqueSymbol) {
    ref.current = initializer();
  }

  return ref as React.RefObject<T>;
};
