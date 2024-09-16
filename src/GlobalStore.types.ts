/**
 * @param {StateSetter<TState>} setter - set the state
 * @returns {void} result - void
 */
export type StateSetter<TState> = (
  /**
   * @param {StateSetter<TState>} setter - set the state
   * @param {{ forceUpdate?: boolean }} options - Options to be passed to the setter
   * @param {{ forceUpdate?: boolean }} options.forceUpdate - Force the re-render of the subscribers even if the state is the same
   * @returns {void} result - void
   * */
  setter: TState | ((state: TState) => TState),
  /**
   * This parameter indicate whether we should force the re-render of the subscribers even if the state is the same,
   * Do
   */
  {
    forceUpdate,
  }?: {
    /**
     * @description you can add an identifier to the state call
     * this will show up in the devtools to help you identify from where the state change was called
     */
    identifier?: string;
    /**
     * @deprecated forceUpdate normally should not be used inside components
     * Use this flag just in custom implementations of the global store
     */
    forceUpdate?: boolean;
  }
) => void;

/**
 * @description
 * The hook to use the global state
 * @returns {[State, StateSetter<State>, TMetadata]} result - the state, the setter and the metadata
 */
export type StateHook<State, StateMutator, TMetadata> = (<Derivate = State>(
  selector?: (state: State) => Derivate,
  config?: UseHookConfig<Derivate, State>
) => Readonly<[state: Derivate, stateMutator: StateMutator, metadata: TMetadata]>) & {
  /**
   * @description Return the state controls of the hook
   * This selectors includes:
   * - stateRetriever: a function to get the current state or subscribe a callback to the state changes
   * - stateMutator: a function to set the state or a collection of actions if you pass an storeActionsConfig configuration
   * - metadataRetriever: a function to get the metadata of the global state
   */
  stateControls: () => Readonly<
    [
      stateRetriever: StateGetter<State>,
      stateMutator: StateMutator,
      metadataRetriever: MetadataGetter<TMetadata>
    ]
  >;

  /***
   * @description Creates a new hooks that returns the result of the selector passed as a parameter
   * Your can create selector hooks of other selectors hooks and extract as many derived states as or fragments of the state as you want
   * The selector hook will be evaluated only if the result of the selector changes and the equality function returns false
   * you can customize the equality function by passing the isEqualRoot and isEqual parameters
   */
  createSelectorHook: <
    RootState,
    StateMutator,
    Metadata,
    RootSelectorResult,
    RootDerivate = RootSelectorResult extends never ? RootState : RootSelectorResult
  >(
    this: StateHook<RootState, StateMutator, Metadata>,
    mainSelector?: (state: RootState) => RootSelectorResult,
    { isEqualRoot, isEqual }?: Omit<UseHookConfig<RootDerivate, RootState>, 'dependencies'>
  ) => StateHook<RootDerivate, StateMutator, Metadata>;

  State: State;
  StateMutator: StateMutator;
  Metadata: TMetadata;
};

/**
 * @description
 * Type that prevent ts issues with merging never with other types
 */
export type AvoidNever<T> = T extends never | null | undefined ? {} : T;

/**
 * @param {TMetadata} setter - set the metadata
 * @returns {void} result - void
 */
export type MetadataSetter<TMetadata> = (
  /**
   * @param {TMetadata} setter - set the metadata
   * @returns {void} result - void
   * */
  setter: TMetadata | ((metadata: TMetadata) => TMetadata)
) => void;

/**
 * Parameters of the onStateChanged callback function
 * @param {TState} state - the new state
 * @param {TState} previousState - the previous state
 **/
export type StateChanges<TState> = {
  /**
   * The new state
   * */
  state: TState;

  /**
   * The previous state
   * */
  previousState?: TState;

  identifier?: string;
};

