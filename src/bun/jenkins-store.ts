import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { Utils } from "electrobun/bun";

import {
	buildJenkinsJobUrl,
	type JenkinsConnectionTestInput,
	type JenkinsConnectionTestResult,
	type JenkinsInstanceRecord,
	type JenkinsInstanceSummary,
	type JenkinsJobActivity,
	type JenkinsJobActivityInput,
	type JenkinsJobBuildSummary,
	type JenkinsJobDetails,
	type JenkinsJobDetailsInput,
	type JenkinsJobHistoryEntry,
	type JenkinsJobLogEntry,
	type JenkinsJobRuntimeSnapshot,
	normalizePollIntervalMinutes,
	type UpsertJenkinsInstanceInput,
	validateConnectionTestInput,
	validateInstanceInput,
	validateJobActivityInput,
	validateJobDetailsInput,
} from "../shared/jenkins";

const CONFIG_DIR = join(Utils.paths.userData, "config");
const CONFIG_PATH = join(CONFIG_DIR, "jenkins-instances.json");
const RUNTIME_DB_PATH = join(CONFIG_DIR, "jenkins-runtime.sqlite");
const KEYCHAIN_SERVICE_PREFIX = "dev.electrobun.jenktrace.jenkins-instance";
const DEFAULT_HISTORY_LIMIT = 20;
const DEFAULT_LOG_LIMIT = 30;
const lastPolledAtByInstance = new Map<string, number>();

type StoredConfig = {
	instances: JenkinsInstanceRecord[];
};

type RuntimeSnapshotRow = {
	instance_id: string;
	full_project_name: string;
	observed_at: string;
	source: "poll" | "manual";
	state_hash: string;
	buildable: number | null;
	in_queue: number | null;
	color: string | null;
	last_build_number: number | null;
	last_build_result: string | null;
	last_build_building: number | null;
	last_completed_build_number: number | null;
	last_completed_build_result: string | null;
	last_successful_build_number: number | null;
	last_failed_build_number: number | null;
	message: string | null;
};

type RuntimeHistoryRow = RuntimeSnapshotRow & {
	id: number;
};

type RuntimeLogRow = {
	id: number;
	instance_id: string;
	full_project_name: string | null;
	level: "info" | "warn" | "error";
	code: string;
	message: string;
	first_seen_at: string;
	last_seen_at: string;
	repeat_count: number;
};

const runtimeDb = new Database(RUNTIME_DB_PATH);

runtimeDb.exec(`
	PRAGMA journal_mode = WAL;
	PRAGMA synchronous = NORMAL;
	CREATE TABLE IF NOT EXISTS job_runtime_snapshot (
		instance_id TEXT NOT NULL,
		full_project_name TEXT NOT NULL,
		observed_at TEXT NOT NULL,
		source TEXT NOT NULL,
		state_hash TEXT NOT NULL,
		buildable INTEGER,
		in_queue INTEGER,
		color TEXT,
		last_build_number INTEGER,
		last_build_result TEXT,
		last_build_building INTEGER,
		last_completed_build_number INTEGER,
		last_completed_build_result TEXT,
		last_successful_build_number INTEGER,
		last_failed_build_number INTEGER,
		message TEXT,
		PRIMARY KEY (instance_id, full_project_name)
	);
	CREATE TABLE IF NOT EXISTS job_runtime_history (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		instance_id TEXT NOT NULL,
		full_project_name TEXT NOT NULL,
		observed_at TEXT NOT NULL,
		source TEXT NOT NULL,
		state_hash TEXT NOT NULL,
		buildable INTEGER,
		in_queue INTEGER,
		color TEXT,
		last_build_number INTEGER,
		last_build_result TEXT,
		last_build_building INTEGER,
		last_completed_build_number INTEGER,
		last_completed_build_result TEXT,
		last_successful_build_number INTEGER,
		last_failed_build_number INTEGER,
		message TEXT
	);
	CREATE INDEX IF NOT EXISTS idx_job_runtime_history_lookup
		ON job_runtime_history (instance_id, full_project_name, observed_at DESC);
	CREATE TABLE IF NOT EXISTS job_runtime_log (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		instance_id TEXT NOT NULL,
		full_project_name TEXT,
		level TEXT NOT NULL,
		code TEXT NOT NULL,
		message TEXT NOT NULL,
		first_seen_at TEXT NOT NULL,
		last_seen_at TEXT NOT NULL,
		repeat_count INTEGER NOT NULL DEFAULT 1
	);
	CREATE INDEX IF NOT EXISTS idx_job_runtime_log_lookup
		ON job_runtime_log (instance_id, full_project_name, last_seen_at DESC);
`);

