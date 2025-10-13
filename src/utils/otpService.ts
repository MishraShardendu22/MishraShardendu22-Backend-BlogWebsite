import bcrypt from 'bcryptjs'
import { db } from '../config/database.js'
import { otpVerification } from '../models/authSchema.js'
import { eq, lt } from 'drizzle-orm'

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '10')

/**
 * Generate a 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Store OTP in database with expiration
 */
export async function storeOTP(email: string, otp: string): Promise<boolean> {
  try {
    const otpHash = await bcrypt.hash(otp, 10)
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

    // Delete any existing OTP for this email
    await db.delete(otpVerification).where(eq(otpVerification.email, email))

    // Insert new OTP
    await db.insert(otpVerification).values({
      email,
      otpHash,
      expiresAt,
    })

    console.log(`[OTP] Stored OTP for ${email}, expires at ${expiresAt}`)
    return true
  } catch (error) {
    console.error('[OTP] Error storing OTP:', error)
    return false
  }
}

/**
 * Verify OTP and check expiration
 */
export async function verifyOTP(email: string, otp: string): Promise<boolean> {
  try {
    const [record] = await db
      .select()
      .from(otpVerification)
      .where(eq(otpVerification.email, email))
      .limit(1)

    if (!record) {
      console.log(`[OTP] No OTP record found for ${email}`)
      return false
    }

    // Check expiration
    if (new Date() > record.expiresAt) {
      console.log(`[OTP] OTP expired for ${email}`)
      await db.delete(otpVerification).where(eq(otpVerification.email, email))
      return false
    }

    // Verify OTP hash
    const isValid = await bcrypt.compare(otp, record.otpHash)

    if (isValid) {
      console.log(`[OTP] Valid OTP for ${email}`)
      // Delete the OTP after successful verification
      await db.delete(otpVerification).where(eq(otpVerification.email, email))
    } else {
      console.log(`[OTP] Invalid OTP for ${email}`)
    }

    return isValid
  } catch (error) {
    console.error('[OTP] Error verifying OTP:', error)
    return false
  }
}

/**
 * Clean up expired OTPs (should be run periodically)
 */
export async function cleanExpiredOTPs(): Promise<number> {
  try {
    const result = await db
      .delete(otpVerification)
      .where(lt(otpVerification.expiresAt, new Date()))
      .returning()

    console.log(`[OTP] Cleaned up ${result.length} expired OTPs`)
    return result.length
  } catch (error) {
    console.error('[OTP] Error cleaning expired OTPs:', error)
    return 0
  }
}

/**
 * Delete OTP for a specific email
 */
export async function deleteOTP(email: string): Promise<boolean> {
  try {
    await db.delete(otpVerification).where(eq(otpVerification.email, email))
    console.log(`[OTP] Deleted OTP for ${email}`)
    return true
  } catch (error) {
    console.error('[OTP] Error deleting OTP:', error)
    return false
  }
}
