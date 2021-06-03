// Authentication middleware

// Module imports
import jwt, { VerifyErrors } from 'jsonwebtoken'
import User from '../models/User'
import express from 'express'

// Parse raw token (remove 'Bearer')
const trimToken = (token: string | undefined) => {
  if (!token) return undefined
  if (token.indexOf('Bearer ') != 0) return token
  return token.slice(7)
}

// Decode raw token if given
const decodeToken = (token: string | undefined) => {
  return new Promise((resolve, reject) => {
    token = trimToken(token?.toString())
    if (token) {
      jwt.verify(token, 'superduperhiddensecretmysteriousencryptedcryptocode', (err: VerifyErrors | null, decodedToken: object | undefined) => {
        if (err) {
          reject()
        } else {
          resolve(decodedToken)
        }
      })
    } else {
      reject()
    }
  })
}

// Ensure a valid JWT exists if not, send 401
const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const decodedToken = await decodeToken(req.headers.authorization?.toString())
    next()
  } catch (err) {
    res.status(401).send()
  }
}

// If a valid JWT exists, add its info to the request
const checkUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const decodedToken = await decodeToken(req.headers.authorization?.toString())
    let user = await User.findById((<any>decodedToken).id)
    res.locals.user = user
    next()
  } catch (err) {
    res.locals.user = null
    next()
  }
}


export { requireAuth, checkUser }