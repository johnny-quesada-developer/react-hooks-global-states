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
  CustomGlobalHookParams,
  SelectorCallback,
  SubscribeCallbackConfig,
  SubscribeToEmitter,
  StoreTools,
  MetadataSetter,
  StateChanges,
} from './GlobalStore.types';

import { GlobalStore } from './GlobalStore';

/**
 * Creates a global hook that can be used to access the state and actions across the application
 * @returns {} - () => [TState, Setter, TMetadata] the hook that can be used to access the state and the setter of the state
 */
export const createGlobalState = <
  State,
  Metadata extends Record<string, unknown> = {},
  ActionsConfig extends ActionCollectionConfig<any, any, any> | null = null,
  FullActionsConfig extends ActionCollectionConfig<any, any, any> = ActionsConfig extends null
    ? null
    : ActionCollectionConfig<State, Metadata, ActionsConfig>,
  Actions extends ActionCollectionResult<State, Metadata, FullActionsConfig> = ActionsConfig extends null
    ? null
    : ActionCollectionResult<State, Metadata, FullActionsConfig>,
  PublicStateMutator = ActionsConfig extends null ? StateSetter<State> : Actions,
  StoreAPI extends StoreTools<State, Metadata, Actions> = {
    /**
     * Set the metadata
     * @param {Metadata} setter - The metadata or a function that will receive the metadata and return the new metadata
     * @returns {void} result - void
     * */
    setMetadata: MetadataSetter<Metadata>;

    /**
     * Set the state
     * @param {State} setter - The state or a function that will receive the state and return the new state
     * @param {{ forceUpdate?: boolean }} options - Options
     * @returns {void} result - void
     * */
    setState: StateSetter<State>;

    /**
     * Get the state
     * @returns {State} result - The state
     * */
    getState: StateGetter<State>;

    /**
     * Get the metadata
     * @returns {Metadata} result - The metadata
     * */
    getMetadata: () => Metadata;

    /**
     * Actions of the hook
     */
    actions: Actions;
  }
>(
  state: State,
  _config?: Readonly<{
    /**
     * @param {StateConfigCallbackParam<State, Metadata> => void} metadata - the initial value of the metadata
     * */
    metadata?: Metadata;

    /**
     * actions configuration for restricting the manipulation of the state
     */
    actions?: ActionsConfig;

    /**
     * @param {StateConfigCallbackParam<State, Metadata> => void} onInit - callback function called when the store is initialized
     * @returns {void} result - void
     * */
    onInit?: (storeAPI: StoreAPI) => void;

    /**
     * @param {StateChangesParam<TState, TMetadata> => void} onStateChanged - callback function called every time the state is changed
     * @returns {void} result - void
     */
    onStateChanged?: (storeAPI: StoreAPI & StateChanges<State>) => void;

    /**
     * @param {StateConfigCallbackParam<TState, TMetadata> => void} onSubscribed - callback function called every time a component is subscribed to the store
     * @returns {void} result - void
     */
    onSubscribed?: (storeAPI: StoreAPI) => void;

    /**
     * @param {StateChangesParam<TState, TMetadata> => boolean} computePreventStateChange - callback function called every time the state is about to change and it allows you to prevent the state change
     * @returns {boolean} result - true if you want to prevent the state change, false otherwise
     */
    computePreventStateChange?: (storeAPI: StoreAPI & StateChanges<State>) => boolean;
  }>
) => {
  const { actions, ...config } = _config ?? {};

  const hook = new GlobalStore<
    State,
    Metadata,
    ActionsConfig,
    FullActionsConfig,
    Actions,
    PublicStateMutator,
    StoreAPI
  >(state, config, actions).getHook();

  return hook as StateHook<State, PublicStateMutator, Metadata>;
};

export const useGlobalStores = createGlobalState(new Map<string, number>(), {
  metadata: {
    name: 'globalStores',
  },
  // actions: {},
  //actions: null,
  actions: {
    CLEAR_GLOBAL_STATES: () => {
      return ({ setState }) => {
        // clear all global states
        setState(null);
      };
    },
  },
  //onInit: ({ setState, actions }) => {},
} as const);

const [getter, setter, metaGetter] = useGlobalStores.stateControls();

/**
 * @description
 * Use this function to create a custom global store.
 * You can use this function to create a store with async storage.
 */
