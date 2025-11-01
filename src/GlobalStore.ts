import { useMemo, useRef, useSyncExternalStore } from 'react';
import type {
  ActionCollectionConfig,
  GlobalStoreCallbacks,
  ActionCollectionResult,
  MetadataSetter,
  UseHookConfig,
  StateGetter,
  SubscribeCallbackConfig,
  SubscribeCallback,
  SelectorCallback,
  SubscriberParameters,
  MetadataGetter,
  StateHook,
  BaseMetadata,
  StateChanges,
  StoreTools,
  ObservableFragment,
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
  Metadata extends BaseMetadata | unknown,
  ActionsConfig extends ActionCollectionConfig<State, Metadata> | undefined | unknown,
  PublicStateMutator = keyof ActionsConfig extends never | undefined
    ? React.Dispatch<React.SetStateAction<State>>
    : ActionCollectionResult<State, Metadata, NonNullable<ActionsConfig>>
> {
  protected _name: string;
  protected wasDisposed = false;

  public actionsConfig: ActionsConfig | null = null;

  public callbacks: GlobalStoreCallbacks<State, Metadata> | null = null;

  public metadata: Metadata;

  public actions: ActionCollectionResult<State, Metadata, NonNullable<ActionsConfig>> | null = null;

  public subscribers: Map<string, SubscriberParameters> = new Map();

  public state: State;

  constructor(state: State);

  constructor(
    state: State,
    args: {
      metadata?: Metadata;
      callbacks?: GlobalStoreCallbacks<State, Metadata>;
      actions?: ActionsConfig;
      name?: string;
    }
  );

  constructor(
    state: State,
    args: {
      metadata?: Metadata;
      callbacks?: GlobalStoreCallbacks<State, Metadata>;
      actions?: ActionsConfig;
      name?: string;
    } = { metadata: {} as Metadata }
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
    parameters: StoreTools<State, Metadata> & StateChanges<State>
  ) => boolean;

  protected initialize = async () => {
    const shouldCreateActionsMap = Object.keys(this.actionsConfig ?? {}).length > 0;

    if (shouldCreateActionsMap) {
      this.actions = this.getStoreActionsMap();
    }

    const { onInit } = this;
    const { onInit: onInitFromConfig } = this.callbacks ?? {};

    if (!onInit && !onInitFromConfig) return;

    const parameters = this.getConfigCallbackParam();

    onInit?.(parameters);
    if (!isNil(onInitFromConfig)) onInitFromConfig?.(parameters);
  };

  protected executeSetStateForSubscriber = (
    subscription: SubscriberParameters,
    args: {
      forceUpdate: boolean | undefined;
      newState: State;
      currentState: State;
      identifier: string | undefined;
    }
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
    this.partialUpdateSubscription(subscription.subscriptionId, {
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
      }
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
  protected setState = (
    newState: State,
    { forceUpdate, identifier }: { forceUpdate?: boolean; identifier?: string }
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
  protected setMetadata: MetadataSetter<Metadata> = (setter) => {
    const metadata = isFunction(setter) ? setter(this.metadata) : setter;

    this.metadata = metadata;
  };

  protected getMetadata = () => this.metadata;

  public getState = ((
    param1?: SubscribeCallback<unknown> | SelectorCallback<unknown, unknown>,
    param2?: SubscribeCallback<unknown>,
    param3?: SubscribeCallbackConfig<unknown>
  ) => {
    // if there is no subscription callback return the state
    if (!param1) return this.state;

    const hasExplicitSelector = isFunction(param2);

    const selector = hasExplicitSelector ? (param1 as SelectorCallback<unknown, unknown>) : undefined;

    const callback = (hasExplicitSelector ? param2 : param1) as SubscribeCallback<unknown>;

    const config = (hasExplicitSelector ? param3 : param2) ?? undefined;

    const initialState = selector ? selector(this.state) : this.state;

    if (!config?.skipFirst) {
      callback(initialState);
    }

    const subscriptionId = uniqueId('gs:');

    this.subscribe({
      subscriptionId,
      selector,
      getConfig: () => config,
      currentState: initialState,
      callback: ({ state }: { state: unknown }) => callback(state),
    });

    return () => {
      this.subscribers.delete(subscriptionId);
    };
  }) as StateGetter<State>;

  /**
   * get the parameters object to pass to the callback functions:
   * onInit, onStateChanged, onSubscribed, computePreventStateChange
   * */
  public getConfigCallbackParam = (): StoreTools<State, Metadata> => {
    const { setMetadata, getMetadata, getState, actions, setStateWrapper } = this;

    return {
      setMetadata,
      getMetadata,
      getState,
      subscribe: getState,
      setState: setStateWrapper,
      actions,
    };
  };

  protected lastSubscriptionId: string | null = null;

  protected subscribe = (subscription: SubscriberParameters) => {
    const { subscriptionId } = subscription;

    this.executeOnSubscribed(subscription);

    this.subscribers.set(subscriptionId, subscription);
    this.lastSubscriptionId = subscriptionId;

    return () => {
      this.subscribers.delete(subscriptionId);
    };
  };

  protected partialUpdateSubscription = (
    subscriptionId: string,
    values: Partial<SubscriberParameters>
  ): void => {
    const subscription = this.subscribers.get(subscriptionId);

    if (!isRecord(subscription)) return;

    Object.assign(subscription, values);
  };

  protected executeOnSubscribed = (subscription: SubscriberParameters) => {
    const { onSubscribed } = this;
    const onSubscribedFromConfig = this.callbacks?.onSubscribed;

    if (onSubscribed || onSubscribedFromConfig) {
      const parameters = this.getConfigCallbackParam();

      onSubscribed?.(parameters, subscription);
      onSubscribedFromConfig?.(parameters, subscription);
    }
  };

  /**
   * Returns a custom hook that allows to handle a global state
   * @returns {[State, StateMutator, Metadata]} - The state, the state setter or the actions map, the metadata
   * */
  public getHook = () => {
    const useHook = (
      selector?: SelectorCallback<unknown, unknown>,
      args: UseHookConfig<unknown, unknown> | unknown[] = []
    ) => {
      if (this.wasDisposed) throw new Error('The global state was disposed');

      const config: UseHookConfig<unknown, unknown> = isArray(args) ? { dependencies: args } : args ?? {};

      const hooksProps = useRef<{
        selector: SelectorCallback<unknown, unknown> | undefined;
        config: UseHookConfig<unknown, unknown>;
      }>({
        selector,
        config,
      });

      const currentDependencies = hooksProps.current.config.dependencies;

      // keep the hook props updated
      hooksProps.current.selector = selector;
      hooksProps.current.config = config;

      const { subscribe, getSnapshot, subscription } = useMemo(() => {
        const selectorFn = (state: unknown) => {
          const { selector } = hooksProps.current;
          return isFunction(selector) ? selector(state) : state;
        };

        const getConfig = () => {
          return hooksProps.current.config;
        };

        const subscription: SubscriberParameters = {
          subscriptionId: uniqueId('ss:'),
          currentState: selectorFn(this.state),
          selector: selectorFn,
          getConfig,
          callback: () => {
            throw new Error('Callback not set');
          },
        };

        const subscribe = (onStoreChange: () => void) => {
          subscription.callback = onStoreChange;

          return this.subscribe(subscription);
        };

        const getSnapshot = () => {
          return subscription.currentState;
        };

        return { subscribe, getSnapshot, subscription };
      }, []);

      // keeps the state on sync with the store
      useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

      return [
        this.computeSelectedState({
          subscriptionRef: subscription,
          currentDependencies,
        }),
        this.getStateOrchestrator(),
        this.metadata,
      ];
    };

    /**
     * Extended properties and methods of the hook
     */
    useHook.stateControls = this.stateControls;
    useHook.createSelectorHook = this.createSelectorHook;
    useHook.createObservable = this.createObservable;
    useHook.removeSubscriptions = this.removeSubscriptions;
    useHook.dispose = this.dispose;

    return useHook as unknown as StateHook<State, PublicStateMutator, Metadata>;
  };

  protected computeSelectedState = ({
    subscriptionRef,
    currentDependencies,
  }: {
    subscriptionRef: SubscriberParameters;
    currentDependencies: unknown[] | undefined;
  }) => {
    if (!subscriptionRef.selector) return subscriptionRef.currentState;

    const { dependencies: newDependencies } = (subscriptionRef.getConfig() ?? {}) as UseHookConfig<
      unknown,
      unknown
    >;

    // if the dependencies are the same we don't need to compute the state
    if (currentDependencies === newDependencies) return subscriptionRef.currentState;

    const isLengthEqual = currentDependencies?.length === newDependencies?.length;
    const isSameValues = isLengthEqual && shallowCompare(currentDependencies, newDependencies);

    // if values are the same we don't need to compute the state
    if (isSameValues) return subscriptionRef.currentState;

    // update the current state without re-rendering the component
    this.partialUpdateSubscription(subscriptionRef.subscriptionId, {
      currentState: subscriptionRef.selector(this.state),
    });

    return subscriptionRef.currentState;
  };

  /**
   * @description
   * Use this function to create a custom global hook which contains a fragment of the state of another hook
   */
  public createSelectorHook = <
    RootState,
    StateMutator,
    SelectorMetadata extends BaseMetadata,
    RootSelectorResult,
    RootDerivate = RootSelectorResult extends never ? RootState : RootSelectorResult
  >(
    mainSelector: (state: RootState) => RootSelectorResult,
    {
      isEqualRoot: mainIsEqualRoot,
      isEqual: mainIsEqualFun,
      name: selectorName,
    }: {
      isEqual?: (current: RootDerivate, next: RootDerivate) => boolean;
      isEqualRoot?: (current: RootState, next: RootState) => boolean;
      name?: string;
    } = {}
  ): StateHook<RootDerivate, StateMutator, SelectorMetadata> => {
    const [rootStateRetriever, rootMutator, metadataRetriever] = this.stateControls() as unknown as [
      StateGetter<RootState>,
      StateMutator,
      MetadataGetter<SelectorMetadata>
    ];

    let root = rootStateRetriever();
    let rootDerivate = (mainSelector ?? ((s) => s))(root) as unknown as RootDerivate;

    // derivate states do not have lifecycle methods or actions
    const childStore = new GlobalStore(rootDerivate, {
      name: selectorName ?? uniqueId('sh:'),
    });

    const [childStateRetriever, setChildState] = childStore.stateControls();

    // keeps the root state and the derivate state in sync
    const unsubscribe = rootStateRetriever(
      (newRoot) => {
        const isRootEqual = (mainIsEqualRoot ?? Object.is)(root, newRoot);

        if (isRootEqual) return;

        root = newRoot;

        const newRootDerivate = mainSelector(newRoot) as unknown as RootDerivate;
        const isRootDerivateEqual = (mainIsEqualFun ?? Object.is)(rootDerivate, newRootDerivate);

        if (isRootDerivateEqual) return;

        rootDerivate = newRootDerivate;

        setChildState(newRootDerivate);
      },
      { skipFirst: true }
    );

    const useChildHook = childStore.getHook();

    const useChildHookWrapper = ((
      selector?: (root: unknown) => unknown,
      config?: UseHookConfig<unknown, unknown>
    ) => {
      const [childState] = isFunction(selector) ? useChildHook(selector, config) : useChildHook();

      // child state do not expose specific state controls instead inherit from the root state
      // all the state mutations will be derived from the root state
      return [childState, rootMutator, metadataRetriever()];
    }) as unknown as StateHook<unknown, unknown, unknown> & {
      removeSubscriptions: () => void;
      dispose: () => void;
    };

    useChildHookWrapper.stateControls = () => [childStateRetriever, rootMutator, metadataRetriever];

    useChildHookWrapper.createSelectorHook =
      childStore.createSelectorHook as unknown as typeof useChildHookWrapper.createSelectorHook;

    useChildHookWrapper.createObservable = this.createObservable.bind(useChildHookWrapper);

    useChildHookWrapper.removeSubscriptions = () => {
      unsubscribe();
      childStore.removeSubscriptions();
    };

    useChildHookWrapper.dispose = () => {
      useChildHookWrapper.removeSubscriptions();
      childStore.dispose();
    };

    return useChildHookWrapper as StateHook<RootDerivate, StateMutator, SelectorMetadata>;
  };

  public stateControls = () => {
    const stateOrchestrator = this.getStateOrchestrator();

    const { getMetadata, getState } = this;

    return [getState, stateOrchestrator, getMetadata] as [
      retriever: StateGetter<State>,
      mutator: typeof stateOrchestrator,
      metadata: MetadataGetter<Metadata>
    ];
  };

  /**
   * Returns the state setter or the actions map
   * @returns {StateMutator} - The state setter or the actions map
   * */
  protected getStateOrchestrator = (): PublicStateMutator => {
    return (() => {
      if (this.actions) {
        return this.actions;
      }

      return this.setStateWrapper;
    })() as PublicStateMutator;
  };

  /**
   * This is responsible for defining whenever or not the state change should be allowed or prevented
   * the function also execute the functions:
   * - onStateChanged (if defined) - this function is executed after the state change
   * - computePreventStateChange (if defined) - this function is executed before the state change and it should return a boolean value that will be used to determine if the state change should be prevented or not
   */
  protected setStateWrapper = (
    setter: Parameters<React.Dispatch<React.SetStateAction<State>>>[0],
    {
      forceUpdate,
      identifier,
    }: {
      forceUpdate?: boolean;
      identifier?: string;
    } = {}
  ) => {
    const previousState = this.state;

    const newState = isFunction(setter) ? (setter as (state: State) => State)(previousState) : setter;

    // if the state didn't change, we don't need to do anything
    if (!forceUpdate && this.state === newState) return;

    const { setMetadata, getMetadata, getState, actions, setState } = this;

    const callbackParameter = {
      setMetadata,
      getMetadata,
      setState: setState,
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
          callbackParameter as unknown as StoreTools<State, Metadata, {}> & StateChanges<State>
        );

      if (shouldPreventStateChange) return;
    }

    this.setState(newState, { forceUpdate, identifier });

    const { onStateChanged } = this;
    const onStateChangedFromConfig = this.callbacks?.onStateChanged;

    if (!onStateChanged && !onStateChangedFromConfig) return;

    onStateChanged?.(callbackParameter);
    onStateChangedFromConfig?.(
      callbackParameter as unknown as StoreTools<State, Metadata, {}> & StateChanges<State>
    );
  };

  /**
   * This creates a map of actions that can be used to modify or interact with the state
   * @returns {ActionCollectionResult<State, Metadata, StateMutator>} - The actions map result of the configuration object passed to the constructor
   * */
  public getStoreActionsMap = (): null | ActionCollectionResult<
    State,
    Metadata,
    NonNullable<ActionsConfig>
  > => {
    if (!isRecord(this.actionsConfig)) return null;

    const { actionsConfig, setMetadata, setStateWrapper, getState, getMetadata } = this;
    const actionsKeys = Object.keys(actionsConfig);

    // we bind the functions to the actions object to allow reusing actions in the same api config by using the -this- keyword
    const actions = actionsKeys.reduce((accumulator, action_key) => {
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
    }, {} as ActionCollectionResult<State, Metadata, NonNullable<ActionsConfig>>);

    return actions;
  };

  public createObservable<Fragment>(
    mainSelector: (state: State) => Fragment,
    {
      isEqualRoot: mainIsEqualRoot,
      isEqual: mainIsEqualFun,
      name: selectorName,
    }: {
      isEqual?: (current: Fragment, next: Fragment) => boolean;
      isEqualRoot?: (current: State, next: State) => boolean;
      name?: string;
    } = {}
  ): ObservableFragment<Fragment> {
    const [rootStateRetriever] = this.stateControls() as unknown as [StateGetter<State>];
    const subscriptions: (() => void)[] = [];

    let root = rootStateRetriever();
    let rootDerivate = (mainSelector ?? ((s) => s))(rootStateRetriever());

    const unsubscribe = rootStateRetriever(
      (newRoot) => {
        const isRootEqual = (mainIsEqualRoot ?? Object.is)(root, newRoot);

        if (isRootEqual) return;

        root = newRoot;

        const newRootDerivate = mainSelector(newRoot);
        const isRootDerivateEqual = (mainIsEqualFun ?? Object.is)(rootDerivate, newRootDerivate);

        if (isRootDerivateEqual) return;

        rootDerivate = newRootDerivate;

        subscriptions.forEach((update) => update());
      },
      { skipFirst: true }
    );

    const getFragment = (
      param1?: SubscribeCallback<unknown> | SelectorCallback<unknown, unknown>,
      param2?: SubscribeCallback<unknown>,
      param3?: SubscribeCallbackConfig<unknown>
    ) => {
      // if there is no subscription callback return the state
      if (!param1) return rootDerivate;

      const hasExplicitSelector = isFunction(param2);
      const selector = hasExplicitSelector ? (param1 as SelectorCallback<unknown, unknown>) : undefined;
      const callback = (hasExplicitSelector ? param2 : param1) as SubscribeCallback<unknown>;
      const config = (hasExplicitSelector ? param3 : param2) ?? undefined;
      const executeCallback = () => callback(selector ? selector(rootDerivate) : rootDerivate);

      if (!config?.skipFirst) {
        executeCallback();
      }

      const subscription = () => {
        executeCallback();
      };

      subscriptions.push(subscription);

      return () => {
        subscriptions.splice(subscriptions.indexOf(subscription), 1);
      };
    };

    const observable = getFragment as ObservableFragment<Fragment>;

    observable._name = selectorName ?? uniqueId('ob:');

    observable.createObservable = this.createObservable.bind(
      observable
    ) as unknown as typeof observable.createObservable;

    observable.removeSubscriptions = () => {
      subscriptions.forEach((remove) => remove());
      subscriptions.length = 0;
      unsubscribe();
    };

    // parasite the state controls to allow endless observables
    (
      observable as unknown as {
        stateControls: () => Readonly<[retriever: ObservableFragment<Fragment>]>;
      }
    ).stateControls = () => [observable];

    return observable;
  }

  removeSubscriptions = () => {
    this.subscribers.clear();
  };

  public dispose = () => {
    // clean up all the references while keep the structure helps the garbage collector
    this.wasDisposed = true;
    this.removeSubscriptions();

    this._name = '';
    this.actionsConfig = null;
    this.callbacks = null;
    this.metadata = {} as Metadata;
    this.actions = null;
    this.state = Object.create(null);
  };
}

export default GlobalStore;
