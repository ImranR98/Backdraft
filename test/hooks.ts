// Mocha root hook plugins for tests

import { ensureEnvVars } from '../src/environment'
import prisma from '../src/db/prismaClient'
import { RootHookObject } from 'mocha'

export const mochaHooks: RootHookObject = {
    beforeAll: function (done: Function) { // Before testing starts, ensure env. vars. are ready
        ensureEnvVars()
        done()
    },
    beforeEach: async function () { // Clear the test DB before every test
        const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname='public'`
        for (const { tablename } of tablenames)
            if (tablename !== '_prisma_migrations')
                await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`)
    }
}