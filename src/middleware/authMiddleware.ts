// authMiddleware.ts
// Provides middleware that attaches user info to a request from the JWT if present and valid
// Also provides middleware that throws an error if the JWT is absent or invalid

import express from 'express'
import { StandardError } from '../funcs/errors'
import { decodeJWT } from '../funcs/jwt'

// Middleware to ensures a valid JWT exists if not, send 401
const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
      await decodeJWT(req.headers.authorization?.toString(), <string>process.env.JWT_AUTH_KEY)
      next()
  } catch (err) {
      const error = new StandardError(3)
      res.status(error.httpCode).send({ code: error.errorCode, message: error.message })
  }
}

// Middleware to check if a valid JWT exists and add its info to the request
const checkUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
      const decodedToken = await decodeJWT(req.headers.authorization?.toString(), <string>process.env.JWT_AUTH_KEY)
      res.locals.user = { _id: (<any>decodedToken).id, email: (<any>decodedToken).email }
      next()
  } catch (err) {
      res.locals.user = null
      next()
  }
}

export { requireAuth, checkUser }