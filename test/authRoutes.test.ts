// Tests for API endpoints in authRoutes

process.env.NODE_ENV = 'test'

import { expect } from 'chai'
import request from 'supertest'

import { app } from '../src/connection'

const email = 'person@example.com'
const password = 'greatpassword'

describe('Authentication related API tests', function () {
    describe('Tests that do not require a logged in user', function () {

        // Sign up tests
        describe('Sign up', function () {
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
            it('With a password that is too short', function (done) {
                request(app).post('/signup').send({ email, password: '123' }).then((res) => {
                    expect(res.status).to.equal(401)
                    expect(res.body).to.contain({ code: 'INVALID_PASSWORD' })
                    done()
                }).catch((err) => done(err))
            })
        })

        // Login tests
        describe('Login', function () {
            beforeEach('Login', function (done) {
                request(app).post('/signup').send({ email, password }).then((res) => {
                    expect(res.status).to.equal(201)
                    done()
                }).catch((err) => done(err))
            })
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
    })

    describe('Tests that require a logged in user', function () {
        let credentials: { token: string, refreshToken: string } = { token: '', refreshToken: '' }

        beforeEach('Sign up', function (done) {
            request(app).post('/signup').send({ email, password }).then((res) => {
                expect(res.status).to.equal(201)
                done()
            }).catch((err) => done(err))
        })
        beforeEach('Login', function (done) {
            request(app).post('/login').send({ email, password }).then((res) => {
                expect(res.status).to.equal(200)
                expect(res.body).to.have.property('token')
                expect(res.body).to.have.property('refreshToken')
                credentials = res.body
                done()
            }).catch((err) => done(err))
        })

        // Get token tests
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

        // Get logins test
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

        // Revoke login tests
        describe('Revoke login', function () {
            let tokenId: string = ''
            this.timeout('50000')
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

        // Change password tests
        describe('Change password', function () {
            it('With a valid current password and new password', function () {

            })
            it('With a valid current password and a new password that is too short', function () {

            })
            it('With an invalid current password and a valid new password', function () {

            })
        })

        // Change password tests
        describe('Change email', function () {
            it('With a valid current password and email', function () {

            })
            it('With a valid current password and an invalid email', function () {

            })
            it('With an invalid current password and a valid email', function () {

            })
        })

    })
})