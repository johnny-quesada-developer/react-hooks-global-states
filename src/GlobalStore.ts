import { useMemo, useRef, useSyncExternalStore } from 'react';
import type {
  ActionCollectionConfig,
  GlobalStoreCallbacks,
  ActionCollectionResult,
  MetadataSetter,
  UseHookConfig,
  SubscribeCallbackConfig,
  SubscribeCallback,
  SelectorCallback,
  SubscriberParameters,
  StateHook,
  BaseMetadata,
  StateChanges,
  StoreTools,
  ObservableFragment,
  StateApi,
  UnsubscribeCallback,
  AnyFunction,
  SubscribeToState,
} from './types';
import { isFunction } from 'json-storage-formatter/isFunction';
import { isNil } from 'json-storage-formatter/isNil';
import { isRecord } from './isRecord';
import { isArray, shallowCompare } from './shallowCompare';
import { throwWrongKeyOnActionCollectionConfig } from './throwWrongKeyOnActionCollectionConfig';
import { uniqueId } from './uniqueId';
import debugProps from './GlobalStore.debugProps';

/**
 * The GlobalStore class is the main class of the library and it is used to create a GlobalStore instances
 * */
export class GlobalStore<
  State,
  Metadata extends BaseMetadata,
  ActionsConfig extends ActionCollectionConfig<State, Metadata> | undefined | unknown,
  PublicStateMutator = keyof ActionsConfig extends never | undefined
    ? React.Dispatch<React.SetStateAction<State>>
    : ActionCollectionResult<State, Metadata, NonNullable<ActionsConfig>>,
  StateDispatch = React.Dispatch<React.SetStateAction<State>>,
