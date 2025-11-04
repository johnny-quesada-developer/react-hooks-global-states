export {
  StateApi,
  ObservableFragment,
  MetadataSetter,
  StateChanges,
  StoreTools,
  ActionCollectionResult,
  GlobalStoreCallbacks,
  UseHookConfig,
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
export { GlobalStoreAbstract } from './GlobalStoreAbstract';

// functions
export { createGlobalState, type InferActionsType } from './createGlobalState';

// utils
export { shallowCompare } from './shallowCompare';
export { uniqueId } from './uniqueId';
export { throwWrongKeyOnActionCollectionConfig } from './throwWrongKeyOnActionCollectionConfig';
export { isRecord } from './isRecord';

// context
export { type ContextProvider, type ContextHook, type InferContextApi, createContext } from './createContext';
