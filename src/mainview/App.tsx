import {
	LoaderCircleIcon,
	PencilLineIcon,
	PlugZapIcon,
	PlusIcon,
	ServerCogIcon,
	ShieldCheckIcon,
	Trash2Icon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type {
	JenkinsConnectionTestResult,
	JenkinsInstanceSummary,
	UpsertJenkinsInstanceInput,
} from "../shared/jenkins";
import { appRpc } from "./lib/app-rpc";

type FormState = {
	id?: string;
	hostUrl: string;
	username: string;
	jobsText: string;
	apiKey: string;
};

const emptyForm: FormState = {
	hostUrl: "",
	username: "",
	jobsText: "",
	apiKey: "",
};

function jobsToText(jobs: string[]): string {
	return jobs.join("\n");
}

function textToJobs(value: string): string[] {
	return value
		.split("\n")
		.map((job) => job.trim())
		.filter(Boolean);
}

function App() {
	const [instances, setInstances] = useState<JenkinsInstanceSummary[]>([]);
	const [form, setForm] = useState<FormState>(emptyForm);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState<string | null>(null);
	const [isTesting, setIsTesting] = useState(false);
	const [testingInstanceId, setTestingInstanceId] = useState<string | null>(
		null,
	);
	const [error, setError] = useState<string | null>(null);
	const [status, setStatus] = useState<string | null>(null);
	const [testResult, setTestResult] =
		useState<JenkinsConnectionTestResult | null>(null);

	useEffect(() => {
		setIsLoading(true);
		setError(null);

		void appRpc.request
			.listJenkinsInstances()
			.then((nextInstances) => {
				setInstances(nextInstances);
			})
			.catch((nextError) => {
				setError(getErrorMessage(nextError));
			})
			.finally(() => {
				setIsLoading(false);
			});
	}, []);

	function startCreate() {
		setForm(emptyForm);
		setError(null);
		setStatus(null);
		setTestResult(null);
	}

	function startEdit(instance: JenkinsInstanceSummary) {
		setForm({
			id: instance.id,
			hostUrl: instance.hostUrl,
			username: instance.username,
			jobsText: jobsToText(instance.jobs),
			apiKey: "",
		});
		setError(null);
		setStatus(
			instance.hasApiKey
				? "Leave API key empty to keep the stored secret unchanged."
				: "This instance does not have an API key stored yet.",
		);
		setTestResult(null);
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsSaving(true);
		setError(null);
		setStatus(null);
		setTestResult(null);

		const payload: UpsertJenkinsInstanceInput = {
			id: form.id,
			hostUrl: form.hostUrl,
			username: form.username,
			jobs: textToJobs(form.jobsText),
			apiKey: form.apiKey,
		};

		if (!payload.id && !payload.apiKey?.trim()) {
			setError("An API key is required when adding a new instance.");
			setIsSaving(false);
			return;
		}

		try {
			const nextInstances = await appRpc.request.saveJenkinsInstance(payload);
			setInstances(nextInstances);
			setForm(emptyForm);
			setStatus(
				payload.id
					? "Instance updated. API key is stored in the system credential manager."
					: "Instance added. API key is stored in the system credential manager.",
			);
			setTestResult(null);
		} catch (nextError) {
			setError(getErrorMessage(nextError));
		} finally {
			setIsSaving(false);
		}
	}

	async function handleDelete(instanceId: string) {
		setIsDeleting(instanceId);
		setError(null);
		setStatus(null);
		setTestResult(null);

		try {
			const nextInstances = await appRpc.request.deleteJenkinsInstance({
				id: instanceId,
			});
			setInstances(nextInstances);
			if (form.id === instanceId) {
				setForm(emptyForm);
			}
			setStatus("Instance removed.");
		} catch (nextError) {
			setError(getErrorMessage(nextError));
		} finally {
			setIsDeleting(null);
		}
	}

	async function handleTestCurrentForm() {
		setIsTesting(true);
		setError(null);
		setStatus(null);
		setTestResult(null);

		if (!form.hostUrl.trim() || !form.username.trim()) {
			setError("Host URL and username are required before testing.");
			setIsTesting(false);
			return;
		}

		try {
			const result = await appRpc.request.testJenkinsConnection({
				id: form.id,
				hostUrl: form.hostUrl,
				username: form.username,
				apiKey: form.apiKey,
			});
			setTestResult(result);
		} catch (nextError) {
			setError(getErrorMessage(nextError));
		} finally {
			setIsTesting(false);
		}
	}

	async function handleTestSavedInstance(instance: JenkinsInstanceSummary) {
		setTestingInstanceId(instance.id);
		setError(null);
		setStatus(null);
		setTestResult(null);

		try {
			const result = await appRpc.request.testJenkinsConnection({
				id: instance.id,
				hostUrl: instance.hostUrl,
				username: instance.username,
			});
			setTestResult(result);
		} catch (nextError) {
			setError(getErrorMessage(nextError));
		} finally {
			setTestingInstanceId(null);
		}
	}

	return (
		<div className="theme min-h-screen bg-background">
			<div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-8 lg:px-10">
				<section className="flex flex-col gap-4 rounded-[2rem] border bg-card p-8 shadow-sm">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
						<div className="flex max-w-3xl flex-col gap-3">
							<Badge variant="secondary">
								<ServerCogIcon data-icon="inline-start" />
								Jenkins Instances
							</Badge>
							<div className="flex flex-col gap-2">
								<h1 className="font-heading text-4xl leading-tight font-medium tracking-tight">
									Manage multiple Jenkins connections locally.
								</h1>
								<p className="max-w-2xl text-base leading-7 text-muted-foreground">
									Each instance stores host URL and username in app config,
									while the API key is kept in the system credential manager.
								</p>
							</div>
						</div>
						<Button onClick={startCreate} variant="outline">
							<PlusIcon data-icon="inline-start" />
							Add instance
						</Button>
					</div>

					{status ? (
						<div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm">
							{status}
						</div>
					) : null}

					{error ? (
						<div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
							{error}
						</div>
					) : null}

					{testResult ? (
						<div
							className={`rounded-xl border px-4 py-3 text-sm ${
								testResult.ok
									? "border-border bg-muted/50"
									: "border-destructive/20 bg-destructive/10 text-destructive"
							}`}
						>
							<div>{testResult.message}</div>
							{testResult.jenkinsVersion ? (
								<div className="mt-1 text-xs opacity-80">
									Jenkins version: {testResult.jenkinsVersion}
								</div>
							) : null}
						</div>
					) : null}
				</section>

				<section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
					<Card>
						<CardHeader>
							<CardTitle>Saved instances</CardTitle>
							<CardDescription>
								Edit an existing Jenkins connection or add a new one.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							{isLoading ? (
								<div className="flex items-center gap-3 rounded-xl border bg-muted/50 px-4 py-6 text-sm text-muted-foreground">
									<LoaderCircleIcon className="animate-spin" />
									Loading instances...
								</div>
							) : instances.length === 0 ? (
								<div className="rounded-2xl border border-dashed bg-muted/40 px-5 py-8 text-sm text-muted-foreground">
									No Jenkins instances saved yet. Add your first instance to get
									started.
								</div>
							) : (
								instances.map((instance, index) => (
									<div key={instance.id} className="flex flex-col gap-4">
										<div className="flex flex-col gap-4 rounded-2xl border bg-background p-4">
											<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
												<div className="flex min-w-0 flex-col gap-2">
													<div className="flex flex-wrap items-center gap-2">
														<h3 className="truncate font-medium">
															{instance.hostUrl}
														</h3>
														<Badge variant="outline">{instance.username}</Badge>
													</div>
													<div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
														<span>
															Updated {formatDate(instance.updatedAt)}
														</span>
														<Badge variant="outline">
															{instance.jobs.length} job
															{instance.jobs.length === 1 ? "" : "s"}
														</Badge>
														<Badge
															variant={
																instance.hasApiKey ? "secondary" : "outline"
															}
														>
															<ShieldCheckIcon data-icon="inline-start" />
															{instance.hasApiKey
																? "API key stored"
																: "Missing API key"}
														</Badge>
													</div>
												</div>

												{instance.jobs.length > 0 ? (
													<div className="flex flex-col gap-2 rounded-xl bg-muted/40 px-3 py-3">
														<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
															Monitored jobs
														</span>
														<div className="flex flex-wrap gap-2">
															{instance.jobs.map((job) => (
																<Badge key={job} variant="secondary">
																	{job}
																</Badge>
															))}
														</div>
													</div>
												) : (
													<div className="rounded-xl bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
														No jobs configured yet.
													</div>
												)}

												<div className="flex gap-2">
													<Button
														onClick={() => startEdit(instance)}
														size="sm"
														variant="outline"
													>
														<PencilLineIcon data-icon="inline-start" />
														Edit
													</Button>
													<Button
														onClick={() => handleTestSavedInstance(instance)}
														size="sm"
														variant="outline"
														disabled={testingInstanceId === instance.id}
													>
														<PlugZapIcon data-icon="inline-start" />
														{testingInstanceId === instance.id
															? "Testing..."
															: "Test"}
													</Button>
													<Button
														onClick={() => handleDelete(instance.id)}
														size="sm"
														variant="ghost"
														disabled={isDeleting === instance.id}
													>
														<Trash2Icon data-icon="inline-start" />
														{isDeleting === instance.id
															? "Removing..."
															: "Delete"}
													</Button>
												</div>
											</div>
										</div>
										{index < instances.length - 1 ? <Separator /> : null}
									</div>
								))
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>
								{form.id ? "Edit instance" : "Add instance"}
							</CardTitle>
							<CardDescription>
								Save a Jenkins base URL, username, and API key for later use.
							</CardDescription>
						</CardHeader>
						<form onSubmit={handleSubmit}>
							<CardContent className="flex flex-col gap-5">
								<div className="flex flex-col gap-2">
									<Label htmlFor="host-url">Host URL</Label>
									<Input
										id="host-url"
										placeholder="https://jenkins.example.com"
										value={form.hostUrl}
										onChange={(event) =>
											setForm((current) => ({
												...current,
												hostUrl: event.target.value,
											}))
										}
									/>
								</div>

								<div className="flex flex-col gap-2">
									<Label htmlFor="username">Username</Label>
									<Input
										id="username"
										placeholder="automation-user"
										value={form.username}
										onChange={(event) =>
											setForm((current) => ({
												...current,
												username: event.target.value,
											}))
										}
									/>
								</div>

								<div className="flex flex-col gap-2">
									<Label htmlFor="api-key">API key / token</Label>
									<Textarea
										id="api-key"
										placeholder={
											form.id
												? "Leave empty to keep the stored API key"
												: "Paste the Jenkins API key or token"
										}
										value={form.apiKey}
										onChange={(event) =>
											setForm((current) => ({
												...current,
												apiKey: event.target.value,
											}))
										}
									/>
									<p className="text-sm leading-6 text-muted-foreground">
										The API key is written to the system credential manager and
										not stored in the plain-text config file.
									</p>
								</div>

								<div className="flex flex-col gap-2">
									<Label htmlFor="job-names">Jobs to monitor</Label>
									<Textarea
										id="job-names"
										placeholder={[
											"folder-a/project-alpha",
											"folder-b/service-beta/deploy",
											"team-x/build-pipeline",
										].join("\n")}
										value={form.jobsText}
										onChange={(event) =>
											setForm((current) => ({
												...current,
												jobsText: event.target.value,
											}))
										}
									/>
									<p className="text-sm leading-6 text-muted-foreground">
										Enter one Jenkins job full project name per line. This step
										only stores the list and does not implement job handling
										yet.
									</p>
								</div>
							</CardContent>

							<CardFooter className="justify-between gap-3">
								<div className="flex gap-3">
									<Button
										type="button"
										onClick={startCreate}
										variant="ghost"
										disabled={isSaving || isTesting}
									>
										Clear
									</Button>
									<Button
										type="button"
										onClick={handleTestCurrentForm}
										variant="outline"
										disabled={isSaving || isTesting}
									>
										<PlugZapIcon data-icon="inline-start" />
										{isTesting ? "Testing..." : "Test connection"}
									</Button>
								</div>
								<Button type="submit" disabled={isSaving || isTesting}>
									{isSaving ? (
										<>
											<LoaderCircleIcon
												className="animate-spin"
												data-icon="inline-start"
											/>
											Saving...
										</>
									) : (
										<>
											<ShieldCheckIcon data-icon="inline-start" />
											{form.id ? "Save changes" : "Save instance"}
										</>
									)}
								</Button>
							</CardFooter>
						</form>
					</Card>
				</section>
			</div>
		</div>
	);
}

function formatDate(value: string): string {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	return "Something went wrong.";
}

export default App;
