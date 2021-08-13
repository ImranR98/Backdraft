import { createUser, findUserById, findUserByEmail, findUserByRefreshToken, deleteUserByID, updateUser, updateUserEmail, addUserRefreshToken, removeOldUserRefreshTokens, updateUserRefreshToken, removeUserRefreshToken } from '../db/User'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { PresentableError } from '../presentableErrors'
import { sendEmail } from '../helpers/emailHelpers'
import { createJWT, decodeJWT, verifyAndDecodeJWT } from '../helpers/jwtHelpers'

import { IUser } from "../interfaces/IUser"
import { IRefreshToken } from '../interfaces/IRefreshToken'

export class authService {
    private isPasswordValid = (password: string) => password.length >= 6

    private async checkAndHashPassword(password: string) {
        if (!this.isPasswordValid(password)) throw new PresentableError(8)
        const salt = await bcrypt.genSalt()
        return await bcrypt.hash(password, salt)
    }

    private async assignNewRefreshToken(userId: string, ip: string, userAgent: string) {
        const refreshToken = crypto.randomBytes(64).toString('hex')
        await addUserRefreshToken(userId, refreshToken, ip, userAgent)
        await removeOldUserRefreshTokens(userId, new Date((new Date()).valueOf() - 1000 * 60 * 60 * 24 * process.env.REFRESH_TOKEN_CLEANUP_1_DAYS), ip, userAgent) // Unused for at least 30 days and from the same IP, user-agent
        await removeOldUserRefreshTokens(userId, new Date((new Date()).valueOf() - 1000 * 60 * 60 * 24 * process.env.REFRESH_TOKEN_CLEANUP_2_DAYS)) // Unused for at least a year
        return refreshToken
    }

    private async prepareForEmailVerification(email: string, userId: string | null = null) {
        const existingEmailUser = await findUserByEmail(email)
        if (existingEmailUser) {
            if (userId === existingEmailUser._id.toString()) {
                if (existingEmailUser.verified)
                    throw new PresentableError(10)
            } else {
                if (existingEmailUser.verified)
                    throw new PresentableError(12)
                else
                    await deleteUserByID(existingEmailUser._id.toString())
            }
        }
    }

    private async beginEmailVerification(userId: string, email: string, hostUrl: string) {
        const verificationToken = createJWT({ _id: userId, email }, process.env.JWT_EMAIL_VERIFICATION_KEY, process.env.EMAIL_VERIFICATION_TOKEN_DURATION_MINUTES)
        await updateUserEmail(userId, email, false)
        const link = `${hostUrl}/verify-email/${verificationToken}`
        await sendEmail(email, 'Email Verification Link',
            `To verify this email, go to ${link}. This will expire in ${process.env.EMAIL_VERIFICATION_TOKEN_DURATION_MINUTES} minutes.`,
            `<p>Hi, thanks for signing up!</p>
<p>Click <a href="${link}">here</a> to verify your email. The link will expire in ${process.env.EMAIL_VERIFICATION_TOKEN_DURATION_MINUTES} minutes.</p>
<p><small><b>If that doesn't work, paste the following link into your browser: <a href="${link}">${link}</a></b></small></p>`
        )
    }

    public get(email: string, password: string): Omit<IUser, '_id'> {
        return {
            email,
            password,
            verified: false,
            refreshTokens: []
        }
    }

    public async signup(email: string, password: string, hostUrl: string) {
        await this.prepareForEmailVerification(email)
        const user = await createUser(email, await this.checkAndHashPassword(password))
        await this.beginEmailVerification(user._id.toString(), email.trim(), hostUrl)
    }

    public async changeEmail(userId: string, password: string, newEmail: string, hostUrl: string) {
        newEmail = newEmail.trim()
        const user = await findUserById(userId)
        if (!user) throw new PresentableError(5)
        const auth = await bcrypt.compare(password, user.password)
        if (!auth) throw new PresentableError(7)
        if (user.email === newEmail.toLowerCase().trim()) throw new PresentableError(13)
        await this.prepareForEmailVerification(newEmail, userId)
        await this.beginEmailVerification(userId, newEmail, hostUrl)
    }

