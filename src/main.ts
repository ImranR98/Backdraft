// Main Express server

import { app, ensureEnvVars, connectDB } from './connection'

ensureEnvVars()
connectDB().then(() =>
    app.listen(process.env.PORT || 8080, () => console.log(`Express server launched (port ${process.env.PORT || 8080})`))
).catch((err) => console.error(err))