const selectSnapshotStatement = runtimeDb.query<
	RuntimeSnapshotRow,
	[string, string]
>(`
		SELECT
			instance_id,
			full_project_name,
			observed_at,
			source,
			state_hash,
			buildable,
			in_queue,
			color,
			last_build_number,
			last_build_result,
			last_build_building,
			last_completed_build_number,
			last_completed_build_result,
			last_successful_build_number,
			last_failed_build_number,
			message
		FROM job_runtime_snapshot
		WHERE instance_id = ? AND full_project_name = ?
	`);

const selectHistoryStatement = runtimeDb.query<
	RuntimeHistoryRow,
	[string, string, number]
>(`
		SELECT
			id,
			instance_id,
			full_project_name,
			observed_at,
			source,
			state_hash,
			buildable,
			in_queue,
			color,
			last_build_number,
			last_build_result,
			last_build_building,
			last_completed_build_number,
			last_completed_build_result,
			last_successful_build_number,
			last_failed_build_number,
			message
		FROM job_runtime_history
		WHERE instance_id = ? AND full_project_name = ?
		ORDER BY observed_at DESC
		LIMIT ?
	`);

const selectLogsStatement = runtimeDb.query<
	RuntimeLogRow,
	[string, string, number]
>(`
	SELECT
		id,
		instance_id,
		full_project_name,
		level,
		code,
		message,
		first_seen_at,
		last_seen_at,
		repeat_count
	FROM job_runtime_log
	WHERE instance_id = ? AND (full_project_name = ? OR full_project_name IS NULL)
	ORDER BY last_seen_at DESC
	LIMIT ?
`);

function keychainServiceName(instanceId: string): string {
	return `${KEYCHAIN_SERVICE_PREFIX}.${instanceId}`;
}

function toNullableBoolean(value: number | null): boolean | null {
	if (value == null) {
		return null;
	}

	return Boolean(value);
}

function mapSnapshotRow(
	row: RuntimeSnapshotRow | RuntimeHistoryRow,
): JenkinsJobRuntimeSnapshot {
	return {
		instanceId: row.instance_id,
		fullProjectName: row.full_project_name,
		observedAt: row.observed_at,
		source: row.source,
		stateHash: row.state_hash,
		buildable: toNullableBoolean(row.buildable),
		inQueue: toNullableBoolean(row.in_queue),
		color: row.color,
		lastBuildNumber: row.last_build_number,
		lastBuildResult: row.last_build_result,
		lastBuildBuilding: toNullableBoolean(row.last_build_building),
		lastCompletedBuildNumber: row.last_completed_build_number,
		lastCompletedBuildResult: row.last_completed_build_result,
		lastSuccessfulBuildNumber: row.last_successful_build_number,
		lastFailedBuildNumber: row.last_failed_build_number,
		message: row.message,
	};
}

function mapHistoryRow(row: RuntimeHistoryRow): JenkinsJobHistoryEntry {
	return {
		id: row.id,
		...mapSnapshotRow(row),
	};
}

function mapLogRow(row: RuntimeLogRow): JenkinsJobLogEntry {
	return {
		id: row.id,
		instanceId: row.instance_id,
		fullProjectName: row.full_project_name,
		level: row.level,
		code: row.code,
		message: row.message,
		firstSeenAt: row.first_seen_at,
		lastSeenAt: row.last_seen_at,
		repeatCount: row.repeat_count,
	};
}

