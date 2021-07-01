// Error handling code

import { MongoError } from 'mongodb'

class StandardError {
    httpCode: number
    errorCode: string
    message: string

    constructor(responseCode: number = 400, errorCode: string = 'GENERAL_ERROR', message: string = 'Something went wrong') {
        this.httpCode = responseCode
        this.errorCode = errorCode
        this.message = message
    }
}

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

const getMessageForMongoError = (err: MongoError, defaultMessage: string) => {
    let message = defaultMessage
    if (err.code === 11000) {
        if ((<any>err).keyValue instanceof Object)
            if (Object.keys((<any>err).keyValue).length > 0) message = 'This ' + Object.keys((<any>err).keyValue)[0] + ' already exists.'
            else message = 'This is a duplicate entry.'
    }
    return message
}

const standardizeError = (err: any) => {
    console.error(err)
    if (err instanceof StandardError) return err
    const error = new StandardError()
    if (typeof err === 'string') error.message = err
    if (err instanceof MongoError) error.message = getMessageForMongoError(err, error.message)
    return error
}

export { StandardError, standardizeError }