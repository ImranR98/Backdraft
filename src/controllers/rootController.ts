// src/users/usersController.ts
import express from 'express'
import { Body, BodyProp, Controller, Get, Header, Path, Post, Query, Request, Route, SuccessResponse } from 'tsoa'
import { authService } from '../services/authService'

@Route('/')
export class RootController extends Controller {

    @SuccessResponse('201', 'Created')
    @Post('signup')
    public async signup(
        @BodyProp() email: string,
        @BodyProp() password: string,
        @Header('host') hostUrl: string
    ): Promise<void> {
        this.setStatus(201)
        await new authService().signup(email, password, hostUrl)
    }

    @Post('verify-email')
    public async verifyEmail(
        @BodyProp() emailVerificationToken: string
    ): Promise<void> {
        await new authService().verifyEmail(emailVerificationToken)
    }

    @Post('login')
    public async login(
        @BodyProp() email: string,
        @BodyProp() password: string,
        @Request() req: express.Request,
        @Header('user-agent') userAgent: string = ''
    ): Promise<{ token: string, refreshToken: string }> {
        return await new authService().login(email, password, req.ip, userAgent)
    }

    @Post('token')
    public async token(
        @BodyProp() refreshToken: string,
        @Request() req: express.Request,
        @Header('user-agent') userAgent: string = ''
    ): Promise<{ token: string }> {
        return await new authService().token(refreshToken, req.ip, userAgent)
    }

    @Post('request-password-reset')
    public async requestPasswordReset(
        @BodyProp() email: string,
        @Header('host') hostUrl: string
    ): Promise<void> {
        await new authService().beginPasswordReset(email, hostUrl)
    }

    @Post('reset-password')
    public async resetPassword(
        @BodyProp() passwordResetToken: string,
        @BodyProp() password: string
    ): Promise<void> {
        await new authService().resetPassword(passwordResetToken, password)
    }

}