function buildStateHash(
	snapshot: Omit<JenkinsJobRuntimeSnapshot, "stateHash">,
) {
	return JSON.stringify({
		buildable: snapshot.buildable,
		inQueue: snapshot.inQueue,
		color: snapshot.color,
		lastBuildNumber: snapshot.lastBuildNumber,
		lastBuildResult: snapshot.lastBuildResult,
		lastBuildBuilding: snapshot.lastBuildBuilding,
		lastCompletedBuildNumber: snapshot.lastCompletedBuildNumber,
		lastCompletedBuildResult: snapshot.lastCompletedBuildResult,
		lastSuccessfulBuildNumber: snapshot.lastSuccessfulBuildNumber,
		lastFailedBuildNumber: snapshot.lastFailedBuildNumber,
		message: snapshot.message,
	});
}

function buildRuntimeSnapshot(params: {
	instanceId: string;
	fullProjectName: string;
	source: "poll" | "manual";
	details?: JenkinsJobDetails | null;
	message?: string | null;
	observedAt?: string;
}): JenkinsJobRuntimeSnapshot {
	const observedAt = params.observedAt ?? new Date().toISOString();
	const baseSnapshot = {
		instanceId: params.instanceId,
		fullProjectName: params.fullProjectName,
		observedAt,
		source: params.source,
		buildable: params.details?.buildable ?? null,
		inQueue: params.details?.inQueue ?? null,
		color: params.details?.color ?? null,
		lastBuildNumber: params.details?.lastBuild?.number ?? null,
		lastBuildResult: params.details?.lastBuild?.result ?? null,
		lastBuildBuilding: params.details?.lastBuild?.building ?? null,
		lastCompletedBuildNumber:
			params.details?.lastCompletedBuild?.number ?? null,
		lastCompletedBuildResult:
			params.details?.lastCompletedBuild?.result ?? null,
		lastSuccessfulBuildNumber:
			params.details?.lastSuccessfulBuild?.number ?? null,
		lastFailedBuildNumber: params.details?.lastFailedBuild?.number ?? null,
		message: params.message ?? null,
	};

	return {
		...baseSnapshot,
		stateHash: buildStateHash(baseSnapshot),
	};
}

function persistSnapshot(snapshot: JenkinsJobRuntimeSnapshot) {
	runtimeDb.run(
		`INSERT INTO job_runtime_snapshot (
			instance_id,
			full_project_name,
			observed_at,
			source,
			state_hash,
			buildable,
			in_queue,
			color,
			last_build_number,
			last_build_result,
			last_build_building,
			last_completed_build_number,
			last_completed_build_result,
			last_successful_build_number,
			last_failed_build_number,
			message
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(instance_id, full_project_name) DO UPDATE SET
			observed_at = excluded.observed_at,
			source = excluded.source,
			state_hash = excluded.state_hash,
			buildable = excluded.buildable,
			in_queue = excluded.in_queue,
			color = excluded.color,
			last_build_number = excluded.last_build_number,
			last_build_result = excluded.last_build_result,
			last_build_building = excluded.last_build_building,
			last_completed_build_number = excluded.last_completed_build_number,
			last_completed_build_result = excluded.last_completed_build_result,
			last_successful_build_number = excluded.last_successful_build_number,
			last_failed_build_number = excluded.last_failed_build_number,
			message = excluded.message`,
		[
			snapshot.instanceId,
			snapshot.fullProjectName,
			snapshot.observedAt,
			snapshot.source,
			snapshot.stateHash,
			snapshot.buildable == null ? null : Number(snapshot.buildable),
			snapshot.inQueue == null ? null : Number(snapshot.inQueue),
			snapshot.color,
			snapshot.lastBuildNumber,
			snapshot.lastBuildResult,
			snapshot.lastBuildBuilding == null
				? null
				: Number(snapshot.lastBuildBuilding),
			snapshot.lastCompletedBuildNumber,
			snapshot.lastCompletedBuildResult,
			snapshot.lastSuccessfulBuildNumber,
			snapshot.lastFailedBuildNumber,
			snapshot.message,
		],
	);
}

