// Error standardization for return to client

import { MongoError } from 'mongodb'
import { ValidateError } from 'tsoa'
import logger from './logger'

// Define a standard error object that can be sent to client
export class PresentableError extends Error {
    httpCode: number
    code: string
    data: any

    constructor(errorNum: number = 0, data: any = undefined) {
        super()
        this.data = data
        switch (errorNum) {
            case 1:
                this.httpCode = 400 // TODO: CLEAN
                this.code = 'INVALID_ARGUMENTS'
                this.message = 'One or more arguments are missing or invalid'
                break;
            case 2:
                this.httpCode = 400
                this.code = 'INVALID_LOGIN'
                this.message = 'Email or password is invalid'
                break;
            case 3:
                this.httpCode = 401
                this.code = 'INVALID_TOKEN'
                this.message = 'Authorization token is invalid'
                break;
            case 4:
                this.httpCode = 401
                this.code = 'INVALID_REFRESH_TOKEN'
                this.message = 'Refresh token is invalid'
                break;
            case 5:
                this.httpCode = 400
                this.code = 'MISSING_USER'
                this.message = 'Specified user was not found'
                break;
            case 6:
                this.httpCode = 400
                this.code = 'MISSING_ITEM'
                this.message = 'Specified item was not found'
                break;
            case 7:
                this.httpCode = 400
                this.code = 'WRONG_PASSWORD'
                this.message = 'Password is incorrect'
                break;
            case 8:
                this.httpCode = 400
                this.code = 'INVALID_PASSWORD'
                this.message = 'Password does not fulfill requirements'
                break;
            case 9:
                this.httpCode = 400
                this.code = 'INVALID_EMAIL_VERIFICATION_TOKEN'
                this.message = 'Email verification key is invalid'
                break;
            case 10:
                this.httpCode = 400
                this.code = 'USER_ALREADY_VERIFIED'
                this.message = 'You are already verified'
                break;
            case 11:
                this.httpCode = 400
                this.code = 'USER_NOT_VERIFIED'
                this.message = 'You must verify your email first'
                break;
            case 12:
                this.httpCode = 400
                this.code = 'EMAIL_IN_USE'
                this.message = 'That email is already in use'
                break;
            case 13:
                this.httpCode = 400
                this.code = 'IS_CURRENT_EMAIL'
                this.message = 'That is your current email'
                break;
            case 14:
                this.httpCode = 400
                this.code = 'INVALID_PASSWORD_RESET_TOKEN'
                this.message = 'Password reset key is invalid'
                break;
            default:
                this.httpCode = 500
                this.code = 'GENERAL_ERROR'
                this.message = 'Something went wrong'
                break;
        }
        if (process.env.NODE_ENV !== 'test') logger.debug(this)
    }
}

// Check if a given object is a standard error
const isPresentableError = (err: any): err is PresentableError => {
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
export const getPresentableError = (err: any) => {
    if (process.env.NODE_ENV === 'development') logger.error(err)
    if (process.env.NODE_ENV === 'test') logger.verbose(err) // Uncomment if needed during testing

    if (err instanceof PresentableError) return err
    
    const error = new PresentableError()
    if (typeof err === 'string') error.message = err

    if (err instanceof MongoError) error.message = getMessageForMongoError(err, error.message)

    const validationErrorMessage = getMessageForValidationError(err)
    if (validationErrorMessage) {
        error.httpCode = 422
        error.code = 'VALIDATION_ERROR'
        error.message = validationErrorMessage
    }

    if (err instanceof ValidateError) {
        error.httpCode = 422
        error.code = 'VALIDATION_ERROR'
        error.message = 'Validation failed'
        error.data = err.fields
    }

    if (err instanceof Error) error.message = err.message
    return error
}