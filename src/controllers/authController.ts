// Authentication request handlers

import User from '../models/User'
import jwt from 'jsonwebtoken'
import express from 'express'

// Duration of JWT
const maxAge = 3 * 24 * 60 * 60 // 3 days (TODO: Figure out refresh token)

// Function to create JWT
const createToken = (id: string) => {
    return jwt.sign({ id }, 'superduperhiddensecretmysteriousencryptedcryptocode', {
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
        res.status(400).send(err)
    }
}

// Login handler
const login = async (req: express.Request, res: express.Response) => {
    const { email, password } = req.body
    try {
        const user = await (<any>User).login(email, password)
        const token = createToken(user._id)
        res.status(200).send({ user: user._id, token })
    }
    catch (err) {
        res.status(400).send(err)
    }
}

export default { signup, login }