// Tests for API endpoints under /api/

import { expect } from 'chai'
import request from 'supertest'

import { app } from '../src/app'

import { findUserById } from '../src/db/userQueries'

import { password, email, createTestUser, generateTestUserOTP, generateTestUserJWT } from './testData'

describe('root / tests', function () {
    describe('When the DB is empty', function () {
        describe('/signup/begin POST', function () {
            this.timeout('50000')
            it('With a valid email', async function () {
                const res = await request(app).post('/api/signup/begin').send({ email })
                expect(res.body).to.have.property('token')
                expect(res.status).to.equal(200)
            })
            it('With an invalid email', async function () {
                const res = await request(app).post('/api/signup/begin').send({ email: 'whoops' })
                expect(res.body).to.contain({ code: 'VALIDATION_ERROR' })
                expect(res.status).to.equal(422)
            })
        })
        describe('/signup/complete POST', function () {
            it('With valid credentials', async function () {
                const data = await generateTestUserOTP(email, 'signup')
                const res = await request(app).post('/api/signup/complete').send({ email, password, token: data.fullHash, code: data.otp })
                expect(res.status).to.equal(201)
            })
            it('With an incorrect email', async function () {
                const data = await generateTestUserOTP(email, 'signup')
                const res = await request(app).post('/api/signup/complete').send({ email: 'a' + email, password, token: data.fullHash, code: data.otp })
                expect(res.body).to.contain({ code: 'INVALID_TOKEN' })
                expect(res.status).to.equal(400)
            })
            it('With an invalid password', async function () {
                const data = await generateTestUserOTP(email, 'signup')
                const res = await request(app).post('/api/signup/complete').send({ email, password: '123', token: data.fullHash, code: data.otp })
                expect(res.body).to.contain({ code: 'INVALID_PASSWORD' })
                expect(res.status).to.equal(400)
            })
            it('With an incorrect token', async function () {
                const data = await generateTestUserOTP(email, 'signup')
                const res = await request(app).post('/api/signup/complete').send({ email, password, token: data.fullHash + 'a', code: data.otp })
                expect(res.body).to.contain({ code: 'INVALID_TOKEN' })
                expect(res.status).to.equal(400)
            })
            it('With an incorrect code', async function () {
                const data = await generateTestUserOTP(email, 'signup')
                const res = await request(app).post('/api/signup/complete').send({ email, password, token: data.fullHash, code: data.otp === '123456' ? '123457' : '123456' })
                expect(res.body).to.contain({ code: 'INVALID_TOKEN' })
                expect(res.status).to.equal(400)
            })
        })
    })

    describe('When the DB contains a user', function () {
        let { user, refreshToken }: { user: any, refreshToken: string } = { user: null, refreshToken: '' }

        beforeEach('Create test user', async function () {
            const data = await createTestUser(email)
            user = data.user
            refreshToken = data.refreshToken
        })

        describe('/signup/begin POST', function () {
            this.timeout('50000')
            it('With the same email as the existing user', async function () {
                const res = await request(app).post('/api/signup/begin').send({ email })
                expect(res.body).to.contain({ code: 'EMAIL_IN_USE' })
                expect(res.status).to.equal(400)
            })
        })

        describe('/signup/complete POST', function () {
            it('With the same email as the existing user', async function () {
                const data = await generateTestUserOTP(email, 'signup')
                const res = await request(app).post('/api/signup/complete').send({ email, password, token: data.fullHash, code: data.otp })
                expect(res.body).to.contain({ code: 'EMAIL_IN_USE' })
                expect(res.status).to.equal(400)
            })
        })

        describe('/reset-password-begin POST', function () {
            this.timeout('50000')
            it('With a valid email', async function () {
                const res = await request(app).post('/api/reset-password-begin').send({ email })
                expect(res.body).to.have.property('token')
                expect(res.status).to.equal(200)
            })
            it('With a non existent email', async function () {
                const res = await request(app).post('/api/reset-password-begin').send({ email: 'a' + email })
                expect(res.body).to.contain({ code: 'USER_NOT_FOUND' })
                expect(res.status).to.equal(400)
            })
        })
        describe('/reset-password-complete POST', function () {
            it('With valid credentials', async function () {
                const data = await generateTestUserOTP(email, 'password')
                const res = await request(app).post('/api/reset-password-complete').send({ email, password, token: data.fullHash, code: data.otp })
                expect(res.status).to.equal(200)
            })
            it('With an incorrect email', async function () {
                const data = await generateTestUserOTP(email, 'password')
                const res = await request(app).post('/api/reset-password-complete').send({ email: 'a' + email, password, token: data.fullHash, code: data.otp })
                expect(res.body).to.contain({ code: 'INVALID_TOKEN' })
                expect(res.status).to.equal(400)
            })
            it('With an invalid password', async function () {
                const data = await generateTestUserOTP(email, 'password')
                const res = await request(app).post('/api/reset-password-complete').send({ email, password: '123', token: data.fullHash, code: data.otp })
                expect(res.body).to.contain({ code: 'INVALID_PASSWORD' })
                expect(res.status).to.equal(400)
            })
            it('With an incorrect token', async function () {
                const data = await generateTestUserOTP(email, 'password')
                const res = await request(app).post('/api/reset-password-complete').send({ email, password, token: data.fullHash + 'a', code: data.otp })
                expect(res.body).to.contain({ code: 'INVALID_TOKEN' })
                expect(res.status).to.equal(400)
            })
            it('With an incorrect code', async function () {
                const data = await generateTestUserOTP(email, 'password')
                const res = await request(app).post('/api/reset-password-complete').send({ email, password, token: data.fullHash, code: data.otp === '123456' ? '123457' : '123456' })
                expect(res.body).to.contain({ code: 'INVALID_TOKEN' })
                expect(res.status).to.equal(400)
            })
        })

        describe('/login POST', function () {
            it('With valid credentials (also tests refresh token cleanup policy)', async function () {
                const res = await request(app).post('/api/login').send({ email, password })
                expect(res.body).to.have.property('token')
                expect(res.body).to.have.property('refreshToken')
                expect(res.status).to.equal(200)
            })
            it('With a non existent user email', async function () {
                const res = await request(app).post('/api/login').send({ email: 'ghost@example.com', password })
                expect(res.body).to.contain({ code: 'INVALID_LOGIN' })
                expect(res.status).to.equal(400)
            })
            it('With a wrong password', async function () {
                const res = await request(app).post('/api/login').send({ email, password: password + 'x' })
                expect(res.body).to.contain({ code: 'INVALID_LOGIN' })
                expect(res.status).to.equal(400)
            })
        })

        describe('/token POST', function () {
            it('With a valid refresh token (also tests refreshToken.date update)', async function () {
                const topRefreshToken = async () => ((await findUserById(user.id))?.refreshTokens || [])[0]
                const initialToken = await topRefreshToken()
                if (!initialToken) throw null
                const res = await request(app).post('/api/token').send({ refreshToken: refreshToken })
                expect(res.body).to.have.property('token')
                expect(res.status).to.equal(200)
                if (initialToken.date >= (await topRefreshToken())?.date) throw null
            })
            it('With an invalid refresh token', async function () {
                const res = await request(app).post('/api/token').send({ refreshToken: refreshToken + 'x' })
                expect(res.body).to.contain({ code: 'INVALID_REFRESH_TOKEN' })
                expect(res.status).to.equal(401)
            })
        })

        describe('/logout POST', function () {
            it('With a valid refresh token', async function () {
                const refreshTokenCount = async () => ((await findUserById(user.id))?.refreshTokens || []).length
                let originalCount = await refreshTokenCount()
                const token = generateTestUserJWT(user.id)
                const res = await request(app).post('/api/logout').set('Authorization', `Bearer ${token}`).send({ refreshToken: refreshToken })
                if (await refreshTokenCount() !== (originalCount - 1)) throw null
                expect(res.status).to.equal(200)
            })
            it('With an invalid refresh token', async function () {
                const refreshTokenCount = async () => ((await findUserById(user.id))?.refreshTokens || []).length
                let originalCount = await refreshTokenCount()
                const token = generateTestUserJWT(user.id)
                const res = await request(app).post('/api/logout').set('Authorization', `Bearer ${token}`).send({ refreshToken: refreshToken + 'x' })
                expect(res.body).to.contain({ code: 'ITEM_NOT_FOUND' })
                if (await refreshTokenCount() !== originalCount) throw null
                expect(res.status).to.equal(400)
            })
        })

    })

})