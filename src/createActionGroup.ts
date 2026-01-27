/* eslint-disable @typescript-eslint/no-explicit-any */
import createGlobalState from 'createGlobalState';
import type { ActionCollectionResult, InferAPI, StoreTools } from './types';

// Re-export for backward compatibility
export type { InferStateApi } from './types';

export type ActionCollectionConfig<ParentStateApi extends StoreTools<any, any, any>> = {
  readonly [key: string]: {
    (
      ...parameters: any[]
    ): (
      storeTools: StoreTools<
        ReturnType<ParentStateApi['getState']>,
        ParentStateApi['actions'],
        ReturnType<ParentStateApi['getMetadata']>
      >,
    ) => any;
  };
};

export type ActionsBuilder<ParentStateApi extends StoreTools<any, any, any>> = {
  with<
    ActionsConfig extends {
      readonly [key: string]: {
        (
          this: ParentStateApi['actions'],
          ...parameters: any[]
        ): (
          this: ParentStateApi['actions'],
          storeTools: StoreTools<
            ReturnType<ParentStateApi['getState']>,
            ParentStateApi['actions'],
            ReturnType<ParentStateApi['getMetadata']>
          >,
        ) => any;
      };
    },
  >(
    actionsConfig: ActionsConfig,
  ): (
    api: StoreTools<any, any, any>,
  ) => ActionCollectionResult<
    ReturnType<ParentStateApi['getState']>,
    ReturnType<ParentStateApi['getMetadata']>,
    ActionsConfig
  >;
};

/**
 * Create a template for an action group
 */
export function actionsFor<
  ParentStateApi extends StoreTools<any, any, any>,
>(): ActionsBuilder<ParentStateApi>;

/**
 * Creates and action group from a config and binds it the provided store
 */
export function actionsFor<
  ParentStateApi extends StoreTools<any, any, any>,
  ActionsConfig extends ActionCollectionConfig<ParentStateApi>,
>(
  store: ParentStateApi,
  actions: ActionsConfig,
): {
  [key in keyof ActionsConfig]: {
    (...params: Parameters<ActionsConfig[key]>): ReturnType<ReturnType<ActionsConfig[key]>>;
  };
};

export function actionsFor<
  ParentStateApi extends StoreTools<any, any, any>,
  ActionsConfig extends ActionCollectionConfig<ParentStateApi>,
>(
  actions?: ActionsConfig,
  store?: ParentStateApi,
):
  | ActionsBuilder<ParentStateApi>
  | ActionCollectionResult<
      ReturnType<ParentStateApi['getState']>,
      ReturnType<ParentStateApi['getMetadata']>,
      ActionsConfig
    > {
  return null as any;

  //   console.log(actions, store);

  //   // static connection to storeTools
  //   if (store) {
  //     return null as any;
  //   }

  //   type State = ReturnType<ParentStateApi['getState']>;
  //   type Metadata = ReturnType<ParentStateApi['getMetadata']>;
  //   type ParentActions = ParentStateApi['actions'];

  //   return {
  //     with<Config extends ActionsFor<ParentStateApi>>(
  //       config: Config,
  //     ): (api: StoreTools<State, ParentActions, Metadata>) => ActionCollectionResult<State, Metadata, Config> {
  //       return config as any;
  //     },
  //   };
}

// const counterInternals = actionsFor<CounterApi | CounterNoActionsApi>().with({
//   increment(amount: number) {
//     return (storeTools) => {
//       storeTools.actions?.decrease(-amount);

//       const { decrease } = counterInternals(storeTools);

//       console.log(this?.decrease(-amount), decrease(-amount));
//     };
//   },
//   decrease(amount: number) {
//     return ({ setState }) => {
//       setState((count) => count - amount);
//     };
//   },
// });

// type CounterApi = InferStateApi<typeof counter$>;

// type CounterNoActionsApi = InferStateApi<typeof counterNoActions$>;

// const counter$ = createGlobalState(0, {
//   actions: {
//     decrease(amount: number) {
//       return (api) => {
//         const { decrease } = counterInternals(api);
//         decrease(amount);
//       };
//     },
//   },
// });

// const counterNoActions$ = createGlobalState(0);

// const internals$ = counterInternals(counter$);

// internals$.decrease(1);

// console.log(counter$.actions.decrease(1), counterNoActions$.actions);

// // public api
// counter$.actions.decrease(1);

export default actionsFor;

type CounterApi = InferAPI<typeof counter$>;

const counter$ = createGlobalState(0, {
  actions: {
    log(message: string) {
      return (storeTools) => {
        console.log('Current count is:', message, storeTools.getState());
      };
    },
  },
});

const actions = actionsFor(counter$, {
  increment(amount: number) {
    return (storeTools) => {
      this.decrease(amount);
      console.log(storeTools.actions.log(1)); // null
    };
  },
  decrease(amount: number) {
    return ({ setState }) => {
      setState((count) => count - amount);
    };
  },
});
