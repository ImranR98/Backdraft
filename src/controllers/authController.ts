// authController.ts
// Provides all major functions related to authentication (also tangentially related ones like the devices() function)

import User from '../models/User'
import jwt from 'jsonwebtoken'
import { getLocationByIP, simpleHttpGet } from '../helpers'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { StandardError } from '../errors'

// Duration of JWT
const maxAge = 5 * 60 // 15 minutes // TODO: Make env. var

// Create JWT
const createToken = (id: string) => {
    return jwt.sign({ id }, 'superduperhiddensecretmysteriousencryptedcryptocode', { // TODO: Make env. var
        expiresIn: maxAge
    })
}

// Hash passwords
const hashPassword = async (password: string) => {
    const salt = await bcrypt.genSalt();
    await bcrypt.hash(password, salt)
}

// Signup
const signup = async (email: string, password: string) => {
    await User.create({ email, password: hashPassword(password) })
}

// Login
const login = async (email: string, password: string, ip: string, userAgent: string) => {
    const refreshToken = crypto.randomBytes(64).toString('hex')
    const user = await User.findOne({ email })
    if (user) {
        const auth = await bcrypt.compare(password, user.password)
        if (auth) {
            await User.updateOne({ _id: user._id }, {
                $push: { refreshTokens: { refreshToken, ip, userAgent, date: new Date() } }
            })
            // Get rid of any refresh token that hasn't been used in 30 days and is from the same IP and user-agent combo
            let lastMonth = new Date((new Date()).valueOf() - 1000 * 60 * 60 * 24 * 30.44)
            await User.updateOne({ _id: user._id }, {
                $pull: { refreshTokens: { ip, userAgent, date: { $lt: lastMonth } } },
            })
            // Get rid of any refresh tokens that haven't been used in a year, regardless of IP or user-agent combo
            let lastYear = new Date((new Date()).valueOf() - 1000 * 60 * 60 * 24 * 365.2425)
            await User.updateOne({ _id: user._id }, {
                $pull: { refreshTokens: { date: { $lt: lastYear } } },
            })
            return { token: createToken(user._id), refreshToken }
        }
    }
    throw new StandardError(2)
}

// Get a new token using a refresh token
const token = async (refreshToken: string, ip: string, userAgent: string) => {
    const user = await User.findOne({ "refreshTokens.refreshToken": refreshToken })
    if (user) {
        // Update the refresh token last used date, along with IP and user agent (although those are likely unchanged)
        await User.updateOne({ _id: user._id, refreshTokens: { refreshToken } },
            { $set: { "refreshTokens.$.ip": ip, "refreshTokens.$.userAgent": userAgent, "refreshTokens.$.date": new Date() } })
        return { user: user._id, token: createToken(user._id) }
    } else throw new StandardError(4)
}

// Get list of 'devices' (refresh token info)
const logins = async (userId: string) => {
    const RTs: { _id: string, ip: string, userAgent: string, date: Date }[] = (await User.findOne({ _id: userId })).refreshTokens
    const logins: { _id: string, ip: string, userAgent: string, lastUsed: Date, location: { city: string, country: string } | null }[] = []
    for (let i = 0; i < RTs.length; i++) {
        logins.push({ _id: RTs[i]._id, ip: RTs[i].ip, userAgent: RTs[i].userAgent, lastUsed: RTs[i].date, location: await getLocationByIP(RTs[i].ip) })
    }
    return logins
}

// Revoke a refresh token
const revokeRefreshToken = async (tokenId: string, userId: string) => {
    const result = await User.updateOne({ _id: userId }, { $pull: { refreshTokens: { _id: tokenId } } })
    if (!result.nModified) throw new StandardError(5)
}


export default { signup, login, token, logins, revokeRefreshToken }