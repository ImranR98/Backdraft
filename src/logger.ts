// Winston logger 

import winston from 'winston'

const logger = winston.createLogger({
    transports: [
        new winston.transports.Console({
            level: process.env.NODE_ENV === 'development' ? 'debug' : process.env.NODE_ENV === 'test' ? 'verbose' : 'http',
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