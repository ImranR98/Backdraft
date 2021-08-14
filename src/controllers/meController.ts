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

    @Get('logins')
    public async logins(@Request() req: any): Promise<ClientRefreshTokenInterface[]> {
        return new authService().logins(req.user._id)
    }

    @SuccessResponse('204', 'Login revoked')
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
        @Header('user-agent') userAgent?: string
    ): Promise<{ refreshToken: string } | void> {
        return await new authService().changePassword((<any>req).user._id, password, newPassword, revokeRefreshTokens || false, req.ip, userAgent || '')
    }

    @SuccessResponse('204', 'Verification email sent')
    @Post('email')
    public async changeEmail(
        @Body() { password, email, clientVerificationURL }: { password: string, email: string, clientVerificationURL: string },
        @Request() req: express.Request
    ): Promise<void> {
        await new authService().changeEmail((<any>req).user._id, password, email, clientVerificationURL)
    }
}
