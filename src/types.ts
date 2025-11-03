export type AnyFunction = (...args: any[]) => any;

/**
 * @description Represents the complete non-reactive API of a global state instance.
 * This API provides full control over the state, including reading, writing, subscribing,
 * and creating derived hooks or observable fragments.
 */
export type StateApi<State, StateDispatch, StateMutator, Metadata extends BaseMetadata> = {
  /**
   * Returns the metadata
   * Metadata is additional non reactive information associated with the global state
   */
  getMetadata: MetadataGetter<Metadata>;

  /**
   * Sets the metadata value
   * The metadata value is not reactive and wont trigger re-renders
   */
  setMetadata: MetadataSetter<Metadata>;

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
  setState: StateMutator extends AnyFunction ? StateDispatch : null;

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
  createSelectorHook: <Selection>(
    selector: (state: State) => Selection,
    args?: Omit<UseHookConfig<Selection, State>, 'dependencies'> & {
      name?: string;
    },
  ) => StateHook<Selection, StateDispatch, StateMutator, Metadata>;

  /**
   * @description Creates a function that allows you to subscribe to a fragment of the state
   * The observable selection will notify the subscribers only if the fragment changes and the equality function returns false
   * you can customize the equality function by passing the isEqualRoot and isEqual parameters
   */
  createObservable: <Selection>(
    this: StateApi<State, StateDispatch, StateMutator, Metadata>,
    selector: (state: State) => Selection,
    args?: {
      isEqual?: (current: Selection, next: Selection) => boolean;
      isEqualRoot?: (current: State, next: State) => boolean;
      /**
       * @description Name of the observable fragment for debugging purposes
       */
      name?: string;
    },
  ) => ObservableFragment<Selection, StateDispatch, StateMutator, Metadata>;

  /**
   * @description Disposes the global state instance, cleaning up all resources and subscriptions.
   */
  dispose: () => void;
};

/**
 * @description Function that allows you to subscribe to a fragment of the state
 */
export type ObservableFragment<
  State,
  StateDispatch,
  StateMutator,
  Metadata extends BaseMetadata,
> = SubscribeToState<State> & StateApi<State, StateDispatch, StateMutator, Metadata>;

export interface StateHook<State, StateDispatch, StateMutator, Metadata extends BaseMetadata>
  extends StateApi<State, StateDispatch, StateMutator, Metadata> {
  (): Readonly<[state: State, stateMutator: StateMutator, metadata: Metadata]>;

  <Derivate>(
    selector: (state: State) => Derivate,
    dependencies?: unknown[],
  ): Readonly<[state: Derivate, stateMutator: StateMutator, metadata: Metadata]>;

  <Derivate>(
    selector: (state: State) => Derivate,
    config?: UseHookConfig<Derivate, State>,
  ): Readonly<[state: Derivate, stateMutator: StateMutator, metadata: Metadata]>;
}

export type MetadataSetter<Metadata extends BaseMetadata> = (
  setter: Metadata | ((metadata: Metadata) => Metadata),
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
  Metadata extends BaseMetadata = BaseMetadata,
  Actions extends undefined | unknown | Record<string, AnyFunction> = unknown,
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
  Metadata extends BaseMetadata,
  ThisAPI = Record<string, (...parameters: any[]) => unknown>,
> {
  readonly [key: string]: {
    (
      this: ThisAPI,
      ...parameters: any[]
    ): (
      this: ThisAPI,
      storeTools: StoreTools<State, Metadata, Record<string, (...parameters: any[]) => unknown | void>>,
    ) => unknown | void;
  };
}

export type ActionCollectionResult<
  State,
  Metadata extends BaseMetadata,
  ActionsConfig extends ActionCollectionConfig<State, Metadata>,
> = {
  [key in keyof ActionsConfig]: {
    (...params: Parameters<ActionsConfig[key]>): ReturnType<ReturnType<ActionsConfig[key]>>;
  };
};

/**
 * Callbacks for the global store lifecycle events
 */
export type GlobalStoreCallbacks<State, Metadata extends BaseMetadata> = {
  /**
   * @description Called when the store is initialized
   */
  onInit?: (args: StoreTools<State, Metadata>) => void;

  /**
   * @description Called when the state has changed
   */
  onStateChanged?: (args: StoreTools<State, Metadata> & StateChanges<State>) => void;

  /**
   * @description Called when a new subscription is created
   */
  onSubscribed?: (args: StoreTools<State, Metadata>, subscription: SubscriberParameters) => void;

  /**
   * @description Called to determine whether to prevent a state change
   */
  computePreventStateChange?: (args: StoreTools<State, Metadata> & StateChanges<State>) => boolean;

  /**
   * @description Called when the store is unmounted, only applicable in context stores
   */
  onUnMount?: (store: StateApi<State, any, any, Metadata>) => void;
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
 * @description Subscribe to the state changes
 * You can subscribe to the whole state or to a fragment of the state by passing a selector as first parameter
 * This can be used in non react environments to listen to the state changes
 */
export type SubscribeToState<State> = {
  (subscription: SubscribeCallback<State>, config?: SubscribeCallbackConfig<State>): UnsubscribeCallback;

  <TDerivate>(
    selector: SelectorCallback<State, TDerivate>,
    subscription: SubscribeCallback<TDerivate>,
    config?: SubscribeCallbackConfig<TDerivate>,
  ): UnsubscribeCallback;
};

export type BaseMetadata = Record<string, unknown>;

export type MetadataGetter<Metadata extends BaseMetadata> = () => Metadata;

export type CustomGlobalHookBuilderParams<
  TCustomConfig extends BaseMetadata | unknown,
  Metadata extends BaseMetadata,
> = {
  onInitialize?: (args: StoreTools<unknown, Metadata, unknown>, config: TCustomConfig | undefined) => void;
  onChange?: (
    args: StoreTools<unknown, Metadata, unknown> & StateChanges<unknown>,
    config: TCustomConfig | undefined,
  ) => void;
};

export type SelectorCallback<State, TDerivate> = (state: State) => TDerivate;

export type SubscriberParameters = {
  selector: SelectorCallback<any, any> | undefined;
  getConfig: () => UseHookConfig<any> | SubscribeCallbackConfig<any> | undefined;
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
  args: { identifier?: string },
) => void;
