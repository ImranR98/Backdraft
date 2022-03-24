// Crypto related functions

import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { PresentableError } from './clientErrorHelper'

export const createJWT = (data: Object, signingKey: string, expiresInMinutes: number) => jwt.sign(data, signingKey, { expiresIn: expiresInMinutes * 60 })

export const removeBearerStringFromJWT = (token: string) => (token.indexOf('Bearer ') != 0) ? token : token.slice(7)

export const decodeJWT = (token: string) => jwt.decode(removeBearerStringFromJWT(token))

export const verifyAndDecodeJWT = (token: string, signingKey: string) => {
    try {
        return jwt.verify(removeBearerStringFromJWT(token), signingKey)
    } catch (err) {
        throw new PresentableError('INVALID_ACCESS_TOKEN')
    }
}

export const generateOTPAndHash = (dataString: string, length: number, expiryMins: number, key: string) => {
    let otp = ''
    for (let i = 0; i < length; i++)
        otp += crypto.randomInt(0, 10).toString()
    const expires = Date.now() + (expiryMins * 60 * 1000)
    const data = `${dataString}.${otp}.${expires}`
    const hash = crypto.createHmac('sha256', key).update(data).digest('hex')
    const fullHash = `${hash}.${expires}`
    return { fullHash, otp }
}

export const verifyOTP = (dataString: string, hash: string, otp: string, key: string) => {
    const [hashValue, expires] = hash.split('.')
    if (Date.now() > Number.parseInt(expires)) return false
    const data = `${dataString}.${otp}.${expires}`
    let newHash = crypto.createHmac('sha256', key).update(data).digest('hex')
    return newHash === hashValue
}