import React from 'react';
import { createContext } from '..';
// import { createContext } from '../src';
import { act, renderHook, render } from '@testing-library/react';

describe('createContext', () => {
  it('should correctly create a context hook and provider', () => {
    const store = createContext(
      { count: 0 },
      {
        metadata: { name: 'TestContext' },
      },
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <store.Provider>{children}</store.Provider>
    );

    const { result, rerender } = renderHook(() => store.use(), { wrapper });
    let [state, setState, metadata] = result.current;

    expect(state).toEqual({ count: 0 });
    expect(metadata).toEqual({ name: 'TestContext' });

    act(() => {
      setState((prev) => ({ ...prev, count: prev.count + 1 }));
    });

    rerender();

    [state] = result.current;

    expect(state).toEqual({ count: 1 });
  });

  it('should correctly export api hooks from the context', () => {
    const store = createContext({ count: 0 });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <store.Provider>{children}</store.Provider>
    );

    const { result, rerender } = renderHook(() => store.use.api(), { wrapper });

    result.current.setState({ count: 5 });

    expect(result.current.getState()).toEqual({ count: 5 });

    rerender();
  });

  it('should correctly create a selector hook', () => {
    const store = createContext(
      { count: 1 },
      {
        metadata: { name: 'CounterState' },
      },
    );

    const useSelector = store.use.createSelectorHook((state) => state.count * 2);

    const { context, wrapper } = store.Provider.makeProviderWrapper();

    const { result, rerender } = renderHook(() => useSelector(), { wrapper });
    let state = result.current;

    expect(state).toEqual(2);
    // expect(useSelector.createSelectorHook).toBeInstanceOf(Function);
    expect(context.current.getMetadata()).toEqual({ name: 'CounterState' });

    act(() => {
      context.current.setState((prev) => ({ ...prev, count: prev.count + 1 }));
    });

    rerender();

    state = result.current;

    expect(state).toEqual(4);
  });

  it('should allow testing of context actions', () => {
    expect.assertions(2);

    const counter = createContext(0, {
      actions: {
        increase() {
          return ({ setState }) => {
            setState((prev) => prev + 1);
          };
        },
        decrease() {
          return ({ setState }) => {
            setState((prev) => prev - 1);
          };
        },
      },
    });

    const Children = () => {
      const [count] = counter.use();

      return `count: ${count}`;
    };

    const { wrapper, context } = counter.Provider.makeProviderWrapper();

    const { getByText, rerender } = render(<Children />, {
      wrapper,
    });

    jest.spyOn(context.current.actions, 'increase').mockImplementation(() => {
      act(() => {
        context.current.setState((prev) => prev + 10);
      });
    });

    expect(getByText('count: 0')).toBeTruthy();

    context.current.actions.increase();

    rerender(<Children />);

    expect(getByText('count: 10')).toBeTruthy();
  });

  it('should allow wrappers with initial value for testing', () => {
    expect.assertions(1);

    const counter = createContext(0);

    const Children = () => {
      const [count] = counter.use();

      return `count: ${count}`;
    };

    const { wrapper } = counter.Provider.makeProviderWrapper({
      value: 2,
    });

    const { getByText } = render(<Children />, {
      wrapper,
    });

    expect(getByText('count: 2')).toBeTruthy();
  });

  it('should correctly apply selectors on the main hook', () => {
    const store = createContext({ countA: 1, countB: 2 });

    const { result } = renderHook(() => store.use(({ countA, countB }) => countA + countB), {
      wrapper: store.Provider,
    });

    let [state] = result.current;

    expect(state).toEqual(3);
  });
});
