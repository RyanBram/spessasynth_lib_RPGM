import { rollup } from "rollup";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Building for RPG Maker MV with Rollup...");

const projectRoot = path.join(__dirname, "..");
const tempDir = path.join(projectRoot, "temp");
const outputDir = path.join(projectRoot, "js", "plugins");

// Ensure directories exist
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

async function build() {
    try {
        // Import rollup config - Convert Windows path to file:// URL
        const configPath = path.join(projectRoot, "rollup.config.rpgmv.js");
        const configURL = pathToFileURL(configPath).href;
        const { default: configs } = await import(configURL);

        // Build worklet first
        console.log("\n[1/2] Building worklet processor...");
        const workletConfig = configs[0];
        const workletBundle = await rollup(workletConfig);
        await workletBundle.write(workletConfig.output);
        await workletBundle.close();
        console.log("✓ Worklet processor built");

        // Build main library with inlined worklet
        console.log("\n[2/2] Building main library with inlined worklet...");
        const mainConfig = configs[1];
        const mainBundle = await rollup(mainConfig);
        await mainBundle.write(mainConfig.output);
        await mainBundle.close();
        console.log("✓ Main library built");

        // Cleanup temp directory
        console.log("\nCleaning up temporary files...");
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log("✓ Cleanup complete");

        console.log("\n✅ Build successful!");
        console.log(`Output: ${path.join(outputDir, "spessasynth_lib.js")}`);
    } catch (error) {
        console.error("\n❌ Build failed:");
        console.error(error);
        process.exit(1);
    }
}

build();
