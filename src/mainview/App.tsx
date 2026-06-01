import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogMedia,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { appRpc } from "@/lib/app-rpc";
import { cn } from "@/lib/utils";
import type {
	JenkinsConnectionTestResult,
	JenkinsInstanceSummary,
	JenkinsJobDetails,
	UpsertJenkinsInstanceInput,
} from "../shared/jenkins";
import {
	buildJenkinsJobPath,
	buildJenkinsJobUrl,
	normalizeFullProjectName,
} from "../shared/jenkins";

type InstanceFormState = {
	id?: string;
	hostUrl: string;
	username: string;
	apiKey: string;
};

type JobFormState = {
	originalName?: string;
	fullProjectName: string;
};

const EMPTY_FORM: InstanceFormState = {
	hostUrl: "",
	username: "",
	apiKey: "",
};

const EMPTY_JOB_FORM: JobFormState = {
	fullProjectName: "",
};

function summarizeInstance(instance: JenkinsInstanceSummary): string {
	try {
		return new URL(instance.hostUrl).hostname.slice(0, 2).toUpperCase();
	} catch {
		return instance.hostUrl.slice(0, 2).toUpperCase();
	}
}

function getInstanceTitle(instance: JenkinsInstanceSummary): string {
	try {
		return new URL(instance.hostUrl).hostname;
	} catch {
		return instance.hostUrl;
	}
}

function buildFormState(
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
	};
}

