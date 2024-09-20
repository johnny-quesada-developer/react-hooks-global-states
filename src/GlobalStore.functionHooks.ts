import {
  ActionCollectionConfig,
  StateSetter,
  ActionCollectionResult,
  UseHookConfig,
  UnsubscribeCallback,
  StateHook,
  StateGetter,
  SubscribeCallback,
  Subscribe,
  CustomGlobalHookBuilderParams,
  SelectorCallback,
  SubscribeCallbackConfig,
  SubscribeToEmitter,
  StateChanges,
  BaseMetadata,
  MetadataSetter,
  StoreTools,
} from './GlobalStore.types';

import { GlobalStore } from './GlobalStore';

/**
 * Creates a global hook that can be used to access the state and actions across the application
 * @returns {} - () => [TState, Setter, TMetadata] the hook that can be used to access the state and the setter of the state
 */
interface CreateGlobalState {
  createGlobalState<State>(state: State): StateHook<State, StateSetter<State>, BaseMetadata>;

  createGlobalState<
    State,
    Metadata extends BaseMetadata,
    ActionsConfig extends ActionCollectionConfig<State, Metadata> | {} | null = null,
    StoreAPI = {
      setMetadata: MetadataSetter<Metadata>;
      setState: StateSetter<State>;
      getState: StateGetter<State>;
      getMetadata: () => Metadata;
      actions: ActionsConfig extends null ? null : Record<string, (...args: any[]) => void>;
    }
  >(
    state: State,
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

      onStateChanged?: (args: StoreAPI & StateChanges<State>) => void;
      onSubscribed?: (args: StoreAPI) => void;

      /**
       * callback function called every time the state is about to change and it allows you to prevent the state change
       */
      computePreventStateChange?: (args: StoreAPI & StateChanges<State>) => boolean;
    }>
  ): StateHook<
    State,
    ActionsConfig extends null ? StateSetter<State> : ActionCollectionResult<State, Metadata, ActionsConfig>,
    Metadata
  >;

  createGlobalState<
    State,
    Metadata extends BaseMetadata,
    ActionsConfig extends ActionCollectionConfig<State, Metadata>,
    StoreAPI = {
      setMetadata: MetadataSetter<Metadata>;
      setState: StateSetter<State>;
      getState: StateGetter<State>;
      getMetadata: () => Metadata;
      actions: Record<string, (...args: any[]) => void>;
    }
  >(
    state: State,
    config: Readonly<{
      /**
       * Non reactive information about the state
       */
      metadata?: Metadata;

      /**
       * executes immediately after the store is created
       * */
      onInit?: (args: StoreAPI) => void;

      onStateChanged?: (args: StoreAPI & StateChanges<State>) => void;
      onSubscribed?: (args: StoreAPI) => void;

      /**
       * callback function called every time the state is about to change and it allows you to prevent the state change
       */
      computePreventStateChange?: (args: StoreAPI & StateChanges<State>) => boolean;
    }>,
    actions: ActionsConfig
  ): StateHook<State, ActionCollectionResult<State, Metadata, ActionsConfig>, Metadata>;

  createGlobalState<
    State,
    Metadata extends BaseMetadata,
    ActionsConfig extends ActionCollectionConfig<State, Metadata>,
    StoreAPI = {
      setMetadata: MetadataSetter<Metadata>;
      setState: StateSetter<State>;
      getState: StateGetter<State>;
      getMetadata: () => Metadata;
    }
  >(
    state: State,
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

      onStateChanged?: (args: StoreAPI & StateChanges<State>) => void;
      onSubscribed?: (args: StoreAPI) => void;

      /**
       * callback function called every time the state is about to change and it allows you to prevent the state change
       */
      computePreventStateChange?: (args: StoreAPI & StateChanges<State>) => boolean;
    }>
  ): StateHook<State, ActionCollectionResult<State, Metadata, ActionsConfig>, Metadata>;
}

/**
 * Creates a global hook that can be used to access the state and actions across the application
 * @returns {} - () => [TState, Setter, TMetadata] the hook that can be used to access the state and the setter of the state
 */
export const createGlobalState = ((state, ...args) => {
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

  return new GlobalStore(state, config, actionsConfig).getHook();
}) as CreateGlobalState['createGlobalState'];

/**
 * @description
 * Use this function to create a custom global store.
 * You can use this function to create a store with async storage.
 */
