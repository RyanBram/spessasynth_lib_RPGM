import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import babel from "@rollup/plugin-babel";
import terser from "@rollup/plugin-terser";
import path from "path";
import { fileURLToPath } from "url";
import injectWorkletCode from "./build_scripts/rollup-plugin-inject-worklet.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Step 1: Build worklet processor sebagai string
const workletConfig = {
    input: "src/worklet_processor_rpgmv.ts", // Use adapter file
    output: {
        file: "temp/worklet_processor_bundle.js",
        format: "iife",
        name: "WorkletProcessor"
    },
    plugins: [
        resolve({
            browser: true,
            preferBuiltins: false
        }),
        commonjs(),
        typescript({
            tsconfig: "./tsconfig.json",
            declaration: false,
            declarationMap: false,
            compilerOptions: {
                noEmit: false,
                allowImportingTsExtensions: false,
                outDir: "./temp"
            }
        }),
        babel({
            babelHelpers: "bundled",
            presets: [
                [
                    "@babel/preset-env",
                    {
                        targets: { chrome: "85" },
                        useBuiltIns: "usage",
                        corejs: 3
                    }
                ]
            ],
            extensions: [".js", ".ts"],
            exclude: "node_modules/**"
        }),
        terser({
            compress: {
                drop_console: false,
                pure_funcs: []
            }
        })
    ]
};

// Step 2: Build main library dengan worklet inline
const mainConfig = {
    input: "src/index_rpgmv.ts", // Use adapter file
    output: {
        file: "js/plugins/spessasynth_lib.js",
        format: "iife",
        name: "SpessaSynthLib",
        sourcemap: true
    },
    plugins: [
        resolve({
            browser: true,
            preferBuiltins: false
        }),
        commonjs(),
        typescript({
            tsconfig: "./tsconfig.json",
            declaration: false,
            declarationMap: false,
            compilerOptions: {
                noEmit: false,
                allowImportingTsExtensions: false,
                outDir: "./js/plugins"
            }
        }),
        // Inject worklet code AFTER TypeScript, BEFORE Babel
        injectWorkletCode(),
        babel({
            babelHelpers: "bundled",
            presets: [
                [
                    "@babel/preset-env",
                    {
                        targets: { chrome: "85" },
                        useBuiltIns: "usage",
                        corejs: 3
                    }
                ]
            ],
            extensions: [".js", ".ts"],
            exclude: "node_modules/**"
        }),
        terser({
            compress: {
                drop_console: false,
                pure_funcs: []
            }
        })
    ]
};

export default [workletConfig, mainConfig];
