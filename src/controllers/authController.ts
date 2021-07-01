// Authentication request handlers

// Module imports
import User from '../models/User'
import jwt from 'jsonwebtoken'
import express from 'express'
import { standardizeError } from '../errors'

// Duration of JWT
const maxAge = 5 * 60 // 15 minutes

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
        res.status(201).send()
    }
    catch (err) {
        const error = standardizeError(err)
        res.status(error.httpCode).send({ code: error.errorCode, message: error.message })
    }
}

// Login handler
const login = async (req: express.Request, res: express.Response) => {
    const { email, password } = req.body
    try {
        const { user, refreshToken } = await (<any>User).login(email, password, req.ip, req.headers['user-agent'])
        res.status(200).send({ token: createToken(user._id), refreshToken })
    }
    catch (err) {
        const error = standardizeError(err)
        res.status(error.httpCode).send({ code: error.errorCode, message: error.message })
    }
}

// Refresh token handler
const token = async (req: express.Request, res: express.Response) => {
    const { refreshToken } = req.body
    try {
        const userId: string = await (<any>User).validateRefreshToken(refreshToken, req.ip, req.headers['user-agent'])
        res.status(200).send({ user: userId, token: createToken(userId) })
    }
    catch (err) {
        const error = standardizeError(err)
        res.status(error.httpCode).send({ code: error.errorCode, message: error.message })
    }
}

export default { signup, login, token }