/**
 * Callbacks to be passed to the configurations function of the store
 * @template {TState} TState - The state type
 * @template {TMetadata} TMetadata - The metadata type
 * @property {StateSetter<TState>} setMetadata - Set the metadata
 * @property {StateSetter<TState>} setState - Set the state
 * @property {() => TState} getState - Get the state
 * @property {() => TMetadata} getMetadata - Get the metadata
 * @property {ActionCollectionResult<TState, TMetadata>} actions - The actions collection if any
 **/
export type StoreTools<TState = any, TMetadata = any, TActions = any> = {
  /**
   * Set the metadata
   * @param {TMetadata} setter - The metadata or a function that will receive the metadata and return the new metadata
   * @returns {void} result - void
   * */
  setMetadata: MetadataSetter<TMetadata>;

  /**
   * Set the state
   * @param {TState} setter - The state or a function that will receive the state and return the new state
   * @param {{ forceUpdate?: boolean }} options - Options
   * @returns {void} result - void
   * */
  setState: StateSetter<TState>;

  /**
   * Get the state
   * @returns {TState} result - The state
   * */
  getState: StateGetter<TState>;

  /**
   * Get the metadata
   * @returns {TMetadata} result - The metadata
   * */
  getMetadata: () => TMetadata;

  /**
   * Actions of the hook
   */
  actions: TActions;
};

/**
 * Basic contract for the storeActionsConfig configuration
 * @template {TState} TState - The state type
 * @template {TMetadata} TMetadata - The metadata type
 * @property {string} key - The action name
 * @property {(...parameters: unknown[]) => (storeTools: { setMetadata: MetadataSetter<TMetadata>; setState: StateSetter<TState>; getState: () => TState; getMetadata: () => TMetadata; }) => unknown | void} value - The action function
 * @returns {ActionCollectionConfig<TState, TMetadata>} result - The action collection configuration
 */
export interface ActionCollectionConfig<State, Metadata, ActionsConfig> {
  readonly [key: string]: (...parameters: any[]) => (storeAPI: {
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
    actions: ActionCollectionResult<
      State,
      Metadata,
      ActionsConfig extends null ? null : ActionCollectionConfig<State, Metadata, ActionsConfig>
    >;
  }) => unknown;
}

/**
 * This is the actions object returned by the hook when you pass an storeActionsConfig configuration
 * if you pass an storeActionsConfig configuration, the hook will return an object with the actions
 * whatever data manipulation of the state should be executed through the custom actions with as access to the state and metadata
 * @template {TState} TState - The state type
 * @template {TMetadata} TMetadata - The metadata type
 * @template {TStateMutator} TStateMutator - The storeActionsConfig type (optional) - if you pass an storeActionsConfig the hook will return an object with the actions
 *
 * @example
 *
 * const store = new GlobalStore(0, {
 *  increment: () => ({ setState }) => {
 *    setState((state) => state + 1);
 *  },
 *  decrement: () => ({ setState }) => {
 *    setState((state) => state - 1);
 *  },
 * });
 *
 * const [state, actions] = store.getHook();
 *
 * actions.increment();
 * actions.decrement();
 *
 * console.log(state); // 0
 */
export type ActionCollectionResult<
  TState,
  TMetadata,
  ActionsConfig extends ActionCollectionConfig<any, any, any> | null = null,
  FullActionsConfig extends ActionCollectionConfig<any, any, any> = ActionsConfig extends null
    ? null
    : ActionCollectionConfig<TState, TMetadata, ActionsConfig>
> = ActionsConfig extends null
  ? null
  : {
      /**
       * @description
       * A new object with will be created with the same keys of the storeActionsConfig object
       */
      [key in keyof FullActionsConfig]: (
        ...params: Parameters<FullActionsConfig[key]>
      ) => ReturnType<ReturnType<FullActionsConfig[key]>>;
    };

