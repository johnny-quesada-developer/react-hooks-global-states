import { useEffect, useRef, useState } from 'react';
import {
  ActionCollectionConfig,
  StateSetter,
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
import { isString } from 'json-storage-formatter/isString';
import { isRecord } from './isRecord';
import { shallowCompare } from './shallowCompare';
import { throwWrongKeyOnActionCollectionConfig } from './throwWrongKeyOnActionCollectionConfig';
import { uniqueId } from './uniqueId';
import { UniqueSymbol, uniqueSymbol } from './uniqueSymbol';

const debugProps = globalThis as typeof globalThis & {
  REACT_GLOBAL_STATE_HOOK_DEBUG?: ($this: unknown) => void;
  REACT_GLOBAL_STATE_TEMP_HOOKS: object[] | null;
  sessionStorage?: { getItem: (key: string) => string | null };
};

// prefer to store weak refs to avoid processing global states that are not used
const getTempObjectKey = (obj: object) => {
  return typeof globalThis.WeakRef !== 'undefined' ? new globalThis.WeakRef(obj) : obj;
};

// devtools fallback for page reloads during debugging sessions
(() => {
  // monkey path is already in place, no fallback is needed
  if (debugProps.REACT_GLOBAL_STATE_TEMP_HOOKS) return;

  // if this is not a web environment have issues with reloads
  if (isNil(debugProps.sessionStorage)) return;

  try {
    // Safary could potentially throw an error if the session storage is disabled
    const isDebugging = debugProps.sessionStorage.getItem('REACT_GLOBAL_STATE_HOOK_DEBUG');
    if (!isDebugging) return;
  } catch (error) {
    return;
  }

  debugProps.REACT_GLOBAL_STATE_TEMP_HOOKS = [];

  // auto cleanup the weakset after 1 second
  setTimeout(() => {
    debugProps.REACT_GLOBAL_STATE_TEMP_HOOKS = null;
  }, 10_000);
})();

/**
 * The GlobalStore class is the main class of the library and it is used to create a GlobalStore instances
 * */
export class GlobalStore<
  State,
  Metadata extends BaseMetadata | unknown,
  ActionsConfig extends ActionCollectionConfig<State, Metadata> | undefined | unknown,
  PublicStateMutator = keyof ActionsConfig extends never | undefined
    ? StateSetter<State>
    : ActionCollectionResult<State, Metadata, NonNullable<ActionsConfig>>
> {
  protected _name: string;
  protected wasDisposed = false;

  public actionsConfig: ActionsConfig | null = null;
  public callbacks: GlobalStoreCallbacks<State, Metadata> | null = null;

  public metadata: Metadata;
  public actions: ActionCollectionResult<State, Metadata, NonNullable<ActionsConfig>> | null = null;

  public subscribers: Map<string, SubscriberParameters> = new Map();

  public stateWrapper: {
    state: State;
  };

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

    this.stateWrapper = {
      state,
    };

    this._name = storeName ?? uniqueId('gs:');
    this.metadata = metadata ?? ({} as Metadata);
    this.callbacks = callbacks ?? null;
    this.actionsConfig = actions ?? null;

    if (debugProps.REACT_GLOBAL_STATE_HOOK_DEBUG) {
      debugProps.REACT_GLOBAL_STATE_HOOK_DEBUG(this);
    } else if (debugProps.REACT_GLOBAL_STATE_TEMP_HOOKS) {
      // as fallback store temporarily the hooks to allow the devtools to collect them
      // this is necessary for the devtools to work after a page reload
      // after a page reload the content script could be injected after the hooks are created
      debugProps.REACT_GLOBAL_STATE_TEMP_HOOKS.push(getTempObjectKey(this));
    }

    const isExtensionClass = this.constructor !== GlobalStore;
    if (isExtensionClass) return;

    (this as GlobalStore<State, Metadata, ActionsConfig>).initialize();
  }

  protected onInit?: (args: StoreTools<State, Metadata>) => void;
  protected onStateChanged?: (args: StoreTools<State, Metadata> & StateChanges<State>) => void;
  protected onSubscribed?: (args: StoreTools<State, Metadata>) => void;
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
      newRootState: State;
      currentRootState: State | UniqueSymbol;
      identifier: string | undefined;
    }
  ): {
    didUpdate: boolean;
  } => {
    const { selector, callback, currentState: currentChildState, config } = subscription;

    // compare the root state, there should not be a re-render if the root state is the same
    if (
      !args.forceUpdate &&
      (config?.isEqualRoot ?? ((a, b) => a === b))(args.currentRootState, args.newRootState)
    ) {
      return { didUpdate: false };
    }

    const newChildState = selector ? selector(args.newRootState) : args.newRootState;

    // compare the state of the selected part of the state, there should not be a re-render if the state is the same
    if (!args.forceUpdate && (config?.isEqual ?? ((a, b) => a === b))(currentChildState, newChildState)) {
      return { didUpdate: false };
    }

    // update the current state of the subscription
    this.partialUpdateSubscription(subscription.subscriptionId, {
      currentState: newChildState,
    });

    // execute the callback associated with the subscription
    // the callback could be an observer event or a setState function
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
   * @param {StateSetter<State>} setter - The setter function or the value to set
   * */
  protected setState = (
    {
      state: newRootState,
    }: {
      state: State;
    },
    { forceUpdate, identifier }: { forceUpdate?: boolean; identifier?: string }
  ) => {
    const { state: currentRootState } = this.stateWrapper;

    const shouldUpdate = forceUpdate || currentRootState !== newRootState;
    if (!shouldUpdate) return;

    this.stateWrapper = {
      state: newRootState,
    };

    const subscribers = this.subscribers.values();

    const args = {
      forceUpdate,
      newRootState,
      currentRootState,
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
    if (!param1) return this.stateWrapper.state;

    const hasExplicitSelector = isFunction(param2);

    const selector = hasExplicitSelector ? (param1 as SelectorCallback<unknown, unknown>) : undefined;

    const callback = (hasExplicitSelector ? param2 : param1) as SubscribeCallback<unknown>;

    const config = (hasExplicitSelector ? param3 : param2) ?? undefined;

    const initialState = selector ? selector(this.stateWrapper.state) : this.stateWrapper.state;

    if (!config?.skipFirst) {
      callback(initialState);
    }

    const subscriptionId = uniqueId('gs:');

    this.setOrUpdateSubscription({
      subscriptionId,
      selector,
      config,
      currentState: initialState,
      callback: ({ state }: { state: unknown }) => callback(state),
      isSetStateCallback: false,
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
      setState: setStateWrapper,
      actions,
    };
  };

  protected lastSubscriptionId: string | null = null;

  protected setOrUpdateSubscription = (
    subscription: SubscriberParameters
  ): {
    isNewSubscription?: boolean;
  } => {
    const { subscriptionId } = subscription;
    // before the useEffect is triggered the first time the subscriptionId is null
    if (!subscriptionId) return { isNewSubscription: false };

    const currentItem = this.subscribers.get(subscriptionId);

    if (isRecord(currentItem)) {
      Object.assign(currentItem, subscription);

      return { isNewSubscription: false };
    }

    // new component was subscribed
    this.executeOnSubscribed();

    this.subscribers.set(subscriptionId, subscription);
    this.lastSubscriptionId = subscriptionId;

    return { isNewSubscription: true };
  };

  protected partialUpdateSubscription = (
    subscriptionId: string,
    values: Partial<SubscriberParameters>
  ): void => {
    const subscription = this.subscribers.get(subscriptionId);

    if (!isRecord(subscription)) return;

    Object.assign(subscription, values);
  };

  protected executeOnSubscribed = () => {
    const { onSubscribed } = this;
    const onSubscribedFromConfig = this.callbacks?.onSubscribed;

    if (onSubscribed || onSubscribedFromConfig) {
      const parameters = this.getConfigCallbackParam();

      onSubscribed?.(parameters);
      onSubscribedFromConfig?.(parameters);
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

      const config = Array.isArray(args) ? { dependencies: args } : args ?? {};

      const hooksProps = useRef<{
        subscriptionId: string | null;
        tempInitialRootState: State | UniqueSymbol;
      }>({
        subscriptionId: null,
        tempInitialRootState: this.stateWrapper.state,
      });

      const computeChildState = (): {
        state: unknown;
      } => {
        if (selector) {
          return {
            state: selector(this.stateWrapper.state),
          };
        }

        return this.stateWrapper;
      };

      const [stateWrapper, setState] = useState(computeChildState);

      // handles the subscription lifecycle
      useEffect(() => {
        if (isNil(hooksProps.current)) return;
        if (isNil(hooksProps.current.subscriptionId)) {
          hooksProps.current.subscriptionId = uniqueId('ss:');
        }

        const subscriptionId = hooksProps.current.subscriptionId;
        const subscription: SubscriberParameters = {
          subscriptionId,
          currentState: stateWrapper.state,
          selector,
          config,
          callback: setState,
          isSetStateCallback: true,
        };

        const { isNewSubscription } = this.setOrUpdateSubscription(subscription);

        if (isNewSubscription) {
          // the state could have been changing before the subscription was fully committed
          this.executeSetStateForSubscriber(subscription, {
            forceUpdate: false,
            newRootState: this.stateWrapper.state,
            currentRootState: (() => {
              const isUniqueSymbol = hooksProps.current.tempInitialRootState === uniqueSymbol;

              return isUniqueSymbol ? this.stateWrapper.state : hooksProps.current.tempInitialRootState;
            })(),
            identifier: 'on mount state update',
          });

          // The initial root state is required to verify if the state has changed before the subscription is fully established.
          // This is applicable for both hooks and selectorHooks.
          // once the subscription is established we can set the initial root state to an empty symbol
          hooksProps.current.tempInitialRootState = uniqueSymbol;
        }

        return () => {
          this.subscribers.delete(subscriptionId);
        };
        // this effect should only run on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      const subscriptionId = isString(hooksProps.current?.subscriptionId)
        ? hooksProps.current.subscriptionId
        : '';

      const subscriptionParameters = this.subscribers.get(subscriptionId);
      const { dependencies: currentDependencies } = subscriptionParameters?.config ?? {
        dependencies: config.dependencies,
      };

      // ensure the subscription id is always updated with the last callbacks and configurations
      this.partialUpdateSubscription(subscriptionId, {
        currentState: stateWrapper.state,
        selector,
        config,
        callback: setState,
      });

      return [
        this.computeSelectedState({
          selector,
          subscriptionId,
          config,
          currentDependencies,
          computeChildState,
          stateWrapperRef: stateWrapper,
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
    useHook.dispose = this.dispose;

    return useHook as unknown as StateHook<State, PublicStateMutator, Metadata>;
  };

  protected computeSelectedState = ({
    selector,
    subscriptionId,
    config,
    currentDependencies,
    computeChildState,
    stateWrapperRef,
  }: {
    selector: SelectorCallback<unknown, unknown> | undefined;
    subscriptionId: string;
    config: UseHookConfig<unknown, unknown>;
    currentDependencies: unknown[] | undefined;
    computeChildState: () => { state: unknown };
    stateWrapperRef: { state: unknown };
  }) => {
    if (!selector || !subscriptionId) return stateWrapperRef.state;

    const { dependencies: newDependencies } = config;

    // if the dependencies are the same we don't need to compute the state
    if (currentDependencies === newDependencies) return stateWrapperRef.state;

    const isLengthEqual = currentDependencies?.length === newDependencies?.length;
    const isSameValues = isLengthEqual && shallowCompare(currentDependencies, newDependencies);

    // if values are the same we don't need to compute the state
    if (isSameValues) return stateWrapperRef.state;

    // if the dependencies are different we need to compute the state
    const { state: currentState } = computeChildState();

    this.partialUpdateSubscription(subscriptionId, {
      currentState,
    });

    // update the current state without re-rendering the component
    // when the there is a selector the stare wrapper is a different object reference
    stateWrapperRef.state = currentState;

    return currentState;
  };

  /**
   * @description
   * Use this function to create a custom global hook which contains a fragment of the state of another hook
   */
  public createSelectorHook = <
    RootState,
    StateMutator,
    Metadata extends BaseMetadata,
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
  ): StateHook<RootDerivate, StateMutator, Metadata> => {
    const [rootStateRetriever, rootMutator, metadataRetriever] = this.stateControls() as unknown as [
      StateGetter<RootState>,
      StateMutator,
      MetadataGetter<Metadata>
    ];

    let root = rootStateRetriever();
    let rootDerivate = (mainSelector ?? ((s) => s))(root) as unknown as RootDerivate;

    // derivate states do not have lifecycle methods or actions
    const childStore = new GlobalStore(rootDerivate, {
      name: selectorName ?? uniqueId('sh:'),
    });

    const [childStateRetriever, setChildState] = childStore.stateControls();

    // keeps the root state and the derivate state in sync
    rootStateRetriever(
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
      return [childState, rootMutator, metadataRetriever];
    }) as unknown as StateHook<unknown, unknown, unknown>;

    useChildHookWrapper.stateControls = () => [childStateRetriever, rootMutator, metadataRetriever];

    useChildHookWrapper.createSelectorHook = this.createSelectorHook.bind(
      useChildHookWrapper
    ) as typeof useChildHookWrapper.createSelectorHook;

    useChildHookWrapper.createObservable = this.createObservable.bind(useChildHookWrapper);

    return useChildHookWrapper as StateHook<RootDerivate, StateMutator, Metadata>;
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
  protected setStateWrapper: StateSetter<State> = (setter, { forceUpdate, identifier } = {}) => {
    const previousState = this.stateWrapper.state;

    const newState = isFunction(setter) ? (setter as (state: State) => State)(previousState) : setter;

    // if the state didn't change, we don't need to do anything
    if (!forceUpdate && this.stateWrapper.state === newState) return;

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

    this.setState(
      {
        state: newState,
      },
      { forceUpdate, identifier }
    );

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
            setState: setStateWrapper as StateSetter<unknown>,
            getState,
            setMetadata: setMetadata as MetadataSetter<BaseMetadata>,
            getMetadata: getMetadata as MetadataGetter<BaseMetadata>,
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

    rootStateRetriever(
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

    // parasite the state controls to allow endless observables
    (
      observable as unknown as {
        stateControls: () => Readonly<[retriever: StateGetter<Fragment>]>;
      }
    ).stateControls = () => [observable];

    return observable;
  }

  public dispose = () => {
    this.wasDisposed = true;

    // mark everything as null to allow the garbage collector to free the memory
    Object.assign(this, {
      _name: null,
      actionsConfig: null,
      callbacks: null,
      metadata: null,
      actions: null,
      subscribers: null,
      stateWrapper: null,
    });
  };
}

export default GlobalStore;
