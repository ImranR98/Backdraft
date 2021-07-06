// Various helper functions that don't fit elsewhere

import { StandardError } from './errors'

// Ensures the provided object contains all string properties named in the props array
const validateStringArgs = (object: any, props: string[]) => {
    if (typeof object !== 'object') return props
    const notPresent: string[] = []
    props.forEach(prop => {
        if (typeof object[prop] !== 'string') notPresent.push(prop)
    })
    if (notPresent.length > 0) throw new StandardError(1, notPresent)
}

export { validateStringArgs }