import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const wrapperBundlePath = process.env.ELECTROBUN_WRAPPER_BUNDLE_PATH;

if (!wrapperBundlePath || process.platform !== "darwin") {
	process.exit(0);
}

const infoPlistPath = join(wrapperBundlePath, "Contents", "Info.plist");

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