function buildJobFormState(job?: string | null): JobFormState {
	if (!job) {
		return EMPTY_JOB_FORM;
	}

	return {
		originalName: job,
		fullProjectName: job,
	};
}

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
				<aside className="flex w-22 flex-col items-center gap-3 border-r bg-muted/30 px-3 py-4">
					<Button
						size="icon-sm"
						onClick={openCreateDialog}
						title="Create instance"
					>
						+
					</Button>

					<Separator />

					<div className="flex flex-1 flex-col items-center gap-2 overflow-y-auto pb-2">
						{instances.map((instance) => {
							const isActive = instance.id === selectedInstanceId;

							return (
								<Button
									type="button"
									key={instance.id}
									size="icon-lg"
									variant={isActive ? "default" : "outline"}
									title={getInstanceTitle(instance)}
									onClick={() => setSelectedInstanceId(instance.id)}
									className="size-12 rounded-xl p-0"
								>
									<Avatar className="size-10" size="lg">
										<AvatarFallback
											className={cn(
												"text-xs font-semibold",
												isActive
													? "bg-primary text-primary-foreground"
													: "bg-background text-foreground",
											)}
										>
											{summarizeInstance(instance)}
										</AvatarFallback>
									</Avatar>
								</Button>
							);
						})}
					</div>
				</aside>

				<section className="flex min-w-0 flex-1">
					<div className="flex w-80 shrink-0 flex-col border-r bg-background">
						<div className="flex flex-col gap-3 px-5 py-4">
							{selectedInstance ? (
								<Card className="bg-muted/30">
									<CardHeader>
										<CardTitle className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
											Instance
										</CardTitle>
										<CardDescription className="truncate text-sm font-semibold text-foreground">
											{getInstanceTitle(selectedInstance)}
										</CardDescription>
										<CardAction>
											<Badge variant="outline">
												{selectedInstance.jobs.length} jobs
											</Badge>
										</CardAction>
									</CardHeader>
									<CardContent>
										<p className="truncate text-xs text-muted-foreground">
											{selectedInstance.username}
										</p>
									</CardContent>
									<CardFooter className="gap-2">
										<Button
											size="icon-sm"
											variant="outline"
											onClick={openEditDialog}
											title="Edit instance"
											aria-label="Edit instance"
										>
											<Pencil />
										</Button>
										<Button
											size="icon-sm"
											variant="destructive"
											onClick={openDeleteDialog}
											disabled={isDeleting}
											title={
												isDeleting ? "Deleting instance" : "Delete instance"
											}
											aria-label="Delete instance"
										>
											<Trash2 />
										</Button>
									</CardFooter>
								</Card>
							) : null}

							<div className="flex items-center justify-between">
								<p className="text-sm font-medium">Jobs</p>
								{selectedInstance ? (
									<Button
										size="icon-sm"
										variant="outline"
										onClick={openCreateJobDialog}
										title="Add job"
										aria-label="Add job"
									>
										<Plus />
									</Button>
								) : null}
							</div>
						</div>

						<Separator />

						<div className="flex-1 overflow-y-auto p-3">
							{isLoading ? (
								<Card size="sm">
									<CardHeader>
										<Skeleton className="h-4 w-28" />
										<Skeleton className="h-3 w-40" />
									</CardHeader>
									<CardContent className="flex flex-col gap-2">
										<Skeleton className="h-14 w-full rounded-xl" />
										<Skeleton className="h-14 w-full rounded-xl" />
										<Skeleton className="h-14 w-full rounded-xl" />
									</CardContent>
								</Card>
							) : null}

							{!isLoading && !selectedInstance ? (
								<EmptyStateCard
									title="No instance selected"
									description="Pick an instance from the left rail or create a new one."
								/>
							) : null}

							{!isLoading &&
							selectedInstance &&
							selectedInstance.jobs.length === 0 ? (
								<EmptyStateCard
									title="No jobs configured"
									description="This instance does not have any jobs assigned yet."
									action={
										<Button size="sm" onClick={openCreateJobDialog}>
											Add the first job
										</Button>
									}
								/>
							) : null}

							{!isLoading &&
							selectedInstance &&
							selectedInstance.jobs.length > 0 ? (
								<div className="flex flex-col gap-2">
									{selectedInstance.jobs.map((job) => {
										const isActive = job === selectedJob;

										return (
											<button
												type="button"
												key={job}
												onClick={() => setSelectedJob(job)}
												className={cn(
													"rounded-xl border px-4 py-3 text-left transition-colors",
													isActive
														? "border-primary bg-primary/8"
														: "border-border bg-card hover:bg-accent/60",
												)}
											>
												<p className="truncate text-sm font-medium">{job}</p>
												<p className="mt-1 text-xs text-muted-foreground">
													{buildJenkinsJobPath(job)}
												</p>
											</button>
										);
									})}
								</div>
							) : null}
						</div>
					</div>

					<div className="flex min-w-0 flex-1 flex-col bg-muted/10">
						<div className="flex items-center justify-between px-6 py-5">
							<div>
								<h1 className="text-lg font-semibold">Details</h1>
								<p className="text-sm text-muted-foreground">
									Selected jobs now load live metadata from Jenkins.
								</p>
							</div>
							{selectedJob ? (
								<div className="flex items-center gap-2">
									<ActionIconButton
										label={
											isLoadingJobDetails
												? "Refreshing job details"
												: "Refresh job details"
										}
										onClick={refreshSelectedJob}
										disabled={isLoadingJobDetails}
									>
										<RefreshCw
											className={cn(
												isLoadingJobDetails ? "animate-spin" : undefined,
											)}
										/>
									</ActionIconButton>
									<ActionIconButton
										label="Edit job"
										onClick={openEditJobDialog}
									>
										<Pencil />
									</ActionIconButton>
									<ActionIconButton
										label="Delete job"
										variant="destructive"
										onClick={openDeleteJobDialog}
										disabled={isDeletingJob}
									>
										<Trash2 />
									</ActionIconButton>
								</div>
							) : null}
						</div>

						<Separator />

						<div className="flex-1 p-6">
							<Card className="h-full min-h-0">
								<CardHeader>
									<CardTitle>
										{jobDetails?.fullDisplayName ??
											selectedJob ??
											selectedInstance?.hostUrl ??
											"No selection"}
									</CardTitle>
									<CardDescription>
										{selectedJob
											? "Live Jenkins job metadata, status, and recent build summaries."
											: selectedInstance
												? "Choose a job from the middle column to inspect it here."
												: "Select an instance on the left to start browsing jobs."}
									</CardDescription>
								</CardHeader>
								<CardContent className="flex h-full flex-col justify-between gap-6">
									<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
										<InfoTile
											label="Instance"
											value={
												selectedInstance
													? getInstanceTitle(selectedInstance)
													: "Not selected"
											}
										/>
										<InfoTile
											label="Username"
											value={selectedInstance?.username ?? "Not selected"}
										/>
										<InfoTile
											label="API key"
											value={
												selectedInstance
													? selectedInstance.hasApiKey
														? "Saved in keychain"
														: "Not saved"
													: "Not selected"
											}
										/>
										<InfoTile
											label="Selected job"
											value={
												jobDetails?.fullProjectName ?? selectedJob ?? "None"
											}
										/>
										<InfoTile
											label="Job path"
											value={
												selectedJob ? buildJenkinsJobPath(selectedJob) : "None"
											}
										/>
										<InfoTile
											label="Job URL"
											value={
												jobDetails?.url ??
												(selectedInstance && selectedJob
													? buildJenkinsJobUrl(
															selectedInstance.hostUrl,
															selectedJob,
														)
													: "None")
											}
										/>
										<InfoTile
											label="Buildable"
											value={
												jobDetails
													? jobDetails.buildable
														? "Yes"
														: "No"
													: selectedJob
														? "Loading..."
														: "None"
											}
										/>
										<InfoTile
											label="Queue state"
											value={
												jobDetails
													? jobDetails.inQueue
														? "In queue"
														: "Idle"
													: selectedJob
														? "Loading..."
														: "None"
											}
										/>
										<InfoTile
											label="Color"
											value={
												jobDetails?.color ??
												(selectedJob ? "Loading..." : "None")
											}
										/>
										<InfoTile
											label="Total jobs"
											value={
												selectedInstance
													? String(selectedInstance.jobs.length)
													: "0"
											}
										/>
										<InfoTile
											label="Last updated"
											value={
												selectedInstance
													? new Date(
															selectedInstance.updatedAt,
														).toLocaleString()
													: "Not selected"
											}
										/>
									</div>

									{isLoadingJobDetails ? (
										<Card className="border-dashed bg-background/70">
											<CardHeader>
												<CardTitle>Loading job details</CardTitle>
												<CardDescription>
													Fetching the selected Jenkins job and recent build
													metadata.
												</CardDescription>
											</CardHeader>
											<CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
												<Skeleton className="h-20 w-full rounded-xl" />
												<Skeleton className="h-20 w-full rounded-xl" />
												<Skeleton className="h-20 w-full rounded-xl" />
												<Skeleton className="h-20 w-full rounded-xl" />
												<Skeleton className="h-20 w-full rounded-xl" />
												<Skeleton className="h-20 w-full rounded-xl" />
											</CardContent>
										</Card>
									) : null}

									{jobDetailsError ? (
										<Alert variant="destructive">
											<AlertTitle>Unable to load job details</AlertTitle>
											<AlertDescription>{jobDetailsError}</AlertDescription>
										</Alert>
									) : null}

									{!isLoadingJobDetails && !jobDetailsError && jobDetails ? (
										<div className="grid gap-4 xl:grid-cols-2">
											<BuildSummaryCard
												title="Last build"
												build={jobDetails.lastBuild}
											/>
											<BuildSummaryCard
												title="Last completed"
												build={jobDetails.lastCompletedBuild}
											/>
											<BuildSummaryCard
												title="Last successful"
												build={jobDetails.lastSuccessfulBuild}
											/>
											<BuildSummaryCard
												title="Last failed"
												build={jobDetails.lastFailedBuild}
											/>
											<Card className="xl:col-span-2">
												<CardHeader>
													<CardTitle>Job summary</CardTitle>
													<CardDescription>
														Overview of the selected Jenkins job.
													</CardDescription>
												</CardHeader>
												<CardContent className="space-y-3">
													<div className="flex flex-wrap items-center gap-2">
														<Badge
															variant={
																jobDetails.buildable ? "default" : "outline"
															}
														>
															{jobDetails.buildable ? "Buildable" : "Disabled"}
														</Badge>
														<Badge
															variant={
																jobDetails.inQueue ? "secondary" : "outline"
															}
														>
															{jobDetails.inQueue ? "Queued" : "Not queued"}
														</Badge>
														{jobDetails.nextBuildNumber ? (
															<Badge variant="outline">
																Next build #{jobDetails.nextBuildNumber}
															</Badge>
														) : null}
														{jobDetails.color ? (
															<Badge variant="outline">
																{jobDetails.color}
															</Badge>
														) : null}
													</div>
													<p className="text-sm text-muted-foreground">
														{jobDetails.description?.trim()
															? jobDetails.description
															: "No description is set for this Jenkins job."}
													</p>
												</CardContent>
											</Card>
										</div>
									) : null}
								</CardContent>
							</Card>
						</div>
					</div>
				</section>

				<AlertDialog
					open={isDeleteDialogOpen}
					onOpenChange={setIsDeleteDialogOpen}
				>
					<AlertDialogContent size="sm">
						<AlertDialogHeader>
							<AlertDialogMedia>
								<Trash2 />
							</AlertDialogMedia>
							<AlertDialogTitle>Delete Jenkins instance</AlertDialogTitle>
							<AlertDialogDescription>
								{selectedInstance
									? `Delete "${getInstanceTitle(selectedInstance)}"? This also removes its saved jobs and API key reference.`
									: "Delete the selected Jenkins instance."}
							</AlertDialogDescription>
						</AlertDialogHeader>

						{errorMessage ? (
							<Alert variant="destructive">
								<AlertTitle>Delete failed</AlertTitle>
								<AlertDescription>{errorMessage}</AlertDescription>
							</Alert>
						) : null}

						<AlertDialogFooter>
							<AlertDialogCancel disabled={isDeleting}>
								Cancel
							</AlertDialogCancel>
							<AlertDialogAction
								variant="destructive"
								onClick={handleDelete}
								disabled={isDeleting || !selectedInstance}
							>
								{isDeleting ? "Deleting..." : "Delete instance"}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				<AlertDialog
					open={isDeleteJobDialogOpen}
					onOpenChange={setIsDeleteJobDialogOpen}
				>
					<AlertDialogContent size="sm">
						<AlertDialogHeader>
							<AlertDialogMedia>
								<Trash2 />
							</AlertDialogMedia>
							<AlertDialogTitle>Delete saved job</AlertDialogTitle>
							<AlertDialogDescription>
								{selectedInstance && selectedJob
									? `Remove "${selectedJob}" from "${getInstanceTitle(selectedInstance)}"? This only removes the local saved job entry and does not delete the Jenkins job itself.`
									: "Delete the selected saved job."}
							</AlertDialogDescription>
						</AlertDialogHeader>

						{deleteJobErrorMessage ? (
							<Alert variant="destructive">
								<AlertTitle>Delete failed</AlertTitle>
								<AlertDescription>{deleteJobErrorMessage}</AlertDescription>
							</Alert>
						) : null}

						<AlertDialogFooter>
							<AlertDialogCancel disabled={isDeletingJob}>
								Cancel
							</AlertDialogCancel>
							<AlertDialogAction
								variant="destructive"
								onClick={handleDeleteJob}
								disabled={isDeletingJob || !selectedJob || !selectedInstance}
							>
								{isDeletingJob ? "Deleting..." : "Delete job"}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				<Dialog
					open={isInstanceDialogOpen}
					onOpenChange={setIsInstanceDialogOpen}
				>
					<DialogContent className="sm:max-w-[42rem]">
						<DialogHeader className="pr-8">
							<DialogTitle>
								{instanceDialogMode === "create"
									? "Create Jenkins instance"
									: "Edit Jenkins instance"}
							</DialogTitle>
							<DialogDescription>
								Manage only the Jenkins connection information here.
							</DialogDescription>
						</DialogHeader>

						<div className="flex flex-col gap-5">
							<div className="grid gap-4 md:grid-cols-2">
								<div className="flex flex-col gap-2">
									<Label htmlFor="hostUrl">Host URL</Label>
									<Input
										id="hostUrl"
										value={instanceFormState.hostUrl}
										onChange={(event) =>
											setInstanceFormState((current) => ({
												...current,
												hostUrl: event.target.value,
											}))
										}
										placeholder="https://jenkins.example.com"
									/>
								</div>

								<div className="flex flex-col gap-2">
									<Label htmlFor="username">Username</Label>
									<Input
										id="username"
										value={instanceFormState.username}
										onChange={(event) =>
											setInstanceFormState((current) => ({
												...current,
												username: event.target.value,
											}))
										}
										placeholder="automation-bot"
									/>
								</div>
							</div>

							<div className="flex flex-col gap-2">
								<Label htmlFor="apiKey">API key</Label>
								<Input
									id="apiKey"
									type="password"
									value={instanceFormState.apiKey}
									onChange={(event) =>
										setInstanceFormState((current) => ({
											...current,
											apiKey: event.target.value,
										}))
									}
									placeholder={
										instanceDialogMode === "edit"
											? "Leave blank to keep the saved key"
											: "Paste Jenkins API key"
									}
								/>
							</div>

							{errorMessage ? (
								<Alert variant="destructive">
									<AlertTitle>Save failed</AlertTitle>
									<AlertDescription>{errorMessage}</AlertDescription>
								</Alert>
							) : null}

							{testResult ? (
								<Alert variant={testResult.ok ? "default" : "destructive"}>
									<AlertTitle>
										{testResult.ok
											? "Connection succeeded"
											: "Connection failed"}
									</AlertTitle>
									<AlertDescription>
										<p>{testResult.message}</p>
										{testResult.jenkinsVersion ? (
											<p>Jenkins {testResult.jenkinsVersion}</p>
										) : null}
									</AlertDescription>
								</Alert>
							) : null}
						</div>

						<div className="flex items-center justify-between gap-2 border-t pt-4">
							<Button
								variant="outline"
								onClick={handleTestConnection}
								disabled={isTesting || isSaving}
							>
								{isTesting ? "Testing..." : "Test connection"}
							</Button>

							<div className="flex items-center gap-2">
								<DialogClose render={<Button variant="ghost" />}>
									Cancel
								</DialogClose>
								<Button onClick={handleSave} disabled={isSaving || isDeleting}>
									{isSaving ? "Saving..." : "Save"}
								</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>

				<Dialog open={isJobDialogOpen} onOpenChange={setIsJobDialogOpen}>
					<DialogContent className="sm:max-w-[36rem]">
						<DialogHeader className="pr-8">
							<DialogTitle>
								{jobDialogMode === "create" ? "Add job" : "Edit job"}
							</DialogTitle>
							<DialogDescription>
								Use Full project name as the unique identifier for each job.
							</DialogDescription>
						</DialogHeader>

						<div className="flex flex-col gap-5">
							<div className="flex flex-col gap-2">
								<Label htmlFor="fullProjectName">Full project name</Label>
								<Input
									id="fullProjectName"
									value={jobFormState.fullProjectName}
									onChange={(event) =>
										setJobFormState((current) => ({
											...current,
											fullProjectName: event.target.value,
										}))
									}
									placeholder="folder1/test"
								/>
								<p className="text-xs text-muted-foreground">
									Example: <code>folder1/test</code> maps to{" "}
									<code>/job/folder1/job/test/</code>.
								</p>
							</div>

							{jobFormState.fullProjectName.trim() ? (
								<div className="grid gap-3 md:grid-cols-2">
									<InfoTile
										label="Normalized path"
										value={buildJenkinsJobPath(jobFormState.fullProjectName)}
									/>
									<InfoTile
										label="Resolved URL"
										value={
											selectedInstance
												? buildJenkinsJobUrl(
														selectedInstance.hostUrl,
														jobFormState.fullProjectName,
													)
												: "None"
										}
									/>
								</div>
							) : null}

							{jobErrorMessage ? (
								<Alert variant="destructive">
									<AlertTitle>Save failed</AlertTitle>
									<AlertDescription>{jobErrorMessage}</AlertDescription>
								</Alert>
							) : null}
						</div>

						<div className="flex items-center justify-end gap-2 border-t pt-4">
							<DialogClose render={<Button variant="ghost" />}>
								Cancel
							</DialogClose>
							<Button onClick={handleSaveJob} disabled={isSavingJob}>
								{isSavingJob ? "Saving..." : "Save"}
							</Button>
						</div>
					</DialogContent>
				</Dialog>
			</div>
		</TooltipProvider>
	);
}

