import { useState, useEffect } from 'react';
import { combineRetrieverEmitterAsynchronously } from './combiners.combineRetrieverEmitterAsynchronously';
import {
  StateGetter,
  UnsubscribeCallback,
  SelectorCallback,
  UseHookConfig,
  StateHook,
  BaseMetadata,
} from './types';
import { debounce } from './utils.debounce';
import { shallowCompare } from './utils.shallowCompare';

/**
 * @description
 * This function allows you to create a derivate state by merging the state of multiple hooks.
 * The update of the derivate state is debounced to avoid unnecessary re-renders.
 * By default, the debounce delay is 0, but you can change it by passing a delay in milliseconds as the third parameter.
 * @returns A tuple containing the subscribe function, the state getter and the dispose function
 */
export const combineRetrieverAsynchronously = <
  TDerivate,
  TArguments extends ReadonlyArray<StateGetter<unknown>>,
  TResults = {
    [K in keyof TArguments]: TArguments[K] extends StateGetter<infer R> ? R : never;
  }
>(
  parameters: {
    selector: SelectorCallback<TResults, TDerivate>;
    config?: UseHookConfig<TDerivate> & {
      delay?: number;
    };
  },
  ...args: TArguments
) => {
  const [subscribe, getState, dispose] = combineRetrieverEmitterAsynchronously(parameters, ...args);

  const useHook = (<State = TDerivate>(
    selector?: SelectorCallback<TDerivate, State>,
    config?: UseHookConfig<State> & {
      delay?: number;
    }
  ) => {
    const [state, setState] = useState<State>(() => {
      const parentState = getState();

      return selector ? selector(parentState as TDerivate) : (parentState as unknown as State);
    });

    useEffect(() => {
      const $config = {
        delay: 0,
        isEqual: shallowCompare,
        ...(config ?? {}),
      };

      const compareCallback = $config.isEqual !== undefined ? $config.isEqual : shallowCompare;

      const unsubscribe = subscribe(
        (state) => {
          return selector ? selector(state) : (state as unknown as State);
        },
        debounce((state: State) => {
          const newState = selector ? selector(state as unknown as TDerivate) : (state as State);

          if (compareCallback?.(state, newState)) return;

          setState(newState);
        }, $config.delay ?? 0)
      );

      return () => {
        unsubscribe();
      };
    }, []);

    return [state, null, null];
  }) as unknown as StateHook<TDerivate, null, BaseMetadata>;

  return [useHook, getState, dispose] as [
    useHook: typeof useHook,
    getState: StateGetter<TDerivate>,
    dispose: UnsubscribeCallback
  ];
};
