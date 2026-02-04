export async function unpaginate<T>(
  fn: (index: number) => Promise<T[]>,
  index: number,
) {
  const results: T[] = [];
  let data = await fn(index);
  while (data.length !== 0) {
    results.push(...data);
    index++;
    data = await fn(index);
  }
  return results;
}

export function getUrlSearchParams(params: object) {
  return new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([key, value]) => key !== undefined && value !== undefined)
        .map(([key, value]) => {
          if (value instanceof Date) {
            return [key, value.toISOString()];
          }
          return [key, value.toString()];
        }),
    ),
  );
}
