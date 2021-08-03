// DB Connection functions

// Module imports
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

// Import env. vars (assumes they exist; should have been checked on server start)
dotenv.config()

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
export { connectDB, disconnectDB }