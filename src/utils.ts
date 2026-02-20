export async function unpaginate<T>(generator: AsyncGenerator<T[]>) {
  const results: T[] = [];
  for await (const data of generator) {
    results.push(...data);
  }
  return results;
}

export async function* exhaust<T>(
  fn: (index: number) => Promise<T[]>,
  index: number,
) {
  let data = await fn(index);
  while (data.length !== 0) {
    yield data;
    index++;
    data = await fn(index);
  }
}

export async function getPromiseState<T>(promise: Promise<T>) {
  try {
    return (await Promise.race([promise, undefined])) && true;
  } catch {
    return false;
  }
}

export function withDefault<T>(fn: (...args: any[]) => Promise<T>, value: T) {
  return async function (...args: any[]) {
    try {
      return await fn(...args);
    } catch (error) {
      console.debug(`Ignoring ${error} and returning default value`);
      return value;
    }
  };
}

export function removeUndefined<T extends object>(data: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(data).filter(
      ([_key, value]) => value !== undefined && value?.length !== 0,
    ),
  ) as Partial<T>;
}

export function merge<T1 extends object, T2 extends object>(
  parent: T1,
  child: T2,
): T1 & Partial<T2> {
  return { ...parent, ...removeUndefined(child) };
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
