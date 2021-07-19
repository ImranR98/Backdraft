process.env.NODE_ENV = 'test';

import { expect } from 'chai'
import request from 'supertest'

import { app, connectDB } from '../main';

describe('POST /signup', () => {
    before((done) => {
        connectDB()
            .then(() => done())
            .catch((err) => done(err));
    })

    it('POST /signup works', (done) => {
        request(app).post('/signup').send({ email: 'person@example.com', password: 'greatpassword' }).then((res) => {
            expect(res.status).to.equal(201);
            done();
        }).catch((err) => done(err));
    });
})