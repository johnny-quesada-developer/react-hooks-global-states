import type {
  ActionCollectionConfig,
  StoreTools,
  BaseMetadata,
  StateChanges,
  ActionCollectionResult,
} from './types';
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
  ActionsConfig extends ActionCollectionConfig<State, Metadata> | undefined | unknown,
  PublicStateMutator = keyof ActionsConfig extends never | undefined
    ? React.Dispatch<React.SetStateAction<State>>
    : ActionCollectionResult<State, Metadata, NonNullable<ActionsConfig>>,
> extends GlobalStore<State, Metadata, ActionsConfig, PublicStateMutator> {
  protected onInit = (args: StoreTools<State, PublicStateMutator, Metadata>) => {
    this.onInitialize(args);
  };

  protected onStateChanged = (
    args: StoreTools<State, PublicStateMutator, Metadata> & StateChanges<State>,
  ) => {
    this.onChange(args);
  };

  protected abstract onInitialize: (args: StoreTools<State, PublicStateMutator, Metadata>) => void;

  protected abstract onChange: (
    args: StoreTools<State, PublicStateMutator, Metadata> & StateChanges<State>,
  ) => void;
}

export default GlobalStoreAbstract;
