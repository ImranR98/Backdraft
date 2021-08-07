// Tests for API endpoints in authRoutes

process.env.NODE_ENV = 'test'

import { expect } from 'chai'
import request from 'supertest'

import { app } from '../src/funcs/express'
import EmailToken from '../src/models/EmailToken'
import User from '../src/models/User'

const email = 'person@example.com'
const password = 'zoom4321'
const hashedPassword = '$2b$10$k6boteiv7zGy7IhnsKOUlOUS4BgUWompJO.AGLUKnkrtKQm/zBIZu'
const verificationKey = '52cd0c01f33dc63bd712de9a81887d0896dbaea6d417299259223f85841b657d67f82ef5e31be513b5d9939a70fb9dc3ec41cc726e1c52e28d013ed45dda2478'

const createTestUser = async (verified: boolean = true) => {
    const user = await User.create({ email, verified, password: hashedPassword })
    if (!verified)
        await EmailToken.create({ user: user._id, email, verificationKey })
}

describe('Authentication related API tests', function () {
    describe('Tests that require an empty DB', function () {
        describe('Sign up', function () {
            this.timeout('50000') // Nodemailer createTransport and sendEmail may take a while
            it('With valid credentials', function (done) {
                request(app).post('/signup').send({ email, password }).then((res) => {
                    expect(res.status).to.equal(201)
                    done()
                }).catch((err) => done(err))
            })
            it('With an invalid email', function (done) {
                request(app).post('/signup').send({ email: 'whoops', password }).then((res) => {
                    expect(res.status).to.equal(400)
                    expect(res.body).to.contain({ code: 'VALIDATION_ERROR' })
                    done()
                }).catch((err) => done(err))
            })
            it('With an invalid password', function (done) {
                request(app).post('/signup').send({ email, password: '123' }).then((res) => {
                    expect(res.status).to.equal(401)
                    expect(res.body).to.contain({ code: 'INVALID_PASSWORD' })
                    done()
                }).catch((err) => done(err))
            })
        })
    })

    describe('Tests that require an existing uverified user and an email verification token', function () {
        beforeEach('Create test user', function (done) {
            createTestUser(false).then(() => done()).catch(err => done(err))
        })
        describe('Verify email for unverified user', function () {
            it('With a valid key', function (done) {
                request(app).post('/verify-email').send({ verificationKey }).then((res) => {
                    expect(res.status).to.equal(200)
                    done()
                }).catch((err) => done(err))
            })
            it('With an invalid key', function (done) {
                request(app).post('/verify-email').send({ verificationKey: verificationKey + 'x' }).then((res) => {
                    expect(res.status).to.equal(400)
                    expect(res.body).to.contain({ code: 'INVALID_VERIFICATION_KEY' })
                    done()
                }).catch((err) => done(err))
            })
        })
    })

    describe('Tests that require an existing verified user', function () {

        beforeEach('Create test user', function (done) {
            createTestUser().then(() => done()).catch(err => done(err))
        })

        describe('Login', function () {
            it('With valid credentials', function (done) {
                request(app).post('/login').send({ email, password }).then((res) => {
                    expect(res.status).to.equal(200)
                    expect(res.body).to.have.property('token')
                    expect(res.body).to.have.property('refreshToken')
                    done()
                }).catch((err) => done(err))
            })
            it('With a nonexistent email', function (done) {
                request(app).post('/login').send({ email: 'ghost@example.com', password }).then((res) => {
                    expect(res.status).to.equal(401)
                    expect(res.body).to.contain({ code: 'INVALID_LOGIN' })
                    done()
                }).catch((err) => done(err))
            })
            it('With an incorrect password', function (done) {
                request(app).post('/login').send({ email, password: password + 'x' }).then((res) => {
                    expect(res.status).to.equal(401)
                    expect(res.body).to.contain({ code: 'INVALID_LOGIN' })
                    done()
                }).catch((err) => done(err))
            })
        })

        describe('Tests that also require a valid token and refresh token for the existing verified user', function () {
            let credentials: { token: string, refreshToken: string } = { token: '', refreshToken: '' }

            beforeEach('Login', function (done) {
                request(app).post('/login').send({ email, password }).then((res) => {
                    expect(res.status).to.equal(200)
                    expect(res.body).to.have.property('token')
                    expect(res.body).to.have.property('refreshToken')
                    credentials = res.body
                    done()
                }).catch((err) => done(err))
            })

            describe('Generate new JWT', function () {
                it('With a valid refresh token', function (done) {
                    request(app).post('/token').send({ refreshToken: credentials.refreshToken }).then((res) => {
                        expect(res.status).to.equal(200)
                        expect(res.body).to.have.property('token')
                        done()
                    }).catch((err) => done(err))
                })
                it('With an invalid refresh token', function (done) {
                    request(app).post('/token').send({ refreshToken: credentials.refreshToken + 'x' }).then((res) => {
                        expect(res.status).to.equal(401)
                        expect(res.body).to.contain({ code: 'INVALID_REFRESH_TOKEN' })
                        done()
                    }).catch((err) => done(err))
                })
            })

            describe('Get logins', function () {
                it('Get logins', function (done) {
                    request(app).get('/logins').set('Authorization', `Bearer ${credentials.token}`).then((res) => {
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
                    request(app).get('/logins').set('Authorization', `Bearer ${credentials.token}`).then((res) => {
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
                    request(app).post('/revoke-login').set('Authorization', `Bearer ${credentials.token}`).send({ tokenId }).then((res) => {
                        expect(res.status).to.equal(200)
                        done()
                    }).catch((err) => done(err))
                })
                it('With an invalid tokenId', function (done) {
                    request(app).post('/revoke-login').set('Authorization', `Bearer ${credentials.token}`).send({ tokenId: tokenId + 'x' }).then((res) => {
                        expect(res.status).to.equal(400)
                        expect(res.body).to.contain({ code: 'GENERAL_ERROR' })
                        done()
                    }).catch((err) => done(err))
                })
                it('With a nonexistent tokenId', function (done) {
                    let replacementTokenId = tokenId.slice(0, -1) + (tokenId.slice(-1) === '1' ? '2' : '1')
                    request(app).post('/revoke-login').set('Authorization', `Bearer ${credentials.token}`).send({ tokenId: replacementTokenId }).then((res) => {
                        expect(res.status).to.equal(400)
                        expect(res.body).to.contain({ code: 'MISSING_ITEM' })
                        done()
                    }).catch((err) => done(err))
                })
            })

            describe('Change password', function () {
                it('With a valid current password and new password, not revoking existing tokens', function (done) {
                    request(app).post('/change-password').set('Authorization', `Bearer ${credentials.token}`).send({ password, newPassword: password + 'x' }).then((res) => {
                        expect(res.status).to.equal(200)
                        done()
                    }).catch((err) => done(err))
                })
                it('With a valid current password and new password, revoking existing tokens', function (done) {
                    request(app).post('/change-password').set('Authorization', `Bearer ${credentials.token}`).send({ password, newPassword: password + 'x', revokeRefreshTokens: true }).then((res) => {
                        expect(res.status).to.equal(200)
                        expect(res.body).to.have.property('refreshToken')
                        done()
                    }).catch((err) => done(err))
                })
                it('With a valid current password and an invalid new password', function (done) {
                    request(app).post('/change-password').set('Authorization', `Bearer ${credentials.token}`).send({ password, newPassword: '123' }).then((res) => {
                        expect(res.status).to.equal(401)
                        expect(res.body).to.contain({ code: 'INVALID_PASSWORD' })
                        done()
                    }).catch((err) => done(err))
                })
                it('With an invalid current password and a valid new password', function (done) {
                    request(app).post('/change-password').set('Authorization', `Bearer ${credentials.token}`).send({ password: password + 'y', newPassword: password + 'x' }).then((res) => {
                        expect(res.status).to.equal(401)
                        expect(res.body).to.contain({ code: 'WRONG_PASSWORD' })
                        done()
                    }).catch((err) => done(err))
                })
            })

            describe('Change email', function () {
                this.timeout('50000') // Nodemailer createTransport and sendEmail may take a while
                it('With a valid current password and email', function (done) {
                    request(app).post('/change-email').set('Authorization', `Bearer ${credentials.token}`).send({ password, newEmail: 'x' + email }).then((res) => {
                        expect(res.status).to.equal(200)
                        done()
                    }).catch((err) => done(err))
                })
                it('With a valid current password and an invalid email', function (done) {
                    request(app).post('/change-email').set('Authorization', `Bearer ${credentials.token}`).send({ password, newEmail: 'whoops' }).then((res) => {
                        expect(res.status).to.equal(400)
                        expect(res.body).to.contain({ code: 'VALIDATION_ERROR' })
                        done()
                    }).catch((err) => done(err))
                })
                it('With an invalid current password and a valid email', function (done) {
                    request(app).post('/change-email').set('Authorization', `Bearer ${credentials.token}`).send({ password: password + 'x', newEmail: 'x' + email }).then((res) => {
                        expect(res.status).to.equal(401)
                        expect(res.body).to.contain({ code: 'WRONG_PASSWORD' })
                        done()
                    }).catch((err) => done(err))
                })
                // TODO: Add one where new email is same as old (controller method needs this check added)
            })

        })

    })

})