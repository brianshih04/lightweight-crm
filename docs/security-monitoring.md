# Security monitoring runbook

> **Current status (2026-08-23)**: the ADMIN-only summary and audit feed are implemented and covered by the 96-check security integration suite. External alert delivery is intentionally not configured yet; treat this document as an operator runbook, not proof of continuous monitoring.

## Signal source

`GET /api/audit/summary` is an ADMIN-only, non-cached security snapshot. It performs bounded database aggregations and returns:

- `last15m` and `last24h` SUCCESS, DENIED and FAILURE counts;
- active login throttle blocks;
- the ten highest-volume pseudonymous sources for DENIED/FAILURE events in the last 15 minutes;
- a derived `OK`, `WARNING` or `CRITICAL` status and machine-readable alerts.

The endpoint does not expose raw IP addresses. `ipHash` is the stable HMAC pseudonym produced with `AUDIT_HASH_SECRET`; treat it as restricted operational data because it can correlate activity over time.

Role changes, bootstrap, password reset/session revocation, denied role access and the regional boundary for `ORDER_ADMIN` are expected audit subjects. During an incident, correlate these events with the release migration (`20260823000200_add_business_roles`) and request ID before changing role assignments.

## Initial thresholds

| Signal | Warning | Critical | Window |
|---|---:|---:|---:|
| Audit `FAILURE` | 1 | 5 | 15 minutes |
| Authorization/authentication `DENIED` | 5 | 20 | 15 minutes |
| Active login blocks | 1 | 5 | current state |
| DENIED/FAILURE from one pseudonymous source | 5 | 10 | 15 minutes |

These are conservative bootstrap thresholds, not proven production baselines. Review false positives weekly for the first month, then record any threshold change as an operational decision with evidence.

## Triage order

1. Preserve the response, request IDs, relevant `/api/audit` pages and application logs.
2. Confirm whether the event is an approved admin/test action.
3. For repeated-source or denial spikes, check Cloudflare/WAF logs and temporarily restrict the source only when evidence supports it.
4. For application failures, correlate request ID with the deployment image digest and database migration version.
5. For login blocks, contact the account owner through a separate channel before resetting credentials; a password reset revokes sessions.
6. Record detection, acknowledgement, containment and resolution timestamps.

Do not delete AuditEvent or LoginThrottle rows during an incident. Do not rotate `AUDIT_HASH_SECRET` until evidence collection is complete, because rotation breaks future-to-past source correlation.

## External alerting boundary

The application currently produces the signal but intentionally does not send external webhooks. Configure the deployment monitor to authenticate with a dedicated least-privilege mechanism before polling this endpoint; do not embed an administrator cookie in source code or a general CI secret. Until service-account authentication exists, an ADMIN should review the summary and raw audit feed during operational checks.
