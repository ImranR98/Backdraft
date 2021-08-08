// Mocha root hook plugins for tests

import { ensureEnvVars } from '../src/funcs/other'
import { connectDB, disconnectDB } from '../src/db/dbConnection'
import { RootHookObject } from 'mocha'

const mochaHooks: RootHookObject = {
    beforeAll: function (done: Function) {
        ensureEnvVars()
        done()
    },
    beforeEach: function (done: Function) {
        connectDB().then(() => done()).catch(err => done(err))
    },
    afterEach: function (done: Function) {
        disconnectDB().then(() => {
            done()
        }).catch(err => done(err))
    }
}

export { mochaHooks }