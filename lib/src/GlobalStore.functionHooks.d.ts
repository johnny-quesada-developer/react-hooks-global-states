import { ActionCollectionConfig, StateSetter, ActionCollectionResult, UseHookConfig, AvoidNever, UnsubscribeCallback, StateHook, StateGetter, createStateConfig, CustomGlobalHookBuilderParams, CustomGlobalHookParams, SelectorCallback, SubscribeToEmitter } from "./GlobalStore.types";
/**
 * Creates a global state with the given state and config.
 * @returns {} [HOOK, DECOUPLED_GETTER, DECOUPLED_SETTER] this is an array with the hook, the decoupled getState function and the decoupled setter of the state
 */
export declare const createGlobalStateWithDecoupledFuncs: <TState, TMetadata = null, TActions extends ActionCollectionConfig<TState, TMetadata> = null>(state: TState, { actions, ...config }?: createStateConfig<TState, TMetadata, TActions>) => [StateHook<TState, keyof TActions extends never ? StateSetter<TState> : ActionCollectionResult<TState, TMetadata, TActions>, TMetadata>, StateGetter<TState>, keyof TActions extends never ? StateSetter<TState> : ActionCollectionResult<TState, TMetadata, TActions>];
/**
 * Creates a global hook that can be used to access the state and actions across the application
 * @returns {} - () => [TState, Setter, TMetadata] the hook that can be used to access the state and the setter of the state
 */
export declare const createGlobalState: <TState, TMetadata = null, TActions extends ActionCollectionConfig<TState, TMetadata> = null>(state: TState, config?: createStateConfig<TState, TMetadata, TActions>) => StateHook<TState, keyof TActions extends never ? StateSetter<TState> : ActionCollectionResult<TState, TMetadata, TActions>, TMetadata>;
/**
 * @description
 * Use this function to create a custom global store.
 * You can use this function to create a store with async storage.
 */
export declare const createCustomGlobalStateWithDecoupledFuncs: <TInheritMetadata = null, TCustomConfig = null>({ onInitialize, onChange, }: CustomGlobalHookBuilderParams<TInheritMetadata, TCustomConfig>) => <TState, TMetadata = null, TActions extends ActionCollectionConfig<TState, AvoidNever<TInheritMetadata> & AvoidNever<TMetadata>> = null>(state: TState, { config: customConfig, onInit, onStateChanged, ...parameters }?: CustomGlobalHookParams<TCustomConfig, TState, AvoidNever<TInheritMetadata> & AvoidNever<TMetadata>, TActions>) => [StateHook<TState, keyof TActions extends never ? StateSetter<TState> : ActionCollectionResult<TState, AvoidNever<TInheritMetadata> & AvoidNever<TMetadata>, TActions>, AvoidNever<TInheritMetadata> & AvoidNever<TMetadata>>, StateGetter<TState>, keyof TActions extends never ? StateSetter<TState> : ActionCollectionResult<TState, AvoidNever<TInheritMetadata> & AvoidNever<TMetadata>, TActions>];
/**
 * @description
 * Use this function to create a custom global hook which contains a fragment of the state of another hook or a fragment
 */
export declare const createDerivate: <TState, TSetter, TMetadata, TDerivate>(useHook: StateHook<TState, TSetter, TMetadata>, selector_: SelectorCallback<TState, TDerivate>, config_?: UseHookConfig<TDerivate>) => <State = TDerivate>(selector?: SelectorCallback<TDerivate, State>, config?: UseHookConfig<State>) => [state: State, setter: TSetter, metadata: TMetadata];
/**
 * @description
 * This function allows you to create a derivate emitter
 * With this approach, you can subscribe to changes in a specific fragment or subset of the state.
 */
export declare const createDerivateEmitter: <TDerivate, TGetter extends StateGetter<unknown>, TState = Exclude<ReturnType<TGetter>, UnsubscribeCallback>>(getter: TGetter, selector: SelectorCallback<TState, TDerivate>) => SubscribeToEmitter<TDerivate>;
