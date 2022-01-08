// Provides functions related to authentication, and any user-related functions that have to do with credentials (email and password)

import { createUser, findUserById, findUserByEmail, findUserByRefreshToken, deleteUserByID, updateUser, updateUserEmail, addUserRefreshToken, removeOldUserRefreshTokens, updateRefreshToken, removeRefreshTokenByTokenId, removeRefreshTokenByTokenString, removeAllUserRefreshTokens } from '../db/userQueries'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { PresentableError } from '../helpers/clientErrorHelper'
import { sendEmail } from '../helpers/emailHelpers'
import { createJWT, decodeJWT, verifyAndDecodeJWT } from '../helpers/jwtHelpers'
import { URL } from 'url'

export class authService {
    private isPasswordValid = (password: string) => password.length >= 6

    private async checkAndHashPassword(password: string) {
        if (!this.isPasswordValid(password)) throw new PresentableError('INVALID_PASSWORD')
        const salt = await bcrypt.genSalt()
        return await bcrypt.hash(password, salt)
    }

    private async ensureURL(url: string) {
        try {
            new URL(url)
        } catch {
            throw new PresentableError('VALIDATION_ERROR', 'Invalid URL')
        }
    }

    private async ensureEmail(email: string) {
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
        if (!emailRegex.test(email)) throw new PresentableError('VALIDATION_ERROR', 'Not a valid email')
    }

    private async assignNewRefreshToken(userId: number, ip: string, userAgent: string) {
        const refreshToken = crypto.randomBytes(64).toString('hex')
        await addUserRefreshToken(userId, refreshToken, ip, userAgent)
        await removeOldUserRefreshTokens(userId, new Date((new Date()).valueOf() - 1000 * 60 * 60 * 24 * Number.parseFloat(process.env.REFRESH_TOKEN_CLEANUP_1_DAYS)), ip, userAgent) // Unused for at least 30 days and from the same IP, user-agent
        await removeOldUserRefreshTokens(userId, new Date((new Date()).valueOf() - 1000 * 60 * 60 * 24 * Number.parseFloat(process.env.REFRESH_TOKEN_CLEANUP_2_DAYS))) // Unused for at least a year
        return refreshToken
    }

    private async prepareForEmailVerification(email: string, userId: number | null = null) {
        const existingEmailUser = await findUserByEmail(email)
        if (existingEmailUser) {
            if (userId === existingEmailUser.id) {
                if (existingEmailUser.verified)
                    throw new PresentableError('ALREADY_VERIFIED')
            } else {
                if (existingEmailUser.verified)
                    throw new PresentableError('EMAIL_IN_USE')
                else
                    await deleteUserByID(existingEmailUser.id)
            }
        }
    }

    private async beginEmailVerification(userId: number, email: string, verificationUrl: string) {
        const verificationToken = createJWT({ id: userId, email }, process.env.JWT_EMAIL_VERIFICATION_KEY, Number.parseFloat(process.env.EMAIL_VERIFICATION_TOKEN_DURATION_MINUTES))
        await updateUserEmail(userId, email, false)
        const link = `${verificationUrl}?emailVerificationToken=${verificationToken}`
        await sendEmail(email, 'Email Verification Link',
            `To verify this email, go to ${link}. This will expire in ${process.env.EMAIL_VERIFICATION_TOKEN_DURATION_MINUTES} minutes.`,
            `<p>Hi, thanks for signing up!</p>
<p>Click <a href="${link}">here</a> to verify your email. The link will expire in ${process.env.EMAIL_VERIFICATION_TOKEN_DURATION_MINUTES} minutes.</p>
<p><small><b>If that doesn't work, paste the following link into your browser: <a href="${link}">${link}</a></b></small></p>`
        )
    }

    public async signup(email: string, password: string, verificationUrl: string) {
        await this.ensureEmail(email)
        await this.ensureURL(verificationUrl)
        await this.prepareForEmailVerification(email)
        const user = await createUser(email, await this.checkAndHashPassword(password))
        await this.beginEmailVerification(user.id, email.trim(), verificationUrl)
    }

