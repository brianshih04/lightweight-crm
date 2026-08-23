import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const runtimeDirectory = resolve(".runtime");
const prismaDirectory = resolve("prisma");
const databaseName = "e2e.db";
const databasePath = resolve(prismaDirectory, databaseName);
const databaseUrl = `file:./${databaseName}`;

await mkdir(runtimeDirectory, { recursive: true });
for (const entry of await readdir(prismaDirectory)) {
  if (!/^e2e(?:-\d+-\d+)?\.db(?:-(?:journal|shm|wal))?$/.test(entry)) continue;
  const stalePath = resolve(prismaDirectory, entry);
  if (dirname(stalePath) !== prismaDirectory) throw new Error("Refusing to clean an E2E file outside prisma/");
  await rm(stalePath, { force: true });
}

await writeFile(resolve(runtimeDirectory, "e2e-database-url"), databaseUrl, "utf8");

console.log(`Reserved clean isolated E2E database path at ${databasePath}`);
