import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import { createTransport } from 'nodemailer'

// Parse Upstash Redis URL and create proper connection
const upstashHost = process.env.UPSTASH_REDIS_REST_URL!.replace('https://', '')
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN!

console.log('[WORKER] Connecting to Redis host:', upstashHost)

const connection = new IORedis({
  host: upstashHost,
  port: 6379,
  password: upstashToken,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  tls: {},
})

// Create Nodemailer transporter
const transporter = createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_ID,
    pass: process.env.MAIL_PASS,
  },
})

// Create email worker
export const mailWorker = new Worker(
  'mailQueue',
  async (job) => {
    const { from, to, subject, html } = job.data

    console.log(`[WORKER] Processing email job ${job.id} for ${to}...`)

    try {
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        html,
      })

      console.log(`[WORKER] Email sent successfully to ${to}:`, info.response)
      return { success: true, messageId: info.messageId, response: info.response }
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
