// Routes used to test API

// Module imports
import { Router } from 'express'
import { requireAuth } from '../middleware/authMiddleware'

const router = Router()

router.get('/api/hello-world', async (req, res) => {
    res.send('Hello World\!')
})

router.get('/api/protected', requireAuth, async (req, res) => {
    res.send('You are accessing a protected route\!')
})

export default router