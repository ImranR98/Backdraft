// Various helper functions that don't fit elsewhere

import https from 'https'
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

// Simple HTTP get request
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

// Use a free API service to translate an IP address into a city and country name
const getLocationByIP = async (ip: string): Promise<{ city: string, country: string } | null> => {
    let location = null
    try {
        const locationData: any = await simpleHttpGet(`https://freegeoip.app/json/${ip}`) // TODO: Make more configurable via env. vars
        if (typeof locationData.city === 'string' && typeof locationData.country_name === 'string') location = { city: locationData.city, country: locationData.country_name }
    } catch (err) { }
    return location
}

export { simpleHttpGet, validateStringArgs, getLocationByIP }