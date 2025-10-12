import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import * as authSchema from '../models/authSchema.js'
import { db } from './database.js'
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET!,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: authSchema,
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      prompt: 'select_account',
      accessType: 'offline',
    },
  },
  emailAndPassword: { enabled: false },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    freshAge: 60 * 5,
    disableSessionRefresh: false,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  callbacks: {
    session: async ({ session, user }: { session: unknown; user: unknown }) => {
      const sessionData = session as Record<string, unknown>
      const userData = user as { id: string; name: string; email: string; image?: string }
      return {
        ...sessionData,
        user: {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          image: userData.image,
        },
      }
    },
  },
})
