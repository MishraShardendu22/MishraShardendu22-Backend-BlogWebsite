import { Router, Request, Response, IRouter } from 'express'
import bcrypt from 'bcryptjs'
import { db } from '../config/database.js'
import { users } from '../models/authSchema.js'
import { generateToken } from '../config/auth.js'
import { eq } from 'drizzle-orm'
import { generateOTP, storeOTP, verifyOTP } from '../utils/otpService.js'
import { sendOTPEmail } from '../utils/emailService.js'

const router: IRouter = Router()

const OWNER_EMAIL = process.env.OWNER_EMAIL || 'mishrashardendu22@gmail.com'

// Register endpoint
router.post('/register', async (req: Request, res: Response) => {
  try {
  const { email, password, name } = req.body

  let profileImage = req.body.profileImage

    if (!email || !password || !name ) {
      res.status(400).json({ success: false, error: 'Email, password, and name are required' })
      return
    }

    if (!profileImage) {
      const seed = Math.random()
      profileImage = `https://api.dicebear.com/9.x/lorelei/webp?seed=${seed}&flip=true`
    }


    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      res.status(400).json({ success: false, error: 'Invalid email format' })
      return
    }

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existingUser) {
      res.status(400).json({ success: false, error: 'User already exists' })
      return
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user (unverified by default)
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        name,
        profileImage: profileImage,
        isVerified: false,
      })
      .returning()

    // Generate and store OTP
    const otp = generateOTP()
    const otpStored = await storeOTP(email, otp)

    if (!otpStored) {
      res.status(500).json({ success: false, error: 'Failed to generate OTP' })
      return
    }

    // Send OTP email
    const emailSent = await sendOTPEmail({
      to_email: email,
      to_name: name,
      otp,
    })

    if (!emailSent) {
      console.error('[AUTH] Failed to send OTP email')
      // Continue anyway, user can request resend
    }

    // Generate token
    const token = generateToken({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      isOwner: newUser.email === OWNER_EMAIL,
    })

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email with the OTP sent.',
      data: {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          profileImage: newUser.profileImage || null,
          isVerified: newUser.isVerified,
          isOwner: newUser.email === OWNER_EMAIL,
        },
      },
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' })
      return
    }

    // Find user
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        profileImage: users.profileImage,
        password: users.password,
        isVerified: users.isVerified,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid credentials' })
      return
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      res.status(401).json({ success: false, error: 'Invalid credentials' })
      return
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      isOwner: user.email === OWNER_EMAIL,
    })

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          profileImage: user.profileImage,
          isVerified: user.isVerified,
          isOwner: user.email === OWNER_EMAIL,
        },
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Get current user endpoint
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'No token provided' })
      return
    }

    const token = authHeader.substring(7)
    const { verifyToken } = await import('../config/auth.js')
    const payload = verifyToken(token)

    if (!payload) {
      res.status(401).json({ success: false, error: 'Invalid token' })
      return
    }

    // Fetch fresh user data
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        profileImage: users.profileImage,
        isVerified: users.isVerified,
      })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1)

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' })
      return
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          profileImage: user.profileImage,
          isVerified: user.isVerified,
          isOwner: user.email === OWNER_EMAIL,
        },
      },
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Verify OTP endpoint
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body

    if (!email || !otp) {
      res.status(400).json({ success: false, error: 'Email and OTP are required' })
      return
    }

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' })
      return
    }

    // Check if already verified
    if (user.isVerified) {
      res.status(400).json({ success: false, error: 'User already verified' })
      return
    }

    // Verify OTP
    const isValid = await verifyOTP(email, otp)

    if (!isValid) {
      res.status(400).json({ success: false, error: 'Invalid or expired OTP' })
      return
    }

    // Update user verification status
    const [updatedUser] = await db
      .update(users)
      .set({ isVerified: true, updatedAt: new Date() })
      .where(eq(users.email, email))
      .returning()

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          isVerified: updatedUser.isVerified,
          isOwner: updatedUser.email === OWNER_EMAIL,
        },
      },
    })
  } catch (error) {
    console.error('Verify OTP error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Resend OTP endpoint
router.post('/resend-otp', async (req: Request, res: Response) => {
  try {
    const { email } = req.body

    if (!email) {
      res.status(400).json({ success: false, error: 'Email is required' })
      return
    }

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' })
      return
    }

    // Check if already verified
    if (user.isVerified) {
      res.status(400).json({ success: false, error: 'User already verified' })
      return
    }

    // Generate and store new OTP
    const otp = generateOTP()
    const otpStored = await storeOTP(email, otp)

    if (!otpStored) {
      res.status(500).json({ success: false, error: 'Failed to generate OTP' })
      return
    }

    // Send OTP email
    const emailSent = await sendOTPEmail({
      to_email: email,
      to_name: user.name,
      otp,
    })

    if (!emailSent) {
      res.status(500).json({ success: false, error: 'Failed to send OTP email' })
      return
    }

    res.json({
      success: true,
      message: 'OTP sent successfully',
    })
  } catch (error) {
    console.error('Resend OTP error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
