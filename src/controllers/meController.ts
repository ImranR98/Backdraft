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
        @Body() { tokenId }: { tokenId: string },
        @Request() req: any
    ): Promise<void> {
        await new authService().revokeRefreshToken(tokenId, req.user._id)
    }

    @Post('password')
    public async changePassword(
        @Body() { password, newPassword, revokeRefreshTokens }: { password: string, newPassword: string, revokeRefreshTokens?: boolean },
        @Request() req: express.Request,
    ): Promise<{ refreshToken: string } | void> {
        return await new authService().changePassword((<any>req).user._id, password, newPassword, revokeRefreshTokens || false, req.ip, req.headers['user-agent'] || 'unknown')
    }

    @Post('email')
    public async changeEmail(
        @Body() { password, email, clientVerificationURL }: { password: string, email: string, clientVerificationURL: string },
        @Request() req: express.Request
    ): Promise<void> {
        await new authService().changeEmail((<any>req).user._id, password, email, clientVerificationURL)
    }
}