function appendHistoryIfChanged(snapshot: JenkinsJobRuntimeSnapshot): boolean {
	const previous = selectSnapshotStatement.get(
		snapshot.instanceId,
		snapshot.fullProjectName,
	);

	persistSnapshot(snapshot);

	if (previous && previous.state_hash === snapshot.stateHash) {
		return false;
	}

	runtimeDb.run(
		`INSERT INTO job_runtime_history (
			instance_id,
			full_project_name,
			observed_at,
			source,
			state_hash,
			buildable,
			in_queue,
			color,
			last_build_number,
			last_build_result,
			last_build_building,
			last_completed_build_number,
			last_completed_build_result,
			last_successful_build_number,
			last_failed_build_number,
			message
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			snapshot.instanceId,
			snapshot.fullProjectName,
			snapshot.observedAt,
			snapshot.source,
			snapshot.stateHash,
			snapshot.buildable == null ? null : Number(snapshot.buildable),
			snapshot.inQueue == null ? null : Number(snapshot.inQueue),
			snapshot.color,
			snapshot.lastBuildNumber,
			snapshot.lastBuildResult,
			snapshot.lastBuildBuilding == null
				? null
				: Number(snapshot.lastBuildBuilding),
			snapshot.lastCompletedBuildNumber,
			snapshot.lastCompletedBuildResult,
			snapshot.lastSuccessfulBuildNumber,
			snapshot.lastFailedBuildNumber,
			snapshot.message,
		],
	);

	return true;
}

function writeLog(params: {
	instanceId: string;
	fullProjectName?: string | null;
	level: "info" | "warn" | "error";
	code: string;
	message: string;
	observedAt?: string;
}) {
	const observedAt = params.observedAt ?? new Date().toISOString();
	const previous = runtimeDb
		.query<
			{ id: number; repeat_count: number },
			[string, string | null, string | null, string, string, string]
		>(`
			SELECT id, repeat_count
			FROM job_runtime_log
			WHERE instance_id = ?
				AND (
					(full_project_name = ?)
					OR (full_project_name IS NULL AND ? IS NULL)
				)
				AND level = ?
				AND code = ?
				AND message = ?
			ORDER BY last_seen_at DESC
			LIMIT 1
		`)
		.get(
			params.instanceId,
			params.fullProjectName ?? null,
			params.fullProjectName ?? null,
			params.level,
			params.code,
			params.message,
		);

	if (previous) {
		runtimeDb.run(
			`UPDATE job_runtime_log
			 SET last_seen_at = ?, repeat_count = repeat_count + 1
			 WHERE id = ?`,
			[observedAt, previous.id],
		);
		return;
	}

	runtimeDb.run(
		`INSERT INTO job_runtime_log (
			instance_id,
			full_project_name,
			level,
			code,
			message,
			first_seen_at,
			last_seen_at,
			repeat_count
		) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
		[
			params.instanceId,
			params.fullProjectName ?? null,
			params.level,
			params.code,
			params.message,
			observedAt,
			observedAt,
		],
	);
}

function deleteJobRuntimeData(instanceId: string, fullProjectName: string) {
	runtimeDb.run(
		"DELETE FROM job_runtime_snapshot WHERE instance_id = ? AND full_project_name = ?",
		[instanceId, fullProjectName],
	);
	runtimeDb.run(
		"DELETE FROM job_runtime_history WHERE instance_id = ? AND full_project_name = ?",
		[instanceId, fullProjectName],
	);
	runtimeDb.run(
		"DELETE FROM job_runtime_log WHERE instance_id = ? AND full_project_name = ?",
		[instanceId, fullProjectName],
	);
}

