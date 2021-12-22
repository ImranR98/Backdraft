import express from 'express'
import { Body, Controller, Header, Post, Request, Response, Route, SuccessResponse } from 'tsoa'
import { ClientErrorInterface } from '../interfaces/ClientErrorInterface'
import { authService } from '../services/authService'

@Route('/')
@Response<ClientErrorInterface>('4XX', 'User Error')
@Response<ClientErrorInterface>('5XX', 'Server Error')
export class RootController extends Controller {

    /** Create a new user and begin email verification. */
    @SuccessResponse('201', 'Verification email sent')
    @Post('signup')
    public async signup(
        @Body() { email, password, clientVerificationURL }: {
            /** The new user's email */
            email: string, 
            /** The new user's password */
            password: string, 
            /** The client application URL that the verification email will link the user to (with their email verification token as a query param) */
            clientVerificationURL: string
        },
    ): Promise<void> {
        this.setStatus(201)
        await new authService().signup(email, password, clientVerificationURL)
    }

    /** Complete an unverified user's email verification. */
    @SuccessResponse('204', 'Email verified')
    @Post('verify-email')
    public async verifyEmail(
        @Body() { emailVerificationToken }: {
            /** The email verification token received by the user */
            emailVerificationToken: string
        }
    ): Promise<void> {
        await new authService().verifyEmail(emailVerificationToken)
    }

    /** Generate an access token for a user who has provided valid credentials. */
    @Post('login')
    public async login(
        @Body() { email, password }: {
            /** The user's email */
            email: string,
            /** The user's password */
            password: string
        },
        @Request() req: express.Request,
        @Header('user-agent') userAgent?: string
    ): Promise<{ token: string, refreshToken: string }> {
        return await new authService().login(email, password, req.ip, userAgent || '')
    }

    /** Generate a new access token for a user who has provided a valid refresh token. */
    @Post('token')
    public async token(
        @Body() { refreshToken }: {
            /** A valid refresh token attached to the user's account */
            refreshToken: string
        },
        @Request() req: express.Request,
        @Header('user-agent') userAgent?: string
    ): Promise<{ token: string }> {
        return await new authService().getAccessToken(refreshToken, req.ip, userAgent || '')
    }

    /** Generate a password reset token for a user, and send them a reset email. */
    @SuccessResponse('204', 'Reset email sent')
    @Post('request-password-reset')
    public async requestPasswordReset(
        @Body() { email, clientVerificationURL }: {
            /** The user's email */
            email: string,
            /** The client application URL that the reset email will link the user to (with their password reset token as a query param) */
            clientVerificationURL: string
        },
    ): Promise<void> {
        await new authService().beginPasswordReset(email, clientVerificationURL)
    }

    /** Complete a user's password reset. */
    @SuccessResponse('204', 'Password changed')
    @Post('reset-password')
    public async resetPassword(
        @Body() { passwordResetToken, password }: {
            /** The password reset token received by the user */
            passwordResetToken: string,
            /** The user's new password */
            password: string
        },
    ): Promise<void> {
        await new authService().resetPassword(passwordResetToken, password)
    }

}
