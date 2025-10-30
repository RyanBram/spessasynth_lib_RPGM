## **How to build spessasynth_lib for NW.js 0.48.4**

### **Overview**

This guide covers building spessasynth_lib for RPG Maker MV (NW.js 0.48.4 / Chromium 85). You have two build strategies available:

1. **Separate Build** (Original): Generates two separate files - `spessasynth_lib.js` and `spessasynth_processor.js`
2. **Single-File Build** (Rollup-based): Generates one consolidated file with inline worklet processor

Both approaches support minified and unminified builds.

### **Can I Switch Between Build Methods?**

**Yes!** Once you complete the setup, you can switch between them at any time **without modifying your original source code**.

**Key Innovation: Adapter Files**

This guide uses **adapter files** (`src/index_rpgmv.ts` and `src/worklet_processor_rpgmv.ts`) as compatibility layers. This approach:

- ✅ **Keeps original source code clean** - No polyfill imports in `src/index.ts` or `src/worklet_processor.ts`
- ✅ **Easy library updates** - When the library author releases updates, you can update without conflicts
- ✅ **Zero switching cost** - Run either build command anytime without code changes
- ✅ **Separation of concerns** - Compatibility logic is separate from core library code

**After one-time setup:**

```bash
npm run build:rpgmv          # Separate build (2 files)
npm run build:rpgmv:rollup   # Single-file build (1 file)
```

Both commands work independently and don't interfere with each other.

---

## **Build Strategy 1: Separate Build (esbuild + Babel)**

This is the original approach that produces two separate files. Best for scenarios where you need maximum flexibility and debugging capability.

### **Strategy**

We will create a build script that transpiles your TypeScript source files (`src/index.ts` and `src/worklet_processor.ts`) using esbuild and Babel, producing two separate files in the `js/plugins/` folder.

---

### **Step 1: Installing Babel Dependencies**

First, we need to add several development packages to your project.
Open a terminal or command prompt in your project root directory and run the following command:

```bash
npm install --save-dev @babel/core @babel/cli @babel/preset-env core-js
```

Brief explanation of these packages:

- **@babel/core:** The core of Babel — the main transpiling engine.
- **@babel/cli:** Allows you to run Babel from the command line or a script.
- **@babel/preset-env:** A smart preset that automatically determines the necessary Babel plugins and `core-js` polyfills based on the target environment (in this case, Chromium 85).
- **core-js:** A library providing polyfills for modern JavaScript features.

---

### **Step 2: Installing regenerator-runtime**

We also need this to ensure that `async/await` features (if used) can be properly transpiled.

```bash
npm install --save-dev regenerator-runtime
```

---

### **Step 3: Configuring Babel**

Create a new file in your project root directory named `babel.config.json`.
This file will tell Babel how to transpile your code.

**babel.config.json**

```json
{
    "presets": [
        [
            "@babel/preset-env",
            {
                "targets": {
                    "chrome": "85"
                }
            }
        ]
    ]
}
```

Configuration explanation:

- `"targets": { "chrome": "85" }`: This is the most important part.
  It tells Babel to generate code compatible with Chromium version 85.

---

### **Step 4: Create RPG Maker MV Adapter Files**

Instead of modifying the original source files, we'll create **adapter files** that add ES5 compatibility without touching the core library code.

**Why use adapters?**

- Keeps original source code clean
- Makes library updates easier
- Separates compatibility concerns from core functionality

**Create these two new files:**

**1. src/worklet_processor_rpgmv.ts** (Worklet Processor Adapter)

```typescript
/**
 * RPG Maker MV Adapter for Worklet Processor
 *
 * This file serves as a compatibility layer for building spessasynth_lib
 * for RPG Maker MV (NW.js 0.48.4 / Chromium 85).
 *
 * It adds ES5 polyfills and re-exports everything from the original
 * worklet processor without modifying the source code.
 */

// Polyfills for ES5 compatibility
import "core-js/stable";
import "regenerator-runtime/runtime";

// Re-export everything from original worklet processor
export * from "./worklet_processor.ts";
```

