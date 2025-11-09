import React from 'react';
import { createDecoupledPromise } from 'easy-cancelable-promise';
import { formatFromStore, formatToStore } from 'json-storage-formatter';
import { getFakeAsyncStorage } from './getFakeAsyncStorage';
import { act } from '@testing-library/react';
import it from './$it';

// import { createGlobalState, GlobalStore, StoreTools } from '..';
import { createGlobalState, GlobalStore, type StoreTools } from '../src';

describe('createGlobalState', () => {
  /**
   * should pass down the proper store tools to the actions
   */
  it('should pass down the proper store tools to the actions', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let storeTools!: StoreTools<number, any, any>;

    const store = createGlobalState(0, {
      actions: {
        testAction() {
          return (tools) => {
            storeTools = tools;
          };
        },
      },
    });

    store.actions.testAction();

    expect(storeTools).toBeDefined();
    expect(storeTools.getState).toBeInstanceOf(Function);
    expect(storeTools.setState).toBeInstanceOf(Function);
    expect(storeTools.getMetadata).toBeInstanceOf(Function);
    expect(storeTools.setMetadata).toBeInstanceOf(Function);
    expect(storeTools.actions).toBeDefined();
    expect(storeTools.subscribe).toBeInstanceOf(Function);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((storeTools as any).use).not.toBeDefined();

    expect(store.actions).toBe(storeTools.actions);
    expect(store.createObservable).toBeInstanceOf(Function);
    expect(store.createSelectorHook).toBeInstanceOf(Function);
    expect(store.dispose).toBeInstanceOf(Function);
    expect(store.getMetadata).toBeInstanceOf(Function);
    expect(store.getState).toBeInstanceOf(Function);
    expect(store.select).toBeInstanceOf(Function);
    expect(store.setMetadata).toBeInstanceOf(Function);
    // should not expose setState directly when using actions
    expect(store.setState).not.toBeInstanceOf(Function);
    expect(store.subscribe).toBeInstanceOf(Function);
    expect(store.use).toBeDefined();
    expect(store.subscribers).toBeInstanceOf(Set);
  });

  /**
   * should be able to create a new instance with state
   */
  it(`should be able to create a new instance with state`, ({ renderHook, strict }) => {
    const stateValue = 'test';

    const useValue = createGlobalState(stateValue, {
      metadata: {
        test: true,
      },
      callbacks: {
        onInit: () => {},
      },
    });

    const spy = jest.spyOn(React, 'useSyncExternalStore');

    const { result, rerender } = renderHook(() => useValue());
    let [state, setState, metadata] = result.current;

    expect(useValue).toBeInstanceOf(Function);
    expect(state).toBe(stateValue);
    expect(typeof setState).toBe('function');
    expect(metadata.test).toBe(true);

    act(() => {
      setState('test2');
    });

    rerender();
    [state, setState, metadata] = result.current;
    expect(state).toBe('test2');

    act(() => {
      setState((current: string) => current + '1');
    });

    rerender();
    [state] = result.current;
    expect(state).toBe('test21');

    // with strict mode, React renders twice in dev mode
    expect(spy).toHaveBeenCalledTimes(strict ? 10 : 5);
    spy.mockClear();
  });

  /**
   * should be able to use sugar syntax hook.use and hook.select
   */
  it(`should be able to use sugar syntax hook.use`, ({ renderHook }) => {
    const counter = createGlobalState(0);

    const { result } = renderHook(() => counter.use());
    const [state, setState, metadata] = result.current;

    expect(state).toBe(0);
    expect(typeof setState).toBe('function');
    expect(metadata).toEqual({});
  });

  it(`should be able to use sugar syntax hook.select`, ({ renderHook }) => {
    const counter = createGlobalState(0);

    const { result } = renderHook(() => counter.select((state) => state + 10));

    expect(result.current).toBe(10);
  });

  it('should correctly subscribe to state changes with subscribe callback on initialization', ({
    renderHook,
  }) => {
    const subscribeSpy = jest.fn();

    const counter = createGlobalState(0, {
      callbacks: {
        onInit: ({ subscribe }) => {
          subscribe(subscribeSpy);
        },
      },
    });

    const { result } = renderHook(() => counter());

    expect(result.current).toEqual([0, expect.any(Function), expect.any(Object)]);
    expect(subscribeSpy).toHaveBeenCalledTimes(1);
  });

  it('should unsubscribe on unmount and not re-render after state changes', ({ renderHook, strict }) => {
    const onChangesSpy = jest.fn();

    const store = new GlobalStore(0, {
      callbacks: {
        onStateChanged: onChangesSpy,
      },
    });

    const selectorSpy = jest.fn((state: number) => state);
    const useSelector = store.createSelectorHook(selectorSpy);

    // selectors are computed immediately upon subscription
    expect(store.subscribers.size).toBe(1);
    expect(selectorSpy).toHaveBeenCalledTimes(1);

    const inComponentSelectorSpy = jest.fn((state: number) => state);

    const { unmount } = renderHook(() => useSelector(inComponentSelectorSpy));

    // no changes selector doesn't need to be called again
    expect(selectorSpy).toHaveBeenCalledTimes(1);
    // main store only have the subscriber from the reusable selector hook
    expect(store.subscribers.size).toBe(1);

    // The component render should have called the in component selector once
    // in strict mode the selector is called twice
    expect(inComponentSelectorSpy).toHaveBeenCalledTimes(strict ? 2 : 1);

    // no state changes yet
    expect(onChangesSpy).toHaveBeenCalledTimes(0);

    act(() => {
      store.setState(1);
    });

    // selector should be called again due to state change
    expect(selectorSpy).toHaveBeenCalledTimes(2);
    expect(onChangesSpy).toHaveBeenCalledTimes(1);

    // in component selector should be called again due to state change
    // we get one more execution due the state change
    expect(inComponentSelectorSpy).toHaveBeenCalledTimes(strict ? 3 : 2);

    unmount();

    act(() => {
      store.setState(1);
    });

    // selector should have not been called because the component was unmounted
    expect(selectorSpy).toHaveBeenCalledTimes(2);
    expect(onChangesSpy).toHaveBeenCalledTimes(1);
    expect(inComponentSelectorSpy).toHaveBeenCalledTimes(strict ? 3 : 2);

    // main store only have the subscriber from the reusable selector hook
    expect(store.subscribers.size).toBe(1);

    store.dispose();

    expect(store.subscribers.size).toBe(0);
  });
});

