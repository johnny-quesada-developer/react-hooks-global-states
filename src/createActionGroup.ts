/* eslint-disable @typescript-eslint/no-empty-object-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import createGlobalState from 'createGlobalState';
import type { ActionCollectionResult, BaseMetadata, StateHook, StoreTools } from './types';

export type InferStateApi<Hook extends StateHook<any, any, any>> =
  Hook extends StateHook<infer State, infer PublicStateMutator, infer Metadata>
    ? StoreTools<State, PublicStateMutator, Metadata>
    : never;

type ActionsFor<
  ParentStateApi extends StoreTools<any, any, any>,
  State = ReturnType<ParentStateApi['getState']>,
  Metadata extends BaseMetadata = ReturnType<ParentStateApi['getMetadata']>,
  ActionsResult = {
    readonly [key: string]: {
      (...parameters: any[]): (storeTools: StoreTools<State, ParentStateApi['actions'], Metadata>) => any;
    };
  },
> = ActionsResult & ThisType<ActionsResult>;

type Builder<
  ParentStateApi extends StoreTools<any, any, any>,
  State = ReturnType<ParentStateApi['getState']>,
  Metadata extends BaseMetadata = ReturnType<ParentStateApi['getMetadata']>,
> = {
  with<
    ActionsConfig extends {
      readonly [key: string]: {
        (
          this: ParentStateApi['actions'],
          ...parameters: any[]
        ): (
          this: ParentStateApi['actions'],
          storeTools: StoreTools<State, ParentStateApi['actions'], Metadata>,
        ) => any;
      };
    },
  >(
    actionsConfig: ActionsConfig,
  ): (api: StoreTools<any, any, any>) => ActionCollectionResult<State, Metadata, ActionsConfig>;
};

/**
 * Create a template for an action group
 */
export function actionsFor<ParentStateApi extends StoreTools<any, any, any>>(): Builder<ParentStateApi>;

/**
 * Creates and action group from a config and binds it the provided store
 */
export function actionsFor<
  ParentStateApi extends StoreTools<any, any, any>,
  ActionsConfig extends ActionsFor<ParentStateApi>,
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
  ActionsConfig extends ActionsFor<ParentStateApi>,
>(
  actions?: ActionsConfig,
  store?: ParentStateApi,
):
  | Builder<ParentStateApi>
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

type CounterApi = InferStateApi<typeof counter$>;

const counter$ = createGlobalState(0, {
  actions: {
    log() {
      return (storeTools) => {
        console.log('Current count is:', storeTools.getState());
      };
    },
  },
});

const actions = actionsFor(counter$, {
  increment(amount: number) {
    return (storeTools) => {
      this.decrease(amount);
      console.log(storeTools.actions.log); // null
    };
  },
  decrease(amount: number) {
    return ({ setState }) => {
      setState((count) => count - amount);
    };
  },
});