/**
 * Common parameters of the store configuration callback functions
 * @param {StateSetter<TState>} setState - add a new value to the state
 * @param {() => TState} getState - get the current state
 * @param {MetadataSetter<TMetadata>} setMetadata - add a new value to the metadata
 * @param {() => TMetadata} getMetadata - get the current metadata
 * @param {ActionCollectionResult<TState, ActionCollectionConfig<TState, TMetadata>> | null} actions - the actions object returned by the hook when you pass an storeActionsConfig configuration otherwise null
 * @template {TState} TState - The state type
 * @template {TMetadata} TMetadata - The metadata type
 * @template {TStateMutator} TStateMutator - The storeActionsConfig type (optional) - if you pass an storeActionsConfig the hook will return an object with the actions
 * @template {ActionCollectionResult<TState, TStateMutator>} TStateMutator - the result of the API (optional) - if you don't pass an API as a parameter, you can pass null
 * */
export type StateConfigCallbackParam<State, Metadata, Actions> = StoreTools<State, Metadata, Actions>;

/**
 * Configuration of the store (optional) - if you don't need to use the store configuration you don't need to pass this parameter
 * @param {StateConfigCallbackParam<TState, TMetadata> => void} onInit - callback function called when the store is initialized
 * @param {StateConfigCallbackParam<TState, TMetadata> => void} onSubscribed - callback function called every time a component is subscribed to the store
 * @param {StateChangesParam<TState, TMetadata> => boolean} computePreventStateChange - callback function called every time the state is changed and it allows you to prevent the state change
 * @param {StateChangesParam<TState, TMetadata> => void} onStateChanged - callback function called every time the state is changed
 * @template TState - the type of the state
 * @template TMetadata - the type of the metadata (optional) - if you don't pass an metadata as a parameter, you can pass null
 * @template {ActionCollectionConfig<TState,TMetadata> | null} TPublicStateMutator - the configuration of the API (optional) - if you don't pass an API as a parameter, you can pass null
 * */
export type GlobalStoreConfig<TState, TMetadata, StoreAPI> = {
  /**
   * @param {StateConfigCallbackParam<TState, TMetadata> => void} metadata - the initial value of the metadata
   * */
  metadata?: TMetadata;

  onInit?: (storeAPI: StoreAPI) => void;

  /**
   * @param {StateChangesParam<TState, TMetadata> => void} onStateChanged - callback function called every time the state is changed
   * @returns {void} result - void
   */
  onStateChanged?: (storeAPI: StoreAPI & StateChanges<TState>) => void;

  /**
   * @param {StateConfigCallbackParam<TState, TMetadata> => void} onSubscribed - callback function called every time a component is subscribed to the store
   * @returns {void} result - void
   */
  onSubscribed?: (storeAPI: StoreAPI) => void;

  /**
   * @param {StateChangesParam<TState, TMetadata> => boolean} computePreventStateChange - callback function called every time the state is about to change and it allows you to prevent the state change
   * @returns {boolean} result - true if you want to prevent the state change, false otherwise
   */
  computePreventStateChange?: (storeAPI: StoreAPI & StateChanges<TState>) => boolean;
};

export type UseHookConfig<TState, TRoot = any> = {
  /**
   * The callback to execute when the state is changed to check if the same really changed
   * If the function is not provided the derived state will perform a shallow comparison
   */
  isEqual?: (current: TState, next: TState) => boolean;
  isEqualRoot?: (current: TRoot, next: TRoot) => boolean;
  dependencies?: unknown[];
};

/**
 * Callback function to unsubscribe from the store
 */
export type UnsubscribeCallback = () => void;

/**
 * Configuration of the subscribe callbacks
 */
export type SubscribeCallbackConfig<TState> = UseHookConfig<TState> & {
  /**
   * By default the callback is executed immediately after the subscription
   */
  skipFirst?: boolean;
};

/**
 * Callback function to subscribe to the store changes
 */
export type SubscribeCallback<TState> = (state: TState) => void;

/**
 * Callback function to subscribe to the store changes from a getter
 */
export type SubscriberCallback<TState> = (subscribe: SubscribeToEmitter<TState>) => void;

