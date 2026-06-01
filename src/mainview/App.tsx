import { useEffect, useMemo, useState } from "react";

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
import type {
	JenkinsConnectionTestResult,
	JenkinsInstanceSummary,
	JenkinsJobDetails,
	UpsertJenkinsInstanceInput,
} from "../shared/jenkins";
import { normalizeFullProjectName } from "../shared/jenkins";

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
	const [deleteJobErrorMessage, setDeleteJobErrorMessage] = useState<
		string | null
	>(null);
	const [testResult, setTestResult] =
		useState<JenkinsConnectionTestResult | null>(null);
	const [jobDetails, setJobDetails] = useState<JenkinsJobDetails | null>(null);

	const selectedInstance = useMemo(
		() =>
			instances.find((instance) => instance.id === selectedInstanceId) ?? null,
		[instances, selectedInstanceId],
	);

	useEffect(() => {
		const run = async () => {
			setIsLoading(true);
			setErrorMessage(null);

			try {
				const nextInstances = await appRpc.proxy.request.listJenkinsInstances();
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
	}, []);

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
			setIsLoadingJobDetails(false);
			return;
		}

		let isCancelled = false;

		const run = async () => {
			setIsLoadingJobDetails(true);
			setJobDetailsError(null);

			try {
				const nextDetails = await appRpc.proxy.request.getJenkinsJobDetails({
					instanceId: selectedInstance.id,
					fullProjectName: selectedJob,
				});

				if (!isCancelled) {
					setJobDetails(nextDetails);
				}
			} catch (error) {
				if (!isCancelled) {
					setJobDetails(null);
					setJobDetailsError(
						error instanceof Error
							? error.message
							: "Failed to load Jenkins job details.",
					);
				}
			} finally {
				if (!isCancelled) {
					setIsLoadingJobDetails(false);
				}
			}
		};

		void run();

		return () => {
			isCancelled = true;
		};
	}, [selectedInstance, selectedJob]);

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
		setJobFormState(buildJobFormState(selectedJob));
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
				apiKey: instanceFormState.apiKey || undefined,
			});
			setTestResult(result);
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "Failed to test connection.",
			);
		} finally {
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

			const nextInstances = await appRpc.proxy.request.saveJenkinsInstance({
				id: selectedInstance.id,
				hostUrl: selectedInstance.hostUrl,
				username: selectedInstance.username,
				jobs: nextJobs,
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
			setIsSavingJob(false);
		}
	}

	async function refreshSelectedJob() {
		if (!selectedInstance || !selectedJob) {
			return;
		}

		setIsLoadingJobDetails(true);
		setJobDetailsError(null);

		try {
			const nextDetails = await appRpc.proxy.request.getJenkinsJobDetails({
				instanceId: selectedInstance.id,
				fullProjectName: selectedJob,
			});
			setJobDetails(nextDetails);
		} catch (error) {
			setJobDetails(null);
			setJobDetailsError(
				error instanceof Error
					? error.message
					: "Failed to load Jenkins job details.",
			);
		} finally {
			setIsLoadingJobDetails(false);
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
		const nextSelectedJob =
			nextJobs[currentJobIndex] ?? nextJobs[currentJobIndex - 1] ?? null;

		try {
			const nextInstances = await appRpc.proxy.request.saveJenkinsInstance({
				id: selectedInstance.id,
				hostUrl: selectedInstance.hostUrl,
				username: selectedInstance.username,
				jobs: nextJobs,
			});

			setInstances(nextInstances);
			setSelectedInstanceId(selectedInstance.id);
			setSelectedJob(nextSelectedJob);
			setJobDetails(null);
			setJobDetailsError(null);
			setIsDeleteJobDialogOpen(false);
		} catch (error) {
			setDeleteJobErrorMessage(
				error instanceof Error ? error.message : "Failed to delete job.",
			);
		} finally {
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
					jobDetailsError={jobDetailsError}
					isLoadingJobDetails={isLoadingJobDetails}
					isDeletingJob={isDeletingJob}
					onRefreshJob={refreshSelectedJob}
					onEditJob={openEditJobDialog}
					onDeleteJob={openDeleteJobDialog}
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
