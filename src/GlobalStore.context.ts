import { GlobalStore } from './GlobalStore';
import {
  ActionCollectionConfig,
  StateHook,
  StateSetter,
  ActionCollectionResult,
  StateGetter,
  StateChanges,
  BaseMetadata,
  MetadataSetter,
  UseHookConfig,
} from './GlobalStore.types';
import React, { PropsWithChildren, useImperativeHandle, useMemo } from 'react';

export type ProviderAPI<Value, Metadata> = {
  setMetadata: MetadataSetter<Metadata>;
  setState: StateSetter<Value>;
  getState: StateGetter<Value>;
  getMetadata: () => Metadata;
  actions: Record<string, (...args: any[]) => void>;
};

type Provider<Value, Metadata extends BaseMetadata = BaseMetadata> = React.FC<
  PropsWithChildren<{
    value?: Value | ((initialValue: Value) => Value);
    ref?: React.MutableRefObject<ProviderAPI<Value, Metadata>>;
  }>
>;

type Context<Value, PublicStateMutator, Metadata extends BaseMetadata> = (() => StateHook<
  Value,
  PublicStateMutator,
  Metadata
>) & {
  /**
   * Allows you to create a selector hooks
   * This hooks only works when contained in the scope of the provider
   */
  createSelectorHook: <
    RootSelectorResult,
    RootDerivate = RootSelectorResult extends never ? Value : RootSelectorResult
  >(
    mainSelector?: (state: Value) => RootSelectorResult,
    { isEqualRoot, isEqual }?: Omit<UseHookConfig<RootDerivate, Value>, 'dependencies'>
  ) => StateHook<RootDerivate, PublicStateMutator, Metadata>;
};

export interface CreateContext {
  createContext<Value>(
    state: Value
  ): readonly [
    Context<Value, StateSetter<Value>, BaseMetadata>,
    Provider<Context<Value, StateSetter<Value>, BaseMetadata>>
  ];

  createContext<
    Value,
    Metadata extends BaseMetadata,
    ActionsConfig extends ActionCollectionConfig<Value, Metadata> | {} | null = null,
    StoreAPI = {
      setMetadata: MetadataSetter<Metadata>;
      setState: StateSetter<Value>;
      getState: StateGetter<Value>;
      getMetadata: () => Metadata;
      actions: ActionsConfig extends null ? null : Record<string, (...args: any[]) => void>;
    }
  >(
    state: Value,
    config: Readonly<{
      /**
       * @deprecated We needed to move the actions parameter as a third argument to fix several issues with the type inference of the actions
       */
      actions?: ActionsConfig;

      /**
       * Non reactive information about the state
       */
      metadata?: Metadata;

      /**
       * executes immediately after the store is created
       * */
      onInit?: (args: StoreAPI) => void;

      onStateChanged?: (args: StoreAPI & StateChanges<Value>) => void;
      onSubscribed?: (args: StoreAPI) => void;

      /**
       * callback function called every time the state is about to change and it allows you to prevent the state change
       */
      computePreventStateChange?: (args: StoreAPI & StateChanges<Value>) => boolean;
    }>
  ): readonly [
    Context<
      Value,
      ActionsConfig extends null
        ? StateSetter<Value>
        : ActionCollectionResult<Value, Metadata, ActionsConfig>,
      Metadata
    >,
    Provider<
      Context<
        Value,
        ActionsConfig extends null
          ? StateSetter<Value>
          : ActionCollectionResult<Value, Metadata, ActionsConfig>,
        Metadata
      >,
      Metadata
    >
  ];

  createContext<
    Value,
    Metadata extends BaseMetadata,
    ActionsConfig extends ActionCollectionConfig<Value, Metadata>,
    StoreAPI = {
      setMetadata: MetadataSetter<Metadata>;
      setState: StateSetter<Value>;
      getState: StateGetter<Value>;
      getMetadata: () => Metadata;
      actions: Record<string, (...args: any[]) => void>;
    }
  >(
    state: Value,
    config: Readonly<{
      /**
       * Non reactive information about the state
       */
      metadata?: Metadata;

      /**
       * executes immediately after the store is created
       * */
      onInit?: (args: StoreAPI) => void;

      onStateChanged?: (args: StoreAPI & StateChanges<Value>) => void;
      onSubscribed?: (args: StoreAPI) => void;

      /**
       * callback function called every time the state is about to change and it allows you to prevent the state change
       */
      computePreventStateChange?: (args: StoreAPI & StateChanges<Value>) => boolean;
    }>,
    actions: ActionsConfig
  ): readonly [
    Context<Value, ActionCollectionResult<Value, Metadata, ActionsConfig>, Metadata>,
    Provider<Context<Value, ActionCollectionResult<Value, Metadata, ActionsConfig>, Metadata>>
  ];

  createContext<
    Value,
    Metadata extends BaseMetadata,
    ActionsConfig extends ActionCollectionConfig<Value, Metadata>,
    StoreAPI = {
      setMetadata: MetadataSetter<Metadata>;
      setState: StateSetter<Value>;
      getState: StateGetter<Value>;
      getMetadata: () => Metadata;
    }
  >(
    state: Value,
    builder: () => ActionsConfig,
    config?: Readonly<{
      /**
       * Non reactive information about the state
       */
      metadata?: Metadata;

      /**
       * executes immediately after the store is created
       * */
      onInit?: (args: StoreAPI) => void;

      onStateChanged?: (args: StoreAPI & StateChanges<Value>) => void;
      onSubscribed?: (args: StoreAPI) => void;

      /**
       * callback function called every time the state is about to change and it allows you to prevent the state change
       */
      computePreventStateChange?: (args: StoreAPI & StateChanges<Value>) => boolean;
    }>
  ): readonly [
    Context<Value, ActionCollectionResult<Value, Metadata, ActionsConfig>, Metadata>,
    Provider<Context<Value, ActionCollectionResult<Value, Metadata, ActionsConfig>, Metadata>>
  ];
}

export const createContext = ((initialValue, ...args: any[]) => {
  const context = React.createContext(initialValue);

  const useContext = () => {
    return React.useContext<StateHook<any, any, any>>(context);
  };

  useContext.createSelectorHook = (..._args: []) => {
    const hook = useContext();

    return hook.createSelectorHook(..._args);
  };

  const Provider: Provider<any> = ({ children, value, ref }) => {
    const { store, hook } = useMemo(() => {
      const isBuilderFunction = typeof args[0] === 'function';

      const { config, actionsConfig } = (() => {
        if (isBuilderFunction) {
          const builder = args[0];
          const config = args[1];
          const actionsConfig = builder();

          return { config, actionsConfig };
        }

        const config = args[0];
        const actionsConfig = args[1] ?? config?.actions;

        return { config, actionsConfig };
      })();

      const store = new GlobalStore(
        (() => {
          if (value) {
            if (typeof value === 'function') return value(initialValue);

            return value;
          }

          return initialValue;
        })(),
        config,
        actionsConfig
      );

      return { store, hook: store.getHook() };
    }, []);

    useImperativeHandle(
      ref,
      () => {
        if (!ref) return {} as ProviderAPI<any, any>;

        const [getState, , getMetadata] = store.stateControls();

        const {
          setStateWrapper: setState,
          setMetadata,
          actions,
        } = store as unknown as {
          setStateWrapper;
          actions;
          setMetadata;
        };

        return {
          setMetadata,
          setState,
          getState,
          getMetadata,
          actions,
        };
      },
      [store]
    );

    return React.createElement(context.Provider, { value: hook }, children);
  };

  return [useContext, Provider] as const;
}) as unknown as CreateContext['createContext'];
