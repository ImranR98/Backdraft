import express from 'express'
import { Body, Controller, Delete, Get, Header, Path, Post, Put, Request, Response, Route, Security, SuccessResponse } from 'tsoa'
import { ClientErrorInterface } from '../interfaces/ClientErrorInterface'
import { ClientUserInterface } from '../interfaces/ClientUserInterface'
import { authService } from '../services/authService'
import { userService } from '../services/userService'

@Security("access_token")
@Route('/me')
@Response<ClientErrorInterface>('401', 'Invalid access or refresh token')
@Response<ClientErrorInterface>('4XX', 'User Error')
@Response<ClientErrorInterface>('5XX', 'Server Error')
export class MeController extends Controller {

    /** Get account information for the authenticated user, including a list of info about each refresh token ("login") attached to their account. Does not return the actual refresh tokens. */
    @SuccessResponse('200', 'Ok')
    @Get()
    public async me(@Request() req: express.Request): Promise<ClientUserInterface> {
        return await new userService().me((<any>req).user.id)
    }

    /** Delete a refresh token ("login") attached to the authenticated user's account.
     * @param tokenId The refresh token ID
    */
    @SuccessResponse('204', 'Login revoked')
    @Delete('logins/{tokenId}')
    public async revokeLogin(
        @Path() tokenId: number,
        @Request() req: express.Request
    ): Promise<void> {
        this.setStatus(204)
        await new authService().revokeRefreshTokenByTokenId(tokenId, (<any>req).user.id)
    }

    /** Change the authenticated user's password, while optionally deleting any refresh tokens ("logins") attached to their account. */
    @SuccessResponse('200/204', 'Password changed (and possibly, new refresh token generated while all others revoked)')
    @Put('password')
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
        this.setStatus(revokeRefreshTokens ? 200 : 204)
        return await new authService().changePassword((<any>req).user.id, password, newPassword, revokeRefreshTokens || false, req.ip, userAgent || '')
    }

    /** Begin the email change process by sending a verification code to the user's new email and returning an associated token. */
    @SuccessResponse('200', 'Verification email sent and associated token generated')
    @Post('email/begin-change')
    public async beginChangeEmail(
        @Body() { email, password }: {
            /** The user's password */
            password: string
            /** The user's new email */
            email: string
        },
        @Request() req: express.Request
    ): Promise<{ token: string }> {
        this.setStatus(200)
        return new authService().beginChangeEmail((<any>req).user.id, password, email)
    }

    /** Complete a user's signup by verifying that the provided verification code matches the email and token*/
    @SuccessResponse('204', 'Sign up complete')
    @Post('email/complete-change')
    public async completeChangeEmail(
        @Body() { email, token, code }: {
            /** The user's new email */
            email: string
            /** The token generated when the user began the email change process */
            token: string
            /** The email verification code received by the user */
            code: string
        },
        @Request() req: express.Request
    ): Promise<void> {
        this.setStatus(204)
        await new authService().completeChangeEmail((<any>req).user.id, email, token, code)
    }
}