> {
  protected _name: string;

  public actionsConfig: ActionsConfig | null = null;

  public callbacks: GlobalStoreCallbacks<State, Metadata> | null = null;

  public metadata: Metadata;

  /**
   * @description If the actionsConfig is defined, this will be a map of actions that can be used to modify or interact with the state
   * */
  public actions: PublicStateMutator extends AnyFunction ? null : PublicStateMutator =
    null as PublicStateMutator extends AnyFunction ? null : PublicStateMutator;

  /**
   * @description The main hook that will be used to interact with the global state
   */
  public use!: StateHook<State, StateDispatch, PublicStateMutator, Metadata>;

  /**
   * @description
   * Access to the store api that will be passed to the actions and callbacks
   */
  private configurationCallbackParam!: StoreTools<State, Metadata>;

  public subscribers = new Set<SubscriberParameters>();

  public state: State;

  constructor(state: State);

  constructor(
    state: State,
    args: {
      metadata?: Metadata;
      callbacks?: GlobalStoreCallbacks<State, Metadata>;
      actions?: ActionsConfig;
      name?: string;
    },
  );

  constructor(
    state: State,
    args: {
      metadata?: Metadata;
      callbacks?: GlobalStoreCallbacks<State, Metadata>;
      actions?: ActionsConfig;
      name?: string;
    } = { metadata: {} as Metadata },
  ) {
    const { metadata, callbacks, actions, name: storeName } = args;

    this.state = state;
    this._name = storeName ?? uniqueId('gs:');
    this.metadata = metadata ?? ({} as Metadata);
    this.callbacks = callbacks ?? null;
    this.actionsConfig = actions ?? null;

    if (debugProps.isDevToolsPresent) {
      const hookStack = new Error().stack ?? '';
      debugProps.REACT_GLOBAL_STATE_HOOK_DEBUG?.(this, args, hookStack);
    }

    const isExtensionClass = this.constructor !== GlobalStore;
    if (isExtensionClass) return;

    (this as GlobalStore<State, Metadata, ActionsConfig>).initialize();
  }

  protected onInit?: (args: StoreTools<State, Metadata>) => void;
  protected onStateChanged?: (args: StoreTools<State, Metadata> & StateChanges<State>) => void;
  protected onSubscribed?: (args: StoreTools<State, Metadata>, subscription: SubscriberParameters) => void;
  protected computePreventStateChange?: (
    parameters: StoreTools<State, Metadata> & StateChanges<State>,
  ) => boolean;

  /**
   * @description
   * Initializes the global store, setting up the main hook and actions map if applicable,
   */
  protected initialize = async () => {
    const shouldCreateActionsMap = Object.keys(this.actionsConfig ?? {}).length > 0;

    // actions should be created first than the main hook and the configuration callback param
    // because both depend on the actions map being created
    if (shouldCreateActionsMap) {
      this.actions = this.getStoreActionsMap();
    }

    this.use = this.getMainHook();
    this.configurationCallbackParam = this.getConfigCallbackParam();

    const { onInit } = this;
    const { onInit: onInitFromConfig } = this.callbacks ?? {};

    if (!onInit && !onInitFromConfig) return;

    onInit?.(this.configurationCallbackParam);
    if (!isNil(onInitFromConfig)) onInitFromConfig?.(this.configurationCallbackParam);
  };

  /**
   * set the state for a single subscriber
   * validate if the state should be updated by comparing the previous state and the new state
   */
  protected executeSetStateForSubscriber = (
    subscription: SubscriberParameters,
    args: {
      forceUpdate: boolean | undefined;
      newState: State;
      currentState: State;
      identifier: string | undefined;
    },
  ): {
    didUpdate: boolean;
  } => {
    const { selector, callback, currentState: currentChildState, getConfig } = subscription;
    const config = getConfig?.() ?? {};

    // compare the root state, there should not be a re-render if the root state is the same
    if (!args.forceUpdate && (config?.isEqualRoot ?? ((a, b) => a === b))(args.currentState, args.newState)) {
      return { didUpdate: false };
    }

    const newChildState = selector ? selector(args.newState) : args.newState;

    // compare the state of the selected part of the state, there should not be a re-render if the state is the same
    if (!args.forceUpdate && (config?.isEqual ?? ((a, b) => a === b))(currentChildState, newChildState)) {
      return { didUpdate: false };
    }

    // update the current state of the subscription
    this.partialUpdateSubscription(subscription, {
      currentState: newChildState,
    });

    // execute the callback associated with the subscription
    // the callback could be an observer event or a sync callback from useSyncExternalStore
    callback(
      {
        state: newChildState,
      },
      {
        identifier: args.identifier,
      },
    );

    return { didUpdate: true };
  };

  /**
   * set the state and update all the subscribers
   * @param {State} newState - The new state to set
   * @param {object} options - The options for setting the state
   * @param {boolean} [options.forceUpdate] - Whether to force the update even if the state is the same
   * @param {string} [options.identifier] - An optional identifier for the state change
   * */
  protected setSubscribersState = (
    newState: State,
    { forceUpdate, identifier }: { forceUpdate?: boolean; identifier?: string },
  ): void => {
    const currentState = this.state;

    const shouldUpdate = forceUpdate || currentState !== newState;
    if (!shouldUpdate) return;

    this.state = newState;

    const subscribers = this.subscribers.values();

    const args = {
      forceUpdate,
      newState,
      currentState,
      identifier,
    };

    for (const subscription of subscribers) {
      this.executeSetStateForSubscriber(subscription, args);
    }
  };

  /**
   * Set the value of the metadata property, this is no reactive and will not trigger a re-render
   * @param {MetadataSetter<Metadata>} setter - The setter function or the value to set
   * */
  public setMetadata: MetadataSetter<Metadata> = (setter) => {
    const metadata = isFunction(setter) ? setter(this.metadata) : setter;

    this.metadata = metadata;
  };

  /**
   * Returns the metadata [non-reactive additional information associated with the global state]
   */
  public getMetadata = () => this.metadata;

  /**
   * Get the current value of the state
   */
  public getState = () => {
    return this.state;
  };

  public subscribe(
    subscription: SubscribeCallback<State>,
    config?: SubscribeCallbackConfig<State>,
  ): UnsubscribeCallback;

  public subscribe<TDerivate>(
    selector: SelectorCallback<State, TDerivate>,
    subscription: SubscribeCallback<TDerivate>,
    config?: SubscribeCallbackConfig<TDerivate>,
  ): UnsubscribeCallback;

  public subscribe<TDerivate>(
    ...[param1, param2, param3]: [
      SubscribeCallback<State> | SelectorCallback<State, TDerivate>,
      (SubscribeCallbackConfig<State> | SubscribeCallback<TDerivate>)?,
      SubscribeCallbackConfig<State | TDerivate>?,
    ]
  ): UnsubscribeCallback {
    const hasExplicitSelector = isFunction(param2);

    const selector = hasExplicitSelector ? (param1 as SelectorCallback<unknown, unknown>) : undefined;
    const callback = (hasExplicitSelector ? param2 : param1) as SubscribeCallback<unknown>;
    const config = (hasExplicitSelector ? param3 : param2) ?? undefined;

    const initialState = selector ? selector(this.state) : this.state;

    if (!config?.skipFirst) {
      callback(initialState);
    }

    const subscription: SubscriberParameters = {
      selector,
      getConfig: () => config,
      currentState: initialState,
      callback: ({ state }: { state: unknown }) => callback(state),
    };

    this.subscribeCallback(subscription);

    return () => {
      this.subscribers.delete(subscription);
    };
  }

  /**
   * get the parameters object to pass to the callback functions:
   * onInit, onStateChanged, onSubscribed, computePreventStateChange
   * */
  public getConfigCallbackParam = (): StoreTools<State, Metadata> => {
    const { setMetadata, getMetadata, getState, subscribe, actions, setState } = this;

    return {
      setMetadata,
      getMetadata,
      getState,
      subscribe,
      setState,
      actions,
    };
  };

  protected subscribeCallback = (subscription: SubscriberParameters) => {
    this.executeOnSubscribed(subscription);

    this.subscribers.add(subscription);

    return () => {
      this.subscribers.delete(subscription);
    };
  };

  protected partialUpdateSubscription = (
    subscription: SubscriberParameters,
    values: Partial<SubscriberParameters>,
  ): void => {
    if (!isRecord(subscription)) return;

    Object.assign(subscription, values);
  };

  protected executeOnSubscribed = (subscription: SubscriberParameters) => {
    const { onSubscribed } = this;
    const onSubscribedFromConfig = this.callbacks?.onSubscribed;

    if (onSubscribed || onSubscribedFromConfig) {
      onSubscribed?.(this.configurationCallbackParam, subscription);
      onSubscribedFromConfig?.(this.configurationCallbackParam, subscription);
    }
  };

  /**
   * Returns a custom hook that allows to handle a global state
   * @returns {[State, StateMutator, Metadata]} - The state, the state setter or the actions map, the metadata
   * */
  public getMainHook = () => {
    const use = ((
      selector?: <Selection>(state: State) => Selection,
      args: UseHookConfig<unknown, State> | unknown[] = [],
    ) => {
      const config = isArray(args) ? { dependencies: args } : (args ?? {});

      const hooksProps = useRef({
        selector,
        config,
      });

      const currentDependencies = hooksProps.current.config.dependencies;

      // keep the hook props updated
      hooksProps.current.selector = selector;
      hooksProps.current.config = config;

      const { subscribe, getSnapshot, getServerSnapshot, subscription } = useMemo(() => {
        const selectorFn = (state: State) => {
          const { selector } = hooksProps.current;
          return isFunction(selector) ? selector(state) : state;
        };

        const getConfig = () => {
          return hooksProps.current.config;
        };

        const subscription: SubscriberParameters = {
          currentState: selectorFn(this.state),
          selector: selectorFn,
          getConfig,
          callback: () => {
            throw new Error('Callback not set');
          },
        };

        const subscribe = (onStoreChange: () => void) => {
          subscription.callback = onStoreChange;

          // the other
          return this.subscribeCallback(subscription);
        };

        const getSnapshot = () => {
          return subscription.currentState;
        };

        const getServerSnapshot = getSnapshot;

        return { subscribe, getSnapshot, getServerSnapshot, subscription };
      }, []);

      // keeps the state on sync with the store
      useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

      return [
        this.computeSelectedState({
          subscription: subscription,
          currentDependencies,
        }),
        this.getStateOrchestrator(),
        this.metadata,
      ];
    }) as unknown as StateHook<State, StateDispatch, PublicStateMutator, Metadata>;

    // inherit extensions, they should remain the same as the root store
    const { setMetadata, getMetadata, actions } = this;

    const setState = (
      this.actions ? null : this.setState.bind(this)
    ) as PublicStateMutator extends AnyFunction ? StateDispatch : null;

    /**
     * Extended properties and methods of the hook
     */
    const useExtensions: StateApi<State, StateDispatch, PublicStateMutator, Metadata> = {
      setMetadata,
      getMetadata,
      actions,
      setState,
      getState: this.getState.bind(this),
      subscribe: this.subscribe.bind(this),
      dispose: this.dispose.bind(this),
      createSelectorHook: this.createSelectorHook.bind(this) as typeof use.createSelectorHook,
      createObservable: this.createObservable.bind(this) as typeof use.createObservable,
    };

    Object.assign(use, useExtensions);

    return use;
  };

  protected computeSelectedState = ({
    subscription,
    currentDependencies,
  }: {
    subscription: SubscriberParameters;
    currentDependencies: unknown[] | undefined;
  }) => {
    if (!subscription.selector) return subscription.currentState;

    const { dependencies: newDependencies } = (subscription.getConfig() ?? {}) as UseHookConfig<
      unknown,
      unknown
    >;

    // if the dependencies are the same we don't need to compute the state
    if (currentDependencies === newDependencies) return subscription.currentState;

    const isLengthEqual = currentDependencies?.length === newDependencies?.length;
    const isSameValues = isLengthEqual && shallowCompare(currentDependencies, newDependencies);

    // if values are the same we don't need to compute the state
    if (isSameValues) return subscription.currentState;

    // update the current state without re-rendering the component
    this.partialUpdateSubscription(subscription, {
      currentState: subscription.selector(this.state),
    });

    return subscription.currentState;
  };

  public createSelectorHook = createSelectorHook;

  public createObservable = createObservable;

  /**
   * Returns the state setter or the actions map
   * @returns {StateMutator} - The state setter or the actions map
   * */
  protected getStateOrchestrator = (): PublicStateMutator => {
    return (() => {
      if (this.actions) {
        return this.actions;
      }

      return this.setState;
    })() as PublicStateMutator;
  };

  /**
   * This is the only setState function that should be exposed outside the class
   * This is responsible for defining whenever or not the state change should be allowed or prevented
   * the function also execute the functions:
   * - onStateChanged (if defined) - this function is executed after the state change
   * - computePreventStateChange (if defined) - this function is executed before the state change and it should return a boolean value that will be used to determine if the state change should be prevented or not
   */
  public setState = (
    setter: Parameters<React.Dispatch<React.SetStateAction<State>>>[0],
    {
      forceUpdate,
      identifier,
    }: {
      forceUpdate?: boolean;
      identifier?: string;
    } = {},
  ) => {
    const previousState = this.state;

    const newState = isFunction(setter) ? (setter as (state: State) => State)(previousState) : setter;

    // if the state didn't change, we don't need to do anything
    if (!forceUpdate && this.state === newState) return;

    const { setMetadata, getMetadata, getState, actions, setSubscribersState } = this;

    const callbackParameter = {
      setMetadata,
      getMetadata,
      setState: setSubscribersState,
      getState,
      actions,
      previousState,
      state: newState,
      identifier,
    } as StoreTools<State, Metadata> & StateChanges<State>;

    const { computePreventStateChange } = this;
    const computePreventStateChangeFromConfig = this.callbacks?.computePreventStateChange;

    if (computePreventStateChange || computePreventStateChangeFromConfig) {
      const shouldPreventStateChange =
        computePreventStateChange?.(callbackParameter) ||
        computePreventStateChangeFromConfig?.(
          callbackParameter as unknown as StoreTools<State, Metadata, {}> & StateChanges<State>,
        );

      if (shouldPreventStateChange) return;
    }

    this.setSubscribersState(newState, { forceUpdate, identifier });

    const { onStateChanged } = this;
    const onStateChangedFromConfig = this.callbacks?.onStateChanged;

    if (!onStateChanged && !onStateChangedFromConfig) return;

    onStateChanged?.(callbackParameter);
    onStateChangedFromConfig?.(
      callbackParameter as unknown as StoreTools<State, Metadata, {}> & StateChanges<State>,
    );
  };

  /**
   * This creates a map of actions that can be used to modify or interact with the state
   * @returns {ActionCollectionResult<State, Metadata, StateMutator>} - The actions map result of the configuration object passed to the constructor
   * */
  public getStoreActionsMap = (): typeof this.actions => {
    if (!isRecord(this.actionsConfig)) return null as typeof this.actions;

    const { actionsConfig, setMetadata, setState: setStateWrapper, getState, getMetadata } = this;
    const actionsKeys = Object.keys(actionsConfig);

    // we bind the functions to the actions object to allow reusing actions in the same api config by using the -this- keyword
    const actions = actionsKeys.reduce(
      (accumulator, action_key) => {
        Object.assign(accumulator, {
          [action_key](...parameters: unknown[]) {
            const actionConfig = actionsConfig[action_key] as (
              ...args: unknown[]
            ) => (...args: unknown[]) => unknown;

            const action = actionConfig.apply(actions, parameters);
            const actionIsNotAFunction = typeof action !== 'function';

            // we throw an error if the action is not a function, this is mandatory for the correct execution of the actions
            if (actionIsNotAFunction) {
              throwWrongKeyOnActionCollectionConfig(action_key);
            }

            // executes the actions bringing access to the state setter and a copy of the state
            const result = action.call(actions, {
              setState: setStateWrapper,
              getState,
              setMetadata,
              getMetadata,
              actions: actions,
            });

            // we return the result of the actions to the invoker
            return result;
          },
        });

        return accumulator;
      },
      {} as ActionCollectionResult<State, Metadata, NonNullable<ActionsConfig>>,
    );

    return actions as typeof this.actions;
  };

  protected removeSubscriptions = () => {
    this.subscribers.clear();
  };

  public dispose = () => {
    // clean up all the references while keep the structure helps the garbage collector
    this.removeSubscriptions();

    this._name = '';
    this.actionsConfig = null;
    this.callbacks = null;
    this.metadata = {} as Metadata;
    this.actions = null as typeof this.actions;
    this.state = Object.create(null);
  };
}

