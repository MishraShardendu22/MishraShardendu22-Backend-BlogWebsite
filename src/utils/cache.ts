import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const cache = {
  async get(key: string) {
    try {
      const data = await redis.get(key)
      return data
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  },

  async set(key: string, value: any, ttlSeconds: number = 300) {
    try {
      await redis.set(key, JSON.stringify(value), { ex: ttlSeconds })
    } catch (error) {
      console.error('Cache set error:', error)
    }
  },

  async del(key: string) {
    try {
      await redis.del(key)
    } catch (error) {
      console.error('Cache del error:', error)
    }
  },

  async invalidatePattern(pattern: string) {
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (error) {
      console.error('Cache invalidate pattern error:', error)
    }
  }
}