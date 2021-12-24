// Error standardization for return to client

import { MongoError } from 'mongodb'
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
    'ALREADY_VERIFIED': { httpCode: 400 },
    'NOT_VERIFIED': { httpCode: 400 },
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
        if (process.env.NODE_ENV !== 'test') logger.debug(this)
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

// Convert some MongoDB errors into client-friendly messages
const getMessageForMongoError = (err: MongoError) => {
    let message = 'MongoDB Error'
    if (err.code === 11000) {
        if ((<any>err).keyValue instanceof Object)
            if (Object.keys((<any>err).keyValue).length > 0) message = 'This ' + Object.keys((<any>err).keyValue)[0] + ' already exists.'
            else message = 'This is a duplicate entry.'
    }
    return message
}

// Get message if err is a Mongoose validation error
const getMessageForValidationError = (err: any) => {
    if (typeof err === 'object') {
        if (typeof err.errors === 'object') {
            const keys = Object.keys(err.errors)
            if (keys.length > 0)
                if (typeof err.errors[keys[0]].message === 'string') return err.errors[keys[0]].message
        }
    }
    return null
}

// Converts any input into a presentable error as best as possible
export const getPresentableError = (err: any) => {
    let error = new PresentableError()

    if (isPresentableError(err)) error = err
    else {
        if (typeof err === 'string') error.message = err
        if (err instanceof MongoError) error.message = getMessageForMongoError(err)
        const validationErrorMessage = getMessageForValidationError(err)
        if (validationErrorMessage) {
            error.httpCode = customErrors['VALIDATION_ERROR'].httpCode
            error.code = 'VALIDATION_ERROR'
            error.message = validationErrorMessage
        }
        if (err instanceof ValidateError) {
            error.httpCode = customErrors['VALIDATION_ERROR'].httpCode
            error.code = 'VALIDATION_ERROR'
            error.message = err.fields ? JSON.stringify(err.fields) : ''
        }
        if (err instanceof Error) error.message = err.message
    }

    if (process.env.NODE_ENV === 'development') logger.error(err)
    // if (process.env.NODE_ENV === 'test') { // Uncomment when needed
    //     logger.verbose(JSON.stringify(err))
    //     logger.verbose(error)
    // }

    return error
}