import nodemailer from 'nodemailer'
import { EmailTemplate } from './emailTemplate.js'

interface SendEmailParams {
  to_email: string
  to_name: string
  otp: string
}

// Create reusable transporter (Gmail SMTP)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_ID,
    pass: process.env.MAIL_PASS,
  }
})

// Verify transporter configuration
transporter.verify((error: Error | null, success: any) => {
  if (error) {
    console.error('[EMAIL] Transporter verification failed:', error)
  } else {
    console.log('[EMAIL] Email service is ready')
  }
})

/**
 * Send OTP email directly (synchronous)
 */
export const sendOTPEmail = async ({ to_email, to_name, otp }: SendEmailParams): Promise<boolean> => {
  try {
    console.log(`[EMAIL] Sending OTP email to ${to_email}...`)

    // Validate required environment variables
    if (!process.env.MAIL_ID || !process.env.MAIL_PASS) {
      console.error('[EMAIL] Missing email credentials')
      return false
    }

    // Generate email body
    const emailBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>OTP Verification</title>
        </head>
        <body>
          ${EmailTemplate({ to_name, otp })}
        </body>
      </html>
    `

    const mailOptions = {
      from: `"Blog Platform" <${process.env.MAIL_ID}>`,
      to: to_email,
      subject: `Verification Code for ${to_name}`,
      html: emailBody,
    }

    // Send email directly
    const info = await transporter.sendMail(mailOptions)
    
    console.log('[EMAIL] Email sent successfully:', info.messageId)
    return true
  } catch (error) {
    console.error('[EMAIL] Error sending email:', error)
    return false
  }
}
