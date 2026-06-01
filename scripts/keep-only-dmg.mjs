import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";

const artifactsDir = join(process.cwd(), "artifacts");

async function main() {
	const entries = await readdir(artifactsDir, { withFileTypes: true }).catch(
		() => [],
	);
	const dmgFiles = entries.filter(
		(entry) => entry.isFile() && entry.name.endsWith(".dmg"),
	);

	if (dmgFiles.length === 0) {
		throw new Error(`No DMG files found in ${artifactsDir}`);
	}

	await Promise.all(
		entries
			.filter((entry) => entry.isFile() && !entry.name.endsWith(".dmg"))
			.map((entry) => rm(join(artifactsDir, entry.name), { force: true })),
	);
}

await main();
