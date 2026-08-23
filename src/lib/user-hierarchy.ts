export const MAX_MANAGER_HIERARCHY_DEPTH = 50;

export type HierarchyViolation = "cycle" | "too_deep" | null;

export async function inspectManagerHierarchy(options: {
  targetUserId: string;
  managerId: string;
  loadParentId: (userId: string) => Promise<string | null>;
  maxDepth?: number;
}): Promise<HierarchyViolation> {
  const { targetUserId, loadParentId, maxDepth = MAX_MANAGER_HIERARCHY_DEPTH } = options;
  const visited = new Set<string>();
  let ancestorId: string | null = options.managerId;

  for (let depth = 0; ancestorId; depth += 1) {
    if (ancestorId === targetUserId || visited.has(ancestorId)) return "cycle";
    if (depth >= maxDepth) return "too_deep";
    visited.add(ancestorId);
    ancestorId = await loadParentId(ancestorId);
  }
  return null;
}
