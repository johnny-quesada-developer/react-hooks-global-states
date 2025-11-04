import React, {
  type PropsWithChildren,
  createContext as reactCreateContext,
  useContext,
  createElement as reactCreateElement,
  useMemo,
  useEffect,
  Context as ReactContext,
} from 'react';
import { createObservable, createSelectorHook as createSelectorHookBase, GlobalStore } from './GlobalStore';
import type {
  ActionCollectionConfig,
  StateHook,
  ActionCollectionResult,
  BaseMetadata,
  GlobalStoreCallbacks,
  UseHookConfig,
  AnyFunction,
  StateApi,
  StoreTools,
  SelectorCallback,
  ReadonlyStateApi,
  ReadonlyHook,
} from './types';
import { isFunction } from 'json-storage-formatter/isFunction';
import { isNil } from 'json-storage-formatter/isNil';

export type ContextProviderExtensions<State, StateMutator, Metadata extends BaseMetadata> = {
  /**
   * Creates a provider wrapper which allows to capture the context value,
   * useful for testing purposes.
   * @param options configuration options for the provider wrapper
   * @param options.value optional initial state or initializer function
   * @param options.onCreated optional callback invoked after the context is created
   * @returns an object containing the wrapper component and a reference to the context value
   */
  makeProviderWrapper: (options?: {
    value?: State | ((initialValue: State) => State);
    onCreated?: (
      context: StoreTools<State, StateMutator extends AnyFunction ? null : StateMutator, Metadata>,
    ) => void;
  }) => {
    /**
     * Provider for the context
     */
    wrapper: React.FC<
      PropsWithChildren<{
        value?: State | ((initialValue: State) => State);
      }>
    >;

    /**
     * Reference to the current context value
     */
    context: {
      current: StoreTools<State, StateMutator extends AnyFunction ? null : StateMutator, Metadata>;
    };
  };
};

/**
 * @description Creates a React context provider component for the given global state.
 * @param value Optional initial state or initializer function, useful for testing.
 * @param onCreated Optional callback invoked after the context is created, receiving the full context instance.
 */
export type ContextProvider<State, StateMutator, Metadata extends BaseMetadata> = React.FC<
  PropsWithChildren<{
    value?: State | ((initialValue: State) => State);
    onCreated?: (
      context: StoreTools<State, StateMutator extends AnyFunction ? null : StateMutator, Metadata>,
    ) => void;
  }>
> &
  ContextProviderExtensions<State, StateMutator, Metadata>;

/**
 * @description Represents a hook that returns a readonly state.
 */
interface ReadonlyContextHook<State, StateMutator, Metadata extends BaseMetadata>
  extends ReadonlyContextPublicApi<State, StateMutator, Metadata> {
  (): State;

  <Derivate>(selector: (state: State) => Derivate, dependencies?: unknown[]): Derivate;

  <Derivate>(selector: (state: State) => Derivate, config?: UseHookConfig<Derivate, State>): Derivate;
}

/**
 * @description Hook for accessing a context's state, mutator (setState or actions), and metadata.
 * @returns A read-only tuple containing:
 *  - state: the current state, or the derived value when a selector is used
 *  - stateMutator: a function or actions collection to update the state
 *  - metadata: the current context metadata
 *
 * @example
 * ```tsx
 * // Simple usage (full state)
 * const [state, setState] = useTodosContext();
 *
 * // With a selector (preferred for render isolation)
 * const [todos, actions] = useTodosContext(s => s.todos);
 *
 * actions.setTodos(next);
 * ```
 */
export interface ContextHook<State, StateMutator, Metadata extends BaseMetadata>
  extends ContextPublicApi<State, StateMutator, Metadata> {
  /**
   * @description Retrieves the full state, state mutator (setState or actions), and metadata.
   */
  (): Readonly<[state: State, stateMutator: StateMutator, metadata: Metadata]>;

  /**
   * @description Retrieves a derived value from the state using the provided selector function.
   * @param selector A function that selects a part of the state.
   * @param dependencies Optional array of dependencies to control when the selector is re-evaluated.
   * @returns A read-only tuple containing the derived state, state mutator (setState or actions), and metadata.
   */
  <Derivate>(
    selector: (state: State) => Derivate,
    dependencies?: unknown[],
  ): Readonly<[state: Derivate, stateMutator: StateMutator, metadata: Metadata]>;

  /**
   * @description Retrieves a derived value from the state using the provided selector function.
   * @param selector A function that selects a part of the state.
   * @param dependencies Optional array of dependencies to control when the selector is re-evaluated.
   * @returns A read-only tuple containing the derived state, state mutator (setState or actions), and metadata.
   */
  <Derivate>(
    selector: (state: State) => Derivate,
    config?: UseHookConfig<Derivate, State>,
  ): Readonly<[state: Derivate, stateMutator: StateMutator, metadata: Metadata]>;
}

