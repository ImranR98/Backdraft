// authController.ts
// Provides all major functions related to authentication (also tangentially related ones like the 'logins' function)

import { createUser, findUserById, findUserByEmail, findUserByRefreshToken, deleteUserByID, updateUser, updateUserEmail, addUserRefreshToken, removeOldUserRefreshTokens, updateUserRefreshToken, removeUserRefreshToken } from '../db/User'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { StandardError } from '../funcs/errors'
import { sendEmail } from '../funcs/emailer'
import { createJWT, decodeJWT, verifyAndDecodeJWT } from '../funcs/jwt'

// Time constants
const REFRESH_TOKEN_CLEANUP_1_DAYS = 30.44
const REFRESH_TOKEN_CLEANUP_2_DAYS = 365.2425
const EMAIL_VERIFICATION_TOKEN_DURATION_MINUTES = 60
const PASSWORD_RESET_TOKEN_DURATION_MINUTES = 60

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
    await addUserRefreshToken(userId, refreshToken, ip, userAgent)
    // Run cleanup
    await removeOldUserRefreshTokens(userId, new Date((new Date()).valueOf() - 1000 * 60 * 60 * 24 * REFRESH_TOKEN_CLEANUP_1_DAYS), ip, userAgent) // Unused for at least 30 days and from the same IP, user-agent
    await removeOldUserRefreshTokens(userId, new Date((new Date()).valueOf() - 1000 * 60 * 60 * 24 * REFRESH_TOKEN_CLEANUP_2_DAYS)) // Unused for at least a year
    return refreshToken
}

// Clear the way for an email to be assigned to a user if possible
const prepareForEmailVerification = async (email: string, userId: string | null = null) => {
    const existingEmailUser = await findUserByEmail(email)
    if (existingEmailUser) {
        if (userId === existingEmailUser._id.toString()) {
            if (existingEmailUser.verified)
                throw new StandardError(10)
        } else {
            if (existingEmailUser.verified)
                throw new StandardError(12)
            else
                await deleteUserByID(existingEmailUser._id)
        }
    }
}

// Begin email verification process by generating verification JWT and sending email
const beginEmailVerification = async (userId: string, email: string, hostUrl: string) => {
    const verificationToken = createJWT({ id: userId, email }, <string>process.env.JWT_EMAIL_VERIFICATION_KEY, EMAIL_VERIFICATION_TOKEN_DURATION_MINUTES)
    await updateUserEmail(userId, email, false)
    const link = `${hostUrl}/verify-email/${verificationToken}`
    await sendEmail(email, 'Email Verification Link',
        `To verify this email, go to ${link}. This will expire in ${EMAIL_VERIFICATION_TOKEN_DURATION_MINUTES} minutes.`,
        `<p>Hi, thanks for signing up!</p>
<p>Click <a href="${link}">here</a> to verify your email. The link will expire in ${EMAIL_VERIFICATION_TOKEN_DURATION_MINUTES} minutes.</p>
<p><small><b>If that doesn't work, paste the following link into your browser: <a href="${link}">${link}</a></b></small></p>`
    )
}

// Signup
const signup = async (email: string, password: string, hostUrl: string) => {
    await prepareForEmailVerification(email)
    const user = await createUser(email, await checkAndHashPassword(password))
    await beginEmailVerification(user._id.toString(), email.trim(), hostUrl)
}

// Change email
const changeEmail = async (userId: string, password: string, newEmail: string, hostUrl: string) => {
    newEmail = newEmail.trim()
    const user = await findUserById(userId)
    if (!user) throw new StandardError(5)
    const auth = await bcrypt.compare(password, user.password)
    if (!auth) throw new StandardError(7)
    if (user.email === newEmail.toLowerCase().trim()) throw new StandardError(13)
    await prepareForEmailVerification(newEmail, userId)
    await beginEmailVerification(userId, newEmail, hostUrl)
}

