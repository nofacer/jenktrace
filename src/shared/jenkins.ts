export type JenkinsInstanceId = string;

export type JenkinsInstanceRecord = {
	id: JenkinsInstanceId;
	hostUrl: string;
	username: string;
	jobs: string[];
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

export type UpsertJenkinsInstanceInput = {
	id?: JenkinsInstanceId;
	hostUrl: string;
	username: string;
	jobs: string[];
	apiKey?: string;
};

export function normalizeJobNames(values: string[]): string[] {
	return values
		.map((value) => value.trim())
		.filter(Boolean)
		.filter((value, index, array) => array.indexOf(value) === index);
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
	const jobs = normalizeJobNames(input.jobs);

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
		apiKey: input.apiKey?.trim(),
	};
}
