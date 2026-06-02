export type JenkinsInstanceId = string;

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export type JenkinsInstanceRecord = {
	id: JenkinsInstanceId;
	hostUrl: string;
	username: string;
	customName?: string;
	iconLabel?: string;
	iconBackgroundColor?: string;
	disableSslVerification: boolean;
	jobs: string[];
	jobRetentionDays: Record<string, number>;
	jobMaxBuilds: Record<string, number>;
	jobPrefetchBuildLogStatuses: Record<string, JenkinsBuildLogPrefetchStatus[]>;
	jobPrefetchFailedLogs?: Record<string, boolean>;
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
	disableSslVerification?: boolean;
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

export type JenkinsBuildTimeRange = "last12h" | "last1d" | "last7d" | "last1m";

export type JenkinsJobAnalyticsInput = JenkinsJobDetailsInput & {
	range: JenkinsBuildTimeRange;
};

export type JenkinsBuildLogInput = JenkinsJobDetailsInput & {
	buildNumber: number;
};

export type JenkinsBuildLogPrefetchStatus = "failure" | "success";

export type JenkinsJobBuildSummary = {
	number: number;
	url: string;
	result?: string | null;
	building: boolean;
	timestamp?: number;
	duration?: number;
	displayName?: string;
};

export type JenkinsJobBuildRecord = JenkinsJobBuildSummary & {
	id: string;
	resultCategory: "success" | "failed" | "running" | "other";
};

export type JenkinsJobBuildBucket = {
	bucketStart: string;
	label: string;
	total: number;
	successful: number;
	failed: number;
	running: number;
	successRate: number | null;
};

export type JenkinsJobAnalytics = {
	range: JenkinsBuildTimeRange;
	rangeStart: string;
	rangeEnd: string;
	totalBuilds: number;
	completedBuilds: number;
	successfulBuilds: number;
	failedBuilds: number;
	runningBuilds: number;
	successRate: number | null;
	averageDurationMs: number | null;
	builds: JenkinsJobBuildRecord[];
	buckets: JenkinsJobBuildBucket[];
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
	builds?: JenkinsJobBuildRecord[];
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

export type JenkinsBuildLogRecord = {
	instanceId: JenkinsInstanceId;
	fullProjectName: string;
	buildNumber: number;
	content: string;
	updatedAt: string;
};

export type UpsertJenkinsInstanceInput = {
	id?: JenkinsInstanceId;
	hostUrl: string;
	username: string;
	customName?: string;
	iconLabel?: string;
	iconBackgroundColor?: string;
	disableSslVerification?: boolean;
	jobs?: string[];
	jobRetentionDays?: Record<string, number>;
	jobMaxBuilds?: Record<string, number>;
	jobPrefetchBuildLogStatuses?: Record<string, JenkinsBuildLogPrefetchStatus[]>;
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

export function getJenkinsInstanceHostname(hostUrl: string): string {
	try {
		return new URL(hostUrl).hostname;
	} catch {
		return hostUrl;
	}
}

export function getJenkinsInstanceDisplayName(
	instance: Pick<JenkinsInstanceRecord, "customName" | "hostUrl">,
): string {
	return instance.customName ?? getJenkinsInstanceHostname(instance.hostUrl);
}

export function getJenkinsInstanceButtonTitle(
	instance: Pick<JenkinsInstanceRecord, "customName" | "hostUrl">,
): string {
	const hostname = getJenkinsInstanceHostname(instance.hostUrl);

	return instance.customName
		? `${instance.customName} (${hostname})`
		: hostname;
}

export function getJenkinsInstanceIconLabel(
	instance: Pick<JenkinsInstanceRecord, "customName" | "hostUrl" | "iconLabel">,
): string {
	const explicitLabel = normalizeIconLabel(instance.iconLabel);

	if (explicitLabel) {
		return explicitLabel;
	}

	const source = getJenkinsInstanceDisplayName(instance);

	if (!source) {
		return "IN";
	}

	const parts = source.match(/[a-zA-Z0-9]+/g);

	if (!parts || parts.length === 0) {
		return source.slice(0, 2).toUpperCase();
	}

	if (parts.length === 1) {
		return parts[0].slice(0, 2).toUpperCase();
	}

	return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function getJenkinsInstanceIconColors(
	instance: Pick<JenkinsInstanceRecord, "iconBackgroundColor">,
): { backgroundColor: string; foregroundColor: string } | null {
	if (!instance.iconBackgroundColor) {
		return null;
	}

	const hex = instance.iconBackgroundColor.slice(1);
	const normalizedHex =
		hex.length === 3
			? hex
					.split("")
					.map((part) => `${part}${part}`)
					.join("")
			: hex;
	const red = Number.parseInt(normalizedHex.slice(0, 2), 16);
	const green = Number.parseInt(normalizedHex.slice(2, 4), 16);
	const blue = Number.parseInt(normalizedHex.slice(4, 6), 16);
	const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

	return {
		backgroundColor: instance.iconBackgroundColor,
		foregroundColor: brightness >= 160 ? "#111827" : "#ffffff",
	};
}

export function validateConnectionTestInput(
	input: JenkinsConnectionTestInput,
): JenkinsConnectionTestInput {
	const hostUrl = normalizeHostUrl(input.hostUrl);
	const username = input.username.trim();
	const disableSslVerification = input.disableSslVerification ?? false;

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
		disableSslVerification,
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

export function validateJobAnalyticsInput(
	input: JenkinsJobAnalyticsInput,
): JenkinsJobAnalyticsInput {
	return {
		...validateJobDetailsInput(input),
		range: normalizeBuildTimeRange(input.range),
	};
}

export function validateJobActivityInput(
	input: JenkinsJobActivityInput,
): JenkinsJobActivityInput {
	return validateJobDetailsInput(input);
}

export function validateBuildLogInput(
	input: JenkinsBuildLogInput,
): JenkinsBuildLogInput {
	return {
		...validateJobDetailsInput(input),
		buildNumber: Math.max(1, Math.round(input.buildNumber)),
	};
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
	const customName = normalizeOptionalText(input.customName);
	const iconLabel = normalizeIconLabel(input.iconLabel);
	const iconBackgroundColor = normalizeIconBackgroundColor(
		input.iconBackgroundColor,
	);
	const disableSslVerification = input.disableSslVerification ?? false;
	const jobs = input.jobs ? normalizeJobNames(input.jobs) : undefined;
	const jobRetentionDays = normalizeJobRetentionDays(
		input.jobRetentionDays,
		jobs,
	);
	const jobMaxBuilds = normalizeJobMaxBuilds(input.jobMaxBuilds, jobs);
	const jobPrefetchBuildLogStatuses = normalizeJobPrefetchBuildLogStatuses(
		input.jobPrefetchBuildLogStatuses,
		jobs,
	);
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
		customName,
		iconLabel,
		iconBackgroundColor,
		disableSslVerification,
		jobs,
		jobRetentionDays,
		jobMaxBuilds,
		jobPrefetchBuildLogStatuses,
		monitoringEnabled,
		pollIntervalMinutes,
		apiKey: input.apiKey?.trim(),
	};
}

function normalizeOptionalText(value?: string): string | undefined {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

function normalizeIconLabel(value?: string): string | undefined {
	const collapsed = value
		?.match(/[a-zA-Z0-9]+/g)
		?.join("")
		.toUpperCase();
	return collapsed ? collapsed.slice(0, 3) : undefined;
}

function normalizeIconBackgroundColor(value?: string): string | undefined {
	const trimmed = normalizeOptionalText(value);

	if (!trimmed) {
		return undefined;
	}

	if (!HEX_COLOR_PATTERN.test(trimmed)) {
		throw new Error("Icon background color must be a valid hex color.");
	}

	if (trimmed.length === 4) {
		const [, red, green, blue] = trimmed;
		return `#${red}${red}${green}${green}${blue}${blue}`.toLowerCase();
	}

	return trimmed.toLowerCase();
}
export function normalizePollIntervalMinutes(value?: number): number {
	if (value == null || Number.isNaN(value)) {
		return 5;
	}

	return Math.min(1440, Math.max(1, Math.round(value)));
}

export function normalizeBuildTimeRange(
	value?: JenkinsBuildTimeRange,
): JenkinsBuildTimeRange {
	switch (value) {
		case "last12h":
		case "last1d":
		case "last7d":
		case "last1m":
			return value;
		default:
			return "last7d";
	}
}

export function normalizeJobRetentionDays(
	value?: Record<string, number>,
	jobNames?: string[],
): Record<string, number> {
	const normalizedEntries = Object.entries(value ?? {}).map(
		([job, days]) =>
			[
				normalizeFullProjectName(job),
				normalizeJobRetentionDaysValue(days),
			] as const,
	);
	const filteredEntries = normalizedEntries.filter(([job]) => Boolean(job));
	const allowedJobs = jobNames ? new Set(jobNames) : null;

	return Object.fromEntries(
		filteredEntries.filter(([job]) => !allowedJobs || allowedJobs.has(job)),
	);
}

export function normalizeJobRetentionDaysValue(value?: number): number {
	if (value == null || Number.isNaN(value)) {
		return 90;
	}

	return Math.min(3650, Math.max(1, Math.round(value)));
}

export function normalizeJobMaxBuilds(
	value?: Record<string, number>,
	jobNames?: string[],
): Record<string, number> {
	const normalizedEntries = Object.entries(value ?? {}).map(
		([job, count]) =>
			[
				normalizeFullProjectName(job),
				normalizeJobMaxBuildsValue(count),
			] as const,
	);
	const filteredEntries = normalizedEntries.filter(([job]) => Boolean(job));
	const allowedJobs = jobNames ? new Set(jobNames) : null;

	return Object.fromEntries(
		filteredEntries.filter(([job]) => !allowedJobs || allowedJobs.has(job)),
	);
}

export function normalizeJobMaxBuildsValue(value?: number): number {
	if (value == null || Number.isNaN(value)) {
		return 1000;
	}

	return Math.min(100000, Math.max(1, Math.round(value)));
}

export function normalizeJobPrefetchBuildLogStatuses(
	value?: Record<string, JenkinsBuildLogPrefetchStatus[]>,
	jobNames?: string[],
): Record<string, JenkinsBuildLogPrefetchStatus[]> {
	const normalizedEntries = Object.entries(value ?? {}).map(
		([job, statuses]) =>
			[
				normalizeFullProjectName(job),
				normalizeJobPrefetchBuildLogStatusList(statuses),
			] as const,
	);
	const filteredEntries = normalizedEntries.filter(([job]) => Boolean(job));
	const allowedJobs = jobNames ? new Set(jobNames) : null;

	return Object.fromEntries(
		filteredEntries.filter(([job]) => !allowedJobs || allowedJobs.has(job)),
	);
}

export function normalizeJobPrefetchBuildLogStatusList(
	value?: JenkinsBuildLogPrefetchStatus[],
): JenkinsBuildLogPrefetchStatus[] {
	const normalized = (value ?? ["failure"]).filter(
		(status): status is JenkinsBuildLogPrefetchStatus =>
			status === "failure" || status === "success",
	);

	return normalized.length ? [...new Set(normalized)] : ["failure"];
}
