import {
	CheckCircle2,
	Pencil,
	RefreshCw,
	Trash2,
	TriangleAlert,
	Wrench,
} from "lucide-react";
import { useState } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	XAxis,
	YAxis,
} from "recharts";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { appRpc } from "@/lib/app-rpc";
import { cn } from "@/lib/utils";
import type {
	JenkinsBuildLogRecord,
	JenkinsBuildTimeRange,
	JenkinsInstanceSummary,
	JenkinsJobActivity,
	JenkinsJobAnalytics,
	JenkinsJobBuildRecord,
	JenkinsJobDetails,
} from "../../../shared/jenkins";
import { ActionIconButton, formatDuration, InfoTile } from "./ui";

const RANGE_OPTIONS: Array<{ label: string; value: JenkinsBuildTimeRange }> = [
	{ label: "Last 12h", value: "last12h" },
	{ label: "Last 1d", value: "last1d" },
	{ label: "Last 7d", value: "last7d" },
	{ label: "Last 1m", value: "last1m" },
];

const buildVolumeChartConfig = {
	successful: {
		label: "Successful",
		color: "var(--chart-2)",
	},
	failed: {
		label: "Failed",
		color: "var(--chart-5)",
	},
	running: {
		label: "Running",
		color: "var(--chart-3)",
	},
} satisfies ChartConfig;

const successRateChartConfig = {
	successRatePercent: {
		label: "Success rate",
		color: "var(--chart-2)",
	},
} satisfies ChartConfig;

