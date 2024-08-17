import { createGlobalStateWithDecoupledFuncs } from 'GlobalStore.functionHooks';
import {
  ActionCollectionConfig,
  createStateConfig,
  StateHook,
  StateSetter,
  ActionCollectionResult,
  StateGetter,
} from 'GlobalStore.types';
import { clone } from 'json-storage-formatter';
import React, { PropsWithChildren } from 'react';

export const createStatefulContext = <
  TState,
  TMetadata = null,
  TActions extends ActionCollectionConfig<TState, TMetadata> = null
>(
  initialValue: TState,
  parameters?: createStateConfig<TState, TMetadata, TActions>
) => {
  type ContextHook = [
    hook: StateHook<
      TState,
      keyof TActions extends never
        ? StateSetter<TState>
        : ActionCollectionResult<TState, TMetadata, TActions>,
      TMetadata
    >,
    getter: StateGetter<TState>,
    setter: keyof TActions extends never
      ? StateSetter<TState>
      : ActionCollectionResult<TState, TMetadata, TActions>
  ];

  const context = React.createContext<ContextHook>(null);

  const useHook = () => {
    return React.useContext(context);
  };

  const Provider: React.FC<
    PropsWithChildren<{
      initialValue?: Partial<TState>;
    }>
  > = ({ children, ...props }) => {
    const hook = createGlobalStateWithDecoupledFuncs<TState, TMetadata, TActions>(
      (() => {
        // if there is an override of the initial state we'll use that one
        if (props.initialValue) return props.initialValue as TState;

        // return a copy of the initial value to avoid reference issues
        // this initial value will be reused in all the instances of the hook
        return clone(initialValue);
      })(),
      parameters
    );

    return <context.Provider value={hook}>{children}</context.Provider>;
  };

  return [useHook, Provider] as const;
};
