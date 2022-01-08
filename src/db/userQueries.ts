// Defines User related DB queries
import prisma from './prismaClient'

// Queries
export const createUser = async (email: string, hashedPassword: string, verified: boolean = false) => await prisma.user.create({ data: { email, verified, password: hashedPassword } })

export const findUserById = async (userId: number) => await prisma.user.findFirst({ where: { id: userId }, include: { refreshTokens: {} } })
export const findUserByEmail = async (email: string) => await prisma.user.findFirst({ where: { email }, include: { refreshTokens: {} } })
export const findUserByRefreshToken = async (refreshToken: string) => await prisma.user.findFirst({ where: { refreshTokens: { some: { refreshToken } } }, include: { refreshTokens: {} } })

export const deleteUserByID = async (userId: number) => {
  await prisma.user.delete({ where: { id: userId } })
}

export const updateUser = async (userId: number, changes: Object) => await prisma.user.update({ where: { id: userId }, data: changes })
export const updateUserEmail = async (userId: number, email: string, verified: boolean) => await prisma.user.update({ where: { id: userId }, data: { email, verified } })

export const addUserRefreshToken = async (userId: number, refreshToken: string, ip: string, userAgent: string) => await prisma.refreshToken.create({
  data: { userId, refreshToken, ip, userAgent }
})
export const removeAllUserRefreshTokens = async (userId: number) => await prisma.refreshToken.deleteMany({ where: { userId } })
export const removeOldUserRefreshTokens = async (userId: number, beforeDate: Date, ip: string | null = null, userAgent: string | null = null) => {
  let where: any = { userId, date: { lt: beforeDate } }
  if (ip) where.ip = ip
  if (userAgent) where.userAgent = userAgent
  return await prisma.refreshToken.deleteMany({ where })
}
export const updateRefreshToken = async (refreshToken: string, ip: string, userAgent: string) => await prisma.refreshToken.update({
  where: { refreshToken },
  data: { ip, userAgent }
})
export const removeRefreshTokenByTokenId = async (tokenId: number) => {
  return await prisma.refreshToken.delete({ where: { id: tokenId } })
}
export const removeRefreshTokenByTokenString = async (refreshToken: string) => {
  return await prisma.refreshToken.delete({ where: { refreshToken } })
}