// Logger configuration 

import winston from 'winston'
import dotenv from 'dotenv'

// Import env. vars (assumes they exist; should have been checked on server start)
dotenv.config()

const logger = winston.createLogger({
    transports: [
        new winston.transports.Console({
            level: ((process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') ? 'debug' : 'http'),
            stderrLevels: ['error'],
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp(),
                winston.format.simple()
            ),
            handleExceptions: true
        })
    ],
    exitOnError: false
})

export default logger