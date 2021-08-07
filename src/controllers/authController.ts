// authController.ts
// Provides all major functions related to authentication (also tangentially related ones like the 'logins' function)

import User from '../models/User'
import EmailToken from '../models/EmailToken'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { StandardError } from '../funcs/errors'
import { sendEmail } from '../funcs/emailer'

// Duration of JWT
const maxAge = 5 * 60 // 15 minutes

// Create JWT
const createToken = (id: string) => {
    return jwt.sign({ id }, process.env.JWT_KEY || '', {
        expiresIn: maxAge
    })
}

// Checks that password satisfies requirements
const isPasswordValid = (password: string) => password.length >= 6

// Ensure the given password is valid then hash it
const checkAndHashPassword = async (password: string) => {
    if (!isPasswordValid(password)) throw new StandardError(8)
    const salt = await bcrypt.genSalt();
    return await bcrypt.hash(password, salt)
}

// Assuming the user of provided ID exists, save + return a new refresh token for them and run a cleanup policy on their existing refresh tokens
const assignNewRefreshToken = async (userId: string, ip: string, userAgent: string) => {
    const refreshToken = crypto.randomBytes(64).toString('hex')
    // Run cleanup
    await User.updateOne({ _id: userId }, {
        $push: { refreshTokens: { refreshToken, ip, userAgent, date: new Date() } }
    }, { runValidators: true })
    // Get rid of any refresh token that hasn't been used in 30 days and is from the same IP and user-agent combo
    let lastMonth = new Date((new Date()).valueOf() - 1000 * 60 * 60 * 24 * 30.44)
    await User.updateOne({ _id: userId }, {
        $pull: { refreshTokens: { ip, userAgent, date: { $lt: lastMonth } } },
    }, { runValidators: true })
    // Get rid of any refresh tokens that haven't been used in a year, regardless of IP or user-agent combo
    let lastYear = new Date((new Date()).valueOf() - 1000 * 60 * 60 * 24 * 365.2425)
    await User.updateOne({ _id: userId }, {
        $pull: { refreshTokens: { date: { $lt: lastYear } } },
    }, { runValidators: true })
    return refreshToken
}

// Generates an EmailToken (or appropriates an existing one)
const startEmailVerification = async (userId: string, newEmail: string, hostUrl: string) => {
    const existingEmailUser = await User.findOne({ email: newEmail })
    if (existingEmailUser) if (existingEmailUser._id.toString() !== userId) throw new StandardError(12)
    const existingEmailToken = await EmailToken.findOne({ email: newEmail })
    let verificationKey = null
    if (!existingEmailToken) {
        await EmailToken.deleteMany({ user: userId }) // If this user had another unverified email, they clearly don't want it anymore
        verificationKey = crypto.randomBytes(64).toString('hex')
        await EmailToken.create({ email: newEmail, user: userId, verificationKey })
    } else {
        if (existingEmailToken.user.toString() !== userId) { // If someone else tried verifying this but didn't, too bad for them, the token is re-assigned
            await EmailToken.deleteMany({ user: userId })
            await EmailToken.updateOne({ _id: existingEmailToken._id }, { $set: { user: userId } }, { runValidators: true })
        }
        verificationKey = existingEmailToken.verificationKey
    }
    await sendEmail(newEmail, 'Email Verification Key',
        `To verify this email, go to ${hostUrl}/verify-email/${verificationKey}.`,
        `<p>Hi, thanks for signing up!</p>
<p>Click <a href="${hostUrl}/verify-email/${verificationKey}">here</a> to verify your email.</p>
<p><small><b>If that doesn't work, paste the following link into your browser: <a href="${hostUrl}/verify-email/${verificationKey}">${hostUrl}/verify-email/${verificationKey}</a></b></small></p>`
    )
}

// Validate an EmailToken and update the user's email
const verifyEmail = async (verificationKey: string) => {
    const emailToken = await EmailToken.findOne({ verificationKey })
    if (!emailToken) throw new StandardError(9)
    await User.updateOne({ _id: emailToken.user }, { $set: { email: emailToken.email, verified: true } }, { runValidators: true })
}

// Signup
const signup = async (email: string, password: string, hostUrl: string) => {
    const user = await User.create({ email, verified: false, password: await checkAndHashPassword(password) })
    await startEmailVerification(user._id.toString(), email, hostUrl)
}

// Change email
const changeEmail = async (userId: string, password: string, newEmail: string, hostUrl: string) => {
    const user = await User.findOne({ _id: userId })
    if (!user) throw new StandardError(5)
    const auth = await bcrypt.compare(password, user.password)
    if (!auth) throw new StandardError(7)
    await startEmailVerification(userId, newEmail, hostUrl)
}

// Login
const login = async (email: string, password: string, ip: string, userAgent: string) => {
    const user = await User.findOne({ email })
    if (!user) throw new StandardError(2)
    const auth = await bcrypt.compare(password, user.password)
    if (!auth) throw new StandardError(2)
    if (!user.email) throw new StandardError(11)
    const refreshToken = await assignNewRefreshToken(user._id, ip, userAgent)
    return { token: createToken(user._id.toString()), refreshToken }
}

// Get a new token using a refresh token
const token = async (refreshToken: string, ip: string, userAgent: string) => {
    const user = await User.findOne({ "refreshTokens.refreshToken": refreshToken })
    if (!user) throw new StandardError(4)
    // Update the refresh token last used date, along with IP and user agent (although those are likely unchanged)
    await User.updateOne(
        { _id: user._id, refreshTokens: { refreshToken } },
        { $set: { "refreshTokens.$.ip": ip, "refreshTokens.$.userAgent": userAgent, "refreshTokens.$.date": new Date() } },
        { runValidators: true }
    )
    return { token: createToken(user._id.toString()) }
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
    const result = await User.updateOne({ _id: userId }, { $pull: { refreshTokens: { _id: tokenId } } }, { runValidators: true })
    if (!result.nModified) throw new StandardError(6)
}

// Change password, optionally revoking all refresh tokens
const changePassword = async (userId: string, password: string, newPassword: string, revokeRefreshTokens: boolean, ip: string, userAgent: string) => {
    const user = await User.findOne({ _id: userId })
    if (!user) throw new StandardError(5)
    const auth = await bcrypt.compare(password, user.password)
    if (!auth) throw new StandardError(7)
    let changes: any = { password: await checkAndHashPassword(newPassword) }
    if (revokeRefreshTokens) changes.refreshTokens = []
    await User.updateOne({ _id: userId }, { $set: changes }, { runValidators: true })
    if (revokeRefreshTokens) return { refreshToken: await assignNewRefreshToken(userId, ip, userAgent) } // If existing tokens were revoked, return a new one so client doesn't get logged out
}

// TODO: Forgot password

export default { signup, verifyEmail, login, token, logins, revokeRefreshToken, changePassword, changeEmail }