function deleteInstanceRuntimeData(instanceId: string) {
	runtimeDb.run("DELETE FROM job_runtime_snapshot WHERE instance_id = ?", [
		instanceId,
	]);
	runtimeDb.run("DELETE FROM job_runtime_history WHERE instance_id = ?", [
		instanceId,
	]);
	runtimeDb.run("DELETE FROM job_runtime_log WHERE instance_id = ?", [
		instanceId,
	]);
}

async function ensureConfigDir() {
	await mkdir(CONFIG_DIR, { recursive: true });
}

async function readConfig(): Promise<StoredConfig> {
	if (!existsSync(CONFIG_PATH)) {
		return { instances: [] };
	}

	const raw = await readFile(CONFIG_PATH, "utf8");
	const parsed = JSON.parse(raw) as Partial<StoredConfig>;
	return {
		instances: Array.isArray(parsed.instances)
			? parsed.instances.map((instance) => ({
					...instance,
					jobs: Array.isArray(instance.jobs) ? instance.jobs : [],
					monitoringEnabled: instance.monitoringEnabled ?? true,
					pollIntervalMinutes: normalizePollIntervalMinutes(
						instance.pollIntervalMinutes,
					),
				}))
			: [],
	};
}

async function writeConfig(config: StoredConfig) {
	await ensureConfigDir();
	await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function summarizeInstanceChanges(
	previousJobs: string[],
	nextJobs: string[],
	instanceId: string,
) {
	const previousSet = new Set(previousJobs);
	const nextSet = new Set(nextJobs);

	for (const job of previousJobs) {
		if (!nextSet.has(job)) {
			deleteJobRuntimeData(instanceId, job);
		}
	}

	for (const job of nextJobs) {
		if (!previousSet.has(job)) {
			writeLog({
				instanceId,
				fullProjectName: job,
				level: "info",
				code: "job_added",
				message: "Job added to monitoring list.",
			});
		}
	}
}

async function runSecurityCommand(args: string[]): Promise<string> {
	const proc = Bun.spawn(["security", ...args], {
		stdout: "pipe",
		stderr: "pipe",
	});

	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);

	if (exitCode !== 0) {
		throw new Error(
			stderr.trim() || stdout.trim() || "Keychain command failed.",
		);
	}

	return stdout.trim();
}

async function keychainItemExists(instanceId: string): Promise<boolean> {
	try {
		await runSecurityCommand([
			"find-generic-password",
			"-a",
			instanceId,
			"-s",
			keychainServiceName(instanceId),
		]);
		return true;
	} catch {
		return false;
	}
}

async function loadApiKey(instanceId: string): Promise<string | null> {
	try {
		return await runSecurityCommand([
			"find-generic-password",
			"-a",
			instanceId,
			"-s",
			keychainServiceName(instanceId),
			"-w",
		]);
	} catch {
		return null;
	}
}

function buildAuthorizationHeader(username: string, apiKey: string): string {
	return `Basic ${btoa(`${username}:${apiKey}`)}`;
}

async function fetchJsonWithAuth(
	url: string,
	username: string,
	apiKey: string,
): Promise<Response> {
	return fetch(url, {
		headers: {
			Accept: "application/json",
			Authorization: buildAuthorizationHeader(username, apiKey),
		},
	});
}

async function saveApiKey(instanceId: string, apiKey: string) {
	await runSecurityCommand([
		"add-generic-password",
		"-a",
		instanceId,
		"-s",
		keychainServiceName(instanceId),
		"-w",
		apiKey,
		"-U",
	]);
}

async function deleteApiKey(instanceId: string) {
	try {
		await runSecurityCommand([
			"delete-generic-password",
			"-a",
			instanceId,
			"-s",
			keychainServiceName(instanceId),
		]);
	} catch {
		// Ignore missing keychain entries so config cleanup can continue.
	}
}

async function buildSummary(
	instance: JenkinsInstanceRecord,
): Promise<JenkinsInstanceSummary> {
	return {
		...instance,
		hasApiKey: await keychainItemExists(instance.id),
	};
}

function createId(): string {
	return `jenkins_${crypto.randomUUID()}`;
}

export async function listJenkinsInstances(): Promise<
	JenkinsInstanceSummary[]