describe('with actions', () => {
  it(`should be able to create a new instance with state and actions, setter should be and object`, ({
    renderHook,
  }) => {
    const useCount = createGlobalState(1, {
      metadata: {
        modificationsCounter: 0,
      },
      actions: {
        logModification() {
          return ({ setMetadata }) => {
            setMetadata(({ modificationsCounter, ...metadata }) => ({
              ...metadata,
              modificationsCounter: modificationsCounter + 1,
            }));
          };
        },

        increase(increase: number = 1) {
          return ({ setState, getState }) => {
            setState((state) => state + increase);

            this.logModification();

            return getState();
          };
        },

        decrease(decrease: number = 1) {
          return ({ setState, getState }) => {
            setState((state) => state - decrease);

            this.logModification();

            return getState();
          };
        },
      },
    });

    const { result } = renderHook(() => useCount());
    let [state, actions, metadata] = result.current;

    expect(useCount).toBeInstanceOf(Function);
    expect(metadata.modificationsCounter).toBe(0);

    expect(actions).toBeInstanceOf(Object);
    expect(actions.decrease).toBeInstanceOf(Function);
    expect(actions.increase).toBeInstanceOf(Function);

    expect(state).toBe(1);
    expect(metadata).toEqual({
      modificationsCounter: 0,
    });

    act(() => {
      actions.increase();
      actions.increase(2);
    });

    [state, actions, metadata] = result.current;

    expect(state).toBe(4);
    expect(metadata).toEqual({
      modificationsCounter: 2,
    });

    act(() => {
      actions.decrease();
      actions.decrease(2);
    });

    [state, actions, metadata] = result.current;

    expect(state).toBe(1);
    expect(metadata).toEqual({
      modificationsCounter: 4,
    });
  });
});

