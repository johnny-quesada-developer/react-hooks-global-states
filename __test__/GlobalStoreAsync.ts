import {
  type ActionCollectionConfig,
  type GlobalStoreCallbacks,
  type StateChanges,
  type StoreTools,
  GlobalStoreAbstract,
  createCustomGlobalState,
} from '..';
import { formatFromStore } from 'json-storage-formatter/formatFromStore';
import { formatToStore } from 'json-storage-formatter/formatToStore';
import { getFakeAsyncStorage } from './getFakeAsyncStorage';
import { act } from 'react';

export const { fakeAsyncStorage: asyncStorage } = getFakeAsyncStorage();

export class GlobalStore<
  State,
  Metadata extends {
    isAsyncStorageReady?: boolean;
  },
  ActionsConfig extends ActionCollectionConfig<State, Metadata> | unknown
> extends GlobalStoreAbstract<State, Metadata, ActionsConfig> {
  public asyncStorageKey?: string;

  constructor(
    state: State,
    args: {
      metadata?: Metadata;
      callbacks?: GlobalStoreCallbacks<State, Metadata>;
      actions?: ActionsConfig;
      name?: string;
      asyncStorageKey?: string;
    } = {}
  ) {
    const { asyncStorageKey, ...rest } = args;
    super(state, rest);

    this.asyncStorageKey = asyncStorageKey;

    this.initialize();
  }

  protected onInitialize = async ({
    setState,
    setMetadata,
    getMetadata,
    getState,
  }: StoreTools<State, Metadata>) => {
    if (!this.asyncStorageKey) return;

    const metadata = getMetadata();
    const storedItem = (await asyncStorage.getItem(this.asyncStorageKey)) as string;

    setMetadata({
      ...metadata,
      isAsyncStorageReady: true,
    });

    if (storedItem === null) {
      const state = getState();

      // force the re-render of the subscribed components even if the state is the same
      return setState(state, { forceUpdate: true });
    }

    const items = formatFromStore<State>(storedItem, {
      jsonParse: true,
    });

    setState(items, { forceUpdate: true });
  };

  protected onChange = ({ getState }: StoreTools<State, Metadata> & StateChanges<State>) => {
    const asyncStorageKey = this.asyncStorageKey;

    if (!asyncStorageKey) return;

    const state = getState();

    const formattedObject = formatToStore(state, {
      stringify: true,
    });

    asyncStorage.setItem(asyncStorageKey, formattedObject);
  };
}

export const createGlobalState = createCustomGlobalState<
  {
    asyncStorageKey?: string;
  },
  {
    isAsyncStorageReady?: boolean;
  }
>({
  onInitialize: async ({ setState, setMetadata }, config) => {
    setMetadata((metadata) => ({
      ...(metadata ?? {}),
      isAsyncStorageReady: undefined,
    }));

    const asyncStorageKey = config?.asyncStorageKey;
    if (!asyncStorageKey) return;

    const storedItem = (await asyncStorage.getItem(asyncStorageKey)) as string;

    setMetadata((metadata) => ({
      ...metadata,
      isAsyncStorageReady: true,
    }));

    if (storedItem === null) {
      return setState((state: unknown) => state, { forceUpdate: true });
    }

    const parsed = formatFromStore(storedItem, {
      jsonParse: true,
    });

    act(() => {
      setState(parsed, { forceUpdate: true });
    });
  },

  onChange: ({ getState }, config) => {
    if (!config?.asyncStorageKey) return;

    const state = getState();

    const formattedObject = formatToStore(state, {
      stringify: true,
    });

    asyncStorage.setItem(config.asyncStorageKey, formattedObject);
  },
});
