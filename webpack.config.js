const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    // 開発用の設定
    mode: 'development',
  
    // エントリポイントとなるコード
    entry: './src/main.ts',
  
    // バンドル後の js ファイルの出力先
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'index.js'
    },
  
    // ソースマップファイルの出力設定
    devtool: 'source-map',
  
    module: {
      rules: [
        // TypeScript ファイルの処理方法
        {
          test: /\.ts$/,
          use: "ts-loader",
          include: path.resolve(__dirname, 'src'),
          exclude: /node_modules/
        },     {
          test: /(\.s[ac]ss)$/,
          use: [
            "style-loader", // creates style nodes from JS strings
            "css-loader", // translates CSS into CommonJS
            "postcss-loader", // 追記
            "sass-loader" // compiles Sass to CSS, using Node Sass by default
          ]
        },
      ]
    },
    resolve: {
      modules: [
          "node_modules", // node_modules内も対象とする
      ],
      extensions: [".tsx", ".ts", ".js"]
    },
  
    plugins: [
      // HTML ファイルの出力設定
      new HtmlWebpackPlugin({
        template: './src/index.html'
      })
    ],
    devServer: {
        contentBase: `${__dirname}/dist`,
        port: 8080,
        open: true
    }
  };
