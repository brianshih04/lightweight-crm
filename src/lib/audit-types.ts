export type AuditResult = "SUCCESS" | "DENIED" | "FAILURE";
export type SecurityStatus = "OK" | "WARNING" | "CRITICAL";

export interface AuditEventDto {
  id: string;
  requestId: string;
  actorId: string | null;
  actorUsername: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  result: AuditResult;
  ipHash: string | null;
  details: unknown;
  createdAt: string;
}

export interface AuditPageDto {
  items: AuditEventDto[];
  nextCursor: string | null;
}

interface SecurityResultCountsDto {
  success: number;
  denied: number;
  failure: number;
}

export interface SecurityAlertDto {
  code: "AUDIT_FAILURES" | "DENIAL_SPIKE" | "LOGIN_BLOCKS" | "REPEATED_SOURCE";
  severity: "WARNING" | "CRITICAL";
  count: number;
  windowMinutes: number | null;
  ipHash: string | null;
}

export interface SecuritySummaryDto {
  generatedAt: string;
  last24h: SecurityResultCountsDto;
  last15m: SecurityResultCountsDto;
  activeLoginBlocks: number;
  topSources15m: Array<{ ipHash: string; count: number }>;
  status: SecurityStatus;
  alerts: SecurityAlertDto[];
}
