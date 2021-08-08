// Express Server Configuration

// Module imports
import express from 'express'
import authRoutes from '../routes/authRoutes'
import { standardizeError } from './errors'
import { checkUser } from '../middleware/authMiddleware'
import dotenv from 'dotenv'
import helmet from 'helmet'
import logger from './logger'
import morgan from 'morgan'

// Import env. vars (assumes they exist; should have been checked on server start)
dotenv.config()

// Prepare Express app and configure middleware
const app: express.Application = express()
app.use(express.json())
app.use(checkUser) // Always add user data from the JWT, if any, to the current request
app.use(helmet()) // Helmet sets some HTTP headers that are recommended for security
if (process.env.NODE_ENV === 'production') // If in production, log requests
    app.use(morgan('combined', { stream: { write: (message) => logger.http(message.replace('\n', '')) } }))

// Import routes
app.use(authRoutes)

// Standardize any error before sending to the client
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const error = standardizeError(err)
    res.status(error.httpCode).send({ code: error.errorCode, message: error.message })
})

// Export app and connectDB for test suite to use
export { app }