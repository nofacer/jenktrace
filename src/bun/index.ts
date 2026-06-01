import {
	ApplicationMenu,
	BrowserView,
	BrowserWindow,
	Updater,
} from "electrobun/bun";
import type {
	JenkinsConnectionTestInput,
	JenkinsJobDetailsInput,
	UpsertJenkinsInstanceInput,
} from "../shared/jenkins";
import type { AppRPCSchema } from "../shared/rpc";
import {
	deleteJenkinsInstance,
	getJenkinsJobDetails,
	listJenkinsInstances,
	saveJenkinsInstance,
	testJenkinsConnection,
} from "./jenkins-store";

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

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
		},
	},
});

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

new BrowserWindow({
	title: "React + Tailwind + Vite",
	url,
	rpc: appRpc,
	frame: {
		width: 900,
		height: 700,
		x: 200,
		y: 200,
	},
});

console.log("React Tailwind Vite app started!");
