export type AnyFunction = (...args: any[]) => any;

export type HookExtensions<State, StateMutator, Metadata extends BaseMetadata | unknown> = {
  /**
   * @deprecated This method is deprecated and may be removed in future versions.
   * @description Return the state controls of the hook
   * This selectors includes:
   * - stateRetriever: a function to get the current state or subscribe a callback to the state changes
   * - stateMutator: a function to set the state or a collection of actions if you pass an storeActionsConfig configuration
   * - metadataRetriever: a function to get the metadata of the global state
   */
  stateControls: () => Readonly<
    [retriever: StateGetter<State>, mutator: StateMutator, metadata: MetadataGetter<Metadata>]
  >;

  /**
   * Returns the metadata
   * Metadata is additional non reactive information associated with the global state
   */
  metadata: MetadataGetter<Metadata>;

  /**
   * @description Contains the generated action functions if custom actions are defined.
   * When actions exist, direct state mutation via `setState` is disabled and setState will be `null`.
   * If no actions are provided, this property is `null`.
   */
  actions: StateMutator extends AnyFunction ? null : StateMutator;

  /**
   * @description Provides direct access to the state updater when no custom actions are defined.
   * When actions exist, direct state mutation via `setState` is disabled and this property will be `null`.
   * If no actions are provided, this property exposes the `setState` function.
   */
  setState: StateMutator extends AnyFunction ? React.Dispatch<React.SetStateAction<State>> : null;

  /**
   * @description Get the current state value
   */
  getState: () => State;

  /**
   * @description Subscribe to the state changes
   * You can subscribe to the whole state or to a fragment of the state by passing a selector as first parameter,
   * this can be used in non react environments to listen to the state changes
   */
  subscribe: SubscribeToState<State>;

  /***
   * @description Creates a new hooks that returns the result of the selector passed as a parameter
   * Your can create selector hooks of other selectors hooks and extract as many derived states as or fragments of the state as you want
   * The selector hook will be evaluated only if the result of the selector changes and the equality function returns false
   * you can customize the equality function by passing the isEqualRoot and isEqual parameters
   */
  createSelectorHook: <Derivate>(
    this: StateHook<State, StateMutator, Metadata>,
    selector: (state: State) => Derivate,
    args?: Omit<UseHookConfig<Derivate, State>, 'dependencies'> & {
      name?: string;
    }
  ) => StateHook<Derivate, StateMutator, Metadata>;

  /**
   * @description Creates a function that allows you to subscribe to a fragment of the state
   * The observable fragment will notify the subscribers only if the fragment changes and the equality function returns false
   * you can customize the equality function by passing the isEqualRoot and isEqual parameters
   */
  createObservable: <Fragment>(
    this: StateHook<State, StateMutator, Metadata>,
    selector: (state: State) => Fragment,
    args?: {
      isEqual?: (current: Fragment, next: Fragment) => boolean;
      isEqualRoot?: (current: State, next: State) => boolean;
      /**
       * @description Name of the observable fragment for debugging purposes
       */
      name?: string;
    }
  ) => ObservableFragment<Fragment>;
};

/**
 * @description Function that allows you to subscribe to a fragment of the state
 */
export type ObservableFragment<State> = SubscribeToState<State> & {
  createObservable: <Fragment>(
    this: ObservableFragment<State>,
    selector: (state: State) => Fragment,
    args?: {
      isEqual?: (current: Fragment, next: Fragment) => boolean;
      isEqualRoot?: (current: State, next: State) => boolean;
      /**
       * @description Name of the observable fragment for debugging purposes
       */
      name?: string;
    }
  ) => ObservableFragment<Fragment>;

  removeSubscriptions: () => void;

  _name: string | undefined;
};

export interface StateHook<State, StateMutator, Metadata extends BaseMetadata | unknown>
  extends HookExtensions<State, StateMutator, Metadata> {
  (): Readonly<[state: State, stateMutator: StateMutator, metadata: Metadata]>;

  <Derivate>(selector: (state: State) => Derivate, dependencies?: unknown[]): Readonly<
    [state: Derivate, stateMutator: StateMutator, metadata: Metadata]
  >;

  <Derivate>(selector: (state: State) => Derivate, config?: UseHookConfig<Derivate, State>): Readonly<
    [state: Derivate, stateMutator: StateMutator, metadata: Metadata]
  >;
}

