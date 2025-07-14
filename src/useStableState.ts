import { useCallback, useEffect, useRef, useState } from 'react';

type Cleanup = () => void;
type StateBuilder<T> = () => [state: T, cleanup?: Cleanup];
type RefObject<T> = { current: T };

/**
 * @deprecated
 * - Only one stable initial render
 * - Only one stable cleanup every time dependencies change
 * - Initial render doesn't trigger cleanup
 * - Starts cold, returns null until the first render or fallback if provided
 */
export const useStableState = <T, F extends T | never>(
  builder: StateBuilder<T>,
  dependencies: unknown[],
  fallbackArg?: F
): F extends T ? RefObject<T> : RefObject<T> | null => {
  const [, setState] = useState({});
  const recompute = useCallback(() => {
    setState({});
  }, []);

  const stableProps = useRef({
    builder,
    stateRef: null as RefObject<T> | null,
    fallback: fallbackArg ? { current: fallbackArg } : undefined,
    isMounted: false,
  });

  // keep builder up to date
  stableProps.current.builder = builder;

  // unique effect for the first render
  useEffect(() => {
    const { builder } = stableProps.current;
    const [current, cleanup] = builder();

    stableProps.current.stateRef = { current };
    recompute();

    // prevents cleaning up on the first render
    if (!stableProps.current.isMounted) {
      stableProps.current.isMounted = true;
      return;
    }

    return () => {
      cleanup?.();
    };
  }, [recompute, ...dependencies]);

  const { stateRef, fallback } = stableProps.current;
  const result = stateRef ?? fallback ?? null;
  return result as F extends T ? RefObject<T> : RefObject<T> | null;
};

export default useStableState;
