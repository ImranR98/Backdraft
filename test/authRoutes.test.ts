// Tests for API endpoints in authRoutes

import { expect } from 'chai'
import request from 'supertest'
import crypto from 'crypto'

import { app } from '../src/app'

import { addUserRefreshToken, createUser, findUserById } from '../src/db/User'

import { createJWT } from '../src/helpers/jwtHelpers'

// Test user data
const email = 'person@example.com'
const password = 'zoom4321'
const hashedPassword = '$2b$10$k6boteiv7zGy7IhnsKOUlOUS4BgUWompJO.AGLUKnkrtKQm/zBIZu'

const createTestUser = async (email: string, verified: boolean = true) => {
    let user = await createUser(email, hashedPassword, verified)
    const emailVerificationToken = createJWT({ id: user._id, email: user.email }, process.env.JWT_EMAIL_VERIFICATION_KEY, process.env.EMAIL_VERIFICATION_TOKEN_DURATION_MINUTES)
    const passwordResetToken = createJWT({ userId: user._id }, user.password, process.env.PASSWORD_RESET_TOKEN_DURATION_MINUTES)
    let [refreshToken, token] = ['', '']
    if (verified) {
        refreshToken = crypto.randomBytes(64).toString('hex')
        await addUserRefreshToken(user._id, refreshToken, '::ffff:127.0.0.1', '')
        token = createJWT({ id: user._id }, process.env.JWT_AUTH_KEY, process.env.ACCESS_TOKEN_DURATION_MINUTES)
    }
    user = await findUserById(user._id)
    return { user, emailVerificationToken, passwordResetToken, refreshToken, token }
}

