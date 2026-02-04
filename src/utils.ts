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
