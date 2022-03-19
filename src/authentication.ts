// Provides authentication middleware to tsoa

import express from 'express'
import { PresentableError } from './helpers/clientErrorHelper'
import { verifyAndDecodeJWT } from './helpers/cryptoHelpers'

export async function expressAuthentication(request: express.Request, securityName: string, scopes?: string[]) {
  if (!request.headers.authorization) throw new PresentableError('INVALID_ACCESS_TOKEN')
  return verifyAndDecodeJWT(request.headers.authorization, process.env.JWT_AUTH_KEY)
}