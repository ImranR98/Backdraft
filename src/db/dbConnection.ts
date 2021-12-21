// DB Connection functions

// Module imports
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

// Connects to DB or test DB
export const connectDB = async () => {
    if (process.env.NODE_ENV === 'test')
        await mongoose.connect((await MongoMemoryServer.create()).getUri())
    else
        await mongoose.connect(process.env.DB_CONN_STRING)
}

// Manual DB disconnect
export const disconnectDB = async () => await mongoose.disconnect()