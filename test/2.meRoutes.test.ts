// Tests for API endpoints under /api/me

import { expect } from 'chai'
import request from 'supertest'

import { app } from '../src/app'

import { password, email, createTestUser, newEmail, newPassword, generateTestUserJWT, generateTestUserOTP } from './testData'

describe('/me tests', function () {

    let { user, refreshToken }: { user: any, refreshToken: string } = { user: null, refreshToken: '' }
    let token = ''

    beforeEach('Create test user and generate token', async function () {
        const data = await createTestUser(email)
        user = data.user
        refreshToken = data.refreshToken
        token = generateTestUserJWT(user.id)
    })

    describe('/me GET', function () {
        it('Get user info', async function () {
            const res = await request(app).get('/api/me').set('Authorization', `Bearer ${token}`)
            expect(res.status).to.equal(200)
            expect(res.body).to.have.property('id')
            expect(res.body).to.have.property('email')
            expect(res.body).to.have.property('refreshTokens')
            expect(res.body.refreshTokens).to.be.an('array').of.length.greaterThanOrEqual(1)
            expect(res.body.refreshTokens[0]).to.have.property('id')
            expect(res.body.refreshTokens[0]).to.have.property('ip')
            expect(res.body.refreshTokens[0]).to.have.property('userAgent')
            expect(res.body.refreshTokens[0]).to.have.property('date')
        })
    })

    describe('/me/logins DELETE', function () {
        it('With a valid tokenId', async function () {
            const res = await request(app).delete('/api/me/logins/' + user.refreshTokens[0].id).set('Authorization', `Bearer ${token}`)
            expect(res.status).to.equal(204)
        })
        it('With a wrong tokenId', async function () {
            const res = await request(app).delete('/api/me/logins/' + user.refreshTokens[0].id + 'x').set('Authorization', `Bearer ${token}`).send({ tokenId: user.refreshTokens[0].id + '9999' })
            expect(res.status).to.equal(422)
            expect(res.body).to.contain({ code: 'VALIDATION_ERROR' })
        })
        it('With a nonexistent tokenId', async function () {
            let replacementTokenId = user.refreshTokens[0].id.toString().slice(0, -1) + (user.refreshTokens[0].id.toString().slice(-1) === '1' ? '2' : '1')
            const res = await request(app).delete('/api/me/logins/' + replacementTokenId).set('Authorization', `Bearer ${token}`)
            expect(res.status).to.equal(400)
            expect(res.body).to.contain({ code: 'ITEM_NOT_FOUND' })
        })
    })

    describe('/me/password PUT', function () {
        it('With the current password and a valid new password, not revoking existing tokens', async function () {
            const res = await request(app).put('/api/me/password').set('Authorization', `Bearer ${token}`).send({ password, newPassword: password + 'x' })
            expect(res.status).to.equal(204)
        })
        it('With the current password and a valid new password, revoking existing tokens', async function () {
            const res = await request(app).put('/api/me/password').set('Authorization', `Bearer ${token}`).send({ password, newPassword: password + 'x', revokeRefreshTokens: true })
            expect(res.status).to.equal(200)
            expect(res.body).to.have.property('refreshToken')
        })
        it('With the current password and an invalid new password', async function () {
            const res = await request(app).put('/api/me/password').set('Authorization', `Bearer ${token}`).send({ password, newPassword: '123' })
            expect(res.status).to.equal(400)
            expect(res.body).to.contain({ code: 'INVALID_PASSWORD' })
        })
        it('With a wrong password and a valid new password', async function () {
            const res = await request(app).put('/api/me/password').set('Authorization', `Bearer ${token}`).send({ password: password + 'y', newPassword: password + 'x' })
            expect(res.status).to.equal(400)
            expect(res.body).to.contain({ code: 'WRONG_PASSWORD' })
        })
    })

    describe('/me/email/begin-change POST', function () {
        this.timeout('50000')
        it('With a valid new email', async function () {
            const res = await request(app).post('/api/me/email/begin-change').set('Authorization', `Bearer ${token}`).send({ email: newEmail, password })
            expect(res.status).to.equal(200)
            expect(res.body).to.have.property('token')
        })
        it('With the same email as before', async function () {
            const res = await request(app).post('/api/me/email/begin-change').set('Authorization', `Bearer ${token}`).send({ email, password })
            expect(res.status).to.equal(400)
            expect(res.body).to.contain({ code: 'EMAIL_ALREADY_SET' })
        })
        it('With an invalid email', async function () {
            const res = await request(app).post('/api/me/email/begin-change').set('Authorization', `Bearer ${token}`).send({ email: 'whoops', password })
            expect(res.status).to.equal(422)
            expect(res.body).to.contain({ code: 'VALIDATION_ERROR' })
        })
        it('With an incorrect password', async function () {
            const res = await request(app).post('/api/me/email/begin-change').set('Authorization', `Bearer ${token}`).send({ email: newEmail, password: newPassword })
            expect(res.status).to.equal(400)
            expect(res.body).to.contain({ code: 'WRONG_PASSWORD' })
        })
    })

    describe('/me/email/complete-change POST', function () {
        it('With valid credentials', async function () {
            const data = await generateTestUserOTP(newEmail, 'email', user.id.toString())
            const res = await request(app).post('/api/me/email/complete-change').set('Authorization', `Bearer ${token}`).send({ email: newEmail, token: data.fullHash, code: data.otp })
            expect(res.status).to.equal(204)
        })
        it('With an incorrect email', async function () {
            const data = await generateTestUserOTP('x' + newEmail, 'email', user.id.toString())
            const res = await request(app).post('/api/me/email/complete-change').set('Authorization', `Bearer ${token}`).send({ email: 'b' + email, token: data.fullHash, code: data.otp })
            expect(res.status).to.equal(400)
            expect(res.body).to.contain({ code: 'INVALID_TOKEN' })
        })
        it('With an incorrect token', async function () {
            const data = await generateTestUserOTP(newEmail, 'email', user.id.toString())
            const res = await request(app).post('/api/me/email/complete-change').set('Authorization', `Bearer ${token}`).send({ email, token: data.fullHash + 'a', code: data.otp })
            expect(res.status).to.equal(400)
            expect(res.body).to.contain({ code: 'INVALID_TOKEN' })
        })
        it('With an incorrect code', async function () {
            const data = await generateTestUserOTP(newEmail, 'email', user.id.toString())
            const res = await request(app).post('/api/me/email/complete-change').set('Authorization', `Bearer ${token}`).send({ email, token: data.fullHash, code: data.otp === '123456' ? '123457' : '123456' })
            expect(res.status).to.equal(400)
            expect(res.body).to.contain({ code: 'INVALID_TOKEN' })
        })
    })

    describe('When the DB contains a second user', function () {
        beforeEach('Create another test user', async function () {
            const data = await createTestUser('x' + email)
            user = data.user
            refreshToken = data.refreshToken
        })

        describe('/me/email/begin-change POST', function () {
            this.timeout('50000')
            it('With the same email as an existing user', async function () {
                const res = await request(app).post('/api/me/email/begin-change').set('Authorization', `Bearer ${token}`).send({ email: 'x' + email, password })
                expect(res.status).to.equal(400)
                expect(res.body).to.contain({ code: 'EMAIL_IN_USE' })
            })
        })
    })

})