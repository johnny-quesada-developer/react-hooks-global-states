import type {
  ActionCollectionConfig,
  ActionCollectionResult,
  StateHook,
  BaseMetadata,
  GlobalStoreCallbacks,
  StoreTools,
} from './types';

import { GlobalStore } from './GlobalStore';

interface CreateGlobalState {
  /**
   * Creates a global state hook.
   * @param state initial state value
   * @returns a state hook for your components
   *
   * @example
   * ```tsx
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
   * ```
   *
   * @example You can also use a more semantic and declarative approach
   * ```tsx
   * const counter = createGlobalState(0);
   *
   * function Counter() {
   *   const [count, setCount] = counter.use();
   *   const count = counter.use.select();
   *
   *   counter.setState(prev => prev + 1);
   *
   *   // if you have actions
   *   counter.actions.someAction();
   * ```
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
    Metadata extends BaseMetadata,
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    ActionsConfig extends ActionCollectionConfig<State, Metadata> | null | {},
    PublicStateMutator = keyof ActionsConfig extends never | undefined
      ? React.Dispatch<React.SetStateAction<State>>
      : ActionCollectionResult<State, Metadata, NonNullable<ActionsConfig>>,
  >(
    state: State,
    args: {
      name?: string;
      metadata?: Metadata;
      callbacks?: GlobalStoreCallbacks<State, PublicStateMutator, Metadata>;
      actions?: ActionsConfig;
    },
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
    Metadata extends BaseMetadata,
    ActionsConfig extends ActionCollectionConfig<State, Metadata>,
    PublicStateMutator = ActionCollectionResult<State, Metadata, NonNullable<ActionsConfig>>,
  >(
    state: State,
    args: {
      name?: string;
      metadata?: Metadata;
      callbacks?: GlobalStoreCallbacks<State, PublicStateMutator, Metadata>;
      actions: ActionsConfig;
    },
  ): StateHook<State, PublicStateMutator, Metadata>;
}

/**
 * Creates a global state hook
 */
export const createGlobalState = ((...[state, args]: ConstructorParameters<typeof GlobalStore>) =>
  new GlobalStore(state, args).use) as CreateGlobalState;

/**
 * Infers the actions type from a StateHook
 * @example
 * ```ts
 * type CounterActions = InferActionsType<typeof useCounter>;
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InferActionsType<Hook extends StateHook<any, any, any>> = ReturnType<Hook>['1'];

/**
 * Infers the StoreTools type from a StateHook, useful to split actions code
 *
 * @example
 * ```ts
 * type CounterStoreTools = InferStateApi<typeof useCounter>;
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InferStateApi<Hook extends StateHook<any, any, any>> =
  Hook extends StateHook<infer State, infer PublicStateMutator, infer Metadata>
    ? StoreTools<State, PublicStateMutator, Metadata>
    : never;

export default createGlobalState;
