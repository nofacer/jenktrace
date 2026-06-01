export type JenkinsInstanceId = string;

export type JenkinsInstanceRecord = {
	id: JenkinsInstanceId;
	hostUrl: string;
	username: string;
	jobs: string[];
	monitoringEnabled: boolean;
	pollIntervalMinutes: number;
	createdAt: string;
	updatedAt: string;
};

export type JenkinsInstanceSummary = JenkinsInstanceRecord & {
	hasApiKey: boolean;
};

export type JenkinsConnectionTestInput = {
	id?: JenkinsInstanceId;
	hostUrl: string;
	username: string;
	apiKey?: string;
};

export type JenkinsConnectionTestResult = {
	ok: boolean;
	message: string;
	jenkinsVersion?: string | null;
};

export type JenkinsJobDetailsInput = {
	instanceId: JenkinsInstanceId;
	fullProjectName: string;
};

export type JenkinsJobBuildSummary = {
	number: number;
	url: string;
	result?: string | null;
	building: boolean;
	timestamp?: number;
	duration?: number;
	displayName?: string;
};

export type JenkinsJobDetails = {
	fullProjectName: string;
	displayName: string;
	fullDisplayName: string;
	url: string;
	description?: string | null;
	buildable: boolean;
	inQueue: boolean;
	color?: string | null;
	nextBuildNumber?: number;
	lastBuild?: JenkinsJobBuildSummary | null;
	lastCompletedBuild?: JenkinsJobBuildSummary | null;
	lastSuccessfulBuild?: JenkinsJobBuildSummary | null;
	lastFailedBuild?: JenkinsJobBuildSummary | null;
};

export type JenkinsJobActivityInput = {
	instanceId: JenkinsInstanceId;
	fullProjectName: string;
};

export type JenkinsJobRuntimeSnapshot = {
	instanceId: JenkinsInstanceId;
	fullProjectName: string;
	observedAt: string;
	source: "poll" | "manual";
	stateHash: string;
	buildable: boolean | null;
	inQueue: boolean | null;
	color: string | null;
	lastBuildNumber: number | null;
	lastBuildResult: string | null;
	lastBuildBuilding: boolean | null;
	lastCompletedBuildNumber: number | null;
	lastCompletedBuildResult: string | null;
	lastSuccessfulBuildNumber: number | null;
	lastFailedBuildNumber: number | null;
	message: string | null;
};

export type JenkinsJobHistoryEntry = JenkinsJobRuntimeSnapshot & {
	id: number;
};

export type JenkinsJobLogEntry = {
	id: number;
	instanceId: JenkinsInstanceId;
	fullProjectName: string | null;
	level: "info" | "warn" | "error";
	code: string;
	message: string;
	firstSeenAt: string;
	lastSeenAt: string;
	repeatCount: number;
};

export type JenkinsJobActivity = {
	snapshot: JenkinsJobRuntimeSnapshot | null;
	history: JenkinsJobHistoryEntry[];
	logs: JenkinsJobLogEntry[];
};

export type UpsertJenkinsInstanceInput = {
	id?: JenkinsInstanceId;
	hostUrl: string;
	username: string;
	jobs?: string[];
	monitoringEnabled?: boolean;
	pollIntervalMinutes?: number;
	apiKey?: string;
};

export function normalizeFullProjectName(value: string): string {
	return value
		.split("/")
		.map((segment) => segment.trim())
		.filter(Boolean)
		.join("/");
}

export function normalizeJobNames(values: string[]): string[] {
	return values
		.map((value) => normalizeFullProjectName(value))
		.filter(Boolean)
		.filter((value, index, array) => array.indexOf(value) === index);
}

export function buildJenkinsJobPath(fullProjectName: string): string {
	const normalized = normalizeFullProjectName(fullProjectName);

	if (!normalized) {
		throw new Error("Full project name is required.");
	}

	return `/job/${normalized
		.split("/")
		.map((segment) => encodeURIComponent(segment))
		.join("/job/")}/`;
}

export function buildJenkinsJobUrl(
	hostUrl: string,
	fullProjectName: string,
): string {
	return `${normalizeHostUrl(hostUrl)}${buildJenkinsJobPath(fullProjectName)}`;
}

export function validateConnectionTestInput(
	input: JenkinsConnectionTestInput,
): JenkinsConnectionTestInput {
	const hostUrl = normalizeHostUrl(input.hostUrl);
	const username = input.username.trim();

	if (!hostUrl) {
		throw new Error("Host URL is required.");
	}

	if (!username) {
		throw new Error("Username is required.");
	}

	return {
		...input,
		hostUrl,
		username,
		apiKey: input.apiKey?.trim(),
	};
}

export function validateJobDetailsInput(
	input: JenkinsJobDetailsInput,
): JenkinsJobDetailsInput {
	const instanceId = input.instanceId.trim();
	const fullProjectName = normalizeFullProjectName(input.fullProjectName);

	if (!instanceId) {
		throw new Error("Instance ID is required.");
	}

	if (!fullProjectName) {
		throw new Error("Full project name is required.");
	}

	return {
		instanceId,
		fullProjectName,
	};
}

export function validateJobActivityInput(
	input: JenkinsJobActivityInput,
): JenkinsJobActivityInput {
	return validateJobDetailsInput(input);
}

export function normalizeHostUrl(value: string): string {
	const trimmed = value.trim();
	const url = new URL(trimmed);
	url.pathname = url.pathname.replace(/\/+$/, "");
	url.search = "";
	url.hash = "";
	return url.toString().replace(/\/$/, "");
}

export function validateInstanceInput(
	input: UpsertJenkinsInstanceInput,
): UpsertJenkinsInstanceInput {
	const hostUrl = normalizeHostUrl(input.hostUrl);
	const username = input.username.trim();
	const jobs = input.jobs ? normalizeJobNames(input.jobs) : undefined;
	const monitoringEnabled = input.monitoringEnabled ?? true;
	const pollIntervalMinutes = normalizePollIntervalMinutes(
		input.pollIntervalMinutes,
	);

	if (!hostUrl) {
		throw new Error("Host URL is required.");
	}

	if (!username) {
		throw new Error("Username is required.");
	}

	return {
		...input,
		hostUrl,
		username,
		jobs,
		monitoringEnabled,
		pollIntervalMinutes,
		apiKey: input.apiKey?.trim(),
	};
}

export function normalizePollIntervalMinutes(value?: number): number {
	if (value == null || Number.isNaN(value)) {
		return 5;
	}

	return Math.min(1440, Math.max(1, Math.round(value)));
}
