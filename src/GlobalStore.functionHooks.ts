import {
  ActionCollectionConfig,
  StateConfigCallbackParam,
  StateChangesParam,
  StateSetter,
  ActionCollectionResult,
  UseHookConfig,
  AvoidNever,
  UnsubscribeCallback,
  StateHook,
  StateGetter,
  SubscribeCallback,
  Subscribe,
  createStateConfig,
  CustomGlobalHookBuilderParams,
  CustomGlobalHookParams,
  SelectorCallback,
  SubscribeCallbackConfig,
  SubscribeToEmitter,
  SubscriptionCallback,
  SubscriberParameters,
} from './GlobalStore.types';

import { GlobalStore, throwNoSubscribersWereAdded, uniqueSymbol } from './GlobalStore';
import { useEffect, useRef, useState } from 'react';
import { shallowCompare, uniqueId } from './GlobalStore.utils';

/**
 * Creates a global state with the given state and config.
 * @returns {} [HOOK, DECOUPLED_RETRIEVER, DECOUPLED_MUTATOR] this is an array with the hook, the decoupled getState function and the decoupled setter of the state
 */
export const createGlobalStateWithDecoupledFuncs = <
  TState,
  TMetadata = null,
  TActions extends ActionCollectionConfig<TState, TMetadata> | null = null
>(
  state: TState,
  { actions, ...config }: createStateConfig<TState, TMetadata, TActions> = {}
) => {
  const store = new GlobalStore<TState, TMetadata, TActions>(state, config, actions);

  const hook = store.getHook();
  const [getState, setter] = hook.stateControls();

  type Setter = keyof TActions extends never
    ? StateSetter<TState>
    : ActionCollectionResult<TState, TMetadata, TActions>;

  return [hook, getState, setter] as unknown as [
    hook: StateHook<TState, Setter, TMetadata>,
    stateRetriever: StateGetter<TState>,
    stateMutator: Setter
  ];
};

/**
 * Creates a global hook that can be used to access the state and actions across the application
 * @returns {} - () => [TState, Setter, TMetadata] the hook that can be used to access the state and the setter of the state
 */
export const createGlobalState = <
  TState,
  TMetadata = null,
  TActions extends ActionCollectionConfig<TState, TMetadata> | null = null
>(
  state: TState,
  { actions, ...config }: createStateConfig<TState, TMetadata, TActions> = {}
) => {
  const hook = new GlobalStore<TState, TMetadata, TActions>(state, config, actions).getHook();

  type Setter = keyof TActions extends never
    ? StateSetter<TState>
    : ActionCollectionResult<TState, TMetadata, TActions>;

  return hook as unknown as StateHook<TState, Setter, TMetadata>;
};

/**
 * @description
 * Use this function to create a custom global store.
 * You can use this function to create a store with async storage.
 */
export const createCustomGlobalStateWithDecoupledFuncs = <TInheritMetadata = null, TCustomConfig = null>({
  onInitialize,
  onChange,
}: CustomGlobalHookBuilderParams<TInheritMetadata, TCustomConfig>) => {
  /**
   * @description
   * Use this function to create a custom global store.
   * You can use this function to create a store with async storage or any other custom logic.
   * @param state The initial state of the store.
   * @param config The configuration of the store.
   * @returns [HOOK, DECOUPLED_RETRIEVER, DECOUPLED_MUTATOR] - this is an array with the hook, the decoupled getState function and the decoupled setter of the state
   */
  return <
    TState,
    TMetadata = null,
    TActions extends ActionCollectionConfig<
      TState,
      AvoidNever<TInheritMetadata> & AvoidNever<TMetadata>
    > | null = null
  >(
    state: TState,
    {
      config: customConfig,
      onInit,
      onStateChanged,
      ...parameters
    }: CustomGlobalHookParams<
      TCustomConfig,
      TState,
      AvoidNever<TInheritMetadata> & AvoidNever<TMetadata>,
      TActions
    > = {
      config: null,
    }
  ) => {
    const onInitWrapper = ((callBackParameters) => {
      onInitialize(callBackParameters as StateConfigCallbackParam<unknown, TInheritMetadata>, customConfig);

      onInit?.(callBackParameters);
    }) as typeof onInit;

    const onStateChangeWrapper = ((callBackParameters) => {
      onChange(callBackParameters as StateChangesParam<unknown, TInheritMetadata>, customConfig);

      onStateChanged?.(callBackParameters);
    }) as typeof onStateChanged;

    return createGlobalStateWithDecoupledFuncs<TState, typeof parameters.metadata, TActions>(state, {
      onInit: onInitWrapper,
      onStateChanged: onStateChangeWrapper,
      ...parameters,
    });
  };
};