> {
	const config = await readConfig();
	const instances = [...config.instances].sort((left, right) =>
		left.hostUrl.localeCompare(right.hostUrl),
	);

	return Promise.all(instances.map((instance) => buildSummary(instance)));
}

export async function saveJenkinsInstance(
	input: UpsertJenkinsInstanceInput,
): Promise<JenkinsInstanceSummary[]> {
	const normalized = validateInstanceInput(input);
	const config = await readConfig();
	const now = new Date().toISOString();

	const existingIndex = normalized.id
		? config.instances.findIndex((instance) => instance.id === normalized.id)
		: -1;

	const record: JenkinsInstanceRecord =
		existingIndex >= 0
			? {
					...config.instances[existingIndex],
					hostUrl: normalized.hostUrl,
					username: normalized.username,
					jobs: normalized.jobs ?? config.instances[existingIndex].jobs,
					monitoringEnabled:
						normalized.monitoringEnabled ??
						config.instances[existingIndex].monitoringEnabled,
					pollIntervalMinutes:
						normalized.pollIntervalMinutes ??
						config.instances[existingIndex].pollIntervalMinutes,
					updatedAt: now,
				}
			: {
					id: normalized.id ?? createId(),
					hostUrl: normalized.hostUrl,
					username: normalized.username,
					jobs: normalized.jobs ?? [],
					monitoringEnabled: normalized.monitoringEnabled ?? true,
					pollIntervalMinutes:
						normalized.pollIntervalMinutes ?? normalizePollIntervalMinutes(),
					createdAt: now,
					updatedAt: now,
				};

	const duplicate = config.instances.find(
		(instance) =>
			instance.id !== record.id &&
			instance.hostUrl === record.hostUrl &&
			instance.username === record.username,
	);

	if (duplicate) {
		throw new Error(
			"An instance with the same host URL and username already exists.",
		);
	}

	if (existingIndex >= 0) {
		summarizeInstanceChanges(
			config.instances[existingIndex].jobs,
			record.jobs,
			record.id,
		);
		config.instances[existingIndex] = record;
	} else {
		config.instances.push(record);
		for (const job of record.jobs) {
			writeLog({
				instanceId: record.id,
				fullProjectName: job,
				level: "info",
				code: "job_added",
				message: "Job added to monitoring list.",
				observedAt: now,
			});
		}
	}

	await writeConfig(config);

	if (normalized.apiKey) {
		await saveApiKey(record.id, normalized.apiKey);
	}

	return listJenkinsInstances();
}

export async function deleteJenkinsInstance(
	instanceId: string,
): Promise<JenkinsInstanceSummary[]> {
	const config = await readConfig();
	const nextInstances = config.instances.filter(
		(instance) => instance.id !== instanceId,
	);

	if (nextInstances.length === config.instances.length) {
		return listJenkinsInstances();
	}

	await writeConfig({ instances: nextInstances });
	deleteInstanceRuntimeData(instanceId);
	await deleteApiKey(instanceId);

	return listJenkinsInstances();
}

type JenkinsBuildReference = {
	number: number;
	url: string;
};

type JenkinsBuildApiResponse = JenkinsBuildReference & {
	result?: string | null;
	building?: boolean;
	timestamp?: number;
	duration?: number;
	displayName?: string;
};

type JenkinsJobApiResponse = {
	displayName?: string;
	fullDisplayName?: string;
	url?: string;
	description?: string | null;
	buildable?: boolean;
	inQueue?: boolean;
	color?: string | null;
	nextBuildNumber?: number;
	lastBuild?: JenkinsBuildReference | null;
	lastCompletedBuild?: JenkinsBuildReference | null;
	lastSuccessfulBuild?: JenkinsBuildReference | null;
	lastFailedBuild?: JenkinsBuildReference | null;
};

function toBuildSummary(
	build?: JenkinsBuildApiResponse | null,
): JenkinsJobBuildSummary | null {
	if (!build) {
		return null;
	}

	return {
		number: build.number,
		url: build.url,
		result: build.result,
		building: Boolean(build.building),
		timestamp: build.timestamp,
		duration: build.duration,
		displayName: build.displayName,
	};
}

