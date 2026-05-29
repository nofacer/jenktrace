import type {
	JenkinsConnectionTestInput,
	JenkinsConnectionTestResult,
	JenkinsInstanceSummary,
	JenkinsJobDetails,
	JenkinsJobDetailsInput,
	UpsertJenkinsInstanceInput,
} from "./jenkins";

type EmptyRPCMap = Record<string, never>;

export type AppRPCSchema = {
	bun: {
		requests: {
			listJenkinsInstances: {
				params: undefined;
				response: JenkinsInstanceSummary[];
			};
			saveJenkinsInstance: {
				params: UpsertJenkinsInstanceInput;
				response: JenkinsInstanceSummary[];
			};
			deleteJenkinsInstance: {
				params: {
					id: string;
				};
				response: JenkinsInstanceSummary[];
			};
			testJenkinsConnection: {
				params: JenkinsConnectionTestInput;
				response: JenkinsConnectionTestResult;
			};
			getJenkinsJobDetails: {
				params: JenkinsJobDetailsInput;
				response: JenkinsJobDetails;
			};
		};
		messages: EmptyRPCMap;
	};
	webview: {
		requests: EmptyRPCMap;
		messages: EmptyRPCMap;
	};
};
