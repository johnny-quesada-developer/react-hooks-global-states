// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyFunction = (...args: any[]) => any;

/**
 * @description Represents a hook that returns a readonly state.
 */
export interface ReadonlyHook<State, StateMutator, Metadata extends BaseMetadata>
  extends ReadonlyStateApi<State, StateMutator, Metadata> {
  /**
   * @description Returns the current state value.
   */
  (): State;

  /**
   * @description Returns a derived state based on the provided selector function.
   */
  <Derivate>(selector: (state: State) => Derivate, dependencies?: unknown[]): Derivate;

  /**
   * @description Returns a derived state based on the provided selector function and configuration.
   */
  <Derivate>(selector: (state: State) => Derivate, config?: UseHookOptions<Derivate, State>): Derivate;
}

/**
 * @description Hook to select a fragment of the state
 */
export interface SelectHook<State> {
  /**
   * @description Selects a fragment of the state using the provided selector function.
   * @param selector - The function to select a fragment of the state.
   * @param dependencies - Optional dependencies array to control re-evaluation.
   * @returns The selected fragment of the state.
   */
  <Selection>(selector: (state: State) => Selection, dependencies?: unknown[]): Selection;

  /**
   * @description Selects a fragment of the state using the provided selector function and configuration.
   * @param selector - The function to select a fragment of the state.
   * @param args - Configuration options for the selection.
   * @returns The selected fragment of the state.
   */
  <Selection>(selector: (state: State) => Selection, args?: UseHookOptions<Selection, State>): Selection;
}

/**
 * @description Represents the complete non-reactive API of a global state instance.
 * This API provides full control over the state, including reading, writing, subscribing,
 * and creating derived hooks or observable fragments.
 */
export type StateApi<State, StateMutator, Metadata extends BaseMetadata> = {
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
  createSelectorHook: <Selection>(
    selector: (state: State) => Selection,
    args?: Omit<UseHookOptions<Selection, State>, 'dependencies'> & {
      name?: string;
    },
  ) => ReadonlyHook<Selection, StateMutator, Metadata>;

  /**
   * @description Creates a function that allows you to subscribe to a fragment of the state
   * The observable selection will notify the subscribers only if the fragment changes and the equality function returns false
   * you can customize the equality function by passing the isEqualRoot and isEqual parameters
   */
  createObservable: <Selection>(
    this: ReadonlyStateApi<State, StateMutator, Metadata>,
    selector: (state: State) => Selection,
    args?: {
      isEqual?: (current: Selection, next: Selection) => boolean;
      isEqualRoot?: (current: State, next: State) => boolean;
      /**
       * @description Name of the observable fragment for debugging purposes
       */
      name?: string;
    },
  ) => ObservableFragment<Selection, StateMutator, Metadata>;

  /**
   * @description Selects a fragment of the state using the provided selector function.
   */
  select: SelectHook<State>;

  /**
   * @description Sugared hook to use the global state in React components
   * Allows you to tread the global hook as an store, with better semantics
   *
   * @example
   * ```tsx
   * const contacts = createContext<ContactType[]>([]);
   *
   * function ContactsList() {
   *   const [contacts, setContacts] = contacts.use();
   * ```
   *
   * This is more practical since the StateApi is slightly more complex than a simple hook
   *
   * @example
   * Using a global state:
   *
   * ```tsx
   * const [state, setState, metadata] = state.use();
   *
   * const selection = state.select((state) => state.someFragment);
   *
   * const unsubscribe = state.subscribe((state) => { ... });
   *
   * const useFragment = state.createSelectorHook((state) => state.someFragment);
   *
   * const observable = state.createObservable((state) => state.someFragment);
   * ```
   */
  use: StateHook<State, StateMutator, Metadata>;

  /**
   * @description Disposes the global state instance, cleaning up all resources and subscriptions.
   */
  dispose: () => void;

  /**
   * @deprecated
   * @description Useful for debugging purposes, exposes the current subscribers of the store
   * You'll probably not need to use this in your application
   */
  subscribers: Set<SubscriberParameters>;
};

/**
 * @description Readonly version of the StateApi, excluding mutative methods.
 */
export type ReadonlyStateApi<State, StateMutator, Metadata extends BaseMetadata> = Pick<
  StateApi<State, StateMutator, Metadata>,
  'dispose' | 'getState' | 'subscribe' | 'createSelectorHook' | 'createObservable' | 'subscribers'
>;

/**
 * @description Function that allows you to subscribe to a fragment of the state
 */
export type ObservableFragment<State, StateMutator, Metadata extends BaseMetadata> = SubscribeToState<State> &
  Pick<
    StateApi<State, StateMutator, Metadata>,
    'getState' | 'subscribe' | 'createSelectorHook' | 'createObservable' | 'dispose' | 'subscribers'
  >;

export interface StateHook<State, StateMutator, Metadata extends BaseMetadata>
  extends StateApi<State, StateMutator, Metadata> {
  /**
   * @description React hook that provides access to the state, state mutator, and metadata.
   */
  (): Readonly<[state: State, stateMutator: StateMutator, metadata: Metadata]>;

  /**
   * @description React hook that provides a derived state based on the provided selector function.
   */
  <Derivate>(
    selector: (state: State) => Derivate,
    dependencies?: unknown[],
  ): Readonly<[state: Derivate, stateMutator: StateMutator, metadata: Metadata]>;

  /**
   * @description React hook that provides a derived state based on the provided selector function and configuration.
   */
  <Derivate>(
    selector: (state: State) => Derivate,
    config?: UseHookOptions<Derivate, State>,
  ): Readonly<[state: Derivate, stateMutator: StateMutator, metadata: Metadata]>;
}

