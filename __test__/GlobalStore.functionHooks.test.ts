import React from 'react';
import { createDecoupledPromise } from 'easy-cancelable-promise';
import { formatFromStore, formatToStore } from 'json-storage-formatter';
import { getFakeAsyncStorage } from './getFakeAsyncStorage';
import { act, renderHook } from '@testing-library/react';

import { type StoreTools, createGlobalState } from '..';
//import { type StoreTools, createGlobalState } from '../src';

describe('basic', () => {
  it('should be able to create a new instance with state', () => {
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

    expect(spy).toHaveBeenCalledTimes(5);
  });
});

describe('with actions', () => {
  it('should be able to create a new instance with state and actions, setter should be and object', () => {
    type Metadata = {
      modificationsCounter: number;
    };

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
          return ({ setState, getState }: StoreTools<number, Metadata>) => {
            setState((state) => state + increase);

            this.logModification();

            return getState();
          };
        },

        decrease(decrease: number = 1) {
          return ({ setState, getState }: StoreTools<number, Metadata>) => {
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
  it('should execute onInit callback', () => {
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

  it('should execute onSubscribed callback every time a subscriber is added', () => {
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

    expect(onSubscribedSpy).toHaveBeenCalledTimes(1);

    const { result: result2 } = renderHook(() => useCount());
    const [state2] = result2.current;

    expect(onSubscribedSpy).toHaveBeenCalledTimes(2);
    expect(state).toBe(state2);
  });

  it('should execute onStateChanged callback every time the state is changed', () => {
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

  it('should execute computePreventStateChange callback before state is changed and continue if it returns false', () => {
    const computePreventStateChangeSpy = jest.fn(() => false); // allow state change

    const useCount = createGlobalState(0, {
      callbacks: {
        computePreventStateChange: computePreventStateChangeSpy,
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

    [state] = result.current;

    expect(state).toEqual(1);
    expect(computePreventStateChangeSpy).toHaveBeenCalledTimes(1);
  });

  it('should execute computePreventStateChange callback before state is changed and prevent state change if it returns true', () => {
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

  it('should initialize the store with the initial state where there is no async storage data', async () => {
    const { fakeAsyncStorage } = getFakeAsyncStorage();

    const { promise: mainPromise, ...tools } = createDecoupledPromise();

    const onStateChangedSpy = jest.fn(({ getState }) => {
      const newState = getState();

      fakeAsyncStorage.setItem(
        'items',
        formatToStore(newState, {
          stringify: true,
        }),
      );
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

  it('should initialize the store with the async storage data where there is async storage data', async () => {
    const initialState = getInitialState();
    const { fakeAsyncStorage } = getFakeAsyncStorage();

    fakeAsyncStorage.setItem('items', formatToStore(initialState));

    const { promise: mainPromise, ...tools } = createDecoupledPromise();

    const onStateChangedSpy = jest.fn(({ getState }) => {
      const newState = getState();

      fakeAsyncStorage.setItem(
        'items',
        formatToStore(newState, {
          stringify: true,
        }),
      );
    });

    const onInitSpy = jest.fn(async ({ setMetadata, setState }) => {
      const stored = (await fakeAsyncStorage.getItem('items')) ?? null;

      setMetadata({
        isAsyncStorageReady: true,
      });

      if (!stored) return;

      act(() => {
        setState(
          formatFromStore(stored, {
            jsonParse: true,
          }),
          {
            forceUpdate: true,
          },
        );
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

  it('should be able to update the store async storage', () => {
    const initialState = getInitialState();
    const { fakeAsyncStorage } = getFakeAsyncStorage();

    const { promise: mainPromise, ...tools } = createDecoupledPromise();

    const onStateChangedSpy = jest.fn(({ getState }) => {
      const newState = getState();

      fakeAsyncStorage.setItem(
        'items',
        formatToStore(newState, {
          stringify: true,
        }),
      );

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

  it('should be able to access custom actions from other actions', () => {
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

    let [state, actions] = result.current;

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

  it('should derivate new state from global', () => {
    const useCount = createGlobalState({
      a: 1,
      b: 2,
    });

    const selector = jest.fn((state: { a: number; b: number }) => state.a + state.b);

    const { result, rerender } = renderHook(() => useCount(selector));

    let [derivate, setState] = result.current;

    expect(derivate).toEqual(3);
    expect(selector).toHaveBeenCalledTimes(1);

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

  it('should avoid derivate to re-render due to shallow equal', () => {
    const useData = createGlobalState({
      a: 1,
      b: 2,
      c: [1, 2, { a: 1 }],
    });

    const selector = jest.fn(({ a, c }: { a: number; c: any[] }) => ({
      a,
      c,
    }));

    const { result, rerender } = renderHook(() => useData(selector));
    const [derivate, setState] = result.current;

    expect(derivate).toEqual({
      a: 1,
      c: [1, 2, { a: 1 }],
    });

    expect(selector).toHaveBeenCalledTimes(1);

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

    expect(selector).toHaveBeenCalledTimes(2); // Still recomputed, but state didn't change

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

  it('should create global state with function builder parameters', () => {
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

    let { result } = renderHook(() => useCount());
    let [state, actions] = result.current;

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
  it('should create a selector hook from the global store', () => {
    const useCount = createGlobalState({
      count: 1,
    });

    const useCountNumber = useCount.createSelectorHook((state) => state.count);
    const useCountValuePlus2 = useCountNumber.createSelectorHook((state) => state + 2);
    const useCountValuePlus3 = useCountValuePlus2.createSelectorHook((state) => state + 2);

    const { result: useCountValueResult } = renderHook(() => useCountNumber());
    let [useCountNumberValue, useCountNumberSetState, useCountNumberMetadata] = useCountValueResult.current;

    // hook return the correct value
    expect(useCountNumberValue).toEqual(1);

    // hook getState returns the correct value
    expect(useCountNumber.getState()).toEqual(1);

    // hook return the correct tuple
    expect(useCountNumberSetState).toBeInstanceOf(Function);
    expect(useCountNumberMetadata).toEqual({});
    expect(useCountNumberMetadata).toBe(useCountNumber.getMetadata());

    act(() => {
      useCountNumberSetState((prev) => ({ ...prev, count: prev.count + 1 }));
    });

    // selector should listen to state changes
    const [countAfterPlus] = useCountValueResult.current;

    expect(countAfterPlus).toEqual(2);
    expect(useCountNumber.getState()).toEqual(2);

    const { result: useCountValuePlus2Result } = renderHook(() => useCountValuePlus2());
    const [useCountValuePlus2Value, setState2] = useCountValuePlus2Result.current;

    const { result: useCountValuePlus3Result, rerender: rerender3 } = renderHook(() => useCountValuePlus3());
    let [useCountValuePlus3Value, , useCountValuePlus3Metadata] = useCountValuePlus3Result.current;

    useCountNumber.setMetadata({ custom: 'metadata' });

    // metadata is not reactive so we need to force a re-render
    rerender3();

    [useCountValuePlus3Value, , useCountValuePlus3Metadata] = useCountValuePlus3Result.current;

    expect(useCountValuePlus2Value).toEqual(4);
    expect(useCountValuePlus3Value).toEqual(6);

    expect(setState2).toBeInstanceOf(Function);
    expect(useCountValuePlus3Metadata).toEqual({ custom: 'metadata' });
  });
});
