module.exports = {
  entry: {
    "mutation": "./examples/mutation",
    "lists": "./examples/lists",
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