export type ContextPublicApi<State, StateMutator, Metadata extends BaseMetadata> = {
  /**
   * @description Creates a derived hook that subscribes to a selected fragment of the context state.
   * The selector determines which portion of the state the new hook exposes.
   * This hook must be used within the corresponding context provider.
   *
   * @param selector A function that selects a part of the state.
   * @param args Optional configuration for the derived hook, including:
   *  - isEqual: A function to compare the current and next selected fragment for equality.
   *  - isEqualRoot: A function to compare the entire state for equality.
   *  - name: An optional name for debugging purposes.
   * @returns A new context hook that provides access to the selected fragment of the state,
   * along with the state mutator and metadata.
   *
   * @example
   * ```tsx
   * const useTodos = createContext({
   *   todos: [],
   *   filter: '',
   * }, {
   * actions: {
   *   setFilter(filter: string) {
   *   ...
   * });
   *
   * const useFilter = useTodos.createSelectorHook((state) => {
   *   return state.filter;
   * });
   *
   * function FilterComponent() {
   *   // The selector only listen to the selected fragment (filter)
   *   // But has access to the full actions collection
   *   const [filter, { setFilter }] = useFilter();
   *
   *   return (
   *     <input
   *       value={filter}
   *       onChange={(e) => setFilter(e.target.value)}
   *     />
   *   );
   * }
   * ```
   */
  createSelectorHook: <Derivate>(
    this: ReadonlyContextPublicApi<State, StateMutator, Metadata>,
    selector: (state: State) => Derivate,
    args?: Omit<UseHookConfig<Derivate, State>, 'dependencies'> & {
      name?: string;
    },
  ) => ReadonlyContextHook<Derivate, StateMutator, Metadata>;

  /**
   * @description Hook that provides non-reactive access to the context API.
   * This allows direct interaction with the context’s state, metadata, and actions
   * without triggering component re-renders.
   * @returns An object containing the context API methods and properties.
   */
  api: () => StateApi<State, StateMutator, Metadata>;
};

/**
 * @description Readonly version of the ContextPublicApi, expose by selectors and observables
 */
export type ReadonlyContextPublicApi<State, StateMutator, Metadata extends BaseMetadata> = Pick<
  ContextPublicApi<State, StateMutator, Metadata>,
  'createSelectorHook'
> & {
  api: () => ReadonlyStateApi<State, StateMutator, Metadata>;
};

interface CreateContext {
  /**
   * @description Creates a highly granular React context with its associated provider and state hook.
   * @param value Initial state value or initializer function.
   * @returns An object containing:
   * - **`use`** — A custom hook to read and mutate the context state.
   *   Supports selectors for granular subscriptions and returns `[state, stateMutator, metadata]`.
   * - **`Provider`** — A React component that provides the context to its descendants.
   *   It accepts an optional initial value and `onCreated` callback.
   * - **`Context`** — The raw React `Context` object for advanced usage, such as integration with
   *   external tools or non-React consumers.
   */
  <State, StateMutator = React.Dispatch<React.SetStateAction<State>>>(
    value: State | (() => State),
  ): {
    use: ContextHook<State, StateMutator, BaseMetadata>;
    Provider: ContextProvider<State, StateMutator, BaseMetadata>;
    Context: ReactContext<ContextHook<State, StateMutator, BaseMetadata> | null>;
  };

  /**
   * @description Creates a highly granular React context with its associated provider and state hook.
   * @param value Initial state value or initializer function.
   * @param args Additional configuration for the context.
   * @param args.name Optional name for debugging purposes.
   * @param args.metadata Optional non-reactive metadata associated with the state.
   * @param args.callbacks Optional lifecycle callbacks for the context.
   * @param args.actions Optional actions to restrict state mutations [if provided `setState` will be nullified].
   * @returns An object containing:
   * - **`use`** — A custom hook to read and mutate the context state.
   *   Supports selectors for granular subscriptions and returns `[state, stateMutator, metadata]`.
   * - **`Provider`** — A React component that provides the context to its descendants.
   *   It accepts an optional initial value and `onCreated` callback.
   * - **`Context`** — The raw React `Context` object for advanced usage, such as integration with
   *   external tools or non-React consumers.
   */
  <
    State,
    Metadata extends BaseMetadata,
    ActionsConfig extends ActionCollectionConfig<State, Metadata> | null | {},
    StateMutator = keyof ActionsConfig extends never | undefined
      ? React.Dispatch<React.SetStateAction<State>>
      : ActionCollectionResult<State, Metadata, NonNullable<ActionsConfig>>,
  >(
    value: State | (() => State),
    args: {
      name?: string;
      metadata?: Metadata | (() => Metadata);
      callbacks?: GlobalStoreCallbacks<State, StateMutator, Metadata> & { onUnMount?: () => void };
      actions?: ActionsConfig;
    },
  ): {
    use: ContextHook<State, StateMutator, Metadata>;
    Provider: ContextProvider<State, StateMutator, Metadata>;
    Context: ReactContext<ContextHook<State, StateMutator, Metadata> | null>;
  };

