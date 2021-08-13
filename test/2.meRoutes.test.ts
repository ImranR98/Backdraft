// Tests for API endpoints in authRoutes

import { expect } from 'chai'
import request from 'supertest'

import { app } from '../src/app'

import { password, email, createTestUser } from './testData'

describe('/me tests', function () {

    let userData: any = null

    beforeEach('Create test user', function (done) {
        createTestUser(email).then((data) => {
            userData = data
            done()
        }).catch(err => done(err))
    })

    describe('/me/logins GET', function () {
        it('Get refresh tokens', function (done) {
            request(app).get('/api/me/logins').set('Authorization', `Bearer ${userData.token}`).then((res) => {
                expect(res.status).to.equal(200)
                expect(res.body).to.be.an('array').of.length.greaterThanOrEqual(1)
                expect(res.body[0]).to.have.property('_id')
                expect(res.body[0]).to.have.property('ip')
                expect(res.body[0]).to.have.property('userAgent')
                expect(res.body[0]).to.have.property('date')
                done()
            }).catch((err) => done(err))
        })
    })

    describe('/me/logins DELETE', function () {
        it('With a valid tokenId', function (done) {
            request(app).delete('/api/me/logins').set('Authorization', `Bearer ${userData.token}`).send({ tokenId: userData.user.refreshTokens[0]._id }).then((res) => {
                expect(res.status).to.equal(204)
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

    describe('/me/password POST', function () {
        it('With a valid current password and new password, not revoking existing tokens', function (done) {
            request(app).post('/api/me/password').set('Authorization', `Bearer ${userData.token}`).send({ password, newPassword: password + 'x' }).then((res) => {
                expect(res.status).to.equal(204)
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

    describe('/me/email POST', function () {
        this.timeout('50000')
        it('With a valid current password and email', function (done) {
            request(app).post('/api/me/email').set('Authorization', `Bearer ${userData.token}`).send({ password, newEmail: 'x' + email }).then((res) => {
                expect(res.status).to.equal(204)
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

    describe('When the DB contains a second unverified user', function () {
        beforeEach('Create second test user', function (done) {
            createTestUser('x' + email, false).then(() => done()).catch(err => done(err))
        })

        describe('/me/email POST', function () {
            this.timeout('50000')
            it('With the same email as the existing unverified user', function (done) {
                request(app).post('/api/me/email').set('Authorization', `Bearer ${userData.token}`).send({ password, newEmail: 'x' + email }).then((res) => {
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

        describe('/me/email POST', function () {
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