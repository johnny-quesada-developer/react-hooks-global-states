const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    bundle: './src/index.ts',
    createContext: './src/createContext.ts',
    GlobalStore: './src/GlobalStore.ts',
    GlobalStoreAbstract: './src/GlobalStoreAbstract.ts',
    createCustomGlobalState: './src/createCustomGlobalState.ts',
    createGlobalState: './src/createGlobalState.ts',
    types: './src/types.ts',
    debounce: './src/debounce.ts',
    isRecord: './src/isRecord.ts',
    shallowCompare: './src/shallowCompare.ts',
    throwWrongKeyOnActionCollectionConfig: './src/throwWrongKeyOnActionCollectionConfig.ts',
    uniqueId: './src/uniqueId.ts',
    uniqueSymbol: './src/uniqueSymbol.ts',
    useStableState: './src/useStableState.ts',
    generateStackHash: './src/generateStackHash.ts',
  },
  externals: [
    'react',
    'json-storage-formatter',
    ({ request }, callback) => {
      request = String(request);

      const isMainBundle = request === './src/index.ts';
      if (isMainBundle) return callback();

      const isJSONStorageFormatter = request.startsWith('json-storage-formatter');
      if (isJSONStorageFormatter) return callback(null, request);

      // thread local imports as externals
      const isLocal = request.startsWith('./src/');
      if (isLocal) {
        const filename = path.basename(request, '.ts') + '.js';
        return callback(null, `./${filename}`);
      }

      callback();
    },
  ],
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
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'],
              plugins: [
                '@babel/plugin-transform-modules-commonjs',
                '@babel/plugin-proposal-class-properties',
                '@babel/plugin-proposal-export-namespace-from',
              ],
            },
          },
          {
            loader: 'ts-loader',
          },
        ],
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
          format: {
            comments: false,
          },
        },
      }),
    ],
  },
};
