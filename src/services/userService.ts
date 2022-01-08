// Provides all user-related functions except those in authService

import { findUserById } from '../db/userQueries'
import { PresentableError } from '../helpers/clientErrorHelper'

import { ClientRefreshTokenInterface } from '../interfaces/ClientRefreshTokenInterface'
import { ClientUserInterface } from '../interfaces/ClientUserInterface'

export class userService {

    public async me(userId: number) {
        const user = await findUserById(userId)
        if (!user) throw new PresentableError('USER_NOT_FOUND')
        const clientLogins: ClientRefreshTokenInterface[] = []
        for (let i = 0; i < user.refreshTokens.length; i++) {
            clientLogins.push({ id: user.refreshTokens[i].id, ip: user.refreshTokens[i].ip, userAgent: user.refreshTokens[i].userAgent, date: user.refreshTokens[i].date })
        }
        const returnedUser: ClientUserInterface = {
            id: user.id,
            email: user.email,
            verified: user.verified,
            refreshTokens: clientLogins
        }
        return returnedUser
    }

}