  /**
   * @description Creates a highly granular React context with its associated provider and state hook.
   * @param value Initial state value or initializer function.
   * @param args Additional configuration for the context.
   * @param args.name Optional name for debugging purposes.
   * @param args.metadata Optional non-reactive metadata associated with the state.
   * @param args.callbacks Optional lifecycle callbacks for the context.
   * @param args.actions Optional actions to restrict state mutations [if provided `setState` will be nullified].
   * @returns An object containing:
   * - **`use`** — A custom hook to read and mutate the context state.
   *   Supports selectors for granular subscriptions and returns `[state, stateMutator, metadata]`.
   * - **`Provider`** — A React component that provides the context to its descendants.
   *   It accepts an optional initial value and `onCreated` callback.
   * - **`Context`** — The raw React `Context` object for advanced usage, such as integration with
   *   external tools or non-React consumers.
   */
  <
    State,
    Metadata extends BaseMetadata,
    ActionsConfig extends ActionCollectionConfig<State, Metadata>,
    StateMutator = React.Dispatch<React.SetStateAction<State>>,
  >(
    value: State | (() => State),
    args: {
      name?: string;
      metadata?: Metadata | (() => Metadata);
      callbacks?: GlobalStoreCallbacks<State, StateMutator, Metadata> & { onUnMount?: () => void };
      actions: ActionsConfig;
    },
  ): {
    use: ContextHook<State, ActionCollectionResult<State, Metadata, ActionsConfig>, Metadata>;
    Provider: ContextProvider<State, ActionCollectionResult<State, Metadata, ActionsConfig>, Metadata>;
    Context: ReactContext<ContextHook<
      State,
      ActionCollectionResult<State, Metadata, ActionsConfig>,
      Metadata
    > | null>;
  };
}

/**
 * @description Creates a highly granular React context with its associated provider and state hook.
 * Unlike the native `React.createContext`, this version provides fine-grained reactivity and supports
 * state selection, metadata handling, and optional custom actions for controlled mutations.
 *
 * Components using the generated hook only re-render when the selected part of the state changes,
 * making it efficient for large or deeply nested state trees.
 */
export const createContext = ((
  valueArg: unknown | (() => unknown),
  args: {
    name?: string;
    metadata?: BaseMetadata | (() => BaseMetadata);
    callbacks?: GlobalStoreCallbacks<unknown, unknown, BaseMetadata> & { onUnMount?: () => void };
    actions?: ActionCollectionConfig<unknown, BaseMetadata>;
  } = {},
) => {
  const Context = reactCreateContext<StateHook<unknown, unknown, BaseMetadata> | null>(null);

  type ProviderProps = Parameters<ContextProvider<unknown, unknown, BaseMetadata>>[0];

  const Provider = ({ children, value: initialState, onCreated }: ProviderProps) => {
    const store = useMemo(() => {
      const getInheritedState = () => (isFunction(valueArg) ? valueArg() : valueArg);

      const state: unknown = (() => {
        if (!isNil(initialState))
          return isFunction(initialState) ? initialState(getInheritedState()) : initialState;

        return getInheritedState();
      })();

      const store = new GlobalStore<unknown, BaseMetadata, unknown, unknown>(state, {
        ...args,
        metadata: (isFunction(args.metadata) ? args.metadata() : args.metadata) ?? {},
      });

      return store;
    }, []);

    // cleanup function to be called when the component unmounts
    useEffect(() => {
      return () => {
        store.callbacks?.onUnMount?.(store);

        // Required by the global hooks developer tools
        (store as unknown as { __onUnMountContext: (...args: unknown[]) => unknown }).__onUnMountContext?.(
          store,
        );

        store.dispose();
      };
    }, [store]);

    onCreated?.(store.getConfigCallbackParam());

    return reactCreateElement(Context.Provider, { value: store.use }, children);
  };

  const providerExtensions: ContextProviderExtensions<unknown, unknown, BaseMetadata> = {
    makeProviderWrapper: (options) => {
      const context = {
        current: undefined as unknown as StoreTools<any, any, any>,
      };

      const wrapper = ({ children }: PropsWithChildren) => {
        return reactCreateElement(
          Provider,
          {
            value: options?.value,
            onCreated: (ctx) => {
              context.current = ctx;
              options?.onCreated?.(ctx);
            },
          },
          children,
        );
      };

      return { wrapper, context };
    },
  };

  const use = ((...args: Parameters<ContextHook<unknown, unknown, BaseMetadata>>) => {
    const hook = useContext(Context);
    if (!hook) throw new Error('use hook must be used within a ContextProvider');

    return hook(...args);
  }) as ContextHook<unknown, unknown, BaseMetadata> & ContextPublicApi<unknown, unknown, BaseMetadata>;

  const api = () => {
    const hook = useContext(Context);
    if (!hook) throw new Error('api hook must be used within a ContextProvider');

    // the hook contains the api methods
    // no need to build anything else
    return hook as StateApi<unknown, unknown, BaseMetadata>;
  };

  const useExtensions: ContextPublicApi<unknown, unknown, BaseMetadata> = {
    createSelectorHook: createSelectorHook.bind(use) as typeof use.createSelectorHook,
    api,
  };

  Object.assign(Provider, providerExtensions);
  Object.assign(use, useExtensions);

  return {
    use,
    Provider,
    Context,
  };
}) as CreateContext;

