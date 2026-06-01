import { native as electrobunNative } from "../../node_modules/electrobun/dist/api/bun/proc/native.ts";

type NativeBridge = {
	symbols: {
		setWindowIcon(windowPtr: unknown, iconPath: string): void;
	};
} | null;

export const native = electrobunNative as NativeBridge;
