// src/users/usersController.ts
import express from 'express'
import { Body, Controller, Delete, Get, Header, Post, Request, Response, Route, Security, SuccessResponse } from 'tsoa'
import { ClientErrorInterface } from '../interfaces/ClientErrorInterface'
import { ClientRefreshTokenInterface } from '../interfaces/ClientRefreshTokenInterface'
import { authService } from '../services/authService'

@Security("access_token")
@Route('/me')
@Response<ClientErrorInterface>('4XX', 'User Error')
@Response<ClientErrorInterface>('5XX', 'Server Error')
export class MeController extends Controller {

    /** Get a list of information about the refresh tokens ("logins") attached to the authenticated user's account. Does not return the actual tokens. */
    @Get('logins')
    public async logins(@Request() req: any): Promise<ClientRefreshTokenInterface[]> {
        return new authService().logins(req.user._id)
    }

    /** Delete a refresh token ("login") attached to the authenticated user's account. */
    @SuccessResponse('204', 'Login revoked')
    @Delete('logins')
    public async revokeLogin(
        @Body() { tokenId }: {
            /** The refresh token ID */
            tokenId: string
        },
        @Request() req: any
    ): Promise<void> {
        await new authService().revokeRefreshToken(tokenId, req.user._id)
    }

    /** Change the authenticated user's password, while optionally deleting any refresh tokens ("logins") attached to their account. */
    @Response('204', 'Ok')
    @Post('password')
    public async changePassword(
        @Body() { password, newPassword, revokeRefreshTokens }: {
            /** The user's current password */
            password: string,
            /** The user's new password */
            newPassword: string,
            /** Whether or not existing refresh tokens ("logins") attached to their account should be deleted; if true, a new refresh token is returned */
            revokeRefreshTokens?: boolean
        },
        @Request() req: express.Request,
        @Header('user-agent') userAgent?: string
    ): Promise<{ refreshToken: string } | void> {
        return await new authService().changePassword((<any>req).user._id, password, newPassword, revokeRefreshTokens || false, req.ip, userAgent || '')
    }

    /** Begin verification for a new email to replace the authenticated user's existing email. */
    @SuccessResponse('204', 'Verification email sent')
    @Post('email')
    public async changeEmail(
        @Body() { password, email, clientVerificationURL }: {
            /** The user's password */
            password: string,
            /** The user's new email */
            email: string,
            /** The client application URL that the verification email will link the user to (with their email verification token) */
            clientVerificationURL: string
        },
        @Request() req: express.Request
    ): Promise<void> {
        await new authService().changeEmail((<any>req).user._id, password, email, clientVerificationURL)
    }
}