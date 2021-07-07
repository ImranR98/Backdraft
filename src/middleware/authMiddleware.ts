// authMiddleware.ts
// Provides middleware that attaches user info to a request from the JWT if present and valid
// Also provides middleware that throws an error if the JWT is absent or invalid

import jwt, { VerifyErrors } from 'jsonwebtoken'
import User from '../models/User'
import express from 'express'
import { StandardError } from '../errors'

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
      jwt.verify(token, process.env.JWT_KEY || '', (err: VerifyErrors | null, decodedToken: object | undefined) => {
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

// Ensure a valid JWT exists if not, send 401
const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const decodedToken = await decodeToken(req.headers.authorization?.toString())
    next()
  } catch (err) {
    const error = new StandardError(3)
    res.status(error.httpCode).send({ code: error.errorCode, message: error.message })
  }
}

// If a valid JWT exists, add its info to the request
const checkUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const decodedToken = await decodeToken(req.headers.authorization?.toString())
    let user = await User.findById((<any>decodedToken).id)
    res.locals.user = { _id: user._id, email: user.email }
    next()
  } catch (err) {
    res.locals.user = null
    next()
  }
}


export { requireAuth, checkUser }