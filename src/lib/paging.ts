type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/** PostgREST returns at most 1000 rows per request: keep paging until the final partial page. */
export async function fetchAllRows<T>(page: (from: number, to: number) => Page<T>, pageSize = 1000, maxPages = 100): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1 || !Number.isInteger(maxPages) || maxPages < 1) {
    throw new Error("Paramètres de pagination invalides.");
  }

  const rows: T[] = [];
  for (let i = 0; i < maxPages; i++) {
    const { data, error } = await page(i * pageSize, (i + 1) * pageSize - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    if (i === maxPages - 1) {
      throw new Error(`La pagination a atteint sa limite de ${maxPages * pageSize} lignes.`);
    }
  }
  return rows;
}
