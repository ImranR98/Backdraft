// Tests for API endpoints in authRoutes

process.env.NODE_ENV = 'test'

import { expect } from 'chai'
import request from 'supertest'

import { app } from '../src/funcs/express'

import User from '../src/models/User'

import { createJWT } from '../src/funcs/validators'

// Test user data
const email = 'person@example.com'
const password = 'zoom4321'
const hashedPassword = '$2b$10$k6boteiv7zGy7IhnsKOUlOUS4BgUWompJO.AGLUKnkrtKQm/zBIZu'

const createTestUser = async (email: string, verified: boolean = true) => {
    const user = await User.create({ email, verified, password: hashedPassword })
    const verificationJWT = createJWT({ id: user._id, email: user.email }, <string>process.env.JWT_KEY, 60) // TODO: Change this when changed elsewhere
    return { user, verificationJWT }
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
                    expect(res.status).to.equal(400)
                    expect(res.body).to.contain({ code: 'VALIDATION_ERROR' })
                    done()
                }).catch((err) => done(err))
            })
            it('With an invalid password', function (done) {
                request(app).post('/api/signup').send({ email, password: '123' }).then((res) => {
                    expect(res.status).to.equal(401)
                    expect(res.body).to.contain({ code: 'INVALID_PASSWORD' })
                    done()
                }).catch((err) => done(err))
            })
        })
    })

    describe('When the DB contains an unverified user', function () {
        let verificationJWT: string | null = null

        beforeEach('Create test user', function (done) {
            createTestUser(email, false).then((data) => {
                verificationJWT = data.verificationJWT
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

        describe('Verify email for the existing unverified user', function () {
            it('With a valid key', function (done) {
                request(app).post('/api/verify-email').send({ verificationJWT }).then((res) => {
                    expect(res.status).to.equal(200)
                    done()
                }).catch((err) => done(err))
            })
            it('With an invalid key', function (done) {
                request(app).post('/api/verify-email').send({ verificationJWT: verificationJWT + 'x' }).then((res) => {
                    expect(res.status).to.equal(400)
                    expect(res.body).to.contain({ code: 'INVALID_VERIFICATION_KEY' })
                    done()
                }).catch((err) => done(err))
            })
        })
    })

    describe('When the DB contains a verified user', function () {

        beforeEach('Create test user', function (done) {
            createTestUser(email).then(() => done()).catch(err => done(err))
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
        })

        describe('When the DB contains a verified user for whom valid JWT and refresh tokens are available', function () {
            let credentials: { token: string, refreshToken: string } = { token: '', refreshToken: '' }

            beforeEach('Login', function (done) {
                request(app).post('/api/login').send({ email, password }).then((res) => {
                    expect(res.status).to.equal(200)
                    expect(res.body).to.have.property('token')
                    expect(res.body).to.have.property('refreshToken')
                    credentials = res.body
                    done()
                }).catch((err) => done(err))
            })

            describe('Generate new JWT', function () {
                it('With a valid refresh token', function (done) {
                    request(app).post('/api/token').send({ refreshToken: credentials.refreshToken }).then((res) => {
                        expect(res.status).to.equal(200)
                        expect(res.body).to.have.property('token')
                        done()
                    }).catch((err) => done(err))
                })
                it('With an invalid refresh token', function (done) {
                    request(app).post('/api/token').send({ refreshToken: credentials.refreshToken + 'x' }).then((res) => {
                        expect(res.status).to.equal(401)
                        expect(res.body).to.contain({ code: 'INVALID_REFRESH_TOKEN' })
                        done()
                    }).catch((err) => done(err))
                })
            })

            describe('Get logins', function () {
                it('Get logins', function (done) {
                    request(app).get('/api/logins').set('Authorization', `Bearer ${credentials.token}`).then((res) => {
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

            describe('Revoke login', function () {
                let tokenId: string = ''
                beforeEach('Get logins', function (done) {
                    request(app).get('/api/logins').set('Authorization', `Bearer ${credentials.token}`).then((res) => {
                        expect(res.status).to.equal(200)
                        expect(res.body).to.be.an('array').of.length.greaterThanOrEqual(1)
                        expect(res.body[0]).to.have.property('_id')
                        expect(res.body[0]).to.have.property('ip')
                        expect(res.body[0]).to.have.property('userAgent')
                        expect(res.body[0]).to.have.property('lastUsed')
                        tokenId = res.body[0]._id
                        done()
                    }).catch((err) => done(err))
                })
                it('With a valid tokenId', function (done) {
                    request(app).post('/api/revoke-login').set('Authorization', `Bearer ${credentials.token}`).send({ tokenId }).then((res) => {
                        expect(res.status).to.equal(200)
                        done()
                    }).catch((err) => done(err))
                })
                it('With an invalid tokenId', function (done) {
                    request(app).post('/api/revoke-login').set('Authorization', `Bearer ${credentials.token}`).send({ tokenId: tokenId + 'x' }).then((res) => {
                        expect(res.status).to.equal(400)
                        expect(res.body).to.contain({ code: 'GENERAL_ERROR' })
                        done()
                    }).catch((err) => done(err))
                })
                it('With a nonexistent tokenId', function (done) {
                    let replacementTokenId = tokenId.slice(0, -1) + (tokenId.slice(-1) === '1' ? '2' : '1')
                    request(app).post('/api/revoke-login').set('Authorization', `Bearer ${credentials.token}`).send({ tokenId: replacementTokenId }).then((res) => {
                        expect(res.status).to.equal(400)
                        expect(res.body).to.contain({ code: 'MISSING_ITEM' })
                        done()
                    }).catch((err) => done(err))
                })
            })

            describe('Change password', function () {
                it('With a valid current password and new password, not revoking existing tokens', function (done) {
                    request(app).post('/api/change-password').set('Authorization', `Bearer ${credentials.token}`).send({ password, newPassword: password + 'x' }).then((res) => {
                        expect(res.status).to.equal(200)
                        done()
                    }).catch((err) => done(err))
                })
                it('With a valid current password and new password, revoking existing tokens', function (done) {
                    request(app).post('/api/change-password').set('Authorization', `Bearer ${credentials.token}`).send({ password, newPassword: password + 'x', revokeRefreshTokens: true }).then((res) => {
                        expect(res.status).to.equal(200)
                        expect(res.body).to.have.property('refreshToken')
                        done()
                    }).catch((err) => done(err))
                })
                it('With a valid current password and an invalid new password', function (done) {
                    request(app).post('/api/change-password').set('Authorization', `Bearer ${credentials.token}`).send({ password, newPassword: '123' }).then((res) => {
                        expect(res.status).to.equal(401)
                        expect(res.body).to.contain({ code: 'INVALID_PASSWORD' })
                        done()
                    }).catch((err) => done(err))
                })
                it('With an invalid current password and a valid new password', function (done) {
                    request(app).post('/api/change-password').set('Authorization', `Bearer ${credentials.token}`).send({ password: password + 'y', newPassword: password + 'x' }).then((res) => {
                        expect(res.status).to.equal(401)
                        expect(res.body).to.contain({ code: 'WRONG_PASSWORD' })
                        done()
                    }).catch((err) => done(err))
                })
            })

            describe('Change email', function () {
                this.timeout('50000')
                it('With a valid current password and email', function (done) {
                    request(app).post('/api/change-email').set('Authorization', `Bearer ${credentials.token}`).send({ password, newEmail: 'x' + email }).then((res) => {
                        expect(res.status).to.equal(200)
                        done()
                    }).catch((err) => done(err))
                })
                it('With a valid current password and an invalid email', function (done) {
                    request(app).post('/api/change-email').set('Authorization', `Bearer ${credentials.token}`).send({ password, newEmail: 'whoops' }).then((res) => {
                        expect(res.status).to.equal(400)
                        expect(res.body).to.contain({ code: 'VALIDATION_ERROR' })
                        done()
                    }).catch((err) => done(err))
                })
                it('With an invalid current password and a valid email', function (done) {
                    request(app).post('/api/change-email').set('Authorization', `Bearer ${credentials.token}`).send({ password: password + 'x', newEmail: 'x' + email }).then((res) => {
                        expect(res.status).to.equal(401)
                        expect(res.body).to.contain({ code: 'WRONG_PASSWORD' })
                        done()
                    }).catch((err) => done(err))
                })
                it('With a valid current password and the same email as before', function (done) {
                    request(app).post('/api/change-email').set('Authorization', `Bearer ${credentials.token}`).send({ password, newEmail: email }).then((res) => {
                        expect(res.status).to.equal(400)
                        expect(res.body).to.contain({ code: 'IS_CURRENT_EMAIL' })
                        done()
                    }).catch((err) => done(err))
                })
            })

            describe('When the DB contains a verified user for whom valid JWT and refresh tokens are available, and a second unverified user', function () {
                beforeEach('Create second test user', function (done) {
                    createTestUser('x' + email, false).then(() => done()).catch(err => done(err))
                })

                this.timeout('50000')
                it('With the same email as the existing unverified user', function (done) {
                    request(app).post('/api/change-email').set('Authorization', `Bearer ${credentials.token}`).send({ password, newEmail: 'x' + email }).then((res) => {
                        expect(res.status).to.equal(200)
                        done()
                    }).catch((err) => done(err))
                })
            })

            describe('When the DB contains a verified user for whom valid JWT and refresh tokens are available, and a second verified user', function () {
                beforeEach('Create second test user', function (done) {
                    createTestUser('x' + email, true).then(() => done()).catch(err => done(err))
                })

                this.timeout('50000')
                it('With the same email as the existing verified user', function (done) {
                    request(app).post('/api/change-email').set('Authorization', `Bearer ${credentials.token}`).send({ password, newEmail: 'x' + email }).then((res) => {
                        expect(res.status).to.equal(400)
                        expect(res.body).to.contain({ code: 'EMAIL_IN_USE' })
                        done()
                    }).catch((err) => done(err))
                })
            })

        })

    })

})