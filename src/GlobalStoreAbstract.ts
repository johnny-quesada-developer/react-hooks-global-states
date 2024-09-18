import {
  ActionCollectionConfig,
  GlobalStoreConfig,
  StoreTools,
  BaseMetadata,
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
  Metadata extends BaseMetadata,
  ActionsConfig extends ActionCollectionConfig<State, Metadata> | null | {} = null
> extends GlobalStore<State, Metadata, ActionsConfig> {
  constructor(state: State, config: GlobalStoreConfig<State, Metadata>, actionsConfig: ActionsConfig) {
    super(state, config, actionsConfig);
  }

  protected onInit = (args: StoreTools<State, Metadata>) => {
    this.onInitialize(args);
  };

  protected onStateChanged = (args: StoreTools<State, Metadata> & StateChanges<State>) => {
    this.onChange(args);
  };

  protected abstract onInitialize: (args: StoreTools<State, Metadata>) => void;

  protected abstract onChange: (args: StoreTools<State, Metadata> & StateChanges<State>) => void;
}
