/**
 * RPG Maker MV Adapter for Worklet Processor
 *
 * This file serves as a compatibility layer for building spessasynth_lib
 * for RPG Maker MV (NW.js 0.48.4 / Chromium 85).
 *
 * It adds ES5 polyfills and re-implements the WorkletSynthesizerProcessor
 * with ES5-compatible class method definition instead of using the original.
 */

// Polyfills for ES5 compatibility
import "core-js/stable";
import "regenerator-runtime/runtime";

// Import required dependencies from original
import { SpessaSynthCoreUtils } from "spessasynth_core";
import { consoleColors } from "./utils/other.ts";
import { WORKLET_PROCESSOR_NAME } from "./synthesizer/worklet/worklet_processor_name.ts";
import type { PassedProcessorParameters } from "./synthesizer/types.ts";
import { WorkletSynthesizerCore } from "./synthesizer/worklet/worklet_synthesizer_core.ts";

/**
 * ES5-compatible WorkletSynthesizerProcessor
 *
 * This is a re-implementation of the original WorkletSynthesizerProcessor
 * with the process() method defined as a standard class method instead of
 * a class field assignment, which ensures compatibility with older browsers
 * after Babel transpilation to ES5.
 */
class WorkletSynthesizerProcessor extends AudioWorkletProcessor {
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
    }

    /**
     * The 'process' method is now defined as a standard class method.
     * This ensures compatibility with older browsers after transpilation.
     *
     * NOTE: We only pass inputs and outputs to core.process(), not parameters.
     * This matches the actual signature expected by WorkletSynthesizerCore.
     */
    public process(
        inputs: Float32Array[][],
        outputs: Float32Array[][],
        parameters: Record<string, Float32Array>
    ): boolean {
        // Forward only inputs and outputs (parameters not used by core)
        return this.core.process(inputs, outputs);
    }
}

// Register the processor
registerProcessor(WORKLET_PROCESSOR_NAME, WorkletSynthesizerProcessor);
SpessaSynthCoreUtils.SpessaSynthInfo(
    "%cProcessor successfully registered!",
    consoleColors.recognized
);
