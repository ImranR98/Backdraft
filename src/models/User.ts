// User model for MongoDB
// Contains minimal logic aside from basic data validation

import mongoose from 'mongoose'
import validator from 'validator'

// Define refresh token sub-schema
const refreshTokenSchema = new mongoose.Schema({
  refreshToken: { type: String, required: true },
  ip: { type: String, required: true },
  userAgent: String,
  date: { type: Date, default: new Date() }, // For some reason setting this to required causes an error - TODO
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
export default User