// Main Express server

// Module imports
import express from 'express'
import mongoose from 'mongoose'
import routes from './routes'
import { checkUser } from './middleware/authMiddleware'

// Prepare Express and middleware
const app: express.Application = express()
app.use(express.json())

// Always add user data from the JWT, if any, to the current request
app.use(checkUser)

// Import routes
app.use(routes)

// Connect to DB and start server
const dbURI = 'mongodb://localhost:27017/auth'
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true }).then((result) =>
    app.listen(process.env.PORT || 8080, () => console.log(`Express server launched (port ${process.env.PORT || 8080})`))
).catch((err) => console.log(err))