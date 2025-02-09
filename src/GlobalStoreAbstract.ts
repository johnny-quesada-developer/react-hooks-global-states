import { ActionCollectionConfig, StoreTools, BaseMetadata, StateChanges } from './types';
import { GlobalStore } from './GlobalStore';

/**
 * @description
 * Use this class to extends the capabilities of the GlobalStore.
 * by implementing the abstract methods onInitialize and onChange.
 * You can use this class to create a store with async storage.
 */
export abstract class GlobalStoreAbstract<
  State,
  Metadata extends BaseMetadata | unknown,
  ActionsConfig extends ActionCollectionConfig<State, Metadata> | unknown
> extends GlobalStore<State, Metadata, ActionsConfig> {
  protected onInit = (args: StoreTools<State, Metadata>) => {
    this.onInitialize(args);
  };

  protected onStateChanged = (args: StoreTools<State, Metadata> & StateChanges<State>) => {
    this.onChange(args);
  };

  protected abstract onInitialize: (args: StoreTools<State, Metadata>) => void;

  protected abstract onChange: (args: StoreTools<State, Metadata> & StateChanges<State>) => void;
}
