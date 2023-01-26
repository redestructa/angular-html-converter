const webpack = require('webpack')
const path = require('path')

module.exports = {
    watch: true,
    entry: {
        hmCon: path.resolve(__dirname, 'index.ts')
    },
    module: {
        rules: [
            {
                test: [/\.ts$/],
                exclude: [/node_modules/],
                loader: 'ts-loader'
            }
        ]
    },
    resolve: {
        modules: [path.resolve(__dirname, '../node_modules')],
        extensions: ['.ts', '.js']
    },
    output: {
        chunkFilename: '[name].js',
        path: path.resolve(__dirname, '../dist'),
        library: "hmCon",   // Important
        libraryTarget: 'umd',   // Important
        filename: '[name].js'
    },
    mode: 'development',
    plugins: [],
    devtool: 'source-map',
    optimization: {
        splitChunks: false
    }
}
