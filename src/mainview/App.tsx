import {
	LoaderCircleIcon,
	PencilLineIcon,
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
	JenkinsInstanceSummary,
	UpsertJenkinsInstanceInput,
} from "../shared/jenkins";
import { appRpc } from "./lib/app-rpc";

type FormState = {
	id?: string;
	hostUrl: string;
	username: string;
	apiKey: string;
};

const emptyForm: FormState = {
	hostUrl: "",
	username: "",
	apiKey: "",
};

function App() {
	const [instances, setInstances] = useState<JenkinsInstanceSummary[]>([]);
	const [form, setForm] = useState<FormState>(emptyForm);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [status, setStatus] = useState<string | null>(null);

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
	}

	function startEdit(instance: JenkinsInstanceSummary) {
		setForm({
			id: instance.id,
			hostUrl: instance.hostUrl,
			username: instance.username,
			apiKey: "",
		});
		setError(null);
		setStatus(
			instance.hasApiKey
				? "Leave API key empty to keep the stored secret unchanged."
				: "This instance does not have an API key stored yet.",
		);
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsSaving(true);
		setError(null);
		setStatus(null);

		const payload: UpsertJenkinsInstanceInput = {
			id: form.id,
			hostUrl: form.hostUrl,
			username: form.username,
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
							</CardContent>

							<CardFooter className="justify-between gap-3">
								<Button
									type="button"
									onClick={startCreate}
									variant="ghost"
									disabled={isSaving}
								>
									Clear
								</Button>
								<Button type="submit" disabled={isSaving}>
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
