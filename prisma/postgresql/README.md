# PostgreSQL schema and migrations

> **Current state (2026-08-23)**: generated schema and clean migration/runtime verification pass. Applied migration `20260823000200_add_business_roles` adds `MARKETING_MANAGER` and `ORDER_ADMIN` to the native `UserRole` enum. The business hierarchy is GM → Marketing Manager / Regional Manager → Sales, with Order Admin as an all-market order-support role (org-charted under the marketing manager); `ADMIN` remains a separate platform role.

`schema.prisma` is generated from `../schema.prisma`; do not edit it directly. The generator changes the provider to PostgreSQL and promotes role, region and lifecycle status strings to native PostgreSQL enums.

```powershell
npm run db:pg:schema
npm run db:pg:check
npx prisma generate --schema prisma/postgresql/schema.prisma
npm run db:pg:migrate
```

Production deployment must set `DATABASE_URL` to PostgreSQL and run `npm run db:pg:migrate` before starting the immutable application artifact. `prisma db push` is only for the local SQLite development database.

After migration, verify `npx prisma migrate status --schema prisma/postgresql/schema.prisma` and `npx prisma migrate diff --from-url "$env:DATABASE_URL" --to-schema-datamodel prisma/postgresql/schema.prisma --exit-code`. The runtime integration test also creates both new roles and exercises their API contracts; it must run against a database whose name ends in `_test`.

The destructive PostgreSQL integration test requires both a database name ending in `_test` and `POSTGRES_TEST_DATABASE=1`:

```powershell
$env:DATABASE_URL = "postgresql://crm:password@localhost:5432/crm_test?schema=public"
$env:POSTGRES_TEST_DATABASE = "1"
npm run test:postgres
```