describe('with configuration callbacks', () => {
  it('should execute onInit callback', ({ renderHook }) => {
    const onInitSpy = jest.fn(({ setMetadata }) => {
      setMetadata({
        test: true,
      });
    });

    const useCount = createGlobalState(1, {
      callbacks: {
        onInit: onInitSpy,
      },
    });

    expect(onInitSpy).toHaveBeenCalledTimes(1);

    const { result } = renderHook(() => useCount());
    const [state, setState, metadata] = result.current;

    expect(state).toBe(1);
    expect(setState).toBeInstanceOf(Function);
    expect(metadata).toEqual({
      test: true,
    });
  });

  it(`should execute onSubscribed callback every time a subscriber is added`, ({ renderHook, strict }) => {
    const onSubscribedSpy = jest.fn();

    const useCount = createGlobalState(
      {
        test: new Date(),
      },
      {
        callbacks: {
          onSubscribed: onSubscribedSpy,
        },
      },
    );

    expect(onSubscribedSpy).toHaveBeenCalledTimes(0);

    const { result } = renderHook(() => useCount());
    const [state] = result.current;

    expect(onSubscribedSpy).toHaveBeenCalledTimes(strict ? 2 : 1);

    const { result: result2 } = renderHook(() => useCount());
    const [state2] = result2.current;

    expect(onSubscribedSpy).toHaveBeenCalledTimes(strict ? 4 : 2);
    expect(state).toBe(state2);
  });

  it(`should execute onStateChanged callback every time the state is changed`, ({ renderHook }) => {
    const onStateChangedSpy = jest.fn();

    const useCount = createGlobalState(
      { a: true },
      {
        callbacks: {
          onStateChanged: onStateChangedSpy,
        },
      },
    );

    expect(onStateChangedSpy).toHaveBeenCalledTimes(0);

    const { result } = renderHook(() => useCount());
    const [, setState] = result.current;

    act(() => {
      setState({ a: true });
    });

    expect(onStateChangedSpy).toHaveBeenCalledTimes(1);

    act(() => {
      setState({ a: false });
    });

    expect(onStateChangedSpy).toHaveBeenCalledTimes(2);
  });

  it('should execute computePreventStateChange callback before state is changed and continue if it returns false', ({
    renderHook,
  }) => {
    const computePreventStateChangeSpy = jest.fn(() => false); // allow state change

    const useCount = createGlobalState(0, {
      callbacks: {
        computePreventStateChange: computePreventStateChangeSpy,
      },
    });

    expect(computePreventStateChangeSpy).toHaveBeenCalledTimes(0);

    const { result } = renderHook(() => useCount());
    let [state] = result.current;
    const [, setState, metadata] = result.current;

    expect(state).toEqual(0);
    expect(setState).toBeInstanceOf(Function);
    expect(metadata).toEqual({});

    act(() => {
      setState((state) => state + 1);
    });

    [state] = result.current;

    expect(state).toEqual(1);
    expect(computePreventStateChangeSpy).toHaveBeenCalledTimes(1);
  });

  it('should execute computePreventStateChange callback before state is changed and prevent state change if it returns true', ({
    renderHook,
  }) => {
    const computePreventStateChangeSpy = jest.fn();

    const useCount = createGlobalState(0, {
      callbacks: {
        computePreventStateChange: (parameters) => {
          computePreventStateChangeSpy();

          const { setState, getMetadata, setMetadata, actions } = parameters;

          expect(getMetadata()).toEqual({});
          expect(setState).toBeInstanceOf(Function);
          expect(setMetadata).toBeInstanceOf(Function);
          expect(actions).toBe(null);

          return true;
        },
      },
    });

    expect(computePreventStateChangeSpy).toHaveBeenCalledTimes(0);

    const { result } = renderHook(() => useCount());
    let [state, setState, metadata] = result.current;

    expect(state).toEqual(0);
    expect(setState).toBeInstanceOf(Function);
    expect(metadata).toEqual({});

    act(() => {
      setState((state) => state + 1);
    });

    // Should not update due to computePreventStateChange returning true
    [state, setState, metadata] = result.current;

    expect(computePreventStateChangeSpy).toHaveBeenCalledTimes(1);
    expect(state).toEqual(0);
  });
});

