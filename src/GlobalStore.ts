import { shallowCompare, uniqueId } from './GlobalStore.utils';
import { useEffect, useRef, useState } from 'react';

import {
  ActionCollectionConfig,
  StateSetter,
  GlobalStoreConfig,
  ActionCollectionResult,
  MetadataSetter,
  UseHookConfig,
  StateGetter,
  SubscriberCallback,
  SubscribeCallbackConfig,
  SubscribeCallback,
  SelectorCallback,
  SubscriberParameters,
  SubscriptionCallback,
  SubscribeToEmitter,
  MetadataGetter,
  StateHook,
  Subscribe,
  StoreTools,
  StateChanges,
} from './GlobalStore.types';

const throwWrongKeyOnActionCollectionConfig = (action_key: string) => {
  throw new Error(`[WRONG CONFIGURATION!]: Every key inside the storeActionsConfig must be a higher order function that returns a function \n[${action_key}]: key is not a valid function, try something like this: \n{\n
    ${action_key}: (param) => ({ setState, getState, setMetadata, getMetadata, actions }) => {\n
      setState((state) => ({ ...state, ...param }))\n
    }\n
}\n`);
};

export const throwNoSubscribersWereAdded = () => {
  throw new Error(
    'No new subscribers were added, please make sure to add at least one subscriber with the subscribe method'
  );
};

type DebugProps = {
  REACT_GLOBAL_STATE_HOOK_DEBUG: (
    $this: GlobalStore<any, any, any, any, any, any, any>,
    state,
    config,
    actionsConfig
  ) => void;
};

/**
 * The GlobalStore class is the main class of the library and it is used to create a GlobalStore instances
 * @template {State} State - The type of the state object
 * @template {Metadata} Metadata - The type of the metadata object (optional) (default: null) no reactive information set to share with the subscribers
 * @template {TStateMutator} TStateMutator - The type of the actionsConfig object (optional) (default: null) if a configuration is passed, the hook will return an object with the actions then all the store manipulation will be done through the actions
 * */
