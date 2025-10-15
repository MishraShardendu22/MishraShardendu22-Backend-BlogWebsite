import sgMail from '@sendgrid/mail'
import { EmailTemplate } from './emailTemplate.js'

interface SendEmailParams {
  to_email: string
  to_name: string
  otp: string
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '')

export const sendOTPEmail = async ({ to_email, to_name, otp }: SendEmailParams): Promise<boolean> => {
  try {
    console.log(`[EMAIL] Sending OTP email to ${to_email} using SendGrid...`)

    if (!process.env.SENDGRID_API_KEY) {
      console.error('[EMAIL] Missing SENDGRID_API_KEY')
      return false
    }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>OTP Verification</title></head><body>${EmailTemplate({ to_name, otp })}</body></html>`

    const msg = {
      to: to_email,
      from: process.env.MAIL_ID || 'no-reply@example.com',
      subject: `Verification Code for ${to_name}`,
      text: `Your verification code is ${otp}`,
      html,
    }

    const [response] = await sgMail.send(msg)
    console.log('[EMAIL] Email sent:', response.statusCode)
    return true
  } catch (error) {
    console.error('[EMAIL] Error sending email via SendGrid:', error)
    return false
  }
}
