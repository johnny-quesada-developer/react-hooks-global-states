import { isNil } from 'json-storage-formatter/isNil';

const debugProps = globalThis as typeof globalThis & {
  REACT_GLOBAL_STATE_HOOK_DEBUG?: ($this: unknown, args: undefined | {}, invokerStackHash: string) => void;
  REACT_GLOBAL_STATE_TEMP_HOOKS: Map<string, [unknown, unknown]> | null;
  sessionStorage?: { getItem: (key: string) => string | null };
  isDevToolsPresent: boolean;
  reportToDevTools: (
    store: Record<string, unknown>,
    args: Record<string, unknown>,
    globalHookStackHash: string
  ) => void;
};

// devtools fallback for page reloads during debugging sessions
(() => {
  // monkey path is already in place, no fallback is needed
  if (debugProps.REACT_GLOBAL_STATE_HOOK_DEBUG) return;

  // if this is not a web environment or the session storage is not available, we don't need to do anything
  if (isNil(debugProps.sessionStorage)) return;

  try {
    // Safary could potentially throw an error if the session storage is disabled
    const isDebugging = debugProps.sessionStorage.getItem('REACT_GLOBAL_STATE_HOOK_DEBUG');
    if (!isDebugging) return;
  } catch (error) {
    return;
  }

  debugProps.REACT_GLOBAL_STATE_TEMP_HOOKS = new Map();

  // clear the temp hooks after 1 minute
  setTimeout(() => {
    debugProps.REACT_GLOBAL_STATE_TEMP_HOOKS = null;
  }, 60_000);
})();

debugProps.isDevToolsPresent = Boolean(
  debugProps.REACT_GLOBAL_STATE_HOOK_DEBUG || debugProps.REACT_GLOBAL_STATE_TEMP_HOOKS
);

debugProps.reportToDevTools = (store, args, globalHookStackHash) => {
  if (debugProps.REACT_GLOBAL_STATE_HOOK_DEBUG) {
    debugProps.REACT_GLOBAL_STATE_HOOK_DEBUG(store, args, globalHookStackHash);
  } else if (debugProps.REACT_GLOBAL_STATE_TEMP_HOOKS) {
    // if available use the WeakRef to store the hooks so we could potentially prevent processing hooks that are not used anymore
    const temp = typeof globalThis.WeakRef !== 'undefined' ? new globalThis.WeakRef(store) : store;
    const tempArgs = typeof globalThis.WeakRef !== 'undefined' ? new globalThis.WeakRef(args) : args;
    debugProps.REACT_GLOBAL_STATE_TEMP_HOOKS.set(globalHookStackHash, [temp, tempArgs]);
  }
};

export default debugProps;
