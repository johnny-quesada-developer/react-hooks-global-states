import React, {
  type PropsWithChildren,
  createContext as reactCreateContext,
  useContext as reactUseContext,
  createElement as reactCreateElement,
  useMemo,
  useEffect,
  useRef,
  Context as ReactContext,
} from 'react';
import { GlobalStore } from './GlobalStore';
import type {
  ActionCollectionConfig,
  StateHook,
  ActionCollectionResult,
  StateGetter,
  BaseMetadata,
  MetadataSetter,
  GlobalStoreCallbacks,
  UseHookConfig,
  ObservableFragment,
  MetadataGetter,
  SubscribeToState,
  AnyFunction,
} from './types';
import { isFunction } from 'json-storage-formatter/isFunction';
import { isNil } from 'json-storage-formatter/isNil';

/**
 * @description Context API
 */
export type ContextApi<State, Actions, Metadata extends BaseMetadata | unknown> = {
  actions: Actions;
  getMetadata: () => Metadata;
  getState: () => State;
  setMetadata: MetadataSetter<Metadata>;
  setState: React.Dispatch<React.SetStateAction<State>>;
  subscribe: SubscribeToState<State>;
};

/**
 * @description Creates a React context provider component for the given global state.
 * @param value Optional initial state or initializer function, useful for testing.
 * @param onCreated Optional callback invoked after the context is created, receiving the full context instance.
 */
export type ContextProvider<State, Actions, Metadata extends BaseMetadata | unknown> = React.FC<
  PropsWithChildren<{
    value?: State | ((initialValue: State) => State);
    onCreated?: (context: ContextApi<State, Actions, Metadata>) => void;
  }>
> & {
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
    onCreated?: (context: ContextApi<State, Actions, Metadata>) => void;
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
      current: ContextApi<State, Actions, Metadata>;
    };
  };
};

/**
 * @deprecated This result will not be obtainable in future versions.
 * Instead now the hook exposes direct access to all this controls
 *
 * @example
 * ```ts
 * const useCounter = createContext(0);
 *
 * useCounter.setState(5);
 * useCounter.getState();
 * useCounter.subscribe((state) => ...);
 * useCounter.getMetadata();
 *
 * and if actions were provided:
 * useCounter.actions.actionName(...args);
 * ```
 *
 * @description Array with the state api controls
 * - State retriever
 * - State mutator
 * - Metadata retriever
 */
export type StateControlsHook<State, StateMutator, Metadata extends BaseMetadata | unknown> = () => Readonly<
  [retriever: StateGetter<State>, mutator: StateMutator, metadata: MetadataGetter<Metadata>]
>;

/**
 * @description Creates a function that subscribes to observable fragments of the state.
 * It allows you to observe changes to specific parts of the state outside React components.
 *
 * @example
 * ```ts
 * const useTodoList = createContext({
 *   todos: [],
 *   filter: '',
 * });
 *
 * const subscribeToFilterChanges =
 *  useTodoList.createObservable((state) => {
 *    return state.filter;
 * });
 *
 * const unsubscribe = subscribeToFilterChanges((filter) => {
 *   console.log('Filter changed:', filter);
 * });
 */
export type ObservableBuilderHook<State, StateMutator, Metadata extends BaseMetadata | unknown> = <Fragment>(
  this: ContextHook<State, StateMutator, Metadata>,
  mainSelector: (state: State) => Fragment,
  args?: {
    isEqual?: (current: Fragment, next: Fragment) => boolean;
    isEqualRoot?: (current: State, next: State) => boolean;
    name?: string;
  }
) => ObservableFragment<Fragment>;

export interface ContextBaseHook<State, StateMutator, Metadata extends BaseMetadata | unknown> {
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
  <Derivate>(selector: (state: State) => Derivate, dependencies?: unknown[]): Readonly<
    [state: Derivate, stateMutator: StateMutator, metadata: Metadata]
  >;

