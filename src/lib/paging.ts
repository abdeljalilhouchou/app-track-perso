type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/** PostgREST returns at most 1000 rows per request: keep asking for the next page until one comes back short. */
export async function fetchAllRows<T>(page: (from: number, to: number) => Page<T>, pageSize = 1000, maxPages = 40): Promise<T[]> {
  const rows: T[] = [];
  for (let i = 0; i < maxPages; i++) {
    const { data, error } = await page(i * pageSize, (i + 1) * pageSize - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}