describe('custom global hooks', () => {
  const getInitialState = () => {
    return new Map([
      [1, { name: 'john' }],
      [2, { name: 'doe' }],
    ]);
  };

  it('should initialize the store with the initial state where there is no async storage data', async ({
    renderHook,
  }) => {
    const { fakeAsyncStorage } = getFakeAsyncStorage();

    const { promise: mainPromise, ...tools } = createDecoupledPromise();

    const onStateChangedSpy = jest.fn(({ getState }) => {
      const newState = getState();

      fakeAsyncStorage.setItem('items', formatToStore(newState));
    });

    const onInitSpy = jest.fn(async ({ setMetadata, setState }) => {
      const stored = (await fakeAsyncStorage.getItem('items')) ?? null;

      setMetadata({
        isAsyncStorageReady: true,
      });

      if (stored) return;

      setState((state: unknown) => state, {
        forceUpdate: true,
      });

      tools.resolve();
    });

    const initialState = new Map<number, string>();

    const useCount = createGlobalState(initialState, {
      callbacks: {
        onStateChanged: onStateChangedSpy,
        onInit: onInitSpy,
      },
    });

    const { result, rerender } = renderHook(() => useCount());

    let [state, setState, metadata] = result.current;

    expect.assertions(5);

    expect(state).toEqual(initialState);
    expect(setState).toBeInstanceOf(Function);
    expect(metadata).toEqual({});

    await mainPromise;

    rerender();

    [state, setState, metadata] = result.current;

    expect(state).toEqual(initialState);
    expect(metadata).toEqual({
      isAsyncStorageReady: true,
    });
  });

  it('should initialize the store with the async storage data where there is async storage data', async ({
    renderHook,
  }) => {
    const initialState = getInitialState();
    const { fakeAsyncStorage } = getFakeAsyncStorage();

    fakeAsyncStorage.setItem('items', formatToStore(initialState));

    const { promise: mainPromise, ...tools } = createDecoupledPromise();

    const onStateChangedSpy = jest.fn(({ getState }) => {
      const newState = getState();

      fakeAsyncStorage.setItem('items', formatToStore(newState));
    });

    const onInitSpy = jest.fn(async ({ setMetadata, setState }) => {
      const stored = (await fakeAsyncStorage.getItem('items')) ?? null;

      setMetadata({
        isAsyncStorageReady: true,
      });

      if (!stored) return;

      act(() => {
        setState(formatFromStore(stored), {
          forceUpdate: true,
        });
      });

      tools.resolve();
    });

    const useCount = createGlobalState(initialState, {
      callbacks: {
        onStateChanged: onStateChangedSpy,
        onInit: onInitSpy,
      },
    });

    const { result } = renderHook(() => useCount());

    let [state, setState, metadata] = result.current;

    expect(state).toEqual(initialState);
    expect(setState).toBeInstanceOf(Function);
    expect(metadata).toEqual({});

    await mainPromise;

    [state, setState, metadata] = result.current;

    expect(state).toEqual(
      new Map([
        [1, { name: 'john' }],
        [2, { name: 'doe' }],
      ]),
    );

    expect(metadata).toEqual({
      isAsyncStorageReady: true,
    });

    expect(onStateChangedSpy).toHaveBeenCalledTimes(1);
    expect(onInitSpy).toHaveBeenCalledTimes(1);

    expect(fakeAsyncStorage.getItem).toHaveBeenCalledTimes(1);
    expect(fakeAsyncStorage.setItem).toHaveBeenCalledTimes(2);

    expect(fakeAsyncStorage.getItem).toBeCalledWith('items');
  });

  it('should be able to update the store async storage', ({ renderHook }) => {
    const initialState = getInitialState();
    const { fakeAsyncStorage } = getFakeAsyncStorage();

    const { promise: mainPromise, ...tools } = createDecoupledPromise();

    const onStateChangedSpy = jest.fn(({ getState }) => {
      const newState = getState();

      fakeAsyncStorage.setItem('items', formatToStore(newState));

      tools.resolve();
    });

    const onInitSpy = jest.fn(async ({ setMetadata, setState }) => {
      const stored = (await fakeAsyncStorage.getItem('items')) ?? null;

      setMetadata({
        isAsyncStorageReady: true,
      });

      if (stored) return;

      setState((state: unknown) => state, {
        forceUpdate: true,
      });
    });

    const useCount = createGlobalState(initialState, {
      callbacks: {
        onStateChanged: onStateChangedSpy,
        onInit: onInitSpy,
      },
    });

    const { result, rerender } = renderHook(() => useCount());
    let [state, setState, metadata] = result.current;

    expect(state).toEqual(initialState);
    expect(setState).toBeInstanceOf(Function);
    expect(metadata).toEqual({});

    return mainPromise.then(() => {
      rerender();

      [state, setState, metadata] = result.current;

      expect(state).toBe(initialState);

      expect(metadata).toEqual({
        isAsyncStorageReady: true,
      });

      expect(onStateChangedSpy).toHaveBeenCalledTimes(1);
      expect(onInitSpy).toHaveBeenCalledTimes(1);

      expect(fakeAsyncStorage.getItem).toHaveBeenCalledTimes(1);
      expect(fakeAsyncStorage.setItem).toHaveBeenCalledTimes(1);

      expect(fakeAsyncStorage.getItem).toBeCalledWith('items');
    });
  });

  it('should be able to access custom actions from other actions', ({ renderHook }) => {
    expect.assertions(9);

    const logSpy = jest.fn();

    const useCount = createGlobalState(1, {
      metadata: {
        test: true,
      },
      actions: {
        log: (message: string) => {
          return () => {
            logSpy(message);
          };
        },
        increase: () => {
          return ({ setState }) => {
            setState((state: number) => state + 1);

            useCount.actions.log('increase');
          };
        },
        decrease: () => {
          return ({ setState }) => {
            setState((state: number) => state - 1);

            useCount.actions.log('decrease');
          };
        },
      },
    });

    const { result, rerender } = renderHook(() => useCount());

    const [state, actions] = result.current;

    expect(state).toEqual(1);
    expect(logSpy).toHaveBeenCalledTimes(0);

    act(() => {
      actions.increase();
    });
    rerender();

    expect(useCount.getState()).toEqual(2);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('increase');

    act(() => {
      actions.decrease();
    });
    rerender();

    expect(useCount.getState()).toEqual(1);
    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenCalledWith('decrease');

    act(() => {
      useCount.actions.increase();
    });
    rerender();

    expect(useCount.getState()).toEqual(2);
  });

  it('should derivate new state from global', ({ renderHook, strict }) => {
    const useCount = createGlobalState({
      a: 1,
      b: 2,
    });

    const selector = jest.fn((state: { a: number; b: number }) => state.a + state.b);

    const { result, rerender } = renderHook(() => useCount(selector));

    let [derivate, setState] = result.current;

    expect(derivate).toEqual(3);
    expect(selector).toHaveBeenCalledTimes(strict ? 2 : 1);

    act(() => {
      setState((state) => ({
        ...state,
        a: 2,
      }));
    });

    rerender(); // Trigger re-evaluation

    [derivate, setState] = result.current;

    expect(derivate).toEqual(4);
  });

  it('should avoid derivate to re-render due to shallow equal', ({ renderHook, strict }) => {
    const useData = createGlobalState({
      a: 1,
      b: 2,
      c: [1, 2, { a: 1 }],
    });

    const selector = jest.fn(({ a, c }: { a: number; c: unknown[] }) => ({
      a,
      c,
    }));

    const { result, rerender } = renderHook(() => useData(selector));
    const [derivate, setState] = result.current;

    expect(derivate).toEqual({
      a: 1,
      c: [1, 2, { a: 1 }],
    });

    expect(selector).toHaveBeenCalledTimes(strict ? 2 : 1);

    act(() => {
      setState((state) => ({
        ...state,
        b: 3, // This doesn't affect selector output
      }));
    });

    rerender();
    const [derivate2] = result.current;

    expect(derivate2).toEqual({
      a: 1,
      c: [1, 2, { a: 1 }],
    });

    expect(selector).toHaveBeenCalledTimes(strict ? 3 : 2); // Still recomputed, but state didn't change

    const { result: result2, rerender: rerender2 } = renderHook(() => useData());
    const [data1, setState2] = result2.current;

    expect(data1).toEqual({
      a: 1,
      b: 3,
      c: [1, 2, { a: 1 }],
    });

    act(() => {
      setState2((state) => ({
        ...state,
        b: 4,
      }));
    });

    rerender2();
    const [data2] = result2.current;

    expect(data2).toEqual({
      a: 1,
      b: 4,
      c: [1, 2, { a: 1 }],
    });
  });
});

