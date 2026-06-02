import { describe, expect, test } from "bun:test";

import {
	buildHttpRequestLogDetail,
	buildHttpRequestLogMessage,
	getAppLogLevelForHttpStatus,
	sanitizeLogUrl,
} from "./app-log";

describe("app log helpers", () => {
	test("removes query strings and fragments from log urls", () => {
		expect(
			sanitizeLogUrl(
				"https://jenkins.example.com/job/app/api/json?tree=name#details",
			),
		).toBe("https://jenkins.example.com/job/app/api/json");
	});

	test("formats request messages with uppercase methods", () => {
		expect(
			buildHttpRequestLogMessage(
				"post",
				"https://jenkins.example.com/job/app/api/json?tree=name",
			),
		).toBe("POST https://jenkins.example.com/job/app/api/json");
	});

	test("includes status and duration in request details", () => {
		expect(
			buildHttpRequestLogDetail({
				status: 503,
				statusText: "Service Unavailable",
				durationMs: 123.8,
			}),
		).toBe("Status 503 Service Unavailable. Duration 124 ms.");
	});

	test("includes failure details when the request throws", () => {
		expect(
			buildHttpRequestLogDetail({
				durationMs: 12,
				errorMessage: "connect ECONNREFUSED 127.0.0.1:8080",
			}),
		).toBe(
			"Request failed. Duration 12 ms. connect ECONNREFUSED 127.0.0.1:8080",
		);
	});

	test("maps http outcomes to log levels", () => {
		expect(getAppLogLevelForHttpStatus({ status: 200 })).toBe("debug");
		expect(getAppLogLevelForHttpStatus({ status: 404 })).toBe("warn");
		expect(getAppLogLevelForHttpStatus({ status: 503 })).toBe("error");
		expect(
			getAppLogLevelForHttpStatus({ errorMessage: "network timeout" }),
		).toBe("error");
	});
});
