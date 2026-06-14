import { describe, expect, test } from "bun:test";

import {
	filterJenkinsJobBuildsByStatus,
	getJenkinsInstanceButtonTitle,
	getJenkinsInstanceDisplayName,
	getJenkinsInstanceIconColors,
	getJenkinsInstanceIconLabel,
	getJenkinsJobBuildStatusFilter,
	getJenkinsJobBuildStatusFilterOptions,
	type JenkinsJobBuildRecord,
	validateInstanceInput,
} from "./jenkins";

describe("instance identity helpers", () => {
	test("prefers custom display names when present", () => {
		const instance = {
			hostUrl: "https://jenkins.example.com",
			customName: "Production Jenkins",
			iconLabel: undefined,
		};

		expect(getJenkinsInstanceDisplayName(instance)).toBe("Production Jenkins");
		expect(getJenkinsInstanceButtonTitle(instance)).toBe(
			"Production Jenkins (jenkins.example.com)",
		);
		expect(getJenkinsInstanceIconLabel(instance)).toBe("PJ");
	});

	test("normalizes explicit icon labels", () => {
		const instance = {
			hostUrl: "https://jenkins.example.com",
			customName: undefined,
			iconLabel: " p-r d ",
		};

		expect(getJenkinsInstanceIconLabel(instance)).toBe("PRD");
	});

	test("falls back to the hostname when no custom name is set", () => {
		const instance = {
			hostUrl: "https://jenkins.example.com",
			customName: undefined,
			iconLabel: undefined,
		};

		expect(getJenkinsInstanceDisplayName(instance)).toBe("jenkins.example.com");
		expect(getJenkinsInstanceButtonTitle(instance)).toBe("jenkins.example.com");
		expect(getJenkinsInstanceIconLabel(instance)).toBe("JE");
	});

	test("derives readable foreground colors for custom backgrounds", () => {
		expect(
			getJenkinsInstanceIconColors({ iconBackgroundColor: "#ffffff" }),
		).toEqual({
			backgroundColor: "#ffffff",
			foregroundColor: "#111827",
		});
		expect(
			getJenkinsInstanceIconColors({ iconBackgroundColor: "#111827" }),
		).toEqual({
			backgroundColor: "#111827",
			foregroundColor: "#ffffff",
		});
	});
});

describe("build status filters", () => {
	const builds: JenkinsJobBuildRecord[] = [
		{
			id: "build-101",
			number: 101,
			url: "https://jenkins.example.com/job/app/101/",
			result: "SUCCESS",
			building: false,
			resultCategory: "success",
		},
		{
			id: "build-102",
			number: 102,
			url: "https://jenkins.example.com/job/app/102/",
			result: "FAILURE",
			building: false,
			resultCategory: "failed",
		},
		{
			id: "build-103",
			number: 103,
			url: "https://jenkins.example.com/job/app/103/",
			result: "ABORTED",
			building: false,
			resultCategory: "other",
		},
		{
			id: "build-104",
			number: 104,
			url: "https://jenkins.example.com/job/app/104/",
			result: "UNSTABLE",
			building: false,
			resultCategory: "other",
		},
		{
			id: "build-105",
			number: 105,
			url: "https://jenkins.example.com/job/app/105/",
			result: "NOT_BUILT",
			building: false,
			resultCategory: "other",
		},
		{
			id: "build-106",
			number: 106,
			url: "https://jenkins.example.com/job/app/106/",
			result: null,
			building: true,
			resultCategory: "running",
		},
		{
			id: "build-107",
			number: 107,
			url: "https://jenkins.example.com/job/app/107/",
			result: null,
			building: false,
			resultCategory: "other",
		},
	];

	test("maps Jenkins build records to filter statuses", () => {
		expect(getJenkinsJobBuildStatusFilter(builds[0])).toBe("success");
		expect(getJenkinsJobBuildStatusFilter(builds[1])).toBe("failure");
		expect(getJenkinsJobBuildStatusFilter(builds[2])).toBe("aborted");
		expect(getJenkinsJobBuildStatusFilter(builds[3])).toBe("unstable");
		expect(getJenkinsJobBuildStatusFilter(builds[4])).toBe("notBuilt");
		expect(getJenkinsJobBuildStatusFilter(builds[5])).toBe("running");
		expect(getJenkinsJobBuildStatusFilter(builds[6])).toBe("unknown");
	});

	test("filters builds by selected status", () => {
		expect(filterJenkinsJobBuildsByStatus(builds, "all")).toBe(builds);
		expect(
			filterJenkinsJobBuildsByStatus(builds, "failure").map(
				(build) => build.number,
			),
		).toEqual([102]);
		expect(
			filterJenkinsJobBuildsByStatus(builds, "running").map(
				(build) => build.number,
			),
		).toEqual([106]);
		expect(
			filterJenkinsJobBuildsByStatus(builds, "unknown").map(
				(build) => build.number,
			),
		).toEqual([107]);
	});

	test("lists only filter options present in the current builds", () => {
		expect(getJenkinsJobBuildStatusFilterOptions(builds)).toEqual([
			"all",
			"success",
			"failure",
			"running",
			"aborted",
			"unstable",
			"notBuilt",
			"unknown",
		]);
		expect(getJenkinsJobBuildStatusFilterOptions(builds.slice(0, 2))).toEqual([
			"all",
			"success",
			"failure",
		]);
	});
});

describe("validateInstanceInput", () => {
	test("normalizes custom instance identity fields", () => {
		const normalized = validateInstanceInput({
			hostUrl: "https://jenkins.example.com///",
			username: "  automation-bot  ",
			customName: "  Production Jenkins  ",
			iconLabel: " p-r d ",
			iconBackgroundColor: "#abc",
		});

		expect(normalized.hostUrl).toBe("https://jenkins.example.com");
		expect(normalized.username).toBe("automation-bot");
		expect(normalized.customName).toBe("Production Jenkins");
		expect(normalized.iconLabel).toBe("PRD");
		expect(normalized.iconBackgroundColor).toBe("#aabbcc");
	});

	test("rejects invalid icon background colors", () => {
		expect(() =>
			validateInstanceInput({
				hostUrl: "https://jenkins.example.com",
				username: "automation-bot",
				iconBackgroundColor: "blue",
			}),
		).toThrow("Icon background color must be a valid hex color.");
	});
});
