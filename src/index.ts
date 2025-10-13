import * as dotenv from 'dotenv'
dotenv.config()

import express, { Request, Response, Express } from 'express'
import cors from 'cors'

import authRoutes from './routes/auth.js'
import blogRoutes from './routes/blogs.js'

import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'

const app: Express = express()
const PORT = process.env.PORT || 3000
const FRONTEND_URLS = (process.env.FRONTEND_URL || '*').split(',');

app.use(
  cors({
    origin: (origin, callback) => {
      if (FRONTEND_URLS.includes('*') || !origin || FRONTEND_URLS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
  })
);

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Blog Backend API is running' })
})

app.use('/api/auth', authRoutes)
app.use('/api/blogs', blogRoutes)

app.use(errorHandler)
app.use(notFoundHandler)
app.listen(PORT)

export default app