export const createCustomGlobalState = <InheritMetadata, TCustomConfig>({
  onInitialize,
  onChange,
}: CustomGlobalHookBuilderParams<InheritMetadata, TCustomConfig>) => {
  /**
   * @description
   * Use this function to create a custom global store.
   * You can use this function to create a store with async storage or any other custom logic.
   * @param state The initial state of the store.
   * @param config The configuration of the store.
   * @returns [HOOK, DECOUPLED_RETRIEVER, DECOUPLED_MUTATOR] - this is an array with the hook, the decoupled getState function and the decoupled setter of the state
   */
  return <
    State,
    Metadata,
    ActionsConfig extends Readonly<ActionCollectionConfig<State, Metadata & InheritMetadata>> | null = null
  >(
    state: State,
    _config?: Readonly<{
      metadata?: Metadata & InheritMetadata;

      readonly actions?: Readonly<ActionsConfig>;

      onInit?: (args: StoreTools<State, Metadata & InheritMetadata>) => void;

      onStateChanged?: (args: StoreTools<State, Metadata & InheritMetadata> & StateChanges<State>) => void;

      onSubscribed?: (parameters: StoreTools<State, Metadata & InheritMetadata>) => void;

      computePreventStateChange?: (
        args: StoreTools<State, Metadata & InheritMetadata> & StateChanges<State>
      ) => boolean;

      /**
       * @description
       * Type of the configuration object that the custom hook will require or accept
       */
      config?: TCustomConfig;
    }>
  ) => {
    const { actions, config: customConfig, ...args } = _config ?? {};

    const onInitWrapper = (callBackParameters) => {
      onInitialize(callBackParameters, customConfig);
      args?.onInit?.(callBackParameters);
    };

    const onStateChangeWrapper = (callBackParameters) => {
      onChange(callBackParameters, customConfig);
      args?.onStateChanged?.(callBackParameters);
    };

    type PublicStateMutator = ActionsConfig extends null
      ? StateSetter<State>
      : ActionCollectionResult<State, Metadata & InheritMetadata, ActionsConfig>;

    type CustomGlobalState = StateHook<State, PublicStateMutator, Metadata & InheritMetadata>;

    return createGlobalState(state, {
      onInit: onInitWrapper,
      onStateChanged: onStateChangeWrapper,
      ...args,
    }) as CustomGlobalState;
  };
};

/**
 * @description
 * Use this function to create a custom global store.
 * You can use this function to create a store with async storage.
 * @deprecated
 */
export const createCustomGlobalStateWithDecoupledFuncs =
  createCustomGlobalState as typeof createCustomGlobalState;

/**
 * @description
 * Use this function to create a custom global hook which contains a fragment of the state of another hook
 */
export const createDerivate = <
  RootState,
  StateMutator,
  Metadata,
  RootSelectorResult,
  RootDerivate = RootSelectorResult extends never ? RootState : RootSelectorResult
>(
  useHook: StateHook<RootState, StateMutator, Metadata>,
  mainSelector?: (state: RootState) => RootSelectorResult,
  args: Omit<UseHookConfig<RootDerivate, RootState>, 'dependencies'> = {}
) => {
  return useHook.createSelectorHook(mainSelector, args);
};

/**
 * @description
 * This function allows you to create a derivate emitter
 * With this approach, you can subscribe to changes in a specific fragment or subset of the state.
 */
export const createDerivateEmitter = <
  TDerivate,
  TStateRetriever extends StateGetter<unknown>,
  TState = Exclude<ReturnType<TStateRetriever>, UnsubscribeCallback>
>(
  getter: TStateRetriever,
  selector: SelectorCallback<TState, TDerivate>
): SubscribeToEmitter<TDerivate> => {
  type Infected = {
    _father_emitter?: {
      getter: StateGetter<unknown>;
      selector: SelectorCallback<TState, TDerivate>;
    };
  };

  const father_emitter = (getter as Infected)._father_emitter;

  if (father_emitter) {
    // if a subscriber is already a derivate emitter, then we need to merge the selectors
    const selectorWrapper = (state: TState): TDerivate => {
      const fatherFragment = father_emitter.selector(state);

      return selector(fatherFragment as unknown as TState);
    };

    const subscriber = createDerivateEmitter<TDerivate, TStateRetriever, TState>(
      father_emitter.getter as TStateRetriever,
      selectorWrapper
    );

    (subscriber as Infected)._father_emitter = {
      getter: father_emitter.getter,
      selector: selectorWrapper,
    };

    return subscriber;
  }

  const subscriber = <State = TDerivate>(
    param1: SubscribeCallback<State> | SelectorCallback<TDerivate, State>,
    param2?: SubscribeCallback<State> | SubscribeCallbackConfig<State>,
    param3: SubscribeCallbackConfig<State> = {}
  ) => {
    const hasExplicitSelector = typeof param2 === 'function';

    const $selector = (hasExplicitSelector ? param1 : null) as SelectorCallback<unknown, unknown>;

    const callback = (hasExplicitSelector ? param2 : param1) as SubscribeCallback<unknown>;

    const config = (hasExplicitSelector ? param3 : param2) as SubscribeCallbackConfig<unknown>;

    return (getter as StateGetter<unknown>)<Subscribe>((subscribe) => {
      subscribe(
        (state) => {
          const fatherFragment = selector(state as TState);

          return $selector?.(fatherFragment) ?? fatherFragment;
        },
        callback,
        config
      );
    });
  };

  (subscriber as Infected)._father_emitter = {
    getter,
    selector,
  };

  return subscriber as SubscribeToEmitter<TDerivate>;
};
