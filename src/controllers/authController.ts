// authController.ts
// Provides all major functions related to authentication (also tangentially related ones like the 'logins' function)

import User from '../models/User'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { StandardError } from '../funcs/errors'
import { sendEmail } from '../funcs/emailer'

// Contains 3 functions related to email verification; these can't be merged into 1 as they are used differently in signup vs change-email
const emailVerification = {
    // Clear the way for an email to be verified by a user (or no user) if possible and return result code
    prepare: async (email: string, userId: string | null = null) => {
        const existingEmailUser = await User.findOne({ email })

        if (existingEmailUser) {
            if (userId === existingEmailUser._id.toString()) {
                if (!existingEmailUser.pendingVerification)
                    return 2 // Already verified
                else if (existingEmailUser.pendingVerification.email === email)
                    return 1 // Resend existing verification
            } else {
                if (!existingEmailUser.pendingVerification)
                    return 3 // Email in use
                else if (existingEmailUser.pendingVerification.email === email)
                    await User.deleteOne({ _id: existingEmailUser._id })
                else
                    return 3 // Email in use
            }
        }

        const existingPendingVerificationUsers = await User.find({ "pendingVerification.email": email })

        if (existingPendingVerificationUsers.length > 0) {
            for (let i = 0; i < existingPendingVerificationUsers.length; i++) {
                if (existingPendingVerificationUsers[i].pendingVerification.email !== existingPendingVerificationUsers[i].email) {
                    if (userId === existingPendingVerificationUsers[i]._id.toString())
                        return 1 // Resend existing verification
                    else
                        await User.updateOne({ _id: existingPendingVerificationUsers[i]._id }, { $set: { pendingVerification: null } }, { runValidators: true })
                }
            }
        }

        return 0 // Safe to verify
    },
    throwErrors: (preparationResult: number) => {
        switch (preparationResult) {
            case 2:
                throw new StandardError(10)
                break;
            case 3:
                throw new StandardError(12)
                break;
        }
    },
    // Interpret result code from prepare function and create email verification accordingly
    beginVerification: async (userId: string, email: string, preparationResult: number, hostUrl: string) => {
        let key = null
        switch (preparationResult) {
            case 0:
                key = crypto.randomBytes(64).toString('hex')
                break;
            case 1:
                key = await User.findOne({ _id: userId }).pendingVerification.key
                break;
            case 2:
                throw new StandardError(10)
                break;
            case 3:
                throw new StandardError(12)
                break;
        }
        await User.updateOne({ _id: userId }, { $set: { pendingVerification: { email, key } } }, { runValidators: true })
        await sendEmail(email, 'Email Verification Key',
            `To verify this email, go to ${hostUrl}/verify-email/${key}.`,
            `<p>Hi, thanks for signing up!</p>
<p>Click <a href="${hostUrl}/verify-email/${key}">here</a> to verify your email.</p>
<p><small><b>If that doesn't work, paste the following link into your browser: <a href="${hostUrl}/verify-email/${key}">${hostUrl}/verify-email/${key}</a></b></small></p>`
        )
    }
}

// Signup
const signup = async (email: string, password: string, hostUrl: string) => {
    const prepResult = await emailVerification.prepare(email)
    emailVerification.throwErrors(prepResult)
    const user = await User.create({ email, password: await checkAndHashPassword(password) })
    await emailVerification.beginVerification(user._id.toString(), email.trim(), prepResult, hostUrl)
}

// Change email
const changeEmail = async (userId: string, password: string, newEmail: string, hostUrl: string) => {
    const user = await User.findOne({ _id: userId })
    if (!user) throw new StandardError(5)
    const auth = await bcrypt.compare(password, user.password)
    if (!auth) throw new StandardError(7)
    if (user.email === newEmail.toLowerCase().trim()) throw new StandardError(13)
    const prepResult = await emailVerification.prepare(newEmail, userId)
    emailVerification.throwErrors(prepResult)
    await emailVerification.beginVerification(userId, newEmail.trim(), prepResult, hostUrl)
}

// Complete the email verification process using the provided key
const verifyEmail = async (verificationKey: string) => {
    const user = await User.findOne({ "pendingVerification.key": verificationKey })
    if (!user) throw new StandardError(9)
    await User.updateOne({ _id: user._id }, { $set: { email: user.pendingVerification.email, pendingVerification: null } }, { runValidators: true })
}

// Create a JWT containing an ID
const createToken = (id: string) => {
    return jwt.sign({ id }, process.env.JWT_KEY || '', {
        expiresIn: 5 * 60 // 15 minutes
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

// Login
const login = async (email: string, password: string, ip: string, userAgent: string) => {
    email = email.trim()
    const user = await User.findOne({ email })
    if (!user) throw new StandardError(2)
    const auth = await bcrypt.compare(password, user.password)
    if (!auth) throw new StandardError(2)
    if (user.pendingVerification) if (user.pendingVerification.email === email) throw new StandardError(11)
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