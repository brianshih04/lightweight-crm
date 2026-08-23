import { existsSync } from "node:fs";
import { resolve, sep } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { hashPassword, passwordNeedsUpgrade } from "../src/lib/password";

const databaseArgument = process.argv[2];
if (!databaseArgument) {
  throw new Error("Usage: npx tsx scripts/upgrade-sqlite-passwords.ts prisma/dev.db");
}

const projectPrismaDirectory = `${resolve(process.cwd(), "prisma")}${sep}`;
const databasePath = resolve(process.cwd(), databaseArgument);
if (!databasePath.startsWith(projectPrismaDirectory) || !databasePath.endsWith(".db")) {
  throw new Error("Password upgrade only accepts a .db file inside this project's prisma directory");
}
if (!existsSync(databasePath)) throw new Error(`Database not found: ${databasePath}`);

async function main() {
  const database = new DatabaseSync(databasePath);
  try {
    const users = database.prepare("SELECT id, password FROM User").all() as Array<{
      id: string;
      password: string;
    }>;
    const legacyUsers = users.filter((user) => passwordNeedsUpgrade(user.password));
    if (legacyUsers.length === 0) {
      console.log("All SQLite passwords already use the current scrypt format.");
      return;
    }

    const upgraded = await Promise.all(legacyUsers.map(async (user) => ({
      id: user.id,
      password: await hashPassword(user.password),
    })));
    const update = database.prepare("UPDATE User SET password = ?, updatedAt = ? WHERE id = ?");
    database.exec("BEGIN IMMEDIATE");
    try {
      const now = Date.now();
      for (const user of upgraded) update.run(user.password, now, user.id);
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
    console.log(`Upgraded ${upgraded.length} legacy password record(s) to scrypt.`);
  } finally {
    database.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
