import type {
  ActionCollectionConfig,
  ActionCollectionResult,
  StateHook,
  BaseMetadata,
  GlobalStoreCallbacks,
} from './types';

import { GlobalStore } from './GlobalStore';

export interface CreateGlobalState {
  /**
   * Creates a global state hook.
   * @param state initial state value
   * @returns a state hook for your components
   * @example
   * const useCounter = createGlobalState(0);
   *
   * function Counter() {
   *   const [count, setCount] = useCounter();
   *   return (
   *     <div>
   *       <p>Count: {count}</p>
   *       <button onClick={() =>
   *         setCount(prev => prev + 1)
   *       }>Increment</button>
   *     </div>
   *   );
   * }
   */
  <State>(state: State): StateHook<State, React.Dispatch<React.SetStateAction<State>>, BaseMetadata>;

  /**
   * Creates a global state hook that you can use across your application
   * @param state initial state value
   * @param args additional configuration for the global state
   * @param args.name optional name for debugging purposes
   * @param args.metadata optional non-reactive metadata associated with the state
   * @param args.callbacks optional lifecycle callbacks for the global state
   * @param args.actions optional actions to restrict state mutations [if provided `setState` will be nullified]
   * @returns a state hook that you can use in your components
   *
   * @example
   * ```tsx
   * const useCounter = createGlobalState(0, {
   *   actions: {
   *     increase() {
   *       return ({ setState }) => {
   *         setState((c) => c + 1);
   *       };
   *     },
   *     decrease(amount: number) {
   *       return ({ setState }) => {
   *         setState((c) => c - amount);
   *       };
   *     },
   *   },
   * });
   *
   * function Counter() {
   *  const [count, {
   *    increase,
   *    decrease
   *  }] = useCounter();
   *
   *  return (
   *   <div>
   *    <p>Count: {count}</p>
   *    <button onClick={increase}>
   *      Increment
   *    </button>
   *    <button onClick={() => {
   *      decrease(1);
   *    }}>
   *      Decrement
   *    </button>
   *   </div>
   *  );
   * }
   * ```
   */
  <
    State,
    Metadata extends BaseMetadata | unknown,
    ActionsConfig extends ActionCollectionConfig<State, Metadata> | null | {},
    PublicStateMutator = keyof ActionsConfig extends never | undefined
      ? React.Dispatch<React.SetStateAction<State>>
      : ActionCollectionResult<State, Metadata, NonNullable<ActionsConfig>>
  >(
    state: State,
    args: {
      name?: string;
      metadata?: Metadata;
      callbacks?: GlobalStoreCallbacks<State, Metadata>;
      actions?: ActionsConfig;
    }
  ): StateHook<State, PublicStateMutator, Metadata>;

  /**
   * Creates a global state hook that you can use across your application
   * @param state initial state value
   * @param args additional configuration for the global state
   * @param args.name optional name for debugging purposes
   * @param args.metadata optional non-reactive metadata associated with the state
   * @param args.callbacks optional lifecycle callbacks for the global state
   * @param args.actions optional actions to restrict state mutations [if provided `setState` will be nullified]
   * @returns a state hook that you can use in your components
   *
   * @example
   * ```tsx
   * const useCounter = createGlobalState(0, {
   *   actions: {
   *     increase() {
   *       return ({ setState }) => {
   *         setState((c) => c + 1);
   *       };
   *     },
   *     decrease(amount: number) {
   *       return ({ setState }) => {
   *         setState((c) => c - amount);
   *       };
   *     },
   *   },
   * });
   *
   * function Counter() {
   *  const [count, {
   *    increase,
   *    decrease
   *  }] = useCounter();
   *
   *  return (
   *   <div>
   *    <p>Count: {count}</p>
   *    <button onClick={increase}>
   *      Increment
   *    </button>
   *    <button onClick={() => {
   *      decrease(1);
   *    }}>
   *      Decrement
   *    </button>
   *   </div>
   *  );
   * }
   * ```
   */
  <
    State,
    Metadata extends BaseMetadata | unknown,
    ActionsConfig extends ActionCollectionConfig<State, Metadata>
  >(
    state: State,
    args: {
      name?: string;
      metadata?: Metadata;
      callbacks?: GlobalStoreCallbacks<State, Metadata>;
      actions: ActionsConfig;
    }
  ): StateHook<State, ActionCollectionResult<State, Metadata, ActionsConfig>, Metadata>;
}

/**
 * Creates a global state hook
 */
export const createGlobalState = ((
  state: unknown,
  args: {
    name?: string;
    metadata?: unknown;
    callbacks?: GlobalStoreCallbacks<unknown, unknown>;
    actions?: ActionCollectionConfig<unknown, unknown>;
  }
) => new GlobalStore(state, args).getHook()) as CreateGlobalState;

/**
 * Infers the actions type from a StateHook
 * @example
 * ```ts
 * type CounterActions = InferActionsType<typeof useCounter>;
 * ```
 */
export type InferActionsType<Hook extends StateHook<any, any, any>> = ReturnType<Hook['stateControls']>['1'];
