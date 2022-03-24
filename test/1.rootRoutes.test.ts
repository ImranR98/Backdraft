// Tests for API endpoints in authRoutes

import { expect } from 'chai'
import request from 'supertest'

import { app } from '../src/app'

import { findUserById } from '../src/db/userQueries'

import { password, email, createTestUser, generateTestUserOTP, generateTestUserJWT } from './testData'

describe('root / tests', function () {
    describe('When the DB is empty', function () {
        describe('/signup/begin POST', function () {
            this.timeout('50000')
            it('With a valid email', function (done) {
                request(app).post('/api/signup/begin').send({ email }).then((res) => {
                    expect(res.body).to.have.property('token')
                    expect(res.status).to.equal(200)
                    done()
                }).catch((err) => done(err))
            })
            it('With an invalid email', function (done) {
                request(app).post('/api/signup/begin').send({ email: 'whoops' }).then((res) => {
                    expect(res.body).to.contain({ code: 'VALIDATION_ERROR' })
                    expect(res.status).to.equal(422)
                    done()
                }).catch((err) => done(err))
            })
        })
        describe('/signup/complete POST', function () {
            it('With valid credentials', function (done) {
                generateTestUserOTP(email, 'signup').then((data) => {
                    request(app).post('/api/signup/complete').send({ email, password, token: data.fullHash, code: data.otp }).then((res) => {
                        expect(res.status).to.equal(201)
                        done()
                    }).catch((err) => done(err))
                }).catch((err) => done(err))
            })
            it('With an incorrect email', function (done) {
                generateTestUserOTP(email, 'signup').then((data) => {
                    request(app).post('/api/signup/complete').send({ email: 'a' + email, password, token: data.fullHash, code: data.otp }).then((res) => {
                        expect(res.body).to.contain({ code: 'INVALID_TOKEN' })
                        expect(res.status).to.equal(400)
                        done()
                    }).catch((err) => done(err))
                }).catch((err) => done(err))
            })
            it('With an invalid password', function (done) {
                generateTestUserOTP(email, 'signup').then((data) => {
                    request(app).post('/api/signup/complete').send({ email, password: '123', token: data.fullHash, code: data.otp }).then((res) => {
                        expect(res.body).to.contain({ code: 'INVALID_PASSWORD' })
                        expect(res.status).to.equal(400)
                        done()
                    }).catch((err) => done(err))
                }).catch((err) => done(err))
            })
            it('With an incorrect token', function (done) {
                generateTestUserOTP(email, 'signup').then((data) => {
                    request(app).post('/api/signup/complete').send({ email, password, token: data.fullHash + 'a', code: data.otp }).then((res) => {
                        expect(res.body).to.contain({ code: 'INVALID_TOKEN' })
                        expect(res.status).to.equal(400)
                        done()
                    }).catch((err) => done(err))
                }).catch((err) => done(err))
            })
            it('With an incorrect code', function (done) {
                generateTestUserOTP(email, 'signup').then((data) => {
                    request(app).post('/api/signup/complete').send({ email, password, token: data.fullHash, code: data.otp === '123456' ? '123457' : '123456' }).then((res) => {
                        expect(res.body).to.contain({ code: 'INVALID_TOKEN' })
                        expect(res.status).to.equal(400)
                        done()
                    }).catch((err) => done(err))
                }).catch((err) => done(err))
            })
        })
    })

    describe('When the DB contains a user', function () {
        let { user, refreshToken }: { user: any, refreshToken: string } = { user: null, refreshToken: '' }

        beforeEach('Create test user', function (done) {
            createTestUser(email).then((data) => {
                user = data.user
                refreshToken = data.refreshToken
                done()
            }).catch(err => done(err))
        })

        describe('/signup/begin POST', function () {
            this.timeout('50000')
            it('With the same email as the existing user', function (done) {
                request(app).post('/api/signup/begin').send({ email }).then((res) => {
                    expect(res.body).to.contain({ code: 'EMAIL_IN_USE' })
                    expect(res.status).to.equal(400)
                    done()
                }).catch((err) => done(err))
            })
        })

        describe('/signup/complete POST', function () {
            it('With the same email as the existing user', function (done) {
                generateTestUserOTP(email, 'signup').then((data) => {
                    request(app).post('/api/signup/complete').send({ email, password, token: data.fullHash, code: data.otp }).then((res) => {
                        expect(res.body).to.contain({ code: 'EMAIL_IN_USE' })
                        expect(res.status).to.equal(400)
                        done()
                    }).catch((err) => done(err))
                }).catch(err => done(err))
            })
        })

        describe('/reset-password-begin POST', function () {
            this.timeout('50000')
            it('With a valid email', function (done) {
                request(app).post('/api/reset-password-begin').send({ email }).then((res) => {
                    expect(res.body).to.have.property('token')
                    expect(res.status).to.equal(200)
                    done()
                }).catch((err) => done(err))
            })
            it('With a non existent email', function (done) {
                request(app).post('/api/reset-password-begin').send({ email: 'a' + email }).then((res) => {
                    expect(res.body).to.contain({ code: 'USER_NOT_FOUND' })
                    expect(res.status).to.equal(400)
                    done()
                }).catch((err) => done(err))
            })
        })
        describe('/reset-password-complete POST', function () {
            it('With valid credentials', function (done) {
                generateTestUserOTP(email, 'password').then((data) => {
                    request(app).post('/api/reset-password-complete').send({ email, password, token: data.fullHash, code: data.otp }).then((res) => {
                        expect(res.status).to.equal(200)
                        done()
                    }).catch((err) => done(err))
                }).catch((err) => done(err))
            })
            it('With an incorrect email', function (done) {
                generateTestUserOTP(email, 'password').then((data) => {
                    request(app).post('/api/reset-password-complete').send({ email: 'a' + email, password, token: data.fullHash, code: data.otp }).then((res) => {
                        expect(res.body).to.contain({ code: 'INVALID_TOKEN' })
                        expect(res.status).to.equal(400)
                        done()
                    }).catch((err) => done(err))
                }).catch((err) => done(err))
            })
            it('With an invalid password', function (done) {
                generateTestUserOTP(email, 'password').then((data) => {
                    request(app).post('/api/reset-password-complete').send({ email, password: '123', token: data.fullHash, code: data.otp }).then((res) => {
                        expect(res.body).to.contain({ code: 'INVALID_PASSWORD' })
                        expect(res.status).to.equal(400)
                        done()
                    }).catch((err) => done(err))
                }).catch((err) => done(err))
            })
            it('With an incorrect token', function (done) {
                generateTestUserOTP(email, 'password').then((data) => {
                    request(app).post('/api/reset-password-complete').send({ email, password, token: data.fullHash + 'a', code: data.otp }).then((res) => {
                        expect(res.body).to.contain({ code: 'INVALID_TOKEN' })
                        expect(res.status).to.equal(400)
                        done()
                    }).catch((err) => done(err))
                }).catch((err) => done(err))
            })
            it('With an incorrect code', function (done) {
                generateTestUserOTP(email, 'password').then((data) => {
                    request(app).post('/api/reset-password-complete').send({ email, password, token: data.fullHash, code: data.otp === '123456' ? '123457' : '123456' }).then((res) => {
                        expect(res.body).to.contain({ code: 'INVALID_TOKEN' })
                        expect(res.status).to.equal(400)
                        done()
                    }).catch((err) => done(err))
                }).catch((err) => done(err))
            })
        })

        describe('/login POST', function () {
            it('With valid credentials (also tests refresh token cleanup policy)', function (done) {
                (async () => {
                    const res = await request(app).post('/api/login').send({ email, password })
                    expect(res.body).to.have.property('token')
                    expect(res.body).to.have.property('refreshToken')
                    expect(res.status).to.equal(200)
                })().then(() => done()).catch(err => done(err))
            })
            it('With a non existent user email', function (done) {
                request(app).post('/api/login').send({ email: 'ghost@example.com', password }).then((res) => {
                    expect(res.body).to.contain({ code: 'INVALID_LOGIN' })
                    expect(res.status).to.equal(400)
                    done()
                }).catch((err) => done(err))
            })
            it('With a wrong password', function (done) {
                request(app).post('/api/login').send({ email, password: password + 'x' }).then((res) => {
                    expect(res.body).to.contain({ code: 'INVALID_LOGIN' })
                    expect(res.status).to.equal(400)
                    done()
                }).catch((err) => done(err))
            })
        })

        describe('/token POST', function () {
            it('With a valid refresh token (also tests refreshToken.date update)', function (done) {
                (async () => {
                    const topRefreshToken = async () => ((await findUserById(user.id))?.refreshTokens || [])[0]
                    const initialToken = await topRefreshToken()
                    if (!initialToken) throw null
                    const res = await request(app).post('/api/token').send({ refreshToken: refreshToken })
                    expect(res.body).to.have.property('token')
                    expect(res.status).to.equal(200)
                    if (initialToken.date >= (await topRefreshToken())?.date) throw null
                })().then(() => done()).catch(err => done(err))
            })
            it('With an invalid refresh token', function (done) {
                request(app).post('/api/token').send({ refreshToken: refreshToken + 'x' }).then((res) => {
                    expect(res.body).to.contain({ code: 'INVALID_REFRESH_TOKEN' })
                    expect(res.status).to.equal(401)
                    done()
                }).catch((err) => done(err))
            })
        })

        describe('/logout POST', function () {
            it('With a valid refresh token', function (done) {
                (async () => {
                    const refreshTokenCount = async () => ((await findUserById(user.id))?.refreshTokens || []).length
                    let originalCount = await refreshTokenCount()
                    const token = generateTestUserJWT(user.id)
                    const res = await request(app).post('/api/logout').set('Authorization', `Bearer ${token}`).send({ refreshToken: refreshToken })
                    if (await refreshTokenCount() !== (originalCount - 1)) throw null
                    expect(res.status).to.equal(200)
                })().then(() => done()).catch(err => done(err))
            })
            it('With an invalid refresh token', function (done) {
                (async () => {
                    const refreshTokenCount = async () => ((await findUserById(user.id))?.refreshTokens || []).length
                    let originalCount = await refreshTokenCount()
                    const token = generateTestUserJWT(user.id)
                    const res = await request(app).post('/api/logout').set('Authorization', `Bearer ${token}`).send({ refreshToken: refreshToken + 'x' })
                    expect(res.body).to.contain({ code: 'ITEM_NOT_FOUND' })
                    if (await refreshTokenCount() !== originalCount) throw null
                    expect(res.status).to.equal(400)
                })().then(() => done()).catch(err => done(err))
            })
        })

    })

})