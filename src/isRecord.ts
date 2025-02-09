import { isNil } from 'json-storage-formatter/isNil';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  !isNil(value) && typeof value === 'object';
