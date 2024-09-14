import { shallowCompare, uniqueId } from './GlobalStore.utils';
import { useEffect, useRef, useState } from 'react';

import {
  ActionCollectionConfig,
  StateSetter,
  GlobalStoreConfig,
  ActionCollectionResult,
  StateConfigCallbackParam,
  StateChangesParam,
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

export const uniqueSymbol = Symbol('unique');

/**
 * The GlobalStore class is the main class of the library and it is used to create a GlobalStore instances
 * @template {TState} TState - The type of the state object
 * @template {TMetadata} TMetadata - The type of the metadata object (optional) (default: null) no reactive information set to share with the subscribers
 * @template {TStateMutator} TStateMutator - The type of the actionsConfig object (optional) (default: null) if a configuration is passed, the hook will return an object with the actions then all the store manipulation will be done through the actions
 * */
export class GlobalStore<
  TState,
  TMetadata = null,
  TStateMutator extends ActionCollectionConfig<TState, TMetadata> | StateSetter<TState> = StateSetter<TState>
> {
  /**
   * list of all the subscribers setState functions
   * @template {TState} TState - The type of the state object
   * */
  public subscribers: Map<string, SubscriberParameters> = new Map();

  /**
   * Actions of the store
   */
  public actions?: ActionCollectionResult<TState, TMetadata, TStateMutator> = null;

  /**
   * additional configuration for the store
   * @template {TState} TState - The type of the state object
   * @template {TMetadata} TMetadata - The type of the metadata object (optional) (default: null) no reactive information set to share with the subscribers
   * @template {TStateMutator} TStateMutator - The type of the actionsConfig object (optional) (default: null) if a configuration is passed, the hook will return an object with the actions then all the store manipulation will be done through the actions
   * @property {GlobalStoreConfig<TState, TMetadata, TStateMutator>} config.metadata - The metadata to pass to the callbacks (optional) (default: null)
   * @property {GlobalStoreConfig<TState, TMetadata, TStateMutator>} config.onInit - The callback to execute when the store is initialized (optional) (default: null)
   * @property {GlobalStoreConfig<TState, TMetadata, TStateMutator>} config.onStateChanged - The callback to execute when the state is changed (optional) (default: null)
   * @property {GlobalStoreConfig<TState, TMetadata, TStateMutator>} config.onSubscribed - The callback to execute when a component is subscribed to the store (optional) (default: null)
   * @property {GlobalStoreConfig<TState, TMetadata, TStateMutator>} config.computePreventStateChange - The callback to execute when the state is changed to compute if the state change should be prevented (optional) (default: null)
   */
  protected config: GlobalStoreConfig<TState, TMetadata, TStateMutator> = {
    metadata: null,
  };

  /**
   * execute once the store is created
   * @template {TState} TState - The type of the state object
   * @template {TMetadata} TMetadata - The type of the metadata object (optional) (default: null) no reactive information set to share with the subscribers
   * @template {TStateMutator} TStateMutator - The type of the actionsConfig object (optional) (default: null) if a configuration is passed, the hook will return an object with the actions then all the store manipulation will be done through the actions
   * @param {StateConfigCallbackParam<TState, TMetadata, TStateMutator>} parameters - The parameters object brings the following properties: setState, getState, setMetadata, getMetadata
   * @param {Dispatch<SetStateAction<TState>>} parameters.setState - The setState function to update the state
   * @param {() => TState} parameters.getState - The getState function to get the state
   * @param {Dispatch<SetStateAction<TMetadata>>} parameters.setMetadata - The setMetadata function to update the metadata
   * @param {() => TMetadata} parameters.getMetadata - The getMetadata function to get the metadata
   * */
  protected onInit?: GlobalStoreConfig<TState, TMetadata, TStateMutator>['onInit'] = null;

  /**
   * execute every time the state is changed
   * @template {TState} TState - The type of the state object
   * @template {TMetadata} TMetadata - The type of the metadata object (optional) (default: null) no reactive information set to share with the subscribers
   * @template {TStateMutator} TStateMutator - The type of the actionsConfig object (optional) (default: null) if a configuration is passed, the hook will return an object with the actions then all the store manipulation will be done through the actions
   * @param {StateConfigCallbackParam<TState, TMetadata, TStateMutator>} parameters - The parameters object brings the following properties: setState, getState, setMetadata, getMetadata
   * @param {Dispatch<SetStateAction<TState>>} parameters.setState - The setState function to update the state
   * @param {() => TState} parameters.getState - The getState function to get the state
   * @param {Dispatch<SetStateAction<TMetadata>>} parameters.setMetadata - The setMetadata function to update the metadata
   * @param {() => TMetadata} parameters.getMetadata - The getMetadata function to get the metadata
   * */
  protected onStateChanged?: GlobalStoreConfig<TState, TMetadata, TStateMutator>['onStateChanged'] = null;

  /**
   * Execute each time a new component gets subscribed to the store
   * @template {TState} TState - The type of the state object
   * @template {TMetadata} TMetadata - The type of the metadata object (optional) (default: null) no reactive information set to share with the subscribers
   * @template {TStateMutator} TStateMutator - The type of the actionsConfig object (optional) (default: null) if a configuration is passed, the hook will return an object with the actions then all the store manipulation will be done through the actions
   * @param {StateConfigCallbackParam<TState, TMetadata, TStateMutator>} parameters - The parameters object brings the following properties: setState, getState, setMetadata, getMetadata
   * @param {Dispatch<SetStateAction<TState>>} parameters.setState - The setState function to update the state
   * @param {() => TState} parameters.getState - The getState function to get the state
   * @param {Dispatch<SetStateAction<TMetadata>>} parameters.setMetadata - The setMetadata function to update the metadata
   * @param {() => TMetadata} parameters.getMetadata - The getMetadata function to get the metadata
   * */
  protected onSubscribed?: GlobalStoreConfig<TState, TMetadata, TStateMutator>['onSubscribed'] = null;

  /**
   * Execute every time a state change is triggered and before the state is updated, it allows to prevent the state change by returning true
   * @template {TState} TState - The type of the state object
   * @template {TMetadata} TMetadata - The type of the metadata object (optional) (default: null) no reactive information set to share with the subscribers
   * @template {TStateMutator} TStateMutator - The type of the actionsConfig object (optional) (default: null) if a configuration is passed, the hook will return an object with the actions then all the store manipulation will be done through the actions
   * @param {StateConfigCallbackParam<TState, TMetadata, TStateMutator>} parameters - The parameters object brings the following properties: setState, getState, setMetadata, getMetadata
   * @param {Dispatch<SetStateAction<TState>>} parameters.setState - The setState function to update the state
   * @param {() => TState} parameters.getState - The getState function to get the state
   * @param {Dispatch<SetStateAction<TMetadata>>} parameters.setMetadata - The setMetadata function to update the metadata
   * @param {() => TMetadata} parameters.getMetadata - The getMetadata function to get the metadata
   * @returns {boolean} - true to prevent the state change, false to allow the state change
   * */
  protected computePreventStateChange?: GlobalStoreConfig<
    TState,
    TMetadata,
    TStateMutator
  >['computePreventStateChange'] = null;

  /**
   * We use a wrapper in order to be able to force the state update when necessary even with primitive types
   */
  protected stateWrapper: {
    state: TState;
  };

  /**
   * @deprecated direct modifications of the state could end up in unexpected behaviors
   */
  protected get state(): TState {
    return this.stateWrapper.state;
  }

  /**
   * Create a simple global store
   * @param {TState} state - The initial state
   * */
  constructor(state: TState);

  /**
   * Create a new global store with custom action
   * The metadata object could be null if not needed
   * The setter Object is used to define the actions that will be used to manipulate the state
   * @param {TState} state - The initial state
   * @param {TStateMutator} actionsConfig - The actions configuration object (optional) (default: null) if not null the store manipulation will be done through the actions
   * */
  constructor(state: TState, config: GlobalStoreConfig<TState, TMetadata, TStateMutator>);

  /**
   * Create a new global store with custom action
   * The metadata object could be null if not needed
   * The setter Object is used to define the actions that will be used to manipulate the state
   * The config object is used to define the callbacks that will be executed during the store lifecycle
   * The lifecycle callbacks are: onInit, onStateChanged, onSubscribed and computePreventStateChange
   * @param {TState} state - The initial state
   * @param {GlobalStoreConfig<TState, TMetadata>} config - The configuration object (optional) (default: { metadata: null })
   * @param {GlobalStoreConfig<TState, TMetadata>} config.metadata - The metadata object (optional) (default: null) if not null the metadata object will be reactive
   * @param {GlobalStoreConfig<TState, TMetadata>} config.onInit - The callback to execute when the store is initialized (optional) (default: null)
   * @param {GlobalStoreConfig<TState, TMetadata>} config.onStateChanged - The callback to execute when the state is changed (optional) (default: null)
   * @param {GlobalStoreConfig<TState, TMetadata>} config.onSubscribed - The callback to execute when a new component gets subscribed to the store (optional) (default: null)
   * @param {GlobalStoreConfig<TState, TMetadata>} config.computePreventStateChange - The callback to execute every time a state change is triggered and before the state is updated, it allows to prevent the state change by returning true (optional) (default: null)
   * @param {TStateMutator} actionsConfig - The actions configuration object (optional) (default: null) if not null the store manipulation will be done through the actions
   * */
  constructor(
    state: TState,
    config: GlobalStoreConfig<TState, TMetadata, TStateMutator>,
    actionsConfig: TStateMutator
  );

  /**
   * Create a new instance of the GlobalStore
   * @param {TState} state - The initial state
   * @param {GlobalStoreConfig<TState, TMetadata>} config - The configuration object (optional) (default: { metadata: null })
   * @param {GlobalStoreConfig<TState, TMetadata>} config.metadata - The metadata object (optional) (default: null) if not null the metadata object will be reactive
   * @param {GlobalStoreConfig<TState, TMetadata>} config.onInit - The callback to execute when the store is initialized (optional) (default: null)
   * @param {GlobalStoreConfig<TState, TMetadata>} config.onStateChanged - The callback to execute when the state is changed (optional) (default: null)
   * @param {GlobalStoreConfig<TState, TMetadata>} config.onSubscribed - The callback to execute when a new component gets subscribed to the store (optional) (default: null)
   * @param {GlobalStoreConfig<TState, TMetadata>} config.computePreventStateChange - The callback to execute every time a state change is triggered and before the state is updated, it allows to prevent the state change by returning true (optional) (default: null)   * @param {TStateMutator} actionsConfig - The actions configuration object (optional) (default: null) if not null the store manipulation will be done through the actions
   * */
  constructor(
    state: TState,
    config: GlobalStoreConfig<TState, TMetadata, TStateMutator> = {},
    protected actionsConfig: TStateMutator | null = null
  ) {
    this.stateWrapper = {
      state,
    };

    this.config = {
      metadata: null,
      ...(config ?? {}),
    };

    type DebugProps = {
      REACT_GLOBAL_STATE_HOOK_DEBUG: (
        $this: GlobalStore<TState, TMetadata, TStateMutator>,
        state,
        config,
        actionsConfig
      ) => void;
    };

    const isDevMode = typeof process !== 'undefined' && process?.env?.NODE_ENV === 'development';
    if (isDevMode && (globalThis as unknown as DebugProps)?.REACT_GLOBAL_STATE_HOOK_DEBUG) {
      (globalThis as unknown as DebugProps).REACT_GLOBAL_STATE_HOOK_DEBUG(this, state, config, actionsConfig);
    }

    const isExtensionClass = this.constructor !== GlobalStore;
    if (isExtensionClass) return;

    (this as GlobalStore<TState, TMetadata, TStateMutator>).initialize();
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
   * @param {StateSetter<TState>} setter - The setter function or the value to set
   * */
  protected setState = ({
    state: newRootState,
    forceUpdate,
    identifier,
  }: {
    state: TState;
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
   * @param {MetadataSetter<TMetadata>} setter - The setter function or the value to set
   * */
  protected setMetadata: MetadataSetter<TMetadata> = (setter) => {
    const isSetterFunction = typeof setter === 'function';

    const metadata = isSetterFunction
      ? (setter as (state: TMetadata) => TMetadata)(this.config.metadata ?? null)
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
   * @param {UseHookConfig<TState, TDerivate>} config - The configuration object (optional) (default: { selector: null, subscriptionCallback: null, config: null })
   * @param {TSelector} config.selector - The selector function to derive the state (optional) (default: null)
   * @param {TSubscriptionCallback} config.subscriptionCallback - The callback to execute every time the state is changed
   * @param {UseHookConfig<TState, TDerivate>} config.config - The configuration for the callback (optional) (default: null)
   * @param {UseHookConfig<TState, TDerivate>} config.config.isEqual - The compare function to check if the state is changed (optional) (default: shallowCompare)
   * @returns The state of the store, optionally if you provide a subscriptionCallback it this method will return the unsubscribe function
   */
  protected getState = (<TCallback extends SubscriberCallback<TState> | null>(
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
        selector,
        config,
        stateWrapper,
        callback: subscriptionCallback,
      });

      changesSubscribers.push(subscriptionId);
    }) as SubscribeToEmitter<TState>;

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
  }) as StateGetter<TState>;

  /**
   * get the parameters object to pass to the callback functions (onInit, onStateChanged, onSubscribed, computePreventStateChange)
   * this parameters object brings the following properties: setState, getState, setMetadata, getMetadata
   * this parameter object allows to update the state, get the state, update the metadata, get the metadata
   * @returns {StateConfigCallbackParam<TState, TMetadata>} - The parameters object
   * */
  protected getConfigCallbackParam = (): StateConfigCallbackParam<TState, TMetadata, TStateMutator> => {
    const { setMetadata, getMetadata, getState, actions, setStateWrapper } = this;

    return {
      setMetadata,
      getMetadata,
      getState,
      setState: setStateWrapper,
      actions,
    } as StateConfigCallbackParam<TState, TMetadata, TStateMutator>;
  };

  protected addNewSubscriber = (
    subscriptionId: string,
    args: {
      callback: SubscriptionCallback;
      selector: SelectorCallback<any, any>;
      config: UseHookConfig<any> | SubscribeCallbackConfig<any>;
      stateWrapper: { state: unknown };
    }
  ) => {
    this.subscribers.set(subscriptionId, {
      subscriptionId,
      currentState: args.stateWrapper.state,
      selector: args.selector,
      config: args.config,
      callback: args.callback,
      currentDependencies: uniqueSymbol as unknown,
    } as SubscriberParameters);

    Object.assign(args.callback, {
      __global_state_subscription_id__: subscriptionId,
    });
  };

  protected updateSubscriptionIfExists = (
    subscriptionId: string,
    args: {
      callback: SubscriptionCallback;
      selector: SelectorCallback<any, any>;
      config: UseHookConfig<any> | SubscribeCallbackConfig<any>;
      stateWrapper: { state: unknown };
    }
  ): void => {
    if (!this.subscribers.has(subscriptionId)) return;

    const subscriber = this.subscribers.get(subscriptionId);

    subscriber.currentState = args.stateWrapper.state;
    subscriber.currentDependencies = subscriber.config?.dependencies;

    subscriber.selector = args.selector;
    subscriber.config = args.config;
    subscriber.callback = args.callback;
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
   * @returns {[TState, TStateMutator, TMetadata]} - The state, the state setter or the actions map, the metadata
   * */
  public getHook = () => {
    const hook = <State = TState>(
      selector?: SelectorCallback<TState, State>,
      config: UseHookConfig<State, TState> = {}
    ) => {
      // store non-reactive values of the hook
      const subscriptionIdRef = useRef<string>(null);

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

      // handles the subscription lifecycle
      useEffect(() => {
        if (subscriptionIdRef.current === null) {
          subscriptionIdRef.current = uniqueId();
        }

        return () => {
          this.subscribers.delete(subscriptionIdRef.current);
        };
      }, []);

      // ensure the subscription id is always updated with the last callbacks and configurations
      this.updateSubscriptionIfExists(subscriptionIdRef.current, {
        stateWrapper,
        selector,
        config,
        callback: setState,
      });

      useEffect(() => {
        const subscriptionId = subscriptionIdRef.current;
        if (subscriptionId === null) return;

        const isFirstTime = !this.subscribers.has(subscriptionId);
        if (!isFirstTime) return;

        // create a new subscriber just once
        this.addNewSubscriber(subscriptionId, {
          stateWrapper,
          selector,
          config,
          callback: setState,
        });

        this.executeOnSubscribed();
      }, [stateWrapper]);

      type State_ = State extends never | undefined | null ? TState : State;

      type Setter = keyof TStateMutator extends never
        ? StateSetter<TState>
        : ActionCollectionResult<TState, TMetadata, TStateMutator>;

      return [
        (() => {
          const subscriptionId = subscriptionIdRef.current;

          // if there is no selector we just return the state
          if (!selector || !this.subscribers.has(subscriptionId)) return stateWrapper.state;

          const subscription = this.subscribers.get(subscriptionId);
          const { currentDependencies, config: { dependencies: newDependencies } = {} } = subscription;

          // we don't need to compute the state if it is the first time the component is mounted
          if ((currentDependencies as unknown) === uniqueSymbol) return stateWrapper.state;

          // if the dependencies are the same we don't need to compute the state
          if (currentDependencies === newDependencies) return stateWrapper.state;

          const isLengthEqual = currentDependencies?.length === newDependencies?.length;
          const isSameValues = isLengthEqual && shallowCompare(currentDependencies, newDependencies);

          // if values are the same we don't need to compute the state
          if (isSameValues) return stateWrapper.state;

          // if the dependencies are different we need to compute the state
          const newStateWrapper = computeStateWrapper();

          this.updateSubscriptionIfExists(subscriptionId, {
            stateWrapper: newStateWrapper,
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
      ] as [state: State_, setter: Setter, metadata: TMetadata];
    };

    /**
     * Extended properties and methods of the hook
     */
    hook.stateControls = this.stateControls;

    hook.createSelectorHook = this.createSelectorHook;

    return hook as unknown as StateHook<TState, TStateMutator, TMetadata>;
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

    const addNewSubscriber = (
      subscriptionId: string,
      args: {
        callback: SubscriptionCallback;
        selector: SelectorCallback<any, any>;
        config: UseHookConfig<any> | SubscribeCallbackConfig<any>;
        stateWrapper: { state: unknown };
      }
    ) => {
      subscribers.set(subscriptionId, {
        subscriptionId,
        currentState: args.stateWrapper.state,
        selector: args.selector,
        config: args.config,
        callback: args.callback,
        currentDependencies: uniqueSymbol as unknown,
      } as SubscriberParameters);

      Object.assign(args.callback, {
        __global_state_subscription_id__: subscriptionId,
      });
    };

    const updateSubscriptionIfExists = (
      subscriptionId: string,
      args: {
        callback: SubscriptionCallback;
        selector: SelectorCallback<any, any>;
        config: UseHookConfig<any> | SubscribeCallbackConfig<any>;
        stateWrapper: { state: unknown };
      }
    ): void => {
      if (!subscribers.has(subscriptionId)) return;

      const subscriber = subscribers.get(subscriptionId);

      subscriber.currentState = args.stateWrapper.state;
      subscriber.currentDependencies = subscriber.config?.dependencies;

      subscriber.selector = args.selector;
      subscriber.config = args.config;
      subscriber.callback = args.callback;
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
          selector,
          config,
          stateWrapper,
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

      const subscriptionIdRef = useRef<string>(null);

      const [stateWrapper, setState] = useState<{
        state: Derivate;
      }>(computeStateWrapper);

      useEffect(() => {
        if (subscriptionIdRef.current === null) {
          subscriptionIdRef.current = uniqueId();
        }

        const unsubscribe = stateRetriever<Subscribe>((subscribe) => {
          let previousRootDerivate = rootDerivate;

          subscribe(
            (newRootDerivate) => {
              const subscription = subscribers.get(subscriptionIdRef.current);
              const isRootDerivateEqual = (isEqualRoot ?? Object.is)(previousRootDerivate, newRootDerivate);

              if (isRootDerivateEqual) return;

              previousRootDerivate = newRootDerivate;

              const derivate = (selector ?? ((s) => s))(rootDerivate);

              const isDerivateEqual = (isEqual ?? Object.is)(derivate, subscription.currentState);

              if (isDerivateEqual) return;

              subscription.currentState = derivate;

              setState({
                state: derivate as unknown as Derivate,
              });
            },
            {
              // the hooks starts with the correct derivate state, there is no need to re-render the component
              skipFirst: true,
            }
          );
        });

        return () => {
          unsubscribe();
          subscribers.delete(subscriptionIdRef.current);
        };
      }, []);

      // ensure the subscription id is always updated with the last callbacks and configurations
      updateSubscriptionIfExists(subscriptionIdRef.current, {
        stateWrapper,
        selector,
        config,
        callback: setState as SubscriptionCallback,
      });

      useEffect(() => {
        const subscriptionId = subscriptionIdRef.current;
        if (subscriptionId === null) return;

        const isFirstTime = !subscribers.has(subscriptionId);
        if (!isFirstTime) return;

        // create a new subscriber just once
        addNewSubscriber(subscriptionId, {
          stateWrapper,
          selector,
          config,
          callback: setState as SubscriptionCallback,
        });
      }, [stateWrapper]);

      return [
        (() => {
          const subscriptionId = subscriptionIdRef.current;

          // if there is no selector we just return the state
          if (!selector || !subscribers.has(subscriptionId)) return stateWrapper.state;

          const subscription = subscribers.get(subscriptionId);
          const { currentDependencies, config: { dependencies: newDependencies } = {} } = subscription;

          // we don't need to compute the state if it is the first time the component is mounted
          if ((currentDependencies as unknown) === uniqueSymbol) return stateWrapper.state;

          // if the dependencies are the same we don't need to compute the state
          if (currentDependencies === newDependencies) return stateWrapper.state;

          const isLengthEqual = currentDependencies?.length === newDependencies?.length;
          const isSameValues = isLengthEqual && shallowCompare(currentDependencies, newDependencies);

          // if values are the same we don't need to compute the state
          if (isSameValues) return stateWrapper.state;

          // if the dependencies are different we need to compute the state
          const newStateWrapper = computeStateWrapper();

          updateSubscriptionIfExists(subscriptionId, {
            stateWrapper: newStateWrapper,
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
      _parent: useHook,
      _subscribers: subscribers,
    });

    return newHook;
  };

  /**
   * Returns an array with the a function to get the state, the state setter or the actions map, and a function to get the metadata
   * @returns {[() => TState, TStateMutator, () => TMetadata]} - The state getter, the state setter or the actions map, the metadata getter
   * */
  public stateControls = () => {
    const stateOrchestrator = this.getStateOrchestrator();

    const { getMetadata, getState } = this;

    return [getState, stateOrchestrator, getMetadata] as [
      StateGetter<TState>,
      typeof stateOrchestrator,
      MetadataGetter<TMetadata>
    ];
  };

  /**
   * @deprecated use the stateControls method instead
   */
  public getHookDecoupled = () => {
    return this.stateControls() as [
      StateGetter<TState>,
      ReturnType<typeof this.getStateOrchestrator>,
      MetadataGetter<TMetadata>
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
    })() as keyof TStateMutator extends never
      ? StateSetter<TState>
      : ActionCollectionResult<TState, TMetadata, TStateMutator>;
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
  protected setStateWrapper: StateSetter<TState> = (setter, { forceUpdate, identifier } = {}) => {
    const isSetterFunction = typeof setter === 'function';
    const previousState = this.stateWrapper.state;

    const newState = isSetterFunction ? (setter as (state: TState) => TState)(previousState) : setter;

    // if the state didn't change, we don't need to do anything
    if (!forceUpdate && Object.is(this.stateWrapper.state, newState)) return;

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
    } as StateChangesParam<TState, TMetadata, TStateMutator>;

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
   * @returns {ActionCollectionResult<TState, TMetadata, TStateMutator>} - The actions map result of the configuration object passed to the constructor
   * */
  protected getStoreActionsMap = (): ActionCollectionResult<TState, TMetadata, TStateMutator> => {
    if (!this.actionsConfig) return null;

    const { actionsConfig, setMetadata, setStateWrapper, getState, getMetadata } = this;

    const actionsKeys = Object.keys(actionsConfig);

    // we bind the functions to the actions object to allow reusing actions in the same api config by using the -this- keyword
    const actions: ActionCollectionResult<TState, TMetadata, TStateMutator> = actionsKeys.reduce(
      (accumulator, action_key) => {
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
              actions: actions as ActionCollectionResult<TState, TMetadata>,
            });

            // we return the result of the actions to the invoker
            return result;
          },
        });

        return accumulator;
      },
      {} as ActionCollectionResult<TState, TMetadata, TStateMutator>
    );

    return actions;
  };
}