describe('getter subscriptions', () => {
  it('should subscribe to changes from getter', () => {
    const useHook = createGlobalState({
      a: 3,
      b: 2,
    });

    useHook.subscribe(() => {});

    const state = useHook.getState();

    // without a callback, it should return the current state
    expect(state).toEqual({
      a: 3,
      b: 2,
    });

    const subscriptionSpy = jest.fn();
    const subscriptionDerivateSpy = jest.fn();

    const callback1 = jest.fn((state) => {
      subscriptionSpy(state);
    });

    const callback2 = jest.fn((derivate) => {
      subscriptionDerivateSpy(derivate);
    });

    const removeSubscriptions = [
      useHook.subscribe(callback1),
      useHook.subscribe((state) => {
        return state.a;
      }, callback2),
    ];

    expect(subscriptionSpy).toHaveBeenCalledTimes(1);
    expect(subscriptionSpy).toBeCalledWith(state);

    expect(subscriptionDerivateSpy).toHaveBeenCalledTimes(1);
    expect(subscriptionDerivateSpy).toBeCalledWith(3);

    useHook.setState((state) => ({
      ...state,
      b: 3,
    }));

    expect(subscriptionSpy).toHaveBeenCalledTimes(2);
    expect(subscriptionSpy).toBeCalledWith({
      a: 3,
      b: 3,
    });

    // the derivate should not be called since it didn't change
    expect(subscriptionDerivateSpy).toHaveBeenCalledTimes(1);

    removeSubscriptions.forEach((clean) => clean());

    useHook.setState((state) => ({
      ...state,
      a: 4,
    }));

    // the subscription should not be called since it was removed
    expect(subscriptionSpy).toHaveBeenCalledTimes(2);
    expect(subscriptionDerivateSpy).toHaveBeenCalledTimes(1);
  });
});

