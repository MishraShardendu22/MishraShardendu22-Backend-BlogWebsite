import { Request, Response, NextFunction } from 'express'
import { db } from '../config/database.js'
import { users } from '../models/authSchema.js'
import { verifyToken } from '../config/auth.js'
import { eq } from 'drizzle-orm'

const OWNER_EMAIL = process.env.OWNER_EMAIL! 

export interface AuthenticatedUser {
  id: number
  email: string
  name: string
  isOwner: boolean
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
    }
  }
}

function getTokenFromHeader(req: Request): string | null {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

async function getAuthenticatedUser(req: Request): Promise<AuthenticatedUser | null> {
  try {
    const token = getTokenFromHeader(req)
    if (!token) return null

    const payload = verifyToken(token)
    if (!payload) return null

    // Verify user still exists
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1)

    if (!user) return null

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isOwner: user.email === OWNER_EMAIL,
    }
  } catch (error) {
    console.error('Error verifying token:', error)
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
