// Main Express server

import { app } from './express'
import { connectDB } from './db'
import { ensureEnvVars } from './validation'
import { createTransport } from './email'
import logger from './logger'

ensureEnvVars()
connectDB().then(() => {
    createTransport().then((transporter) => {
        transporter.verify().then(() =>
            app.listen(process.env.PORT || 8080, () => logger.info(`Express server launched (port ${process.env.PORT || 8080})`))
        )
    })
}).catch((err) => logger.error(err))