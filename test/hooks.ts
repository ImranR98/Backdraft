// Mocha root hook plugins for tests

import { ensureEnvVars } from '../src/environment'
import prisma from '../src/db/prismaClient'
import { RootHookObject } from 'mocha'

export const mochaHooks: RootHookObject = {
    beforeAll: function (done: Function) {
        ensureEnvVars()
        done()
    },
    beforeEach: function (done: Function) {
        (async () => {
            const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname='public'`
            for (const { tablename } of tablenames)
                if (tablename !== '_prisma_migrations')
                    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`)
        })().then(() => done()).catch(err => done(err))
    }
}