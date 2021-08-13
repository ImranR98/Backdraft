// Tests for API endpoints in authRoutes

import { expect } from 'chai'
import request from 'supertest'

import { app } from '../src/app'

import { addUserRefreshToken, findUserById } from '../src/db/User'

import { password, email, createTestUser } from './testData'

const clientVerificationURL = `http://localhost:${process.env.PORT || 8080}/verify`

describe('rootRoutes tests', function () {
    describe('When the DB is empty', function () {
        describe('/signup POST', function () {
            this.timeout('50000')
            it('With valid credentials', function (done) {
                request(app).post('/api/signup').send({ email, password, clientVerificationURL }).then((res) => {
                    expect(res.status).to.equal(201)
                    done()
                }).catch((err) => done(err))
            })
            it('With an invalid email', function (done) {
                request(app).post('/api/signup').send({ email: 'whoops', password, clientVerificationURL }).then((res) => {
                    expect(res.status).to.equal(422)
                    expect(res.body).to.contain({ code: 'VALIDATION_ERROR' })
                    done()
                }).catch((err) => done(err))
            })
            it('With an invalid password', function (done) {
                request(app).post('/api/signup').send({ email, password: '123', clientVerificationURL }).then((res) => {
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

        describe('/signup POST', function () {
            this.timeout('50000')
            it('With the same email as the existing unverified user', function (done) {
                request(app).post('/api/signup').send({ email, password, clientVerificationURL }).then((res) => {
                    expect(res.status).to.equal(201)
                    done()
                }).catch((err) => done(err))
            })
        })

        describe('/request-password-reset POST', function () {
            this.timeout('50000')
            it('With a valid email', function (done) {
                request(app).post('/api/request-password-reset').send({ email, clientVerificationURL }).then((res) => {
                    expect(res.status).to.equal(204)
                    done()
                }).catch((err) => done(err))
            })
            it('With an invalid email', function (done) {
                request(app).post('/api/request-password-reset').send({ email: 'x' + email, clientVerificationURL }).then((res) => {
                    expect(res.status).to.equal(400)
                    expect(res.body).to.contain({ code: 'MISSING_USER' })
                    done()
                }).catch((err) => done(err))
            })
        })

        describe('/reset-password POST', function () {
            it('With a valid key', function (done) {
                request(app).post('/api/reset-password').send({ passwordResetToken: userData.passwordResetToken, password: password + 'x' }).then((res) => {
                    expect(res.status).to.equal(204)
                    done()
                }).catch((err) => done(err))
            })
            it('With an invalid key', function (done) {
                request(app).post('/api/reset-password').send({ passwordResetToken: userData.passwordResetToken + 'x', password: password + 'x' }).then((res) => {
                    expect(res.status).to.equal(400)
                    expect(res.body).to.contain({ code: 'INVALID_PASSWORD_RESET_TOKEN' })
                    done()
                }).catch((err) => done(err))
            })
        })

        describe('/verify-email POST', function () {
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

        describe('/signup POST', function () {
            this.timeout('50000')
            it('With the same email as the existing verified user', function (done) {
                request(app).post('/api/signup').send({ email, password, clientVerificationURL }).then((res) => {
                    expect(res.status).to.equal(400)
                    expect(res.body).to.contain({ code: 'EMAIL_IN_USE' })
                    done()
                }).catch((err) => done(err))
            })
        })

        describe('/login POST', function () {
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
                    expect(res.status).to.equal(400)
                    expect(res.body).to.contain({ code: 'INVALID_LOGIN' })
                    done()
                }).catch((err) => done(err))
            })
            it('With an incorrect password', function (done) {
                request(app).post('/api/login').send({ email, password: password + 'x' }).then((res) => {
                    expect(res.status).to.equal(400)
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

        describe('/token POST', function () {
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

    })

})