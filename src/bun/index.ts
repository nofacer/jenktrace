import { join } from "node:path";
import {
	ApplicationMenu,
	BrowserView,
	BrowserWindow,
	Updater,
} from "electrobun/bun";
import type {
	JenkinsBuildLogInput,
	JenkinsConnectionTestInput,
	JenkinsJobActivityInput,
	JenkinsJobAnalyticsInput,
	JenkinsJobDetailsInput,
	UpsertJenkinsInstanceInput,
} from "../shared/jenkins";
import type { AppRPCSchema } from "../shared/rpc";
import { native } from "./electrobun-native";
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

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;
const MONITORING_TICK_MS = 60_000;
const APP_ICON_PATH = join(import.meta.dir, "../../assets/icon-1024-mac.png");
let monitoringRunInFlight = false;

// Check if Vite dev server is running for HMR
async function getMainViewUrl(): Promise<string> {
	const channel = await Updater.localInfo.channel();
	if (channel === "dev") {
		try {
			await fetch(DEV_SERVER_URL, { method: "HEAD" });
			console.log(`HMR enabled: Using Vite dev server at ${DEV_SERVER_URL}`);
			return DEV_SERVER_URL;
		} catch {
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
			console.log(
				`Monitoring tick processed ${result.processedJobs} jobs and observed ${result.observedChanges} changes.`,
			);
		}
	} catch (error) {
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

native?.symbols.setWindowIcon(mainWindow.ptr, APP_ICON_PATH);

console.log("jenktrace app started!");
void runMonitoringTick();
setInterval(() => {
	void runMonitoringTick();
}, MONITORING_TICK_MS);
