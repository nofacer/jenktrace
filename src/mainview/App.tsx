import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { InstanceFormState, JobFormState } from "@/components/jenkins";
import {
	buildFormState,
	buildJobFormState,
	DeleteInstanceDialog,
	DeleteJobDialog,
	DetailsPanel,
	EMPTY_FORM,
	EMPTY_JOB_FORM,
	InstanceDialog,
	InstanceSidebar,
	JobDialog,
} from "@/components/jenkins";
import { TooltipProvider } from "@/components/ui/tooltip";
import { appRpc } from "@/lib/app-rpc";
import type { AppLogEntry } from "../shared/app-log";
import type {
	JenkinsBuildTimeRange,
	JenkinsConnectionTestResult,
	JenkinsInstanceSummary,
	JenkinsJobActivity,
	JenkinsJobAnalytics,
	JenkinsJobDetails,
	UpsertJenkinsInstanceInput,
} from "../shared/jenkins";
import { normalizeFullProjectName } from "../shared/jenkins";

const AUTO_REFRESH_INTERVAL_MS = 60_000;
const APP_LOG_REFRESH_INTERVAL_MS = 5_000;

export default function App() {
	const [instances, setInstances] = useState<JenkinsInstanceSummary[]>([]);
	const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(
		null,
	);
	const [selectedJob, setSelectedJob] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isSavingJob, setIsSavingJob] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isDeletingJob, setIsDeletingJob] = useState(false);
	const [isTesting, setIsTesting] = useState(false);
	const [isLoadingJobDetails, setIsLoadingJobDetails] = useState(false);
	const [isLoadingJobAnalytics, setIsLoadingJobAnalytics] = useState(false);
	const [isInstanceDialogOpen, setIsInstanceDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isDeleteJobDialogOpen, setIsDeleteJobDialogOpen] = useState(false);
	const [instanceDialogMode, setInstanceDialogMode] = useState<
		"create" | "edit"
	>("create");
	const [instanceFormState, setInstanceFormState] =
		useState<InstanceFormState>(EMPTY_FORM);
	const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
	const [jobDialogMode, setJobDialogMode] = useState<"create" | "edit">(
		"create",
	);
	const [jobFormState, setJobFormState] =
		useState<JobFormState>(EMPTY_JOB_FORM);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [jobErrorMessage, setJobErrorMessage] = useState<string | null>(null);
	const [jobDetailsError, setJobDetailsError] = useState<string | null>(null);
	const [jobActivityError, setJobActivityError] = useState<string | null>(null);
	const [jobAnalyticsError, setJobAnalyticsError] = useState<string | null>(
		null,
	);
	const [deleteJobErrorMessage, setDeleteJobErrorMessage] = useState<
		string | null
	>(null);
	const [testResult, setTestResult] =
		useState<JenkinsConnectionTestResult | null>(null);
	const [jobDetails, setJobDetails] = useState<JenkinsJobDetails | null>(null);
	const [jobActivity, setJobActivity] = useState<JenkinsJobActivity | null>(
		null,
	);
	const [jobAnalytics, setJobAnalytics] = useState<JenkinsJobAnalytics | null>(
		null,
	);
	const [selectedTimeRange, setSelectedTimeRange] =
		useState<JenkinsBuildTimeRange>("last7d");
	const [appLogs, setAppLogs] = useState<AppLogEntry[]>([]);
	const [isLoadingAppLogs, setIsLoadingAppLogs] = useState(false);
	const [appLogsError, setAppLogsError] = useState<string | null>(null);
	const jobDetailsRequestIdRef = useRef(0);
	const jobAnalyticsRequestIdRef = useRef(0);

	const selectedInstance = useMemo(
		() =>
			instances.find((instance) => instance.id === selectedInstanceId) ?? null,
		[instances, selectedInstanceId],
	);
	const loadAppLogs = useCallback(async () => {
		setIsLoadingAppLogs(true);
		setAppLogsError(null);

		try {
			const nextLogs = await appRpc.proxy.request.listAppLogs();
			setAppLogs(nextLogs);
		} catch (error) {
			setAppLogsError(
				error instanceof Error ? error.message : "Failed to load app logs.",
			);
		} finally {
			setIsLoadingAppLogs(false);
		}
	}, []);

	const loadSelectedJobDetails = useCallback(async () => {
		if (!selectedInstance || !selectedJob) {
			return;
		}

		const requestId = ++jobDetailsRequestIdRef.current;

		setIsLoadingJobDetails(true);
		setJobDetailsError(null);
		setJobActivityError(null);

		try {
			const [nextDetails, nextActivity] = await Promise.all([
				appRpc.proxy.request.getJenkinsJobDetails({
					instanceId: selectedInstance.id,
					fullProjectName: selectedJob,
				}),
				appRpc.proxy.request.getJenkinsJobActivity({
					instanceId: selectedInstance.id,
					fullProjectName: selectedJob,
				}),
			]);

			if (requestId === jobDetailsRequestIdRef.current) {
				setJobDetails(nextDetails);
				setJobActivity(nextActivity);
			}
		} catch (error) {
			if (requestId === jobDetailsRequestIdRef.current) {
				setJobDetailsError(
					error instanceof Error
						? error.message
						: "Failed to load Jenkins job details.",
				);
				setJobActivityError(
					error instanceof Error ? error.message : "Failed to load activity.",
				);
			}
		} finally {
			if (requestId === jobDetailsRequestIdRef.current) {
				setIsLoadingJobDetails(false);
			}
		}
	}, [selectedInstance, selectedJob]);

	const loadSelectedJobAnalytics = useCallback(async () => {
		if (!selectedInstance || !selectedJob) {
			return;
		}

		const requestId = ++jobAnalyticsRequestIdRef.current;

		setIsLoadingJobAnalytics(true);
		setJobAnalyticsError(null);

		try {
			const nextAnalytics = await appRpc.proxy.request.getJenkinsJobAnalytics({
				instanceId: selectedInstance.id,
				fullProjectName: selectedJob,
				range: selectedTimeRange,
			});

			if (requestId === jobAnalyticsRequestIdRef.current) {
				setJobAnalytics(nextAnalytics);
			}
		} catch (error) {
			if (requestId === jobAnalyticsRequestIdRef.current) {
				setJobAnalyticsError(
					error instanceof Error
						? error.message
						: "Failed to load build analytics.",
				);
			}
		} finally {
			if (requestId === jobAnalyticsRequestIdRef.current) {
				setIsLoadingJobAnalytics(false);
			}
		}
	}, [selectedInstance, selectedJob, selectedTimeRange]);

	const refreshSelectedJob = useCallback(async () => {
		await Promise.all([loadSelectedJobDetails(), loadSelectedJobAnalytics()]);
	}, [loadSelectedJobAnalytics, loadSelectedJobDetails]);

	useEffect(() => {
		const run = async () => {
			setIsLoading(true);
			setErrorMessage(null);

			try {
				const [nextInstances] = await Promise.all([
					appRpc.proxy.request.listJenkinsInstances(),
					loadAppLogs(),
				]);
				setInstances(nextInstances);
				setSelectedInstanceId(nextInstances[0]?.id ?? null);
			} catch (error) {
				setErrorMessage(
					error instanceof Error ? error.message : "Failed to load instances.",
				);
			} finally {
				setIsLoading(false);
			}
		};

		void run();
	}, [loadAppLogs]);

	useEffect(() => {
		if (!selectedInstance) {
			setSelectedJob(null);
			return;
		}

		setSelectedJob((currentJob) =>
			currentJob && selectedInstance.jobs.includes(currentJob)
				? currentJob
				: (selectedInstance.jobs[0] ?? null),
		);
	}, [selectedInstance]);

	useEffect(() => {
		if (!selectedInstance || !selectedJob) {
			setJobDetails(null);
			setJobDetailsError(null);
			setJobActivity(null);
			setJobActivityError(null);
			setIsLoadingJobDetails(false);
			return;
		}

		void loadSelectedJobDetails();
	}, [loadSelectedJobDetails, selectedInstance, selectedJob]);

	useEffect(() => {
		if (!selectedInstance || !selectedJob) {
			setJobAnalytics(null);
			setJobAnalyticsError(null);
			setIsLoadingJobAnalytics(false);
			return;
		}

		void loadSelectedJobAnalytics();
	}, [loadSelectedJobAnalytics, selectedInstance, selectedJob]);

	useEffect(() => {
		if (!selectedInstance || !selectedJob) {
			return;
		}

		const intervalId = window.setInterval(() => {
			if (document.visibilityState !== "visible") {
				return;
			}

			if (isLoadingJobDetails || isLoadingJobAnalytics) {
				return;
			}

			void refreshSelectedJob();
		}, AUTO_REFRESH_INTERVAL_MS);

		return () => window.clearInterval(intervalId);
	}, [
		isLoadingJobAnalytics,
		isLoadingJobDetails,
		refreshSelectedJob,
		selectedInstance,
		selectedJob,
	]);

	useEffect(() => {
		const intervalId = window.setInterval(() => {
			if (document.visibilityState !== "visible") {
				return;
			}

			void loadAppLogs();
		}, APP_LOG_REFRESH_INTERVAL_MS);

		return () => window.clearInterval(intervalId);
	}, [loadAppLogs]);

	function openCreateDialog() {
		setInstanceDialogMode("create");
		setInstanceFormState(EMPTY_FORM);
		setTestResult(null);
		setErrorMessage(null);
		setIsInstanceDialogOpen(true);
	}

	function openEditDialog() {
		if (!selectedInstance) {
			return;
		}

		setInstanceDialogMode("edit");
		setInstanceFormState(buildFormState(selectedInstance));
		setTestResult(null);
		setErrorMessage(null);
		setIsInstanceDialogOpen(true);
	}

	function openDeleteDialog() {
		if (!selectedInstance || isDeleting) {
			return;
		}

		setErrorMessage(null);
		setIsDeleteDialogOpen(true);
	}

	function openCreateJobDialog() {
		if (!selectedInstance) {
			return;
		}

		setJobDialogMode("create");
		setJobFormState(EMPTY_JOB_FORM);
		setJobErrorMessage(null);
		setIsJobDialogOpen(true);
	}

	function openEditJobDialog() {
		if (!selectedInstance || !selectedJob) {
			return;
		}

		setJobDialogMode("edit");
		setJobFormState(
			buildJobFormState(
				selectedJob,
				selectedInstance.jobRetentionDays[selectedJob],
				selectedInstance.jobMaxBuilds[selectedJob],
				selectedInstance.jobPrefetchBuildLogStatuses[selectedJob] ?? [
					"failure",
				],
			),
		);
		setJobErrorMessage(null);
		setIsJobDialogOpen(true);
	}

	function openDeleteJobDialog() {
		if (!selectedInstance || !selectedJob || isDeletingJob) {
			return;
		}

		setDeleteJobErrorMessage(null);
		setIsDeleteJobDialogOpen(true);
	}

	async function handleSave() {
		setIsSaving(true);
		setErrorMessage(null);

		try {
			const payload: UpsertJenkinsInstanceInput = {
				id: instanceFormState.id,
				hostUrl: instanceFormState.hostUrl,
				username: instanceFormState.username,
				customName: instanceFormState.customName || undefined,
				iconLabel: instanceFormState.iconLabel || undefined,
				iconBackgroundColor: instanceFormState.iconBackgroundColor || undefined,
				disableSslVerification: instanceFormState.disableSslVerification,
				monitoringEnabled: instanceFormState.monitoringEnabled,
				pollIntervalMinutes: Number(instanceFormState.pollIntervalMinutes),
				apiKey: instanceFormState.apiKey || undefined,
			};

			const nextInstances =
				await appRpc.proxy.request.saveJenkinsInstance(payload);
			const savedId =
				payload.id ??
				nextInstances.find(
					(instance) =>
						instance.hostUrl === payload.hostUrl &&
						instance.username === payload.username,
				)?.id ??
				null;

			setInstances(nextInstances);
			setSelectedInstanceId(savedId);
			setIsInstanceDialogOpen(false);
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "Failed to save instance.",
			);
		} finally {
			await loadAppLogs();
			setIsSaving(false);
		}
	}

	async function handleDelete() {
		if (!selectedInstance) {
			return;
		}

		setIsDeleting(true);
		setErrorMessage(null);

		try {
			const nextInstances = await appRpc.proxy.request.deleteJenkinsInstance({
				id: selectedInstance.id,
			});
			setInstances(nextInstances);
			setSelectedInstanceId(nextInstances[0]?.id ?? null);
			setIsDeleteDialogOpen(false);
			setIsInstanceDialogOpen(false);
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "Failed to delete instance.",
			);
		} finally {
			await loadAppLogs();
			setIsDeleting(false);
		}
	}

	async function handleTestConnection() {
		setIsTesting(true);
		setErrorMessage(null);
		setTestResult(null);

		try {
			const result = await appRpc.proxy.request.testJenkinsConnection({
				id: instanceFormState.id,
				hostUrl: instanceFormState.hostUrl,
				username: instanceFormState.username,
				disableSslVerification: instanceFormState.disableSslVerification,
				apiKey: instanceFormState.apiKey || undefined,
			});
			setTestResult(result);
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "Failed to test connection.",
			);
		} finally {
			await loadAppLogs();
			setIsTesting(false);
		}
	}

	async function handleSaveJob() {
		if (!selectedInstance) {
			return;
		}

		setIsSavingJob(true);
		setJobErrorMessage(null);

		try {
			const nextName = normalizeFullProjectName(jobFormState.fullProjectName);

			if (!nextName) {
				throw new Error("Full project name is required.");
			}

			const previousName = jobFormState.originalName;
			const retentionDays = Number(jobFormState.retentionDays);
			const maxBuilds = Number(jobFormState.maxBuilds);
			const duplicate = selectedInstance.jobs.find(
				(job) => job === nextName && job !== previousName,
			);

			if (duplicate) {
				throw new Error(
					"A job with the same Full project name already exists.",
				);
			}

			const nextJobs = previousName
				? selectedInstance.jobs.map((job) =>
						job === previousName ? nextName : job,
					)
				: [...selectedInstance.jobs, nextName];
			const nextRetentionDays = {
				...selectedInstance.jobRetentionDays,
			};
			const nextMaxBuilds = {
				...selectedInstance.jobMaxBuilds,
			};
			const nextPrefetchBuildLogStatuses = {
				...selectedInstance.jobPrefetchBuildLogStatuses,
			};
			const nextPrefetchStatuses: Array<"failure" | "success"> = [];

			if (jobFormState.prefetchFailureLogs) {
				nextPrefetchStatuses.push("failure" as const);
			}

			if (jobFormState.prefetchSuccessLogs) {
				nextPrefetchStatuses.push("success" as const);
			}

			if (previousName && previousName !== nextName) {
				delete nextRetentionDays[previousName];
				delete nextMaxBuilds[previousName];
				delete nextPrefetchBuildLogStatuses[previousName];
			}

			nextRetentionDays[nextName] = retentionDays;
			nextMaxBuilds[nextName] = maxBuilds;
			nextPrefetchBuildLogStatuses[nextName] =
				nextPrefetchStatuses.length > 0
					? nextPrefetchStatuses
					: (["failure"] as const);

			const nextInstances = await appRpc.proxy.request.saveJenkinsInstance({
				id: selectedInstance.id,
				hostUrl: selectedInstance.hostUrl,
				username: selectedInstance.username,
				customName: selectedInstance.customName,
				iconLabel: selectedInstance.iconLabel,
				iconBackgroundColor: selectedInstance.iconBackgroundColor,
				disableSslVerification: selectedInstance.disableSslVerification,
				jobs: nextJobs,
				jobRetentionDays: nextRetentionDays,
				jobMaxBuilds: nextMaxBuilds,
				jobPrefetchBuildLogStatuses: nextPrefetchBuildLogStatuses,
			});

			setInstances(nextInstances);
			setSelectedInstanceId(selectedInstance.id);
			setSelectedJob(nextName);
			setIsJobDialogOpen(false);
		} catch (error) {
			setJobErrorMessage(
				error instanceof Error ? error.message : "Failed to save job.",
			);
		} finally {
			await loadAppLogs();
			setIsSavingJob(false);
		}
	}

	async function handleDeleteJob() {
		if (!selectedInstance || !selectedJob) {
			return;
		}

		setIsDeletingJob(true);
		setDeleteJobErrorMessage(null);

		const currentJobIndex = selectedInstance.jobs.indexOf(selectedJob);
		const nextJobs = selectedInstance.jobs.filter((job) => job !== selectedJob);
		const nextRetentionDays = { ...selectedInstance.jobRetentionDays };
		const nextMaxBuilds = { ...selectedInstance.jobMaxBuilds };
		const nextPrefetchBuildLogStatuses = {
			...selectedInstance.jobPrefetchBuildLogStatuses,
		};
		delete nextRetentionDays[selectedJob];
		delete nextMaxBuilds[selectedJob];
		delete nextPrefetchBuildLogStatuses[selectedJob];
		const nextSelectedJob =
			nextJobs[currentJobIndex] ?? nextJobs[currentJobIndex - 1] ?? null;

		try {
			const nextInstances = await appRpc.proxy.request.saveJenkinsInstance({
				id: selectedInstance.id,
				hostUrl: selectedInstance.hostUrl,
				username: selectedInstance.username,
				customName: selectedInstance.customName,
				iconLabel: selectedInstance.iconLabel,
				iconBackgroundColor: selectedInstance.iconBackgroundColor,
				disableSslVerification: selectedInstance.disableSslVerification,
				jobs: nextJobs,
				jobRetentionDays: nextRetentionDays,
				jobMaxBuilds: nextMaxBuilds,
				jobPrefetchBuildLogStatuses: nextPrefetchBuildLogStatuses,
			});

			setInstances(nextInstances);
			setSelectedInstanceId(selectedInstance.id);
			setSelectedJob(nextSelectedJob);
			setJobDetails(null);
			setJobDetailsError(null);
			setJobActivity(null);
			setJobActivityError(null);
			setJobAnalytics(null);
			setJobAnalyticsError(null);
			setIsDeleteJobDialogOpen(false);
		} catch (error) {
			setDeleteJobErrorMessage(
				error instanceof Error ? error.message : "Failed to delete job.",
			);
		} finally {
			await loadAppLogs();
			setIsDeletingJob(false);
		}
	}

	return (
		<TooltipProvider>
			<div className="flex h-screen bg-background text-foreground">
				<InstanceSidebar
					instances={instances}
					selectedInstanceId={selectedInstanceId}
					selectedInstance={selectedInstance}
					selectedJob={selectedJob}
					isLoading={isLoading}
					isDeleting={isDeleting}
					onCreateInstance={openCreateDialog}
					onSelectInstance={setSelectedInstanceId}
					onEditInstance={openEditDialog}
					onDeleteInstance={openDeleteDialog}
					onCreateJob={openCreateJobDialog}
					onSelectJob={setSelectedJob}
				/>

				<DetailsPanel
					selectedInstance={selectedInstance}
					selectedJob={selectedJob}
					jobDetails={jobDetails}
					jobActivity={jobActivity}
					jobAnalytics={jobAnalytics}
					jobDetailsError={jobDetailsError}
					jobActivityError={jobActivityError}
					appLogs={appLogs}
					appLogsError={appLogsError}
					isLoadingAppLogs={isLoadingAppLogs}
					jobAnalyticsError={jobAnalyticsError}
					selectedTimeRange={selectedTimeRange}
					isLoadingJobDetails={isLoadingJobDetails}
					isLoadingJobAnalytics={isLoadingJobAnalytics}
					isDeletingJob={isDeletingJob}
					onTimeRangeChange={setSelectedTimeRange}
					onRefreshJob={refreshSelectedJob}
					onEditJob={openEditJobDialog}
					onDeleteJob={openDeleteJobDialog}
					onRefreshAppLogs={loadAppLogs}
				/>

				<DeleteInstanceDialog
					open={isDeleteDialogOpen}
					onOpenChange={setIsDeleteDialogOpen}
					selectedInstance={selectedInstance}
					errorMessage={errorMessage}
					isDeleting={isDeleting}
					onDelete={handleDelete}
				/>

				<DeleteJobDialog
					open={isDeleteJobDialogOpen}
					onOpenChange={setIsDeleteJobDialogOpen}
					selectedInstance={selectedInstance}
					selectedJob={selectedJob}
					errorMessage={deleteJobErrorMessage}
					isDeleting={isDeletingJob}
					onDelete={handleDeleteJob}
				/>

				<InstanceDialog
					open={isInstanceDialogOpen}
					onOpenChange={setIsInstanceDialogOpen}
					mode={instanceDialogMode}
					formState={instanceFormState}
					onFormStateChange={setInstanceFormState}
					errorMessage={errorMessage}
					testResult={testResult}
					isSaving={isSaving}
					isDeleting={isDeleting}
					isTesting={isTesting}
					onTestConnection={handleTestConnection}
					onSave={handleSave}
				/>

				<JobDialog
					open={isJobDialogOpen}
					onOpenChange={setIsJobDialogOpen}
					mode={jobDialogMode}
					formState={jobFormState}
					onFormStateChange={setJobFormState}
					errorMessage={jobErrorMessage}
					isSaving={isSavingJob}
					selectedInstance={selectedInstance}
					onSave={handleSaveJob}
				/>
			</div>
		</TooltipProvider>
	);
}
