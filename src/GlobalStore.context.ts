import { uniqueId, uniqueSymbol } from './GlobalStore.utils';
import { GlobalStore } from './GlobalStore';
import {
  ActionCollectionConfig,
  StateHook,
  StateSetter,
  ActionCollectionResult,
  StateGetter,
  BaseMetadata,
  MetadataSetter,
  GlobalStoreCallbacks,
  UseHookConfig,
} from './GlobalStore.types';
import React, { PropsWithChildren, useEffect, useImperativeHandle, useMemo } from 'react';
import { isFunction, isNil } from 'json-storage-formatter';

export type ContextProviderAPI<Value, Metadata extends BaseMetadata | unknown> = {
  setMetadata: MetadataSetter<Metadata>;
  setState: StateSetter<Value>;
  getState: StateGetter<Value>;
  getMetadata: () => Metadata;
  actions: Record<string, (...args: any[]) => void>;
};

export type ContextProvider<Value, Metadata extends BaseMetadata | unknown> = React.FC<
  PropsWithChildren<{
    value?: Value | ((initialValue: Value) => Value);
    ref?: React.RefObject<ContextProviderAPI<Value, Metadata>>;
  }>
>;

export type ContextHook<
  Value,
  PublicStateMutator,
  Metadata extends BaseMetadata | unknown
> = (() => StateHook<Value, PublicStateMutator, Metadata>) & {
  createSelectorHook: <
    RootState,
    RootSelectorResult,
    RootDerivate = RootSelectorResult extends never ? RootState : RootSelectorResult
  >(
    this: ContextHook<RootState, PublicStateMutator, Metadata>,
    mainSelector?: (state: Value) => RootSelectorResult,
    args?: {
      isEqual?: (current: RootDerivate, next: RootDerivate) => boolean;
      isEqualRoot?: (current: RootState, next: RootState) => boolean;
      name?: string;
    }
  ) => StateHook<RootDerivate, PublicStateMutator, Metadata>;
};

export interface CreateContext {
  <Value, Hook = ContextHook<Value, StateSetter<Value>, BaseMetadata>>(builder: () => Value): readonly [
    Hook,
    ContextProvider<Hook, BaseMetadata>
  ];

  <Value, Metadata extends BaseMetadata | unknown, Hook = ContextHook<Value, StateSetter<Value>, Metadata>>(
    builder: () => Value,
    args: {
      name?: string;
      metadata?: unknown;
      callbacks?: GlobalStoreCallbacks<Value, Metadata> & { onUnMount?: () => void };
    }
  ): readonly [Hook, ContextProvider<Hook, Metadata>];

  <
    Value,
    Metadata extends BaseMetadata | unknown,
    ActionsConfig extends ActionCollectionConfig<Value, Metadata>,
    PublicStateMutator = keyof ActionsConfig extends never | undefined
      ? StateSetter<Value>
      : ActionCollectionResult<Value, Metadata, NonNullable<ActionsConfig>>,
    Hook = ContextHook<Value, PublicStateMutator, Metadata>
  >(
    builder: () => Value,
    args: {
      name?: string;
      metadata?: unknown;
      callbacks?: GlobalStoreCallbacks<Value, Metadata> & { onUnMount?: () => void };
      actions?: ActionCollectionConfig<Value, Metadata>;
    }
  ): readonly [Hook, ContextProvider<Hook, Metadata>];

  <
    Value,
    Metadata extends BaseMetadata | unknown,
    ActionsConfig extends ActionCollectionConfig<Value, Metadata>,
    Hook = ContextHook<Value, ActionCollectionResult<Value, Metadata, ActionsConfig>, Metadata>
  >(
    builder: () => Value,
    args: {
      name?: string;
      metadata?: unknown;
      callbacks?: GlobalStoreCallbacks<Value, Metadata> & { onUnMount?: () => void };
      actions: ActionCollectionConfig<Value, Metadata>;
    }
  ): readonly [Hook, ContextProvider<Hook, Metadata>];
}

export const createContext = ((
  // a builder function that returns the initial state
  // a builder reduce the risk of having multiple context with the same state reference
  stateBuilder: () => unknown,
  args: {
    name?: string;
    metadata?: unknown;
    callbacks?: GlobalStoreCallbacks<unknown, unknown> & { onUnMount?: () => void };
    actions?: ActionCollectionConfig<unknown, unknown>;
  }
) => {
  // when using createSelectorHook we need to keep track of the parent hook
  // each parent hook can have multiple child selector hooks
  const selectorHooksByParentHook: Map<
    StateHook<unknown, unknown, unknown>,
    Map<string, StateHook<unknown, unknown, unknown>>
  > = new Map();

  const getSelectorsMap = (hook: StateHook<unknown, unknown, unknown>) => {
    if (!selectorHooksByParentHook.has(hook)) {
      selectorHooksByParentHook.set(hook, new Map());
    }

    return selectorHooksByParentHook.get(hook) as Map<string, StateHook<unknown, unknown, unknown>>;
  };

  const context = React.createContext<StateHook<unknown, unknown, unknown> | typeof uniqueSymbol>(
    uniqueSymbol
  );

  const useContext = (): StateHook<unknown, unknown, unknown> => {
    const contextValue = React.useContext<StateHook<unknown, unknown, unknown> | typeof uniqueSymbol>(
      context
    );

    if (contextValue === uniqueSymbol) {
      throw new Error('context hooks need to be used inside a provider');
    }

    return contextValue;
  };

  /**
   * Store selectors are not created until the first time they are used
   */
  useContext.createSelectorHook = (
    selector: (state: unknown) => unknown,
    args?: Omit<UseHookConfig<unknown, unknown>, 'dependencies'> & {
      name?: string;
    }
  ) => {
    const selectorId = uniqueId();

    return (...hookArgs: []) => {
      const currentParentHook = useContext();
      const selectorsMap = getSelectorsMap(currentParentHook);

      // one hook per selector and parent hook
      if (selectorsMap.has(selectorId)) {
        selectorsMap.set(selectorId, currentParentHook.createSelectorHook(selector, args));
      }

      const useSelectedHook = selectorsMap.get(selectorId);
      if (isNil(useSelectedHook)) throw new Error('useSelectedHook is nil');

      return useSelectedHook(...hookArgs);
    };
  };

  const Provider: ContextProvider<unknown, unknown> = ({ children, value, ref }) => {
    const { store, hook } = useMemo(() => {
      const value$ = (() => {
        if (value === undefined) return stateBuilder();
        if (isFunction(value)) return (value as (s: unknown) => unknown)(stateBuilder());

        return value;
      })();

      const store = new GlobalStore(value$, args);

      return { store, hook: store.getHook() as StateHook<unknown, unknown, unknown> };
    }, []);

    if (!selectorHooksByParentHook.has(hook)) {
      selectorHooksByParentHook.set(hook, new Map());
    }

    useEffect(() => {
      return () => {
        selectorHooksByParentHook.delete(hook);

        (store.callbacks as { onUnMount?: () => void })?.onUnMount?.();

        /**
         * Required by the global hooks developer tools
         */
        (store as unknown as { __onUnMountContext: (...args: any[]) => unknown }).__onUnMountContext?.(
          store,
          hook
        );
      };
    }, []);

    useImperativeHandle(
      ref,
      () => {
        return (ref ? store.getConfigCallbackParam() : ref) as ContextProviderAPI<unknown, unknown>;
      },
      [store, ref]
    );

    return React.createElement(context.Provider, { value: hook }, children);
  };

  return [useContext, Provider] as const;
}) as CreateContext;