**2. src/index_rpgmv.ts** (Main Library Adapter)

```typescript
/**
 * RPG Maker MV Adapter for SpessaSynth Library
 *
 * This file serves as a compatibility layer for building spessasynth_lib
 * for RPG Maker MV (NW.js 0.48.4 / Chromium 85).
 *
 * It adds ES5 polyfills and re-exports everything from the original
 * library without modifying the source code.
 */

// Polyfills for ES5 compatibility
import "core-js/stable";
import "regenerator-runtime/runtime";

// Re-export everything from original index
export * from "./index.ts";

/**
 * Creates a Blob URL from the inline worklet processor code.
 * This function is only available in the single-file Rollup build.
 *
 * For the separate build, this will be a no-op placeholder that won't be used.
 * The actual implementation is injected by a Rollup plugin during build.
 *
 * @returns A Blob URL that can be used with audioWorklet.addModule()
 */
export function createWorkletBlobURL(): string {
    // This placeholder will be replaced by Rollup build
    // In separate build, this function exists but should not be called
    throw new Error(
        "createWorkletBlobURL is only available in single-file Rollup build"
    );
}
```

**Important:** These adapters do NOT modify your original `src/index.ts` or `src/worklet_processor.ts` files!

---

### **Step 5: Changing the WorkletSynthesizerProcessor Class Definition**

**Note:** This step modifies the **original** `src/worklet_processor.ts` file. This is a one-time change needed for ES5 compatibility regardless of which build method you use.

We need to modify how the `process` method is defined to make it more "traditional" and easier for older browsers to recognize after transpilation.

Currently, your code might look like this, where `process` is defined as a class property inside the constructor:

```ts
// src/worklet_processor.ts (Original version)
class WorkletSynthesizerProcessor extends AudioWorkletProcessor {
    process; // <-- Declared as a class field
    core: WorkletSynthesizerCore;

    constructor(options) {
        super();
        this.core = new WorkletSynthesizerCore(/*...*/);
        this.process = this.core.process.bind(this.core); // <-- Assigned in constructor
    }
}
```

We’ll change it into a standard class method that calls the `process` method from `core`.
This pattern is much more compatible.

**1: Edit the File `src/worklet_processor.ts`**

Open the file `src/worklet_processor.ts` in your code editor.

**2: Replace the Entire WorkletSynthesizerProcessor Class**

Replace the entire `WorkletSynthesizerProcessor` class block with the fixed version below.

**src/worklet_processor.ts (Fixed Version)**

```ts
import { SpessaSynthCoreUtils } from "spessasynth_core";
import { consoleColors } from "./utils/other.ts";
import { WORKLET_PROCESSOR_NAME } from "./synthesizer/worklet/worklet_processor_name.ts";
import type { PassedProcessorParameters } from "./synthesizer/types.ts";
import { WorkletSynthesizerCore } from "./synthesizer/worklet/worklet_synthesizer_core.ts";

class WorkletSynthesizerProcessor extends AudioWorkletProcessor {
    // The declaration "process" as a class field has been removed

    private readonly core: WorkletSynthesizerCore;

    public constructor(options: {
        processorOptions: PassedProcessorParameters;
    }) {
        super();
        this.core = new WorkletSynthesizerCore(
            sampleRate, // AudioWorkletGlobalScope
            currentTime, // AudioWorkletGlobalScope, sync with audioContext time
            this.port,
            options.processorOptions
        );
        // The line "this.process = ..." has been removed
    }

    /**
     * The 'process' method is now defined as a standard class method.
     * This ensures compatibility with older browsers after transpilation.
     */
    public process(
        inputs: Float32Array[][],
        outputs: Float32Array[][],
        parameters: Record<string, Float32Array>
    ): boolean {
        // Simply forward the call to the 'process' method of 'core'
        return this.core.process(inputs, outputs, parameters);
    }
}

registerProcessor(WORKLET_PROCESSOR_NAME, WorkletSynthesizerProcessor);
SpessaSynthCoreUtils.SpessaSynthInfo(
    "%cProcessor successfully registered!",
    consoleColors.recognized
);
```

