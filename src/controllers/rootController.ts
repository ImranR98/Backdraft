// src/users/usersController.ts
import express from 'express'
import { Body, Controller, Header, Post, Request, Response, Route, SuccessResponse } from 'tsoa'
import { authService } from '../services/authService'

@Route('/')
@Response(422, 'Validation failed')
export class RootController extends Controller {

    @SuccessResponse('201', 'Sent verification email')
    @Post('signup')
    public async signup(
        @Body() { email, password, clientVerificationURL }: { email: string, password: string, clientVerificationURL: string },
    ): Promise<void> {
        this.setStatus(201)
        await new authService().signup(email, password, clientVerificationURL)
    }

    @Post('verify-email')
    public async verifyEmail(
        @Body() { emailVerificationToken }: { emailVerificationToken: string }
    ): Promise<void> {
        await new authService().verifyEmail(emailVerificationToken)
    }

    @Post('login')
    public async login(
        @Body() { email, password }: { email: string, password: string },
        @Request() req: express.Request,
        @Header('user-agent') userAgent?: string
    ): Promise<{ token: string, refreshToken: string }> {
        return await new authService().login(email, password, req.ip, userAgent || '')
    }

    @Post('token')
    public async token(
        @Body() { refreshToken }: { refreshToken: string },
        @Request() req: express.Request,
        @Header('user-agent') userAgent?: string
    ): Promise<{ token: string }> {
        return await new authService().token(refreshToken, req.ip, userAgent || '')
    }

    @Post('request-password-reset')
    public async requestPasswordReset(
        @Body() { email, clientVerificationURL }: { email: string, clientVerificationURL: string },
    ): Promise<void> {
        await new authService().beginPasswordReset(email, clientVerificationURL)
    }

    @Post('reset-password')
    public async resetPassword(
        @Body() { passwordResetToken, password }: { passwordResetToken: string, password: string },
    ): Promise<void> {
        await new authService().resetPassword(passwordResetToken, password)
    }

}
