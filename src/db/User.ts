// Defines User model and queries for MongoDB

import mongoose from 'mongoose'
import validator from 'validator'

// Define refresh token sub-schema
const refreshTokenSchema = new mongoose.Schema({
  refreshToken: { type: String, required: true, unique: true, sparse: true },
  ip: { type: String, required: true },
  userAgent: String,
  date: { type: Date, default: new Date() }, // For some reason setting this to required causes an error
})

// Define user schema
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email not provided'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Email is invalid']
  },
  verified: { type: Boolean, default: false },
  password: {
    type: String,
    required: [true, 'Password not provided'],
  },
  refreshTokens: [refreshTokenSchema]
})

// Define and export the model
const User = mongoose.model('user', userSchema)

// Queries
export const createUser = async (email: string, hashedPassword: string, verified: boolean = false) => await User.create({ email, verified, password: hashedPassword })

export const findUserById = async (userId: string) => await User.findOne({ _id: userId })
export const findUserByEmail = async (email: string) => await User.findOne({ email })
export const findUserByRefreshToken = async (refreshToken: string) => await User.findOne({ "refreshTokens.refreshToken": refreshToken })

export const deleteUserByID = async (userId: string) => await User.deleteOne({ _id: userId })

export const updateUser = async (userId: string, changes: Object) => await User.updateOne({ _id: userId }, { $set: changes }, { runValidators: true })
export const updateUserEmail = async (userId: string, email: string, verified: boolean) => await User.updateOne({ _id: userId }, { email, verified }, { runValidators: true })

export const addUserRefreshToken = async (userId: string, refreshToken: string, ip: string, userAgent: string, date: Date = new Date()) => await User.updateOne({ _id: userId }, {
  $push: { refreshTokens: { refreshToken, ip, userAgent, date: new Date() } }
}, { runValidators: true })
export const removeOldUserRefreshTokens = async (userId: string, beforeDate: Date, ip: string | null = null, userAgent: string | null = null) => {
  let updateQuery: any = {}
  updateQuery.date = { $lt: beforeDate }
  if (ip) updateQuery.ip = ip
  if (userAgent) updateQuery.userAgent = userAgent
  return await User.updateOne({ _id: userId }, { $pull: { refreshTokens: updateQuery }, }, { runValidators: true })
}
export const updateUserRefreshToken = async (userId: string, refreshToken: string, ip: string, userAgent: string) => await User.updateOne(
  { _id: userId, "refreshTokens.refreshToken": refreshToken },
  { $set: { "refreshTokens.$.ip": ip, "refreshTokens.$.userAgent": userAgent, "refreshTokens.$.date": new Date() } },
  { runValidators: true }
)
export const removeUserRefreshTokenByTokenId = async (userId: string, tokenId: string) => {
  const result = await User.updateOne({ _id: userId }, { $pull: { refreshTokens: { _id: tokenId } } }, { runValidators: true })
  return !!result.modifiedCount
}
export const removeUserRefreshTokenByTokenString = async (userId: string, refreshToken: string) => {
  const result = await User.updateOne({ _id: userId }, { $pull: { refreshTokens: { refreshToken } } }, { runValidators: true })
  return !!result.modifiedCount
}