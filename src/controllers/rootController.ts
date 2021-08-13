// src/users/usersController.ts
import express from 'express'
import { Body, BodyProp, Controller, Get, Header, Path, Post, Query, Request, Route, SuccessResponse } from 'tsoa'
import { authService } from '../services/authService'

@Route('/')
export class RootController extends Controller {

    @SuccessResponse('201', 'Created')
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
        @Header('user-agent') userAgent: string = ''
    ): Promise<{ token: string, refreshToken: string }> {
        return await new authService().login(email, password, req.ip, userAgent)
    }

    @Post('token')
    public async token(
        @Body() { refreshToken }: { refreshToken: string },
        @Request() req: express.Request
    ): Promise<{ token: string }> {
        return await new authService().token(refreshToken, req.ip, req.headers['user-agent'] || 'unknown')
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