function ActionIconButton({
	label,
	children,
	onClick,
	disabled = false,
	variant = "outline",
}: {
	label: string;
	children: ReactNode;
	onClick: () => void;
	disabled?: boolean;
	variant?: "outline" | "destructive";
}) {
	return (
		<Tooltip>
			<TooltipTrigger
				aria-label={label}
				disabled={disabled}
				onClick={onClick}
				render={<Button size="icon-sm" variant={variant} disabled={disabled} />}
			>
				{children}
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}

function EmptyStateCard({
	title,
	description,
	action,
}: {
	title: string;
	description: string;
	action?: ReactNode;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			{action ? <CardFooter>{action}</CardFooter> : null}
		</Card>
	);
}

function InfoTile({ label, value }: { label: string; value: string }) {
	return (
		<Card size="sm" className="bg-background">
			<CardHeader className="gap-2">
				<CardTitle className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
					{label}
				</CardTitle>
				<CardDescription className="truncate text-sm font-medium text-foreground">
					{value}
				</CardDescription>
			</CardHeader>
		</Card>
	);
}

function BuildSummaryCard({
	title,
	build,
}: {
	title: string;
	build: JenkinsJobDetails["lastBuild"];
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>
					{build
						? (build.displayName ?? `Build #${build.number}`)
						: "No build information available."}
				</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-3">
				<InfoTile
					label="Number"
					value={build ? `#${build.number}` : "Unavailable"}
				/>
				<InfoTile
					label="Result"
					value={
						build
							? build.building
								? "Building"
								: (build.result ?? "Unknown")
							: "Unavailable"
					}
				/>
				<InfoTile
					label="Started"
					value={
						build?.timestamp
							? new Date(build.timestamp).toLocaleString()
							: "Unavailable"
					}
				/>
				<InfoTile label="Duration" value={formatDuration(build?.duration)} />
			</CardContent>
		</Card>
	);
}

function formatDuration(duration?: number): string {
	if (!duration || duration < 0) {
		return "Unavailable";
	}

	const totalSeconds = Math.floor(duration / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	if (hours > 0) {
		return `${hours}h ${minutes}m ${seconds}s`;
	}

	if (minutes > 0) {
		return `${minutes}m ${seconds}s`;
	}

	return `${seconds}s`;
}