  /**
   * @description Retrieves a derived value from the state using the provided selector function.
   * @param selector A function that selects a part of the state.
   * @param dependencies Optional array of dependencies to control when the selector is re-evaluated.
   * @returns A read-only tuple containing the derived state, state mutator (setState or actions), and metadata.
   */
  <Derivate>(selector: (state: State) => Derivate, config?: UseHookConfig<Derivate, State>): Readonly<
    [state: Derivate, stateMutator: StateMutator, metadata: Metadata]
  >;
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
export interface ContextHook<State, StateMutator, Metadata extends BaseMetadata | unknown>
  extends HookExtensions<State, StateMutator, Metadata>,
    ContextBaseHook<State, StateMutator, Metadata> {}

export type HookExtensions<State, StateMutator, Metadata extends BaseMetadata | unknown> = {
  /**
   * @deprecated This function will be removed in future versions.
   * Instead now the hook exposes direct access to the secondary hooks
   *
   * @example
   * ```ts
   * const useCounter = createContext(0);
   *
   * Component() {
   *   // non reactive access to the state api
   *   const counter = useCounter.useContextApi()
   *
   *   counter.setState(5);
   *   counter.getState();
   *   counter.subscribe((state) => ...);
   *   counter.getMetadata();
   *
   *   // and if actions were provided:
   *   counter.actions.actionName(...args);
   *
   *   useEffect(() => {
   *     // subscription outside react lifecycle
   *     const unsubscribe = counter.subscribe((state) => {
   *        console.log('State changed:', state);
   *     });
   *
   *     return unsubscribe
   *   }, []);
   *
   *   ...
   * }
   */
  stateControls: () => readonly [
    useStateControls: StateControlsHook<State, StateMutator, Metadata>,
    useObservableBuilder: ObservableBuilderHook<State, StateMutator, Metadata>
  ];

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
    this: ContextHook<State, StateMutator, Metadata>,
    selector: (state: State) => Derivate,
    args?: Omit<UseHookConfig<Derivate, State>, 'dependencies'> & {
      name?: string;
    }
  ) => ContextBaseHook<Derivate, StateMutator, Metadata>;

  /**
   * @description Hook that provides non-reactive access to the context API.
   * This allows direct interaction with the context’s state, metadata, and actions
   * without triggering component re-renders.
   * @returns An object containing the context API methods and properties.
   */
  api: () => ContextApi<State, StateMutator, Metadata>;
};

