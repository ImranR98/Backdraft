// Main Express server

import { app } from './app'
import { connectDB } from './db/dbConnection'
import { createTransport } from './helpers/emailHelpers'
import logger from './logger'

// Verify the DB connection and email configuration, then start the server
const startServer = async () => {
    await connectDB()
    await (await createTransport()).verify()
    app.listen(process.env.PORT || 8080, () => logger.info(`Express server launched (port ${process.env.PORT || 8080})`))
}


startServer().catch((err) => logger.error(err))