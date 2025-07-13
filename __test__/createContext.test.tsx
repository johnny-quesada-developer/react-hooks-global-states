import React from 'react';
import { createContext } from '..';
import { renderHook } from '@testing-library/react';

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

    setState((prev) => ({ ...prev, count: prev.count + 1 }));
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

    setState((prev) => ({ ...prev, count: prev.count + 1 }));
    rerender();

    [state] = result.current;

    expect(state).toEqual(4);
  });
});
