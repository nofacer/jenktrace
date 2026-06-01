import type {
	JenkinsConnectionTestResult,
	JenkinsInstanceSummary,
} from "../../../shared/jenkins";

export type InstanceFormState = {
	id?: string;
	hostUrl: string;
	username: string;
	apiKey: string;
	monitoringEnabled: boolean;
	pollIntervalMinutes: string;
};

export type JobFormState = {
	originalName?: string;
	fullProjectName: string;
};

export type InstanceDialogMode = "create" | "edit";
export type JobDialogMode = "create" | "edit";

export const EMPTY_FORM: InstanceFormState = {
	hostUrl: "",
	username: "",
	apiKey: "",
	monitoringEnabled: true,
	pollIntervalMinutes: "5",
};

export const EMPTY_JOB_FORM: JobFormState = {
	fullProjectName: "",
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
		apiKey: "",
		monitoringEnabled: instance.monitoringEnabled,
		pollIntervalMinutes: String(instance.pollIntervalMinutes),
	};
}

export function buildJobFormState(job?: string | null): JobFormState {
	if (!job) {
		return EMPTY_JOB_FORM;
	}

	return {
		originalName: job,
		fullProjectName: job,
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
