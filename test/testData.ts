import { User } from '@prisma/client'
import crypto from 'crypto'
import { addUserRefreshToken, createUser, findUserById } from '../src/db/userQueries'
import { createJWT } from '../src/helpers/cryptoHelpers'

export const email = 'person@example.com'
export const password = 'zoom4321'
export const hashedPassword = '$2b$10$k6boteiv7zGy7IhnsKOUlOUS4BgUWompJO.AGLUKnkrtKQm/zBIZu'

export const clientVerificationURL = `http://localhost:${process.env.PORT || 8080}/verify`

export const createTestUser = async (email: string) => {
    let user: User | null = await createUser(email, hashedPassword)
    const emailVerificationToken = createJWT({ id: user.id, email: user.email }, process.env.GENERAL_VERIFICATION_KEY, <any>process.env.EMAIL_VERIFICATION_OTP_DURATION_MINUTES)
    const passwordResetToken = createJWT({ userId: user.id }, user.password, <any>process.env.PASSWORD_RESET_OTP_DURATION_MINUTES)
    let [refreshToken, token] = ['', '']
    refreshToken = crypto.randomBytes(64).toString('hex')
    await addUserRefreshToken(user.id, refreshToken, '::ffff:127.0.0.1', '')
    token = createJWT({ id: user.id }, process.env.JWT_AUTH_KEY, <any>process.env.ACCESS_TOKEN_DURATION_MINUTES)
    user = await findUserById(user.id)
    return { user, emailVerificationToken, passwordResetToken, refreshToken, token }
}