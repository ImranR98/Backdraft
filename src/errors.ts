// Error standardization code

import { MongoError } from 'mongodb'

// Define a standard error object that can be sent to client
class StandardError {
    httpCode: number
    errorCode: string
    message: string
    data: any

    constructor(errorNum: number = 0, data: any = undefined) {
        this.data = data
        switch (errorNum) {
            case 1:
                this.httpCode = 400
                this.errorCode = 'INVALID_ARGUMENTS'
                this.message = 'One or more arguments are missing or invalid'
                break;
            case 2:
                this.httpCode = 401
                this.errorCode = 'INVALID_LOGIN'
                this.message = 'Email or password is invalid'
                break;
            case 3:
                this.httpCode = 401
                this.errorCode = 'INVALID_TOKEN'
                this.message = 'Authorization token is invalid'
                break;
            case 4:
                this.httpCode = 401
                this.errorCode = 'INVALID_REFRESH_TOKEN'
                this.message = 'Refresh token is invalid'
                break;
            case 5:
                this.httpCode = 400
                this.errorCode = 'MISSING_USER'
                this.message = 'Specified user was not found'
                break;
            case 6:
                this.httpCode = 400
                this.errorCode = 'MISSING_ITEM'
                this.message = 'Specified item was not found'
                break;
            case 7:
                this.httpCode = 401
                this.errorCode = 'WRONG_PASSWORD'
                this.message = 'Password is incorrect'
                break;
            case 8:
                this.httpCode = 401
                this.errorCode = 'INVALID_PASSWORD'
                this.message = 'Password does not fulfill requirements'
                break;
            default:
                this.httpCode = 400
                this.errorCode = 'GENERAL_ERROR'
                this.message = 'Something went wrong'
                break;
        }
    }
}

// Check if a given object is a standard error
const isStandardError = (err: any): err is StandardError => {
    if (typeof err !== 'object') return false
    const keys = Object.keys(err)
    if (!(
        keys.includes('responseCode') &&
        keys.includes('errorCode') &&
        keys.includes('message') &&
        keys.length === 3
    )) return false
    if (!(
        typeof err['responseCode'] === 'number' &&
        typeof err['errorCode'] === 'string' &&
        typeof err['message'] === 'string'
    )) return false
    return true
}

// Convert some MongoDB errors into client-friendly messages
const getMessageForMongoError = (err: MongoError, defaultMessage: string) => {
    let message = defaultMessage
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

// Converts any input into a standard error as best as possible
const standardizeError = (err: any) => {
    if (process.env.NODE_ENV !== 'test') console.error(err)
    if (err instanceof StandardError) return err
    const error = new StandardError()
    if (typeof err === 'string') error.message = err
    if (err instanceof MongoError) error.message = getMessageForMongoError(err, error.message)
    const validationErrorMessage = getMessageForValidationError(err)
    if (validationErrorMessage) {
        error.errorCode = 'VALIDATION_ERROR'
        error.message = validationErrorMessage
    }
    return error
}

export { StandardError, standardizeError }