describe('Authentication related API tests', function () {
    describe('When the DB is empty', function () {
        describe('Sign up', function () {
            this.timeout('50000')
            it('With valid credentials', function (done) {
                request(app).post('/api/signup').send({ email, password }).then((res) => {
                    expect(res.status).to.equal(201)
                    done()
                }).catch((err) => done(err))
            })
            it('With an invalid email', function (done) {
                request(app).post('/api/signup').send({ email: 'whoops', password }).then((res) => {
                    expect(res.status).to.equal(422)
                    expect(res.body).to.contain({ code: 'VALIDATION_ERROR' })
                    done()
                }).catch((err) => done(err))
            })
            it('With an invalid password', function (done) {
                request(app).post('/api/signup').send({ email, password: '123' }).then((res) => {
                    expect(res.status).to.equal(400)
                    expect(res.body).to.contain({ code: 'INVALID_PASSWORD' })
                    done()
                }).catch((err) => done(err))
            })
        })
    })

    describe('When the DB contains an unverified user', function () {
        let userData: any = null

        beforeEach('Create test user', function (done) {
            createTestUser(email, false).then((data) => {
                userData = data
                done()
            }).catch(err => done(err))
        })

        describe('Sign up', function () {
            this.timeout('50000')
            it('With the same email as the existing unverified user', function (done) {
                request(app).post('/api/signup').send({ email, password }).then((res) => {
                    expect(res.status).to.equal(201)
                    done()
                }).catch((err) => done(err))
            })
        })

        describe('Request password reset', function () {
            this.timeout('50000')
            it('With a valid email', function (done) {
                request(app).post('/api/request-password-reset').send({ email }).then((res) => {
                    expect(res.status).to.equal(204)
                    done()
                }).catch((err) => done(err))
            })
            it('With an invalid email', function (done) {
                request(app).post('/api/request-password-reset').send({ email: 'x' + email }).then((res) => {
                    expect(res.status).to.equal(400)
                    expect(res.body).to.contain({ code: 'MISSING_USER' })
                    done()
                }).catch((err) => done(err))
            })
        })

        describe('Reset password', function () {
            it('With a valid key', function (done) {
                request(app).post('/api/reset-password').send({ passwordResetToken: userData.passwordResetToken, newPassword: password + 'x' }).then((res) => {
                    expect(res.status).to.equal(200)
                    done()
                }).catch((err) => done(err))
            })
            it('With an invalid key', function (done) {
                request(app).post('/api/reset-password').send({ passwordResetToken: userData.passwordResetToken + 'x', newPassword: password + 'x' }).then((res) => {
                    expect(res.status).to.equal(400)
                    expect(res.body).to.contain({ code: 'INVALID_PASSWORD_RESET_TOKEN' })
                    done()
                }).catch((err) => done(err))
            })
        })

        describe('Verify email for the existing unverified user', function () {
            it('With a valid key', function (done) {
                request(app).post('/api/verify-email').send({ emailVerificationToken: userData.emailVerificationToken }).then((res) => {
                    expect(res.status).to.equal(204)
                    done()
                }).catch((err) => done(err))
            })
            it('With an invalid key', function (done) {
                request(app).post('/api/verify-email').send({ emailVerificationToken: userData.emailVerificationToken + 'x' }).then((res) => {
                    expect(res.status).to.equal(400)
                    expect(res.body).to.contain({ code: 'INVALID_EMAIL_VERIFICATION_TOKEN' })
                    done()
                }).catch((err) => done(err))
            })
        })
    })

    describe('When the DB contains a verified user', function () {
        let userData: any = null

        beforeEach('Create test user', function (done) {
            createTestUser(email).then((data) => {
                userData = data
                done()
            }).catch(err => done(err))
        })

        describe('Sign up', function () {
            this.timeout('50000')
            it('With the same email as the existing verified user', function (done) {
                request(app).post('/api/signup').send({ email, password }).then((res) => {
                    expect(res.status).to.equal(400)
                    expect(res.body).to.contain({ code: 'EMAIL_IN_USE' })
                    done()
                }).catch((err) => done(err))
            })
        })

        describe('Login', function () {
            it('With valid credentials', function (done) {
                request(app).post('/api/login').send({ email, password }).then((res) => {
                    expect(res.status).to.equal(200)
                    expect(res.body).to.have.property('token')
                    expect(res.body).to.have.property('refreshToken')
                    done()
                }).catch((err) => done(err))
            })
            it('With a nonexistent email', function (done) {
                request(app).post('/api/login').send({ email: 'ghost@example.com', password }).then((res) => {
                    expect(res.status).to.equal(401)
                    expect(res.body).to.contain({ code: 'INVALID_LOGIN' })
                    done()
                }).catch((err) => done(err))
            })
            it('With an incorrect password', function (done) {
                request(app).post('/api/login').send({ email, password: password + 'x' }).then((res) => {
                    expect(res.status).to.equal(401)
                    expect(res.body).to.contain({ code: 'INVALID_LOGIN' })
                    done()
                }).catch((err) => done(err))
            })
            it('Refresh token cleanup policy (during login)', function (done) {
                (async () => {
                    const refreshTokenCount = async () => ((await findUserById(userData.user._id)).refreshTokens).length
                    await addUserRefreshToken(userData.user._id, userData.refreshToken + 'w', '::ffff:127.0.0.1', '', new Date((new Date()).valueOf() - 1000 * 60 * 60 * 24 * process.env.REFRESH_TOKEN_CLEANUP_1_DAYS))
                    await addUserRefreshToken(userData.user._id, userData.refreshToken + 'x', '::ffff:127.0.0.1', 'test', new Date((new Date()).valueOf() - 1000 * 60 * 60 * 24 * process.env.REFRESH_TOKEN_CLEANUP_1_DAYS))
                    await addUserRefreshToken(userData.user._id, userData.refreshToken + 'y', '::ffff:127.0.0.1', '', new Date((new Date()).valueOf() - 1000 * 60 * 60 * 24 * process.env.REFRESH_TOKEN_CLEANUP_2_DAYS))
                    await addUserRefreshToken(userData.user._id, userData.refreshToken + 'z', '::ffff:127.0.0.1', 'test', new Date((new Date()).valueOf() - 1000 * 60 * 60 * 24 * process.env.REFRESH_TOKEN_CLEANUP_2_DAYS))
                    if (await refreshTokenCount() !== 4) throw null
                    await request(app).post('/api/login').send({ email, password })
                    if (await refreshTokenCount() !== 2) throw null
                })().then(() => done()).catch(err => done(err))
            })
        })

        describe('Generate new JWT', function () {
            it('With a valid refresh token', function (done) {
                request(app).post('/api/token').send({ refreshToken: userData.refreshToken }).then((res) => {
                    expect(res.status).to.equal(200)
                    expect(res.body).to.have.property('token')
                    done()
                }).catch((err) => done(err))
            })
            it('With an invalid refresh token', function (done) {
                request(app).post('/api/token').send({ refreshToken: userData.refreshToken + 'x' }).then((res) => {
                    expect(res.status).to.equal(401)
                    expect(res.body).to.contain({ code: 'INVALID_REFRESH_TOKEN' })
                    done()
                }).catch((err) => done(err))
            })
        })

        describe('Get refresh tokens', function () {
            it('Get refresh tokens', function (done) {
                request(app).get('/api/me/logins').set('Authorization', `Bearer ${userData.token}`).then((res) => {
                    expect(res.status).to.equal(200)
                    expect(res.body).to.be.an('array').of.length.greaterThanOrEqual(1)
                    expect(res.body[0]).to.have.property('_id')
                    expect(res.body[0]).to.have.property('ip')
                    expect(res.body[0]).to.have.property('userAgent')
                    expect(res.body[0]).to.have.property('lastUsed')
                    done()
                }).catch((err) => done(err))
            })
        })

        describe('Revoke refresh tokens', function () {
            it('With a valid tokenId', function (done) {
                request(app).delete('/api/me/logins').set('Authorization', `Bearer ${userData.token}`).send({ tokenId: userData.user.refreshTokens[0]._id }).then((res) => {
                    expect(res.status).to.equal(200)
                    done()
                }).catch((err) => done(err))
            })
            it('With an invalid tokenId', function (done) {
                request(app).delete('/api/me/logins').set('Authorization', `Bearer ${userData.token}`).send({ tokenId: userData.user.refreshTokens[0]._id + 'x' }).then((res) => {
                    expect(res.status).to.equal(400)
                    expect(res.body).to.contain({ code: 'GENERAL_ERROR' })
                    done()
                }).catch((err) => done(err))
            })
            it('With a nonexistent tokenId', function (done) {
                let replacementTokenId = userData.user.refreshTokens[0]._id.toString().slice(0, -1) + (userData.user.refreshTokens[0]._id.toString().slice(-1) === '1' ? '2' : '1')
                request(app).delete('/api/me/logins').set('Authorization', `Bearer ${userData.token}`).send({ tokenId: replacementTokenId }).then((res) => {
                    expect(res.status).to.equal(400)
                    expect(res.body).to.contain({ code: 'MISSING_ITEM' })
                    done()
                }).catch((err) => done(err))
            })
        })

        describe('Change password', function () {
            it('With a valid current password and new password, not revoking existing tokens', function (done) {
                request(app).post('/api/me/password').set('Authorization', `Bearer ${userData.token}`).send({ password, newPassword: password + 'x' }).then((res) => {
                    expect(res.status).to.equal(200)
                    done()
                }).catch((err) => done(err))
            })
            it('With a valid current password and new password, revoking existing tokens', function (done) {
                request(app).post('/api/me/password').set('Authorization', `Bearer ${userData.token}`).send({ password, newPassword: password + 'x', revokeRefreshTokens: true }).then((res) => {
                    expect(res.status).to.equal(200)
                    expect(res.body).to.have.property('refreshToken')
                    done()
                }).catch((err) => done(err))
            })
            it('With a valid current password and an invalid new password', function (done) {
                request(app).post('/api/me/password').set('Authorization', `Bearer ${userData.token}`).send({ password, newPassword: '123' }).then((res) => {
                    expect(res.status).to.equal(401)
                    expect(res.body).to.contain({ code: 'INVALID_PASSWORD' })
                    done()
                }).catch((err) => done(err))
            })
            it('With an invalid current password and a valid new password', function (done) {
                request(app).post('/api/me/password').set('Authorization', `Bearer ${userData.token}`).send({ password: password + 'y', newPassword: password + 'x' }).then((res) => {
                    expect(res.status).to.equal(401)
                    expect(res.body).to.contain({ code: 'WRONG_PASSWORD' })
                    done()
                }).catch((err) => done(err))
            })
        })

        describe('Change email', function () {
            this.timeout('50000')
            it('With a valid current password and email', function (done) {
                request(app).post('/api/me/email').set('Authorization', `Bearer ${userData.token}`).send({ password, newEmail: 'x' + email }).then((res) => {
                    expect(res.status).to.equal(200)
                    done()
                }).catch((err) => done(err))
            })
            it('With a valid current password and an invalid email', function (done) {
                request(app).post('/api/me/email').set('Authorization', `Bearer ${userData.token}`).send({ password, newEmail: 'whoops' }).then((res) => {
                    expect(res.status).to.equal(400)
                    expect(res.body).to.contain({ code: 'VALIDATION_ERROR' })
                    done()
                }).catch((err) => done(err))
            })
            it('With an invalid current password and a valid email', function (done) {
                request(app).post('/api/me/email').set('Authorization', `Bearer ${userData.token}`).send({ password: password + 'x', newEmail: 'x' + email }).then((res) => {
                    expect(res.status).to.equal(401)
                    expect(res.body).to.contain({ code: 'WRONG_PASSWORD' })
                    done()
                }).catch((err) => done(err))
            })
            it('With a valid current password and the same email as before', function (done) {
                request(app).post('/api/me/email').set('Authorization', `Bearer ${userData.token}`).send({ password, newEmail: email }).then((res) => {
                    expect(res.status).to.equal(400)
                    expect(res.body).to.contain({ code: 'IS_CURRENT_EMAIL' })
                    done()
                }).catch((err) => done(err))
            })
        })

        describe('When the DB contains a verified user and a second unverified user', function () {
            beforeEach('Create second test user', function (done) {
                createTestUser('x' + email, false).then(() => done()).catch(err => done(err))
            })

            describe('Change email', function () {
                this.timeout('50000')
                it('With the same email as the existing unverified user', function (done) {
                    request(app).post('/api/me/email').set('Authorization', `Bearer ${userData.token}`).send({ password, newEmail: 'x' + email }).then((res) => {
                        expect(res.status).to.equal(200)
                        done()
                    }).catch((err) => done(err))
                })
            })
        })

        describe('When the DB contains a verified user and a second verified user', function () {
            beforeEach('Create second test user', function (done) {
                createTestUser('x' + email, true).then(() => done()).catch(err => done(err))
            })

            describe('Change email', function () {
                this.timeout('50000')
                it('With the same email as the existing verified user', function (done) {
                    request(app).post('/api/me/email').set('Authorization', `Bearer ${userData.token}`).send({ password, newEmail: 'x' + email }).then((res) => {
                        expect(res.status).to.equal(400)
                        expect(res.body).to.contain({ code: 'EMAIL_IN_USE' })
                        done()
                    }).catch((err) => done(err))
                })
            })
        })

    })

})