import { Dialog } from "@base-ui/react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
	const [isTesting, setIsTesting] = useState(false);
	const [isLoadingJobDetails, setIsLoadingJobDetails] = useState(false);
	const [isInstanceDialogOpen, setIsInstanceDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
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

	return (
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
							<button
								type="button"
								key={instance.id}
								title={getInstanceTitle(instance)}
								onClick={() => setSelectedInstanceId(instance.id)}
								className={cn(
									"flex size-12 items-center justify-center rounded-xl border text-xs font-semibold transition-colors",
									isActive
										? "border-primary bg-primary text-primary-foreground"
										: "border-border bg-background hover:bg-accent hover:text-accent-foreground",
								)}
							>
								{summarizeInstance(instance)}
							</button>
						);
					})}
				</div>
			</aside>

			<section className="flex min-w-0 flex-1">
				<div className="flex w-80 shrink-0 flex-col border-r bg-background">
					<div className="flex flex-col gap-3 px-5 py-4">
						{selectedInstance ? (
							<div className="rounded-2xl border bg-muted/30 p-4">
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
											Instance
										</p>
										<p className="mt-2 truncate text-sm font-semibold">
											{getInstanceTitle(selectedInstance)}
										</p>
										<p className="mt-1 truncate text-xs text-muted-foreground">
											{selectedInstance.username}
										</p>
									</div>
									<Badge variant="outline">
										{selectedInstance.jobs.length} jobs
									</Badge>
								</div>
								<div className="mt-3 flex items-center gap-2">
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
										title={isDeleting ? "Deleting instance" : "Delete instance"}
										aria-label="Delete instance"
									>
										<Trash2 />
									</Button>
								</div>
							</div>
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
								<CardContent className="py-2 text-muted-foreground">
									Loading instances...
								</CardContent>
							</Card>
						) : null}

						{!isLoading && !selectedInstance ? (
							<Card>
								<CardHeader>
									<CardTitle>No instance selected</CardTitle>
									<CardDescription>
										Pick an instance from the left rail or create a new one.
									</CardDescription>
								</CardHeader>
							</Card>
						) : null}

						{!isLoading &&
						selectedInstance &&
						selectedInstance.jobs.length === 0 ? (
							<Card>
								<CardHeader>
									<CardTitle>No jobs configured</CardTitle>
									<CardDescription>
										This instance does not have any jobs assigned yet.
									</CardDescription>
								</CardHeader>
								<CardContent>
									<Button size="sm" onClick={openCreateJobDialog}>
										Add the first job
									</Button>
								</CardContent>
							</Card>
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
						{selectedInstance ? (
							<div className="flex items-center gap-2">
								{selectedJob ? (
									<Button
										variant="outline"
										size="sm"
										onClick={refreshSelectedJob}
										disabled={isLoadingJobDetails}
									>
										{isLoadingJobDetails ? "Refreshing..." : "Refresh"}
									</Button>
								) : null}
								{selectedJob ? (
									<Button
										variant="outline"
										size="sm"
										onClick={openEditJobDialog}
									>
										Edit job
									</Button>
								) : null}
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
										value={jobDetails?.fullProjectName ?? selectedJob ?? "None"}
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
											jobDetails?.color ?? (selectedJob ? "Loading..." : "None")
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
												? new Date(selectedInstance.updatedAt).toLocaleString()
												: "Not selected"
										}
									/>
								</div>

								{isLoadingJobDetails ? (
									<div className="rounded-2xl border border-dashed bg-background/70 p-6">
										<p className="text-sm font-medium">Loading job details</p>
										<p className="mt-2 max-w-2xl text-sm text-muted-foreground">
											Fetching the selected Jenkins job and recent build
											metadata.
										</p>
									</div>
								) : null}

								{jobDetailsError ? (
									<div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-destructive">
										<p className="text-sm font-medium">
											Unable to load job details
										</p>
										<p className="mt-2 text-sm">{jobDetailsError}</p>
									</div>
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
														<Badge variant="outline">{jobDetails.color}</Badge>
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

			<Dialog.Root
				open={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
				modal
			>
				<Dialog.Portal>
					<Dialog.Backdrop className="fixed inset-0 bg-black/35 backdrop-blur-sm" />
					<Dialog.Popup className="fixed top-1/2 left-1/2 w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-background shadow-2xl outline-none">
						<div className="border-b px-6 py-4">
							<Dialog.Title className="text-base font-semibold">
								Delete Jenkins instance
							</Dialog.Title>
							<Dialog.Description className="mt-1 text-sm text-muted-foreground">
								{selectedInstance
									? `Delete "${getInstanceTitle(selectedInstance)}"? This also removes its saved jobs and API key reference.`
									: "Delete the selected Jenkins instance."}
							</Dialog.Description>
						</div>

						<div className="flex items-center justify-end gap-2 border-t px-6 py-4">
							<Dialog.Close className="inline-flex">
								<Button variant="ghost" disabled={isDeleting}>
									Cancel
								</Button>
							</Dialog.Close>
							<Button
								variant="destructive"
								onClick={handleDelete}
								disabled={isDeleting || !selectedInstance}
							>
								{isDeleting ? "Deleting..." : "Delete instance"}
							</Button>
						</div>
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>

			<Dialog.Root
				open={isInstanceDialogOpen}
				onOpenChange={setIsInstanceDialogOpen}
				modal
			>
				<Dialog.Portal>
					<Dialog.Backdrop className="fixed inset-0 bg-black/35 backdrop-blur-sm" />
					<Dialog.Popup className="fixed top-1/2 left-1/2 w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-background shadow-2xl outline-none">
						<div className="flex items-center justify-between border-b px-6 py-4">
							<div>
								<Dialog.Title className="text-base font-semibold">
									{instanceDialogMode === "create"
										? "Create Jenkins instance"
										: "Edit Jenkins instance"}
								</Dialog.Title>
								<Dialog.Description className="mt-1 text-sm text-muted-foreground">
									Manage only the Jenkins connection information here.
								</Dialog.Description>
							</div>
							<Dialog.Close className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground">
								Close
							</Dialog.Close>
						</div>

						<div className="flex flex-col gap-5 px-6 py-5">
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
								<div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
									{errorMessage}
								</div>
							) : null}

							{testResult ? (
								<div
									className={cn(
										"rounded-xl border px-4 py-3 text-sm",
										testResult.ok
											? "border-green-600/25 bg-green-600/10 text-green-700"
											: "border-destructive/30 bg-destructive/10 text-destructive",
									)}
								>
									<p>{testResult.message}</p>
									{testResult.jenkinsVersion ? (
										<p className="mt-1 text-xs opacity-80">
											Jenkins {testResult.jenkinsVersion}
										</p>
									) : null}
								</div>
							) : null}
						</div>

						<div className="flex items-center justify-between border-t px-6 py-4">
							<Button
								variant="outline"
								onClick={handleTestConnection}
								disabled={isTesting || isSaving}
							>
								{isTesting ? "Testing..." : "Test connection"}
							</Button>

							<div className="flex items-center gap-2">
								<Dialog.Close className="inline-flex">
									<Button variant="ghost">Cancel</Button>
								</Dialog.Close>
								<Button onClick={handleSave} disabled={isSaving || isDeleting}>
									{isSaving ? "Saving..." : "Save"}
								</Button>
							</div>
						</div>
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>

			<Dialog.Root
				open={isJobDialogOpen}
				onOpenChange={setIsJobDialogOpen}
				modal
			>
				<Dialog.Portal>
					<Dialog.Backdrop className="fixed inset-0 bg-black/35 backdrop-blur-sm" />
					<Dialog.Popup className="fixed top-1/2 left-1/2 w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-background shadow-2xl outline-none">
						<div className="flex items-center justify-between border-b px-6 py-4">
							<div>
								<Dialog.Title className="text-base font-semibold">
									{jobDialogMode === "create" ? "Add job" : "Edit job"}
								</Dialog.Title>
								<Dialog.Description className="mt-1 text-sm text-muted-foreground">
									Use Full project name as the unique identifier for each job.
								</Dialog.Description>
							</div>
							<Dialog.Close className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground">
								Close
							</Dialog.Close>
						</div>

						<div className="flex flex-col gap-5 px-6 py-5">
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
								<div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
									{jobErrorMessage}
								</div>
							) : null}
						</div>

						<div className="flex items-center justify-end gap-2 border-t px-6 py-4">
							<Dialog.Close className="inline-flex">
								<Button variant="ghost">Cancel</Button>
							</Dialog.Close>
							<Button onClick={handleSaveJob} disabled={isSavingJob}>
								{isSavingJob ? "Saving..." : "Save"}
							</Button>
						</div>
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>
		</div>
	);
}

function InfoTile({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-2xl border bg-background p-4">
			<p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
				{label}
			</p>
			<p className="mt-2 truncate text-sm font-medium">{value}</p>
		</div>
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
