// Functions to generate test data for testing
// ONLY USE THESE FUNCTIONS FOR TESTING

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

/** Create a user with the provided email and add it to the DB, returning the user object and a refresh token - to be used for testing */
export const createTestUser = async (email: string) => {
    let user: User | null = await createUser(email, hashedPassword)
    let refreshToken = ''
    refreshToken = crypto.randomBytes(64).toString('hex')
    await addUserRefreshToken(user.id, refreshToken, '::ffff:127.0.0.1', '')
    user = await findUserById(user.id)
    return { user, refreshToken }
}

/** Generate a JWT for the given user ID - to be used for testing */
export const generateTestUserJWT = (userId: number) => createJWT({ id: userId }, process.env.JWT_AUTH_KEY, <any>process.env.ACCESS_TOKEN_DURATION_MINUTES)
/** Generate an OTP and return it and the hash using the given email (and user ID if applicable) - to be used for testing */
export const generateTestUserOTP = async (email: string, type: 'signup' | 'email' | 'password', userId: number = -1) => await generateOTPAndHash(`${type === 'email' ? email + userId.toString() : email}.${type}`, 6, Number.parseFloat(process.env.OTP_DURATION_MINUTES), process.env.GENERAL_VERIFICATION_KEY)