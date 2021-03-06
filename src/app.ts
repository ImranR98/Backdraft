// Express server app configuration

// Import and prepare env. vars. before anything else
import { ensureEnvVars } from './environment'
ensureEnvVars()

// Module imports
import express from 'express'
import { getPresentableError } from './helpers/clientErrorHelper'
import helmet from 'helmet'
import logger from './logger'
import morgan from 'morgan'
import { RegisterRoutes } from './routes/routes'
import swaggerUi from 'swagger-ui-express'

import swaggerDoc from './routes/swagger.json'

// Prepare Express app and configure middleware
const app: express.Application = express()
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(helmet()) // Helmet sets some HTTP headers that are recommended for security
if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') // If in production, log requests
    app.use(morgan('combined', { stream: { write: (message) => logger.http(message.replace('\n', '')) } }))
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc))

// Import routes
RegisterRoutes(app)

// Standardize any error before sending to the client
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const error = getPresentableError(err)
    res.status(error.httpCode).send({ code: error.code, message: error.message })
})

// Export app and connectDB for test suite to use
export { app }