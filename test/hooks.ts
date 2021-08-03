// Mocha root hook plugins for tests

import { ensureEnvVars } from '../src/validation'
import { connectDB, disconnectDB } from '../src/db'
import { RootHookObject } from 'mocha'

const mochaHooks: RootHookObject = {
    beforeEach: function (done: Function) {
        ensureEnvVars()
        connectDB().then(() => {
            done()
        }).catch(err => done(err))
    },
    afterEach: function (done: Function) {
        disconnectDB().then(() => {
            done()
        }).catch(err => done(err))
    }
}

export { mochaHooks }