    public async verifyEmail(emailVerificationToken: string) {
        let data: any = null
        try {
            data = verifyAndDecodeJWT(emailVerificationToken, process.env.JWT_EMAIL_VERIFICATION_KEY)
        } catch (err) {
            throw new PresentableError(9)
        }
        if (!data._id || !data.email) throw new PresentableError(9)
        const user = await findUserById(data._id)
        if (!user) throw new PresentableError(9)
        await updateUserEmail(user._id.toString(), data.email, true)
    }

    public async login(email: string, password: string, ip: string, userAgent: string) {
        email = email.trim()
        const user = await findUserByEmail(email)
        if (!user) throw new PresentableError(2)
        const auth = await bcrypt.compare(password, user.password)
        if (!auth) throw new PresentableError(2)
        if (user.pendingVerification) if (user.pendingVerification.email === email) throw new PresentableError(11)
        const refreshToken = await this.assignNewRefreshToken(user._id.toString(), ip, userAgent)
        return { token: createJWT({ _id: user._id.toString() }, process.env.JWT_AUTH_KEY, process.env.ACCESS_TOKEN_DURATION_MINUTES), refreshToken }
    }

    public async token(refreshToken: string, ip: string, userAgent: string) {
        const user = await findUserByRefreshToken(refreshToken)
        if (!user) throw new PresentableError(4)
        await updateUserRefreshToken(user._id.toString(), refreshToken, ip, userAgent)
        return { token: createJWT({ _id: user._id.toString() }, process.env.JWT_AUTH_KEY, process.env.ACCESS_TOKEN_DURATION_MINUTES) }
    }

    public async logins(userId: string) {
        const user = await findUserById(userId)
        if (!user) throw new PresentableError(5)
        const RTs: IRefreshToken[] = user.refreshTokens
        const logins: Omit<IRefreshToken, 'refreshToken'>[] = []
        for (let i = 0; i < RTs.length; i++) {
            logins.push({ _id: RTs[i]._id.toString(), ip: RTs[i].ip, userAgent: RTs[i].userAgent, date: RTs[i].date })
        }
        return logins
    }

    public async revokeRefreshToken(tokenId: string, userId: string) {
        if (!await removeUserRefreshToken(userId, tokenId)) throw new PresentableError(6)
    }

    public async changePassword(userId: string, password: string, newPassword: string, revokeRefreshTokens: boolean, ip: string, userAgent: string) {
        const user = await findUserById(userId)
        if (!user) throw new PresentableError(5)
        const auth = await bcrypt.compare(password, user.password)
        if (!auth) throw new PresentableError(7)
        let changes: any = { password: await this.checkAndHashPassword(newPassword) }
        if (revokeRefreshTokens) changes.refreshTokens = []
        await updateUser(userId, changes)
        if (revokeRefreshTokens) return { refreshToken: await this.assignNewRefreshToken(userId, ip, userAgent) }
    }

    public async beginPasswordReset(email: string, hostUrl: string) {
        const user = await findUserByEmail(email)
        if (!user) throw new PresentableError(5)
        const passwordToken = createJWT({ userId: user._id.toString() }, user.password, process.env.PASSWORD_RESET_TOKEN_DURATION_MINUTES)
        const link = `${hostUrl}/reset-password/${passwordToken}`
        await sendEmail(email, 'Password Reset Link',
            `To verify this email, go to ${link}. This will expire in ${process.env.PASSWORD_RESET_TOKEN_DURATION_MINUTES} minutes.`,
            `<p>Hi, thanks for signing up!</p>
<p>Click <a href="${link}">here</a> to verify your email. The link will expire in ${process.env.PASSWORD_RESET_TOKEN_DURATION_MINUTES} minutes.</p>
<p><small><b>If that doesn't work, paste the following link into your browser: <a href="${link}">${link}</a></b></small></p>`
        )
    }

    public async resetPassword(passwordResetToken: string, newPassword: string) {
        let userId = ''
        try {
            let data: any = decodeJWT(passwordResetToken)
            if (!data.userId) throw null
            const user = await findUserById(data.userId)
            if (!user) throw null
            verifyAndDecodeJWT(passwordResetToken, user.password)
            userId = user._id.toString()
        } catch (err) {
            throw new PresentableError(14)
        }
        await updateUser(userId, { password: await this.checkAndHashPassword(newPassword), verified: true })
    }
}
