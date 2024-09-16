import {
  StateSetter,
  StateConfigCallbackParam,
  ActionCollectionConfig,
  GlobalStoreConfig,
  ActionCollectionResult,
  MetadataSetter,
  StateGetter,
  StoreTools,
  StateChanges,
} from './GlobalStore.types';

import { GlobalStore } from './GlobalStore';

/**
 * @description
 * Use this class to extends the capabilities of the GlobalStore.
 * by implementing the abstract methods onInitialize and onChange.
 * You can use this class to create a store with async storage.
 */
export abstract class GlobalStoreAbstract<
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
> extends GlobalStore<
  State,
  Metadata,
  ActionsConfig,
  FullActionsConfig,
  Actions,
  PublicStateMutator,
  StoreAPI
> {
  constructor(
    state: State,
    config: GlobalStoreConfig<State, Metadata, StoreAPI> = {},
    actionsConfig: ActionsConfig | null = null
  ) {
    super(state, config, actionsConfig);
  }

  protected onInit = (storeAPI: StateConfigCallbackParam<State, Metadata, Actions>) => {
    this.onInitialize(storeAPI);
  };

  protected onStateChanged = (storeAPI: StoreAPI & StateChanges<State>) => {
    this.onChange(storeAPI);
  };

  protected abstract onInitialize: ({
    setState,
    setMetadata,
    getMetadata,
    getState,
    actions,
  }: StateConfigCallbackParam<State, Metadata, Actions>) => void;

  protected abstract onChange: ({
    setState,
    setMetadata,
    getMetadata,
    getState,
    actions,
  }: StoreAPI & StateChanges<State>) => void;
}
