import {
	native as electrobunNative,
	toCString,
} from "../../node_modules/electrobun/dist/api/bun/proc/native.ts";

type NativeBridge = {
	symbols: {
		setWindowIcon(
			windowPtr: unknown,
			iconPath: ReturnType<typeof toCString>,
		): void;
	};
} | null;

export const native = electrobunNative as NativeBridge;
export { toCString };
