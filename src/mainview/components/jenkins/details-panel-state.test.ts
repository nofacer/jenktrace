import { describe, expect, test } from "bun:test";

import { getDetailsPanelLoadState } from "./details-panel-state";

describe("getDetailsPanelLoadState", () => {
	test("keeps job content visible during refresh when data already exists", () => {
		expect(
			getDetailsPanelLoadState({
				jobDetails: {
					fullProjectName: "folder/app",
					displayName: "app",
					fullDisplayName: "folder » app",
					url: "https://jenkins.example.com/job/folder/job/app/",
					buildable: true,
					inQueue: false,
				},
				jobAnalytics: {
					range: "last7d",
					rangeStart: "2026-06-01T00:00:00.000Z",
					rangeEnd: "2026-06-08T00:00:00.000Z",
					totalBuilds: 1,
					completedBuilds: 1,
					successfulBuilds: 1,
					failedBuilds: 0,
					runningBuilds: 0,
					successRate: 1,
					averageDurationMs: 1200,
					builds: [],
					buckets: [],
				},
				isLoadingJobDetails: true,
				isLoadingJobAnalytics: true,
			}),
		).toEqual({
			hasJobDetails: true,
			hasJobAnalytics: true,
			shouldShowInitialJobDetailsSkeleton: false,
			shouldShowInitialJobAnalyticsSkeleton: false,
		});
	});

	test("shows initial skeletons only before first successful load", () => {
		expect(
			getDetailsPanelLoadState({
				jobDetails: null,
				jobAnalytics: null,
				isLoadingJobDetails: true,
				isLoadingJobAnalytics: true,
			}),
		).toEqual({
			hasJobDetails: false,
			hasJobAnalytics: false,
			shouldShowInitialJobDetailsSkeleton: true,
			shouldShowInitialJobAnalyticsSkeleton: true,
		});
	});
});