export interface CreateContext {
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
  <State>(value: State | (() => State)): {
    use: ContextHook<State, React.Dispatch<React.SetStateAction<State>>, BaseMetadata>;
    Provider: ContextProvider<State, null, BaseMetadata>;
    Context: ReactContext<ContextHook<
      State,
      React.Dispatch<React.SetStateAction<State>>,
      BaseMetadata
    > | null>;
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
    Metadata extends BaseMetadata | unknown,
    ActionsConfig extends ActionCollectionConfig<State, Metadata> | null | {},
    PublicStateMutator = keyof ActionsConfig extends never | undefined
      ? React.Dispatch<React.SetStateAction<State>>
      : ActionCollectionResult<State, Metadata, NonNullable<ActionsConfig>>
  >(
    value: State | (() => State),
    args: {
      name?: string;
      metadata?: Metadata | (() => Metadata);
      callbacks?: GlobalStoreCallbacks<State, Metadata> & { onUnMount?: () => void };
      actions?: ActionsConfig;
    }
  ): {
    use: ContextHook<State, PublicStateMutator, Metadata>;
    Provider: ContextProvider<State, PublicStateMutator, Metadata>;
    Context: ReactContext<ContextHook<State, PublicStateMutator, Metadata> | null>;
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
    Metadata extends BaseMetadata | unknown,
    ActionsConfig extends ActionCollectionConfig<State, Metadata>
  >(
    value: State | (() => State),
    args: {
      name?: string;
      metadata?: Metadata | (() => Metadata);
      callbacks?: GlobalStoreCallbacks<State, Metadata> & { onUnMount?: () => void };
      actions: ActionsConfig;
    }
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
    callbacks?: GlobalStoreCallbacks<unknown, unknown> & { onUnMount?: () => void };
    actions?: ActionCollectionConfig<unknown, unknown>;
  } = {}
) => {
  const Context = reactCreateContext<StateHook<unknown, unknown, unknown> | null>(null);

  const Provider = (({ children, value: initialState, onCreated }) => {
    const { store, parentHook } = useMemo(() => {
      const getInheritedState = () => (isFunction(valueArg) ? valueArg() : valueArg);

      const state: unknown = (() => {
        if (!isNil(initialState))
          return isFunction(initialState) ? initialState(getInheritedState()) : initialState;

        return getInheritedState();
      })();

      const store = new GlobalStore<unknown, unknown, unknown>(state, {
        ...args,
        metadata: (isFunction(args.metadata) ? args.metadata() : args.metadata) ?? {},
      });

      const parentHook = store.getHook() as StateHook<unknown, unknown, unknown>;

      return { store, parentHook };
    }, []);

    // cleanup function to be called when the component unmounts
    useEffect(() => {
      return () => {
        (store.callbacks as { onUnMount?: () => void })?.onUnMount?.();

        /**
         * Required by the global hooks developer tools
         */
        (store as unknown as { __onUnMountContext: (...args: any[]) => unknown }).__onUnMountContext?.(
          store,
          parentHook
        );

        store.dispose();
      };
    }, [store, parentHook]);

    onCreated?.(store.getConfigCallbackParam());

    return reactCreateElement(Context.Provider, { value: parentHook }, children);
  }) as ContextProvider<unknown, unknown, unknown>;

  const use = ((...args: Parameters<ContextHook<unknown, unknown, unknown>>) => {
    const useParentHook = reactUseContext(Context);
    if (!useParentHook) throw new Error('ContextHook must be used within a ContextProvider');

    return useParentHook(...args);
  }) as ContextHook<unknown, unknown, unknown>;

  /**
   * Store selectors are not created until the first time they are used
   */
  use.createSelectorHook = ((selector, hookConfig) => {
    return (...selectorArgs: []) => {
      const useContextHook = reactUseContext(Context)!;
      if (isNil(useContextHook)) throw new Error('SelectorHook must be used within a ContextProvider');

      const selectorRef = useRef(selector);
      selectorRef.current = selector;

      const useChildHook = useMemo(() => {
        if (isNil(selector)) return useContextHook;

        return useContextHook.createSelectorHook((...args) => {
          return selectorRef.current(...args);
        }, hookConfig);
      }, [useContextHook]) as StateHook<unknown, unknown, unknown> & {
        dispose: () => void;
      };

      // cleanup previous hook if it has changed
      useEffect(() => {
        return () => {
          useChildHook?.dispose();
        };
      }, [useChildHook]);

      return useChildHook!(...selectorArgs);
    };
  }) as typeof use.createSelectorHook;

  const useSateControls = () => {
    const parentHook = reactUseContext(Context)!;
    if (isNil(parentHook)) throw new Error('useStateControls must be used within a ContextProvider');

    return parentHook.stateControls();
  };

  const useObservableBuilder: ObservableBuilderHook<unknown, unknown, unknown> = (mainSelector, args) => {
    const parentHook = reactUseContext(Context)!;
    if (isNil(parentHook)) throw new Error('useObservableBuilder must be used within a ContextProvider');

    return parentHook.createObservable(mainSelector, args);
  };

  use.stateControls = () => [useSateControls, useObservableBuilder];

  Provider.makeProviderWrapper = (options) => {
    const context = {
      current: undefined as unknown as ContextApi<unknown, unknown, unknown>,
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
        children
      );
    };

    return { wrapper, context };
  };

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
export type InferContextApi<Context extends ReactContext<ContextHook<any, any, any> | null>> = NonNullable<
  React.ContextType<Context>
> extends ContextHook<infer State, infer StateMutator, infer Metadata>
  ? ContextApi<State, StateMutator extends AnyFunction ? null : StateMutator, Metadata>
  : never;

export default createContext;
