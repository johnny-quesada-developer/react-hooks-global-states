/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

const individualEntries = {
  createContext: './src/createContext.ts',
  GlobalStore: './src/GlobalStore.ts',
  createGlobalState: './src/createGlobalState.ts',
  types: './src/types.ts',
  isRecord: './src/isRecord.ts',
  shallowCompare: './src/shallowCompare.ts',
  throwWrongKeyOnActionCollectionConfig: './src/throwWrongKeyOnActionCollectionConfig.ts',
  uniqueId: './src/uniqueId.ts',
};

const generateExternalEntryMappings = () => {
  const keys = Object.keys(individualEntries);
  return keys.reduce((acc, key) => {
    acc[`./${key}`] = `./${key}.js`;
    return acc;
  }, {});
};

module.exports = {
  mode: 'production',
  entry: {
    bundle: './src/index.ts',
    ...individualEntries,
  },
  externals: {
    react: 'react',

    'json-storage-formatter': 'json-storage-formatter',
    'json-storage-formatter/isNil': 'json-storage-formatter/isNil',
    'json-storage-formatter/isNumber': 'json-storage-formatter/isNumber',
    'json-storage-formatter/isBoolean': 'json-storage-formatter/isBoolean',
    'json-storage-formatter/isString': 'json-storage-formatter/isString',
    'json-storage-formatter/isDate': 'json-storage-formatter/isDate',
    'json-storage-formatter/isRegex': 'json-storage-formatter/isRegex',
    'json-storage-formatter/isFunction': 'json-storage-formatter/isFunction',
    'json-storage-formatter/isPrimitive': 'json-storage-formatter/isPrimitive',
    'json-storage-formatter/types': 'json-storage-formatter/types',
    'json-storage-formatter/formatFromStore': 'json-storage-formatter/formatFromStore',
    'json-storage-formatter/formatToStore': 'json-storage-formatter/formatToStore',

    ...generateExternalEntryMappings(),
  },
  output: {
    path: path.resolve(__dirname),
    filename: ({ chunk: { name } }) => {
      return `${name}.js`;
    },
    libraryTarget: 'umd',
    library: 'react-hooks-global-states',
    globalObject: 'this',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        extractComments: false,
        terserOptions: {
          compress: {
            passes: 5,
            drop_console: true,
            drop_debugger: true,
            keep_fargs: false,
            keep_infinity: true,
            reduce_funcs: true,
            reduce_vars: true,
            keep_fnames: false,
            toplevel: true,
          },
          mangle: {
            toplevel: true,
            properties: false,
          },
          format: {
            comments: false,
          },
        },
      }),
    ],
  },
};
