import type { CreateGlobalState } from './types';

import { GlobalStore } from './GlobalStore';

/**
 * Creates a global state hook
 */
export const createGlobalState = ((...[state, args]: ConstructorParameters<typeof GlobalStore>) =>
  new GlobalStore(state, args).use) as CreateGlobalState;

// Re-export types
export type { AnyActions, CreateGlobalState, InferActionsType, InferStateApi, InferAPI } from './types';

export default createGlobalState;
