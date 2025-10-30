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

        // Run AFTER all transformations (TypeScript + Babel) complete
        renderChunk(code, chunk, options) {
            // Only process the main chunk
            if (!chunk.fileName.includes("spessasynth_lib")) {
                return null;
            }

            console.log(
                "[inject-worklet-code] 📝 Processing chunk:",
                chunk.fileName
            );

            // Read the bundled worklet processor
            const workletBundlePath = path.join(
                process.cwd(),
                "temp",
                "worklet_processor_bundle.js"
            );

            if (!fs.existsSync(workletBundlePath)) {
                this.warn(
                    "❌ Worklet processor bundle not found at: " +
                        workletBundlePath
                );
                return null;
            }

            const workletCode = fs.readFileSync(workletBundlePath, "utf-8");
            console.log(
                "[inject-worklet-code] ✓ Loaded worklet bundle, size:",
                workletCode.length,
                "bytes"
            );

            // Use Base64 encoding to safely embed the code
            const base64Code = Buffer.from(workletCode, "utf-8").toString(
                "base64"
            );
            console.log(
                "[inject-worklet-code] Base64 encoded size:",
                base64Code.length,
                "bytes"
            );

            // Debug: Check what we have
            const hasFunction = /createWorkletBlobURL/.test(code);
            console.log(
                "[inject-worklet-code] Function exists in code?",
                hasFunction
            );

            if (hasFunction) {
                // Try to extract and show the function
                const funcMatch = code.match(
                    /export\s+function\s+createWorkletBlobURL[\s\S]{0,500}/
                );
                if (funcMatch) {
                    console.log(
                        "[inject-worklet-code] Found function (first 500 chars):"
                    );
                    console.log(funcMatch[0]);
                    console.log(
                        "[inject-worklet-code] ---end of function snippet---"
                    );
                }
            }

            // Try multiple regex patterns
            const patterns = [
                // Pattern 1: JavaScript ES5 version (after Babel) - function declaration
                /function\s+createWorkletBlobURL\s*\([^)]*\)\s*\{[\s\S]*?Error[\s\S]*?\}/,
                // Pattern 2: ES6 export function (might still have some ES6)
                /export\s+function\s+createWorkletBlobURL\s*\([^)]*\)\s*\{[\s\S]*?Error[\s\S]*?\}/,
                // Pattern 3: Object method (if converted to exports.createWorkletBlobURL)
                /createWorkletBlobURL\s*:\s*function\s*\([^)]*\)\s*\{[\s\S]*?Error[\s\S]*?\}/
            ];

            for (let i = 0; i < patterns.length; i++) {
                console.log(`[inject-worklet-code] Trying pattern ${i + 1}...`);
                if (patterns[i].test(code)) {
                    console.log(
                        `[inject-worklet-code] ✓ Pattern ${i + 1} matched!`
                    );

                    // Generate replacement based on what format we matched
                    let replacement;
                    if (i === 0) {
                        // Pattern 1: function declaration
                        replacement = `function createWorkletBlobURL() {
    var base64Code = "${base64Code}";
    var workletCode = atob(base64Code);
    var blob = new Blob([workletCode], {
        type: "application/javascript"
    });
    return URL.createObjectURL(blob);
}`;
                    } else if (i === 1) {
                        // Pattern 2: export function
                        replacement = `export function createWorkletBlobURL() {
    var base64Code = "${base64Code}";
    var workletCode = atob(base64Code);
    var blob = new Blob([workletCode], {
        type: "application/javascript"
    });
    return URL.createObjectURL(blob);
}`;
                    } else {
                        // Pattern 3: object method
                        replacement = `createWorkletBlobURL: function() {
    var base64Code = "${base64Code}";
    var workletCode = atob(base64Code);
    var blob = new Blob([workletCode], {
        type: "application/javascript"
    });
    return URL.createObjectURL(blob);
}`;
                    }

                    const newCode = code.replace(patterns[i], replacement);
                    console.log(
                        "[inject-worklet-code] ✅ Successfully injected worklet code!"
                    );
                    return {
                        code: newCode,
                        map: null
                    };
                }
            }

            this.warn("⚠ None of the patterns matched createWorkletBlobURL");

            // Save code to temp file for manual inspection
            const debugPath = path.join(
                process.cwd(),
                "temp",
                "debug_index_rpgmv.js"
            );
            fs.writeFileSync(debugPath, code, "utf-8");
            console.log(
                "[inject-worklet-code] Saved transformed code to:",
                debugPath
            );

            return null;
        }
    };
}
