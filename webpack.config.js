const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    bundle: './src/index.ts',
    createContext: './src/createContext.ts',
    GlobalStore: './src/GlobalStore.ts',
    GlobalStoreAbstract: './src/GlobalStoreAbstract.ts',
    createCustomGlobalState: './src/functionHooks.createCustomGlobalState.ts',
    createGlobalState: './src/functionHooks.createGlobalState.ts',
    combineRetrieverAsynchronously: './src/combiners.combineRetrieverAsynchronously.ts',
    combineRetrieverEmitterAsynchronously: './src/combiners.combineRetrieverEmitterAsynchronously.ts',
    types: './src/types.ts',
    debounce: './src/utils.debounce.ts',
    isRecord: './src/utils.isRecord.ts',
    shallowCompare: './src/utils.shallowCompare.ts',
    throwWrongKeyOnActionCollectionConfig: './src/utils.throwWrongKeyOnActionCollectionConfig.ts',
    uniqueId: './src/utils.uniqueId.ts',
    uniqueSymbol: './src/utils.uniqueSymbol.ts',
    useConstantValueRef: './src/utils.useConstantValueRef.ts',
  },
  externals: {
    react: 'react',
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
    alias: {
      'react-hooks-global-states': path.resolve(
        __dirname,
        'node_modules/react-hooks-global-states/package.json'
      ),
    },
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
