import { useMemo, useRef, useSyncExternalStore } from 'react';
import type {
  ActionCollectionConfig,
  GlobalStoreCallbacks,
  ActionCollectionResult,
  MetadataSetter,
  UseHookOptions,
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
  ReadonlyHook,
  ReadonlyStateApi,
  SelectHook,
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
> {
  protected _name: string;

  public actionsConfig: ActionsConfig | null = null;

  public callbacks: GlobalStoreCallbacks<State, PublicStateMutator, Metadata> | null = null;

  public metadata: Metadata;

  /**
   * @description If the actionsConfig is defined, this will be a map of actions that can be used to modify or interact with the state
   * */
  public actions: PublicStateMutator extends AnyFunction ? null : PublicStateMutator =
    null as PublicStateMutator extends AnyFunction ? null : PublicStateMutator;

  public storeTools!: StoreTools<State, PublicStateMutator, Metadata>;

  /**
   * @description The main hook that will be used to interact with the global state
   */
  public use!: StateHook<State, PublicStateMutator, Metadata>;

  public subscribers = new Set<SubscriberParameters>();

  public state: State;

  constructor(state: State);

  constructor(
    state: State,
    args: {
      metadata?: Metadata;
      callbacks?: GlobalStoreCallbacks<State, PublicStateMutator, Metadata>;
      actions?: ActionsConfig;
      name?: string;
    },
  );

  constructor(
    state: State,
    args: {
      metadata?: Metadata;
      callbacks?: GlobalStoreCallbacks<State, PublicStateMutator, Metadata>;
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

  protected onInit?: (args: StoreTools<State, PublicStateMutator, Metadata>) => void;

  protected onStateChanged?: (
    args: StoreTools<State, PublicStateMutator, Metadata> & StateChanges<State>,
  ) => void;

  protected onSubscribed?: (
    args: StoreTools<State, PublicStateMutator, Metadata>,
    subscription: SubscriberParameters,
  ) => void;

  protected computePreventStateChange?: (
    parameters: StoreTools<State, PublicStateMutator, Metadata> & StateChanges<State>,
  ) => boolean;

  /**
   * @description
   * Initializes the global store, setting up the main hook and actions map if applicable,
   */
  protected initialize = async () => {
    // actions should be created first than the main hook and the configuration callback param
    // because both depend on the actions map being created
    const { actions, storeTools } = this.getStoreActionsMap();

    this.actions = actions;
    this.storeTools = storeTools;

    this.use = this.getMainHook();

    const { onInit } = this;
    const { onInit: onInitFromConfig } = this.callbacks ?? {};

    if (!onInit && !onInitFromConfig) return;

    onInit?.(storeTools);
    if (!isNil(onInitFromConfig)) onInitFromConfig?.(storeTools);
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
    const { selector, callback, currentState: currentChildState, options } = subscription;

    // compare the root state, there should not be a re-render if the root state is the same
    if (
      !args.forceUpdate &&
      (options?.isEqualRoot ?? ((a, b) => a === b))(args.currentState, args.newState)
    ) {
      return { didUpdate: false };
    }

    const newChildState = selector ? selector(args.newState) : args.newState;

    // compare the state of the selected part of the state, there should not be a re-render if the state is the same
    if (!args.forceUpdate && (options?.isEqual ?? ((a, b) => a === b))(currentChildState, newChildState)) {
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

  /**
   * Subscribe to the state changes
   */
  public subscribe = (<TDerivate>(
    ...[param1, param2, param3]: [
      SubscribeCallback<State> | SelectorCallback<State, TDerivate>,
      (SubscribeCallbackConfig<State> | SubscribeCallback<TDerivate>)?,
      SubscribeCallbackConfig<State | TDerivate>?,
    ]
  ): UnsubscribeCallback => {
    const hasExplicitSelector = isFunction(param2);

    const selector = hasExplicitSelector ? (param1 as SelectorCallback<unknown, unknown>) : undefined;
    const callback = (hasExplicitSelector ? param2 : param1) as SubscribeCallback<unknown>;
    const options = (hasExplicitSelector ? param3 : param2) ?? undefined;

    const initialState = selector ? selector(this.state) : this.state;

    if (!options?.skipFirst) {
      callback(initialState);
    }

    const subscription: SubscriberParameters = {
      selector,
      options,
      currentState: initialState,
      callback: ({ state }: { state: unknown }) => callback(state),
    };

    this.subscribeCallback(subscription);

    return () => {
      this.subscribers.delete(subscription);
    };
  }) as SubscribeToState<State>;

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
      onSubscribed?.(this.storeTools, subscription);
      onSubscribedFromConfig?.(this.storeTools, subscription);
    }
  };

  /**
   * Returns a custom hook that allows to handle a global state
   * @returns {[State, StateMutator, Metadata]} - The state, the state setter or the actions map, the metadata
   * */
  public getMainHook = () => {
    const use = ((
      selector?: <Selection>(state: State) => Selection,
      args: UseHookOptions<unknown, State> | unknown[] = [],
    ) => {
      const options = isArray(args) ? { dependencies: args } : (args ?? {});

      const subscriptionRef = useRef<SubscriberParameters>(null!);

      const selectorWrapper = (state: State) => {
        return isFunction(selector) ? selector(state) : state;
      };

      // builds the subscription object or retrieves the existing one
      subscriptionRef.current = ((): SubscriberParameters => {
        if (subscriptionRef.current) return subscriptionRef.current;

        return {
          options,
          selector: selectorWrapper,
          currentState: selectorWrapper(this.state),
          callback: () => {
            throw new Error('Callback not set');
          },
        };
      })();

      const currentDependencies = subscriptionRef.current.options?.dependencies;
      const newDependencies = options?.dependencies;

      // keep the hook props updated
      Object.assign(subscriptionRef.current, {
        selector: selectorWrapper,
        options,
      });

      const { subscribe, getSnapshot, getServerSnapshot } = useMemo(() => {
        const subscribe = (onStoreChange: () => void) => {
          subscriptionRef.current.callback = onStoreChange;

          return this.subscribeCallback(subscriptionRef.current);
        };

        const getSnapshot = () => {
          return subscriptionRef.current.currentState;
        };

        const getServerSnapshot = getSnapshot;

        return { subscribe, getSnapshot, getServerSnapshot };
      }, []);

      // keeps the state on sync with the store
      useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

      return [
        this.computeSelectedState({
          subscription: subscriptionRef.current,
          newDependencies,
          currentDependencies,
        }),
        this.getStateOrchestrator(),
        this.metadata,
      ];
    }) as unknown as StateHook<State, PublicStateMutator, Metadata>;

    // inherit extensions, they should remain the same as the root store
    const { setMetadata, getMetadata, actions } = this;

    const setState = (
      this.actions ? null : this.setState.bind(this)
    ) as PublicStateMutator extends AnyFunction ? React.Dispatch<React.SetStateAction<State>> : null;

    const apiAsReadOnly = this as ReadonlyStateApi<unknown, unknown, BaseMetadata>;

    // Extended properties and methods of the hook
    const useExtensions: StateApi<State, PublicStateMutator, Metadata> = {
      actions,
      createObservable: this.createObservable.bind(apiAsReadOnly) as typeof use.createObservable,
      createSelectorHook: this.createSelectorHook.bind(apiAsReadOnly) as typeof use.createSelectorHook,
      dispose: this.dispose.bind(this),
      getMetadata,
      getState: this.getState.bind(this),
      setMetadata,
      setState,
      subscribe: this.subscribe.bind(this),

      // sugar syntax
      use,
      select: ((...args: Parameters<typeof use>) => use(...args)[0]) as SelectHook<State>,
    };

    Object.assign(use, useExtensions);

    return use;
  };

  protected computeSelectedState = ({
    subscription,
    newDependencies,
    currentDependencies,
  }: {
    subscription: SubscriberParameters;
    newDependencies: unknown[] | undefined;
    currentDependencies: unknown[] | undefined;
  }) => {
    if (!subscription.selector) return subscription.currentState;

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
    } as StoreTools<State, PublicStateMutator, Metadata> & StateChanges<State>;

    const { computePreventStateChange } = this;
    const computePreventStateChangeFromConfig = this.callbacks?.computePreventStateChange;

    if (computePreventStateChange || computePreventStateChangeFromConfig) {
      const shouldPreventStateChange =
        computePreventStateChange?.(callbackParameter) ||
        computePreventStateChangeFromConfig?.(callbackParameter);

      if (shouldPreventStateChange) return;
    }

    this.setSubscribersState(newState, { forceUpdate, identifier });

    const { onStateChanged } = this;
    const onStateChangedFromConfig = this.callbacks?.onStateChanged;

    if (!onStateChanged && !onStateChangedFromConfig) return;

    onStateChanged?.(callbackParameter);
    onStateChangedFromConfig?.(callbackParameter);
  };

  /**
   * This creates a map of actions that can be used to modify or interact with the state
   * @returns {ActionCollectionResult<State, Metadata, StateMutator>} - The actions map result of the configuration object passed to the constructor
   * */
  public getStoreActionsMap = (): {
    actions: PublicStateMutator extends AnyFunction ? null : PublicStateMutator;
    storeTools: StoreTools<State, PublicStateMutator, Metadata>;
  } => {
    const { actionsConfig, getMetadata, getState, setMetadata, setState: setStateWrapper, subscribe } = this;

    // passes the same object to all the actions
    const storeTools: typeof this.storeTools = {
      setMetadata,
      getMetadata,
      getState,
      setState: setStateWrapper,
      subscribe,
      actions: null as (typeof this.storeTools)['actions'],
    };

    if (!isRecord(actionsConfig)) {
      return {
        actions: null as typeof this.actions,
        storeTools,
      };
    }

    const actions = {} as NonNullable<typeof storeTools.actions>;

    storeTools.actions = actions;

    const actionsKeys = Object.keys(actionsConfig);

    // we bind the functions to the actions object to allow reusing actions in the same api config by using the -this- keyword
    for (const action_key of actionsKeys) {
      Object.assign(actions, {
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
          const result = action.call(actions, storeTools);

          // we return the result of the actions to the invoker
          return result;
        },
      });
    }

    return {
      actions,
      storeTools,
    };
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

export function createObservable<RootState, PublicStateMutator, Metadata extends BaseMetadata, Selected>(
  this: Pick<ReadonlyStateApi<RootState, PublicStateMutator, Metadata>, 'getState' | 'subscribe'>,
  selector: (state: RootState) => Selected,
  options?: {
    isEqual?: (current: Selected, next: Selected) => boolean;
    isEqualRoot?: (current: RootState, next: RootState) => boolean;
    name?: string;
  },
): ObservableFragment<Selected, PublicStateMutator, Metadata> {
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

  const observable = childStore.subscribe.bind(childStore) as ObservableFragment<
    Selected,
    PublicStateMutator,
    Metadata
  >;

  const extensions: ReadonlyStateApi<unknown, PublicStateMutator, any> = {
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

  return observable as ObservableFragment<Selected, PublicStateMutator, Metadata>;
}

/**
 * @description
 * Creates a derived hook bound to a selected fragment of the root state.
 * The derived hook re-renders only when the selected value changes and
 * exposes the same API as the parent state hook.
 */
export function createSelectorHook<RootState, PublicStateMutator, Metadata extends BaseMetadata, Selected>(
  this: Pick<ReadonlyStateApi<RootState, PublicStateMutator, Metadata>, 'getState' | 'subscribe'>,
  selector: (state: RootState) => Selected,
  options?: {
    isEqual?: (current: Selected, next: Selected) => boolean;
    isEqualRoot?: (current: RootState, next: RootState) => boolean;
    name?: string;
  },
): ReadonlyHook<Selected, PublicStateMutator, Metadata> {
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

  const selectorHook = ((...args: Parameters<typeof derivedStore.use>) => {
    const [selection] = derivedStore.use(...args);

    return selection;
  }) as ReadonlyHook<Selected, PublicStateMutator, Metadata>;

  const extensions: ReadonlyStateApi<Selected, PublicStateMutator, Metadata> = {
    getState: () => derivedStore.getState(),
    subscribe: derivedStore.subscribe.bind(derivedStore),

    createSelectorHook: createSelectorHook.bind(
      selectorHook as ReadonlyStateApi<any, any, any>,
    ) as typeof extensions.createSelectorHook,

    createObservable: createObservable.bind(
      selectorHook as ReadonlyStateApi<any, any, any>,
    ) as typeof extensions.createObservable,

    dispose: () => {
      unsubscribeFromRootState();
      derivedStore.dispose();
    },
  };

  Object.assign(selectorHook, extensions);

  return selectorHook;
}

export default GlobalStore;
