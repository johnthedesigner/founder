import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { healthRouter } from './api/health'
import { authRouter } from './api/auth'
import { projectsRouter } from './api/projects'
import { projectExportRouter, agentRouter } from './api/generate'

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(
    cors({
      origin: process.env.FRONTEND_URL,
      credentials: true,
    }),
  )
  app.use(express.json())
  app.use(cookieParser())

  app.use('/health', healthRouter)
  app.use('/auth', authRouter)
  app.use('/projects', projectsRouter)
  app.use('/projects', projectExportRouter)
  app.use('/api/v1/systems', agentRouter)

  return app
}