    public async changeEmail(userId: number, password: string, newEmail: string, verificationUrl: string) {
        await this.ensureEmail(newEmail)
        await this.ensureURL(verificationUrl)
        newEmail = newEmail.trim()
        const user = await findUserById(userId)
        if (!user) throw new PresentableError('USER_NOT_FOUND')
        const auth = await bcrypt.compare(password, user.password)
        if (!auth) throw new PresentableError('WRONG_PASSWORD')
        if (user.email === newEmail.toLowerCase().trim()) throw new PresentableError('EMAIL_ALREADY_SET')
        await this.prepareForEmailVerification(newEmail, userId)
        await this.beginEmailVerification(userId, newEmail, verificationUrl)
    }

    public async verifyEmail(emailVerificationToken: string) {
        let data: any = null
        try {
            data = verifyAndDecodeJWT(emailVerificationToken, process.env.JWT_EMAIL_VERIFICATION_KEY)
        } catch (err) {
            throw new PresentableError('INVALID_TOKEN')
        }
        if (!data.id || !data.email) throw new PresentableError('INVALID_TOKEN')
        const user = await findUserById(data.id)
        if (!user) throw new PresentableError('INVALID_TOKEN')
        await updateUserEmail(user.id, data.email, true)
    }

    public async login(email: string, password: string, ip: string, userAgent: string) {
        email = email.trim()
        const user = await findUserByEmail(email)
        if (!user) throw new PresentableError('INVALID_LOGIN')
        const auth = await bcrypt.compare(password, user.password)
        if (!auth) throw new PresentableError('INVALID_LOGIN')
        if (!user.verified) throw new PresentableError('NOT_VERIFIED')
        const refreshToken = await this.assignNewRefreshToken(user.id, ip, userAgent)
        return { token: createJWT({ id: user.id }, process.env.JWT_AUTH_KEY, Number.parseFloat(process.env.ACCESS_TOKEN_DURATION_MINUTES)), refreshToken }
    }

    public async getAccessToken(refreshToken: string, ip: string, userAgent: string) {
        const user = await findUserByRefreshToken(refreshToken)
        if (!user) throw new PresentableError('INVALID_REFRESH_TOKEN')
        await updateRefreshToken(refreshToken, ip, userAgent)
        return { token: createJWT({ id: user.id }, process.env.JWT_AUTH_KEY, Number.parseFloat(process.env.ACCESS_TOKEN_DURATION_MINUTES)) }
    }

    public async revokeRefreshTokenByTokenString(refreshToken: string) {
        await removeRefreshTokenByTokenString(refreshToken)
    }

    public async revokeRefreshTokenByTokenId(tokenId: number, userId: number) {
        const result = await removeRefreshTokenByTokenId(tokenId)
        if (result.userId !== userId) throw new PresentableError('ITEM_NOT_FOUND')
    }

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

    public async beginPasswordReset(email: string, verificationUrl: string) {
        await this.ensureURL(verificationUrl)
        const user = await findUserByEmail(email)
        if (!user) throw new PresentableError('USER_NOT_FOUND')
        const passwordToken = createJWT({ userId: user.id }, user.password, Number.parseFloat(process.env.PASSWORD_RESET_TOKEN_DURATION_MINUTES))
        const link = `${verificationUrl}?passwordResetToken=${passwordToken}`
        await sendEmail(email, 'Password Reset Link',
            `To verify this email, go to ${link}. This will expire in ${process.env.PASSWORD_RESET_TOKEN_DURATION_MINUTES} minutes.`,
            `<p>Hi, thanks for signing up!</p>
<p>Click <a href="${link}">here</a> to reset your password. The link will expire in ${process.env.PASSWORD_RESET_TOKEN_DURATION_MINUTES} minutes.</p>
<p><small><b>If that doesn't work, paste the following link into your browser: <a href="${link}">${link}</a></b></small></p>`
        )
    }

    public async resetPassword(passwordResetToken: string, password: string) {
        let userId = null
        try {
            let data: any = decodeJWT(passwordResetToken)
            if (!data.userId) throw null
            const user = await findUserById(data.userId)
            if (!user) throw null
            verifyAndDecodeJWT(passwordResetToken, user.password)
            userId = user.id
        } catch (err) {
            throw new PresentableError('INVALID_TOKEN')
        }
        await updateUser(userId, { password: await this.checkAndHashPassword(password), verified: true })
    }
}
