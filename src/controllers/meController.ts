// src/users/usersController.ts
import express from 'express'
import { Body, BodyProp, Controller, Delete, Get, Header, Path, Post, Query, Request, Route, Security, SuccessResponse } from 'tsoa'
import { IRefreshToken } from '../interfaces/IRefreshToken'
import { authService } from '../services/authService'

@Security("access_token")
@Route('/me')
export class MeController extends Controller {

    @Get('logins')
    public async logins(@Request() req: any): Promise<Omit<IRefreshToken, 'refreshToken'>[]> {
        return new authService().logins(req.user._id)
    }

    @Delete('logins')
    public async revokeLogin(
        @BodyProp('tokenId') tokenId: string,
        @Request() req: any
    ): Promise<void> {
        await new authService().revokeRefreshToken(tokenId, req.user._id)
    }

    @Post('password')
    public async changePassword(
        @BodyProp() password: string,
        @BodyProp() newPassword: string,
        @BodyProp() revokeRefreshTokens: boolean,
        @Request() req: express.Request,
        @Header('user-agent') userAgent: string = ''
    ): Promise<{ refreshToken: string } | void> {
        return await new authService().changePassword((<any>req).user._id, password, newPassword, revokeRefreshTokens, req.ip, userAgent)
    }

    @Post('email')
    public async changeEmail(
        @BodyProp() password: string,
        @BodyProp() email: string,
        @Request() req: express.Request,
        @Header('client-url') hostUrl: string
    ): Promise<void> {
        await new authService().changeEmail((<any>req).user._id, password, email, hostUrl)
    }
}
