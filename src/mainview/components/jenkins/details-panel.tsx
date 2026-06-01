import { Pencil, RefreshCw, Trash2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type {
	JenkinsInstanceSummary,
	JenkinsJobDetails,
} from "../../../shared/jenkins";
import {
	buildJenkinsJobPath,
	buildJenkinsJobUrl,
} from "../../../shared/jenkins";
import { ActionIconButton, BuildSummaryCard, InfoTile } from "./ui";

export function DetailsPanel({
	selectedInstance,
	selectedJob,
	jobDetails,
	jobDetailsError,
	isLoadingJobDetails,
	isDeletingJob,
	onRefreshJob,
	onEditJob,
	onDeleteJob,
}: {
	selectedInstance: JenkinsInstanceSummary | null;
	selectedJob: string | null;
	jobDetails: JenkinsJobDetails | null;
	jobDetailsError: string | null;
	isLoadingJobDetails: boolean;
	isDeletingJob: boolean;
	onRefreshJob: () => void;
	onEditJob: () => void;
	onDeleteJob: () => void;
}) {
	return (
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
							onClick={onRefreshJob}
							disabled={isLoadingJobDetails}
						>
							<RefreshCw
								className={cn(isLoadingJobDetails ? "animate-spin" : undefined)}
							/>
						</ActionIconButton>
						<ActionIconButton label="Edit job" onClick={onEditJob}>
							<Pencil />
						</ActionIconButton>
						<ActionIconButton
							label="Delete job"
							variant="destructive"
							onClick={onDeleteJob}
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
								value={jobDetails?.fullProjectName ?? selectedJob ?? "None"}
							/>
							<InfoTile
								label="Job path"
								value={selectedJob ? buildJenkinsJobPath(selectedJob) : "None"}
							/>
							<InfoTile
								label="Job URL"
								value={
									jobDetails?.url ??
									(selectedInstance && selectedJob
										? buildJenkinsJobUrl(selectedInstance.hostUrl, selectedJob)
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
									selectedInstance ? String(selectedInstance.jobs.length) : "0"
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
							<Card className="border-dashed bg-background/70">
								<CardHeader>
									<CardTitle>Loading job details</CardTitle>
									<CardDescription>
										Fetching the selected Jenkins job and recent build metadata.
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
												variant={jobDetails.buildable ? "default" : "outline"}
											>
												{jobDetails.buildable ? "Buildable" : "Disabled"}
											</Badge>
											<Badge
												variant={jobDetails.inQueue ? "secondary" : "outline"}
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
	);
}

function getInstanceTitle(instance: JenkinsInstanceSummary): string {
	try {
		return new URL(instance.hostUrl).hostname;
	} catch {
		return instance.hostUrl;
	}
}
