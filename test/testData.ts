import { User } from '@prisma/client'
import crypto from 'crypto'
import { addUserRefreshToken, createUser, findUserById } from '../src/db/userQueries'
import { createJWT, generateOTPAndHash } from '../src/helpers/cryptoHelpers'

export const email = 'person@example.com'
export const password = 'zoom4321'
export const hashedPassword = '$2b$10$k6boteiv7zGy7IhnsKOUlOUS4BgUWompJO.AGLUKnkrtKQm/zBIZu'
export const newEmail = 'a' + email
export const newPassword = 'a' + password

export const clientVerificationURL = `http://localhost:${process.env.PORT || 8080}/verify`

export const createTestUser = async (email: string) => {
    let user: User | null = await createUser(email, hashedPassword)
    let refreshToken = ''
    refreshToken = crypto.randomBytes(64).toString('hex')
    await addUserRefreshToken(user.id, refreshToken, '::ffff:127.0.0.1', '')
    user = await findUserById(user.id)
    return { user, refreshToken }
}

export const generateTestUserJWT = (userId: number) => createJWT({ id: userId }, process.env.JWT_AUTH_KEY, <any>process.env.ACCESS_TOKEN_DURATION_MINUTES)
export const generateTestUserOTP = async (email: string, type: 'signup' | 'email' | 'password', userId: number = -1) => await generateOTPAndHash(`${type === 'email' ? email + userId.toString() : email}.${type}`, 6, Number.parseFloat(process.env.OTP_DURATION_MINUTES), process.env.GENERAL_VERIFICATION_KEY)