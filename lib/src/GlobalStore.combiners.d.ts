import { StateGetter, UnsubscribeCallback, SelectorCallback, UseHookConfig, SubscribeToEmitter, StateHook } from "./GlobalStore.types";
/**
 * @description
 * This function allows you to create a derivate state by merging the state of multiple hooks.
 * The update of the derivate state is debounced to avoid unnecessary re-renders.
 * By default, the debounce delay is 0, but you can change it by passing a delay in milliseconds as the third parameter.
 * @returns a tuple with the following elements: [subscribe, getState, dispose]
 */
export declare const combineAsyncGettersEmitter: <TDerivate, TArguments extends StateGetter<unknown>[], TResults = { [K in keyof TArguments]: TArguments[K] extends () => infer TResult ? Exclude<TResult, UnsubscribeCallback> : never; }>(parameters: {
    selector: SelectorCallback<TResults, TDerivate>;
    config?: UseHookConfig<TDerivate> & {
        delay?: number;
    };
}, ...args: TArguments) => [subscribe: SubscribeToEmitter<TDerivate>, getState: StateGetter<TDerivate>, dispose: UnsubscribeCallback];
/**
 * @description
 * This function allows you to create a derivate state by merging the state of multiple hooks.
 * The update of the derivate state is debounced to avoid unnecessary re-renders.
 * By default, the debounce delay is 0, but you can change it by passing a delay in milliseconds as the third parameter.
 * @returns A tuple containing the subscribe function, the state getter and the dispose function
 */
export declare const combineAsyncGetters: <TDerivate, TArguments extends StateGetter<unknown>[], TResults = { [K in keyof TArguments]: TArguments[K] extends () => infer TResult ? Exclude<TResult, UnsubscribeCallback> : never; }>(parameters: {
    selector: SelectorCallback<TResults, TDerivate>;
    config?: UseHookConfig<TDerivate> & {
        delay?: number;
    };
}, ...args: TArguments) => [useHook: StateHook<TDerivate, null, null>, getState: StateGetter<TDerivate>, dispose: UnsubscribeCallback];
