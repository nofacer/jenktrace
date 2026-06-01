import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { JenkinsJobDetails } from "../../../shared/jenkins";

export function ActionIconButton({
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

export function EmptyStateCard({
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

export function InfoTile({ label, value }: { label: string; value: string }) {
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

export function BuildSummaryCard({
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