export type MetadataSetter<Metadata extends BaseMetadata | unknown> = (
  setter: Metadata | ((metadata: Metadata) => Metadata)
) => void;

export type StateChanges<State> = {
  state: State;
  previousState: State | undefined;
  identifier: string | undefined;
};

/**
 * API for the actions of the global states
 **/
export type StoreTools<
  State,
  Metadata extends BaseMetadata | unknown = BaseMetadata,
  Actions extends undefined | unknown | Record<string, AnyFunction> = unknown
> = {
  setMetadata: MetadataSetter<Metadata>;
  setState: React.Dispatch<React.SetStateAction<State>>;
  getState: () => State;
  subscribe: SubscribeToState<State>;
  getMetadata: () => Metadata;
  actions: Actions;
};

/**
 * contract for the storeActionsConfig configuration
 */
export interface ActionCollectionConfig<
  State,
  Metadata extends BaseMetadata | unknown,
  ThisAPI = Record<string, (...parameters: any[]) => unknown>
> {
  readonly [key: string]: {
    (this: ThisAPI, ...parameters: any[]): (
      this: ThisAPI,
      storeTools: StoreTools<State, Metadata, Record<string, (...parameters: any[]) => unknown | void>>
    ) => unknown | void;
  };
}

export type ActionCollectionResult<
  State,
  Metadata extends BaseMetadata | unknown,
  ActionsConfig extends ActionCollectionConfig<State, Metadata>
> = {
  [key in keyof ActionsConfig]: {
    (...params: Parameters<ActionsConfig[key]>): ReturnType<ReturnType<ActionsConfig[key]>>;
  };
};

export type GlobalStoreCallbacks<State, Metadata extends BaseMetadata | unknown> = {
  onInit?: (args: StoreTools<State, Metadata>) => void;
  onStateChanged?: (args: StoreTools<State, Metadata> & StateChanges<State>) => void;
  onSubscribed?: (args: StoreTools<State, Metadata>, subscription: SubscriberParameters) => void;
  computePreventStateChange?: (args: StoreTools<State, Metadata> & StateChanges<State>) => boolean;
};

export type UseHookConfig<State, TRoot = any> = {
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
 * @deprecated Use `getState` instead or `subscribe` method depending on your needs
 * get the current state or subscribe to the state changes
 */
export type StateGetter<State> = {
  (): State;
} & SubscribeToState<State>;

/**
 * @description Subscribe to the state changes
 * You can subscribe to the whole state or to a fragment of the state by passing a selector as first parameter
 * This can be used in non react environments to listen to the state changes
 */
export type SubscribeToState<State> = {
  (subscription: SubscribeCallback<State>, config?: SubscribeCallbackConfig<State>): UnsubscribeCallback;

  <TDerivate>(
    selector: SelectorCallback<State, TDerivate>,
    subscription: SubscribeCallback<TDerivate>,
    config?: SubscribeCallbackConfig<TDerivate>
  ): UnsubscribeCallback;
};

export type BaseMetadata = Record<string, unknown>;

export type MetadataGetter<Metadata extends BaseMetadata | unknown> = () => Metadata;

export type CustomGlobalHookBuilderParams<
  TCustomConfig extends BaseMetadata | unknown,
  Metadata extends BaseMetadata | unknown
> = {
  onInitialize?: (args: StoreTools<unknown, Metadata, unknown>, config: TCustomConfig | undefined) => void;
  onChange?: (
    args: StoreTools<unknown, Metadata, unknown> & StateChanges<unknown>,
    config: TCustomConfig | undefined
  ) => void;
};

export type SelectorCallback<State, TDerivate> = (state: State) => TDerivate;

export type SubscriberId = string & { __brand: 'SubscriberId' };

export type SubscriberParameters = {
  subscriptionId: string;
  selector: SelectorCallback<unknown, unknown> | undefined;
  getConfig: () => UseHookConfig<unknown> | SubscribeCallbackConfig<unknown> | undefined;
  currentState: unknown;
  callback: SubscriptionCallback | (() => void);
};

/**
 * @description
 * This is the final listener of the store changes, it can be a subscription or a setState
 * @param {unknown} params - The parameters of the subscription
 * @param {unknown} params.state - The new state
 * @param {string} params.identifier - Optional identifier for the setState call
 */
export type SubscriptionCallback<State = unknown> = (
  params: { state: State },
  args: { identifier?: string }
) => void;
