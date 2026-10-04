import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const rawDatabaseUrl = process.env.DATABASE_URL?.trim();
if (!rawDatabaseUrl) {
  throw new Error("DATABASE_URL is required for backup/restore verification.");
}

const source = new URL(rawDatabaseUrl);
source.searchParams.delete("schema");

const restoreDatabase = `ayene_restore_${process.pid}_${Date.now()}`;
const maintenance = new URL(source);
maintenance.pathname = "/postgres";
maintenance.search = "";

const restore = new URL(source);
restore.pathname = "/" + restoreDatabase;
restore.search = "";

const workingDir = mkdtempSync(join(tmpdir(), "ayene-backup-"));
const dumpPath = join(workingDir, "stage.dump");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = result.stderr ? "\n" + result.stderr : "";
    throw new Error(
      command + " exited with status " + result.status + stderr,
    );
  }

  return (result.stdout ?? "").trim();
}

function tableCounts(connectionUrl) {
  const query = [
    "SELECT json_build_object(",
    "'AdminUser', (SELECT COUNT(*) FROM \"AdminUser\"),",
    "'Project', (SELECT COUNT(*) FROM \"Project\"),",
    "'Contribution', (SELECT COUNT(*) FROM \"Contribution\"),",
    "'TransparencyDocument', (SELECT COUNT(*) FROM \"TransparencyDocument\"),",
    "'CooperationRequest', (SELECT COUNT(*) FROM \"CooperationRequest\"),",
    "'Setting', (SELECT COUNT(*) FROM \"Setting\"),",
    "'AuditLog', (SELECT COUNT(*) FROM \"AuditLog\"),",
    "'Migrations', (SELECT COUNT(*) FROM \"_prisma_migrations\")",
    ")::text;",
  ].join(" ");

  const output = run(
    "psql",
    [connectionUrl, "-v", "ON_ERROR_STOP=1", "-Atc", query],
    { capture: true },
  );

  return JSON.parse(output);
}

try {
  run("pg_dump", [
    source.toString(),
    "--format=custom",
    "--no-owner",
    "--no-privileges",
    "--file",
    dumpPath,
  ]);

  run("dropdb", [
    "--if-exists",
    "--maintenance-db",
    maintenance.toString(),
    restoreDatabase,
  ]);

  run("createdb", [
    "--maintenance-db",
    maintenance.toString(),
    restoreDatabase,
  ]);

  run("pg_restore", [
    "--dbname",
    restore.toString(),
    "--no-owner",
    "--no-privileges",
    "--exit-on-error",
    dumpPath,
  ]);

  const sourceCounts = tableCounts(source.toString());
  const restoredCounts = tableCounts(restore.toString());

  if (JSON.stringify(sourceCounts) !== JSON.stringify(restoredCounts)) {
    throw new Error(
      "Backup/restore row-count verification failed: restored data differs from source.",
    );
  }

  if (!Number(restoredCounts.Migrations)) {
    throw new Error("Restored database has no Prisma migration history.");
  }

  process.stdout.write(
    JSON.stringify({
      status: "ok",
      check: "postgres-backup-restore",
      tables: restoredCounts,
    }) + "\n",
  );
} finally {
  try {
    run("dropdb", [
      "--if-exists",
      "--maintenance-db",
      maintenance.toString(),
      restoreDatabase,
    ]);
  } catch {
    // Preserve the original failure while best-effort cleanup runs.
  }

  rmSync(workingDir, { recursive: true, force: true });
}
