import express from 'express'
import { Body, Controller, Header, Post, Request, Response, Route, SuccessResponse, Security } from 'tsoa'
import { ClientErrorInterface } from '../interfaces/ClientErrorInterface'
import { authService } from '../services/authService'

@Route('/')
@Response<ClientErrorInterface>('4XX', 'User Error')
@Response<ClientErrorInterface>('5XX', 'Server Error')
export class RootController extends Controller {

    /** Begin the signup process by sending a verification code to the user's email and returning an associated token. */
    @SuccessResponse('200', 'Verification email sent and associated token generated')
    @Post('signup/begin')
    public async beginSignup(
        @Body() { email }: {
            /** The new user's email */
            email: string
        },
    ): Promise<{ token: string }> {
        this.setStatus(200)
        return await new authService().beginSignup(email)
    }

    /** Complete a user's signup by verifying that the provided verification code matches the email and token*/
    @SuccessResponse('201', 'Sign up complete')
    @Post('signup/complete')
    public async completeSignup(
        @Body() { email, password, token, code }: {
            /** The new user's email */
            email: string
            /** The new user's password */
            password: string
            /** The token generated when the user began the sign up process */
            token: string
            /** The email verification code received by the user */
            code: string
        }
    ): Promise<void> {
        this.setStatus(201)
        await new authService().completeSignup(email, password, token, code)
    }

    /** Begin the password reset process by sending a verification code to the user's email and returning an associated token. */
    @SuccessResponse('200', 'Reset email sent and associated token generated')
    @Post('reset-password-begin')
    public async beginResetPassword(
        @Body() { email }: {
            /** The user's email */
            email: string
        },
    ): Promise<{ token: string }> {
        this.setStatus(200)
        return await new authService().beginResetPassword(email)
    }

    /** Complete a user's password reset by verifying that the provided verification code matches the email and token*/
    @SuccessResponse('200', 'Password reset')
    @Post('reset-password-complete')
    public async completeResetPassword(
        @Body() { email, password, token, code }: {
            /** The user's email */
            email: string
            /** The user's new password */
            password: string
            /** The token generated when the user began the password reset process */
            token: string
            /** The password reset code received by the user */
            code: string
        }
    ): Promise<void> {
        this.setStatus(200)
        await new authService().completeResetPassword(email, password, token, code)
    }

    /** Generate an access token for a user who has provided valid credentials. */
    @SuccessResponse('200', 'New access and refresh tokens generated')
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
        this.setStatus(200)
        return await new authService().login(email, password, req.ip, userAgent || '')
    }

    /** Revoke the refresh token sent with this request (if it exists and is attached to the authenticated user's account). */
    @Security("access_token")
    @SuccessResponse('200', 'Logged out - refresh token revoked')
    @Post('logout')
    public async logout(
        @Body() { refreshToken }: {
            /** A valid refresh token attached to the user's account */
            refreshToken: string
        },
        @Request() req: express.Request,
    ): Promise<void> {
        this.setStatus(200)
        return await new authService().revokeRefreshTokenByTokenString(refreshToken)
    }

    /** Generate a new access token for a user who has provided a valid refresh token. */
    @SuccessResponse('200', 'New access token generated')
    @Post('token')
    public async token(
        @Body() { refreshToken }: {
            /** A valid refresh token attached to the user's account */
            refreshToken: string
        },
        @Request() req: express.Request,
        @Header('user-agent') userAgent?: string
    ): Promise<{ token: string }> {
        this.setStatus(200)
        return await new authService().getAccessToken(refreshToken, req.ip, userAgent || '')
    }

}
