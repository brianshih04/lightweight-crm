export type SecurityAlertSeverity = "WARNING" | "CRITICAL";

export interface SecuritySourceCount {
  ipHash: string;
  count: number;
}

export interface SecuritySnapshot {
  denied15m: number;
  failures15m: number;
  activeLoginBlocks: number;
  topSources15m: SecuritySourceCount[];
}

export interface SecurityAlert {
  code: "AUDIT_FAILURES" | "DENIAL_SPIKE" | "LOGIN_BLOCKS" | "REPEATED_SOURCE";
  severity: SecurityAlertSeverity;
  count: number;
  windowMinutes: number | null;
  ipHash: string | null;
}

function thresholdSeverity(count: number, warning: number, critical: number): SecurityAlertSeverity | null {
  if (count >= critical) return "CRITICAL";
  if (count >= warning) return "WARNING";
  return null;
}

export function deriveSecurityAlerts(snapshot: SecuritySnapshot): SecurityAlert[] {
  const alerts: SecurityAlert[] = [];
  const failures = thresholdSeverity(snapshot.failures15m, 1, 5);
  if (failures) {
    alerts.push({
      code: "AUDIT_FAILURES",
      severity: failures,
      count: snapshot.failures15m,
      windowMinutes: 15,
      ipHash: null,
    });
  }

  const denied = thresholdSeverity(snapshot.denied15m, 5, 20);
  if (denied) {
    alerts.push({
      code: "DENIAL_SPIKE",
      severity: denied,
      count: snapshot.denied15m,
      windowMinutes: 15,
      ipHash: null,
    });
  }

  const blocks = thresholdSeverity(snapshot.activeLoginBlocks, 1, 5);
  if (blocks) {
    alerts.push({
      code: "LOGIN_BLOCKS",
      severity: blocks,
      count: snapshot.activeLoginBlocks,
      windowMinutes: null,
      ipHash: null,
    });
  }

  for (const source of snapshot.topSources15m) {
    const severity = thresholdSeverity(source.count, 5, 10);
    if (!severity) continue;
    alerts.push({
      code: "REPEATED_SOURCE",
      severity,
      count: source.count,
      windowMinutes: 15,
      ipHash: source.ipHash,
    });
  }

  return alerts.sort((left, right) => {
    if (left.severity !== right.severity) return left.severity === "CRITICAL" ? -1 : 1;
    return right.count - left.count;
  });
}
