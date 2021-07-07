// authController.ts
// Provides all major functions related to authentication (also tangentially related ones like the 'logins' function)

import User from '../models/User'
import jwt from 'jsonwebtoken'
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
    return await bcrypt.hash(password, salt)
}

// Assuming the user of provided ID exists, save + return a new refresh token for them and run a cleanup policy on their existing refresh tokens
const assignNewRefreshToken = async (userId: string, ip: string, userAgent: string) => {
    const refreshToken = crypto.randomBytes(64).toString('hex')
    // Run cleanup
    await User.updateOne({ _id: userId }, {
        $push: { refreshTokens: { refreshToken, ip, userAgent, date: new Date() } }
    })
    // Get rid of any refresh token that hasn't been used in 30 days and is from the same IP and user-agent combo
    let lastMonth = new Date((new Date()).valueOf() - 1000 * 60 * 60 * 24 * 30.44)
    await User.updateOne({ _id: userId }, {
        $pull: { refreshTokens: { ip, userAgent, date: { $lt: lastMonth } } },
    })
    // Get rid of any refresh tokens that haven't been used in a year, regardless of IP or user-agent combo
    let lastYear = new Date((new Date()).valueOf() - 1000 * 60 * 60 * 24 * 365.2425)
    await User.updateOne({ _id: userId }, {
        $pull: { refreshTokens: { date: { $lt: lastYear } } },
    })
    return refreshToken
}

// Signup
const signup = async (email: string, password: string) => {
    await User.create({ email, password: await hashPassword(password) })
}

// Login
const login = async (email: string, password: string, ip: string, userAgent: string) => {
    const user = await User.findOne({ email })
    if (!user) throw new StandardError(2)
    const auth = await bcrypt.compare(password, user.password)
    if (!auth) throw new StandardError(2)
    const refreshToken = await assignNewRefreshToken(user._id, ip, userAgent)
    return { token: createToken(user._id), refreshToken }
}

// Get a new token using a refresh token
const token = async (refreshToken: string, ip: string, userAgent: string) => {
    const user = await User.findOne({ "refreshTokens.refreshToken": refreshToken })
    if (!user) throw new StandardError(4)
    // Update the refresh token last used date, along with IP and user agent (although those are likely unchanged)
    await User.updateOne({ _id: user._id, refreshTokens: { refreshToken } },
        { $set: { "refreshTokens.$.ip": ip, "refreshTokens.$.userAgent": userAgent, "refreshTokens.$.date": new Date() } })
    return { user: user._id, token: createToken(user._id) }
}

// Get list of 'devices' (refresh token info)
const logins = async (userId: string) => {
    const user = await User.findOne({ _id: userId })
    if (!user) throw new StandardError(5)
    const RTs: { _id: string, ip: string, userAgent: string, date: Date }[] = user.refreshTokens
    const logins: { _id: string, ip: string, userAgent: string, lastUsed: Date }[] = []
    for (let i = 0; i < RTs.length; i++) {
        logins.push({ _id: RTs[i]._id, ip: RTs[i].ip, userAgent: RTs[i].userAgent, lastUsed: RTs[i].date })
    }
    return logins
}

// Revoke a refresh token
const revokeRefreshToken = async (tokenId: string, userId: string) => {
    const result = await User.updateOne({ _id: userId }, { $pull: { refreshTokens: { _id: tokenId } } })
    if (!result.nModified) throw new StandardError(6)
}

// Change password, optionally revoking all refresh tokens
const changePassword = async (userId: string, password: string, newPassword: string, revokeRefreshTokens: boolean, ip: string, userAgent: string) => {
    const user = await User.findOne({ _id: userId })
    if (!user) throw new StandardError(5)
    const auth = await bcrypt.compare(password, user.password)
    if (!auth) throw new StandardError(7)
    let changes: any = { password: await hashPassword(newPassword) }
    if (revokeRefreshTokens) changes.refreshTokens = []
    await User.updateOne({ _id: userId }, { $set: changes })
    if (revokeRefreshTokens) return { refreshToken: await assignNewRefreshToken(userId, ip, userAgent) } // If existing tokens were revoked, return a new one so client doesn't get logged out
}


export default { signup, login, token, logins, revokeRefreshToken, changePassword }