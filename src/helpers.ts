// Various helper functions that don't fit elsewhere

import { mongo } from "mongoose"

const standardizeIfMongoError = (err: any) => {
    if (err instanceof mongo.MongoError) {
        console.log(err)
        let message = 'Something went wrong.'
        if (err.code === 11000) {
            if ((<any>err).keyValue instanceof Object)
                if (Object.keys((<any>err).keyValue).length > 0) message = 'This ' + Object.keys((<any>err).keyValue)[0] + ' already exists.'
                else message = 'This is a duplicate entry.'
        }
        return message
    } else return err
}

export default standardizeIfMongoError