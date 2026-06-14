import type {
	JenkinsJobAnalytics,
	JenkinsJobDetails,
} from "../../../shared/jenkins";

type DetailsPanelLoadStateInput = {
	jobDetails: JenkinsJobDetails | null;
	jobAnalytics: JenkinsJobAnalytics | null;
	isLoadingJobDetails: boolean;
	isLoadingJobAnalytics: boolean;
};

export function getDetailsPanelLoadState({
	jobDetails,
	jobAnalytics,
	isLoadingJobDetails,
	isLoadingJobAnalytics,
}: DetailsPanelLoadStateInput) {
	const hasJobDetails = jobDetails !== null;
	const hasJobAnalytics = jobAnalytics !== null;

	return {
		hasJobDetails,
		hasJobAnalytics,
		shouldShowInitialJobDetailsSkeleton: isLoadingJobDetails && !hasJobDetails,
		shouldShowInitialJobAnalyticsSkeleton:
			isLoadingJobAnalytics && !hasJobAnalytics,
	};
}
