// Main Express server

import { app } from './express'
import { connectDB } from './db'
import { ensureEnvVars } from './validation'
import { createTransport } from './email'
import logger from './logger'

// Verify the environment variables, DB connection, and email configuration, then start the server
const startServer = async () => {
    ensureEnvVars()
    await connectDB()
    await (await createTransport()).verify()
    app.listen(process.env.PORT || 8080, () => logger.info(`Express server launched (port ${process.env.PORT || 8080})`))
}


startServer().catch((err) => logger.error(err))