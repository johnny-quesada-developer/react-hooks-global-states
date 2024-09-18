export type StateSetter<State> = (
  setter: State | ((state: State) => State),
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

export type StateHook<State, StateMutator, Metadata extends BaseMetadata> = (<Derivate = State>(
  selector?: (state: State) => Derivate,
  config?: UseHookConfig<Derivate, State>
) => Readonly<[state: Derivate, stateMutator: StateMutator, metadata: Metadata]>) & {
  /**
   * @description Return the state controls of the hook
   * This selectors includes:
   * - stateRetriever: a function to get the current state or subscribe a callback to the state changes
   * - stateMutator: a function to set the state or a collection of actions if you pass an storeActionsConfig configuration
   * - metadataRetriever: a function to get the metadata of the global state
   */
  stateControls: () => Readonly<
    [retriever: StateGetter<State>, mutator: StateMutator, metadata: MetadataGetter<Metadata>]
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
    Metadata extends BaseMetadata,
    RootSelectorResult,
    RootDerivate = RootSelectorResult extends never ? RootState : RootSelectorResult
  >(
    this: StateHook<RootState, StateMutator, Metadata>,
    mainSelector?: (state: RootState) => RootSelectorResult,
    { isEqualRoot, isEqual }?: Omit<UseHookConfig<RootDerivate, RootState>, 'dependencies'>
  ) => StateHook<RootDerivate, StateMutator, Metadata>;

  State: State;
  StateMutator: StateMutator;
  Metadata: Metadata;
};

export type MetadataSetter<Metadata extends BaseMetadata> = (
  setter: Metadata | ((metadata: Metadata) => Metadata)
) => void;

export type StateChanges<State> = {
  state: State;

  previousState?: State;

  identifier?: string;
};

/**
 * API for the actions of the global states
 **/
export type StoreTools<
  State,
  Metadata extends BaseMetadata = BaseMetadata,
  Actions = Record<string, (...args: any[]) => void>
> = {
  setMetadata: MetadataSetter<Metadata>;

  setState: StateSetter<State>;

  getState: StateGetter<State>;

  getMetadata: () => Metadata;

  actions: Actions;
};

/**
 * contract for the storeActionsConfig configuration
 */
export interface ActionCollectionConfig<State, Metadata extends BaseMetadata> {
  readonly [key: string]: (
    ...parameters: any[]
  ) => (
    storeTools: StoreTools<State, Metadata, Record<string, (...parameters: any[]) => unknown | void>>
  ) => unknown | void;
}

export type ActionCollectionResult<
  State,
  Metadata extends BaseMetadata,
  ActionsConfig extends ActionCollectionConfig<State, Metadata>
> = {
  [key in keyof ActionsConfig]: (
    ...params: Parameters<ActionsConfig[key]>
  ) => ReturnType<ReturnType<ActionsConfig[key]>>;
};

export type GlobalStoreConfig<State, Metadata extends BaseMetadata> = {
  /**
   * non reactive information that you want to store in the store
   * */
  metadata?: Metadata;

  onInit?: (args: StoreTools<State, Metadata>) => void;

  onStateChanged?: (args: StoreTools<State, Metadata> & StateChanges<State>) => void;

  onSubscribed?: (args: StoreTools<State, Metadata>) => void;

  computePreventStateChange?: (args: StoreTools<State, Metadata> & StateChanges<State>) => boolean;
};

export type UseHookConfig<State, TRoot = any> = {
  /**
   * The callback to execute when the state is changed to check if the same really changed
   * If the function is not provided the derived state will perform a shallow comparison
   */
  isEqual?: (current: State, next: State) => boolean;
  isEqualRoot?: (current: TRoot, next: TRoot) => boolean;
  dependencies?: unknown[];
};

export type UnsubscribeCallback = () => void;

export type SubscribeCallbackConfig<State> = UseHookConfig<State> & {
  /**
   * By default the callback is executed immediately after the subscription
   */
  skipFirst?: boolean;
};

/**
 * Callback function to subscribe to the store changes
 */
export type SubscribeCallback<State> = (state: State) => void;

/**
 * Callback function to subscribe to the store changes from a getter
 */
export type SubscriberCallback<State> = (subscribe: SubscribeToEmitter<State>) => void;

/**
 * Callback function to get the current state of the store or to subscribe to the store changes
 * @template State - the type of the state
 * @param {SubscriberCallback<State> | null} callback - the callback function to subscribe to the store changes (optional)
 * use the methods subscribe and subscribeSelect to subscribe to the store changes
 * if you don't pass a callback function the hook will return the current state of the store
 * @returns {UnsubscribeCallback | State} result - the state or the unsubscribe callback if you pass a callback function
 */
export type StateGetter<State> = <Subscription extends Subscribe | false = false>(
  /**
   * @param {SubscriberCallback<State> | null} callback - the callback function to subscribe to the store changes (optional)
   * use the methods subscribe and subscribeSelect to subscribe to the store changes
   */
  callback?: Subscription extends Subscribe ? SubscriberCallback<State> : null
) => Subscription extends Subscribe ? UnsubscribeCallback : State;

export type BaseMetadata = {
  name?: string;
} & Record<string, any>;

export type MetadataGetter<Metadata extends BaseMetadata> = () => Metadata;

/**
 * Constant value type to indicate that the getter is a subscription
 */
export type Subscribe = true;

export type CustomGlobalHookBuilderParams<TInheritMetadata extends BaseMetadata, TCustomConfig> = {
  onInitialize: (args: StoreTools<any, TInheritMetadata>, config: TCustomConfig) => void;
  onChange: (args: StoreTools<any, TInheritMetadata> & StateChanges<any>, config: TCustomConfig) => void;
};

export type SelectorCallback<State, TDerivate> = (state: State) => TDerivate;

/**
 * @description
 * Function to subscribe to the store changes
 * @returns {UnsubscribeCallback} result - Function to unsubscribe from the store
 */
export type SubscribeToEmitter<State> = <
  TParam1 extends SubscribeCallback<State> | SelectorCallback<State, unknown>,
  TResult = ReturnType<TParam1>,
  TConfig = TResult extends void | null | undefined | never
    ? SubscribeCallbackConfig<State>
    : SubscribeCallbackConfig<TResult>,
  TParam2 extends SubscribeCallbackConfig<State> | SubscribeCallback<TResult> = TResult extends
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
