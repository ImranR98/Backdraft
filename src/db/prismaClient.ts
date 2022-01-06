// DB Prisma Connection

import { PrismaClient } from '@prisma/client'

interface CustomNodeJsGlobal extends NodeJS.Global {
  prisma: PrismaClient
}
declare const global: CustomNodeJsGlobal
// TODO: Use different client when testing
const prisma = global.prisma || process.env.NODE_ENV === 'test' ? new PrismaClient() : new PrismaClient()

if (process.env.NODE_ENV === 'development') global.prisma = prisma

export default prisma