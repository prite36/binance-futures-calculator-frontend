// Simple in-memory cache for API responses
interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

class APICache {
  private cache = new Map<string, CacheItem<any>>()

  set<T>(key: string, data: T, ttl: number = 60000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null

    const now = Date.now()
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data as T
  }

  clear(): void {
    this.cache.clear()
  }

  delete(key: string): void {
    this.cache.delete(key)
  }
}

export const apiCache = new APICache()

// Cache TTL constants
export const CACHE_TTL = {
  SYMBOLS: 3600000, // 1 hour
  LEVERAGE_BRACKETS: 3600000, // 1 hour
  TICKER_PRICE: 30000, // 30 seconds
} as const