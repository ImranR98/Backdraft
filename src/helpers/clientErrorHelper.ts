// Error standardization for return to client

import { PrismaClientValidationError } from '@prisma/client/runtime'
import { ValidateError } from 'tsoa'
import { ClientErrorInterface } from '../interfaces/ClientErrorInterface'
import logger from '../logger'

// Define custom errors thrown by various functions in the backend
const customErrors = {
    'SERVER_ERROR': { httpCode: 500 },
    'INVALID_LOGIN': { httpCode: 400 },
    'INVALID_ACCESS_TOKEN': { httpCode: 401 },
    'INVALID_REFRESH_TOKEN': { httpCode: 401 },
    'INVALID_TOKEN': { httpCode: 400 },
    'USER_NOT_FOUND': { httpCode: 400 },
    'ITEM_NOT_FOUND': { httpCode: 400 },
    'WRONG_PASSWORD': { httpCode: 400 },
    'INVALID_PASSWORD': { httpCode: 400 },
    'EMAIL_IN_USE': { httpCode: 400 },
    'EMAIL_ALREADY_SET': { httpCode: 400 },
    'VALIDATION_ERROR': { httpCode: 422 },
}
export type customErrorCode = keyof typeof customErrors

// Define a standard error object that can be sent to client
export class PresentableError extends Error implements ClientErrorInterface {
    httpCode: number
    code: customErrorCode

    constructor(customErrorCode: customErrorCode = 'SERVER_ERROR', message?: string) {
        super()
        this.code = customErrorCode
        this.httpCode = customErrors[customErrorCode].httpCode
        this.message = message || ''
    }
}

// Check if a given object is a standard error
const isPresentableError = (err: any): err is PresentableError => {
    if (typeof err !== 'object') return false
    const keys = Object.keys(err)
    if (!(
        keys.includes('httpCode') &&
        keys.includes('code')
    )) return false
    if (!(
        typeof err['httpCode'] === 'number' &&
        typeof err['code'] === 'string' &&
        Object.keys(customErrors).indexOf(err['code']) !== -1 &&
        (typeof err['message'] === 'string' || typeof err['message'] === 'undefined')
    )) return false
    return true
}

// Converts any input into a presentable error as best as possible
export const getPresentableError = (err: any) => {
    let error = new PresentableError()

    if (isPresentableError(err)) error = err
    else {
        if (typeof err === 'string') error.message = err
        if (typeof err?.meta?.cause === 'string') {
            if (err?.code === 'P2025') {
                error.httpCode = customErrors['ITEM_NOT_FOUND'].httpCode
                error.code = 'ITEM_NOT_FOUND'
            } else {
                error.httpCode = customErrors['VALIDATION_ERROR'].httpCode
                error.code = 'VALIDATION_ERROR'
            }
        }
        if (err instanceof ValidateError) {
            error.httpCode = customErrors['VALIDATION_ERROR'].httpCode
            error.code = 'VALIDATION_ERROR'
            error.message = err.fields ? JSON.stringify(err.fields) : ''
        }
        if (err instanceof Error) error.message = err.message
    }

    if (process.env.NODE_ENV === 'development') { // Show original error in development
        try {
            logger.error(JSON.stringify(err))
        } catch (e) {
            logger.error(err)
        }
    }
    if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') { // Show only client error in production
        logger.debug(JSON.stringify(error))
    }
    // if (process.env.NODE_ENV === 'test') { // Uncomment when needed
    //     logger.verbose(JSON.stringify(err))
    //     logger.verbose(JSON.stringify(error))
    // }

    return error
}