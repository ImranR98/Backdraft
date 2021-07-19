// Main Express server

// Module imports
import express from 'express'
import authRoutes from './routes/authRoutes'
import { checkUser } from './middleware/authMiddleware'
import { standardizeError } from './errors'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { Mockgoose } from 'mockgoose'

// Load environment variables from .env if it exists
dotenv.config()

// List required env. vars. and ensure they exist
const envRequirements = ['JWT_KEY', 'DB_CONN_STRING']

// Prepare Express and middleware
const app: express.Application = express()
app.use(express.json())

// Always add user data from the JWT, if any, to the current request
app.use(checkUser)

// Import routes
app.use(authRoutes)

// Standardize any error before sending to the client
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const error = standardizeError(err)
    res.status(error.httpCode).send({ code: error.errorCode, message: error.message })
})

// Ensure required environment variables exist

let envValid = true
for (let i = 0; i < envRequirements.length && envValid; i++) {
    if (typeof process.env[envRequirements[i]] !== 'string') envValid = false
    else if (process.env[envRequirements[i]]?.length === 0) envValid = false
}
if (!envValid) {
    console.error('One or more environment variables are missing!')
    process.exit()
}

// Function to connect to DB or test DB
const connectDB = async () => {
    if (process.env.NODE_ENV === 'test') {
        const mockgoose = new Mockgoose(mongoose);
        await mockgoose.prepareStorage()
    }
    await mongoose.connect(process.env.DB_CONN_STRING || '', { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true })
}

// Connect to DB and start server
connectDB().then(() =>
    app.listen(process.env.PORT || 8080, () => console.log(`Express server launched (port ${process.env.PORT || 8080})`))
).catch((err) => console.error(err))

// Export app and connectDB for test suite to use
export { app, connectDB }