import {
  ActionCollectionConfig,
  StateConfigCallbackParam,
  StateChangesParam,
  StateSetter,
  ActionCollectionResult,
  UseHookConfig,
  AvoidNever,
  UnsubscribeCallback,
  StateHook,
  StateGetter,
  SubscribeCallback,
  Subscribe,
  CustomGlobalHookBuilderParams,
  CustomGlobalHookParams,
  SelectorCallback,
  SubscribeCallbackConfig,
  SubscribeToEmitter,
} from './GlobalStore.types';

import { GlobalStore } from './GlobalStore';

/**
 * Creates a global state with the given state and config.
 * @returns {} [HOOK, DECOUPLED_RETRIEVER, DECOUPLED_MUTATOR] this is an array with the hook, the decoupled getState function and the decoupled setter of the state
 */
export const createGlobalStateWithDecoupledFuncs = <
  TState,
  TMetadata,
  TActions extends ActionCollectionConfig<TState, TMetadata> | null
>(
  state: TState,
  { actions, ...config }: createStateConfig<TState, TMetadata, TActions> = {}
) => {
  const store = new GlobalStore<TState, TMetadata, TActions>(state, config, actions);

  const useHook = store.getHook();
  const [getState, setter] = useHook.stateControls();

  type Setter = keyof TActions extends never
    ? StateSetter<TState>
    : ActionCollectionResult<TState, TMetadata, TActions>;

  return [useHook, getState, setter] as unknown as [
    hook: StateHook<TState, Setter, TMetadata>,
    stateRetriever: StateGetter<TState>,
    stateMutator: Setter
  ];
};

/**
 * Creates a global hook that can be used to access the state and actions across the application
 * @returns {} - () => [TState, Setter, TMetadata] the hook that can be used to access the state and the setter of the state
 */
export const createGlobalState = <
  TState,
  TMetadata extends Record<string, any> = {},
  TActions extends ActionCollectionConfig<TState, TMetadata> | null | {} = null
>(
  state: TState,
  _config?: Readonly<{
    /**
     * @param {StateConfigCallbackParam<TState, TMetadata> => void} metadata - the initial value of the metadata
     * */
    metadata?: TMetadata;

    /**
     * actions configuration for restricting the manipulation of the state
     */
    actions?: TActions;

    /**
     * @param {StateConfigCallbackParam<TState, TMetadata> => void} onInit - callback function called when the store is initialized
     * @returns {void} result - void
     * */
    onInit?: (
      parameters: StateConfigCallbackParam<
        TState,
        TMetadata,
        TActions extends null ? StateSetter<TState> : ActionCollectionResult<TState, TMetadata, TActions>
      >
    ) => void;

    /**
     * @param {StateChangesParam<TState, TMetadata> => void} onStateChanged - callback function called every time the state is changed
     * @returns {void} result - void
     */
    onStateChanged?: (
      parameters: StateChangesParam<
        TState,
        TMetadata,
        TActions extends null ? StateSetter<TState> : ActionCollectionResult<TState, TMetadata, TActions>
      >
    ) => void;

    /**
     * @param {StateConfigCallbackParam<TState, TMetadata> => void} onSubscribed - callback function called every time a component is subscribed to the store
     * @returns {void} result - void
     */
    onSubscribed?: (
      parameters: StateConfigCallbackParam<
        TState,
        TMetadata,
        TActions extends null ? StateSetter<TState> : ActionCollectionResult<TState, TMetadata, TActions>
      >
    ) => void;

    /**
     * @param {StateChangesParam<TState, TMetadata> => boolean} computePreventStateChange - callback function called every time the state is about to change and it allows you to prevent the state change
     * @returns {boolean} result - true if you want to prevent the state change, false otherwise
     */
    computePreventStateChange?: (
      parameters: StateChangesParam<
        TState,
        TMetadata,
        TActions extends null ? StateSetter<TState> : ActionCollectionResult<TState, TMetadata, TActions>
      >
    ) => boolean;
  }>
) => {
  const { actions, ...config } = _config ?? {};

  type HasActions = TActions extends null ? false : true;

  const hook = new GlobalStore(state, config, actions).getHook();

  type PublicStateMutator = HasActions extends true
    ? ActionCollectionResult<TState, TMetadata, TActions>
    : StateSetter<TState>;

  return hook as unknown as StateHook<TState, PublicStateMutator, TMetadata>;
};

/**
 * @description
 * Use this function to create a custom global store.
 * You can use this function to create a store with async storage.
 */
export const createCustomGlobalStateWithDecoupledFuncs = <TInheritMetadata, TCustomConfig>({
  onInitialize,
  onChange,
}: CustomGlobalHookBuilderParams<TInheritMetadata, TCustomConfig>) => {
  /**
   * @description
   * Use this function to create a custom global store.
   * You can use this function to create a store with async storage or any other custom logic.
   * @param state The initial state of the store.
   * @param config The configuration of the store.
   * @returns [HOOK, DECOUPLED_RETRIEVER, DECOUPLED_MUTATOR] - this is an array with the hook, the decoupled getState function and the decoupled setter of the state
   */
  return <
    TState,
    TMetadata,
    TActions extends ActionCollectionConfig<
      TState,
      AvoidNever<TInheritMetadata> & AvoidNever<TMetadata>
    > | null
  >(
    state: TState,
    {
      config: customConfig,
      onInit,
      onStateChanged,
      ...parameters
    }: CustomGlobalHookParams<
      TCustomConfig,
      TState,
      AvoidNever<TInheritMetadata> & AvoidNever<TMetadata>,
      TActions
    > = {
      config: null,
    }
  ) => {
    const onInitWrapper = ((callBackParameters) => {
      onInitialize(callBackParameters as StateConfigCallbackParam<unknown, TInheritMetadata>, customConfig);

      onInit?.(callBackParameters);
    }) as typeof onInit;

    const onStateChangeWrapper = ((callBackParameters) => {
      onChange(callBackParameters as StateChangesParam<unknown, TInheritMetadata>, customConfig);

      onStateChanged?.(callBackParameters);
    }) as typeof onStateChanged;

    return createGlobalStateWithDecoupledFuncs<TState, typeof parameters.metadata, TActions>(state, {
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
