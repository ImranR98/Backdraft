// src/users/usersController.ts
import express from 'express'
import { Body, BodyProp, Controller, Delete, Get, Header, Path, Post, Query, Request, Route, Security, SuccessResponse } from 'tsoa'
import { authService } from '../services/authService'

@Security("access_token")
@Route('/me')
export class MeController extends Controller {

    @Get('logins')
    public async logins(@Request() req: any) {
        return await new authService().logins(req.user._id)
    }

    @Delete('revoke-login')
    public async revokeLogin(
        @BodyProp('tokenId') tokenId: string,
        @Request() req: any
    ) {
        await new authService().revokeRefreshToken(tokenId, req.user._id)
    }

    @Post('change-password')
    public async changePassword(
        @BodyProp() password: string,
        @BodyProp() newPassword: string,
        @BodyProp() revokeRefreshTokens: boolean,
        @Request() req: express.Request,
        @Header('user-agent') userAgent: string = ''
    ) {
        return await new authService().changePassword((<any>req).user._id, password, newPassword, revokeRefreshTokens, req.ip, userAgent)
    }

    @Post('change-email')
    public async changeEmail(
        @BodyProp() password: string,
        @BodyProp() email: string,
        @Request() req: express.Request,
        @Header('host') hostUrl: string
    ) {
        return await new authService().changeEmail((<any>req).user._id, password, email, hostUrl)
    }
}
