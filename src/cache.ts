interface CacheConfig {
  ttl?: number;
}

interface CacheItemInterface {
  value: unknown;
  date: Date;
  ttl?: number;
}

class CacheItem implements CacheItemInterface {
  value: unknown;
  date: Date;
  ttl?: number;

  constructor(item: CacheItemInterface) {
    this.value = item.value;
    this.date = item.date;
    this.ttl = item.ttl;
  }

  get expired() {
    if (!this.ttl) {
      return false;
    }
    return (new Date().getTime() - this.date.getTime()) / 1000 > this.ttl;
  }
}

export default class Cache {
  config: CacheConfig;
  storage: Record<string, CacheItem> = {};

  constructor(config?: CacheConfig) {
    this.config = { ...config };
  }

  get(key: string, stale: boolean = false) {
    const item = this.storage[key];
    if (item && (!item.expired || stale)) {
      console.debug(`Retrieving ${key} from cache`);
      return item.value;
    }
  }

  set(key: string, value: unknown, ttl?: number) {
    ttl = ttl ?? this.config.ttl;
    if (ttl && ttl < 0) {
      return value;
    }
    console.debug(`Storing ${key} in cache`);
    this.storage[key] = new CacheItem({
      value: value,
      date: new Date(),
      ttl: ttl,
    });
    return value;
  }

  delete(key: string) {
    console.debug(`Deleting ${key} from cache`);
    const { [key]: item, ...storage } = this.storage;
    this.storage = storage;
    return item.value;
  }

  prune() {
    console.debug("Removing expired items from cache");
    this.storage = Object.fromEntries(
      Object.entries(this.storage).filter(([_key, item]) => !item.expired),
    );
  }

  flush() {
    console.debug("Flushing cache storage");
    Object.keys(this.storage).forEach((key) => this.delete(key));
  }
}
