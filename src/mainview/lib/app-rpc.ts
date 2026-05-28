import { Electroview } from "electrobun/view";

import type { AppRPCSchema } from "../../shared/rpc";

export const appRpc = Electroview.defineRPC<AppRPCSchema>({
	handlers: {},
});

export const electrobunView = new Electroview({
	rpc: appRpc,
});
