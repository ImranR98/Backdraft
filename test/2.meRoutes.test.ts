// Tests for API endpoints in authRoutes

import { expect } from 'chai'
import request from 'supertest'

import { app } from '../src/app'

import { password, email, createTestUser, newEmail, newPassword, generateTestUserJWT, generateTestUserOTP } from './testData'

describe('/me tests', function () {

    let { user, refreshToken }: { user: any, refreshToken: string } = { user: null, refreshToken: '' }
    let token = ''

    beforeEach('Create test user and generate token', function (done) {
        createTestUser(email).then((data) => {
            user = data.user
            refreshToken = data.refreshToken
            token = generateTestUserJWT(user.id)
            done()
        }).catch(err => done(err))
    })

    describe('/me GET', function () {
        it('Get user info', function (done) {
            request(app).get('/api/me').set('Authorization', `Bearer ${token}`).then((res) => {
                expect(res.status).to.equal(200)
                expect(res.body).to.have.property('id')
                expect(res.body).to.have.property('email')
                expect(res.body).to.have.property('refreshTokens')
                expect(res.body.refreshTokens).to.be.an('array').of.length.greaterThanOrEqual(1)
                expect(res.body.refreshTokens[0]).to.have.property('id')
                expect(res.body.refreshTokens[0]).to.have.property('ip')
                expect(res.body.refreshTokens[0]).to.have.property('userAgent')
                expect(res.body.refreshTokens[0]).to.have.property('date')
                done()
            }).catch((err) => done(err))
        })
    })

    describe('/me/logins DELETE', function () {
        it('With a valid tokenId', function (done) {
            request(app).delete('/api/me/logins/' + user.refreshTokens[0].id).set('Authorization', `Bearer ${token}`).then((res) => {
                expect(res.status).to.equal(204)
                done()
            }).catch((err) => done(err))
        })
        it('With a wrong tokenId', function (done) {
            request(app).delete('/api/me/logins/' + user.refreshTokens[0].id + 'x').set('Authorization', `Bearer ${token}`).send({ tokenId: user.refreshTokens[0].id + '9999' }).then((res) => {
                expect(res.status).to.equal(422)
                expect(res.body).to.contain({ code: 'VALIDATION_ERROR' })
                done()
            }).catch((err) => done(err))
        })
        it('With a nonexistent tokenId', function (done) {
            let replacementTokenId = user.refreshTokens[0].id.toString().slice(0, -1) + (user.refreshTokens[0].id.toString().slice(-1) === '1' ? '2' : '1')
            request(app).delete('/api/me/logins/' + replacementTokenId).set('Authorization', `Bearer ${token}`).then((res) => {
                expect(res.status).to.equal(400)
                expect(res.body).to.contain({ code: 'ITEM_NOT_FOUND' })
                done()
            }).catch((err) => done(err))
        })
    })

    describe('/me/password PUT', function () {
        it('With the current password and a valid new password, not revoking existing tokens', function (done) {
            request(app).put('/api/me/password').set('Authorization', `Bearer ${token}`).send({ password, newPassword: password + 'x' }).then((res) => {
                expect(res.status).to.equal(204)
                done()
            }).catch((err) => done(err))
        })
        it('With the current password and a valid new password, revoking existing tokens', function (done) {
            request(app).put('/api/me/password').set('Authorization', `Bearer ${token}`).send({ password, newPassword: password + 'x', revokeRefreshTokens: true }).then((res) => {
                expect(res.status).to.equal(200)
                expect(res.body).to.have.property('refreshToken')
                done()
            }).catch((err) => done(err))
        })
        it('With the current password and an invalid new password', function (done) {
            request(app).put('/api/me/password').set('Authorization', `Bearer ${token}`).send({ password, newPassword: '123' }).then((res) => {
                expect(res.status).to.equal(400)
                expect(res.body).to.contain({ code: 'INVALID_PASSWORD' })
                done()
            }).catch((err) => done(err))
        })
        it('With a wrong password and a valid new password', function (done) {
            request(app).put('/api/me/password').set('Authorization', `Bearer ${token}`).send({ password: password + 'y', newPassword: password + 'x' }).then((res) => {
                expect(res.status).to.equal(400)
                expect(res.body).to.contain({ code: 'WRONG_PASSWORD' })
                done()
            }).catch((err) => done(err))
        })
    })

    describe('/me/email/begin-change POST', function () {
        this.timeout('50000')
        it('With a valid new email', function (done) {
            request(app).post('/api/me/email/begin-change').set('Authorization', `Bearer ${token}`).send({ email: newEmail, password }).then((res) => {
                expect(res.status).to.equal(200)
                expect(res.body).to.have.property('token')
                done()
            }).catch((err) => done(err))
        })
        it('With the same email as before', function (done) {
            request(app).post('/api/me/email/begin-change').set('Authorization', `Bearer ${token}`).send({ email, password }).then((res) => {
                expect(res.status).to.equal(400)
                expect(res.body).to.contain({ code: 'EMAIL_ALREADY_SET' })
                done()
            }).catch((err) => done(err))
        })
        it('With an invalid email', function (done) {
            request(app).post('/api/me/email/begin-change').set('Authorization', `Bearer ${token}`).send({ email: 'whoops', password }).then((res) => {
                expect(res.status).to.equal(422)
                expect(res.body).to.contain({ code: 'VALIDATION_ERROR' })
                done()
            }).catch((err) => done(err))
        })
        it('With an incorrect password', function (done) {
            request(app).post('/api/me/email/begin-change').set('Authorization', `Bearer ${token}`).send({ email: newEmail, password: newPassword }).then((res) => {
                expect(res.status).to.equal(400)
                expect(res.body).to.contain({ code: 'WRONG_PASSWORD' })
                done()
            }).catch((err) => done(err))
        })
    })

    describe('/me/email/complete-change POST', function () {
        it('With valid credentials', function (done) {
            generateTestUserOTP(newEmail, 'email', user.id.toString()).then((data) => {
                request(app).post('/api/me/email/complete-change').set('Authorization', `Bearer ${token}`).send({ email: newEmail, token: data.fullHash, code: data.otp }).then((res) => {
                    expect(res.status).to.equal(204)
                    done()
                }).catch((err) => done(err))
            }).catch((err) => done(err))
        })
        it('With an incorrect email', function (done) {
            generateTestUserOTP('x' + newEmail, 'email', user.id.toString()).then((data) => {
                request(app).post('/api/me/email/complete-change').set('Authorization', `Bearer ${token}`).send({ email: 'b' + email, token: data.fullHash, code: data.otp }).then((res) => {
                    expect(res.status).to.equal(400)
                    expect(res.body).to.contain({ code: 'INVALID_TOKEN' })
                    done()
                }).catch((err) => done(err))
            }).catch((err) => done(err))
        })
        it('With an incorrect token', function (done) {
            generateTestUserOTP(newEmail, 'email', user.id.toString()).then((data) => {
                request(app).post('/api/me/email/complete-change').set('Authorization', `Bearer ${token}`).send({ email, token: data.fullHash + 'a', code: data.otp }).then((res) => {
                    expect(res.status).to.equal(400)
                    expect(res.body).to.contain({ code: 'INVALID_TOKEN' })
                    done()
                }).catch((err) => done(err))
            }).catch((err) => done(err))
        })
        it('With an incorrect code', function (done) {
            generateTestUserOTP(newEmail, 'email', user.id.toString()).then((data) => {
                request(app).post('/api/me/email/complete-change').set('Authorization', `Bearer ${token}`).send({ email, token: data.fullHash, code: data.otp === '123456' ? '123457' : '123456' }).then((res) => {
                    expect(res.status).to.equal(400)
                    expect(res.body).to.contain({ code: 'INVALID_TOKEN' })
                    done()
                }).catch((err) => done(err))
            }).catch((err) => done(err))
        })
    })

    describe('When the DB contains a second user', function () {
        beforeEach('Create another test user', function (done) {
            createTestUser('x' + email).then((data) => {
                user = data.user
                refreshToken = data.refreshToken
                done()
            }).catch(err => done(err))
        })

        describe('/me/email/begin-change POST', function () {
            this.timeout('50000')
            it('With the same email as an existing user', function (done) {
                request(app).post('/api/me/email/begin-change').set('Authorization', `Bearer ${token}`).send({ email: 'x' + email, password }).then((res) => {
                    expect(res.status).to.equal(400)
                    expect(res.body).to.contain({ code: 'EMAIL_IN_USE' })
                    done()
                }).catch((err) => done(err))
            })
        })
    })

})