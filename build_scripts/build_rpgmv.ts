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
            minify: true, // Minify for production
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
    console.log("-> spessasynth_lib.js");
    console.log("-> spessasynth_processor.js");
} catch (e) {
    console.error(e, "\nFailed to build for RPG Maker MV.");
}
