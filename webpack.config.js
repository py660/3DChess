import path from "node:path";
import {fileURLToPath} from "url";
//import webpack from "webpack";
// in case you run into any TypeScript error when configuring `devServer`
import "webpack-dev-server";
import nodeExternals from "webpack-node-externals";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// const logicConfig = {
//     target: "node",
//     entry: "./logic/src/index.ts",
//     module: {
//         rules: [
//             {
//                 test: /\.tsx?$/,
//                 use: "ts-loader",
//                 exclude: /node_modules/,
//             },
//         ],
//     },
//     resolve: {
//         extensions: [".tsx", ".ts", ".js"],
//         alias: {
//             three: path.resolve(__dirname, 'node_modules', 'three'),
//         },
//     },
//     output: {
//         // iife: true,
//         libraryTarget: 'module',
//         // library: "3dchess-logic",
//         filename: "index.js",
//         path: path.resolve(__dirname, "logic", "dist"),
//     },
//     experiments: {
//         outputModule: true
//     },
//     devtool: process.env.NODE_ENV === 'production' ? false : [
//         { type: "javascript", use: "source-map" },
//     ],
//     // externals: {
//     //     "logic": path.resolve(__dirname, "./3chess-logic")
//     // }
// };

const clientConfig = {
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
        alias: {
            'logic': path.resolve(__dirname, 'logic', 'src'),
        },
    },
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "client", "public", "dist"),
        // chunkFilename: '[id].[chunkhash].js',
    },
    devtool: process.env.NODE_ENV === 'production' ? false : [
        {type: "javascript", use: "source-map"},
    ],
    // optimization: {
    //     splitChunks: {
    //         chunks: "all",
    //     },
    // },
    // externals: {
    //     "logic": path.resolve(__dirname, "./3chess-logic")
    // }
};

const serverConfig = {
    target: "node",
    entry: "./server/src/index.ts",
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
        alias: {
            'logic': path.resolve(__dirname, 'logic', 'src'),
        },
        // modules: [path.resolve(__dirname), "node_modules"],
    },
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "server", "dist"),
        // chunkFilename: '[id].[chunkhash].js',
    },
    devtool: process.env.NODE_ENV === 'production' ? false : [
        {type: "javascript", use: "source-map"},
    ],
    externalsPresets: {node: true},
    // externalsType: "module",
    experiments: {
        outputModule: true,
    },
    externals: [nodeExternals({
        importType: "module",
        // allowlist: ['3dchess-logic']
    })],
    // optimization: {
    //     splitChunks: {
    //         chunks: "all",
    //     },
    // },
    // externals: {
    //     "logic": path.resolve(__dirname, "./3chess-logic")
    // }
};

export default [/*logicConfig, */clientConfig, serverConfig];