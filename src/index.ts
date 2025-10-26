import * as dotenv from 'dotenv'
dotenv.config()

import cors from 'cors'
import express, { Request, Response, Express } from 'express'

import authRoutes from './routes/auth.js'
import blogRoutes from './routes/blogs.js'

import { startCleanupJob } from './utils/scheduledJobs.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

const app: Express = express()
const PORT = process.env.PORT || 3000
const FRONTEND_URLS = (process.env.FRONTEND_URL || '*').split(',')

app.use(
  cors({
    origin: (origin, callback) => {
      if (FRONTEND_URLS.includes('*') || !origin || FRONTEND_URLS.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
  })
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

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
