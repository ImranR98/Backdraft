// Provides functions related to authentication, and any user-related functions that have to do with credentials (email and password)

import { createUser, findUserById, findUserByEmail, findUserByRefreshToken, deleteUserByID, updateUser, updateUserEmail, addUserRefreshToken, removeOldUserRefreshTokens, updateRefreshToken, removeRefreshTokenByTokenId, removeRefreshTokenByTokenString, removeAllUserRefreshTokens } from '../db/userQueries'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { PresentableError } from '../helpers/clientErrorHelper'
import { sendEmail } from '../helpers/emailHelpers'
import { createJWT, generateOTPAndHash, verifyOTP } from '../helpers/cryptoHelpers'

export class authService {
    /** Returns a boolean based on whether the input string meets certain password requirements */
    private isPasswordValid = (password: string) => password.length >= 6

    /** Throws an error if the input is not a valid password */
    private async checkAndHashPassword(password: string) {
        if (!this.isPasswordValid(password)) throw new PresentableError('INVALID_PASSWORD')
        const salt = await bcrypt.genSalt()
        return await bcrypt.hash(password, salt)
    }

    /** Throws an error if the input is not an email */
    private async ensureEmail(email: string) {
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
        if (!emailRegex.test(email)) throw new PresentableError('VALIDATION_ERROR', 'Not a valid email')
    }

    /** Assigns a new refresh token to the specified user, runs a cleanup policy on their existing tokens, and returns the new token */
    private async assignNewRefreshToken(userId: number, ip: string, userAgent: string) {
        const refreshToken = crypto.randomBytes(64).toString('hex')
        await addUserRefreshToken(userId, refreshToken, ip, userAgent)
        await removeOldUserRefreshTokens(userId, new Date((new Date()).valueOf() - 1000 * 60 * 60 * 24 * Number.parseFloat(process.env.REFRESH_TOKEN_CLEANUP_1_DAYS)), ip, userAgent) // Unused for at least 30 days and from the same IP, user-agent
        await removeOldUserRefreshTokens(userId, new Date((new Date()).valueOf() - 1000 * 60 * 60 * 24 * Number.parseFloat(process.env.REFRESH_TOKEN_CLEANUP_2_DAYS))) // Unused for at least a year
        return refreshToken
    }

    /** Sends an email with the provided One-Time-Password Code to the provided email*/
    private async sendOTPEmail(email: string, otp: string, durationMinutes: string, codeName: string = 'Verification Code') {
        await sendEmail(email, `${codeName} - ${otp}`,
            `Your ${codeName} is ${otp}. This code will expire in ${durationMinutes} minutes.`,
            `<div style="font-family: sans-serif; text-align: center;">
                <p>Hi,</p>
                <p>Your ${codeName} is</p>
                <h1 style="letter-spacing: 1rem">${otp}</h1>
                <p><small><b>This code will expire in ${durationMinutes} minutes</b></small></p>
            </div>`
        )
    }

    /** Sends an OTP to the provided email and returns a hash, with the email as part of the hash data */
    public async beginSignup(email: string) {
        await this.ensureEmail(email)
        if (await findUserByEmail(email)) throw new PresentableError('EMAIL_IN_USE')
        const verificationData = await generateOTPAndHash(email, 6, Number.parseFloat(process.env.EMAIL_VERIFICATION_OTP_DURATION_MINUTES), process.env.GENERAL_VERIFICATION_KEY)
        await this.sendOTPEmail(email, verificationData.otp, process.env.EMAIL_VERIFICATION_OTP_DURATION_MINUTES, 'Email Verification Code')
        return { token: verificationData.fullHash }
    }
    /** Verifies the provided hash and OTP with the provided email, then creates a new user with the provided email and password */
    public async completeSignup(email: string, password: string, token: string, code: string) {
        if (!verifyOTP(email, token, code, process.env.GENERAL_VERIFICATION_KEY)) throw new PresentableError('INVALID_TOKEN')
        if (await findUserByEmail(email)) throw new PresentableError('EMAIL_IN_USE')
        await createUser(email, await this.checkAndHashPassword(password))
    }

