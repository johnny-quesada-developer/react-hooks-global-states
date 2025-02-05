import {
  ActionCollectionConfig,
  StateSetter,
  ActionCollectionResult,
  StateHook,
  CustomGlobalHookBuilderParams,
  StateChanges,
  BaseMetadata,
  StoreTools,
  GlobalStoreCallbacks,
} from './GlobalStore.types';

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
) => new GlobalStore(state, args).getHook()) as unknown as CreateGlobalState;

export interface CustomCreateGlobalState<
  TCustomConfig extends BaseMetadata | unknown,
  InheritMetadata extends BaseMetadata | unknown = BaseMetadata
> {
  <State>(state: State): StateHook<State, StateSetter<State>, BaseMetadata>;

  <State, Metadata extends BaseMetadata | unknown>(
    state: State,
    args: {
      name?: string;
      metadata?: Metadata;
      callbacks?: GlobalStoreCallbacks<State, Metadata>;
      config?: TCustomConfig;
    }
  ): StateHook<State, StateSetter<State>, BaseMetadata>;

  <
    State,
    Metadata extends BaseMetadata | unknown,
    ActionsConfig extends Readonly<ActionCollectionConfig<State, InheritMetadata & Metadata>>
  >(
    state: State,
    args: {
      name?: string;
      metadata?: Metadata;
      callbacks?: GlobalStoreCallbacks<State, Metadata>;
      actions?: ActionsConfig;
      config?: TCustomConfig;
    }
  ): StateHook<State, ActionCollectionResult<State, InheritMetadata & Metadata, ActionsConfig>, Metadata>;
}

/**
 * @description Simple custom global state hook builder
 */
export const createCustomGlobalState = <
  TCustomConfig extends BaseMetadata | unknown,
  InheritMetadata extends BaseMetadata | unknown = BaseMetadata
>({
  onInitialize,
  onChange,
}: CustomGlobalHookBuilderParams<TCustomConfig, InheritMetadata>) => {
  return (<
    State,
    Metadata extends InheritMetadata | unknown,
    ActionsConfig extends Readonly<ActionCollectionConfig<State, InheritMetadata & Metadata>>
  >(
    state: State,
    args?: {
      name?: string;
      metadata?: Metadata;
      callbacks?: GlobalStoreCallbacks<State, InheritMetadata & Metadata>;
      actions?: ActionCollectionConfig<State, InheritMetadata & Metadata>;
      config: TCustomConfig;
    }
  ) => {
    return createGlobalState<State, InheritMetadata & Metadata, ActionsConfig>(state, {
      callbacks: {
        ...args?.callbacks,
        onInit: (callBackParameters) => {
          onInitialize?.(callBackParameters as StoreTools<unknown, InheritMetadata>, args?.config);
          args?.callbacks?.onInit?.(callBackParameters);
        },
        onStateChanged: (callBackParameters) => {
          onChange?.(
            callBackParameters as StoreTools<unknown, InheritMetadata> & StateChanges<State>,
            args?.config
          );
          args?.callbacks?.onStateChanged?.(callBackParameters);
        },
      },
    });
  }) as CustomCreateGlobalState<TCustomConfig, InheritMetadata>;
};
