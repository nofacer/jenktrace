import { Pencil, Plus, Trash2 } from "lucide-react";

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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
	buildJenkinsJobPath,
	getJenkinsInstanceButtonTitle,
	getJenkinsInstanceDisplayName,
	getJenkinsInstanceHostname,
	getJenkinsInstanceIconColors,
	getJenkinsInstanceIconLabel,
	type JenkinsInstanceSummary,
} from "../../../shared/jenkins";
import { EmptyStateCard, InstanceAvatarMark } from "./ui";

export function InstanceSidebar({
	instances,
	selectedInstanceId,
	selectedInstance,
	selectedJob,
	isLoading,
	isDeleting,
	onCreateInstance,
	onSelectInstance,
	onEditInstance,
	onDeleteInstance,
	onCreateJob,
	onSelectJob,
}: {
	instances: JenkinsInstanceSummary[];
	selectedInstanceId: string | null;
	selectedInstance: JenkinsInstanceSummary | null;
	selectedJob: string | null;
	isLoading: boolean;
	isDeleting: boolean;
	onCreateInstance: () => void;
	onSelectInstance: (instanceId: string) => void;
	onEditInstance: () => void;
	onDeleteInstance: () => void;
	onCreateJob: () => void;
	onSelectJob: (job: string) => void;
}) {
	return (
		<section className="flex min-w-0 shrink-0">
			<aside className="flex w-22 flex-col items-center gap-3 border-r bg-muted/30 px-3 py-4">
				<Button
					size="icon-sm"
					onClick={onCreateInstance}
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
								variant="outline"
								title={getJenkinsInstanceButtonTitle(instance)}
								onClick={() => onSelectInstance(instance.id)}
								className={cn(
									"size-12 rounded-xl border-border/70 p-0",
									isActive && "border-primary bg-primary/10 shadow-sm",
								)}
							>
								<InstanceAvatarMark
									className="size-10"
									label={getJenkinsInstanceIconLabel(instance)}
									colors={getJenkinsInstanceIconColors(instance) ?? undefined}
									labelClassName={
										isActive && !instance.iconBackgroundColor
											? "bg-primary text-primary-foreground"
											: undefined
									}
								/>
							</Button>
						);
					})}
				</div>
			</aside>

			<div className="flex w-80 shrink-0 flex-col border-r bg-background">
				<div className="flex flex-col gap-3 px-5 py-4">
					{selectedInstance ? (
						<Card className="bg-muted/30">
							<CardHeader>
								<div className="flex items-start gap-3">
									<InstanceAvatarMark
										className="size-12 shrink-0"
										label={getJenkinsInstanceIconLabel(selectedInstance)}
										colors={
											getJenkinsInstanceIconColors(selectedInstance) ??
											undefined
										}
									/>
									<div className="min-w-0 flex-1">
										<CardTitle className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
											Instance
										</CardTitle>
										<CardDescription className="truncate text-sm font-semibold text-foreground">
											{getJenkinsInstanceDisplayName(selectedInstance)}
										</CardDescription>
										<p className="truncate pt-1 text-xs text-muted-foreground">
											{getJenkinsInstanceHostname(selectedInstance.hostUrl)}
										</p>
									</div>
								</div>
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
									onClick={onEditInstance}
									title="Edit instance"
									aria-label="Edit instance"
								>
									<Pencil />
								</Button>
								<Button
									size="icon-sm"
									variant="destructive"
									onClick={onDeleteInstance}
									disabled={isDeleting}
									title={isDeleting ? "Deleting instance" : "Delete instance"}
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
								onClick={onCreateJob}
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
								<Button size="sm" onClick={onCreateJob}>
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
										onClick={() => onSelectJob(job)}
										className={cn(
											"rounded-xl border px-4 py-3 text-left transition-colors",
											isActive
												? "border-primary bg-primary/8"
												: "border-border bg-card hover:bg-accent/60",
										)}
									>
										<p className="truncate text-sm font-medium">{job}</p>
										<div className="mt-1 flex items-center justify-between gap-3">
											<p className="truncate text-xs text-muted-foreground">
												{buildJenkinsJobPath(job)}
											</p>
											<p className="shrink-0 text-[11px] text-muted-foreground">
												{selectedInstance.jobRetentionDays[job] ?? 90}d /{" "}
												{selectedInstance.jobMaxBuilds[job] ?? 1000}b /{" "}
												{formatPrefetchStatuses(
													selectedInstance.jobPrefetchBuildLogStatuses[job],
												)}
											</p>
										</div>
									</button>
								);
							})}
						</div>
					) : null}
				</div>
			</div>
		</section>
	);
}

function formatPrefetchStatuses(
	statuses?: Array<"failure" | "success">,
): string {
	const normalized = statuses?.length ? statuses : ["failure"];

	if (normalized.includes("failure") && normalized.includes("success")) {
		return "log: fail+ok";
	}

	if (normalized.includes("success")) {
		return "log: ok";
	}

	return "log: fail";
}
