import { Request, Response, NextFunction } from 'express'
export interface ApiError extends Error {
  statusCode?: number
}
export function errorHandler(err: ApiError, _req: Request, res: Response, _next: NextFunction): void {
  console.error('Error:', err)
  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal server error'
  res.status(statusCode).json({
    success: false,
    error: message,
  })
}
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  })
}
