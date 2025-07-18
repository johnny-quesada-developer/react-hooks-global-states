import {
  type PropsWithChildren,
  useImperativeHandle,
  createContext as reactCreateContext,
  useContext as reactUseContext,
  createElement as reactCreateElement,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import { GlobalStore } from './GlobalStore';
import type {
  ActionCollectionConfig,
  StateHook,
  StateSetter,
  ActionCollectionResult,
  StateGetter,
  BaseMetadata,
  MetadataSetter,
  GlobalStoreCallbacks,
  UseHookConfig,
  ObservableFragment,
  MetadataGetter,
} from './types';
import { isFunction } from 'json-storage-formatter/isFunction';
import { isNil } from 'json-storage-formatter/isNil';

export type ContextProviderAPI<State, Metadata extends BaseMetadata | unknown> = {
  setMetadata: MetadataSetter<Metadata>;
  setState: StateSetter<State>;
  getState: StateGetter<State>;
  getMetadata: () => Metadata;
  actions: Record<string, (...args: any[]) => void>;
};

export type ContextProvider<State, Metadata extends BaseMetadata | unknown> = React.FC<
  PropsWithChildren<{
    value?: State | ((initialValue: State) => State);
    ref?: React.RefObject<ContextProviderAPI<State, Metadata>>;
  }>
>;

export type StateControlsHook<State, StateMutator, Metadata extends BaseMetadata | unknown> = () => Readonly<
  [retriever: StateGetter<State>, mutator: StateMutator, metadata: MetadataGetter<Metadata>]
>;

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
  (): Readonly<[state: State, stateMutator: StateMutator, metadata: Metadata]>;

  <Derivate>(selector: (state: State) => Derivate, dependencies?: unknown[]): Readonly<
    [state: Derivate, stateMutator: StateMutator, metadata: Metadata]
  >;

  <Derivate>(selector: (state: State) => Derivate, config?: UseHookConfig<Derivate, State>): Readonly<
    [state: Derivate, stateMutator: StateMutator, metadata: Metadata]
  >;
}

export interface ContextHook<State, StateMutator, Metadata extends BaseMetadata | unknown>
  extends HookExtensions<State, StateMutator, Metadata>,
    ContextBaseHook<State, StateMutator, Metadata> {}

export type HookExtensions<State, StateMutator, Metadata extends BaseMetadata | unknown> = {
  stateControls: () => readonly [
    useStateControls: StateControlsHook<State, StateMutator, Metadata>,
    useObservableBuilder: ObservableBuilderHook<State, StateMutator, Metadata>
  ];

  createSelectorHook: <Derivate>(
    this: ContextHook<State, StateMutator, Metadata>,
    selector: (state: State) => Derivate,
    args?: Omit<UseHookConfig<Derivate, State>, 'dependencies'> & {
      name?: string;
    }
  ) => ContextBaseHook<Derivate, StateMutator, Metadata>;
};

export interface CreateContext {
  <State>(value: State | (() => State)): [
    ContextHook<State, StateSetter<State>, BaseMetadata>,
    ContextProvider<State, BaseMetadata>
  ];

  <
    State,
    Metadata extends BaseMetadata | unknown,
    ActionsConfig extends ActionCollectionConfig<State, Metadata> | null | {},
    PublicStateMutator = keyof ActionsConfig extends never | undefined
      ? StateSetter<State>
      : ActionCollectionResult<State, Metadata, NonNullable<ActionsConfig>>
  >(
    value: State | (() => State),
    args: {
      name?: string;
      metadata?: Metadata | (() => Metadata);
      callbacks?: GlobalStoreCallbacks<State, Metadata> & { onUnMount?: () => void };
      actions?: ActionsConfig;
    }
  ): [ContextHook<State, PublicStateMutator, Metadata>, ContextProvider<State, Metadata>];

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
  ): [
    ContextHook<State, ActionCollectionResult<State, Metadata, ActionsConfig>, Metadata>,
    ContextProvider<State, Metadata>
  ];
}

export const createContext = ((
  valueArg: unknown | (() => unknown),
  args: {
    name?: string;
    metadata?: BaseMetadata | (() => BaseMetadata);
    callbacks?: GlobalStoreCallbacks<unknown, unknown> & { onUnMount?: () => void };
    actions?: ActionCollectionConfig<unknown, unknown>;
  } = {}
) => {
  const context = reactCreateContext<StateHook<unknown, unknown, unknown> | null>(null);

  const Provider: ContextProvider<unknown, unknown> = ({ children, value: initialState, ref }) => {
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

    useImperativeHandle(
      ref,
      () => {
        const storeApi = ref ? store.getConfigCallbackParam() ?? null : {};

        return storeApi as ContextProviderAPI<unknown, unknown>;
      },
      [ref, store]
    );

    return reactCreateElement(context.Provider, { value: parentHook }, children);
  };

  const useContext = (() => {
    const useParentHook = reactUseContext(context);
    if (!useParentHook) throw new Error('ContextHook must be used within a ContextProvider');

    return useParentHook();
  }) as ContextHook<unknown, unknown, unknown>;

  /**
   * Store selectors are not created until the first time they are used
   */
  useContext.createSelectorHook = ((selector, hookConfig) => {
    return (...selectorArgs: []) => {
      const useContextHook = reactUseContext(context)!;
      if (isNil(useContextHook)) throw new Error('SelectorHook must be used within a ContextProvider');

      const selectorRef = useRef(selector);
      selectorRef.current = selector;

      const useChildHook = useMemo(() => {
        if (isNil(selector)) return useContextHook;

        return useContextHook.createSelectorHook((...args) => {
          return selectorRef.current(...args);
        }, hookConfig);
      }, [useContextHook]);

      // cleanup previous hook if it has changed
      useEffect(() => {
        return () => {
          useChildHook?.dispose();
        };
      }, [useChildHook]);

      return useChildHook!(...selectorArgs);
    };
  }) as typeof useContext.createSelectorHook;

  const useSateControls = () => {
    const parentHook = reactUseContext(context)!;
    if (isNil(parentHook)) throw new Error('useStateControls must be used within a ContextProvider');

    return parentHook.stateControls();
  };

  const useObservableBuilder: ObservableBuilderHook<unknown, unknown, unknown> = (mainSelector, args) => {
    const parentHook = reactUseContext(context)!;
    if (isNil(parentHook)) throw new Error('useObservableBuilder must be used within a ContextProvider');

    return parentHook.createObservable(mainSelector, args);
  };

  useContext.stateControls = () => [useSateControls, useObservableBuilder];

  return [useContext, Provider] as const;
}) as CreateContext;

export default createContext;
