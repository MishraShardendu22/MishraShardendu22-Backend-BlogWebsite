import * as dotenv from 'dotenv'
dotenv.config()

import express, { Request, Response, Express } from 'express'
import cors from 'cors'

import authRoutes from './routes/auth.js'
import blogRoutes from './routes/blogs.js'

import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

const app: Express = express()
const PORT = process.env.PORT || 3000
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4321'

app.use(
  cors({
    origin: FRONTEND_URL,
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

app.use('/api/auth', authRoutes)
app.use('/api/blogs', blogRoutes)

app.use(errorHandler)
app.use(notFoundHandler)

// Start server
app.listen(PORT, () => {
  console.log(`Blog Backend API running on http://localhost:${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`CORS enabled for: ${FRONTEND_URL}`)
  console.log(`Blog Backend API running on http://localhost:${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`CORS enabled for: ${FRONTEND_URL}`)
})

export default app
