// @ts-check

/**
 * Tests run against the COMPILED output in `dist/` by default, so we exercise the
 * exact artifact that gets published (minification, dual ESM/CJS emit, `__esModule`
 * interop shape, etc.) instead of the raw TypeScript source.
 *
 * Toggle to the source with:  TEST_TARGET=src yarn jest
 * (useful for quick iteration/coverage against `src`, and for debugging with
 * original identifiers).
 *
 * How it works: test files import from the `@react-hooks-global-states` alias (barrel)
 * or `@react-hooks-global-states/<name>` (subpath). At RUNTIME, `moduleNameMapper`
 * points that alias at `src` or `dist`. For type-checking, tsconfig `paths` always
 * points the alias at `src`, so we get source-level type safety while executing
 * whichever build we selected.
 */
const target = process.env.TEST_TARGET === 'src' ? 'src' : 'dist';

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  collectCoverageFrom: ['./src/*.ts', './__tests__/*.tsx', './__tests__/*.ts'],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'html'],
  setupFilesAfterEnv: ['./jestSetup.ts'],
  // Keep `dist/` out of test discovery and Jest's haste map (otherwise `dist/package.json`
  // collides with the root one). Modules under `dist/` are still reachable because
  // `moduleNameMapper` resolves the alias to explicit files, not via haste/discovery.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/dist/'],
  modulePathIgnorePatterns: ['<rootDir>/dist/package.json'],
  haste: {
    // Don't index `dist/` for haste; avoids the duplicate-name warning.
    retainAllFiles: false,
  },
  transform: {
    // Use the test tsconfig so ts-jest resolves the `@react-hooks-global-states` alias
    // (`paths`) during type-checking, matching what the editor / `ts-check:tests` use.
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/__test__/tsconfig.json' }],
  },
  moduleNameMapper: {
    // Order matters: match the subpath form before the bare barrel.
    // The barrel points at the package entry file directly (dist has no index.js).
    '^@react-hooks-global-states$':
      target === 'dist' ? '<rootDir>/dist/bundle.cjs' : '<rootDir>/src/index.ts',
    '^@react-hooks-global-states/(.*)$': `<rootDir>/${target}/$1`,
  },
};

module.exports = config;
