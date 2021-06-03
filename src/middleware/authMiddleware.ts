// Authentication middleware

import jwt, { VerifyErrors } from 'jsonwebtoken'
import User from '../models/User'
import express from 'express'

// Ensure a valid JWT exists; if not, send 401
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.cookies.jwt;
  if (token) {
    jwt.verify(token, 'superduperhiddensecretmysteriousencryptedcryptocode', (err: VerifyErrors | null, decodedToken: object | undefined) => {
      if (err) {
        console.log(err.message);
        res.status(401).send();
      } else {
        console.log(decodedToken);
        next();
      }
    });
  } else {
    res.redirect('/login');
  }
};

// If a valid JWT exists, add its info to the request
const checkUser = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.cookies.jwt;
  if (token) {
    jwt.verify(token, 'superduperhiddensecretmysteriousencryptedcryptocode', async (err: VerifyErrors | null, decodedToken: object | undefined) => {
      if (err) {
        res.locals.user = null;
        next();
      } else {
        let user = await User.findById((<any>decodedToken).id);
        res.locals.user = user;
        next();
      }
    });
  } else {
    res.locals.user = null;
    next();
  }
};


export { requireAuth, checkUser };