export type {
  StateApi,
  ObservableFragment,
  MetadataSetter,
  StateChanges,
  StoreTools,
  ActionCollectionResult,
  GlobalStoreCallbacks,
  UseHookOptions,
  UnsubscribeCallback,
  SubscribeCallbackConfig,
  SubscribeCallback,
  BaseMetadata,
  MetadataGetter,
  SelectorCallback,
  SubscriberParameters,
  SubscriptionCallback,
  StateHook,
  ActionCollectionConfig,
} from './types';

// classes
export { GlobalStore } from './GlobalStore';

// functions
export { createGlobalState, type InferActionsType, type InferStateApi } from './createGlobalState';

// utils
export { shallowCompare } from './shallowCompare';
export { uniqueId, type BrandedId } from './uniqueId';
export { throwWrongKeyOnActionCollectionConfig } from './throwWrongKeyOnActionCollectionConfig';
export { isRecord } from './isRecord';

// context
export { type ContextProvider, type ContextHook, type InferContextApi, createContext } from './createContext';
