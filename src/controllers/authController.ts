// Authentication request handlers

// Module imports
import User from '../models/User'
import jwt from 'jsonwebtoken'
import express from 'express'
import crypto from 'crypto'
import modifyError from '../helpers'

// Duration of JWT
const maxAge = 3 * 24 * 60 * 60 // 3 days (TODO: Figure out refresh token)

// Function to create JWT
const createToken = (id: string) => {
    return jwt.sign({ id }, 'superduperhiddensecretmysteriousencryptedcryptocode', { // TODO: Replace this with a secret that won't be in git.
        expiresIn: maxAge
    })
}

// Signup handler
const signup = async (req: express.Request, res: express.Response) => {
    const { email, password } = req.body
    try {
        const user = await User.create({ email, password })
        res.status(201).json({ user: user._id })
    }
    catch (err) {
        res.status(400).send(modifyError(err))
    }
}

// Login handler
const login = async (req: express.Request, res: express.Response) => {
    const { email, password } = req.body
    try {
        const refreshToken = crypto.randomBytes(64).toString('hex')
        const user = await (<any>User).login(email, password, refreshToken, req.ip, req.headers['user-agent'])
        const token = createToken(user._id)
        res.status(200).send({ user: user._id, token, refreshToken })
    }
    catch (err) {
        res.status(400).send(modifyError(err))
    }
}

export default { signup, login }