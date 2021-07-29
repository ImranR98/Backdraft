// Main Express server

import { app, ensureEnvVars, connectDB } from './connection'
import logger from './logger'

ensureEnvVars()
connectDB().then(() =>
    app.listen(process.env.PORT || 8080, () => logger.info(`Express server launched (port ${process.env.PORT || 8080})`))
).catch((err) => logger.error(err))