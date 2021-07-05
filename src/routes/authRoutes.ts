// Routes used for authentication related endpoints

import { Router } from 'express'
import { requireAuth } from '../middleware/authMiddleware'
import authController from '../controllers/authController'
import express from 'express'
import { validateStringArgs } from '../helpers'

const router = Router()

router.post('/signup',
    async (req: express.Request, res: express.Response) => {
        validateStringArgs(req.body, ['email', 'password'])
        await authController.signup(req.body.email, req.body.password)
        res.status(201).send()
    }
)

router.post('/login',
    async (req: express.Request, res: express.Response) => {
        validateStringArgs(req.body, ['email', 'password'])
        res.status(201).send(await authController.login(req.body.email, req.body.password, req.ip, req.headers['user-agent'] || ''))
    }
)

router.post('/token',
    async (req: express.Request, res: express.Response) => {
        validateStringArgs(req.body, ['refreshToken'])
        res.status(201).send(await authController.token(req.body.refreshToken, req.ip, req.headers['user-agent'] || ''))
    }
)

router.get('/logins', requireAuth,
    async (req: express.Request, res: express.Response) => {
        res.status(201).send(await authController.logins(res.locals.user._id))
    }
)

router.post('/revokeRefreshToken', requireAuth,
    async (req: express.Request, res: express.Response) => {
        validateStringArgs(req.body, ['tokenId'])
        res.status(201).send(await authController.revokeRefreshToken(req.body.tokenId, res.locals.user._id))
    }
)

export default router