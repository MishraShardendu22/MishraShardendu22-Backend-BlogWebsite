import sgMail from '@sendgrid/mail'
import { EmailTemplate } from './emailTemplate.js'

interface SendEmailParams {
  to_email: string
  to_name: string
  otp: string
}

export const sendOTPEmail = async ({ to_email, to_name, otp }: SendEmailParams): Promise<boolean> => {
  try {
    console.log('[EMAIL] Initializing SendGrid...')

    if (!process.env.MAIL_ID || !process.env.SENDGRID_API_KEY) {
      console.error('[EMAIL] Missing MAIL_ID or SENDGRID_API_KEY environment variables')
      return false
    }

    // Set SendGrid API key
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)

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

    const msg = {
      to: to_email,
      from: process.env.MAIL_ID, // Use verified sender
      subject: `Verification Code for ${to_name}`,
      html: emailBody,
    }

    console.log(`[EMAIL] Sending OTP email to ${to_email}...`)

    // Send the email using SendGrid
    await sgMail.send(msg)
    console.log('[EMAIL] Email sent successfully via SendGrid')
    return true
  } catch (error) {
    console.error('[EMAIL] Error while sending email:', error)
    if (error && typeof error === 'object' && 'response' in error) {
      const sgError = error as { response?: { body?: unknown } }
      console.error('[EMAIL] SendGrid error details:', sgError.response?.body)
    }
    return false
  }
}
