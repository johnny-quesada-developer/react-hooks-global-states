import { createDecoupledPromise } from 'easy-cancelable-promise';
import { formatToStore } from 'json-storage-formatter';
import { GlobalStore, asyncStorage, createGlobalState } from './GlobalStoreAsync';

describe('GlobalStoreAsync Basics', () => {
  it('should create a store with async storage', async () => {
    asyncStorage.setItem('counter', 0);

    const { promise, resolve } = createDecoupledPromise();

    setTimeout(async () => {
      const { promise: onStateChangedPromise, resolve: onStateChangedResolve } = createDecoupledPromise();

      const storage = new GlobalStore(0, {
        asyncStorageKey: 'counter',
        metadata: {
          isAsyncStorageReady: false,
        },
      });

      const [getState, _, getMetadata] = storage.stateControls();

      const onStateChanged = (storage as any).onStateChanged;
      onStateChanged.bind(storage);

      jest.spyOn(storage, 'onStateChanged' as any).mockImplementation((...parameters) => {
        onStateChanged(...parameters);

        onStateChangedResolve();
      });

      expect(storage).toBeInstanceOf(GlobalStore);

      expect(getMetadata().isAsyncStorageReady).toBe(false);

      // add a subscriber to the store
      storage.getHook()();

      const [[id, parameters]] = storage.subscribers;
      const { callback: setState } = parameters;
      parameters.callback = jest.fn(setState);

      storage.subscribers = new Map([[id, parameters]]);

      await onStateChangedPromise;

      expect(getMetadata().isAsyncStorageReady).toBe(true);
      expect(setState).toBeCalledTimes(1);

      expect(getState()).toBe(0);

      const storedValue = await asyncStorage.getItem('counter');

      expect(storedValue).toBe('"0"');

      resolve();
    }, 0);

    return promise;
  });
});

describe('createGlobalState', () => {
  it('should create a store with async storage', async () => {
    asyncStorage.setItem('data', formatToStore(new Map([['prop', 0]])));

    const { promise, resolve } = createDecoupledPromise();

    setTimeout(async () => {
      const { promise: onStateChangedPromise, resolve: onStateChangedResolve } = createDecoupledPromise();

      const useData = createGlobalState(new Map<string, number>(), {
        config: {
          asyncStorageKey: 'data',
        },
        metadata: {
          propFromMetadata: 0,
        },
        callbacks: {
          onStateChanged: onStateChangedResolve,
        },
      });

      let [data, setData, metadata] = useData();

      expect(metadata.isAsyncStorageReady).toBe(undefined);

      await onStateChangedPromise;

      [data, setData, metadata] = useData();

      expect(!!metadata.isAsyncStorageReady).toBe(true);
      expect(data).toEqual(new Map([['prop', 0]]));

      setData((data) => {
        data.set('prop', 1);

        return data;
      });

      const [data2] = useData();

      expect(data).toBe(data2);

      resolve();
    }, 0);

    return promise;
  });
});

describe('getter subscriptions custom global state', () => {
  it('should subscribe to changes from getter', () => {
    const useHook = createGlobalState({
      a: 3,
      b: 2,
    });

    const [getter, setter] = useHook.stateControls();

    const state = getter();

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

    const callback2 = jest.fn((state) => {
      return state.a;
    });

    const removeSubscriptions = [
      getter(callback1),
      getter(callback2, (derivate) => {
        subscriptionDerivateSpy(derivate);
      }),
    ];

    expect(subscriptionSpy).toBeCalledTimes(1);
    expect(subscriptionSpy).toBeCalledWith(state);

    expect(subscriptionDerivateSpy).toBeCalledTimes(1);
    expect(subscriptionDerivateSpy).toBeCalledWith(3);

    setter((state) => ({
      ...state,
      b: 3,
    }));

    expect(subscriptionSpy).toBeCalledTimes(2);
    expect(subscriptionSpy).toBeCalledWith({
      a: 3,
      b: 3,
    });

    // the derivate should not be called since it didn't change
    expect(subscriptionDerivateSpy).toBeCalledTimes(1);

    removeSubscriptions.forEach((remove) => remove());

    setter((state) => ({
      ...state,
      a: 4,
    }));

    // the subscription should not be called since it was removed
    expect(subscriptionSpy).toBeCalledTimes(2);
    expect(subscriptionDerivateSpy).toBeCalledTimes(1);
  });
});
