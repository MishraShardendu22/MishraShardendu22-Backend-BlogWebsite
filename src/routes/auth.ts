import { Router, Request, Response, IRouter } from 'express'
import { auth } from '../config/auth.js'

const router: IRouter = Router()

router.all('*', async (req: Request, res: Response) => {
  try {
    const protocol = req.protocol
    const host = req.get('host')
    const fullUrl = `${protocol}://${host}${req.originalUrl}`
    

    const headers: Record<string, string> = {}
    Object.keys(req.headers).forEach((key) => {
      const value = req.headers[key]
      if (typeof value === 'string') {
        headers[key] = value
      } else if (Array.isArray(value)) {
        headers[key] = value.join(', ')
      }
    })
    
    const webRequest = new Request(fullUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    })
    
    const response = await auth.handler(webRequest)
    response.headers.forEach((value: string, key: string) => {
      res.setHeader(key, value)
    })
    
    res.status(response.status)
    
    if (response.body) {
      const reader = response.body.getReader()
      const chunks: Uint8Array[] = []
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }
      
      const body = Buffer.concat(chunks)
      res.send(body)
    } else {
      res.end()
    }
  } catch (error) {
    console.error('Auth error:', error)
    res.status(500).json({ success: false, error: 'Authentication error' })
  }
})

export default router