/**
 * @description Function to set the metadata value
 * The metadata value is not reactive and wont trigger re-renders
 */
export type MetadataSetter<Metadata extends BaseMetadata> = (
  setter: Metadata | ((metadata: Metadata) => Metadata),
) => void;

/**
 * @description Represents the changes in the state
 */
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
  StateMutator = React.Dispatch<React.SetStateAction<State>>,
  Metadata extends BaseMetadata = BaseMetadata,
> = {
  /**
   * The actions available for the global state
   */
  actions: StateMutator extends AnyFunction ? null : StateMutator;

  /**
   * @description Metadata associated with the global state
   */
  getMetadata: () => Metadata;

  /**
   * @description Current state value
   */
  getState: () => State;

  /**
   * @description Sets the metadata value
   */
  setMetadata: MetadataSetter<Metadata>;

  /**
   * @description Function to set the state value
   */
  setState: (
    setter: React.SetStateAction<State>,

    args?: {
      /**
       * @description Force update even if the state value did not change, this is for advanced use cases only
       */
      forceUpdate?: boolean;

      /**
       * @description Optional identifier visible on the devtools
       */
      identifier?: string;
    },
  ) => void;

  /**
   * @description Subscribe to the state changes
   * You can subscribe to the whole state or to a fragment of the state by passing a selector as first parameter,
   * this can be used in non react environments to listen to the state changes
   *
   * @example
   * ```ts
   * const unsubscribe = storeTools.subscribe((state) => {
   *   console.log('State changed:', state);
   * });
   *
   * // To unsubscribe later
   * unsubscribe();
   * ```
   */
  subscribe: SubscribeToState<State>;
};

/**
 * contract for the storeActionsConfig configuration
 */
export interface ActionCollectionConfig<
  State,
  Metadata extends BaseMetadata,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ThisAPI = Record<string, (...parameters: any[]) => unknown>,
> {
  readonly [key: string]: {
    (
      this: ThisAPI,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...parameters: any[]
    ): (
      this: ThisAPI,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      storeTools: StoreTools<State, Record<string, (...parameters: any[]) => unknown | void>, Metadata>,
    ) => unknown | void;
  };
}

/**
 * @description Resulting type of the action collection configuration
 */
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
export type GlobalStoreCallbacks<State, StateMutator, Metadata extends BaseMetadata> = {
  /**
   * @description Called when the store is initialized
   */
  onInit?: (args: StoreTools<State, StateMutator, Metadata>) => void;

  /**
   * @description Called when the state has changed
   */
  onStateChanged?: (args: StoreTools<State, StateMutator, Metadata> & StateChanges<State>) => void;

  /**
   * @description Called when a new subscription is created
   */
  onSubscribed?: (
    args: StoreTools<State, StateMutator, Metadata>,
    subscription: SubscriberParameters,
  ) => void;

  /**
   * @description Called to determine whether to prevent a state change
   */
  computePreventStateChange?: (
    args: StoreTools<State, StateMutator, Metadata> & StateChanges<State>,
  ) => boolean;

  /**
   * @description Called when the store is unmounted, only applicable in context stores
   */
  onUnMount?: (store: StoreTools<State, StateMutator, Metadata>) => void;
};

/**
 * @description Configuration options for the use hook
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UseHookOptions<State, TRoot = any> = {
  isEqual?: (current: State, next: State) => boolean;
  isEqualRoot?: (current: TRoot, next: TRoot) => boolean;
  dependencies?: unknown[];
};

/**
 * @description Callback function to unsubscribe from the store changes
 */
export type UnsubscribeCallback = () => void;

/**
 * @description Configuration for the subscribe callback
 */
export type SubscribeCallbackConfig<State> = UseHookOptions<State> & {
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
  /**
   * @description Subscribe to the whole state changes
   *
   * @example
   * ```ts
   * const unsubscribe = store.subscribe((state) => {
   *   console.log('State changed:', state);
   * });
   *
   * // To unsubscribe later
   * unsubscribe();
   * ```
   */
  (subscription: SubscribeCallback<State>, config?: SubscribeCallbackConfig<State>): UnsubscribeCallback;

  /**
   * @description Subscribe to a fragment of the state changes
   *
   * @example
   * ```ts
   * const unsubscribe = store.subscribe(
   *   (fragment) => {
   *     console.log('Fragment changed:', fragment);
   *   },
   *   (state) => {
   *     console.log('Selected fragment changed:', state.someFragment);
   *   }
   * );
   *
   * // To unsubscribe later
   * unsubscribe();
   * ```
   */
  <TDerivate>(
    selector: SelectorCallback<State, TDerivate>,
    subscription: SubscribeCallback<TDerivate>,
    config?: SubscribeCallbackConfig<TDerivate>,
  ): UnsubscribeCallback;
};

/**
 * @description Metadata, non reactive additional information associated with the global state
 */
export type BaseMetadata = Record<string, unknown>;

/**
 * @description Function to get the metadata
 */
export type MetadataGetter<Metadata extends BaseMetadata> = () => Metadata;

/**
 * @description Selector function to derive a fragment of the state
 */
export type SelectorCallback<State, TDerivate> = (state: State) => TDerivate;

/**
 * @description Parameters for the store subscription
 */
export type SubscriberParameters = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selector: SelectorCallback<any, any> | undefined;

  currentState: unknown;

  /**
   * @description notification callback
   */
  onStoreChange: SubscriptionCallback | (() => void);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} & UseHookOptions<any> &
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  SubscribeCallbackConfig<any>;

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
