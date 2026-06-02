import { describe, expect, test } from "bun:test";

import {
	getJenkinsInstanceButtonTitle,
	getJenkinsInstanceDisplayName,
	getJenkinsInstanceIconColors,
	getJenkinsInstanceIconLabel,
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
