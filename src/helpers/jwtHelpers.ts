// JWT related functions

import jwt from 'jsonwebtoken'
import { PresentableError } from './clientErrorHelper'

export const createJWT = (data: Object, signingKey: string, expiresInMinutes: number) => jwt.sign(data, signingKey, { expiresIn: expiresInMinutes * 60 })

const removeBearerStringFromJWT = (token: string) => (token.indexOf('Bearer ') != 0) ? token : token.slice(7)

export const decodeJWT = (token: string) => jwt.decode(removeBearerStringFromJWT(token))

export const verifyAndDecodeJWT = (token: string, signingKey: string) => {
    try {
        jwt.verify(removeBearerStringFromJWT(token), signingKey)
    } catch (err) {
        throw new PresentableError('INVALID_ACCESS_TOKEN')
    }
}