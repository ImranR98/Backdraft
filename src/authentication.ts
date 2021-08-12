// authMiddleware.ts
// Provides authentication middleware to tsoa

import express from 'express'
import { verifyAndDecodeJWT } from './helpers/jwtHelpers'

export async function authentication(request: express.Request) {
  if (!request.headers.authorization) throw new Error('No token provided')
  return verifyAndDecodeJWT(request.headers.authorization, process.env.JWT_AUTH_KEY)
}