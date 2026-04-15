import path from "node:path";
import { fileURLToPath } from "url";
//import webpack from "webpack";

// in case you run into any TypeScript error when configuring `devServer`
import "webpack-dev-server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
    entry: "./client/src/script.ts",
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
    output: {
        filename: "main.js",
        path: path.resolve(__dirname, "client", "public", "dist"),
    },
    devtool: process.env.NODE_ENV === 'production' ? false : [
        { type: "javascript", use: "source-map" },
    ],
};

export default config;