/**
 * Callback function to get the current state of the store or to subscribe to the store changes
 * @template TState - the type of the state
 * @param {SubscriberCallback<TState> | null} callback - the callback function to subscribe to the store changes (optional)
 * use the methods subscribe and subscribeSelect to subscribe to the store changes
 * if you don't pass a callback function the hook will return the current state of the store
 * @returns {UnsubscribeCallback | TState} result - the state or the unsubscribe callback if you pass a callback function
 */
export type StateGetter<TState> = <Subscription extends Subscribe | false = false>(
  /**
   * @param {SubscriberCallback<TState> | null} callback - the callback function to subscribe to the store changes (optional)
   * use the methods subscribe and subscribeSelect to subscribe to the store changes
   */
  callback?: Subscription extends Subscribe ? SubscriberCallback<TState> : null
) => Subscription extends Subscribe ? UnsubscribeCallback : TState;

export type MetadataGetter<TMetadata> = () => TMetadata;

/**
 * Constant value type to indicate that the getter is a subscription
 */
export type Subscribe = true;

/**
 * @description
 * Configuration of the custom global hook
 */
export type CustomGlobalHookParams<
  TCustomConfig,
  State,
  Metadata extends Record<string, unknown> = {},
  ActionsConfig extends ActionCollectionConfig<any, any, any> | null | {} = null,
  FullActionsConfig extends ActionCollectionConfig<any, any, any> = ActionsConfig extends null
    ? null
    : ActionCollectionConfig<State, Metadata, ActionsConfig>,
  Actions extends ActionCollectionResult<State, Metadata, FullActionsConfig> = ActionsConfig extends null
    ? null
    : ActionCollectionResult<State, Metadata, FullActionsConfig>,
  // PublicStateMutator = ActionsConfig extends null ? StateSetter<State> : Actions,
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
> = {
  /**
   * @description
   * Type of the configuration object that the custom hook will require or accept
   */
  config?: TCustomConfig;

  /**
   * @description
   * The type of the actionsConfig object (optional) (default: null) if a configuration is passed, the hook will return an object with the actions then all the store manipulation will be done through the actions
   */
  actions?: ActionsConfig;
} & GlobalStoreConfig<State, Metadata, StoreAPI>;

export type SelectorCallback<TState, TDerivate> = (state: TState) => TDerivate;

/**
 * @description
 * Function to subscribe to the store changes
 * @returns {UnsubscribeCallback} result - Function to unsubscribe from the store
 */
export type SubscribeToEmitter<TState> = <
  TParam1 extends SubscribeCallback<TState> | SelectorCallback<TState, unknown>,
  TResult = ReturnType<TParam1>,
  TConfig = TResult extends void | null | undefined | never
    ? SubscribeCallbackConfig<TState>
    : SubscribeCallbackConfig<TResult>,
  TParam2 extends SubscribeCallbackConfig<TState> | SubscribeCallback<TResult> = TResult extends
    | void
    | null
    | undefined
    | never
    ? TConfig
    : SubscribeCallback<TResult>,
  TParam3 = TResult extends void | null | undefined | never ? never : TConfig
>(
  /**
   * @description
   * The callback function to subscribe to the store changes or a selector function to derive the state
   */
  param1: TParam1,

  /**
   * @description
   * The configuration object or the callback function to subscribe to the store changes
   */
  param2?: TParam2,

  /**
   * @description
   * The configuration object
   */
  param3?: TParam3
) => UnsubscribeCallback;

export type SubscriberParameters = {
  subscriptionId: string;
  selector: SelectorCallback<any, any>;
  config: UseHookConfig<any> | SubscribeCallbackConfig<any>;
  currentState: unknown;
  callback: SubscriptionCallback;
};

/**
 * @description
 * This is the final listener of the store changes, it can be a subscription or a setState
 * @param {unknown} params - The parameters of the subscription
 * @param {unknown} params.state - The new state
 * @param {string} params.identifier - Optional identifier for the setState call
 */
export type SubscriptionCallback = (params: { state: unknown; identifier?: string }) => void;

export type SetStateCallback = (parameters: { state: unknown }) => void;
