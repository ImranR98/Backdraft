// Main Express server

// Module imports
import express from 'express'
import mongoose from 'mongoose'
import authRoutes from './routes/authRoutes'
import { checkUser } from './middleware/authMiddleware'
import { standardizeError } from './errors'

// Prepare Express and middleware
const app: express.Application = express()
app.use(express.json())

// Always add user data from the JWT, if any, to the current request
app.use(checkUser)

// Standardize any error before sending to the client
app.use((err: any, req: express.Request, res: express.Response) => {
    const error = standardizeError(err)
    res.status(error.httpCode).send({ code: error.errorCode, message: error.message })
})

// Import routes
app.use(authRoutes)

// Connect to DB and start server
const dbURI = 'mongodb://localhost:27017/auth'
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true }).then((result) =>
    app.listen(process.env.PORT || 8080, () => console.log(`Express server launched (port ${process.env.PORT || 8080})`))
).catch((err) => console.error(err))