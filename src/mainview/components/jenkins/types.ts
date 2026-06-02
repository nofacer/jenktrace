import type {
	JenkinsConnectionTestResult,
	JenkinsInstanceSummary,
} from "../../../shared/jenkins";

export type InstanceFormState = {
	id?: string;
	hostUrl: string;
	username: string;
	customName: string;
	iconLabel: string;
	iconBackgroundColor: string;
	apiKey: string;
	disableSslVerification: boolean;
	monitoringEnabled: boolean;
	pollIntervalMinutes: string;
};

export type JobFormState = {
	originalName?: string;
	fullProjectName: string;
	retentionDays: string;
	maxBuilds: string;
	prefetchFailureLogs: boolean;
	prefetchSuccessLogs: boolean;
};

export type InstanceDialogMode = "create" | "edit";
export type JobDialogMode = "create" | "edit";

export const EMPTY_FORM: InstanceFormState = {
	hostUrl: "",
	username: "",
	customName: "",
	iconLabel: "",
	iconBackgroundColor: "",
	apiKey: "",
	disableSslVerification: false,
	monitoringEnabled: true,
	pollIntervalMinutes: "5",
};

export const EMPTY_JOB_FORM: JobFormState = {
	fullProjectName: "",
	retentionDays: "90",
	maxBuilds: "1000",
	prefetchFailureLogs: true,
	prefetchSuccessLogs: false,
};

export function buildFormState(
	instance?: JenkinsInstanceSummary | null,
): InstanceFormState {
	if (!instance) {
		return EMPTY_FORM;
	}

	return {
		id: instance.id,
		hostUrl: instance.hostUrl,
		username: instance.username,
		customName: instance.customName ?? "",
		iconLabel: instance.iconLabel ?? "",
		iconBackgroundColor: instance.iconBackgroundColor ?? "",
		apiKey: "",
		disableSslVerification: instance.disableSslVerification,
		monitoringEnabled: instance.monitoringEnabled,
		pollIntervalMinutes: String(instance.pollIntervalMinutes),
	};
}

export function buildJobFormState(
	job?: string | null,
	retentionDays?: number,
	maxBuilds?: number,
	prefetchStatuses: Array<"failure" | "success"> = ["failure"],
): JobFormState {
	if (!job) {
		return EMPTY_JOB_FORM;
	}

	return {
		originalName: job,
		fullProjectName: job,
		retentionDays: String(retentionDays ?? 90),
		maxBuilds: String(maxBuilds ?? 1000),
		prefetchFailureLogs: prefetchStatuses.includes("failure"),
		prefetchSuccessLogs: prefetchStatuses.includes("success"),
	};
}

export type InstanceDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: InstanceDialogMode;
	formState: InstanceFormState;
	onFormStateChange: (
		updater: (current: InstanceFormState) => InstanceFormState,
	) => void;
	errorMessage: string | null;
	testResult: JenkinsConnectionTestResult | null;
	isSaving: boolean;
	isDeleting: boolean;
	isTesting: boolean;
	onTestConnection: () => void;
	onSave: () => void;
};

export type JobDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: JobDialogMode;
	formState: JobFormState;
	onFormStateChange: (updater: (current: JobFormState) => JobFormState) => void;
	errorMessage: string | null;
	isSaving: boolean;
	selectedInstance: JenkinsInstanceSummary | null;
	onSave: () => void;
};
