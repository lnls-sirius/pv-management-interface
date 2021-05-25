const path = require('path');
const ESLintPlugin = require('eslint-webpack-plugin');

module.exports = {
    plugins: [new ESLintPlugin()],
    module: {
        rules: [{
            test: /\.css$/i,
            use: ['style-loader', 'css-loader']
        }, ],
    },
    entry: './src/js/index.js',
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist'),
    },
};