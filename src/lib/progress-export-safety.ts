export type ExportQueryResult<T> = {
  data: T | null;
  error: { message: string } | null;
};

export async function safeExportRows<T>(
  query: PromiseLike<ExportQueryResult<T[]>>,
  label: string,
  warnings: string[],
): Promise<T[]> {
  try {
    const result = await query;
    if (result.error) {
      warnings.push(`${label}: ${result.error.message}`);
      return [];
    }
    return result.data ?? [];
  } catch (reason) {
    warnings.push(
      `${label}: ${reason instanceof Error ? reason.message : "errore di connessione"}`,
    );
    return [];
  }
}

export async function safeExportOne<T>(
  query: PromiseLike<ExportQueryResult<T>>,
  label: string,
  warnings: string[],
): Promise<T | null> {
  try {
    const result = await query;
    if (result.error) {
      warnings.push(`${label}: ${result.error.message}`);
      return null;
    }
    return result.data ?? null;
  } catch (reason) {
    warnings.push(
      `${label}: ${reason instanceof Error ? reason.message : "errore di connessione"}`,
    );
    return null;
  }
}