export const createCustomGlobalState = <CustomConfig, InheritMetadata extends Record<string, unknown>>({
  onInitialize,
  onChange,
}: {
  /**
   * @description
   * This function is called when the state is initialized.
   */
  onInitialize: <
    State = any,
    Metadata extends InheritMetadata = InheritMetadata,
    ActionsConfig extends ActionCollectionConfig<any, any, any> | null | {} = null,
    FullActionsConfig extends ActionCollectionConfig<any, any, any> = ActionsConfig extends null
      ? null
      : ActionCollectionConfig<State, Metadata, ActionsConfig>,
    Actions extends ActionCollectionResult<State, Metadata, FullActionsConfig> = ActionsConfig extends null
      ? null
      : ActionCollectionResult<State, Metadata, FullActionsConfig>,
    PublicStateMutator = ActionsConfig extends null ? StateSetter<State> : Actions,
    StoreAPI extends StoreTools<State, Metadata, Actions> = {
      /**
       * Set the metadata
       * @param {Metadata} setter - The metadata or a function that will receive the metadata and return the new metadata
       * @returns {void} result - void
       * */
      setMetadata: MetadataSetter<Metadata>;

      /**
       * Set the state
       * @param {State} setter - The state or a function that will receive the state and return the new state
       * @param {{ forceUpdate?: boolean }} options - Options
       * @returns {void} result - void
       * */
      setState: StateSetter<State>;

      /**
       * Get the state
       * @returns {State} result - The state
       * */
      getState: StateGetter<State>;

      /**
       * Get the metadata
       * @returns {Metadata} result - The metadata
       * */
      getMetadata: () => Metadata;

      /**
       * Actions of the hook
       */
      actions: Actions;
    }
  >(
    storeAPI: StoreAPI,
    config: CustomConfig
  ) => void;

  /**
   * @description
   * This function is called when the state is changed.
   */
  onChange: <
    State = any,
    Metadata extends InheritMetadata = InheritMetadata,
    ActionsConfig extends ActionCollectionConfig<any, any, any> | null | {} = null,
    FullActionsConfig extends ActionCollectionConfig<any, any, any> = ActionsConfig extends null
      ? null
      : ActionCollectionConfig<State, Metadata, ActionsConfig>,
    Actions extends ActionCollectionResult<State, Metadata, FullActionsConfig> = ActionsConfig extends null
      ? null
      : ActionCollectionResult<State, Metadata, FullActionsConfig>,
    PublicStateMutator = ActionsConfig extends null ? StateSetter<State> : Actions,
    StoreAPI extends StoreTools<State, Metadata, Actions> = {
      /**
       * Set the metadata
       * @param {Metadata} setter - The metadata or a function that will receive the metadata and return the new metadata
       * @returns {void} result - void
       * */
      setMetadata: MetadataSetter<Metadata>;

      /**
       * Set the state
       * @param {State} setter - The state or a function that will receive the state and return the new state
       * @param {{ forceUpdate?: boolean }} options - Options
       * @returns {void} result - void
       * */
      setState: StateSetter<State>;

      /**
       * Get the state
       * @returns {State} result - The state
       * */
      getState: StateGetter<State>;

      /**
       * Get the metadata
       * @returns {Metadata} result - The metadata
       * */
      getMetadata: () => Metadata;

      /**
       * Actions of the hook
       */
      actions: Actions;
    }
  >(
    storeAPI: StoreAPI & StateChanges<any>,
    config: CustomConfig
  ) => void;
}) => {
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
    Metadata extends InheritMetadata = InheritMetadata,
    ActionsConfig extends ActionCollectionConfig<any, any, any> | null | {} = null,
    FullActionsConfig extends ActionCollectionConfig<any, any, any> = ActionsConfig extends null
      ? null
      : ActionCollectionConfig<State, Metadata, ActionsConfig>,
    Actions extends ActionCollectionResult<State, Metadata, FullActionsConfig> = ActionsConfig extends null
      ? null
      : ActionCollectionResult<State, Metadata, FullActionsConfig>,
    PublicStateMutator = ActionsConfig extends null ? StateSetter<State> : Actions,
    StoreAPI extends StoreTools<State, Metadata, Actions> = {
      /**
       * Set the metadata
       * @param {Metadata} setter - The metadata or a function that will receive the metadata and return the new metadata
       * @returns {void} result - void
       * */
      setMetadata: MetadataSetter<Metadata>;

      /**
       * Set the state
       * @param {State} setter - The state or a function that will receive the state and return the new state
       * @param {{ forceUpdate?: boolean }} options - Options
       * @returns {void} result - void
       * */
      setState: StateSetter<State>;

      /**
       * Get the state
       * @returns {State} result - The state
       * */
      getState: StateGetter<State>;

      /**
       * Get the metadata
       * @returns {Metadata} result - The metadata
       * */
      getMetadata: () => Metadata;

      /**
       * Actions of the hook
       */
      actions: Actions;
    }
  >(
    state: State,
    {
      config: customConfig,
      onInit,
      onStateChanged,
      ...parameters
    }: CustomGlobalHookParams<
      CustomConfig,
      State,
      Metadata,
      ActionsConfig,
      FullActionsConfig,
      Actions,
      StoreAPI
    > = {
      config: null,
    }
  ) => {
    const onInitWrapper = ((callBackParameters) => {
      onInitialize<State, Metadata, ActionsConfig, FullActionsConfig, Actions, PublicStateMutator, StoreAPI>(
        callBackParameters,
        customConfig
      );

      onInit?.(callBackParameters);
    }) as typeof onInit;

    const onStateChangeWrapper = ((callBackParameters) => {
      onChange<State, Metadata, ActionsConfig, FullActionsConfig, Actions, PublicStateMutator>(
        callBackParameters,
        customConfig
      );

      onStateChanged?.(callBackParameters);
    }) as typeof onStateChanged;

    return createGlobalState<
      State,
      Metadata,
      ActionsConfig,
      FullActionsConfig,
      Actions,
      PublicStateMutator,
      StoreAPI
    >(state, {
      onInit: onInitWrapper,
      onStateChanged: onStateChangeWrapper,
      ...parameters,
    });
  };
};

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
