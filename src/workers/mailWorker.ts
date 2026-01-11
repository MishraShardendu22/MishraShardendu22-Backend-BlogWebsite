import { Worker } from 'bullmq'
import sgMail from '@sendgrid/mail'

// Parse Upstash Redis URL and create proper connection options
const upstashHost = process.env.UPSTASH_REDIS_REST_URL!.replace('https://', '')
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN!

console.log('[WORKER] Connecting to Redis host:', upstashHost)

// Pass connection options as an object - bullmq will create Redis connection internally
const connection = {
  host: upstashHost,
  port: 6379,
  password: upstashToken,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls: {},
}

// Initialize SendGrid if key present
const SENDGRID_KEY = process.env.SENDGRID_API_KEY
if (SENDGRID_KEY) {
  sgMail.setApiKey(SENDGRID_KEY)
  console.log('[WORKER] SendGrid initialized for mail worker')
} else {
  console.warn('[WORKER] SENDGRID_API_KEY not set - worker will use fallback transporter')
}

// Fallback transporter (simulated) to avoid breaking in dev
const transporter = {
  sendMail: async (mailOptions: any) => {
    console.log('[WORKER] Fallback transporter - logging mailOptions:', mailOptions)
    // Simulate email sending
    return Promise.resolve({ messageId: 'simulated-12345', response: 'Simulated send success' })
  },
}

// Create email worker
export const mailWorker = new Worker(
  'mailQueue',
  async (job) => {
    const { from, to, subject, html, text } = job.data

    console.log(`[WORKER] Processing email job ${job.id} for ${to}...`)

    try {
      if (SENDGRID_KEY) {
        const msg: any = {
          to: to,
          from: from || process.env.MAIL_ID || 'no-reply@example.com',
          subject: subject || 'Notification',
          html: html || text || '',
        }
        if (text && !html) msg.text = text

        const responses = await sgMail.send(msg)
        const response = Array.isArray(responses) ? responses[0] : responses
        console.log(`[WORKER] SendGrid response status for ${to}:`, response.statusCode)
        return { success: true, statusCode: response.statusCode, headers: response.headers }
      } else {
        const info = await transporter.sendMail({ from, to, subject, html })
        console.log(`[WORKER] Fallback send result for ${to}:`, info.response)
        return { success: true, messageId: info.messageId, response: info.response }
      }
    } catch (error) {
      console.error(`[WORKER] Failed to send email to ${to}:`, error)
      throw error // This will trigger retry
    }
  },
  {
    connection,
    concurrency: 5, // Process 5 emails at a time
    removeOnComplete: { count: 100 }, // Keep last 100 completed jobs
    removeOnFail: { count: 50 }, // Keep last 50 failed jobs
  }
)

// Worker event listeners
mailWorker.on('completed', (job) => {
  console.log(`[WORKER] ✓ Job ${job.id} completed successfully`)
})

mailWorker.on('failed', (job, err) => {
  console.error(`[WORKER] ✗ Job ${job?.id} failed:`, err.message)
})

mailWorker.on('error', (err) => {
  console.error('[WORKER] Worker error:', err)
})

console.log('[WORKER] Mail queue worker started and listening for jobs...')

export default mailWorker
