import { GlobalStoreAbstract } from '../src/GlobalStoreAbstract';

import {
  ActionCollectionConfig,
  GlobalStoreConfig,
  StateChanges,
  StoreTools,
} from '../src/GlobalStore.types';

import { formatFromStore, formatToStore } from 'json-storage-formatter';
import { getFakeAsyncStorage } from './getFakeAsyncStorage';
import { createCustomGlobalState } from '../src/GlobalStore.functionHooks';

export const { fakeAsyncStorage: asyncStorage } = getFakeAsyncStorage();

export class GlobalStore<
  State,
  Metadata extends {
    asyncStorageKey?: string;
    isAsyncStorageReady?: boolean;
  } = {},
  ActionsConfig extends ActionCollectionConfig<State, Metadata> | null | {} = null
> extends GlobalStoreAbstract<State, Metadata, ActionsConfig> {
  constructor(state: State, config?: GlobalStoreConfig<State, Metadata>, actionsConfig?: ActionsConfig) {
    super(state, config, actionsConfig);

    this.initialize();
  }

  protected onInitialize = async ({
    setState,
    setMetadata,
    getMetadata,
    getState,
  }: StoreTools<State, Metadata>) => {
    const metadata = getMetadata();
    const asyncStorageKey = metadata?.asyncStorageKey;

    if (!asyncStorageKey) return;

    const storedItem = (await asyncStorage.getItem(asyncStorageKey)) as string;
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

  protected onChange = ({ getMetadata, getState }: StoreTools<State, Metadata> & StateChanges<State>) => {
    const asyncStorageKey = getMetadata()?.asyncStorageKey;

    if (!asyncStorageKey) return;

    const state = getState();

    const formattedObject = formatToStore(state, {
      stringify: true,
    });

    asyncStorage.setItem(asyncStorageKey, formattedObject);
  };
}

type BaseMetadata = {
  isAsyncStorageReady?: boolean;
};

type HookConfig = {
  asyncStorageKey?: string;
};

export const createGlobalState = createCustomGlobalState<BaseMetadata, HookConfig>({
  onInitialize: async ({ setState, setMetadata }, config) => {
    setMetadata((metadata) => ({
      ...(metadata ?? {}),
      isAsyncStorageReady: null,
    }));

    const asyncStorageKey = config?.asyncStorageKey;
    if (!asyncStorageKey) return;

    const storedItem = (await asyncStorage.getItem(asyncStorageKey)) as string;

    setMetadata((metadata) => ({
      ...metadata,
      isAsyncStorageReady: true,
    }));

    if (storedItem === null) {
      return setState((state) => state, { forceUpdate: true });
    }

    const parsed = formatFromStore(storedItem, {
      jsonParse: true,
    });

    setState(parsed, { forceUpdate: true });
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
