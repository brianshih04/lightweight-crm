# PostgreSQL restore drill — 2026-08-23

> **Historical evidence note**: this drill proves restore commands against the small pre-business-role dataset. It predates migration `20260823000200_add_business_roles`; a post-migration rehearsal must additionally verify the native `UserRole` enum and create `MARKETING_MANAGER` / `ORDER_ADMIN` records before accepting production cutover.

- Source: freshly migrated `crm_migration2_test` on PostgreSQL 16 Alpine.
- Backup: `pg_dump --format=custom --no-owner --no-privileges`.
- Backup size: 60,117 bytes.
- SHA-256: `2d8fdf284ce5c6f9a719f6880a1a2d7fdbfcdbdbaf77b3546126cd7e7c0ffb1f`.
- Restore target: new `crm_restore_test` database.
- Result: PASS.

| Check | Source | Restored |
| --- | ---: | ---: |
| Users | 9 | 9 |
| Deals | 7 | 7 |
| Deal total | 10,900,000 | 10,900,000 |
| Tickets | 2 | 2 |
| Audit events | 8 | 8 |

This proves the commands and current small dataset can be restored. It does not yet prove the four-hour RTO against production-size data or that scheduled/off-host backup automation is operating.
