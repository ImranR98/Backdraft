// JWT related functions

import jwt, { VerifyErrors } from 'jsonwebtoken'

const createJWT = (data: Object, signingKey: string, expiresInMinutes: number) => jwt.sign(data, signingKey, { expiresIn: expiresInMinutes * 60 })

const removeBearerStringFromJWT = (token: string) => (token.indexOf('Bearer ') != 0) ? token : token.slice(7)

const decodeJWT = (token: string) => jwt.decode(removeBearerStringFromJWT(token))

const verifyAndDecodeJWT = (token: string, signingKey: string) => jwt.verify(removeBearerStringFromJWT(token), signingKey)


export { createJWT, verifyAndDecodeJWT, decodeJWT }