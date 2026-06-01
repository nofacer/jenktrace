import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

if (process.platform !== "darwin") {
	process.exit(0);
}

async function resolveBundlePath() {
	const wrapperBundlePath = process.env.ELECTROBUN_WRAPPER_BUNDLE_PATH;
	if (wrapperBundlePath) {
		return wrapperBundlePath;
	}

	const buildDir = process.env.ELECTROBUN_BUILD_DIR;
	if (!buildDir) {
		return null;
	}

	const entries = await readdir(buildDir, { withFileTypes: true });
	const appBundles = entries.filter(
		(entry) => entry.isDirectory() && entry.name.endsWith(".app"),
	);

	if (appBundles.length === 1) {
		return join(buildDir, appBundles[0].name);
	}

	if (appBundles.length === 0) {
		throw new Error(`No .app bundle found in build directory: ${buildDir}`);
	}

	throw new Error(
		`Expected one .app bundle in build directory, found ${appBundles.length}: ${appBundles
			.map((bundle) => bundle.name)
			.join(", ")}`,
	);
}

const bundlePath = await resolveBundlePath();

if (!bundlePath) {
	process.exit(0);
}

const infoPlistPath = join(bundlePath, "Contents", "Info.plist");

if (!existsSync(infoPlistPath)) {
	throw new Error(`Info.plist not found: ${infoPlistPath}`);
}

const infoPlist = await readFile(infoPlistPath, "utf8");
const envBlock = [
	"\t<key>LSEnvironment</key>",
	"\t<dict>",
	"\t\t<key>BUN_OPTIONS</key>",
	"\t\t<string>--use-system-ca</string>",
	"\t</dict>",
].join("\n");

const updatedPlist = infoPlist.includes("<key>LSEnvironment</key>")
	? infoPlist.replace(/<key>LSEnvironment<\/key>[\s\S]*?<\/dict>/, envBlock)
	: infoPlist.replace("</dict>\n</plist>", `${envBlock}\n</dict>\n</plist>`);

if (updatedPlist !== infoPlist) {
	await writeFile(infoPlistPath, updatedPlist);
	console.log(
		`Injected LSEnvironment BUN_OPTIONS=--use-system-ca into ${infoPlistPath}`,
	);
}