async function resolveBuildSummary(
	build: JenkinsBuildReference | null | undefined,
	username: string,
	apiKey: string,
): Promise<JenkinsJobBuildSummary | null> {
	if (!build) {
		return null;
	}

	const response = await fetchJsonWithAuth(
		`${build.url}api/json`,
		username,
		apiKey,
	);

	if (!response.ok) {
		return {
			number: build.number,
			url: build.url,
			building: false,
		};
	}

	const payload = (await response.json()) as JenkinsBuildApiResponse;
	return toBuildSummary(payload);
}

async function fetchJobDetailsForInstance(
	instance: JenkinsInstanceRecord,
	fullProjectName: string,
): Promise<JenkinsJobDetails> {
	const storedApiKey = await loadApiKey(instance.id);

	if (!storedApiKey) {
		throw new Error("No API key is saved for this instance.");
	}

	const jobUrl = buildJenkinsJobUrl(instance.hostUrl, fullProjectName);
	let response: Response;

	try {
		response = await fetchJsonWithAuth(
			`${jobUrl}api/json`,
			instance.username,
			storedApiKey,
		);
	} catch (error) {
		throw new Error(
			error instanceof Error
				? `Unable to reach Jenkins: ${error.message}`
				: "Unable to reach Jenkins.",
		);
	}

	if (response.status === 401 || response.status === 403) {
		throw new Error("Authentication failed. Check the saved API key.");
	}

	if (response.status === 404) {
		throw new Error("Job not found on Jenkins.");
	}

	if (!response.ok) {
		throw new Error(
			`Jenkins responded with ${response.status} ${response.statusText}.`,
		);
	}

	const payload = (await response.json()) as JenkinsJobApiResponse;
	const [lastBuild, lastCompletedBuild, lastSuccessfulBuild, lastFailedBuild] =
		await Promise.all([
			resolveBuildSummary(payload.lastBuild, instance.username, storedApiKey),
			resolveBuildSummary(
				payload.lastCompletedBuild,
				instance.username,
				storedApiKey,
			),
			resolveBuildSummary(
				payload.lastSuccessfulBuild,
				instance.username,
				storedApiKey,
			),
			resolveBuildSummary(
				payload.lastFailedBuild,
				instance.username,
				storedApiKey,
			),
		]);

	return {
		fullProjectName,
		displayName: payload.displayName ?? fullProjectName,
		fullDisplayName:
			payload.fullDisplayName ?? payload.displayName ?? fullProjectName,
		url: payload.url ?? jobUrl,
		description: payload.description ?? null,
		buildable: Boolean(payload.buildable),
		inQueue: Boolean(payload.inQueue),
		color: payload.color ?? null,
		nextBuildNumber: payload.nextBuildNumber,
		lastBuild,
		lastCompletedBuild,
		lastSuccessfulBuild,
		lastFailedBuild,
	};
}

export async function getJenkinsJobDetails(
	input: JenkinsJobDetailsInput,
): Promise<JenkinsJobDetails> {
	const normalized = validateJobDetailsInput(input);
	const config = await readConfig();
	const instance = config.instances.find(
		(candidate) => candidate.id === normalized.instanceId,
	);

	if (!instance) {
		throw new Error("Jenkins instance not found.");
	}

	const details = await fetchJobDetailsForInstance(
		instance,
		normalized.fullProjectName,
	);
	const snapshot = buildRuntimeSnapshot({
		instanceId: instance.id,
		fullProjectName: normalized.fullProjectName,
		source: "manual",
		details,
	});
	appendHistoryIfChanged(snapshot);
	return details;
}

