// Various validation and JWT related functions

import { StandardError } from './errors'
import jwt, { VerifyErrors } from 'jsonwebtoken'

// Ensures the provided object contains all string properties named in the props array
const validateStringArgs = (object: any, props: string[]) => {
  if (typeof object !== 'object') return props
  const notPresent: string[] = []
  props.forEach(prop => {
    if (typeof object[prop] !== 'string') notPresent.push(prop)
  })
  if (notPresent.length > 0) throw new StandardError(1, notPresent)
}

// Ensures required environment variables exist
const ensureEnvVars = () => {
  const envRequirements = ['JWT_AUTH_KEY', 'JWT_EMAIL_VERIFICATION_KEY', 'DB_CONN_STRING', 'STRINGIFIED_NODEMAILER_OPTIONS_JSON', 'SENDER_EMAIL']
  let envValid = true
  for (let i = 0; i < envRequirements.length && envValid; i++) {
    if (typeof process.env[envRequirements[i]] !== 'string') envValid = false
    else if (process.env[envRequirements[i]]?.length === 0) envValid = false
  }
  if (!envValid) throw new Error('One or more environment variables are missing')
  try {
    JSON.parse(<string>process.env.STRINGIFIED_NODEMAILER_OPTIONS_JSON)
  } catch (err) {
    throw new Error('The STRINGIFIED_NODEMAILER_OPTIONS_JSON environment variable is not valid JSON')
  }
}

const createJWT = (data: Object, signingKey: string, expiresInMinutes: number) => {
  return jwt.sign(data, signingKey, {
      expiresIn: expiresInMinutes * 60
  })
}

// Parse raw token (remove 'Bearer')
const trimToken = (token: string | undefined) => {
  if (!token) return undefined
  if (token.indexOf('Bearer ') != 0) return token
  return token.slice(7)
}

// Decode raw token if given
const decodeJWT = (token: string | undefined, signingKey: string) => {
  return new Promise((resolve, reject) => {
    token = trimToken(token?.toString())
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

export { validateStringArgs, ensureEnvVars, createJWT, decodeJWT as decodeToken }