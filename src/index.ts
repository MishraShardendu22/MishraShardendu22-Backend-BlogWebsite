import * as dotenv from 'dotenv'
dotenv.config()

import cors from 'cors'
import express, { Request, Response, Express } from 'express'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'

import authRoutes from './routes/auth.js'
import blogRoutes from './routes/blogs.js'

import { startCleanupJob } from './utils/scheduledJobs.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

const app: Express = express()
const PORT = process.env.PORT || 3000

// Parse and clean CORS origins
const FRONTEND_URLS = (process.env.FRONTEND_URL || '*')
  .split(',')
  .map((url) => url.trim())
  .filter((url) => url.length > 0)

console.log('🔒 CORS Configuration:')
console.log('   Allowed origins:', FRONTEND_URLS.join(', '))

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        callback(null, true)
        return
      }

      // Allow all origins if wildcard is set
      if (FRONTEND_URLS.includes('*')) {
        callback(null, true)
        return
      }

      // Check if origin is in allowed list
      if (FRONTEND_URLS.includes(origin)) {
        callback(null, true)
        return
      }

      // Log rejected origins for debugging
      console.warn(`⚠️  CORS blocked: ${origin}`)
      console.warn('   Allowed origins:', FRONTEND_URLS.join(', '))
      callback(null, false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
  })
)

// Handle OPTIONS preflight requests explicitly before other middleware
// Express 5 uses path-to-regexp v8 which requires named wildcard: {*path}
app.options('/{*path}', cors({
  origin: (origin, callback) => {
    if (!origin || FRONTEND_URLS.includes('*') || FRONTEND_URLS.includes(origin)) {
      callback(null, true)
      return
    }
    callback(null, false)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie'],
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(compression())
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'unsafe-none' },
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
})
app.use(limiter)

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Blog Backend API is running' })
})

import { Redis } from '@upstash/redis'

app.get("/redis-test", async (_req: Request, res: Response) => {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
  
  await redis.set("foo","bar");
  await redis.get("foo");
  await redis.del("foo");
  res.json({ status: 'ok', message: 'Redis test successful' })
})

app.use('/api/auth', authRoutes)
app.use('/api/blogs', blogRoutes)

app.use(errorHandler)
app.use(notFoundHandler)

// Start scheduled cleanup job (runs every hour)
startCleanupJob(60)

app.listen(PORT, () => {
  console.log(`[SERVER] Blog Backend API is running on port ${PORT}`)
  console.log(`[SERVER] Environment: ${process.env.NODE_ENV || 'development'}`)
})

export default app
