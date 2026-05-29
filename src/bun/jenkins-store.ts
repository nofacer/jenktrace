import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { Utils } from "electrobun/bun";

import {
	type JenkinsConnectionTestInput,
	type JenkinsConnectionTestResult,
	type JenkinsInstanceRecord,
	type JenkinsInstanceSummary,
	type UpsertJenkinsInstanceInput,
	validateConnectionTestInput,
	validateInstanceInput,
} from "../shared/jenkins";

const CONFIG_DIR = join(Utils.paths.userData, "config");
const CONFIG_PATH = join(CONFIG_DIR, "jenkins-instances.json");
const KEYCHAIN_SERVICE_PREFIX = "dev.electrobun.jenktrace.jenkins-instance";

type StoredConfig = {
	instances: JenkinsInstanceRecord[];
};

function keychainServiceName(instanceId: string): string {
	return `${KEYCHAIN_SERVICE_PREFIX}.${instanceId}`;
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
				}))
			: [],
	};
}

async function writeConfig(config: StoredConfig) {
	await ensureConfigDir();
	await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
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
					updatedAt: now,
				}
			: {
					id: normalized.id ?? createId(),
					hostUrl: normalized.hostUrl,
					username: normalized.username,
					jobs: normalized.jobs ?? [],
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
		config.instances[existingIndex] = record;
	} else {
		config.instances.push(record);
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
	await deleteApiKey(instanceId);

	return listJenkinsInstances();
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

	const authorization = btoa(`${normalized.username}:${apiKey}`);

	let response: Response;
	try {
		response = await fetch(`${normalized.hostUrl}/api/json`, {
			headers: {
				Accept: "application/json",
				Authorization: `Basic ${authorization}`,
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
