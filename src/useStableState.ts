import { useEffect, useRef } from 'react';
import { isNil } from 'json-storage-formatter/isNil';
import { shallowCompare } from './shallowCompare';
import { useState } from 'react';
import { useCallback } from 'react';

type StateBuilder<T> = () => [state: T, cleanup?: CleanupArg];
type RefObject<T> = { current: T };
type Recompute = () => void;
type CleanupArg = (() => void) | null;

export const useStableState = <T>(
  builder: StateBuilder<T>,
  dependencies?: unknown[]
): [ref: RefObject<T>, recompute: Recompute] => {
  const props = useRef({
    refObject: null as RefObject<T> | null,
    builder: null as null | (() => RefObject<T>),
    cleanup: null as CleanupArg,
    dependencies,
  });

  // keep the builder up to date
  props.current.builder = () => {
    const [current, cleanup = null] = builder();
    props.current.cleanup = cleanup;

    return {
      current,
    };
  };

  // perform state reevaluation
  (() => {
    const isFirstRun = isNil(props.current.refObject);
    const shouldAlwaysRecalculate = isNil(dependencies);

    if (isFirstRun || shouldAlwaysRecalculate) {
      props.current.refObject = props.current.builder();
      return;
    }

    const isReevaluationNeeded = !shallowCompare(props.current.dependencies, dependencies);
    if (!isReevaluationNeeded) return;

    props.current.refObject = props.current.builder();
  })();

  // update the dependencies after the reevaluation
  props.current.dependencies = dependencies;

  // trick to force the component to re-render
  const [, setState] = useState(true);
  const recompute = useCallback(() => {
    props.current.refObject = props.current.builder!();
    setState((prev) => !prev);
  }, []);

  useEffect(() => {
    const cleanup = props.current.cleanup;
    if (!cleanup) return;

    const previousRef = props.current.refObject;

    return () => {
      // avoid cleanup if the ref object did not change
      if (previousRef === props.current.refObject) return;

      cleanup();
    };
  }, [props.current.refObject]);

  return [props.current.refObject!, recompute];
};

export default useStableState;
