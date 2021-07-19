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
            it('With an invalid email', function () {

            })
            it('With an password that is too short', function () {

            })
        })

        // Login tests
        describe('Login', function () {
            beforeEach(function (done) {
                request(app).post('/signup').send({ email, password }).then((res) => {
                    expect(res.status).to.equal(201)
                    done()
                }).catch((err) => done(err))
            })
            it('With valid credentials', function (done) {
                request(app).post('/login').send({ email, password }).then((res) => {
                    expect(res.body).to.have.property('token')
                    expect(res.body).to.have.property('refreshToken')
                    done()
                }).catch((err) => done(err))
            })
            it('With a nonexistent email', function () {

            })
            it('With an incorrect password', function () {

            })
        })
    })

    describe('Tests that require a logged in user', function () {
        let credentials: { token: string, refreshToken: string } = { token: '', refreshToken: '' }

        beforeEach(function (done) {
            request(app).post('/signup').send({ email, password }).then((res) => {
                expect(res.status).to.equal(201)
                done()
            }).catch((err) => done(err))
        })
        beforeEach(function (done) {
            request(app).post('/login').send({ email, password }).then((res) => {
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
                    const body = res.body
                    expect(body).to.have.property('token')
                    done()
                }).catch((err) => done(err))
            })
            it('With an invalid refresh token', function () {

            })
        })

        // Get logins test
        describe('Get logins', function () {
            it('Get logins', function () {

            })
        })

        // Revoke login tests
        describe('Revoke login', function () {
            before(function () {
                // Get logins first
            })
            it('With a valid tokenId', function () {

            })
            it('With an invalid tokenId', function () {

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