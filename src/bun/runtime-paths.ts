import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_APP_IDENTIFIER = "dev.electrobun.jenktrace";
const DEFAULT_APP_CHANNEL = "dev";

type AppRuntimeInfo = {
	identifier: string;
	channel: string;
};

let cachedAppRuntimeInfo: AppRuntimeInfo | null = null;

function getAppDataDir() {
	switch (process.platform) {
		case "darwin":
			return join(homedir(), "Library", "Application Support");
		case "win32":
			return process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local");
		default:
			return process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share");
	}
}

function readVersionFile() {
	const candidatePaths = [
		fileURLToPath(new URL("../../version.json", import.meta.url)),
		fileURLToPath(new URL("../version.json", import.meta.url)),
	];

	for (const candidatePath of candidatePaths) {
		if (!existsSync(candidatePath)) {
			continue;
		}

		try {
			return JSON.parse(
				readFileSync(candidatePath, "utf8"),
			) as Partial<AppRuntimeInfo>;
		} catch {
			return null;
		}
	}

	return null;
}

export function getAppRuntimeInfo(): AppRuntimeInfo {
	if (cachedAppRuntimeInfo) {
		return cachedAppRuntimeInfo;
	}

	const versionInfo = readVersionFile();
	cachedAppRuntimeInfo = {
		identifier: versionInfo?.identifier?.trim() || DEFAULT_APP_IDENTIFIER,
		channel: versionInfo?.channel?.trim() || DEFAULT_APP_CHANNEL,
	};
	return cachedAppRuntimeInfo;
}

export function getAppUserDataDir() {
	const { identifier, channel } = getAppRuntimeInfo();
	return join(getAppDataDir(), identifier, channel);
}