function createObservable<
  RootState,
  PublicStateMutator,
  Metadata,
  Selected,
  StateDispatch = React.Dispatch<React.SetStateAction<RootState>>,
>(
  this: StateApi<any, any, any, any>,
  selector: (state: any) => Selected,
  options?: {
    isEqual?: (current: Selected, next: Selected) => boolean;
    isEqualRoot?: (current: any, next: any) => boolean;
    name?: string;
  },
) {
  const selectorName = options?.name;
  const mainIsEqualRoot = options?.isEqualRoot;
  const mainIsEqual = options?.isEqual;

  let rootState = this.getState();
  let selectedState = (selector ?? ((s) => s))(rootState);

  const childStore = new GlobalStore(selectedState, {
    name: selectorName ?? uniqueId('sh:'),
  });

  // keeps the root state and the derivate state in sync
  const unsubscribeFromRootState = this.subscribe(
    (newRoot) => {
      const isRootEqual = (mainIsEqualRoot ?? Object.is)(rootState, newRoot);

      if (isRootEqual) return;

      rootState = newRoot;

      const selectedState$ = selector(newRoot);
      const isSelectedValueEqual = (mainIsEqual ?? Object.is)(selectedState, selectedState$);

      if (isSelectedValueEqual) return;

      selectedState = selectedState$;

      childStore.setState(selectedState$);
    },
    { skipFirst: true },
  );

  const setState = (this.actions ? null : this.setState) as PublicStateMutator extends AnyFunction
    ? StateDispatch
    : null;

  const observable = childStore.subscribe.bind(childStore) as SubscribeToState<Selected> &
    StateApi<unknown, unknown, unknown, BaseMetadata>;

  // inherit extensions, they should remain the same as the root store
  const { setMetadata, getMetadata, actions } = this;

  const extensions: StateApi<unknown, StateDispatch, PublicStateMutator, any> = {
    setMetadata,
    getMetadata,
    actions,
    setState,
    getState: childStore.getState.bind(childStore),
    subscribe: childStore.subscribe.bind(childStore),
    createSelectorHook: createSelectorHook.bind(observable) as typeof extensions.createSelectorHook,
    createObservable: createObservable.bind(observable) as typeof extensions.createObservable,
    dispose: () => {
      unsubscribeFromRootState();
      childStore.dispose();
    },
  };

  Object.assign(observable, extensions);

  return observable as unknown as ObservableFragment<
    Selected,
    StateDispatch,
    PublicStateMutator,
    Metadata extends BaseMetadata ? Metadata : BaseMetadata
  >;
}

