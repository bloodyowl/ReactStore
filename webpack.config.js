module.exports = {
  entry: {
    "mutation": "./examples/mutation",
  },
  output: {
    path: "./dist",
    filename: "[name].js",
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: "babel-loader",
      },
    ],
  },
}