**Main changes:**

- **NO polyfill imports** - These are handled by the adapter files
- Removed `process;` from the class property declaration
- Removed `this.process = ...` from the constructor
- Added an explicit `process()` method to the class, acting as a pass-through to `this.core.process`

This ensures that after Babel transpiles the code, a valid `WorkletSynthesizerProcessor.prototype.process` exists, which will be successfully detected by `registerProcessor`.

---

### **Step 6: Creating the Separate Build Script**

We’ll create a new script using esbuild for initial bundling (since it’s fast), then pass it to Babel for compatibility transpiling — a good _hybrid_ approach.

Create a new file under `build_scripts/` named `build_rpgmv.ts`.

**build_scripts/build_rpgmv.ts**

```ts
import path from "path";
import esbuild from "esbuild";
import { execSync } from "child_process";

console.log("Building for RPG Maker MV (Chromium 85)...");

const dirname = import.meta.dirname;
const projectRoot = path.join(dirname, "..");
const outDir = path.join(projectRoot, "js", "plugins");

// Ensure the output directory exists
import fs from "fs";
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

// Define input and output files (temporary and final)
const filesToBuild = [
    {
        input: path.join(projectRoot, "src", "index_rpgmv.ts"), // Use adapter file
        tempOutput: path.join(outDir, "temp_index.js"),
        finalOutput: path.join(outDir, "spessasynth_lib.js")
    },
    {
        input: path.join(projectRoot, "src", "worklet_processor_rpgmv.ts"), // Use adapter file
        tempOutput: path.join(outDir, "temp_processor.js"),
        finalOutput: path.join(outDir, "spessasynth_processor.js")
    }
];

try {
    for (const file of filesToBuild) {
        console.log(
            `[1/2] Bundling ${path.basename(file.input)} with esbuild...`
        );

        // Step 1: Bundle with esbuild. Target ESNext to keep modern features for Babel.
        await esbuild.build({
            entryPoints: [file.input],
            bundle: true,
            treeShaking: true,
            minify: false, // Don’t minify — let Babel handle that
            format: "iife", // 'iife' format is safer for legacy environments
            platform: "browser",
            outfile: file.tempOutput,
            target: "esnext",
            globalName: file.input.includes("index")
                ? "SpessaSynthLib"
                : undefined // Only for the main library
        });

        console.log(
            `[2/2] Transpiling ${path.basename(file.tempOutput)} with Babel...`
        );

        // Step 2: Transpile the bundled result with Babel CLI
        const babelCommand = [
            "npx babel",
            `"${file.tempOutput}"`,
            `--out-file "${file.finalOutput}"`,
            "--source-maps"
        ].join(" ");

        execSync(babelCommand, { stdio: "inherit" });

        // Delete temporary file
        fs.unlinkSync(file.tempOutput);
    }

    console.log(`\nBuild successful! Compatible files are in: ${outDir}`);
    console.log("-> spessasynth_lib.compat.js");
    console.log("-> spessasynth_processor.compat.js");
} catch (e) {
    console.error(e, "\nFailed to build for RPG Maker MV.");
}
```

---

### **Step 7: Adding the Script to package.json**

Now open your `package.json` file and add this new script to the `"scripts"` section for easier execution.

**package.json (scripts section)**

```json
"scripts": {
   "build": "npm run test:types && npm run build:npm && npm run build:pages",
   "build:npm": "tsx build_scripts/build_npm.ts",
   "build:rpgmv": "tsx build_scripts/build_rpgmv.ts",
   "build:pages": "tsx build_scripts/build_pages.ts",
   "test:types": "eslint src/ && tsc -b",
   "debug": "tsx build_scripts/debug_enable.ts",
   "release": "tsx build_scripts/debug_disable.ts",
   "prepack": "npm run build:npm",
   "prepublishOnly": "npm run release && npm run build"
}
```

---

### **Step 8: Running the Build Script**

Now simply run the following command in your terminal:

```bash
npm run build:rpgmv
```