// Complete the email verification process using the provided key
const verifyEmail = async (emailVerificationToken: string) => {
    let data: any = null
    try {
        data = verifyAndDecodeJWT(emailVerificationToken, <string>process.env.JWT_EMAIL_VERIFICATION_KEY)
    } catch (err) {
        throw new StandardError(9)
    }
    if (!data.id || !data.email) throw new StandardError(9)
    const user = await findUserById(data.id)
    if (!user) throw new StandardError(9)
    await updateUserEmail(user._id, data.email, true)
}

// Login
const login = async (email: string, password: string, ip: string, userAgent: string) => {
    email = email.trim()
    const user = await findUserByEmail(email)
    if (!user) throw new StandardError(2)
    const auth = await bcrypt.compare(password, user.password)
    if (!auth) throw new StandardError(2)
    if (user.pendingVerification) if (user.pendingVerification.email === email) throw new StandardError(11)
    const refreshToken = await assignNewRefreshToken(user._id, ip, userAgent)
    return { token: createJWT({ id: user._id.toString() }, <string>process.env.JWT_AUTH_KEY, 5), refreshToken }
}

// Get a new token using a refresh token
const token = async (refreshToken: string, ip: string, userAgent: string) => {
    const user = await findUserByRefreshToken(refreshToken)
    if (!user) throw new StandardError(4)
    // Update the refresh token last used date, along with IP and user agent (although those are likely unchanged)
    await updateUserRefreshToken(user._id, refreshToken, ip, userAgent)
    return { token: createJWT({ id: user._id.toString() }, <string>process.env.JWT_AUTH_KEY, 5) }
}

// Get list of 'devices' (refresh token info)
const logins = async (userId: string) => {
    const user = await findUserById(userId)
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
    if (!await removeUserRefreshToken(userId, tokenId)) throw new StandardError(6)
}

// Change password, optionally revoking all refresh tokens
const changePassword = async (userId: string, password: string, newPassword: string, revokeRefreshTokens: boolean, ip: string, userAgent: string) => {
    const user = await findUserById(userId)
    if (!user) throw new StandardError(5)
    const auth = await bcrypt.compare(password, user.password)
    if (!auth) throw new StandardError(7)
    let changes: any = { password: await checkAndHashPassword(newPassword) }
    if (revokeRefreshTokens) changes.refreshTokens = []
    await updateUser(userId, changes)
    if (revokeRefreshTokens) return { refreshToken: await assignNewRefreshToken(userId, ip, userAgent) } // If existing tokens were revoked, return a new one so client doesn't get logged out
}

const beginPasswordReset = async (email: string, hostUrl: string) => {
    const user = await findUserByEmail(email)
    if (!user) throw new StandardError(5)
    const passwordToken = createJWT({ userId: user._id }, user.password, PASSWORD_RESET_TOKEN_DURATION_MINUTES)
    const link = `${hostUrl}/reset-password/${passwordToken}`
    await sendEmail(email, 'Password Reset Link',
        `To verify this email, go to ${link}. This will expire in ${PASSWORD_RESET_TOKEN_DURATION_MINUTES} minutes.`,
        `<p>Hi, thanks for signing up!</p>
<p>Click <a href="${link}">here</a> to verify your email. The link will expire in ${PASSWORD_RESET_TOKEN_DURATION_MINUTES} minutes.</p>
<p><small><b>If that doesn't work, paste the following link into your browser: <a href="${link}">${link}</a></b></small></p>`
    )
}

const resetPassword = async (passwordResetToken: string, newPassword: string) => {
    let userId = ''
    try {
        let data: any = decodeJWT(passwordResetToken)
        if (!data.userId) throw null
        const user = await findUserById(data.userId)
        if (!user) throw null
        verifyAndDecodeJWT(passwordResetToken, user.password)
        userId = user._id
    } catch (err) {
        throw new StandardError(14)
    }
    await updateUser(userId, { password: checkAndHashPassword(newPassword), verified: true })
}

export default { signup, verifyEmail, login, token, logins, revokeRefreshToken, changePassword, changeEmail, beginPasswordReset, resetPassword }