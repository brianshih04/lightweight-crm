const MAX_PAGES_PER_LOAD = 20;

export async function fetchAllPages<T>(path: string, init?: RequestInit): Promise<T[]> {
  const items: T[] = [];
  const url = new URL(path, window.location.origin);
  if (!url.searchParams.has("limit")) url.searchParams.set("limit", "100");

  for (let page = 0; page < MAX_PAGES_PER_LOAD; page += 1) {
    const response = await fetch(url, init);
    if (!response.ok) throw new Error(`API request failed (${response.status})`);
    const data: unknown = await response.json();
    if (!Array.isArray(data)) throw new Error("Expected a paginated array response");
    items.push(...data as T[]);

    const nextCursor = response.headers.get("x-next-cursor");
    if (!nextCursor) return items;
    url.searchParams.set("cursor", nextCursor);
  }

  throw new Error(`Pagination exceeded ${MAX_PAGES_PER_LOAD} pages`);
}
