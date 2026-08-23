# Immutable container deployment runbook

> **Current release note (2026-08-23)**: the application artifact includes the business-role model `GM`, `MARKETING_MANAGER`, `SALES_MANAGER`, `SALES` plus regional `ORDER_ADMIN` (Sales Assistant). The clean PostgreSQL migration path includes `20260823000200_add_business_roles`; run the migration gate before starting the app. First bootstrap still requires a user-supplied password and creates exactly one `ADMIN`.

## Guarantees and boundary

`Dockerfile` produces two artifacts from the same locked source tree:

- `runner`: a minimal Next.js standalone image that runs as UID/GID 1001, uses a read-only root filesystem and has all Linux capabilities removed.
- `migrator`: a one-shot Prisma image. `compose.production.yml` will not start the app unless `prisma migrate deploy` exits successfully.

The Node and PostgreSQL base images are pinned by version and multi-architecture digest. Runtime secrets are mounted as files and loaded only after the container starts. Build-only values do not persist in either final image.

This stack binds the app to `127.0.0.1:3100` by default. Put TLS and access control in the reverse proxy or Cloudflare Tunnel. Do not expose the first-admin bootstrap endpoint to an untrusted network.

## Prepare secrets

Create a directory outside the repository and restrict it to the deployment account. Each file must contain only the value named by the file:

```text
postgres_password
database_url
app_origin
audit_hash_secret
```

`database_url` must use the Compose service name `database`, for example:

```text
postgresql://crm:URL_ENCODED_PASSWORD@database:5432/crm?schema=public&connection_limit=20&pool_timeout=30
```

`app_origin` must be the exact public HTTPS origin. `audit_hash_secret` must be a random non-placeholder value of at least 32 characters. Never commit the directory or pass secrets as Docker build arguments.

## Build once and deploy the same image

Use a unique immutable tag such as the full Git commit SHA:

```powershell
$env:CRM_SECRETS_DIR = "C:\ProgramData\NexCRM\secrets"
$env:CRM_IMAGE_TAG = git rev-parse HEAD
$env:CRM_PORT = "3100"

docker compose -f compose.production.yml build --pull app migrate
docker image inspect "lightweight-crm:$env:CRM_IMAGE_TAG" --format '{{.Id}}'
docker image inspect "lightweight-crm:$env:CRM_IMAGE_TAG-migrator" --format '{{.Id}}'
docker compose -f compose.production.yml up --detach --no-build --wait
```

`--no-build` is deliberate: rollout must use the artifact already reviewed and recorded. In a multi-host deployment, push both tags to a private registry and deploy by image digest, not a mutable tag.

## Acceptance checks

```powershell
Invoke-WebRequest http://127.0.0.1:3100/api/health
docker compose -f compose.production.yml ps --all
docker compose -f compose.production.yml logs migrate
```

Expected state: database `healthy`, migrator `Exited (0)`, app `healthy`. Also verify login, a role-scoped read, one reversible write and its AuditEvent. The first clean deployment must reject setup without a password, create exactly one ADMIN, and reject every later setup attempt.

For the role smoke test, create a `MARKETING_MANAGER` in `ALL` and an `ORDER_ADMIN` in a named region, verify that the latter can create/update only regional Deals, and verify that `ORDER_ADMIN` cannot access user administration, executive reports or audit endpoints. A `MARKETING_MANAGER` may manage marketing campaigns/workflows but must remain denied from sales reports and user administration.

## Rollout and rollback

1. Record the current runner and migrator image digests.
2. Take and verify a PostgreSQL backup before applying a new migration.
3. Build/test the candidate image in CI, then run the candidate migrator once.
4. Start one candidate app, require `/api/health` and smoke checks to pass, then move traffic.
5. For application rollback, set `CRM_IMAGE_TAG` to the recorded previous tag and run `up --detach --no-build --wait`.

Do not automatically reverse a database migration and do not point an old SQLite build at PostgreSQL data. Every schema change must be backward-compatible with the immediately previous runner for the rollback window. If it is not, the release needs a documented expand/migrate/contract sequence.

`docker compose down` preserves the named PostgreSQL volume. Never add `--volumes` in production. Restore only into a newly provisioned database, validate it, and then repoint the secret.

## Secret rotation

- Rotate `AUDIT_HASH_SECRET` only with an explicit audit-correlation retention decision; changing it changes future IP pseudonyms.
- To rotate the database password, update PostgreSQL and both secret files within one controlled maintenance window, then recreate migrator/app.
- Rotating account passwords already revokes existing application sessions.
- After any secret-file change, use `docker compose up --detach --force-recreate --no-build --wait`; a plain restart does not refresh mounted Compose secret content reliably across runtimes.

## Handoff boundary

Container hardening and clean deployment have been verified in CI-style smoke tests, but registry promotion, traffic-layer automatic rollback, production backup scheduling and formal PostgreSQL cutover remain external release tasks. Do not mark the project production-ready solely because the container health check is green.
