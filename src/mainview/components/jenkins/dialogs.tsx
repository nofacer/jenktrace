import { Trash2 } from "lucide-react";

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
import { Button } from "@/components/ui/button";
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
import type { JenkinsInstanceSummary } from "../../../shared/jenkins";
import {
	buildJenkinsJobPath,
	buildJenkinsJobUrl,
} from "../../../shared/jenkins";
import type { InstanceDialogProps, JobDialogProps } from "./types";
import { InfoTile } from "./ui";

export function DeleteInstanceDialog({
	open,
	onOpenChange,
	selectedInstance,
	errorMessage,
	isDeleting,
	onDelete,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	selectedInstance: JenkinsInstanceSummary | null;
	errorMessage: string | null;
	isDeleting: boolean;
	onDelete: () => void;
}) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
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
					<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						onClick={onDelete}
						disabled={isDeleting || !selectedInstance}
					>
						{isDeleting ? "Deleting..." : "Delete instance"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function DeleteJobDialog({
	open,
	onOpenChange,
	selectedInstance,
	selectedJob,
	errorMessage,
	isDeleting,
	onDelete,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	selectedInstance: JenkinsInstanceSummary | null;
	selectedJob: string | null;
	errorMessage: string | null;
	isDeleting: boolean;
	onDelete: () => void;
}) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
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

				{errorMessage ? (
					<Alert variant="destructive">
						<AlertTitle>Delete failed</AlertTitle>
						<AlertDescription>{errorMessage}</AlertDescription>
					</Alert>
				) : null}

				<AlertDialogFooter>
					<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						onClick={onDelete}
						disabled={isDeleting || !selectedJob || !selectedInstance}
					>
						{isDeleting ? "Deleting..." : "Delete job"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function InstanceDialog({
	open,
	onOpenChange,
	mode,
	formState,
	onFormStateChange,
	errorMessage,
	testResult,
	isSaving,
	isDeleting,
	isTesting,
	onTestConnection,
	onSave,
}: InstanceDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[42rem]">
				<DialogHeader className="pr-8">
					<DialogTitle>
						{mode === "create"
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
								value={formState.hostUrl}
								onChange={(event) =>
									onFormStateChange((current) => ({
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
									onFormStateChange((current) => ({
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
								onFormStateChange((current) => ({
									...current,
									apiKey: event.target.value,
								}))
							}
							placeholder={
								mode === "edit"
									? "Leave blank to keep the saved key"
									: "Paste Jenkins API key"
							}
						/>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<label
							htmlFor="disableSslVerification"
							className="flex items-start gap-3 rounded-xl border bg-muted/20 px-4 py-3"
						>
							<input
								id="disableSslVerification"
								type="checkbox"
								className="mt-1 size-4"
								checked={formState.disableSslVerification}
								onChange={(event) =>
									onFormStateChange((current) => ({
										...current,
										disableSslVerification: event.target.checked,
									}))
								}
							/>
							<div className="space-y-1">
								<p className="text-sm font-medium">Disable SSL verification</p>
								<p className="text-xs text-muted-foreground">
									Allow self-signed or otherwise untrusted HTTPS certificates.
								</p>
							</div>
						</label>

						<label
							htmlFor="monitoringEnabled"
							className="flex items-start gap-3 rounded-xl border bg-muted/20 px-4 py-3"
						>
							<input
								id="monitoringEnabled"
								type="checkbox"
								className="mt-1 size-4"
								checked={formState.monitoringEnabled}
								onChange={(event) =>
									onFormStateChange((current) => ({
										...current,
										monitoringEnabled: event.target.checked,
									}))
								}
							/>
							<div className="space-y-1">
								<p className="text-sm font-medium">Enable monitoring</p>
								<p className="text-xs text-muted-foreground">
									Periodically fetch the saved job list and store change
									history.
								</p>
							</div>
						</label>

						<div className="flex flex-col gap-2">
							<Label htmlFor="pollIntervalMinutes">
								Poll interval (minutes)
							</Label>
							<Input
								id="pollIntervalMinutes"
								type="number"
								min="1"
								max="1440"
								step="1"
								value={formState.pollIntervalMinutes}
								onChange={(event) =>
									onFormStateChange((current) => ({
										...current,
										pollIntervalMinutes: event.target.value,
									}))
								}
								disabled={!formState.monitoringEnabled}
								placeholder="5"
							/>
						</div>
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
								{testResult.ok ? "Connection succeeded" : "Connection failed"}
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
						onClick={onTestConnection}
						disabled={isTesting || isSaving}
					>
						{isTesting ? "Testing..." : "Test connection"}
					</Button>

					<div className="flex items-center gap-2">
						<DialogClose render={<Button variant="ghost" />}>
							Cancel
						</DialogClose>
						<Button onClick={onSave} disabled={isSaving || isDeleting}>
							{isSaving ? "Saving..." : "Save"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

export function JobDialog({
	open,
	onOpenChange,
	mode,
	formState,
	onFormStateChange,
	errorMessage,
	isSaving,
	selectedInstance,
	onSave,
}: JobDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[36rem]">
				<DialogHeader className="pr-8">
					<DialogTitle>
						{mode === "create" ? "Add job" : "Edit job"}
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
							value={formState.fullProjectName}
							onChange={(event) =>
								onFormStateChange((current) => ({
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

					<div className="flex flex-col gap-2">
						<Label htmlFor="retentionDays">
							Build history retention (days)
						</Label>
						<Input
							id="retentionDays"
							type="number"
							min="1"
							max="3650"
							step="1"
							value={formState.retentionDays}
							onChange={(event) =>
								onFormStateChange((current) => ({
									...current,
									retentionDays: event.target.value,
								}))
							}
							placeholder="90"
						/>
						<p className="text-xs text-muted-foreground">
							Default is 90 days. Older persisted builds will be pruned for this
							job.
						</p>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="maxBuilds">Maximum persisted builds</Label>
						<Input
							id="maxBuilds"
							type="number"
							min="1"
							max="100000"
							step="1"
							value={formState.maxBuilds}
							onChange={(event) =>
								onFormStateChange((current) => ({
									...current,
									maxBuilds: event.target.value,
								}))
							}
							placeholder="1000"
						/>
						<p className="text-xs text-muted-foreground">
							Default is 1000 builds. Older rows beyond this cap will be pruned
							even if they are still within retention days.
						</p>
					</div>

					<div className="flex flex-col gap-3 rounded-xl border bg-muted/20 px-4 py-3">
						<div className="space-y-1">
							<p className="text-sm font-medium">Prefetch build log statuses</p>
							<p className="text-xs text-muted-foreground">
								Choose which build results should have logs fetched and stored
								locally during monitoring. Default is failure only.
							</p>
						</div>
						<label
							htmlFor="prefetchFailureLogs"
							className="flex items-start gap-3"
						>
							<input
								id="prefetchFailureLogs"
								type="checkbox"
								className="mt-1 size-4"
								checked={formState.prefetchFailureLogs}
								onChange={(event) =>
									onFormStateChange((current) => ({
										...current,
										prefetchFailureLogs: event.target.checked,
									}))
								}
							/>
							<div className="space-y-1">
								<p className="text-sm font-medium">Failure</p>
								<p className="text-xs text-muted-foreground">
									Prefetch logs for failed builds.
								</p>
							</div>
						</label>
						<label
							htmlFor="prefetchSuccessLogs"
							className="flex items-start gap-3"
						>
							<input
								id="prefetchSuccessLogs"
								type="checkbox"
								className="mt-1 size-4"
								checked={formState.prefetchSuccessLogs}
								onChange={(event) =>
									onFormStateChange((current) => ({
										...current,
										prefetchSuccessLogs: event.target.checked,
									}))
								}
							/>
							<div className="space-y-1">
								<p className="text-sm font-medium">Success</p>
								<p className="text-xs text-muted-foreground">
									Prefetch logs for successful builds.
								</p>
							</div>
						</label>
					</div>

					{formState.fullProjectName.trim() ? (
						<div className="grid gap-3 md:grid-cols-2">
							<InfoTile
								label="Normalized path"
								value={buildJenkinsJobPath(formState.fullProjectName)}
							/>
							<InfoTile
								label="Resolved URL"
								value={
									selectedInstance
										? buildJenkinsJobUrl(
												selectedInstance.hostUrl,
												formState.fullProjectName,
											)
										: "None"
								}
							/>
						</div>
					) : null}

					{errorMessage ? (
						<Alert variant="destructive">
							<AlertTitle>Save failed</AlertTitle>
							<AlertDescription>{errorMessage}</AlertDescription>
						</Alert>
					) : null}
				</div>

				<div className="flex items-center justify-end gap-2 border-t pt-4">
					<DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
					<Button onClick={onSave} disabled={isSaving}>
						{isSaving ? "Saving..." : "Save"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function getInstanceTitle(instance: JenkinsInstanceSummary): string {
	try {
		return new URL(instance.hostUrl).hostname;
	} catch {
		return instance.hostUrl;
	}
}
