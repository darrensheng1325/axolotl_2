const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

// Common configuration
const commonConfig = {
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            }
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        fallback: {
            "fs": false,
            "path": require.resolve("path-browserify"),
            "crypto": require.resolve("crypto-browserify"),
            "stream": require.resolve("stream-browserify"),
            "buffer": require.resolve("buffer/"),
            "util": require.resolve("util/"),
            "http": require.resolve("stream-http"),
            "https": require.resolve("https-browserify"),
            "zlib": require.resolve("browserify-zlib"),
            "net": false,
            "tls": false,
            "child_process": false
        }
    },
    plugins: [
        new NodePolyfillPlugin(),
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
            process: 'process/browser'
        })
    ],
};

// Client configuration
const clientConfig = {
    ...commonConfig,
    entry: './src/index.ts',
    target: 'web',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    plugins: [
        ...commonConfig.plugins,
        new CopyWebpackPlugin({
            patterns: [
                { from: 'src/index.html', to: 'index.html' },
                { from: 'host.html', to: 'host.html' },
                { from: 'src/styles.css', to: 'styles.css' },
                { from: 'assets', to: 'assets' }
            ],
        }),
    ],
};

// Worker configuration
const workerConfig = {
    ...commonConfig,
    entry: './src/server_host.ts',
    target: 'webworker',
    output: {
        filename: 'server_worker.js',
        path: path.resolve(__dirname, 'dist'),
    },
};

module.exports = [clientConfig, workerConfig];
