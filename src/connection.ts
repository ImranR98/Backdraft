// Express Server Configuration and DB Connection

// Module imports
import express from 'express'
import authRoutes from './routes/authRoutes'
import { checkUser } from './middleware/authMiddleware'
import { standardizeError } from './errors'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import helmet from 'helmet'
import morgan from 'morgan'

// Prepare Express and middleware
const app: express.Application = express()
app.use(express.json())
app.use(checkUser) // Always add user data from the JWT, if any, to the current request
app.use(helmet())

if (process.env.NODE_ENV === 'production') app.use(morgan('combined')) // Log requests in production

// Import routes
app.use(authRoutes)

// Standardize any error before sending to the client
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const error = standardizeError(err)
    res.status(error.httpCode).send({ code: error.errorCode, message: error.message })
})

// Ensures required environment variables exist
const ensureEnvVars = () => {
    const envRequirements = ['JWT_KEY', 'DB_CONN_STRING']
    dotenv.config()
    let envValid = true
    for (let i = 0; i < envRequirements.length && envValid; i++) {
        if (typeof process.env[envRequirements[i]] !== 'string') envValid = false
        else if (process.env[envRequirements[i]]?.length === 0) envValid = false
    }
    if (!envValid) throw 'One or more environment variables are missing!'
}

// Connects to DB or test DB
const connectDB = async () => {
    if (process.env.NODE_ENV === 'test')
        await mongoose.connect((await MongoMemoryServer.create()).getUri(), { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true })
    else
        await mongoose.connect(process.env.DB_CONN_STRING || '', { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true })
}

// Manual DB disconnect
const disconnectDB = async () => await mongoose.disconnect()

// Export app and connectDB for test suite to use
export { app, ensureEnvVars, connectDB, disconnectDB }