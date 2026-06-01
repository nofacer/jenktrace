export type JenkinsInstanceId = string;

export type JenkinsInstanceRecord = {
	id: JenkinsInstanceId;
	hostUrl: string;
	username: string;
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
		jobs,
		jobRetentionDays,
		jobMaxBuilds,
		jobPrefetchBuildLogStatuses,
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
