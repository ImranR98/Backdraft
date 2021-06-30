// Routes used for authentication

// Module imports
import { Router } from 'express'
import { requireAuth } from './middleware/authMiddleware'
import exampleController from './controllers/exampleController'
import authController from './controllers/authController'

const router = Router()

router.get('/hello-world', exampleController.helloWorld)
router.get('/protected', requireAuth, exampleController.protectedRoute)
router.post('/signup', authController.signup)
router.post('/login', authController.login)
router.post('/token', authController.token)

export default router