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
    if (!process.env.MAIL_ID || !process.env.SENDGRID_API_KEY) {
      console.error('[EMAIL] Missing MAIL_ID or SENDGRID_API_KEY environment variables')
      return false
    }

    // Nodemailer transporter setup with SendGrid SMTP
    const transporter = createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
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