Once done, you’ll find two new files in the `js/plugins/` folder:

1. `spessasynth_lib.compat.js`
2. `spessasynth_processor.compat.js`

These are your transpiled, polyfilled library versions ready for RPG Maker MV.

---

### **Summary**

By following these steps, your workflow becomes:

1. You continue working with your modern TypeScript source code in the `src/` folder.
2. When you want to build for RPG Maker MV, run `npm run build:rpgmv`.
3. This process automatically generates the transpiled and polyfilled `*.compat.js` files in `js/plugins/`.
4. Your plugin loads these two compatible files and should work properly in RPG Maker MV's legacy browser environment.

**Build Variants:**

- **Unminified** (default): Easier to debug, larger file size
- **Minified**: Add `minify: true` in the esbuild configuration for production use

---

## **Build Strategy 2: Single-File Build (Rollup-based)**

This approach uses Rollup to bundle everything into a single file with the worklet processor code inlined. This is ideal for simpler distribution and reduces the number of files needed.

### **When to Use This Approach**

- You want to distribute only one file instead of two
- You prefer simpler file management in your RPG Maker MV project
- You don't need separate worklet processor loading

### **Additional Dependencies**

In addition to the dependencies from Strategy 1, you'll need Rollup and related plugins:

```bash
npm install --save-dev rollup @rollup/plugin-node-resolve @rollup/plugin-commonjs @rollup/plugin-typescript @rollup/plugin-babel @rollup/plugin-terser rollup-plugin-string tslib
```

Brief explanation of these packages:

- **rollup:** The main bundler
- **@rollup/plugin-node-resolve:** Resolves node_modules imports
- **@rollup/plugin-commonjs:** Converts CommonJS modules to ES6
- **@rollup/plugin-typescript:** TypeScript support for Rollup
- **@rollup/plugin-babel:** Integrates Babel transpilation
- **@rollup/plugin-terser:** Minification plugin
- **rollup-plugin-string:** Imports .js files as string literals (for inlining)
- **tslib:** TypeScript helper functions required by the TypeScript plugin

### **Step 1: Create Rollup Configuration**

Create a new file in your project root directory named `rollup.config.rpgmv.js`.

**rollup.config.rpgmv.js**

```javascript
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import babel from "@rollup/plugin-babel";
import terser from "@rollup/plugin-terser";
import { string } from "rollup-plugin-string";

// Step 1: Build worklet processor as a bundle
const workletConfig = {
    input: "src/worklet_processor.ts",
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

// Step 2: Build main library with worklet inline
const mainConfig = {
    input: "src/index.ts",
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
        // Import worklet bundle as string
        string({
            include: "**/temp/worklet_processor_bundle.js"
        }),
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
```

**Key Changes:**

- Uses **adapter files** (`index_rpgmv.ts` and `worklet_processor_rpgmv.ts`)
- Custom Rollup plugin `injectWorkletCode()` replaces the placeholder `createWorkletBlobURL` function
- No need for `rollup-plugin-string` - the custom plugin handles worklet code injection

###Step 2: Create Custom Rollup Plugin\*\*

Create a custom plugin to inject the worklet code into the `createWorkletBlobURL` function:

**build_scripts/rollup-plugin-inject-worklet.js**

