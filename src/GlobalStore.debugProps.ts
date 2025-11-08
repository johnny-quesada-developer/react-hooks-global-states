const debugProps = globalThis as typeof globalThis & {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  REACT_GLOBAL_STATE_HOOK_DEBUG?: ($this: unknown, args: undefined | {}, invokerStackHash: string) => void;
  isDevToolsPresent: boolean;
};

debugProps.isDevToolsPresent = Boolean(debugProps.REACT_GLOBAL_STATE_HOOK_DEBUG);

export default debugProps;
