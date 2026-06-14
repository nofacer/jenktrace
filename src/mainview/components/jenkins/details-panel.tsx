import {
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Pencil,
	RefreshCw,
	ScrollText,
	Trash2,
	TriangleAlert,
	Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import type { AppLogEntry } from "../../../shared/app-log";
import {
	filterJenkinsJobBuildsByStatus,
	getJenkinsInstanceDisplayName,
	getJenkinsJobBuildStatusFilter,
	getJenkinsJobBuildStatusFilterOptions,
	type JenkinsBuildLogRecord,
	type JenkinsBuildTimeRange,
	type JenkinsInstanceSummary,
	type JenkinsJobActivity,
	type JenkinsJobAnalytics,
	type JenkinsJobBuildRecord,
	type JenkinsJobBuildStatusFilter,
	type JenkinsJobDetails,
} from "../../../shared/jenkins";
import { ActionIconButton, formatDuration, InfoTile } from "./ui";

const RANGE_OPTIONS: Array<{ label: string; value: JenkinsBuildTimeRange }> = [
	{ label: "Last 12h", value: "last12h" },
	{ label: "Last 1d", value: "last1d" },
	{ label: "Last 7d", value: "last7d" },
	{ label: "Last 1m", value: "last1m" },
];

const ANALYTICS_SKELETON_KEYS = [
	"total-builds",
	"success-rate",
	"successful-builds",
	"failed-builds",
	"avg-duration",
] as const;

const BUILD_ROW_SKELETON_KEYS = [
	"build-row-1",
	"build-row-2",
	"build-row-3",
	"build-row-4",
] as const;

const APP_LOG_SKELETON_KEYS = [
	"app-log-row-1",
	"app-log-row-2",
	"app-log-row-3",
] as const;

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
	appLogs,
	jobDetailsError,
	jobActivityError,
	appLogsError,
	jobAnalyticsError,
	selectedTimeRange,
	isLoadingJobDetails,
	isLoadingJobAnalytics,
	isLoadingAppLogs,
	isDeletingJob,
	onTimeRangeChange,
	onRefreshJob,
	onRefreshAppLogs,
	onEditJob,
	onDeleteJob,
}: {
	selectedInstance: JenkinsInstanceSummary | null;
	selectedJob: string | null;
	jobDetails: JenkinsJobDetails | null;
	jobActivity: JenkinsJobActivity | null;
	jobAnalytics: JenkinsJobAnalytics | null;
	appLogs: AppLogEntry[];
	jobDetailsError: string | null;
	jobActivityError: string | null;
	appLogsError: string | null;
	jobAnalyticsError: string | null;
	selectedTimeRange: JenkinsBuildTimeRange;
	isLoadingJobDetails: boolean;
	isLoadingJobAnalytics: boolean;
	isLoadingAppLogs: boolean;
	isDeletingJob: boolean;
	onTimeRangeChange: (range: JenkinsBuildTimeRange) => void;
	onRefreshJob: () => void;
	onRefreshAppLogs: () => void;
	onEditJob: () => void;
	onDeleteJob: () => void;
}) {
	const [selectedBuildLog, setSelectedBuildLog] =
		useState<JenkinsBuildLogRecord | null>(null);
	const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
	const [isLoadingBuildLog, setIsLoadingBuildLog] = useState(false);
	const [buildLogError, setBuildLogError] = useState<string | null>(null);
	const [isAppLogsOpen, setIsAppLogsOpen] = useState(false);
	const [selectedBuildStatus, setSelectedBuildStatus] =
		useState<JenkinsJobBuildStatusFilter>("all");
	const appLogRows = useMemo(() => appLogs.slice(0, 50), [appLogs]);
	const buildRows = jobAnalytics?.builds ?? [];
	const buildStatusOptions = useMemo(
		() => getJenkinsJobBuildStatusFilterOptions(buildRows),
		[buildRows],
	);
	const visibleBuildRows = useMemo(
		() =>
			buildStatusOptions.includes(selectedBuildStatus)
				? filterJenkinsJobBuildsByStatus(buildRows, selectedBuildStatus)
				: buildRows,
		[buildRows, buildStatusOptions, selectedBuildStatus],
	);
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

	useEffect(() => {
		if (
			selectedBuildStatus !== "all" &&
			!buildStatusOptions.includes(selectedBuildStatus)
		) {
			setSelectedBuildStatus("all");
		}
	}, [buildStatusOptions, selectedBuildStatus]);

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/10">
			<div className="flex items-center justify-between px-6 py-5">
				<div>
					<h1 className="text-lg font-semibold">
						{selectedJob ??
							(selectedInstance
								? getJenkinsInstanceDisplayName(selectedInstance)
								: "Job details")}
					</h1>
					<p className="text-sm text-muted-foreground">
						Build analytics, recent build history, and persisted build logs.
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

			<div className="min-h-0 flex flex-1 flex-col">
				<div className="flex-1 overflow-y-auto p-6">
					<div className="flex flex-col gap-6">
						{isLoadingJobDetails && !jobDetails ? (
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
														onTimeRangeChange(
															nextValue as JenkinsBuildTimeRange,
														);
													}
												}}
												variant="outline"
												size="sm"
												disabled={isLoadingJobAnalytics}
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
										{isLoadingJobAnalytics ? (
											<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
												{ANALYTICS_SKELETON_KEYS.map((key) => (
													<Skeleton
														key={key}
														className="h-24 w-full rounded-xl"
													/>
												))}
											</div>
										) : (
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
										)}

										{isLoadingJobAnalytics ? (
											<div className="grid gap-4 xl:grid-cols-2">
												<Skeleton className="h-72 w-full rounded-xl" />
												<Skeleton className="h-72 w-full rounded-xl" />
											</div>
										) : (
											<div className="grid gap-4 xl:grid-cols-2">
												<Card className="bg-background">
													<CardHeader>
														<CardTitle>Build volume</CardTitle>
														<CardDescription>
															Counts grouped by time bucket for the active
															range.
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
															Percentage of successful completed builds in each
															time bucket.
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
																					{value == null
																						? "No data"
																						: `${value}%`}
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
										)}
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
										<div className="flex flex-col gap-3 rounded-xl border bg-background/70 p-4">
											<div className="flex flex-col gap-1">
												<h3 className="text-sm font-medium">Filter builds</h3>
												<p className="text-sm text-muted-foreground">
													Filter the build list below by status.
												</p>
											</div>
											<ToggleGroup
												value={[selectedBuildStatus]}
												onValueChange={(value) => {
													const nextValue = value[0];

													if (nextValue) {
														setSelectedBuildStatus(
															nextValue as JenkinsJobBuildStatusFilter,
														);
													}
												}}
												variant="outline"
												size="sm"
											>
												{buildStatusOptions.map((option) => (
													<ToggleGroupItem key={option} value={option}>
														{formatBuildStatusFilterLabel(option)}
													</ToggleGroupItem>
												))}
											</ToggleGroup>
										</div>
										{isLoadingJobAnalytics ? (
											BUILD_ROW_SKELETON_KEYS.map((key) => (
												<Skeleton
													key={key}
													className="h-24 w-full rounded-xl"
												/>
											))
										) : visibleBuildRows.length ? (
											visibleBuildRows.map((build) => (
												<div
													key={build.id}
													className="flex flex-col gap-3 rounded-xl border bg-background px-4 py-4 xl:flex-row xl:items-center xl:justify-between"
												>
													<div className="flex min-w-0 items-start gap-3">
														<div className="pt-0.5">
															{renderBuildIcon(build)}
														</div>
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
												{selectedBuildStatus === "all"
													? "No builds found for the selected time range."
													: `No ${formatBuildStatusFilterLabel(selectedBuildStatus).toLowerCase()} builds found for the selected time range.`}
											</p>
										)}
									</CardContent>
								</Card>
							</>
						) : null}
					</div>
				</div>

				{isAppLogsOpen ? (
					<>
						<Separator />
						<div
							id="app-log-panel"
							className="flex max-h-[28rem] shrink-0 flex-col bg-background/95"
						>
							<div className="flex items-center justify-between gap-3 px-6 py-4">
								<div>
									<h2 className="text-sm font-semibold">App logs</h2>
									<p className="text-sm text-muted-foreground">
										Recent operational logs for app actions and HTTP requests.
									</p>
								</div>
								<ActionIconButton
									label={
										isLoadingAppLogs
											? "Refreshing app logs"
											: "Refresh app logs"
									}
									onClick={onRefreshAppLogs}
									disabled={isLoadingAppLogs}
								>
									<RefreshCw
										className={cn(
											isLoadingAppLogs ? "animate-spin" : undefined,
										)}
									/>
								</ActionIconButton>
							</div>
							<div className="overflow-y-auto px-6 pb-4">
								<div className="flex flex-col gap-3">
									{appLogsError ? (
										<Alert variant="destructive">
											<AlertTitle>Unable to load app logs</AlertTitle>
											<AlertDescription>{appLogsError}</AlertDescription>
										</Alert>
									) : null}

									{isLoadingAppLogs && !appLogRows.length ? (
										APP_LOG_SKELETON_KEYS.map((key) => (
											<Skeleton key={key} className="h-24 w-full rounded-xl" />
										))
									) : appLogRows.length ? (
										appLogRows.map((log) => (
											<div
												key={log.id}
												className="flex flex-col gap-3 rounded-xl border bg-background px-4 py-4"
											>
												<div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
													<div className="min-w-0">
														<p className="break-words text-sm font-medium">
															{log.message}
														</p>
														{log.detail ? (
															<p className="mt-1 break-words font-mono text-xs text-muted-foreground">
																{log.detail}
															</p>
														) : null}
													</div>
													<div className="flex flex-wrap items-center gap-2 xl:justify-end">
														<Badge
															variant={getAppLogLevelBadgeVariant(log.level)}
														>
															{log.level.toUpperCase()}
														</Badge>
														<Badge variant="outline">{log.scope}</Badge>
														{log.repeatCount > 1 ? (
															<Badge variant="secondary">
																×{log.repeatCount}
															</Badge>
														) : null}
													</div>
												</div>
												<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
													<span>{formatLogTimestamp(log.lastSeenAt)}</span>
													<span className="font-mono">{log.code}</span>
												</div>
											</div>
										))
									) : (
										<p className="text-sm text-muted-foreground">
											No app logs recorded yet.
										</p>
									)}
								</div>
							</div>
						</div>
					</>
				) : null}

				<div className="border-t bg-background/95 px-4 py-2">
					<Button
						variant="ghost"
						size="sm"
						className="w-full justify-between"
						aria-controls="app-log-panel"
						aria-expanded={isAppLogsOpen}
						onClick={() => setIsAppLogsOpen((current) => !current)}
					>
						<span className="flex min-w-0 items-center gap-2">
							<ScrollText />
							<span>App logs</span>
							<span className="truncate text-xs text-muted-foreground">
								{appLogsError
									? "Unavailable"
									: `${appLogRows.length} recent ${appLogRows.length === 1 ? "entry" : "entries"}`}
							</span>
						</span>
						<span className="text-muted-foreground">
							{isAppLogsOpen ? <ChevronDown /> : <ChevronUp />}
						</span>
					</Button>
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

function formatBuildStatusFilterLabel(
	status: JenkinsJobBuildStatusFilter,
): string {
	switch (status) {
		case "all":
			return "All";
		case "success":
			return "Success";
		case "failure":
			return "Failure";
		case "running":
			return "Running";
		case "aborted":
			return "Aborted";
		case "unstable":
			return "Unstable";
		case "notBuilt":
			return "Not built";
		case "unknown":
			return "Unknown";
	}
}

function getBuildStatusLabel(build: JenkinsJobBuildRecord): string {
	return formatBuildStatusFilterLabel(getJenkinsJobBuildStatusFilter(build));
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

function getAppLogLevelBadgeVariant(
	level: AppLogEntry["level"],
): "default" | "secondary" | "outline" | "destructive" {
	switch (level) {
		case "error":
			return "destructive";
		case "warn":
			return "secondary";
		case "info":
			return "default";
		default:
			return "outline";
	}
}

function formatLogTimestamp(value: string): string {
	const parsed = new Date(value);

	if (Number.isNaN(parsed.getTime())) {
		return value;
	}

	return parsed.toLocaleString();
}
