const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        config: './app/javascripts/config.js',
        index: './app/javascripts/index.js',
    },
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: "[name].js"
    },
    plugins: [
        // Copy our app's index.html to the build folder.
        new CopyWebpackPlugin([
            {from: './app/index.html', to: "index.html"}
        ])
    ],
    module: {
        rules: [
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
        ],
        loaders: [
            {test: /\.json$/, use: 'json-loader'},
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/,
                loader: 'babel-loader',
                query: {
                    presets: ['es2015','stage-0'],
                    plugins: ['syntax-async-functions','transform-regenerator'],
                    optional: ['runtime']

                }
            }
        ]
    }
}
