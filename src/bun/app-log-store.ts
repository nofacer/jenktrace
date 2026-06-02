import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import {
	type AppLogEntry,
	type AppLogLevel,
	type AppLogScope,
	buildHttpRequestLogDetail,
	buildHttpRequestLogMessage,
	getAppLogLevelForHttpStatus,
} from "../shared/app-log";
import { getAppUserDataDir } from "./runtime-paths";

const CONFIG_DIR = join(getAppUserDataDir(), "config");
const RUNTIME_DB_PATH = join(CONFIG_DIR, "jenkins-runtime.sqlite");
const DEFAULT_APP_LOG_LIMIT = 100;

type AppLogRow = {
	id: number;
	scope: AppLogScope;
	level: AppLogLevel;
	code: string;
	message: string;
	detail: string | null;
	first_seen_at: string;
	last_seen_at: string;
	repeat_count: number;
};

mkdirSync(CONFIG_DIR, { recursive: true });

const appLogDb = new Database(RUNTIME_DB_PATH);

appLogDb.exec(`
	PRAGMA journal_mode = WAL;
	PRAGMA synchronous = NORMAL;
	CREATE TABLE IF NOT EXISTS app_runtime_log (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		scope TEXT NOT NULL,
		level TEXT NOT NULL,
		code TEXT NOT NULL,
		message TEXT NOT NULL,
		detail TEXT,
		first_seen_at TEXT NOT NULL,
		last_seen_at TEXT NOT NULL,
		repeat_count INTEGER NOT NULL DEFAULT 1
	);
	CREATE INDEX IF NOT EXISTS idx_app_runtime_log_lookup
		ON app_runtime_log (last_seen_at DESC, scope, level);
`);

const selectAppLogsStatement = appLogDb.query<AppLogRow, [number]>(`
	SELECT
		id,
		scope,
		level,
		code,
		message,
		detail,
		first_seen_at,
		last_seen_at,
		repeat_count
	FROM app_runtime_log
	ORDER BY last_seen_at DESC
	LIMIT ?
`);

function mapAppLogRow(row: AppLogRow): AppLogEntry {
	return {
		id: row.id,
		scope: row.scope,
		level: row.level,
		code: row.code,
		message: row.message,
		detail: row.detail,
		firstSeenAt: row.first_seen_at,
		lastSeenAt: row.last_seen_at,
		repeatCount: row.repeat_count,
	};
}

export function writeAppLog(params: {
	scope: AppLogScope;
	level: AppLogLevel;
	code: string;
	message: string;
	detail?: string | null;
	observedAt?: string;
}) {
	const observedAt = params.observedAt ?? new Date().toISOString();
	const detail = params.detail?.trim() || null;
	const previous = appLogDb
		.query<
			{ id: number },
			[AppLogScope, AppLogLevel, string, string, string | null, string | null]
		>(`
			SELECT id
			FROM app_runtime_log
			WHERE scope = ?
				AND level = ?
				AND code = ?
				AND message = ?
				AND ((detail = ?) OR (detail IS NULL AND ? IS NULL))
			ORDER BY last_seen_at DESC
			LIMIT 1
		`)
		.get(
			params.scope,
			params.level,
			params.code,
			params.message,
			detail,
			detail,
		);

	if (previous) {
		appLogDb.run(
			`UPDATE app_runtime_log
			 SET last_seen_at = ?, repeat_count = repeat_count + 1
			 WHERE id = ?`,
			[observedAt, previous.id],
		);
		return;
	}

	appLogDb.run(
		`INSERT INTO app_runtime_log (
			scope,
			level,
			code,
			message,
			detail,
			first_seen_at,
			last_seen_at,
			repeat_count
		) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
		[
			params.scope,
			params.level,
			params.code,
			params.message,
			detail,
			observedAt,
			observedAt,
		],
	);
}

export function listAppLogs(limit = DEFAULT_APP_LOG_LIMIT): AppLogEntry[] {
	return selectAppLogsStatement.all(limit).map(mapAppLogRow);
}

export async function fetchWithAppLog(params: {
	url: string;
	code: string;
	method?: string;
	headers?: Record<string, string>;
	tls?: { rejectUnauthorized?: boolean };
}) {
	const startedAt = Date.now();
	const method = params.method ?? "GET";
	const message = buildHttpRequestLogMessage(method, params.url);

	try {
		const response = await fetch(params.url, {
			method,
			headers: params.headers,
			tls: params.tls,
		});
		writeAppLog({
			scope: "http",
			level: getAppLogLevelForHttpStatus({ status: response.status }),
			code: params.code,
			message,
			detail: buildHttpRequestLogDetail({
				status: response.status,
				statusText: response.statusText,
				durationMs: Date.now() - startedAt,
			}),
		});
		return response;
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown request error.";
		writeAppLog({
			scope: "http",
			level: getAppLogLevelForHttpStatus({ errorMessage }),
			code: params.code,
			message,
			detail: buildHttpRequestLogDetail({
				durationMs: Date.now() - startedAt,
				errorMessage,
			}),
		});
		throw error;
	}
}
