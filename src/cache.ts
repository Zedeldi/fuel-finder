import NodeCache from "node-cache";

const store = new NodeCache();

function getCacheKey(name: string, args: unknown[]) {
  return `${name}_${JSON.stringify(args)}`;
}

export default function cache(ttl: number) {
  return function (
    _target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const cacheKey = getCacheKey(propertyKey, args);

      const cachedResult = store.get(cacheKey);
      if (cachedResult) {
        console.debug(`Returning cached result for ${cacheKey}`);
        return cachedResult;
      }

      const result = await originalMethod.apply(this, args);
      if (result) {
        store.set(cacheKey, result, ttl);
        console.debug(`Caching result for ${cacheKey} (ttl=${ttl})`);
      }

      return result;
    };

    return descriptor;
  };
}
