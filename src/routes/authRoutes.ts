// Routes used for authentication

// Module imports
import { Router } from 'express'
import authController from '../controllers/authController'

const router = Router()

router.post('/api/signup', authController.signup)
router.post('/api/login', authController.login)

export default router