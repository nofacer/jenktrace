import { Electroview } from "electrobun/view";

import type { AppRPCSchema } from "../../shared/rpc";

const RPC_REQUEST_TIMEOUT_MS = 10_000;

export const appRpc = Electroview.defineRPC<AppRPCSchema>({
	maxRequestTime: RPC_REQUEST_TIMEOUT_MS,
	handlers: {},
});

export const electrobunView = new Electroview({
	rpc: appRpc,
});
