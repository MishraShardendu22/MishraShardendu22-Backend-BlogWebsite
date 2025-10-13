import { cleanExpiredOTPs } from './otpService.js'
import { db } from '../config/database.js'
import { users, otpVerification } from '../models/authSchema.js'
import { eq, lt, and } from 'drizzle-orm'

/**
 * Clean expired OTPs and unverified users
 * Run this periodically (e.g., every hour)
 */
export async function cleanupExpiredData(): Promise<void> {
  try {
    console.log('[CLEANUP] Starting cleanup job...')

    // Clean expired OTPs
    const expiredOTPs = await cleanExpiredOTPs()
    console.log(`[CLEANUP] Removed ${expiredOTPs} expired OTPs`)

    // Delete unverified users older than 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const unverifiedUsers = await db
      .delete(users)
      .where(
        and(
          eq(users.isVerified, false),
          lt(users.createdAt, twentyFourHoursAgo)
        )
      )
      .returning({ email: users.email })

    if (unverifiedUsers.length > 0) {
      console.log(`[CLEANUP] Removed ${unverifiedUsers.length} unverified users:`)
      unverifiedUsers.forEach(user => console.log(`  - ${user.email}`))
    }

    console.log('[CLEANUP] Cleanup job completed')
  } catch (error) {
    console.error('[CLEANUP] Error during cleanup:', error)
  }
}

/**
 * Start periodic cleanup job
 * @param intervalMinutes - How often to run cleanup (default: 60 minutes)
 */
export function startCleanupJob(intervalMinutes: number = 60): NodeJS.Timeout {
  console.log(`[CLEANUP] Starting periodic cleanup job (every ${intervalMinutes} minutes)`)
  
  // Run immediately on start
  cleanupExpiredData()

  // Then run at regular intervals
  return setInterval(() => {
    cleanupExpiredData()
  }, intervalMinutes * 60 * 1000)
}