export async function testJenkinsConnection(
	input: JenkinsConnectionTestInput,
): Promise<JenkinsConnectionTestResult> {
	const normalized = validateConnectionTestInput(input);
	const storedApiKey =
		normalized.id && !normalized.apiKey
			? await loadApiKey(normalized.id)
			: null;
	const apiKey = normalized.apiKey || storedApiKey;

	if (!apiKey) {
		throw new Error(
			"No API key is available. Provide one in the form or save the instance first.",
		);
	}

	let response: Response;
	try {
		response = await fetch(`${normalized.hostUrl}/api/json`, {
			headers: {
				Accept: "application/json",
				Authorization: buildAuthorizationHeader(normalized.username, apiKey),
			},
		});
	} catch (error) {
		throw new Error(
			error instanceof Error
				? `Unable to reach Jenkins: ${error.message}`
				: "Unable to reach Jenkins.",
		);
	}

	if (response.status === 401 || response.status === 403) {
		return {
			ok: false,
			message: "Authentication failed. Check username and API key.",
			jenkinsVersion: response.headers.get("x-jenkins"),
		};
	}

	if (!response.ok) {
		return {
			ok: false,
			message: `Jenkins responded with ${response.status} ${response.statusText}.`,
			jenkinsVersion: response.headers.get("x-jenkins"),
		};
	}

	return {
		ok: true,
		message: "Connection succeeded.",
		jenkinsVersion: response.headers.get("x-jenkins"),
	};
}

export async function getJenkinsJobActivity(
	input: JenkinsJobActivityInput,
): Promise<JenkinsJobActivity> {
	const normalized = validateJobActivityInput(input);

	const snapshot = selectSnapshotStatement.get(
		normalized.instanceId,
		normalized.fullProjectName,
	);
	const history = selectHistoryStatement.all(
		normalized.instanceId,
		normalized.fullProjectName,
		DEFAULT_HISTORY_LIMIT,
	);
	const logs = selectLogsStatement.all(
		normalized.instanceId,
		normalized.fullProjectName,
		DEFAULT_LOG_LIMIT,
	);

	return {
		snapshot: snapshot ? mapSnapshotRow(snapshot) : null,
		history: history.map(mapHistoryRow),
		logs: logs.map(mapLogRow),
	};
}

export async function runJenkinsMonitoringCycle(): Promise<{
	processedJobs: number;
	observedChanges: number;
}> {
	const config = await readConfig();
	let processedJobs = 0;
	let observedChanges = 0;
	const now = Date.now();

	for (const instance of config.instances) {
		if (!instance.monitoringEnabled || instance.jobs.length === 0) {
			continue;
		}

		const lastPolledAt = lastPolledAtByInstance.get(instance.id) ?? 0;
		const intervalMs =
			normalizePollIntervalMinutes(instance.pollIntervalMinutes) * 60_000;

		if (now - lastPolledAt < intervalMs) {
			continue;
		}

		lastPolledAtByInstance.set(instance.id, now);

		for (const fullProjectName of instance.jobs) {
			processedJobs += 1;
			const observedAt = new Date().toISOString();

			try {
				const details = await fetchJobDetailsForInstance(
					instance,
					fullProjectName,
				);
				const snapshot = buildRuntimeSnapshot({
					instanceId: instance.id,
					fullProjectName,
					source: "poll",
					details,
					observedAt,
				});
				const changed = appendHistoryIfChanged(snapshot);

				if (changed) {
					observedChanges += 1;
					writeLog({
						instanceId: instance.id,
						fullProjectName,
						level: "info",
						code: "job_state_changed",
						message: `Observed state change for build #${snapshot.lastBuildNumber ?? "n/a"}.`,
						observedAt,
					});
				}
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown monitoring error.";
				const snapshot = buildRuntimeSnapshot({
					instanceId: instance.id,
					fullProjectName,
					source: "poll",
					message,
					observedAt,
				});
				const changed = appendHistoryIfChanged(snapshot);
				if (changed) {
					observedChanges += 1;
				}
				writeLog({
					instanceId: instance.id,
					fullProjectName,
					level: "error",
					code: "job_poll_failed",
					message,
					observedAt,
				});
			}
		}
	}

	return { processedJobs, observedChanges };
}
