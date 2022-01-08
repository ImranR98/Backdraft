import express from 'express'
import { Body, Controller, Delete, Get, Header, Path, Put, Request, Response, Route, Security, SuccessResponse } from 'tsoa'
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
        this.setStatus(revokeRefreshTokens ? 200 : 204 )
        return await new authService().changePassword((<any>req).user.id, password, newPassword, revokeRefreshTokens || false, req.ip, userAgent || '')
    }

    /** Begin verification for a new email to replace the authenticated user's existing email. */
    @SuccessResponse('204', 'Verification email sent')
    @Put('email')
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
        this.setStatus(204)
        await new authService().changeEmail((<any>req).user.id, password, email, clientVerificationURL)
    }
}
