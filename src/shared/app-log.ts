export type AppLogLevel = "debug" | "info" | "warn" | "error";

export type AppLogScope = "app" | "http" | "instance" | "job" | "monitoring";

export type AppLogEntry = {
	id: number;
	scope: AppLogScope;
	level: AppLogLevel;
	code: string;
	message: string;
	detail?: string | null;
	firstSeenAt: string;
	lastSeenAt: string;
	repeatCount: number;
};

export function sanitizeLogUrl(url: string): string {
	try {
		const parsed = new URL(url);
		return `${parsed.origin}${parsed.pathname}`;
	} catch {
		return url.split(/[?#]/u, 1)[0] ?? url;
	}
}

export function buildHttpRequestLogMessage(
	method: string,
	url: string,
): string {
	return `${method.toUpperCase()} ${sanitizeLogUrl(url)}`;
}

export function buildHttpRequestLogDetail(params: {
	status?: number;
	statusText?: string;
	durationMs?: number;
	errorMessage?: string;
}): string {
	const parts: string[] = [];

	if (typeof params.status === "number") {
		parts.push(
			params.statusText?.trim()
				? `Status ${params.status} ${params.statusText.trim()}.`
				: `Status ${params.status}.`,
		);
	} else if (params.errorMessage) {
		parts.push("Request failed.");
	}

	if (typeof params.durationMs === "number") {
		parts.push(`Duration ${Math.max(0, Math.round(params.durationMs))} ms.`);
	}

	if (params.errorMessage) {
		parts.push(params.errorMessage);
	}

	return parts.join(" ");
}

export function getAppLogLevelForHttpStatus(params: {
	status?: number;
	errorMessage?: string;
}): AppLogLevel {
	if (params.errorMessage) {
		return "error";
	}

	if (typeof params.status !== "number") {
		return "debug";
	}

	if (params.status >= 500) {
		return "error";
	}

	if (params.status >= 400) {
		return "warn";
	}

	return "debug";
}