/**
 * @description
 * Creates a derived hook bound to a selected fragment of the root state.
 * The derived hook re-renders only when the selected value changes and
 * exposes the same API as the parent state hook.
 */
function createSelectorHook<
  RootState,
  PublicStateMutator,
  Metadata,
  Selected,
  StateDispatch = React.Dispatch<React.SetStateAction<RootState>>,
>(
  this: StateApi<any, any, any, any>,
  selector: (state: any) => Selected,
  options?: {
    isEqual?: (current: Selected, next: Selected) => boolean;
    isEqualRoot?: (current: any, next: any) => boolean;
    name?: string;
  },
): StateHook<Selected, StateDispatch, PublicStateMutator, any> {
  const selectorName = options?.name;
  const mainIsEqualRoot = options?.isEqualRoot;
  const mainIsEqual = options?.isEqual;

  let rootState = this.getState();
  let selectedState = (selector ?? ((s) => s))(rootState);

  const derivedStore = new GlobalStore(selectedState, {
    name: selectorName ?? uniqueId('sh:'),
  });

  // keeps the root state and the derivate state in sync
  const unsubscribeFromRootState = this.subscribe(
    (newRoot) => {
      const isRootEqual = (mainIsEqualRoot ?? Object.is)(rootState, newRoot);

      if (isRootEqual) return;

      rootState = newRoot;

      const selectedState$ = selector(newRoot);
      const isSelectedValueEqual = (mainIsEqual ?? Object.is)(selectedState, selectedState$);

      if (isSelectedValueEqual) return;

      selectedState = selectedState$;

      derivedStore.setState(selectedState$);
    },
    { skipFirst: true },
  );

  const stateMutator = this.actions ?? this.setState;

  const setState = (this.actions ? null : this.setState) as PublicStateMutator extends AnyFunction
    ? StateDispatch
    : null;

  const selectorHook = ((...args: Parameters<typeof derivedStore.use>) => {
    const [selection] = derivedStore.use(...args);

    return [selection, stateMutator, this.getMetadata()];
  }) as unknown as StateHook<unknown, unknown, unknown, BaseMetadata> & {
    dispose: () => void;
  };

  // inherit extensions, they should remain the same as the root store
  const { setMetadata, getMetadata, actions } = this;

  const extensions: StateApi<unknown, StateDispatch, PublicStateMutator, any> = {
    setMetadata,
    getMetadata,
    actions,
    setState,
    getState: () => derivedStore.getState(),
    subscribe: derivedStore.subscribe.bind(derivedStore),
    createSelectorHook: createSelectorHook.bind(selectorHook) as typeof extensions.createSelectorHook,
    createObservable: createObservable.bind(selectorHook) as typeof extensions.createObservable,

    dispose: () => {
      unsubscribeFromRootState();
      derivedStore.dispose();
    },
  };

  Object.assign(selectorHook, extensions);

  return selectorHook as unknown as StateHook<
    Selected,
    StateDispatch,
    PublicStateMutator,
    Metadata extends BaseMetadata ? Metadata : BaseMetadata
  >;
}

export default GlobalStore;
