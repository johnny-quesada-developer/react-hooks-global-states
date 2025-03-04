import type {
  ActionCollectionConfig,
  StateSetter,
  ActionCollectionResult,
  StateHook,
  BaseMetadata,
  GlobalStoreCallbacks,
} from './types';

import { GlobalStore } from './GlobalStore';

export interface CreateGlobalState {
  <State>(state: State): StateHook<State, StateSetter<State>, BaseMetadata>;

  <
    State,
    Metadata extends BaseMetadata | unknown,
    ActionsConfig extends ActionCollectionConfig<State, Metadata> | null | {},
    PublicStateMutator = keyof ActionsConfig extends never | undefined
      ? StateSetter<State>
      : ActionCollectionResult<State, Metadata, NonNullable<ActionsConfig>>
  >(
    state: State,
    args: {
      name?: string;
      metadata?: Metadata;
      callbacks?: GlobalStoreCallbacks<State, Metadata>;
      actions?: ActionsConfig;
    }
  ): StateHook<State, PublicStateMutator, Metadata>;

  <
    State,
    Metadata extends BaseMetadata | unknown,
    ActionsConfig extends ActionCollectionConfig<State, Metadata>
  >(
    state: State,
    args: {
      name?: string;
      metadata?: Metadata;
      callbacks?: GlobalStoreCallbacks<State, Metadata>;
      actions: ActionsConfig;
    }
  ): StateHook<State, ActionCollectionResult<State, Metadata, ActionsConfig>, Metadata>;
}

export const createGlobalState = ((
  state: unknown,
  args: {
    name?: string;
    metadata?: unknown;
    callbacks?: GlobalStoreCallbacks<unknown, unknown>;
    actions?: ActionCollectionConfig<unknown, unknown>;
  }
) => new GlobalStore(state, args).getHook()) as CreateGlobalState;

export default createGlobalState;
