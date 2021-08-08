// JWT related functions

import jwt, { VerifyErrors } from 'jsonwebtoken'

const createJWT = (data: Object, signingKey: string, expiresInMinutes: number) => {
  return jwt.sign(data, signingKey, {
    expiresIn: expiresInMinutes * 60
  })
}

// Decode raw token if given
const decodeJWT = (token: string | undefined, signingKey: string) => {
  return new Promise((resolve, reject) => {
    if (typeof token === 'string')
      token = (token.indexOf('Bearer ') != 0) ? token : token.slice(7)
    if (token) {
      jwt.verify(token, signingKey, (err: VerifyErrors | null, decodedToken: object | undefined) => {
        if (err) {
          reject(err)
        } else {
          resolve(decodedToken)
        }
      })
    } else {
      reject()
    }
  })
}

export { createJWT, decodeJWT }