```javascript
/**
 * Rollup plugin to inject inline worklet code into createWorkletBlobURL function
 *
 * This plugin replaces the placeholder implementation of createWorkletBlobURL
 * with the actual implementation that includes the bundled worklet processor code.
 */

import fs from "fs";
import path from "path";

export default function injectWorkletCode() {
    return {
        name: "inject-worklet-code",

        // Run after all transformations but before final output
        renderChunk(code, chunk, options) {
            // Read the bundled worklet processor
            const workletBundlePath = path.join(
                process.cwd(),
                "temp",
                "worklet_processor_bundle.js"
            );

            if (!fs.existsSync(workletBundlePath)) {
                this.warn(
                    "Worklet processor bundle not found. Skipping injection."
                );
                return null;
            }

            const workletCode = fs.readFileSync(workletBundlePath, "utf-8");

            // Escape special characters for embedding in string literal
            const escapedWorkletCode = workletCode
                .replace(/\\/g, "\\\\")
                .replace(/`/g, "\\`")
                .replace(/\$/g, "\\$");

            // Find and replace the createWorkletBlobURL function
            const placeholder =
                /export\s+function\s+createWorkletBlobURL\s*\(\s*\)\s*:\s*string\s*\{[^}]*\}/;

            const replacement = `export function createWorkletBlobURL(): string {
    const WORKLET_PROCESSOR_CODE = \`${escapedWorkletCode}\`;
    const blob = new Blob([WORKLET_PROCESSOR_CODE], {
        type: "application/javascript"
    });
    return URL.createObjectURL(blob);
}`;

            if (placeholder.test(code)) {
                const newCode = code.replace(placeholder, replacement);
                console.log(
                    "[inject-worklet-code] Successfully injected worklet code into createWorkletBlobURL"
                );
                return {
                    code: newCode,
                    map: null
                };
            }

            this.warn(
                "createWorkletBlobURL function not found in output. Injection skipped."
            );
            return null;
        }
    };
}
```

### **Step 3: Create Rollup Build Script**

Create a new file under `build_scripts/` named `build_rpgmv_rollup.ts`.

**build_scripts/build_rpgmv_rollup.ts**

```typescript
import { rollup } from "rollup";
import path from "path";
import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..");

console.log("Building for RPG Maker MV with Rollup...\n");

async function build() {
    try {
        // Import Rollup configuration
        const configPath = path.join(projectRoot, "rollup.config.rpgmv.js");
        const configURL = pathToFileURL(configPath).href;
        const { default: configs } = await import(configURL);

        // Ensure temp directory exists
        const tempDir = path.join(projectRoot, "temp");
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Build each configuration sequentially
        for (let i = 0; i < configs.length; i++) {
            const config = configs[i];
            const stageName =
                i === 0
                    ? "worklet processor"
                    : "main library with inlined worklet";

            console.log(
                `[${i + 1}/${configs.length}] Building ${stageName}...`
            );

            const bundle = await rollup(config);
            await bundle.write(config.output);
            await bundle.close();

            console.log(
                `✓ ${stageName.charAt(0).toUpperCase() + stageName.slice(1)} built\n`
            );
        }

        // Clean up temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }

        console.log("✅ Build completed successfully!");
        console.log("Output: js/plugins/spessasynth_lib.js\n");
    } catch (error) {
        console.error("\n❌ Build failed:");
        console.error(error);
        process.exit(1);
    }
}

build();
```

### **Step 5: Add Script to package.json**

Add the new build script to your `package.json`:

```json
"scripts": {
   "build": "npm run test:types && npm run build:npm && npm run build:pages",
   "build:npm": "tsx build_scripts/build_npm.ts",
   "build:rpgmv": "tsx build_scripts/build_rpgmv.ts",
   "build:rpgmv:rollup": "tsx build_scripts/build_rpgmv_rollup.ts",
   "build:pages": "tsx build_scripts/build_pages.ts",
   "test:types": "eslint src/ && tsc -b",
   "debug": "tsx build_scripts/debug_enable.ts",
   "release": "tsx build_scripts/debug_disable.ts",
   "prepack": "npm run build:npm",
   "prepublishOnly": "npm run release && npm run build"
}
```

### **Step 6: Run the Single-File Build**

Execute the build command:

```bash
npm run build:rpgmv:rollup
```

This will generate a single file: `js/plugins/spessasynth_lib.js`

### **Step 7: Using the Single-File Build in Your Plugin**

In your RPG Maker MV plugin, you only need to load one file and use the built-in `createWorkletBlobURL()` function:

```javascript
// Load only the main library
await this._loadScript("js/libs/spessasynth_lib.js");

