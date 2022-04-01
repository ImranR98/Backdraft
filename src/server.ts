// Main Express server

import { app } from './app'
import { createTransport } from './helpers/emailHelpers'
import logger from './logger'
import prisma from './db/prismaClient'

// Verify the DB connection and email configuration, then start the server
const startServer = async () => {
    await (await createTransport()).verify() // Make sure the email service works
    await prisma.$connect() // Make sure the DB is connected
    app.listen(process.env.PORT || 8080, () => logger.info(`Express server launched (port ${process.env.PORT || 8080})`))
}


startServer().catch((err) => logger.error(err))