/**
 * @description Infers the context API type
 *
 * @example
 * ```ts
 * const counter = createContext(0);
 *
 * type CounterContextApi = InferContextApi<typeof counter.Context>;
 *
 * // Equivalent to:
 * ContextApi<number, React.Dispatch<React.SetStateAction<number>>, BaseMetadata>;
 * ```
 */
export type InferContextApi<Context extends ReactContext<ContextHook<any, any, BaseMetadata> | null>> =
  NonNullable<React.ContextType<Context>> extends ContextHook<infer State, infer StateMutator, infer Metadata>
    ? StateApi<State, StateMutator extends AnyFunction ? null : StateMutator, Metadata>
    : never;

/**
 * @description Creates a selector hook that allows you to subscribe to a fragment of the context state
 * @param mainSelector A function that selects a fragment of the state
 * @param mainOptions Additional configuration for the selector hook
 * @param mainOptions.isEqual Optional equality function to compare the selected fragment
 * @param mainOptions.isEqualRoot Optional equality function to compare the root state
 * @returns A context hook that provides the selected fragment
 *
 * @example
 * ```tsx
 * const useTodoCount = useTodosContext.createSelectorHook(
 *   (state) => state.todos.length
 * );
 *
 * function TodoCount() {
 *
 *   const [count] = useTodoCount(); // TodoCount should be within the TodosContext provider
 *   return <div>Todo Count: {count}</div>;
 * }
 * ```
 */
function createSelectorHook(
  this: Pick<ReadonlyContextPublicApi<unknown, unknown, BaseMetadata>, 'api'>,
  selector: SelectorCallback<unknown, unknown>,
  hookConfig?: UseHookConfig<unknown, unknown>,
): ReadonlyContextHook<unknown, unknown, BaseMetadata> {
  type SelectorArgs = Parameters<
    ReturnType<ContextPublicApi<unknown, unknown, BaseMetadata>['createSelectorHook']>
  >;
  const use = ((...selectorArgs: SelectorArgs) => {
    const context = this.api();

    return useMemo(() => {
      return context.createSelectorHook(selector, hookConfig);
    }, [context])(...selectorArgs);
  }) as ReadonlyContextHook<unknown, unknown, BaseMetadata>;

  const api = (): ReadonlyStateApi<unknown, unknown, BaseMetadata> => {
    const context = this.api();

    return useMemo(() => {
      const observable = context.createObservable(selector, hookConfig);

      return {
        ...context,
        getState: () => observable.getState(),
        subscribe: observable.subscribe.bind(observable),
        createSelectorHook: createSelectorHookBase.bind(observable),
        createObservable: createObservable.bind(observable),
      } as ReadonlyStateApi<unknown, unknown, BaseMetadata>;
    }, [context]);
  };

  const publicExtensions: ReadonlyContextPublicApi<unknown, unknown, BaseMetadata> = {
    createSelectorHook: createSelectorHook.bind(use) as typeof use.createSelectorHook,
    api,
  };

  Object.assign(use, publicExtensions);

  return use;
}

export default createContext;