// Use the built-in function to create worklet Blob URL
const workletUrl = window.SpessaSynthLib.createWorkletBlobURL();
await audioContext.audioWorklet.addModule(workletUrl);
URL.revokeObjectURL(workletUrl);
```

**No separate processor file needed!**

### **Summary: Single-File Build**

**Advantages:**

- Only one file to distribute and manage
- Simpler deployment process
- No external file dependencies for worklet processor

**Disadvantages:**

- Larger single file size
- Slightly harder to debug (worklet code is inlined)

**Build Variants:**

- **Minified** (default with terser): Production-ready, smaller file
- **Unminified**: Remove or comment out the `terser()` plugin in both configs for debugging

---

## **Comparison Table**

| Feature              | Separate Build          | Single-File Build               |
| -------------------- | ----------------------- | ------------------------------- |
| **Number of Files**  | 2 files                 | 1 file                          |
| **Build Tool**       | esbuild + Babel         | Rollup + Babel                  |
| **Setup Complexity** | Simple                  | Moderate                        |
| **Distribution**     | Need to manage 2 files  | Only 1 file                     |
| **Debugging**        | Easier (separate files) | Harder (inline code)            |
| **File Size**        | Smaller per file        | Larger single file              |
| **Minification**     | Optional                | Built-in with terser            |
| **Best For**         | Development, debugging  | Production, simple distribution |

---

## **Common Build Commands**

```bash
# Separate build (unminified)
npm run build:rpgmv

# Single-file build (minified by default)
npm run build:rpgmv:rollup
```

---

## **Troubleshooting**

### Issue: TypeScript warnings about `.ts` extensions

**Symptoms:** Many warnings like `TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled`

**Why this happens:** Your `tsconfig.json` has `allowImportingTsExtensions: true`, but Rollup needs to override this to `false` for bundling.

**Solution:** These are **informational warnings only** and won't break the build. The build will complete successfully. These warnings can be safely ignored.

**To suppress warnings** (optional): Add `verbosity: 0` to the TypeScript plugin config in `rollup.config.rpgmv.js`:

```javascript
typescript({
    tsconfig: "./tsconfig.json",
    declaration: false,
    declarationMap: false,
    verbosity: 0, // Suppress warnings
    compilerOptions: {
        noEmit: false,
        allowImportingTsExtensions: false,
        outDir: "./temp"
    }
});
```

### Issue: Worklet code not injected (file size only ~800KB)

**Symptoms:**

- Build succeeds but output file is suspiciously small
- Message: `[plugin inject-worklet-code] createWorkletBlobURL placeholder not found`
- Warning: `Injection skipped`

**Cause:** The custom Rollup plugin couldn't find the `createWorkletBlobURL` placeholder function.

**Solution:**

1. Verify `src/index_rpgmv.ts` contains the placeholder function
2. Make sure the plugin runs AFTER TypeScript but BEFORE Babel (check plugin order in `rollup.config.rpgmv.js`)
3. Check that `temp/worklet_processor_bundle.js` exists after stage 1 build

**How to verify injection worked:**

- Final file should be **3-5 MB** (includes polyfills + worklet processor)
- Look for success message: `[inject-worklet-code] ✓ Successfully injected worklet code`
- Open `js/plugins/spessasynth_lib.js` and search for `createWorkletBlobURL` - it should contain a large template literal with worklet code

### Issue: `ERR_UNSUPPORTED_ESM_URL_SCHEME` on Windows

**Solution:** The build script uses `pathToFileURL()` to properly handle Windows paths. Make sure you're using the latest version of the build script.

### Issue: Worklet fails to register at runtime

**Solution:**

- For separate build: Ensure both files are loaded correctly
- For single-file build:
    - Verify `createWorkletBlobURL()` is called before `addModule()`
    - Check browser console for Blob URL creation errors
    - Make sure worklet code was actually injected (see above)

### Issue: Build is too slow

**Solution:**

- Use separate build (esbuild is faster than Rollup)
- Remove source maps from Rollup output: `sourcemap: false`
- Disable terser for development builds (comment out terser plugin)

---

This approach gives you the best of both worlds — modern TypeScript development with full backward compatibility for RPG Maker MV, with the flexibility to choose between separate or single-file distribution.