/**
 * @description
 * Use this function to create a custom global hook which contains a fragment of the state of another hook
 */
export const createDerivate = <
  RootState,
  StateMutator,
  Metadata,
  RootSelectorResult,
  RootDerivate = RootSelectorResult extends never ? RootState : RootSelectorResult
>(
  useHook: StateHook<RootState, StateMutator, Metadata>,
  mainSelector?: (state: RootState) => RootSelectorResult,
  {
    isEqualRoot: mainIsEqualRoot,
    isEqual: mainIsEqualFun,
  }: Omit<UseHookConfig<RootDerivate, RootState>, 'dependencies'> = {}
) => {
  const subscribers: Map<string, SubscriberParameters> = new Map();

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

    let stateWrapper = {
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
      changesSubscribers.forEach((subscriber) => {
        subscribers.delete(subscriber);
      });
    };
  }) as StateGetter<RootDerivate>;

  const newHook = (<SelectorResult, Derivate = SelectorResult extends never ? RootDerivate : SelectorResult>(
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

  return newHook;
};

/**
 * @description
 * This function allows you to create a derivate emitter
 * With this approach, you can subscribe to changes in a specific fragment or subset of the state.
 */
export const createDerivateEmitter = <
  TDerivate,
  TStateRetriever extends StateGetter<unknown>,
  TState = Exclude<ReturnType<TStateRetriever>, UnsubscribeCallback>
>(
  getter: TStateRetriever,
  selector: SelectorCallback<TState, TDerivate>
): SubscribeToEmitter<TDerivate> => {
  type Infected = {
    _father_emitter?: {
      getter: StateGetter<unknown>;
      selector: SelectorCallback<TState, TDerivate>;
    };
  };

  const father_emitter = (getter as Infected)._father_emitter;

  if (father_emitter) {
    // if a subscriber is already a derivate emitter, then we need to merge the selectors
    const selectorWrapper = (state: TState): TDerivate => {
      const fatherFragment = father_emitter.selector(state);

      return selector(fatherFragment as unknown as TState);
    };

    const subscriber = createDerivateEmitter<TDerivate, TStateRetriever, TState>(
      father_emitter.getter as TStateRetriever,
      selectorWrapper
    );

    (subscriber as Infected)._father_emitter = {
      getter: father_emitter.getter,
      selector: selectorWrapper,
    };

    return subscriber;
  }

  const subscriber = <State = TDerivate>(
    param1: SubscribeCallback<State> | SelectorCallback<TDerivate, State>,
    param2?: SubscribeCallback<State> | SubscribeCallbackConfig<State>,
    param3: SubscribeCallbackConfig<State> = {}
  ) => {
    const hasExplicitSelector = typeof param2 === 'function';

    const $selector = (hasExplicitSelector ? param1 : null) as SelectorCallback<unknown, unknown>;

    const callback = (hasExplicitSelector ? param2 : param1) as SubscribeCallback<unknown>;

    const config = (hasExplicitSelector ? param3 : param2) as SubscribeCallbackConfig<unknown>;

    return (getter as StateGetter<unknown>)<Subscribe>((subscribe) => {
      subscribe(
        (state) => {
          const fatherFragment = selector(state as TState);

          return $selector?.(fatherFragment) ?? fatherFragment;
        },
        callback,
        config
      );
    });
  };

  (subscriber as Infected)._father_emitter = {
    getter,
    selector,
  };

  return subscriber as SubscribeToEmitter<TDerivate>;
};
