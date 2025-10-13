import { createTransport } from 'nodemailer'
import { EmailTemplate } from './emailTemplate.js'

interface SendEmailParams {
  to_email: string
  to_name: string
  otp: string
}

export const sendOTPEmail = async ({ to_email, to_name, otp }: SendEmailParams): Promise<boolean> => {
  try {
    console.log('[EMAIL] Initializing email transporter...')

    // Validate required environment variables
    if (!process.env.MAIL_ID || !process.env.MAIL_PASS) {
      console.error('[EMAIL] Missing MAIL_ID or MAIL_PASS environment variables')
      return false
    }

    // Nodemailer transporter setup
    const transporter = createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_ID,
        pass: process.env.MAIL_PASS,
      },
    })

    console.log('[EMAIL] Generating email template...')

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
      from: process.env.MAIL_ID,
      to: to_email,
      subject: `Verification Code for ${to_name}`,
      html: emailBody,
    }

    console.log(`[EMAIL] Sending OTP email to ${to_email}...`)

    // Send the email
    const info = await transporter.sendMail(mailOptions)
    console.log('[EMAIL] Email sent successfully:', info.response)
    return true
  } catch (error) {
    console.error('[EMAIL] Error while sending email:', error)
    return false
  }
}
