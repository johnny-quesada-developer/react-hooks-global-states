import React from 'react';
import { createContext } from '..';
import { act, renderHook, render } from '@testing-library/react';

describe('createContext', () => {
  it('should correctly create a context hook and provider', () => {
    const [useState, Provider] = createContext(
      { count: 0 },
      {
        metadata: { name: 'TestContext' },
      }
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => <Provider>{children}</Provider>;

    const { result, rerender } = renderHook(() => useState(), { wrapper });
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

  it('should correctly create a selector hook', () => {
    const [parentHook, Provider] = createContext(
      { count: 1 },
      {
        metadata: { name: 'CounterState' },
      }
    );

    const useSelector = parentHook.createSelectorHook((state) => state.count * 2);
    const wrapper = ({ children }: { children: React.ReactNode }) => <Provider>{children}</Provider>;

    const { result, rerender } = renderHook(() => useSelector(), { wrapper });
    let [state, setState, metadata] = result.current;

    expect(state).toEqual(2);
    expect(metadata).toEqual({ name: 'CounterState' });

    act(() => {
      setState((prev) => ({ ...prev, count: prev.count + 1 }));
    });

    rerender();

    [state] = result.current;

    expect(state).toEqual(4);
  });

  it('should allow testing of context actions', () => {
    expect.assertions(2);

    const [useCounter, CounterProvider] = createContext(0, {
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
      const [count] = useCounter();

      return `count: ${count}`;
    };

    const { wrapper, getContext } = CounterProvider.makeProviderWrapper();

    const { getByText, rerender } = render(<Children />, {
      wrapper,
    });

    const context = getContext();

    jest.spyOn(context.actions, 'increase').mockImplementation(() => {
      context.setState((prev) => prev + 10);
    });

    expect(getByText('count: 0')).toBeTruthy();

    context.actions.increase();

    rerender(<Children />);

    expect(getByText('count: 10')).toBeTruthy();
  });

  it('should allow wrappers with initial value for testing', () => {
    expect.assertions(1);

    const [useCounter, CounterProvider] = createContext(0);

    const Children = () => {
      const [count] = useCounter();

      return `count: ${count}`;
    };

    const { wrapper } = CounterProvider.makeProviderWrapper({
      value: 2,
    });

    const { getByText } = render(<Children />, {
      wrapper,
    });

    expect(getByText('count: 2')).toBeTruthy();
  });
});
