// Various helper functions that don't fit elsewhere

import { mongo } from 'mongoose'
import https from 'https'

const modifyError = (err: any) => {
    console.log(err)
    if (typeof err === 'string') return err
    if (err instanceof mongo.MongoError) {
        let message = 'Something went wrong.'
        if (err.code === 11000) {
            if ((<any>err).keyValue instanceof Object)
                if (Object.keys((<any>err).keyValue).length > 0) message = 'This ' + Object.keys((<any>err).keyValue)[0] + ' already exists.'
                else message = 'This is a duplicate entry.'
        }
        return message
    }
    if (err instanceof Error) return err.message
    return err
}

const simpleHttpGet = (url: string) => {
    return new Promise((resolve, reject) => {
        https.get(url, (resp) => {
            let data = ''
            resp.on('data', (chunk) => {
                data += chunk
            })
            resp.on('end', () => {
                resolve(JSON.parse(data))
            })
        }).on("error", (err) => {
            reject(err)
        })
    })
}

export { modifyError, simpleHttpGet }