    /** Sends an OTP to the provided email (if the specified user exists) and returns a hash, with the email and provided userId as part of the hashed data */
    public async beginChangeEmail(userId: number, password: string, newEmail: string) {
        await this.ensureEmail(newEmail)
        if (await findUserByEmail(newEmail)) throw new PresentableError('EMAIL_IN_USE')
        const user = await findUserById(userId)
        if (!user) throw new PresentableError('USER_NOT_FOUND')
        const auth = await bcrypt.compare(password, user.password)
        if (!auth) throw new PresentableError('WRONG_PASSWORD')
        if (user.email === newEmail.toLowerCase().trim()) throw new PresentableError('EMAIL_ALREADY_SET')
        const verificationData = await generateOTPAndHash(newEmail + userId.toString(), 6, Number.parseFloat(process.env.EMAIL_VERIFICATION_OTP_DURATION_MINUTES), process.env.GENERAL_VERIFICATION_KEY)
        await this.sendOTPEmail(newEmail, verificationData.otp, process.env.EMAIL_VERIFICATION_OTP_DURATION_MINUTES, 'Email Verification Code')
        return { token: verificationData.fullHash }
    }
    /** Verifies the provided hash and OTP with the provided email and userId, then updates the user with the new email */
    public async completeChangeEmail(userId: number, newEmail: string, token: string, code: string) {
        if (!verifyOTP(newEmail + userId.toString(), token, code, process.env.GENERAL_VERIFICATION_KEY)) throw new PresentableError('INVALID_TOKEN')
        if (await findUserByEmail(newEmail)) throw new PresentableError('EMAIL_IN_USE')
        await updateUserEmail(userId, newEmail)
    }

    /** Sends an OTP to the provided email (if the associated user exists) and returns a hash, with the email as part of the hash data */
    public async beginResetPassword(email: string) {
        const user = await findUserByEmail(email)
        if (!user) throw new PresentableError('USER_NOT_FOUND')
        const verificationData = await generateOTPAndHash(email, 6, Number.parseFloat(process.env.PASSWORD_RESET_OTP_DURATION_MINUTES), process.env.GENERAL_VERIFICATION_KEY)
        await this.sendOTPEmail(email, verificationData.otp, process.env.PASSWORD_RESET_OTP_DURATION_MINUTES, 'Password Reset Code')
        return { token: verificationData.fullHash }
    }
     /** Verifies the provided hash and OTP with the provided email, then updates the user with the provided password */
    public async completeResetPassword(email: string, password: string, token: string, code: string) {
        if (!verifyOTP(email.toString(), token, code, process.env.GENERAL_VERIFICATION_KEY)) throw new PresentableError('INVALID_TOKEN')
        const user = await findUserByEmail(email)
        if (!user) throw new PresentableError('USER_NOT_FOUND')
        await updateUser(user.id, { password: await this.checkAndHashPassword(password) })
    }

    /** Validates the provided email and password and returns a new refresh token and JWT for the associated user */
    public async login(email: string, password: string, ip: string, userAgent: string) {
        email = email.trim()
        const user = await findUserByEmail(email)
        if (!user) throw new PresentableError('INVALID_LOGIN')
        const auth = await bcrypt.compare(password, user.password)
        if (!auth) throw new PresentableError('INVALID_LOGIN')
        const refreshToken = await this.assignNewRefreshToken(user.id, ip, userAgent)
        return { token: createJWT({ id: user.id }, process.env.JWT_AUTH_KEY, Number.parseFloat(process.env.ACCESS_TOKEN_DURATION_MINUTES)), refreshToken }
    }

    /** Uses the provided refresh token to return a new JWT for the associated user */
    public async getAccessToken(refreshToken: string, ip: string, userAgent: string) {
        const user = await findUserByRefreshToken(refreshToken)
        if (!user) throw new PresentableError('INVALID_REFRESH_TOKEN')
        await updateRefreshToken(refreshToken, ip, userAgent)
        return { token: createJWT({ id: user.id }, process.env.JWT_AUTH_KEY, Number.parseFloat(process.env.ACCESS_TOKEN_DURATION_MINUTES)) }
    }

    /** Removes the provided refresh token (if it exists) from the associated user */
    public async revokeRefreshTokenByTokenString(refreshToken: string) {
        await removeRefreshTokenByTokenString(refreshToken)
    }

    /** Removes the specified refresh token (if it exists) from the specified user */
    public async revokeRefreshTokenByTokenId(tokenId: number, userId: number) {
        const result = await removeRefreshTokenByTokenId(tokenId)
        if (result.userId !== userId) throw new PresentableError('ITEM_NOT_FOUND')
    }

    /** Validates the provided email and password, then changes the associated user's password to the new one provided (optionally revokes refrehs tokens) */
    public async changePassword(userId: number, password: string, newPassword: string, revokeRefreshTokens: boolean, ip: string, userAgent: string) {
        const user = await findUserById(userId)
        if (!user) throw new PresentableError('USER_NOT_FOUND')
        const auth = await bcrypt.compare(password, user.password)
        if (!auth) throw new PresentableError('WRONG_PASSWORD')
        await updateUser(userId, { password: await this.checkAndHashPassword(newPassword) })
        if (revokeRefreshTokens) {
            await removeAllUserRefreshTokens(userId)
            return { refreshToken: await this.assignNewRefreshToken(userId, ip, userAgent) }
        }
    }
}
