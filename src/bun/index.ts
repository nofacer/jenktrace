import { existsSync } from "node:fs";
import { join } from "node:path";
import { ApplicationMenu, BrowserView, BrowserWindow } from "electrobun/bun";
import type {
	JenkinsBuildLogInput,
	JenkinsConnectionTestInput,
	JenkinsJobActivityInput,
	JenkinsJobAnalyticsInput,
	JenkinsJobDetailsInput,
	UpsertJenkinsInstanceInput,
} from "../shared/jenkins";
import type { AppRPCSchema } from "../shared/rpc";
import { listAppLogs, writeAppLog } from "./app-log-store";
import { native, toCString } from "./electrobun-native";
import {
	deleteJenkinsInstance,
	getJenkinsBuildLog,
	getJenkinsJobActivity,
	getJenkinsJobAnalytics,
	getJenkinsJobDetails,
	listJenkinsInstances,
	runJenkinsMonitoringCycle,
	saveJenkinsInstance,
	testJenkinsConnection,
} from "./jenkins-store";
import { getAppRuntimeInfo } from "./runtime-paths";

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;
const MONITORING_TICK_MS = 60_000;
const APP_ICON_PATH = join(import.meta.dir, "../../assets/icon-1024-mac.png");
let monitoringRunInFlight = false;

// Check if Vite dev server is running for HMR
async function getMainViewUrl(): Promise<string> {
	const channel = getAppRuntimeInfo().channel;
	if (channel === "dev") {
		try {
			await fetch(DEV_SERVER_URL, { method: "HEAD" });
			writeAppLog({
				scope: "app",
				level: "debug",
				code: "hmr_server_detected",
				message: "Using the Vite dev server for the main view.",
				detail: DEV_SERVER_URL,
			});
			console.log(`HMR enabled: Using Vite dev server at ${DEV_SERVER_URL}`);
			return DEV_SERVER_URL;
		} catch {
			writeAppLog({
				scope: "app",
				level: "warn",
				code: "hmr_server_unavailable",
				message:
					"Vite dev server not running. Falling back to the bundled main view.",
				detail: "Run 'bun run dev:hmr' for HMR support.",
			});
			console.log(
				"Vite dev server not running. Run 'bun run dev:hmr' for HMR support.",
			);
		}
	}
	return "views://mainview/index.html";
}

// Create the main application window
const url = await getMainViewUrl();

const appRpc = BrowserView.defineRPC<AppRPCSchema>({
	handlers: {
		requests: {
			listJenkinsInstances: () => listJenkinsInstances(),
			listAppLogs: () => listAppLogs(),
			saveJenkinsInstance: (params: UpsertJenkinsInstanceInput) =>
				saveJenkinsInstance(params),
			deleteJenkinsInstance: ({ id }: { id: string }) =>
				deleteJenkinsInstance(id),
			testJenkinsConnection: (params: JenkinsConnectionTestInput) =>
				testJenkinsConnection(params),
			getJenkinsJobDetails: (params: JenkinsJobDetailsInput) =>
				getJenkinsJobDetails(params),
			getJenkinsJobActivity: (params: JenkinsJobActivityInput) =>
				getJenkinsJobActivity(params),
			getJenkinsJobAnalytics: (params: JenkinsJobAnalyticsInput) =>
				getJenkinsJobAnalytics(params),
			getJenkinsBuildLog: (params: JenkinsBuildLogInput) =>
				getJenkinsBuildLog(params),
			runJenkinsMonitoringCycle: () => runJenkinsMonitoringCycle(),
		},
	},
});

async function runMonitoringTick() {
	if (monitoringRunInFlight) {
		return;
	}

	monitoringRunInFlight = true;

	try {
		const result = await runJenkinsMonitoringCycle();
		if (result.processedJobs > 0) {
			writeAppLog({
				scope: "monitoring",
				level: result.observedChanges > 0 ? "info" : "debug",
				code: "monitoring_tick_completed",
				message: "Monitoring tick completed.",
				detail: `Processed ${result.processedJobs} jobs. Observed ${result.observedChanges} changes.`,
			});
			console.log(
				`Monitoring tick processed ${result.processedJobs} jobs and observed ${result.observedChanges} changes.`,
			);
		}
	} catch (error) {
		writeAppLog({
			scope: "monitoring",
			level: "error",
			code: "monitoring_tick_failed",
			message: "Monitoring tick failed.",
			detail:
				error instanceof Error ? error.message : "Unknown monitoring error.",
		});
		console.error("Monitoring tick failed:", error);
	} finally {
		monitoringRunInFlight = false;
	}
}

ApplicationMenu.setApplicationMenu([
	{
		label: "Jenktrace",
		submenu: [{ role: "about" }, { type: "divider" }, { role: "quit" }],
	},
	{
		label: "Edit",
		submenu: [
			{ role: "undo" },
			{ role: "redo" },
			{ type: "divider" },
			{ role: "cut" },
			{ role: "copy" },
			{ role: "paste" },
			{ role: "pasteAndMatchStyle" },
			{ role: "delete" },
			{ role: "selectAll" },
		],
	},
	{
		label: "Window",
		submenu: [
			{ role: "minimize" },
			{ role: "zoom" },
			{ type: "divider" },
			{ role: "enterFullScreen" },
		],
	},
]);

const mainWindow = new BrowserWindow({
	title: "jenktrace",
	url,
	rpc: appRpc,
	frame: {
		width: 900,
		height: 700,
		x: 200,
		y: 200,
	},
});

if (existsSync(APP_ICON_PATH)) {
	native?.symbols.setWindowIcon(mainWindow.ptr, toCString(APP_ICON_PATH));
}

writeAppLog({
	scope: "app",
	level: "info",
	code: "app_started",
	message: "Jenktrace app started.",
});
console.log("jenktrace app started!");
void runMonitoringTick();
setInterval(() => {
	void runMonitoringTick();
}, MONITORING_TICK_MS);
