import { ActionCollectionConfig, StateSetter, GlobalStoreConfig, ActionCollectionResult, StateConfigCallbackParam, MetadataSetter, UseHookConfig, StateGetter, SubscribeCallbackConfig, SubscribeCallback, SelectorCallback, SubscriberParameters, SubscriptionCallback, MetadataGetter } from "./GlobalStore.types";
export declare const throwNoSubscribersWereAdded: () => never;
/**
 * The GlobalStore class is the main class of the library and it is used to create a GlobalStore instances
 * @template {TState} TState - The type of the state object
 * @template {TMetadata} TMetadata - The type of the metadata object (optional) (default: null) no reactive information set to share with the subscribers
 * @template {TStateSetter} TStateSetter - The type of the actionsConfig object (optional) (default: null) if a configuration is passed, the hook will return an object with the actions then all the store manipulation will be done through the actions
 * */
export declare class GlobalStore<TState, TMetadata = null, TStateSetter extends ActionCollectionConfig<TState, TMetadata> | StateSetter<TState> = StateSetter<TState>> {
    protected actionsConfig: TStateSetter | null;
    /**
     * list of all the subscribers setState functions
     * @template {TState} TState - The type of the state object
     * */
    subscribers: Map<string, SubscriberParameters>;
    /**
     * Actions of the store
     */
    actions?: ActionCollectionResult<TState, TMetadata, TStateSetter>;
    /**
     * additional configuration for the store
     * @template {TState} TState - The type of the state object
     * @template {TMetadata} TMetadata - The type of the metadata object (optional) (default: null) no reactive information set to share with the subscribers
     * @template {TStateSetter} TStateSetter - The type of the actionsConfig object (optional) (default: null) if a configuration is passed, the hook will return an object with the actions then all the store manipulation will be done through the actions
     * @property {GlobalStoreConfig<TState, TMetadata, TStateSetter>} config.metadata - The metadata to pass to the callbacks (optional) (default: null)
     * @property {GlobalStoreConfig<TState, TMetadata, TStateSetter>} config.onInit - The callback to execute when the store is initialized (optional) (default: null)
     * @property {GlobalStoreConfig<TState, TMetadata, TStateSetter>} config.onStateChanged - The callback to execute when the state is changed (optional) (default: null)
     * @property {GlobalStoreConfig<TState, TMetadata, TStateSetter>} config.onSubscribed - The callback to execute when a component is subscribed to the store (optional) (default: null)
     * @property {GlobalStoreConfig<TState, TMetadata, TStateSetter>} config.computePreventStateChange - The callback to execute when the state is changed to compute if the state change should be prevented (optional) (default: null)
     */
    protected config: GlobalStoreConfig<TState, TMetadata, TStateSetter>;
    /**
     * execute once the store is created
     * @template {TState} TState - The type of the state object
     * @template {TMetadata} TMetadata - The type of the metadata object (optional) (default: null) no reactive information set to share with the subscribers
     * @template {TStateSetter} TStateSetter - The type of the actionsConfig object (optional) (default: null) if a configuration is passed, the hook will return an object with the actions then all the store manipulation will be done through the actions
     * @param {StateConfigCallbackParam<TState, TMetadata, TStateSetter>} parameters - The parameters object brings the following properties: setState, getState, setMetadata, getMetadata
     * @param {Dispatch<SetStateAction<TState>>} parameters.setState - The setState function to update the state
     * @param {() => TState} parameters.getState - The getState function to get the state
     * @param {Dispatch<SetStateAction<TMetadata>>} parameters.setMetadata - The setMetadata function to update the metadata
     * @param {() => TMetadata} parameters.getMetadata - The getMetadata function to get the metadata
     * */
    protected onInit?: GlobalStoreConfig<TState, TMetadata, TStateSetter>["onInit"];
    /**
     * execute every time the state is changed
     * @template {TState} TState - The type of the state object
     * @template {TMetadata} TMetadata - The type of the metadata object (optional) (default: null) no reactive information set to share with the subscribers
     * @template {TStateSetter} TStateSetter - The type of the actionsConfig object (optional) (default: null) if a configuration is passed, the hook will return an object with the actions then all the store manipulation will be done through the actions
     * @param {StateConfigCallbackParam<TState, TMetadata, TStateSetter>} parameters - The parameters object brings the following properties: setState, getState, setMetadata, getMetadata
     * @param {Dispatch<SetStateAction<TState>>} parameters.setState - The setState function to update the state
     * @param {() => TState} parameters.getState - The getState function to get the state
     * @param {Dispatch<SetStateAction<TMetadata>>} parameters.setMetadata - The setMetadata function to update the metadata
     * @param {() => TMetadata} parameters.getMetadata - The getMetadata function to get the metadata
     * */
    protected onStateChanged?: GlobalStoreConfig<TState, TMetadata, TStateSetter>["onStateChanged"];
    /**
     * Execute each time a new component gets subscribed to the store
     * @template {TState} TState - The type of the state object
     * @template {TMetadata} TMetadata - The type of the metadata object (optional) (default: null) no reactive information set to share with the subscribers
     * @template {TStateSetter} TStateSetter - The type of the actionsConfig object (optional) (default: null) if a configuration is passed, the hook will return an object with the actions then all the store manipulation will be done through the actions
     * @param {StateConfigCallbackParam<TState, TMetadata, TStateSetter>} parameters - The parameters object brings the following properties: setState, getState, setMetadata, getMetadata
     * @param {Dispatch<SetStateAction<TState>>} parameters.setState - The setState function to update the state
     * @param {() => TState} parameters.getState - The getState function to get the state
     * @param {Dispatch<SetStateAction<TMetadata>>} parameters.setMetadata - The setMetadata function to update the metadata
     * @param {() => TMetadata} parameters.getMetadata - The getMetadata function to get the metadata
     * */
    protected onSubscribed?: GlobalStoreConfig<TState, TMetadata, TStateSetter>["onSubscribed"];
    /**
     * Execute every time a state change is triggered and before the state is updated, it allows to prevent the state change by returning true
     * @template {TState} TState - The type of the state object
     * @template {TMetadata} TMetadata - The type of the metadata object (optional) (default: null) no reactive information set to share with the subscribers
     * @template {TStateSetter} TStateSetter - The type of the actionsConfig object (optional) (default: null) if a configuration is passed, the hook will return an object with the actions then all the store manipulation will be done through the actions
     * @param {StateConfigCallbackParam<TState, TMetadata, TStateSetter>} parameters - The parameters object brings the following properties: setState, getState, setMetadata, getMetadata
     * @param {Dispatch<SetStateAction<TState>>} parameters.setState - The setState function to update the state
     * @param {() => TState} parameters.getState - The getState function to get the state
     * @param {Dispatch<SetStateAction<TMetadata>>} parameters.setMetadata - The setMetadata function to update the metadata
     * @param {() => TMetadata} parameters.getMetadata - The getMetadata function to get the metadata
     * @returns {boolean} - true to prevent the state change, false to allow the state change
     * */
    protected computePreventStateChange?: GlobalStoreConfig<TState, TMetadata, TStateSetter>["computePreventStateChange"];
    /**
     * We use a wrapper in order to be able to force the state update when necessary even with primitive types
     */
    protected stateWrapper: {
        state: TState;
    };
    /**
     * @deprecated direct modifications of the state could end up in unexpected behaviors
     */
    protected get state(): TState;
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
     * @param {TStateSetter} actionsConfig - The actions configuration object (optional) (default: null) if not null the store manipulation will be done through the actions
     * */
    constructor(state: TState, config: GlobalStoreConfig<TState, TMetadata, TStateSetter>);
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
     * @param {TStateSetter} actionsConfig - The actions configuration object (optional) (default: null) if not null the store manipulation will be done through the actions
     * */
    constructor(state: TState, config: GlobalStoreConfig<TState, TMetadata, TStateSetter>, actionsConfig: TStateSetter);
    protected initialize: () => Promise<void>;
    /**
     * set the state and update all the subscribers
     * @param {StateSetter<TState>} setter - The setter function or the value to set
     * */
    protected setState: ({ state, forceUpdate, }: {
        state: TState;
        forceUpdate: boolean;
    }) => void;
    /**
     * Set the value of the metadata property, this is no reactive and will not trigger a re-render
     * @param {MetadataSetter<TMetadata>} setter - The setter function or the value to set
     * */
    protected setMetadata: MetadataSetter<TMetadata>;
    protected getMetadata: () => TMetadata;
    protected createChangesSubscriber: ({ callback, selector, config, }: {
        selector?: SelectorCallback<unknown, unknown>;
        callback: SubscribeCallback<unknown>;
        config: SubscribeCallbackConfig<unknown>;
    }) => {
        stateWrapper: {
            state: unknown;
        };
        subscriptionCallback: SubscriptionCallback;
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
    protected getState: StateGetter<TState>;
    /**
     * get the parameters object to pass to the callback functions (onInit, onStateChanged, onSubscribed, computePreventStateChange)
     * this parameters object brings the following properties: setState, getState, setMetadata, getMetadata
     * this parameter object allows to update the state, get the state, update the metadata, get the metadata
     * @returns {StateConfigCallbackParam<TState, TMetadata>} - The parameters object
     * */
    protected getConfigCallbackParam: () => StateConfigCallbackParam<TState, TMetadata, TStateSetter>;
    protected updateSubscription: ({ subscriptionId, callback, selector, config, stateWrapper: { state }, }: Omit<SubscriberParameters, "currentState"> & {
        stateWrapper: {
            state: unknown;
        };
    }) => SubscriberParameters;
    protected executeOnSubscribed: () => void;
    /**
     * Returns a custom hook that allows to handle a global state
     * @returns {[TState, TStateSetter, TMetadata]} - The state, the state setter or the actions map, the metadata
     * */
    getHook: () => <State = TState>(selector?: SelectorCallback<TState, State>, config?: UseHookConfig<State>) => [state: State extends null ? TState : State, setter: keyof TStateSetter extends never ? StateSetter<TState> : ActionCollectionResult<TState, TMetadata, TStateSetter>, metadata: TMetadata];
    /**
     * Returns an array with the a function to get the state, the state setter or the actions map, and a function to get the metadata
     * @returns {[() => TState, TStateSetter, () => TMetadata]} - The state getter, the state setter or the actions map, the metadata getter
     * */
    getHookDecoupled: () => [StateGetter<TState>, keyof TStateSetter extends never ? StateSetter<TState> : ActionCollectionResult<TState, TMetadata, TStateSetter>, MetadataGetter<TMetadata>];
    /**
     * Returns the state setter or the actions map
     * @returns {TStateSetter} - The state setter or the actions map
     * */
    protected getStateOrchestrator: () => keyof TStateSetter extends never ? StateSetter<TState> : ActionCollectionResult<TState, TMetadata, TStateSetter>;
    /**
     * Calculate whenever or not we should compute the callback parameters on the state change
     * @returns {boolean} - True if we should compute the callback parameters on the state change
     * */
    protected hasStateCallbacks: () => boolean;
    /**
     * This is responsible for defining whenever or not the state change should be allowed or prevented
     * the function also execute the functions:
     * - onStateChanged (if defined) - this function is executed after the state change
     * - computePreventStateChange (if defined) - this function is executed before the state change and it should return a boolean value that will be used to determine if the state change should be prevented or not
     */
    protected setStateWrapper: StateSetter<TState>;
    /**
     * This creates a map of actions that can be used to modify or interact with the state
     * @returns {ActionCollectionResult<TState, TMetadata, TStateSetter>} - The actions map result of the configuration object passed to the constructor
     * */
    protected getStoreActionsMap: () => ActionCollectionResult<TState, TMetadata, TStateSetter>;
}
