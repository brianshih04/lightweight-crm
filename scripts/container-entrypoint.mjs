import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const role = process.env.CONTAINER_ROLE;

if (role !== "app" && role !== "migrate") {
  throw new Error("CONTAINER_ROLE must be either app or migrate");
}

async function loadSecret(name) {
  const directValue = process.env[name]?.trim();
  const fileName = process.env[`${name}_FILE`]?.trim();

  if (directValue && fileName) {
    throw new Error(`${name} and ${name}_FILE cannot both be set`);
  }

  if (fileName) {
    const fileValue = (await readFile(fileName, "utf8")).trim();
    if (!fileValue) throw new Error(`${name}_FILE points to an empty file`);
    process.env[name] = fileValue;
  }

  if (!process.env[name]?.trim()) {
    throw new Error(`${name} or ${name}_FILE is required`);
  }

  delete process.env[`${name}_FILE`];
  return process.env[name];
}

const databaseUrl = await loadSecret("DATABASE_URL");
if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
  throw new Error("Container deployments require a PostgreSQL DATABASE_URL");
}

if (role === "app") {
  const appOrigin = await loadSecret("APP_ORIGIN");
  const auditHashSecret = await loadSecret("AUDIT_HASH_SECRET");
  const parsedOrigin = new URL(appOrigin);

  if (!["http:", "https:"].includes(parsedOrigin.protocol) || parsedOrigin.origin !== appOrigin) {
    throw new Error("APP_ORIGIN must be one exact HTTP(S) origin without a path");
  }
  if (auditHashSecret.length < 32 || /replace|example|changeme/i.test(auditHashSecret)) {
    throw new Error("AUDIT_HASH_SECRET must be a non-placeholder value of at least 32 characters");
  }
}

const [command, ...args] = process.argv.slice(2);
if (!command) throw new Error("A child command is required");

const child = spawn(command, args, {
  env: process.env,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.once("error", (error) => {
  console.error("Unable to start container process:", error);
  process.exitCode = 1;
});

child.once("exit", (code, signal) => {
  if (signal) {
    process.exitCode = signal === "SIGTERM" ? 143 : 130;
    return;
  }
  process.exitCode = code ?? 1;
});