describe('createObservable', () => {
  it('should create a observable fragment', async () => {
    expect.assertions(7);

    const initialState = {
      secondRound: false,
      a: 1,
      b: 2,
      c: 3,
    };

    const useData = createGlobalState(initialState);

    expect(useData).toBeInstanceOf(Function);
    expect(useData.getState).toBeInstanceOf(Function);
    expect(useData.setState).toBeInstanceOf(Function);
    expect(useData.getState()).toBe(initialState);

    const observable = useData.createObservable((state) => state.secondRound);

    const unsubscribe1 = observable((secondRound) => {
      expect(secondRound).toEqual(false);
    });

    const secondObservable = observable.createObservable((state) => {
      return state ? 1 : 0;
    });

    const unsubscribe2 = secondObservable((n) => {
      expect(n).toEqual(0);
    });

    unsubscribe1();
    unsubscribe2();

    useData.setState((state) => ({
      ...state,
      secondRound: true,
    }));

    expect(useData.getState()).toEqual({
      secondRound: true,
      a: 1,
      b: 2,
      c: 3,
    });
  });

  it('should create global state with function builder parameters', ({ renderHook }) => {
    expect.assertions(9);

    const logSpy = jest.fn();

    const useCount = createGlobalState(1, {
      metadata: {
        test: true,
      },
      actions: {
        log: (message: string) => {
          return () => {
            logSpy(message);
          };
        },
        increase: () => {
          return ({ setState }) => {
            setState((state) => state + 1);

            useCount.actions.log('increase');
          };
        },
        decrease: () => {
          return ({ setState }) => {
            setState((state) => state - 1);

            useCount.actions.log('decrease');
          };
        },
      } as const,
    });

    const { result } = renderHook(() => useCount());
    const [state, actions] = result.current;

    expect(state).toEqual(1);
    expect(logSpy).toHaveBeenCalledTimes(0);

    act(() => {
      actions.increase();
    });

    expect(useCount.getState()).toEqual(2);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toBeCalledWith('increase');

    act(() => {
      actions.decrease();
    });

    expect(useCount.getState()).toEqual(1);
    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toBeCalledWith('decrease');

    act(() => {
      useCount.actions.increase();
    });

    const count = useCount.getState();

    expect(count).toEqual(2);
  });
});

