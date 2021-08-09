// Defines User model and queries for MongoDB

import mongoose from 'mongoose'
import validator from 'validator'

// Define refresh token sub-schema
const refreshTokenSchema = new mongoose.Schema({
  refreshToken: { type: String, required: true, unique: true },
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
  refreshTokens: [refreshTokenSchema],
})

// Define and export the model
const User = mongoose.model('user', userSchema)

// Queries
const createUser = async (email: string, hashedPassword: string, verified: boolean = false) => await User.create({ email, verified, password: hashedPassword })

const findUserById = async (userId: string) => await User.findOne({ _id: userId })
const findUserByEmail = async (email: string) => await User.findOne({ email })
const findUserByRefreshToken = async (refreshToken: string) => await User.findOne({ "refreshTokens.refreshToken": refreshToken })

const deleteUserByID = async (userId: string) => await User.deleteOne({ _id: userId })

const updateUser = async (userId: string, changes: Object) => await User.updateOne({ _id: userId }, { $set: changes }, { runValidators: true })
const updateUserEmail = async (userId: string, email: string, verified: boolean) => await User.updateOne({ _id: userId }, { email, verified }, { runValidators: true })

const addUserRefreshToken = async (userId: string, refreshToken: string, ip: string, userAgent: string, date: Date = new Date()) => await User.updateOne({ _id: userId }, {
  $push: { refreshTokens: { refreshToken, ip, userAgent, date: new Date() } }
}, { runValidators: true })
const removeOldUserRefreshTokens = async (userId: string, beforeDate: Date, ip: string | null = null, userAgent: string | null = null) => {
  let updateQuery: any = {}
  updateQuery.date = { $lt: beforeDate }
  if (ip) updateQuery.ip = ip
  if (userAgent) updateQuery.userAgent = userAgent
  return await User.updateOne({ _id: userId }, { $pull: { refreshTokens: updateQuery }, }, { runValidators: true })
}
const updateUserRefreshToken = async (userId: string, refreshToken: string, ip: string, userAgent: string, date: Date = new Date()) => await User.updateOne(
  { _id: userId, refreshTokens: { refreshToken } },
  { $set: { "refreshTokens.$.ip": ip, "refreshTokens.$.userAgent": userAgent, "refreshTokens.$.date": new Date() } },
  { runValidators: true }
)
const removeUserRefreshToken = async (userId: string, tokenId: string) => {
  const result = await User.updateOne({ _id: userId }, { $pull: { refreshTokens: { _id: tokenId } } }, { runValidators: true })
  return !!result.nModified
}


export { createUser, findUserById, findUserByEmail, findUserByRefreshToken, deleteUserByID, updateUser, updateUserEmail, addUserRefreshToken, removeOldUserRefreshTokens, updateUserRefreshToken, removeUserRefreshToken }