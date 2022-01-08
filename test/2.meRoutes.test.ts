// Tests for API endpoints in authRoutes

import { expect } from 'chai'
import request from 'supertest'

import { app } from '../src/app'

import { password, email, createTestUser, clientVerificationURL } from './testData'

describe('/me tests', function () {

    let userData: any = null

    beforeEach('Create test user', function (done) {
        createTestUser(email).then((data) => {
            userData = data
            done()
        }).catch(err => done(err))
    })

    describe('/me GET', function () {
        it('Get user info', function (done) {
            request(app).get('/api/me').set('Authorization', `Bearer ${userData.token}`).then((res) => {
                expect(res.status).to.equal(200)
                expect(res.body).to.have.property('id')
                expect(res.body).to.have.property('email')
                expect(res.body).to.have.property('verified')
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
            request(app).delete('/api/me/logins/' + userData.user.refreshTokens[0].id).set('Authorization', `Bearer ${userData.token}`).then((res) => {
                expect(res.status).to.equal(204)
                done()
            }).catch((err) => done(err))
        })
        it('With a wrong tokenId', function (done) {
            request(app).delete('/api/me/logins/' + userData.user.refreshTokens[0].id + 'x').set('Authorization', `Bearer ${userData.token}`).send({ tokenId: userData.user.refreshTokens[0].id + '9999' }).then((res) => {
                expect(res.status).to.equal(422)
                expect(res.body).to.contain({ code: 'VALIDATION_ERROR' })
                done()
            }).catch((err) => done(err))
        })
        it('With a nonexistent tokenId', function (done) {
            let replacementTokenId = userData.user.refreshTokens[0].id.toString().slice(0, -1) + (userData.user.refreshTokens[0].id.toString().slice(-1) === '1' ? '2' : '1')
            request(app).delete('/api/me/logins/' + replacementTokenId).set('Authorization', `Bearer ${userData.token}`).then((res) => {
                expect(res.status).to.equal(400)
                expect(res.body).to.contain({ code: 'ITEM_NOT_FOUND' })
                done()
            }).catch((err) => done(err))
        })
    })

    describe('/me/password PUT', function () {
        it('With the current password and a valid new password, not revoking existing tokens', function (done) {
            request(app).put('/api/me/password').set('Authorization', `Bearer ${userData.token}`).send({ password, newPassword: password + 'x' }).then((res) => {
                expect(res.status).to.equal(204)
                done()
            }).catch((err) => done(err))
        })
        it('With the current password and a valid new password, revoking existing tokens', function (done) {
            request(app).put('/api/me/password').set('Authorization', `Bearer ${userData.token}`).send({ password, newPassword: password + 'x', revokeRefreshTokens: true }).then((res) => {
                expect(res.status).to.equal(200)
                expect(res.body).to.have.property('refreshToken')
                done()
            }).catch((err) => done(err))
        })
        it('With the current password and an invalid new password', function (done) {
            request(app).put('/api/me/password').set('Authorization', `Bearer ${userData.token}`).send({ password, newPassword: '123' }).then((res) => {
                expect(res.status).to.equal(400)
                expect(res.body).to.contain({ code: 'INVALID_PASSWORD' })
                done()
            }).catch((err) => done(err))
        })
        it('With a wrong password and a valid new password', function (done) {
            request(app).put('/api/me/password').set('Authorization', `Bearer ${userData.token}`).send({ password: password + 'y', newPassword: password + 'x' }).then((res) => {
                expect(res.status).to.equal(400)
                expect(res.body).to.contain({ code: 'WRONG_PASSWORD' })
                done()
            }).catch((err) => done(err))
        })
    })

    describe('/me/email PUT', function () {
        this.timeout('50000')
        it('With the current password and a valid new email', function (done) {
            request(app).put('/api/me/email').set('Authorization', `Bearer ${userData.token}`).send({ password, email: 'x' + email, clientVerificationURL }).then((res) => {
                expect(res.status).to.equal(204)
                done()
            }).catch((err) => done(err))
        })
        it('With the current password and an invalid new email', function (done) {
            request(app).put('/api/me/email').set('Authorization', `Bearer ${userData.token}`).send({ password, email: 'whoops', clientVerificationURL }).then((res) => {
                expect(res.status).to.equal(422)
                expect(res.body).to.contain({ code: 'VALIDATION_ERROR' })
                done()
            }).catch((err) => done(err))
        })
        it('With a wrong password and a valid new email', function (done) {
            request(app).put('/api/me/email').set('Authorization', `Bearer ${userData.token}`).send({ password: password + 'x', email: 'x' + email, clientVerificationURL }).then((res) => {
                expect(res.status).to.equal(400)
                expect(res.body).to.contain({ code: 'WRONG_PASSWORD' })
                done()
            }).catch((err) => done(err))
        })
        it('With the current password and the current email', function (done) {
            request(app).put('/api/me/email').set('Authorization', `Bearer ${userData.token}`).send({ password, email, clientVerificationURL }).then((res) => {
                expect(res.status).to.equal(400)
                expect(res.body).to.contain({ code: 'EMAIL_ALREADY_SET' })
                done()
            }).catch((err) => done(err))
        })
    })

    describe('When the DB contains a second unverified user', function () {
        beforeEach('Create second test user', function (done) {
            createTestUser('x' + email, false).then(() => done()).catch(err => done(err))
        })

        describe('/me/email PUT', function () {
            this.timeout('50000')
            it('With the same email as the existing unverified user', function (done) {
                request(app).put('/api/me/email').set('Authorization', `Bearer ${userData.token}`).send({ password, email: 'x' + email, clientVerificationURL }).then((res) => {
                    expect(res.status).to.equal(204)
                    done()
                }).catch((err) => done(err))
            })
        })
    })

    describe('When the DB contains a second verified user', function () {
        beforeEach('Create second test user', function (done) {
            createTestUser('x' + email, true).then(() => done()).catch(err => done(err))
        })

        describe('/me/email PUT', function () {
            this.timeout('50000')
            it('With the same email as the existing verified user', function (done) {
                request(app).put('/api/me/email').set('Authorization', `Bearer ${userData.token}`).send({ password, email: 'x' + email, clientVerificationURL }).then((res) => {
                    expect(res.status).to.equal(400)
                    expect(res.body).to.contain({ code: 'EMAIL_IN_USE' })
                    done()
                }).catch((err) => done(err))
            })
        })
    })

})