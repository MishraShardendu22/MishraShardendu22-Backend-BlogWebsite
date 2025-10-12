import { Request, Response, NextFunction } from 'express'
import { db } from '../config/database.js'
import { session, user } from '../models/authSchema.js'
import { eq } from 'drizzle-orm'
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'mishrashardendu22@gmail.com'
export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  image: string | null
  isOwner: boolean
}
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
    }
  }
}

function getSessionToken(req: Request): string | null {
  const cookieHeader = req.headers.cookie
  if (!cookieHeader) return null
  const cookies = cookieHeader.split(';').reduce((acc: Record<string, string>, cookie: string) => {
    const [key, value] = cookie.trim().split('=')
    acc[key] = value
    return acc
  }, {} as Record<string, string>)
  const sessionCookie = cookies['better-auth.session_token']
  if (!sessionCookie) return null
  const baseToken = sessionCookie.split('.')[0]
  return baseToken
}

async function getAuthenticatedUser(req: Request): Promise<AuthenticatedUser | null> {
  try {
    const token = getSessionToken(req)
    if (!token) return null
    const [sessionData] = await db
      .select({
        userId: session.userId,
        expiresAt: session.expiresAt,
        email: user.email,
        name: user.name,
        image: user.image,
        id: user.id,
      })
      .from(session)
      .innerJoin(user, eq(session.userId, user.id))
      .where(eq(session.token, token))
      .limit(1)
    if (!sessionData) return null
    if (new Date(sessionData.expiresAt) < new Date()) {
      return null
    }
    return {
      id: sessionData.id,
      email: sessionData.email,
      name: sessionData.name,
      image: sessionData.image,
      isOwner: sessionData.email === OWNER_EMAIL,
    }
  } catch (error) {
    console.error('Error verifying session:', error)
    return null
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }
    req.user = user
    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export async function requireOwner(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }
    if (!user.isOwner) {
      res.status(403).json({ success: false, error: 'Forbidden - Owner access required' })
      return
    }
    req.user = user
    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getAuthenticatedUser(req)
    if (user) {
      req.user = user
    }
    next()
  } catch (error) {
    console.error('Optional auth middleware error:', error)
    next()
  }
}
