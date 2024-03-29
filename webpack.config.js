/* eslint-disable @typescript-eslint/no-var-requires */
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

function template({componentName, props, jsx}, {tpl}) {
	return tpl`const React = require("react");
const ${componentName} = (${props}) => ${jsx}
module.exports = ${componentName}`;
}

module.exports = (env) => [{
	entry: "./src/main.tsx",
	output: {filename: "main.js"},
	plugins: [new MiniCssExtractPlugin({filename: "styles.css"})],
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [
					MiniCssExtractPlugin.loader,
					{loader: "css-loader", options: {url: false, modules: {
						localIdentName: "[name]__[local]--[hash:base64:5]",
						exportLocalsConvention: "camelCase",
					}}},
				],
			}, {
				test: /.svg$/,
				use: [{
					loader: "@svgr/webpack",
					options: {template},
				}],
			}, {
				test: /\.(t|j)sx?$/,
				exclude: /node_modules/,
				use: "babel-loader",
			}, {
				test: /\.worker\.js$/,
				use: {
					loader: "worker-loader",
					options: {publicPath: "/dist/"},
				},
			},
		],
	},
	resolve: {extensions: [".js", ".jsx", ".ts", ".tsx", ".json", ".css", ".svg"]},
	mode: env === "prod" ? "production" : "development",
	devtool: env === "prod" ? "" : "cheap-module-source-map",
	devServer: {
		open: true,
		port: 8085,
		static: {directory: __dirname + "/"},
	},
}, {
	entry: "./src/service-worker.js",
	output: {path: __dirname + "/", filename: "service-worker.js"},
	module: {
		rules: [{
			test: /\.jsx$/,
			exclude: /node_modules/,
			use: "babel-loader",
		}],
	},
	mode: env === "prod" ? "production" : "development",
	devtool: env === "prod" ? "" : "cheap-module-source-map",
}];
