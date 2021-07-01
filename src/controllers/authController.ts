// Authentication request handlers

// Module imports
import User from '../models/User'
import jwt from 'jsonwebtoken'
import express from 'express'
import { standardizeError } from '../errors'
import { simpleHttpGet } from '../helpers'

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

// Login list handler
const logins = async (req: express.Request, res: express.Response) => {
    try {
        const RTs: { _id: string, ip: string, userAgent: string, date: Date }[] = await (<any>User).getRefreshTokens(res.locals.user._id)
        console.log(RTs)
        const logins: { _id: string, ip: string, userAgent: string, lastUsed: Date, location: { city: string, country: string } | null }[] = []
        for (let i = 0; i < RTs.length; i++) {
            let location: { city: string, country: string } | null = null
            try {
                const locationData: any = await simpleHttpGet(`https://freegeoip.app/json/${RTs[i].ip}`)
                if (locationData.city && locationData.country_name) location = { city: locationData.city, country: locationData.country_name }
            } catch (err) {
                location = null
            }
            logins.push({ _id: RTs[i]._id, ip: RTs[i].ip, userAgent: RTs[i].userAgent, lastUsed: RTs[i].date, location })
        }
        res.send(logins)
    } catch (err) {
        const error = standardizeError(err)
        res.status(error.httpCode).send({ code: error.errorCode, message: error.message })
    }
}

// Revoke refresh token handler
const revokeRefreshToken = async (req: express.Request, res: express.Response) => {
    const { tokenId } = req.body
    try {
        const result = await (<any>User).revokeRefreshToken(res.locals.user._id, tokenId)
        console.log(result)
        res.send()
    } catch (err) {
        const error = standardizeError(err)
        res.status(error.httpCode).send({ code: error.errorCode, message: error.message })
    }
}



export default { signup, login, token, logins, revokeRefreshToken }