describe('createSelectorHook', () => {
  it('should create a selector hook from the global store', ({ renderHook }) => {
    const counter = createGlobalState({
      count: 1,
    });

    const useCountNumber = counter.createSelectorHook((state) => state.count);
    const useCountValuePlus2 = useCountNumber.createSelectorHook((state) => state + 2);
    const useCountValuePlus3 = useCountValuePlus2.createSelectorHook((state) => state + 2);

    const { result: useCountValueResult } = renderHook(() => useCountNumber());
    const useCountNumberValue = useCountValueResult.current;

    // hook return the correct value
    expect(useCountNumberValue).toEqual(1);

    // hook getState returns the correct value
    expect(useCountNumber.getState()).toEqual(1);

    // hook return the correct tuple
    expect(useCountNumber.createObservable).toBeInstanceOf(Function);
    expect(useCountNumber.createSelectorHook).toBeInstanceOf(Function);

    act(() => {
      counter.setState((prev) => ({ ...prev, count: prev.count + 1 }));
    });

    // selector should listen to state changes
    const countAfterPlus = useCountValueResult.current;

    expect(countAfterPlus).toEqual(2);
    expect(useCountNumber.getState()).toEqual(2);

    const { result: useCountValuePlus2Result } = renderHook(() => useCountValuePlus2());
    const useCountValuePlus2Value = useCountValuePlus2Result.current;

    const { result: useCountValuePlus3Result, rerender: rerender3 } = renderHook(() => useCountValuePlus3());
    let useCountValuePlus3Value = useCountValuePlus3Result.current;

    counter.setMetadata({ custom: 'metadata' });

    // metadata is not reactive so we need to force a re-render
    rerender3();

    useCountValuePlus3Value = useCountValuePlus3Result.current;

    expect(useCountValuePlus2Value).toEqual(4);
    expect(useCountValuePlus3Value).toEqual(6);

    expect(counter.getMetadata()).toEqual({ custom: 'metadata' });
  });
});