export class GlobalStore<
  State,
  Metadata extends Record<string, unknown> = {},
  ActionsConfig extends ActionCollectionConfig<any, any, any> | null | {} = null,
  FullActionsConfig extends ActionCollectionConfig<any, any, any> = ActionsConfig extends null
    ? null
    : ActionCollectionConfig<State, Metadata, ActionsConfig>,
  Actions extends ActionCollectionResult<State, Metadata, FullActionsConfig> = ActionsConfig extends null
    ? null
    : ActionCollectionResult<State, Metadata, FullActionsConfig>,
  PublicStateMutator = ActionsConfig extends null ? StateSetter<State> : Actions,
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
> {
  /**
   * list of all the subscribers setState functions
   * @template {State} State - The type of the state object
   * */
  public subscribers: Map<string, SubscriberParameters> = new Map();

  /**
   * Actions of the store
   */
  public actions?: Actions;

  protected config: GlobalStoreConfig<State, Metadata, StoreAPI> = {
    metadata: null,
  };

  protected onInit?: (storeAPI: StoreAPI) => void;

  protected onStateChanged?: (storeAPI: StoreAPI & StateChanges<State>) => void;

  protected onSubscribed?: (storeAPI: StoreAPI) => void;

  protected computePreventStateChange?: (storeAPI: StoreAPI & StateChanges<State>) => boolean;

  /**
   * We use a wrapper in order to be able to force the state update when necessary even with primitive types
   */
  protected stateWrapper: {
    state: State;
  };

  /**
   * @deprecated direct modifications of the state could end up in unexpected behaviors
   */
  protected get state(): State {
    return this.stateWrapper.state;
  }

  /**
   * Create a simple global store
   * @param {State} state - The initial state
   * */
  constructor(state: State);

  /**
   * Create a new global store with custom action
   * The metadata object could be null if not needed
   * The setter Object is used to define the actions that will be used to manipulate the state
   * @param {State} state - The initial state
   * @param {TStateMutator} actionsConfig - The actions configuration object (optional) (default: null) if not null the store manipulation will be done through the actions
   * */
  constructor(state: State, config: GlobalStoreConfig<State, Metadata, StoreAPI>);

  /**
   * Create a new global store with custom action
   * The metadata object could be null if not needed
   * The setter Object is used to define the actions that will be used to manipulate the state
   * The config object is used to define the callbacks that will be executed during the store lifecycle
   * The lifecycle callbacks are: onInit, onStateChanged, onSubscribed and computePreventStateChange
   * @param {State} state - The initial state
   * @param {GlobalStoreConfig<State, Metadata>} config - The configuration object (optional) (default: { metadata: null })
   * @param {GlobalStoreConfig<State, Metadata>} config.metadata - The metadata object (optional) (default: null) if not null the metadata object will be reactive
   * @param {GlobalStoreConfig<State, Metadata>} config.onInit - The callback to execute when the store is initialized (optional) (default: null)
   * @param {GlobalStoreConfig<State, Metadata>} config.onStateChanged - The callback to execute when the state is changed (optional) (default: null)
   * @param {GlobalStoreConfig<State, Metadata>} config.onSubscribed - The callback to execute when a new component gets subscribed to the store (optional) (default: null)
   * @param {GlobalStoreConfig<State, Metadata>} config.computePreventStateChange - The callback to execute every time a state change is triggered and before the state is updated, it allows to prevent the state change by returning true (optional) (default: null)
   * @param {TStateMutator} actionsConfig - The actions configuration object (optional) (default: null) if not null the store manipulation will be done through the actions
   * */
  constructor(
    state: State,
    config: GlobalStoreConfig<State, Metadata, StoreAPI>,
    actionsConfig: ActionsConfig
  );

  /**
   * Create a new instance of the GlobalStore
   * @param {State} state - The initial state
   * @param {GlobalStoreConfig<State, Metadata>} config - The configuration object (optional) (default: { metadata: null })
   * @param {GlobalStoreConfig<State, Metadata>} config.metadata - The metadata object (optional) (default: null) if not null the metadata object will be reactive
   * @param {GlobalStoreConfig<State, Metadata>} config.onInit - The callback to execute when the store is initialized (optional) (default: null)
   * @param {GlobalStoreConfig<State, Metadata>} config.onStateChanged - The callback to execute when the state is changed (optional) (default: null)
   * @param {GlobalStoreConfig<State, Metadata>} config.onSubscribed - The callback to execute when a new component gets subscribed to the store (optional) (default: null)
   * @param {GlobalStoreConfig<State, Metadata>} config.computePreventStateChange - The callback to execute every time a state change is triggered and before the state is updated, it allows to prevent the state change by returning true (optional) (default: null)   * @param {TStateMutator} actionsConfig - The actions configuration object (optional) (default: null) if not null the store manipulation will be done through the actions
   * */
  constructor(
    state: State,
    config: GlobalStoreConfig<State, Metadata, StoreAPI> = {},
    protected actionsConfig: ActionsConfig | null = null
  ) {
    this.stateWrapper = {
      state,
    };

    this.config = {
      metadata: null,
      ...(config ?? {}),
    };

    if ((globalThis as unknown as DebugProps)?.REACT_GLOBAL_STATE_HOOK_DEBUG) {
      (globalThis as unknown as DebugProps).REACT_GLOBAL_STATE_HOOK_DEBUG(this, state, config, actionsConfig);
    }

    const isExtensionClass = this.constructor !== GlobalStore;
    if (isExtensionClass) return;

    (this as GlobalStore<State, Metadata, PublicStateMutator>).initialize();
  }

  protected initialize = async () => {
    /**
     * actions map is created just once after the initialization
     */
    if (this.actionsConfig) {
      this.actions = this.getStoreActionsMap();
    }

    const { onInit } = this;
    const { onInit: onInitFromConfig } = this.config;

    if (!onInit && !onInitFromConfig) return;

    const parameters = this.getConfigCallbackParam();

    onInit?.(parameters);
    onInitFromConfig?.(parameters);
  };

  /**
   * set the state and update all the subscribers
   * @param {StateSetter<State>} setter - The setter function or the value to set
   * */
  protected setState = ({
    state: newRootState,
    forceUpdate,
    identifier,
  }: {
    state: State;
    forceUpdate: boolean;
    identifier?: string;
  }) => {
    const { state: currentRootState } = this.stateWrapper;

    // update the main state
    this.stateWrapper = {
      state: newRootState,
    };

    const executeSetState = (parameters: SubscriberParameters) => {
      const { selector, callback, currentState: currentChildState, config } = parameters;

      // compare the root state, there should not be a re-render if the root state is the same
      if (
        !forceUpdate &&
        (config?.isEqualRoot ?? ((a, b) => Object.is(a, b)))(currentRootState, newRootState)
      )
        return;

      const newChildState = selector ? selector(newRootState) : newRootState;

      // compare the result after the selector is executed
      if (!forceUpdate && (config?.isEqual ?? ((a, b) => Object.is(a, b)))(currentChildState, newChildState))
        return;

      // this in the case of the hooks is the setState function
      callback({ state: newChildState, identifier });
    };

    const subscribers = Array.from(this.subscribers.values());

    // update all the subscribers
    for (let index = 0; index < subscribers.length; index++) {
      const parameters = subscribers[index];

      executeSetState(parameters);
    }
  };

  /**
   * Set the value of the metadata property, this is no reactive and will not trigger a re-render
   * @param {MetadataSetter<Metadata>} setter - The setter function or the value to set
   * */
  protected setMetadata: MetadataSetter<Metadata> = (setter) => {
    const isSetterFunction = typeof setter === 'function';

    const metadata = isSetterFunction
      ? (setter as (state: Metadata) => Metadata)(this.config.metadata ?? null)
      : setter;

    this.config = {
      ...(this.config ?? {}),
      metadata,
    };
  };

  protected getMetadata = () => this.config.metadata ?? null;

  protected createChangesSubscriber = ({
    callback,
    selector,
    config,
  }: {
    selector?: SelectorCallback<unknown, unknown>;
    callback: SubscribeCallback<unknown>;
    config: SubscribeCallbackConfig<unknown>;
  }) => {
    const initialState = selector ? selector(this.stateWrapper.state) : this.stateWrapper.state;

    const stateWrapper = {
      state: initialState,
    };

    const subscriptionCallback: SubscriptionCallback = ({ state }: { state: unknown }) => {
      stateWrapper.state = state;

      callback(state);
    };

    if (!config?.skipFirst) {
      callback(initialState);
    }

    return {
      stateWrapper,
      subscriptionCallback,
    };
  };

  /**
   * Return current state of the store
   * Optionally you can use this method to subscribe a callback to the store changes
   * @param {UseHookConfig<State, TDerivate>} config - The configuration object (optional) (default: { selector: null, subscriptionCallback: null, config: null })
   * @param {TSelector} config.selector - The selector function to derive the state (optional) (default: null)
   * @param {TSubscriptionCallback} config.subscriptionCallback - The callback to execute every time the state is changed
   * @param {UseHookConfig<State, TDerivate>} config.config - The configuration for the callback (optional) (default: null)
   * @param {UseHookConfig<State, TDerivate>} config.config.isEqual - The compare function to check if the state is changed (optional) (default: shallowCompare)
   * @returns The state of the store, optionally if you provide a subscriptionCallback it this method will return the unsubscribe function
   */
  protected getState = (<TCallback extends SubscriberCallback<State> | null>(
    subscriberCallback?: TCallback
  ) => {
    // if there is no subscription callback return the state
    if (!subscriberCallback) return this.stateWrapper.state;

    const changesSubscribers: string[] = [];

    const subscribe = ((param1, param2, param3) => {
      const hasExplicitSelector = typeof param2 === 'function';

      const selector = (hasExplicitSelector ? param1 : null) as SelectorCallback<unknown, unknown>;

      const callback = (hasExplicitSelector ? param2 : param1) as SubscribeCallback<unknown>;

      const config = (hasExplicitSelector ? param3 : param2) as SubscribeCallbackConfig<unknown>;

      const { subscriptionCallback, stateWrapper } = this.createChangesSubscriber({
        selector,
        callback,
        config,
      });

      const subscriptionId = uniqueId();

      this.addNewSubscriber(subscriptionId, {
        subscriptionId,
        selector,
        config,
        currentState: stateWrapper.state,
        callback: subscriptionCallback,
      });

      changesSubscribers.push(subscriptionId);
    }) as SubscribeToEmitter<State>;

    subscriberCallback(subscribe);

    if (!changesSubscribers.length) {
      throwNoSubscribersWereAdded();
    }

    return () => {
      for (let index = 0; index < changesSubscribers.length; index++) {
        const subscriber = changesSubscribers[index];

        this.subscribers.delete(subscriber);
      }
    };
  }) as StateGetter<State>;

  protected getConfigCallbackParam = (): StoreAPI => {
    const { setMetadata, getMetadata, getState, actions, setStateWrapper } = this;

    return {
      setMetadata,
      getMetadata,
      getState,
      setState: setStateWrapper,
      actions,
    } as StoreAPI;
  };

  protected addNewSubscriber = (subscriptionId: string, item: SubscriberParameters) => {
    this.subscribers.set(subscriptionId, item);
  };

  protected updateSubscriptionIfExists = (subscriptionId: string, item: SubscriberParameters): void => {
    if (!this.subscribers.has(subscriptionId)) return;

    Object.assign(this.subscribers.get(subscriptionId), item);
  };

  protected executeOnSubscribed = () => {
    const { onSubscribed } = this;
    const { onSubscribed: onSubscribedFromConfig } = this.config;

    if (onSubscribed || onSubscribedFromConfig) {
      const parameters = this.getConfigCallbackParam();

      onSubscribed?.(parameters);
      onSubscribedFromConfig?.(parameters);
    }
  };

  /**
   * Returns a custom hook that allows to handle a global state
   * @returns {[State, TStateMutator, Metadata]} - The state, the state setter or the actions map, the metadata
   * */
  public getHook = () => {
    const hook = <_State = State>(
      selector?: SelectorCallback<State, _State>,
      config: UseHookConfig<_State, State> = {}
    ) => {
      const computeStateWrapper = () => {
        if (selector) {
          const derivedState = selector(this.stateWrapper.state);

          return {
            state: derivedState,
          };
        }

        return {
          state: this.stateWrapper.state,
        };
      };

      const [stateWrapper, setState] = useState<{
        state: unknown;
      }>(computeStateWrapper);

      // store non-reactive values of the hook
      const subscriptionIdRef = useRef<string>(null);

      // handles the subscription lifecycle
      useEffect(() => {
        if (subscriptionIdRef.current === null) {
          const subscriptionId = uniqueId();

          subscriptionIdRef.current = subscriptionId;

          // create a new subscriber just once
          this.addNewSubscriber(subscriptionId, {
            subscriptionId,
            currentState: stateWrapper.state,
            selector,
            config,
            callback: setState,
          });

          this.executeOnSubscribed();
        }

        const subscriptionId = subscriptionIdRef.current;

        // strick mode will trigger the useEffect twice, we need to ensure the subscription is always updated
        this.updateSubscriptionIfExists(subscriptionId, {
          subscriptionId,
          currentState: stateWrapper.state,
          selector,
          config,
          callback: setState,
        });

        return () => {
          this.subscribers.delete(subscriptionIdRef.current);
        };
      }, []);

      const subscriptionId = subscriptionIdRef.current;
      const subscriptionParameters = this.subscribers.get(subscriptionId);
      const { dependencies: currentDependencies } = subscriptionParameters?.config ?? {
        dependencies: config.dependencies,
      };

      // ensure the subscription id is always updated with the last callbacks and configurations
      this.updateSubscriptionIfExists(subscriptionId, {
        subscriptionId,
        currentState: stateWrapper.state,
        selector,
        config,
        callback: setState,
      });

      return [
        (() => {
          // if it is the first render we just return the state
          // if there is no selector we just return the state
          if (!selector || !subscriptionId) return stateWrapper.state;

          const { dependencies: newDependencies } = config;

          // if the dependencies are the same we don't need to compute the state
          if (currentDependencies === newDependencies) return stateWrapper.state;

          const isLengthEqual = currentDependencies?.length === newDependencies?.length;
          const isSameValues = isLengthEqual && shallowCompare(currentDependencies, newDependencies);

          // if values are the same we don't need to compute the state
          if (isSameValues) return stateWrapper.state;

          // if the dependencies are different we need to compute the state
          const newStateWrapper = computeStateWrapper();

          this.updateSubscriptionIfExists(subscriptionId, {
            subscriptionId,
            currentState: newStateWrapper.state,
            selector,
            config,
            callback: setState,
          });

          // update the current state without re-rendering the component
          stateWrapper.state = newStateWrapper.state;

          return newStateWrapper.state;
        })(),
        this.getStateOrchestrator(),
        this.config.metadata ?? null,
      ];
    };

    /**
     * Extended properties and methods of the hook
     */
    hook.stateControls = this.stateControls;

    hook.createSelectorHook = this.createSelectorHook;

    return hook as unknown as StateHook<State, PublicStateMutator, Metadata>;
  };

  /**
   * @description
   * Use this function to create a custom global hook which contains a fragment of the state of another hook
   */
  public createSelectorHook = <
    RootState,
    StateMutator,
    Metadata,
    RootSelectorResult,
    RootDerivate = RootSelectorResult extends never ? RootState : RootSelectorResult
  >(
    mainSelector?: (state: RootState) => RootSelectorResult,
    {
      isEqualRoot: mainIsEqualRoot,
      isEqual: mainIsEqualFun,
    }: Omit<UseHookConfig<RootDerivate, RootState>, 'dependencies'> = {}
  ) => {
    const subscribers: Map<string, SubscriberParameters> = new Map();
    const useHook = this as unknown as StateHook<RootState, StateMutator, Metadata>;

    const [rootStateRetriever, rootMutator, metadataRetriever] = useHook.stateControls();

    let root = rootStateRetriever();
    let rootDerivate = (mainSelector ?? ((s) => s))(rootStateRetriever()) as unknown as RootDerivate;

    // keeps the root state and the derivate state in sync
    rootStateRetriever<Subscribe>((subscribe) => {
      subscribe(
        (newRoot) => {
          const isRootEqual = (mainIsEqualRoot ?? Object.is)(root, newRoot);

          if (isRootEqual) return;

          root = newRoot;

          const newRootDerivate = mainSelector(newRoot) as unknown as RootDerivate;

          const isRootDerivateEqual = (mainIsEqualFun ?? Object.is)(rootDerivate, newRootDerivate);

          if (isRootDerivateEqual) return;

          rootDerivate = newRootDerivate;

          subscribers.forEach((subscriber) => {
            subscriber.callback({ state: rootDerivate });
          });
        },
        {
          skipFirst: true,
        }
      );
    });

    const createChangesSubscriber = ({
      callback,
      selector,
      config,
    }: {
      selector?: SelectorCallback<unknown, unknown>;
      callback: SubscribeCallback<unknown>;
      config: SubscribeCallbackConfig<unknown>;
    }) => {
      const initialState = (selector ?? ((s) => s))(rootDerivate);

      const stateWrapper = {
        state: initialState,
      };

      const subscriptionCallback: SubscriptionCallback = ({ state }: { state: unknown }) => {
        stateWrapper.state = state;

        callback(state);
      };

      if (!config?.skipFirst) {
        callback(initialState);
      }

      return {
        stateWrapper,
        subscriptionCallback,
      };
    };

    const addNewSubscriber = (subscriptionId: string, args: SubscriberParameters) => {
      subscribers.set(subscriptionId, args);
    };

    const updateSubscriptionIfExists = (subscriptionId: string, item: SubscriberParameters): void => {
      if (!subscribers.has(subscriptionId)) return;

      Object.assign(subscribers.get(subscriptionId), item);
    };

    const stateRetriever = ((subscriberCallback) => {
      if (!subscriberCallback) return rootDerivate;

      const changesSubscribers: string[] = [];

      const subscribe = ((param1, param2, param3) => {
        const hasExplicitSelector = typeof param2 === 'function';

        const selector = (hasExplicitSelector ? param1 : null) as SelectorCallback<unknown, unknown>;

        const callback = (hasExplicitSelector ? param2 : param1) as SubscribeCallback<unknown>;

        const config = (hasExplicitSelector ? param3 : param2) as SubscribeCallbackConfig<unknown>;

        const { subscriptionCallback, stateWrapper } = createChangesSubscriber({
          selector,
          callback,
          config,
        });

        const subscriptionId = uniqueId();

        addNewSubscriber(subscriptionId, {
          subscriptionId,
          selector,
          config,
          currentState: stateWrapper.state,
          callback: subscriptionCallback,
        });

        changesSubscribers.push(subscriptionId);
      }) as SubscribeToEmitter<RootDerivate>;

      subscriberCallback(subscribe);

      if (!changesSubscribers.length) {
        throwNoSubscribersWereAdded();
      }

      return () => {
        for (let index = 0; index < changesSubscribers.length; index++) {
          const subscriber = changesSubscribers[index];

          subscribers.delete(subscriber);
        }
      };
    }) as StateGetter<RootDerivate>;

    const newHook = (<
      SelectorResult,
      Derivate = SelectorResult extends never ? RootDerivate : SelectorResult
    >(
      selector?: (root: RootDerivate) => SelectorResult,
      { isEqualRoot, isEqual, ...config }: UseHookConfig<any, any> = {}
    ) => {
      const computeStateWrapper = () => {
        if (selector) {
          const derivedState = selector(rootDerivate);

          return {
            state: derivedState as unknown as Derivate,
          };
        }

        return {
          state: rootDerivate as unknown as Derivate,
        };
      };

      const [stateWrapper, setState] = useState<{
        state: Derivate;
      }>(computeStateWrapper);

      const subscriptionIdRef = useRef<string>(null);

      useEffect(() => {
        if (subscriptionIdRef.current === null) {
          const subscriptionId = uniqueId();

          subscriptionIdRef.current = subscriptionId;

          // create a new subscriber just once
          addNewSubscriber(subscriptionId, {
            subscriptionId,
            currentState: stateWrapper.state,
            selector,
            config,
            callback: setState as SubscriptionCallback,
          });
        }

        const subscriptionId = subscriptionIdRef.current;

        // strick mode will trigger the useEffect twice, we need to ensure the subscription is always updated
        this.updateSubscriptionIfExists(subscriptionId, {
          subscriptionId,
          currentState: stateWrapper.state,
          selector,
          config,
          callback: setState as SubscriptionCallback,
        });

        const unsubscribe = stateRetriever<Subscribe>((subscribe) => {
          let previousRootDerivate = rootDerivate;

          subscribe((newRootDerivate) => {
            const subscription = subscribers.get(subscriptionIdRef.current);
            const isRootDerivateEqual = (subscription.config?.isEqualRoot ?? Object.is)(
              previousRootDerivate,
              newRootDerivate
            );

            if (isRootDerivateEqual) return;

            previousRootDerivate = newRootDerivate;

            const derivate = (subscription.selector ?? ((s) => s))(rootDerivate) as Derivate;

            const isDerivateEqual = (subscription?.config.isEqual ?? Object.is)(
              derivate,
              subscription.currentState
            );

            if (isDerivateEqual) return;

            subscription.currentState = derivate;

            subscription.callback({
              state: derivate,
            });
          });
        });

        return () => {
          unsubscribe();
          subscribers.delete(subscriptionIdRef.current);
        };
      }, []);

      const subscriptionId = subscriptionIdRef.current;
      const subscriptionParameters = subscribers.get(subscriptionId);
      const { dependencies: currentDependencies } = subscriptionParameters?.config ?? {
        dependencies: config.dependencies,
      };

      // ensure the subscription id is always updated with the last callbacks and configurations
      updateSubscriptionIfExists(subscriptionId, {
        subscriptionId,
        currentState: stateWrapper.state,
        selector,
        config,
        callback: setState as SubscriptionCallback,
      });

      return [
        (() => {
          // if it is the first render we just return the state
          // if there is no selector we just return the state
          if (!selector || !subscriptionId) return stateWrapper.state;

          const { dependencies: newDependencies } = config;

          // if the dependencies are the same we don't need to compute the state
          if (currentDependencies === newDependencies) return stateWrapper.state;

          const isLengthEqual = currentDependencies?.length === newDependencies?.length;
          const isSameValues = isLengthEqual && shallowCompare(currentDependencies, newDependencies);

          // if values are the same we don't need to compute the state
          if (isSameValues) return stateWrapper.state;

          // if the dependencies are different we need to compute the state
          const newStateWrapper = computeStateWrapper();

          updateSubscriptionIfExists(subscriptionId, {
            subscriptionId,
            currentState: newStateWrapper.state,
            selector,
            config,
            callback: setState as SubscriptionCallback,
          });

          // update the current state without re-rendering the component
          stateWrapper.state = newStateWrapper.state;

          return newStateWrapper.state;
        })(),
        rootMutator,
        metadataRetriever,
      ] as Readonly<[derivate: Derivate, stateMutator: StateMutator, metadataRetriever: () => Metadata]>;
    }) as StateHook<RootDerivate, StateMutator, Metadata>;

    newHook.stateControls = () => [stateRetriever, rootMutator, metadataRetriever];
    newHook.createSelectorHook = this.createSelectorHook.bind(newHook);

    Object.assign(newHook, {
      subscribers: subscribers,
    });

    return newHook;
  };

  /**
   * Returns an array with the a function to get the state, the state setter or the actions map, and a function to get the metadata
   * @returns {[() => State, TStateMutator, () => Metadata]} - The state getter, the state setter or the actions map, the metadata getter
   * */
  public stateControls = () => {
    const stateOrchestrator = this.getStateOrchestrator();

    const { getMetadata, getState } = this;

    return [getState, stateOrchestrator, getMetadata] as [
      StateGetter<State>,
      typeof stateOrchestrator,
      MetadataGetter<Metadata>
    ];
  };

  /**
   * @deprecated use the stateControls method instead
   */
  public getHookDecoupled = () => {
    return this.stateControls() as [
      StateGetter<State>,
      ReturnType<typeof this.getStateOrchestrator>,
      MetadataGetter<Metadata>
    ];
  };

  /**
   * Returns the state setter or the actions map
   * @returns {TStateMutator} - The state setter or the actions map
   * */
  protected getStateOrchestrator = () => {
    return (() => {
      if (this.actions) {
        return this.actions;
      }

      return this.setStateWrapper;
    })() as keyof PublicStateMutator extends never
      ? StateSetter<State>
      : ActionCollectionResult<State, Metadata, ActionsConfig, FullActionsConfig>;
  };

  /**
   * Calculate whenever or not we should compute the callback parameters on the state change
   * @returns {boolean} - True if we should compute the callback parameters on the state change
   * */
  protected hasStateCallbacks = (): boolean => {
    const { computePreventStateChange, onStateChanged } = this;

    const {
      computePreventStateChange: computePreventStateChangeFromConfig,
      onStateChanged: onStateChangedFromConfig,
    } = this.config;

    const preventStateChangesCalls = computePreventStateChange || computePreventStateChangeFromConfig;

    const stateChangeCalls = onStateChanged || onStateChangedFromConfig;

    const shouldComputeParameter = preventStateChangesCalls || stateChangeCalls;

    return !!shouldComputeParameter;
  };

  /**
   * This is responsible for defining whenever or not the state change should be allowed or prevented
   * the function also execute the functions:
   * - onStateChanged (if defined) - this function is executed after the state change
   * - computePreventStateChange (if defined) - this function is executed before the state change and it should return a boolean value that will be used to determine if the state change should be prevented or not
   */
  protected setStateWrapper: StateSetter<State> = (setter, { forceUpdate, identifier } = {}) => {
    const isSetterFunction = typeof setter === 'function';
    const previousState = this.stateWrapper.state;

    const newState = isSetterFunction ? (setter as (state: State) => State)(previousState) : setter;

    // if the state didn't change, we don't need to do anything
    if (!forceUpdate && Object.is(this.stateWrapper.state, newState)) return;

    const { setMetadata, getMetadata, getState, actions, setState } = this;

    const callbackParameter = {
      setMetadata,
      getMetadata,
      setState: setState as StateSetter<State>,
      getState,
      actions,
      previousState,
      state: newState,
      identifier,
    } as StoreAPI & StateChanges<State>;

    const { computePreventStateChange } = this;
    const { computePreventStateChange: computePreventStateChangeFromConfig } = this.config;

    // check if the state change should be prevented
    if (computePreventStateChange || computePreventStateChangeFromConfig) {
      const preventStateChange =
        computePreventStateChange?.(callbackParameter) ||
        computePreventStateChangeFromConfig?.(callbackParameter);

      if (preventStateChange) return;
    }

    this.setState({
      forceUpdate,
      identifier,
      state: newState,
    });

    const { onStateChanged } = this;
    const { onStateChanged: onStateChangedFromConfig } = this.config;

    if (!onStateChanged && !onStateChangedFromConfig) return;

    onStateChanged?.(callbackParameter);
    onStateChangedFromConfig?.(callbackParameter);
  };

  /**
   * This creates a map of actions that can be used to modify or interact with the state
   * @returns {ActionCollectionResult<State, Metadata, TStateMutator>} - The actions map result of the configuration object passed to the constructor
   * */
  protected getStoreActionsMap = (): Actions => {
    if (!this.actionsConfig) return null;

    const { actionsConfig, setMetadata, setStateWrapper, getState, getMetadata } = this;

    const actionsKeys = Object.keys(actionsConfig);

    // we bind the functions to the actions object to allow reusing actions in the same api config by using the -this- keyword
    const actions: Actions = actionsKeys.reduce((accumulator, action_key) => {
      Object.assign(accumulator, {
        [action_key](...parameters: unknown[]) {
          const actionConfig = actionsConfig[action_key];
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
            actions: actions as ActionCollectionResult<State, Metadata>,
          });

          // we return the result of the actions to the invoker
          return result;
        },
      });

      return accumulator;
    }, {} as Actions);

    return actions;
  };
}
