/* eslint-disable @typescript-eslint/no-empty-object-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import createGlobalState from 'createGlobalState';
import type {
  ActionCollectionConfig,
  ActionCollectionResult,
  AnyFunction,
  BaseMetadata,
  StateHook,
  StoreTools,
} from './types';

export type InferStateApi<Hook extends StateHook<any, any, any>> =
  Hook extends StateHook<infer State, infer PublicStateMutator, infer Metadata>
    ? StoreTools<State, PublicStateMutator, Metadata>
    : never;

export function actionsFor<ParentStateApi extends StoreTools<any, any, any>>() {
  type State = ReturnType<ParentStateApi['getState']>;
  type Metadata = ReturnType<ParentStateApi['getMetadata']>;
  type ParentActions = ParentStateApi['actions'];

  type ActionsConfig$ = {
    readonly [key: string]: {
      (
        this: ParentActions,
        ...parameters: any[]
      ): (this: ParentActions, storeTools: StoreTools<State, ParentActions, Metadata>) => any;
    };
  };

  function with$<ActionsConfig extends ActionsConfig$>(
    actionsConfig: ActionsConfig,
  ): (api: StoreTools<any, any, any>) => ActionCollectionResult<State, Metadata, ActionsConfig>;

  function with$<ActionsConfig extends ActionsConfig$>(
    actionsConfig: ActionsConfig,
  ): (api: StoreTools<any, any, any>) => ActionCollectionResult<State, Metadata, ActionsConfig>;

  function with$<ActionsConfig extends ActionsConfig$>(
    actionsConfig: ActionsConfig,
  ): (api: StoreTools<any, any, any>) => ActionCollectionResult<State, Metadata, ActionsConfig> {
    return actionsConfig as any;
  }

  return {
    with: with$,
  };
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

const counter$ = createGlobalState(0);

const actions = actionsFor<CounterApi>().with({
  increment(amount: number) {
    return (storeTools) => {
      storeTools.actions?.decrease(-amount);

      const { decrease } = counterInternals(storeTools);

      console.log(this?.decrease(-amount), decrease(-amount));
    };
  },
  decrease(amount: number) {
    return ({ setState }) => {
      setState((count) => count - amount);
    };
  },
});
