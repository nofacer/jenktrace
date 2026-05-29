import { Dialog } from "@base-ui/react";
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
	UpsertJenkinsInstanceInput,
} from "../shared/jenkins";

type InstanceFormState = {
	id?: string;
	hostUrl: string;
	username: string;
	apiKey: string;
};

const EMPTY_FORM: InstanceFormState = {
	hostUrl: "",
	username: "",
	apiKey: "",
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

export default function App() {
	const [instances, setInstances] = useState<JenkinsInstanceSummary[]>([]);
	const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(
		null,
	);
	const [selectedJob, setSelectedJob] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isTesting, setIsTesting] = useState(false);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
	const [formState, setFormState] = useState<InstanceFormState>(EMPTY_FORM);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [testResult, setTestResult] =
		useState<JenkinsConnectionTestResult | null>(null);

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

	function openCreateDialog() {
		setDialogMode("create");
		setFormState(EMPTY_FORM);
		setTestResult(null);
		setErrorMessage(null);
		setIsDialogOpen(true);
	}

	function openEditDialog() {
		if (!selectedInstance) {
			return;
		}

		setDialogMode("edit");
		setFormState(buildFormState(selectedInstance));
		setTestResult(null);
		setErrorMessage(null);
		setIsDialogOpen(true);
	}

	async function handleSave() {
		setIsSaving(true);
		setErrorMessage(null);

		try {
			const payload: UpsertJenkinsInstanceInput = {
				id: formState.id,
				hostUrl: formState.hostUrl,
				username: formState.username,
				apiKey: formState.apiKey || undefined,
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
			setIsDialogOpen(false);
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
			setIsDialogOpen(false);
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
				id: formState.id,
				hostUrl: formState.hostUrl,
				username: formState.username,
				apiKey: formState.apiKey || undefined,
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

				<Separator />

				<Button
					size="icon-sm"
					variant="outline"
					disabled={!selectedInstance}
					onClick={openEditDialog}
					title="Edit selected instance"
				>
					E
				</Button>
			</aside>

			<section className="flex min-w-0 flex-1">
				<div className="flex w-80 shrink-0 flex-col border-r bg-background">
					<div className="flex items-center justify-between px-5 py-4">
						<div>
							<p className="text-sm font-medium">Jobs</p>
							<p className="text-xs text-muted-foreground">
								{selectedInstance
									? getInstanceTitle(selectedInstance)
									: "Select an instance"}
							</p>
						</div>
						{selectedInstance ? (
							<Badge variant="outline">{selectedInstance.jobs.length}</Badge>
						) : null}
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
												{selectedInstance.username}
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
								This panel is reserved for richer job and build details.
							</p>
						</div>
						{selectedInstance ? (
							<Button variant="outline" size="sm" onClick={openEditDialog}>
								Edit instance
							</Button>
						) : null}
					</div>

					<Separator />

					<div className="flex-1 p-6">
						<Card className="h-full min-h-0">
							<CardHeader>
								<CardTitle>
									{selectedJob ?? selectedInstance?.hostUrl ?? "No selection"}
								</CardTitle>
								<CardDescription>
									{selectedJob
										? "This area is ready for build logs, status, and job actions."
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
										value={selectedJob ?? "None"}
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

								<div className="rounded-2xl border border-dashed bg-background/70 p-6">
									<p className="text-sm font-medium">Next step area</p>
									<p className="mt-2 max-w-2xl text-sm text-muted-foreground">
										The wide right panel stays intentionally open so we can add
										job status, build history, logs, and actions without
										compressing the navigation columns.
									</p>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</section>

			<Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen} modal>
				<Dialog.Portal>
					<Dialog.Backdrop className="fixed inset-0 bg-black/35 backdrop-blur-sm" />
					<Dialog.Popup className="fixed top-1/2 left-1/2 w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-background shadow-2xl outline-none">
						<div className="flex items-center justify-between border-b px-6 py-4">
							<div>
								<Dialog.Title className="text-base font-semibold">
									{dialogMode === "create"
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
										value={formState.hostUrl}
										onChange={(event) =>
											setFormState((current) => ({
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
										value={formState.username}
										onChange={(event) =>
											setFormState((current) => ({
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
									value={formState.apiKey}
									onChange={(event) =>
										setFormState((current) => ({
											...current,
											apiKey: event.target.value,
										}))
									}
									placeholder={
										dialogMode === "edit"
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
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									onClick={handleTestConnection}
									disabled={isTesting || isSaving}
								>
									{isTesting ? "Testing..." : "Test connection"}
								</Button>

								{dialogMode === "edit" ? (
									<Button
										variant="destructive"
										onClick={handleDelete}
										disabled={isDeleting || isSaving}
									>
										{isDeleting ? "Deleting..." : "Delete"}
									</Button>
								) : null}
							</div>

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
