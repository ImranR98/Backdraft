// authMiddleware.ts
// Provides middleware that attaches user info to a request from the JWT if present and valid
// Also provides middleware that throws an error if the JWT is absent or invalid

import User from '../models/User'
import express from 'express'
import { StandardError } from '../funcs/errors'
import { decodeToken } from '../funcs/validators'

// Ensure a valid JWT exists if not, send 401
const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const decodedToken = await decodeToken(req.headers.authorization?.toString(), <string>process.env.JWT_KEY)
    next()
  } catch (err) {
    const error = new StandardError(3)
    res.status(error.httpCode).send({ code: error.errorCode, message: error.message })
  }
}

// If a valid JWT exists, add its info to the request
const checkUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const decodedToken = await decodeToken(req.headers.authorization?.toString(), <string>process.env.JWT_KEY)
    let user = await User.findById((<any>decodedToken).id)
    res.locals.user = { _id: user._id, email: user.email }
    next()
  } catch (err) {
    res.locals.user = null
    next()
  }
}


export { requireAuth, checkUser }