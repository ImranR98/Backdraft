// Main Express server

import { app } from './funcs/express'
import { connectDB } from './funcs/dbConnection'
import { ensureEnvVars } from './funcs/validators'
import { createTransport } from './funcs/emailer'
import logger from './funcs/logger'

// Verify the environment variables, DB connection, and email configuration, then start the server
const startServer = async () => {
    ensureEnvVars()
    await connectDB()
    await (await createTransport()).verify()
    app.listen(process.env.PORT || 8080, () => logger.info(`Express server launched (port ${process.env.PORT || 8080})`))
}


startServer().catch((err) => logger.error(err))