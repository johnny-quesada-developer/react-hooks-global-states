import { createGlobalState } from 'GlobalStore.functionHooks';
import {
  ActionCollectionConfig,
  StateHook,
  StateSetter,
  ActionCollectionResult,
  StateGetter,
  StoreTools,
  MetadataSetter,
  GlobalStoreConfig,
} from './GlobalStore.types';
import { clone, isDate, isPrimitive } from 'json-storage-formatter';
import React, { PropsWithChildren } from 'react';

export const createStatefulContext = <
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
>(
  initialValue: State,
  _config?: Readonly<{
    /**
     * @param {StateConfigCallbackParam<State, Metadata> => void} metadata - the initial value of the metadata
     * */
    metadata?: Metadata;

    /**
     * actions configuration for restricting the manipulation of the state
     */
    actions?: ActionsConfig;

    /**
     * @param {StateConfigCallbackParam<State, Metadata> => void} onInit - callback function called when the store is initialized
     * @returns {void} result - void
     * */
    onInit?: (storeAPI: StoreAPI) => void;

    /**
     * @param {StateChangesParam<TState, TMetadata> => void} onStateChanged - callback function called every time the state is changed
     * @returns {void} result - void
     */
    onStateChanged?: (storeAPI: StoreAPI) => void;

    /**
     * @param {StateConfigCallbackParam<TState, TMetadata> => void} onSubscribed - callback function called every time a component is subscribed to the store
     * @returns {void} result - void
     */
    onSubscribed?: (storeAPI: StoreAPI) => void;

    /**
     * @param {StateChangesParam<TState, TMetadata> => boolean} computePreventStateChange - callback function called every time the state is about to change and it allows you to prevent the state change
     * @returns {boolean} result - true if you want to prevent the state change, false otherwise
     */
    computePreventStateChange?: (storeAPI: StoreAPI) => boolean;
  }>
) => {
  type ContextHook = [
    hook: StateHook<State, PublicStateMutator, Metadata>,
    stateRetriever: StateGetter<State>,
    stateMutator: PublicStateMutator
  ];

  const context = React.createContext<ContextHook>(null);

  const useHook = () => {
    return React.useContext(context);
  };

  const Provider: React.FC<
    PropsWithChildren<{
      initialValue?: Partial<State>;
    }>
  > = ({ children, ...props }) => {
    const hook = createGlobalState<State, Metadata, Actions>(
      (() => {
        if (props.initialValue) {
          const isFunction = typeof props.initialValue === 'function';

          if (isFunction)
            return (props.initialValue as unknown as (state: State) => State)(clone(initialValue));

          const isArray = Array.isArray(props.initialValue);
          const isMap = props.initialValue instanceof Map;
          const isSet = props.initialValue instanceof Set;

          const isMergeAble =
            !isPrimitive(props.initialValue) && !isDate(props.initialValue) && !isArray && !isMap && !isSet;

          return (isMergeAble ? { ...initialValue, ...props.initialValue } : props.initialValue) as State;
        }

        // return a copy of the initial value to avoid reference issues
        // this initial value will be reused in all the instances of the hook
        return clone(initialValue);
      })(),
      _config as any
    );

    return React.createElement(context.Provider, { value: hook as unknown as ContextHook }, children);
  };

  return [useHook, Provider] as const;
};
