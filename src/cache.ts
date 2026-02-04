interface CacheConfig {
  ttl?: number;
}

interface CacheItemInterface {
  key: string;
  value: unknown;
  date: Date;
  ttl?: number;
}

class CacheItem implements CacheItemInterface {
  key: string;
  value: unknown;
  date: Date;
  ttl?: number;

  constructor(item: CacheItemInterface) {
    this.key = item.key;
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
  storage: CacheItem[] = [];

  constructor(config?: CacheConfig) {
    this.config = { ...config };
  }

  get(key: string, stale: boolean = false) {
    const item = this.storage.find((item) => item.key === key);
    if (item && (!item.expired || stale)) {
      return item.value;
    }
  }

  set(key: string, value: unknown, ttl?: number) {
    this.delete(key);
    this.storage.push(
      new CacheItem({
        key: key,
        value: value,
        date: new Date(),
        ttl: ttl ?? this.config.ttl,
      }),
    );
    return value;
  }

  delete(key: string) {
    this.storage = this.storage.filter((item) => item.key !== key);
  }

  prune() {
    this.storage = this.storage.filter((item) => !item.expired);
  }
}
