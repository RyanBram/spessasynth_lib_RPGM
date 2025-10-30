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
 * The actual implementation is injected by rollup-plugin-string during build.
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
