import { cleanExpiredOTPs } from './otpService.js'
import { db } from '../config/database.js'
import { users } from '../models/authSchema.js'
import { eq, lt, and } from 'drizzle-orm'

export async function cleanupExpiredData(): Promise<void> {
  try {
    console.log('[CLEANUP] Starting cleanup job...')

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    const [_, unverifiedUsers] = await Promise.all([
      cleanExpiredOTPs(),
      db
        .delete(users)
        .where(
          and(
            eq(users.isVerified, false),
            lt(users.createdAt, twentyFourHoursAgo)
          )
        )
        .returning({ email: users.email })
    ])

    if (unverifiedUsers.length > 0) {
      console.log(`[CLEANUP] Removed ${unverifiedUsers.length} unverified users:`)
      unverifiedUsers.forEach(user => console.log(`  - ${user.email}`))
    }

    console.log('[CLEANUP] Cleanup job completed')
  } catch (error) {
    console.error('[CLEANUP] Error during cleanup:', error)
  }
}


export function startCleanupJob(intervalMinutes: number = 60): NodeJS.Timeout {
  cleanupExpiredData()

  return setInterval(() => {
    cleanupExpiredData()
  }, intervalMinutes * 60 * 1000)
}
