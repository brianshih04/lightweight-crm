# PostgreSQL cutover and operations runbook

> **Current schema note (2026-08-23)**: the generated PostgreSQL schema is synchronized and the clean migration path contains `20260823000100_initial` plus `20260823000200_add_business_roles`. The latter adds `MARKETING_MANAGER` and `ORDER_ADMIN` to the native `UserRole` enum. Always run `npm run db:pg:check` before deploy; never hand-edit `prisma/postgresql/schema.prisma`.

## Safety boundary

- Keep `prisma/dev.db` and an offline copy read-only until PostgreSQL cutover is accepted.
- Store `DATABASE_URL`, `AUDIT_HASH_SECRET` and backup credentials in the deployment secret manager. Never commit them.
- Production migration requires `ALLOW_PRODUCTION_DATA_MIGRATION=I_HAVE_A_VERIFIED_BACKUP`; the importer also refuses a non-empty target or a source containing legacy plaintext passwords.
- Never run `prisma db push` or `npm run db:seed` in production. The seed now hard-fails when `NODE_ENV=production`.

## Build and migration

```powershell
npm ci
npm run db:pg:check
npx prisma generate --schema prisma/postgresql/schema.prisma
npm run lint
npm run typecheck
npm run build
npm run db:pg:migrate
npx prisma migrate status --schema prisma/postgresql/schema.prisma
```

The deploy order is: immutable build → database backup → `migrate deploy` → one application instance → `/api/health` → smoke tests → remaining instances. A failed readiness check must stop rollout.

## One-time SQLite data cutover

1. Put the old application in maintenance/read-only mode.
2. Copy `prisma/dev.db` to offline storage and record its SHA-256.
3. Upgrade any legacy password values:

   ```powershell
   npm run db:passwords:upgrade
   ```

4. Provision an empty PostgreSQL database and apply migrations.
5. Set the production confirmation only after the backup is verified:

   ```powershell
   $env:ALLOW_PRODUCTION_DATA_MIGRATION = "I_HAVE_A_VERIFIED_BACKUP"
   npm run db:pg:import-sqlite
   ```

6. Compare source/target counts and Deal totals printed by the importer, then start the PostgreSQL build.
7. Verify `/api/health`, login, role isolation, a read-only dashboard/report query and one reversible test mutation.

The role smoke test must include: `MARKETING_MANAGER` with `ALL` scope, `SALES_MANAGER` with a named region, `ORDER_ADMIN` under the marketing manager, and `SALES` under the same region. Confirm Order Admin deal access is all-market (cross-region read/write, org home region is informational only) and that user administration, executive reports and audit remain denied.

The importer is atomic and preserves primary keys, timestamps, password hashes and relationships. It refuses an already populated target.

## Backup policy

- Initial target: full custom-format `pg_dump` every 6 hours, encrypted at rest, retained 30 daily and 12 monthly copies, with at least one off-host copy.
- Record backup time, size, SHA-256 and database migration version.
- Initial service objectives: RPO ≤ 6 hours and RTO ≤ 4 hours. These are targets until scheduled automation and a production-size drill prove them.

Example backup:

```powershell
pg_dump $env:DATABASE_URL --format=custom --no-owner --no-privileges --file crm.dump
Get-FileHash crm.dump -Algorithm SHA256
```

## Restore drill

Restore only into a newly created database; never overwrite the active database during a drill.

```powershell
createdb crm_restore_test
pg_restore --dbname crm_restore_test --no-owner --no-privileges crm.dump
```

Verify migration state, table counts, Deal total, login/session behavior and `/api/health`. Delete the drill database only after evidence is recorded.

## Rollback

- Before cutover writes: stop the PostgreSQL build and return traffic to the read-only SQLite artifact.
- After PostgreSQL accepts writes: do not point the old SQLite build at stale data. Roll back the application artifact while keeping PostgreSQL, or restore a verified PostgreSQL backup into a new database and repoint secrets.
- Preserve failed migration logs and the pre-cutover backup for incident review.

## Current release blockers

This runbook is executable for a controlled rehearsal, not evidence that production cutover has happened. Formal cutover still depends on verified encrypted/off-host backups, credential rotation, an approved rollback/traffic plan, external alerting and an operational owner. Record the migration version and role smoke-test evidence in the release handoff.
