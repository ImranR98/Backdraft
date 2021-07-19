import { connectDB, ensureEnvVars } from '../src/connection';

exports.mochaHooks = {
    beforeEach: function(done: Function) {
        ensureEnvVars()
        connectDB().then(() => {
            done()
        }).catch(err => done(err))
    }
}