export function DetailsPanel({
	selectedInstance,
	selectedJob,
	jobDetails,
	jobActivity: _jobActivity,
	jobAnalytics,
	jobDetailsError,
	jobActivityError,
	jobAnalyticsError,
	selectedTimeRange,
	isLoadingJobDetails,
	isDeletingJob,
	onTimeRangeChange,
	onRefreshJob,
	onEditJob,
	onDeleteJob,
}: {
	selectedInstance: JenkinsInstanceSummary | null;
	selectedJob: string | null;
	jobDetails: JenkinsJobDetails | null;
	jobActivity: JenkinsJobActivity | null;
	jobAnalytics: JenkinsJobAnalytics | null;
	jobDetailsError: string | null;
	jobActivityError: string | null;
	jobAnalyticsError: string | null;
	selectedTimeRange: JenkinsBuildTimeRange;
	isLoadingJobDetails: boolean;
	isDeletingJob: boolean;
	onTimeRangeChange: (range: JenkinsBuildTimeRange) => void;
	onRefreshJob: () => void;
	onEditJob: () => void;
	onDeleteJob: () => void;
}) {
	const [selectedBuildLog, setSelectedBuildLog] =
		useState<JenkinsBuildLogRecord | null>(null);
	const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
	const [isLoadingBuildLog, setIsLoadingBuildLog] = useState(false);
	const [buildLogError, setBuildLogError] = useState<string | null>(null);
	const buildRows = jobAnalytics?.builds ?? [];
	const bucketRows =
		jobAnalytics?.buckets.map((bucket) => ({
			...bucket,
			successRatePercent:
				bucket.successRate == null
					? null
					: Math.round(bucket.successRate * 100),
		})) ?? [];

	async function handleOpenBuildLog(build: JenkinsJobBuildRecord) {
		if (!selectedInstance || !selectedJob) {
			return;
		}

		setIsLogDialogOpen(true);
		setIsLoadingBuildLog(true);
		setBuildLogError(null);

		try {
			const nextLog = await appRpc.proxy.request.getJenkinsBuildLog({
				instanceId: selectedInstance.id,
				fullProjectName: selectedJob,
				buildNumber: build.number,
			});
			setSelectedBuildLog(nextLog);
		} catch (error) {
			setSelectedBuildLog(null);
			setBuildLogError(
				error instanceof Error
					? error.message
					: "Failed to load local build log.",
			);
		} finally {
			setIsLoadingBuildLog(false);
		}
	}

	return (
		<div className="flex min-w-0 flex-1 flex-col bg-muted/10">
			<div className="flex items-center justify-between px-6 py-5">
				<div>
					<h1 className="text-lg font-semibold">
						{selectedJob ?? selectedInstance?.hostUrl ?? "Job details"}
					</h1>
					<p className="text-sm text-muted-foreground">
						Build analytics and recent build history.
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

			<div className="flex-1 overflow-y-auto p-6">
				<div className="flex flex-col gap-6">
					{isLoadingJobDetails ? (
						<Card className="border-dashed bg-background/70">
							<CardHeader>
								<CardTitle>Loading build analytics</CardTitle>
								<CardDescription>
									Fetching persisted build data for the selected job.
								</CardDescription>
							</CardHeader>
							<CardContent className="grid gap-3 xl:grid-cols-2">
								<Skeleton className="h-72 w-full rounded-xl" />
								<Skeleton className="h-72 w-full rounded-xl" />
								<Skeleton className="h-52 w-full rounded-xl xl:col-span-2" />
							</CardContent>
						</Card>
					) : null}

					{jobDetailsError ? (
						<Alert variant="destructive">
							<AlertTitle>Unable to load job details</AlertTitle>
							<AlertDescription>{jobDetailsError}</AlertDescription>
						</Alert>
					) : null}

					{jobAnalyticsError ? (
						<Alert variant="destructive">
							<AlertTitle>Unable to load build analytics</AlertTitle>
							<AlertDescription>{jobAnalyticsError}</AlertDescription>
						</Alert>
					) : null}

					{jobActivityError ? (
						<Alert variant="destructive">
							<AlertTitle>Unable to load job activity</AlertTitle>
							<AlertDescription>{jobActivityError}</AlertDescription>
						</Alert>
					) : null}

					{!isLoadingJobDetails && !jobDetailsError && jobDetails ? (
						<>
							<Card>
								<CardHeader className="gap-3">
									<div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
										<div>
											<CardTitle>Build analytics</CardTitle>
											<CardDescription>
												The selected time range filters both charts and the
												build list below.
											</CardDescription>
										</div>
										<ToggleGroup
											value={[selectedTimeRange]}
											onValueChange={(value) => {
												const nextValue = value[0];

												if (nextValue) {
													onTimeRangeChange(nextValue as JenkinsBuildTimeRange);
												}
											}}
											variant="outline"
											size="sm"
										>
											{RANGE_OPTIONS.map((option) => (
												<ToggleGroupItem
													key={option.value}
													value={option.value}
												>
													{option.label}
												</ToggleGroupItem>
											))}
										</ToggleGroup>
									</div>
								</CardHeader>
								<CardContent className="flex flex-col gap-6">
									<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
										<InfoTile
											label="Total builds"
											value={String(jobAnalytics?.totalBuilds ?? 0)}
										/>
										<InfoTile
											label="Success rate"
											value={formatPercent(jobAnalytics?.successRate)}
										/>
										<InfoTile
											label="Successful"
											value={String(jobAnalytics?.successfulBuilds ?? 0)}
										/>
										<InfoTile
											label="Failed"
											value={String(jobAnalytics?.failedBuilds ?? 0)}
										/>
										<InfoTile
											label="Avg duration"
											value={formatDuration(
												jobAnalytics?.averageDurationMs ?? undefined,
											)}
										/>
									</div>

									<div className="grid gap-4 xl:grid-cols-2">
										<Card className="bg-background">
											<CardHeader>
												<CardTitle>Build volume</CardTitle>
												<CardDescription>
													Counts grouped by time bucket for the active range.
												</CardDescription>
											</CardHeader>
											<CardContent>
												<ChartContainer
													config={buildVolumeChartConfig}
													className="h-72 w-full"
												>
													<BarChart data={bucketRows}>
														<CartesianGrid vertical={false} />
														<XAxis
															dataKey="label"
															tickLine={false}
															axisLine={false}
															minTickGap={24}
														/>
														<YAxis
															allowDecimals={false}
															tickLine={false}
															axisLine={false}
														/>
														<ChartTooltip
															content={
																<ChartTooltipContent
																	labelKey="label"
																	indicator="dashed"
																/>
															}
														/>
														<Bar
															dataKey="successful"
															stackId="builds"
															fill="var(--color-successful)"
															radius={[4, 4, 0, 0]}
														/>
														<Bar
															dataKey="failed"
															stackId="builds"
															fill="var(--color-failed)"
														/>
														<Bar
															dataKey="running"
															stackId="builds"
															fill="var(--color-running)"
														/>
													</BarChart>
												</ChartContainer>
											</CardContent>
										</Card>

										<Card className="bg-background">
											<CardHeader>
												<CardTitle>Success rate trend</CardTitle>
												<CardDescription>
													Percentage of successful completed builds in each time
													bucket.
												</CardDescription>
											</CardHeader>
											<CardContent>
												<ChartContainer
													config={successRateChartConfig}
													className="h-72 w-full"
												>
													<AreaChart data={bucketRows}>
														<CartesianGrid vertical={false} />
														<XAxis
															dataKey="label"
															tickLine={false}
															axisLine={false}
															minTickGap={24}
														/>
														<YAxis
															domain={[0, 100]}
															tickFormatter={(value) => `${value}%`}
															tickLine={false}
															axisLine={false}
														/>
														<ChartTooltip
															content={
																<ChartTooltipContent
																	labelKey="label"
																	formatter={(value) => (
																		<span className="font-mono font-medium text-foreground">
																			{value == null ? "No data" : `${value}%`}
																		</span>
																	)}
																/>
															}
														/>
														<Area
															type="monotone"
															dataKey="successRatePercent"
															stroke="var(--color-successRatePercent)"
															fill="var(--color-successRatePercent)"
															fillOpacity={0.18}
														/>
													</AreaChart>
												</ChartContainer>
											</CardContent>
										</Card>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Build list</CardTitle>
									<CardDescription>
										Recent builds constrained by the selected time range.
									</CardDescription>
								</CardHeader>
								<CardContent className="flex flex-col gap-3">
									{buildRows.length ? (
										buildRows.map((build) => (
											<div
												key={build.id}
												className="flex flex-col gap-3 rounded-xl border bg-background px-4 py-4 xl:flex-row xl:items-center xl:justify-between"
											>
												<div className="flex min-w-0 items-start gap-3">
													<div className="pt-0.5">{renderBuildIcon(build)}</div>
													<div className="min-w-0">
														<p className="truncate text-sm font-medium">
															{build.displayName ?? `Build #${build.number}`}
														</p>
														<p className="mt-1 text-xs text-muted-foreground">
															Started{" "}
															{build.timestamp
																? new Date(build.timestamp).toLocaleString()
																: "Unknown"}
														</p>
													</div>
												</div>
												<div className="flex flex-wrap items-center gap-2">
													<Badge variant={getBuildBadgeVariant(build)}>
														{getBuildStatusLabel(build)}
													</Badge>
													<Badge variant="outline">#{build.number}</Badge>
													<Badge variant="outline">
														{formatDuration(build.duration)}
													</Badge>
													<Button
														size="sm"
														variant="outline"
														onClick={() => void handleOpenBuildLog(build)}
													>
														View log
													</Button>
												</div>
											</div>
										))
									) : (
										<p className="text-sm text-muted-foreground">
											No builds found for the selected time range.
										</p>
									)}
								</CardContent>
							</Card>
						</>
					) : null}
				</div>
			</div>

			<Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
				<DialogContent className="sm:max-w-[56rem]">
					<DialogHeader className="pr-8">
						<DialogTitle>
							{selectedBuildLog
								? `Build #${selectedBuildLog.buildNumber} log`
								: "Build log"}
						</DialogTitle>
						<DialogDescription>
							Locally persisted build log content.
						</DialogDescription>
					</DialogHeader>

					{buildLogError ? (
						<Alert variant="destructive">
							<AlertTitle>Unable to load build log</AlertTitle>
							<AlertDescription>{buildLogError}</AlertDescription>
						</Alert>
					) : null}

					{isLoadingBuildLog ? (
						<Skeleton className="h-80 w-full rounded-xl" />
					) : (
						<div className="max-h-[65vh] overflow-auto rounded-xl border bg-muted/20 p-4">
							<pre className="whitespace-pre-wrap break-words font-mono text-xs leading-5">
								{selectedBuildLog?.content?.trim() ||
									"No local build log found."}
							</pre>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}

function formatPercent(value: number | null | undefined): string {
	if (value == null) {
		return "No data";
	}

	return `${Math.round(value * 100)}%`;
}

function getBuildStatusLabel(build: JenkinsJobBuildRecord): string {
	if (build.building) {
		return "Running";
	}

	switch (build.result) {
		case "SUCCESS":
			return "Success";
		case "FAILURE":
			return "Failure";
		case "ABORTED":
			return "Aborted";
		case "UNSTABLE":
			return "Unstable";
		case "NOT_BUILT":
			return "Not built";
		default:
			return build.result ?? "Unknown";
	}
}

function getBuildBadgeVariant(
	build: JenkinsJobBuildRecord,
): "default" | "secondary" | "outline" | "destructive" {
	if (build.building) {
		return "secondary";
	}

	switch (build.resultCategory) {
		case "success":
			return "default";
		case "failed":
			return "destructive";
		default:
			return "outline";
	}
}

function renderBuildIcon(build: JenkinsJobBuildRecord) {
	if (build.building) {
		return <Wrench className="text-muted-foreground" />;
	}

	switch (build.resultCategory) {
		case "success":
			return <CheckCircle2 className="text-muted-foreground" />;
		case "failed":
			return <TriangleAlert className="text-muted-foreground" />;
		default:
			return <Wrench className="text-muted-foreground" />;
	}
}
