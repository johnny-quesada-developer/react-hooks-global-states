import { useEffect, useRef } from 'react';
import { isFunction } from 'json-storage-formatter/isFunction';
import { isNil } from 'json-storage-formatter/isNil';
import { shallowCompare } from './shallowCompare';
import { useState } from 'react';
import { useCallback } from 'react';

export interface UseStableState {
  <T>(state: T | (() => T), dependencies?: unknown[]): [ref: { value: T }, recompute: () => void];

  <T>(state: T | (() => T), cleanup: (state: T) => void, dependencies?: unknown[]): [
    ref: { value: T },
    recompute: () => void
  ];
}

export const useStableState: UseStableState = (state, ...args) => {
  const cleanup = isFunction(args[0]) ? args[0] : undefined;
  const dependencies = (cleanup ? args[1] : args[0]) as unknown[] | undefined;

  const constants = useRef({
    builder: null as (() => unknown) | null,
    cleanup,
    dependencies,
  });

  const builder = isFunction(state) ? state : () => state;
  const [ref, setState] = useState<{ value: unknown }>(() => ({
    value: builder(),
  }));

  const isFirstRun = isNil(constants.current.builder);
  const shouldAlwaysRecalculate = isNil(dependencies);

  const isRecalculationRequired =
    shouldAlwaysRecalculate || !shallowCompare(constants.current.dependencies, dependencies);

  if (!isFirstRun && isRecalculationRequired) ref.value = builder();

  constants.current.dependencies = dependencies;
  constants.current.builder = builder;
  constants.current.cleanup = cleanup;

  const recompute = useCallback(() => {
    setState({ value: constants.current.builder!() });
  }, []);

  useEffect(() => {
    return () => {
      if (!constants.current.cleanup) return;

      constants.current.cleanup(ref.value as never);
    };
  }, []);

  return [ref, recompute];
};

export default useStableState;
